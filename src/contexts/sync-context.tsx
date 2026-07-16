'use client'

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { toast } from '../hooks/use-toast'
import { useDoseStore } from '../store/dose-store'
import { useReminderStore } from '../store/reminder-store'
import { useCustomSubstanceStore, type CustomSubstance } from '../store/custom-substance-store'
import { useMedicationStore, type UserMedication } from '../store/medication-store'
import { DoseLog, ReminderSchedule, ActiveReminder } from '../types'
import { decryptData, deriveKey, encryptData, hashRoomName } from '../lib/sync-crypto'
import { mergeActiveReminders, mergeDoses, mergeSchedules, mergeVersionedCollection, versionedCollectionSignature, type DoseConflict } from '../lib/sync-merge'
export type { DoseConflict } from '../lib/sync-merge'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

// Lazy-initialize Firebase so the app doesn't crash if env vars are missing.
// getDb() returns null when Firebase can't be initialized, and every caller
// checks for null before proceeding — no TypeScript "Firestore | null" error.
let _app: FirebaseApp | null = null
let _db: Firestore | null = null

function getDb(): Firestore | null {
  if (_db) return _db
  if (!firebaseConfig.apiKey) return null
  try {
    _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
    _db = getFirestore(_app)
    return _db
  } catch {
    console.warn('Firebase initialization failed')
    return null
  }
}
const SYNC_AUTH_KEY = 'drugucopia-sync-auth'
// D3 — Split credential storage:
//   - Room name lives in localStorage so the UI can pre-fill it on
//     every page load (room names are not secret).
//   - Password lives in sessionStorage so it's cleared when the tab
//     closes, limiting the window during which a reusable secret sits
//     on disk. The trade-off: auto-reconnect only works within the
//     same tab session; closing the browser requires re-entering the
//     password. This is intentional — passwords are often reused, and
//     a stolen localStorage blob would give an attacker the raw
//     password, not just sync access.
const SYNC_ROOM_KEY = 'drugucopia-sync-room'
const SYNC_PASS_KEY = 'drugucopia-sync-pass'

// D2 — localStorage key for the "last synced" dose baseline.
// Stored as a JSON object: { [doseId]: updatedAtTimestamp }.
// Used by mergeDoses to detect true conflicts (both local and remote
// edited the same dose since the last sync).
const DOSE_BASELINE_KEY = 'drugucopia-sync-dose-baseline'

function loadDoseBaseline(): Map<string, number> {
  if (typeof window === 'undefined') return new Map()
  try {
    const raw = localStorage.getItem(DOSE_BASELINE_KEY)
    if (!raw) return new Map()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return new Map()
    const map = new Map<string, number>()
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'number' && !isNaN(v)) map.set(k, v)
    }
    return map
  } catch {
    return new Map()
  }
}

function saveDoseBaseline(doses: DoseLog[]) {
  if (typeof window === 'undefined') return
  try {
    const obj: Record<string, number> = {}
    for (const d of doses) {
      obj[d.id] = new Date(d.updatedAt || d.createdAt).getTime()
    }
    localStorage.setItem(DOSE_BASELINE_KEY, JSON.stringify(obj))
  } catch {
    /* ignore quota errors */
  }
}

function clearDoseBaseline() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(DOSE_BASELINE_KEY)
  } catch {
    /* ignore */
  }
}

// D3 — Credential storage helpers. Room name → localStorage (not
// secret, used for UI pre-fill). Password → sessionStorage (cleared on
// tab close). Combined read returns null if either piece is missing.
function saveSyncCredentials(room: string, pass: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SYNC_ROOM_KEY, room)
    sessionStorage.setItem(SYNC_PASS_KEY, pass)
  } catch {
    /* ignore quota errors */
  }
}

function loadSyncCredentials(): { room: string; pass: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const room = localStorage.getItem(SYNC_ROOM_KEY)
    const pass = sessionStorage.getItem(SYNC_PASS_KEY)
    if (!room || !pass) return null
    return { room, pass }
  } catch {
    return null
  }
}

function hasStoredRoom(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(SYNC_ROOM_KEY)
  } catch {
    return null
  }
}

function clearSyncCredentials() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(SYNC_ROOM_KEY)
    localStorage.removeItem(SYNC_AUTH_KEY) // legacy cleanup
    sessionStorage.removeItem(SYNC_PASS_KEY)
  } catch {
    /* ignore */
  }
}

// --- CONTEXT ---
interface SyncContextType {
  syncStatus: 'idle' | 'connecting' | 'synced' | 'error'
  // D1 — ISO timestamp of the last successful snapshot received from
  // Firestore. Used by the Header's sync indicator to show "synced 2m ago".
  lastSyncedAt: string | null
  roomId: string
  password: string
  setRoomId: (id: string) => void
  setPassword: (pw: string) => void
  connectToSync: (rId?: string, pass?: string) => Promise<void>
  disconnectSync: () => void
  // Manually trigger a push to Firestore (useful for debugging / force-sync).
  pushToSync: () => Promise<void>
  // D2 — Pending sync conflicts awaiting user resolution.
  pendingConflicts: DoseConflict[]
  // Resolve a conflict by ID. Choices:
  //   'local'  — keep the local version (will overwrite remote on next push)
  //   'remote' — keep the remote version (local changes discarded)
  //   'both'   — keep both: the remote stays, and a new dose is created
  //              from the local version with a fresh ID
  resolveConflict: (conflictId: string, choice: 'local' | 'remote' | 'both') => void
  dismissConflict: (conflictId: string) => void
}

const SyncContext = createContext<SyncContextType | null>(null)

export function SyncProvider({ children }: { children: React.ReactNode }) {
  // Use individual Zustand selectors to avoid subscribing to the entire store.
  // Only subscribe to what the UI actually renders (syncStatus, isLoaded for conditionals).
  // Read doses/deletedIds via getState() inside effects/callbacks to avoid re-renders.
  const isLoaded = useDoseStore(s => s.isLoaded)
  const initialize = useDoseStore(s => s.initialize)
  const setDosesFromSync = useDoseStore(s => s.setDosesFromSync)

  const reminderIsLoaded = useReminderStore(s => s.isLoaded)
  const initializeReminders = useReminderStore(s => s.initialize)
  const setRemindersFromSync = useReminderStore(s => s.setRemindersFromSync)

  const customSubstancesLoaded = useCustomSubstanceStore(s => s.loaded)
  const initializeCustomSubstances = useCustomSubstanceStore(s => s.initialize)
  const setCustomSubstancesFromSync = useCustomSubstanceStore(s => s.setSubstancesFromSync)

  const medicationsLoaded = useMedicationStore(s => s.loaded)
  const initializeMedications = useMedicationStore(s => s.initialize)
  const setMedicationsFromSync = useMedicationStore(s => s.setMedicationsFromSync)

  const [syncStatus, setSyncStatusRaw] = useState<'idle' | 'connecting' | 'synced' | 'error'>('idle')
  // D1 — last time we got a successful snapshot from Firestore.
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  // D2 — pending conflicts awaiting user resolution. Cleared on disconnect.
  const [pendingConflicts, setPendingConflicts] = useState<DoseConflict[]>([])
  const [roomId, setRoomId] = useState('')
  const [password, setPassword] = useState('')

  const cryptoKeyRef = useRef<CryptoKey | null>(null)
  const hashedRoomRef = useRef<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const lastPushedHashRef = useRef<string | null>(null)
  const isPushingRef = useRef(false)
  const initialSyncDoneRef = useRef(false)
  const syncStatusRef = useRef<'idle' | 'connecting' | 'synced' | 'error'>('idle')
  const pushDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Guard against feedback loop: when setDosesFromSync / setRemindersFromSync updates
  // the Zustand stores, the subscription listeners fire and would schedule another push.
  // This counter tracks how many sync-originated updates are in flight.
  const skipAutoPushCountRef = useRef(0)

  // Rate-limit: minimum milliseconds between actual Firestore writes.
  // Prevents rapid-fire setDoc calls that exhaust the write stream.
  const MIN_WRITE_INTERVAL_MS = 3000
  const lastWriteTimeRef = useRef<number>(0)

  // Keep refs in sync with roomId/password state so connectToSync can read
  // current values without depending on them in its useCallback dependency array.
  // This prevents the callback (and the entire context value) from being
  // recreated on every keystroke in the room/password inputs.
  const roomIdRef = useRef(roomId)
  const passwordRef = useRef(password)
  useEffect(() => { roomIdRef.current = roomId }, [roomId])
  useEffect(() => { passwordRef.current = password }, [password])

  // Wrapper that keeps both React state and ref in sync
  const setSyncStatus = useCallback((status: 'idle' | 'connecting' | 'synced' | 'error') => {
    syncStatusRef.current = status
    setSyncStatusRaw(status)
  }, [])

  // Initialize Zustand stores on mount
  useEffect(() => {
    initialize()
    initializeReminders()
    initializeCustomSubstances()
    initializeMedications()
  }, [initialize, initializeReminders, initializeCustomSubstances, initializeMedications])

  // Use refs for store data so pushToSync doesn't recreate on every state change.
  // This prevents unnecessary effect triggers in the auto-push subscription.
  const dosesRef = useRef(useDoseStore.getState().doses)
  const deletedIdsRef = useRef(useDoseStore.getState().deletedIds)

  const schedulesRef = useRef(useReminderStore.getState().schedules)
  const activeRemindersRef = useRef(useReminderStore.getState().activeReminders)
  const deletedScheduleIdsRef = useRef(useReminderStore.getState().deletedScheduleIds)
  const reminderSettingsRef = useRef({
    autoStartEnabled: useReminderStore.getState().autoStartEnabled,
    soundEnabled: useReminderStore.getState().soundEnabled,
  })

  const customSubstancesRef = useRef(useCustomSubstanceStore.getState().substances)
  const deletedCustomSubstanceIdsRef = useRef(useCustomSubstanceStore.getState().deletedIds)
  const medicationsRef = useRef(useMedicationStore.getState().medications)
  const deletedMedicationIdsRef = useRef(useMedicationStore.getState().deletedIds)

  // Initialization can complete before the vanilla Zustand subscriptions below
  // are attached. Refresh every payload ref once hydration finishes so the
  // first Firebase write cannot accidentally upload empty profile arrays.
  useEffect(() => {
    if (isLoaded) {
      dosesRef.current = useDoseStore.getState().doses
      deletedIdsRef.current = useDoseStore.getState().deletedIds
    }
    if (reminderIsLoaded) {
      const reminderState = useReminderStore.getState()
      schedulesRef.current = reminderState.schedules
      activeRemindersRef.current = reminderState.activeReminders
      deletedScheduleIdsRef.current = reminderState.deletedScheduleIds
      reminderSettingsRef.current = {
        autoStartEnabled: reminderState.autoStartEnabled,
        soundEnabled: reminderState.soundEnabled,
      }
    }
    if (customSubstancesLoaded) {
      customSubstancesRef.current = useCustomSubstanceStore.getState().substances
      deletedCustomSubstanceIdsRef.current = useCustomSubstanceStore.getState().deletedIds
    }
    if (medicationsLoaded) {
      medicationsRef.current = useMedicationStore.getState().medications
      deletedMedicationIdsRef.current = useMedicationStore.getState().deletedIds
    }
  }, [isLoaded, reminderIsLoaded, customSubstancesLoaded, medicationsLoaded])

  const pushToSyncRef = useRef<(() => Promise<void>) | null>(null)

  const pushToSync = useCallback(async () => {
    // Debug: log all guard values so we can see exactly why pushes might not happen
    const guard = {
      hasCryptoKey: !!cryptoKeyRef.current,
      hasHashedRoom: !!hashedRoomRef.current,
      isPushing: isPushingRef.current,
      isLoaded,
      reminderIsLoaded,
      customSubstancesLoaded,
      medicationsLoaded,
      syncStatus: syncStatusRef.current,
      initialSyncDone: initialSyncDoneRef.current,
    }

    // If a push is already in progress, reschedule this call for later
    // instead of silently dropping it. This is critical for bulk operations
    // (import, delete-all) that call pushToSync() explicitly — without this,
    // the push would be lost if it coincides with another push.
    if (cryptoKeyRef.current && hashedRoomRef.current && isPushingRef.current) {
      console.debug('[sync] pushToSync skipped — push in progress, rescheduling in 1s')
      if (pushDebounceRef.current) clearTimeout(pushDebounceRef.current)
      pushDebounceRef.current = setTimeout(() => {
        pushDebounceRef.current = null
        pushToSyncRef.current?.()
      }, 1000)
      return
    }

    if (
      !cryptoKeyRef.current ||
      !hashedRoomRef.current ||
      !isLoaded ||
      !reminderIsLoaded ||
      !customSubstancesLoaded ||
      !medicationsLoaded
    ) {
      console.debug('[sync] pushToSync skipped — guards:', guard)
      return
    }
    const db = getDb()
    if (!db) {
      console.debug('[sync] pushToSync skipped — no db')
      return
    }

    // Rate-limit: enforce minimum interval between Firestore writes
    const now = Date.now()
    const elapsed = now - lastWriteTimeRef.current
    if (elapsed < MIN_WRITE_INTERVAL_MS) {
      const delay = MIN_WRITE_INTERVAL_MS - elapsed
      console.debug(`[sync] pushToSync rate-limited, retrying in ${delay}ms`)
      if (pushDebounceRef.current) clearTimeout(pushDebounceRef.current)
      pushDebounceRef.current = setTimeout(() => {
        pushDebounceRef.current = null
        pushToSyncRef.current?.()
      }, delay)
      return
    }

    isPushingRef.current = true
    console.debug('[sync] pushToSync starting — writing to secure_rooms/' + hashedRoomRef.current)
    try {
      const currentDoses = dosesRef.current
      const currentDeleted = deletedIdsRef.current
      const currentSchedules = schedulesRef.current
      const currentActiveReminders = activeRemindersRef.current
      const currentDeletedScheduleIds = deletedScheduleIdsRef.current
      const currentReminderSettings = reminderSettingsRef.current
      const currentCustomSubstances = customSubstancesRef.current
      const currentDeletedCustomSubstances = deletedCustomSubstanceIdsRef.current
      const currentMedications = medicationsRef.current
      const currentDeletedMedications = deletedMedicationIdsRef.current

      const payload = {
        doses: currentDoses,
        deleted: [...currentDeleted],
        customSubstances: currentCustomSubstances,
        deletedCustomSubstances: [...currentDeletedCustomSubstances],
        medications: currentMedications,
        deletedMedications: [...currentDeletedMedications],
        // Reminder sync data
        schedules: currentSchedules,
        deletedSchedules: [...currentDeletedScheduleIds],
        activeReminders: currentActiveReminders,
        reminderSettings: {
          autoStartEnabled: currentReminderSettings.autoStartEnabled,
          soundEnabled: currentReminderSettings.soundEnabled,
        },
      }
      const encrypted = await encryptData(payload, cryptoKeyRef.current)
      lastPushedHashRef.current = encrypted.ciphertext.substring(0, 32)
      console.debug(
        `[sync] setDoc writing ${currentDoses.length} doses, ${currentSchedules.length} schedules, ` +
        `${currentCustomSubstances.length} custom substances, ${currentMedications.length} medications`,
      )
      await setDoc(doc(db, 'secure_rooms', hashedRoomRef.current), {
        encrypted,
        updatedAt: serverTimestamp(),
      })
      lastWriteTimeRef.current = Date.now()
      console.debug('[sync] setDoc succeeded')
    } catch (e) {
      console.error('[sync] Failed to push sync:', e)
      // Surface the error to the user — include the FULL error message so the
      // exact Firebase error code is visible without needing the console.
      const msg = e instanceof Error ? e.message : String(e)
      const isPermissionError = msg.includes('permission') || msg.includes('PERMISSION_DENIED')
      if (isPermissionError) {
        setSyncStatus('error')
      }
      toast({
        title: 'Sync write failed',
        description: isPermissionError
          ? 'Firestore rules block writes to secure_rooms. Apply the firestore.rules from the repo to your Firebase project.'
          : `Error: ${msg.substring(0, 120)}`,
        variant: 'destructive',
      })
    } finally {
      isPushingRef.current = false
    }
  }, [isLoaded, reminderIsLoaded, customSubstancesLoaded, medicationsLoaded])

  // Keep a live ref for retry callbacks scheduled inside pushToSync and
  // snapshot consolidation. This avoids capturing an outdated callback.
  useEffect(() => {
    pushToSyncRef.current = pushToSync
  }, [pushToSync])

  // Subscribe to Zustand store changes OUTSIDE of React render cycle.
  // Updates refs and triggers debounced push without causing re-renders.
  useEffect(() => {
    const unsubDose = useDoseStore.subscribe((state) => {
      dosesRef.current = state.doses
      deletedIdsRef.current = state.deletedIds

      // Skip auto-push if this state change came from a sync merge.
      if (skipAutoPushCountRef.current > 0) {
        skipAutoPushCountRef.current = Math.max(0, skipAutoPushCountRef.current - 1)
        console.debug('[sync] auto-push skipped (sync merge), remaining skips:', skipAutoPushCountRef.current)
        return
      }

      if (syncStatusRef.current === 'synced' && state.isLoaded && reminderIsLoaded && initialSyncDoneRef.current) {
        console.debug('[sync] dose store changed — scheduling push in 2s')
        if (pushDebounceRef.current) {
          clearTimeout(pushDebounceRef.current)
          pushDebounceRef.current = null
        }
        pushDebounceRef.current = setTimeout(() => {
          pushDebounceRef.current = null
          pushToSync()
        }, 2000)
      } else {
        console.debug('[sync] dose store changed but auto-push guard failed:', {
          syncStatus: syncStatusRef.current,
          stateIsLoaded: state.isLoaded,
          reminderIsLoaded,
          initialSyncDone: initialSyncDoneRef.current,
        })
      }
    })

    const unsubReminder = useReminderStore.subscribe((state) => {
      schedulesRef.current = state.schedules
      activeRemindersRef.current = state.activeReminders
      deletedScheduleIdsRef.current = state.deletedScheduleIds
      reminderSettingsRef.current = {
        autoStartEnabled: state.autoStartEnabled,
        soundEnabled: state.soundEnabled,
      }

      // Skip auto-push if this state change came from a sync merge.
      if (skipAutoPushCountRef.current > 0) {
        skipAutoPushCountRef.current = Math.max(0, skipAutoPushCountRef.current - 1)
        console.debug('[sync] auto-push skipped (sync merge), remaining skips:', skipAutoPushCountRef.current)
        return
      }

      if (syncStatusRef.current === 'synced' && isLoaded && state.isLoaded && initialSyncDoneRef.current) {
        console.debug('[sync] reminder store changed — scheduling push in 2s')
        if (pushDebounceRef.current) {
          clearTimeout(pushDebounceRef.current)
          pushDebounceRef.current = null
        }
        pushDebounceRef.current = setTimeout(() => {
          pushDebounceRef.current = null
          pushToSync()
        }, 2000)
      }
    })

    const unsubCustomSubstances = useCustomSubstanceStore.subscribe((state) => {
      customSubstancesRef.current = state.substances
      deletedCustomSubstanceIdsRef.current = state.deletedIds

      if (skipAutoPushCountRef.current > 0) {
        skipAutoPushCountRef.current = Math.max(0, skipAutoPushCountRef.current - 1)
        return
      }

      if (
        syncStatusRef.current === 'synced' &&
        state.loaded &&
        isLoaded &&
        reminderIsLoaded &&
        medicationsLoaded &&
        initialSyncDoneRef.current
      ) {
        if (pushDebounceRef.current) clearTimeout(pushDebounceRef.current)
        pushDebounceRef.current = setTimeout(() => {
          pushDebounceRef.current = null
          pushToSync()
        }, 2000)
      }
    })

    const unsubMedications = useMedicationStore.subscribe((state) => {
      medicationsRef.current = state.medications
      deletedMedicationIdsRef.current = state.deletedIds

      if (skipAutoPushCountRef.current > 0) {
        skipAutoPushCountRef.current = Math.max(0, skipAutoPushCountRef.current - 1)
        return
      }

      if (
        syncStatusRef.current === 'synced' &&
        state.loaded &&
        isLoaded &&
        reminderIsLoaded &&
        customSubstancesLoaded &&
        initialSyncDoneRef.current
      ) {
        if (pushDebounceRef.current) clearTimeout(pushDebounceRef.current)
        pushDebounceRef.current = setTimeout(() => {
          pushDebounceRef.current = null
          pushToSync()
        }, 2000)
      }
    })

    return () => {
      unsubDose()
      unsubReminder()
      unsubCustomSubstances()
      unsubMedications()
      if (pushDebounceRef.current) {
        clearTimeout(pushDebounceRef.current)
        pushDebounceRef.current = null
      }
    }
  }, [
    pushToSync,
    isLoaded,
    reminderIsLoaded,
    customSubstancesLoaded,
    medicationsLoaded,
  ])

  const connectToSync = useCallback(async (rId?: string, pass?: string) => {
    const effectiveRId = rId ?? roomIdRef.current
    const effectivePass = pass ?? passwordRef.current
    if (!effectiveRId || !effectivePass) return
    if (!window.crypto?.subtle) {
      toast({ title: 'Encryption Blocked', description: 'HTTPS is required for syncing.', variant: 'destructive' })
      return
    }

    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    setSyncStatus('connecting')
    try {
      cryptoKeyRef.current = await deriveKey(effectivePass, effectiveRId)
      const hashedRoom = await hashRoomName(effectiveRId, effectivePass)
      hashedRoomRef.current = hashedRoom
      // B4 fix: do NOT persist credentials yet. The snapshot listener may
      // fail (permissions, wrong password-derived hash, network). We only
      // persist once the first snapshot arrives successfully — see the
      // `if (!initialSyncDoneRef.current)` block inside processSnapshot.
      initialSyncDoneRef.current = false

      const db = getDb()
      if (!db) {
        setSyncStatus('error')
        toast({ title: 'Sync Unavailable', description: 'Firebase is not configured. Check your environment variables.', variant: 'destructive' })
        return
      }

      const docRef = doc(db, 'secure_rooms', hashedRoom)

      // Track the latest unprocessed snapshot so we don't lose data
      // when a push is in progress.  Instead of dropping the snapshot
      // entirely, we queue it and process it once the push completes.

      let pendingSnap: any = null
      let isProcessingSnap = false


      const processSnapshot = async (docSnap: any) => {
        isProcessingSnap = true
        console.debug('[sync] processSnapshot starting, doc exists:', docSnap.exists())
        try {
          if (!docSnap.exists()) {
            // New room — nothing to pull, push local state immediately.
            console.debug('[sync] new empty room — pushing local state')
            initialSyncDoneRef.current = true
            setSyncStatus('synced')
            setLastSyncedAt(new Date().toISOString())
            toast({ title: 'Secure Sync Active', description: 'Your data is now end-to-end encrypted and syncing.' })
            saveSyncCredentials(effectiveRId, effectivePass)
            pushToSync()
            return
          }

          const remoteData = docSnap.data()
          const remoteHash = remoteData.encrypted?.ciphertext?.substring(0, 32)
          console.debug('[sync] remote data received, remoteHash:', remoteHash?.substring(0, 8) + '...', 'lastPushedHash:', lastPushedHashRef.current?.substring(0, 8) + '...')
          if (remoteHash && remoteHash === lastPushedHashRef.current) {
            // Even for echo-suppressed snapshots, mark initial sync done
            // so the auto-push can resume
            console.debug('[sync] snapshot is echo of our own push — skipping merge')
            initialSyncDoneRef.current = true
            setSyncStatus('synced')
            setLastSyncedAt(new Date().toISOString())
            // Echo of our own push — credentials are already valid.
            // D3: use the split storage helpers instead of plaintext blob.
            if (!loadSyncCredentials()) {
              saveSyncCredentials(effectiveRId, effectivePass)
            }
            return
          }

          try {
            const payload = await decryptData(remoteData.encrypted, cryptoKeyRef.current!)
            console.debug('[sync] decrypt succeeded — remote doses:', Array.isArray(payload) ? payload.length : payload.doses?.length ?? 0)

            // ─── Dose merge (backward-compatible with old format) ───
            const remoteDoses: DoseLog[] = Array.isArray(payload) ? payload : payload.doses ?? []
            const remoteDeleted: Set<string> = new Set(Array.isArray(payload) ? [] : payload.deleted ?? [])

            const localDoses = useDoseStore.getState().doses
            const localDeleted = useDoseStore.getState().deletedIds
            console.debug('[sync] merging — local:', localDoses.length, 'doses, remote:', remoteDoses.length, 'doses')

            // On the first sync after connect/reconnect, ignore local deletions.
            // This ensures that entries deleted while offline are restored from
            // the remote source of truth, rather than the deletions being
            // propagated back and wiping the remote data.
            const isFirstSync = !initialSyncDoneRef.current
            initialSyncDoneRef.current = true
            setSyncStatus('synced')
            if (isFirstSync) {
              toast({ title: 'Secure Sync Active', description: 'Your data is now end-to-end encrypted and syncing.' })
            }
            setLastSyncedAt(new Date().toISOString())

            // B4 fix: now that we've successfully decrypted the remote payload,
            // we know the credentials are valid. Persist them so we can
            // auto-reconnect on next page load.
            // D3: use the split storage helpers instead of plaintext blob.
            if (isFirstSync) {
              saveSyncCredentials(effectiveRId, effectivePass)
            }

            const effectiveLocalDeleted = isFirstSync ? new Set<string>() : localDeleted

            // D2 — Load the "last synced" baseline so we can detect
            // true conflicts (both sides edited the same dose since the
            // last sync). The baseline is a map of doseId → updatedAt.
            // On first sync (no baseline yet), this is empty and we
            // fall back to pure updatedAt-wins with no conflicts.
            const baseline = loadDoseBaseline()
            const { doses: merged, deleted: mergedDeleted, conflicts: newConflicts } = mergeDoses(
              localDoses, remoteDoses, effectiveLocalDeleted, remoteDeleted, baseline,
            )

            // D2 — Queue any new conflicts for user resolution. We
            // don't overwrite already-pending conflicts (the user may
            // still be reviewing an earlier batch).
            if (newConflicts.length > 0) {
              setPendingConflicts((prev) => {
                const seen = new Set(prev.map((c) => c.id))
                const merged = [...prev]
                for (const c of newConflicts) {
                  if (!seen.has(c.id)) {
                    merged.push(c)
                    seen.add(c.id)
                  }
                }
                return merged
              })
            }

            // D2 — Update the baseline to the merged state. Next sync
            // will compare against this. We snapshot updatedAt for
            // every dose in the merged result.
            saveDoseBaseline(merged)

            // ─── Reminder merge ───
            const remoteSchedules: ReminderSchedule[] = payload.schedules ?? []
            const remoteDeletedSchedules: Set<string> = new Set(payload.deletedSchedules ?? [])
            const remoteActiveReminders: ActiveReminder[] = payload.activeReminders ?? []
            const remoteReminderSettings = payload.reminderSettings ?? {}

            const localSchedules = useReminderStore.getState().schedules
            const localDeletedScheduleIds = useReminderStore.getState().deletedScheduleIds
            const localActiveReminders = useReminderStore.getState().activeReminders

            // On first sync, ignore local schedule deletions (same as doses)
            const effectiveLocalDeletedSchedules = isFirstSync ? new Set<string>() : localDeletedScheduleIds

            const { schedules: mergedSchedules, deleted: mergedDeletedSchedules } = mergeSchedules(
              localSchedules, remoteSchedules, effectiveLocalDeletedSchedules, remoteDeletedSchedules,
            )
            const mergedActiveReminders = mergeActiveReminders(localActiveReminders, remoteActiveReminders)

            // ─── Custom substance + medication profile merge ───
            const customState = useCustomSubstanceStore.getState()
            const medicationState = useMedicationStore.getState()
            const remoteCustomSubstances: CustomSubstance[] = payload.customSubstances ?? []
            const remoteDeletedCustomSubstances = new Set<string>(payload.deletedCustomSubstances ?? [])
            const remoteMedications: UserMedication[] = payload.medications ?? []
            const remoteDeletedMedications = new Set<string>(payload.deletedMedications ?? [])

            const { items: mergedCustomSubstances, deleted: mergedDeletedCustomSubstances } =
              mergeVersionedCollection(
                customState.substances,
                remoteCustomSubstances,
                isFirstSync ? new Set<string>() : customState.deletedIds,
                remoteDeletedCustomSubstances,
              )
            const { items: mergedMedications, deleted: mergedDeletedMedications } =
              mergeVersionedCollection(
                medicationState.medications,
                remoteMedications,
                isFirstSync ? new Set<string>() : medicationState.deletedIds,
                remoteDeletedMedications,
              )

            const profileNeedsConsolidatedPush =
              versionedCollectionSignature(mergedCustomSubstances, mergedDeletedCustomSubstances) !==
              versionedCollectionSignature(remoteCustomSubstances, remoteDeletedCustomSubstances) ||
              versionedCollectionSignature(mergedMedications, mergedDeletedMedications) !==
              versionedCollectionSignature(remoteMedications, remoteDeletedMedications)

            // Prevent the incoming sync merge from triggering auto-pushes.
            // Four stores are updated below, so each subscription receives one
            // skip token and does not echo the snapshot straight back.
            skipAutoPushCountRef.current += 4

            setDosesFromSync(merged, mergedDeleted)
            setRemindersFromSync(
              mergedSchedules,
              mergedActiveReminders,
              mergedDeletedSchedules,
              {
                autoStartEnabled: remoteReminderSettings.autoStartEnabled,
                soundEnabled: remoteReminderSettings.soundEnabled,
              },
            )
            setCustomSubstancesFromSync(mergedCustomSubstances, mergedDeletedCustomSubstances)
            setMedicationsFromSync(mergedMedications, mergedDeletedMedications)

            // If this device contributed records that were not in the remote
            // snapshot, persist the consolidated profile after all store refs
            // have been updated. Echo snapshots are suppressed by ciphertext.
            if (profileNeedsConsolidatedPush) {
              if (pushDebounceRef.current) clearTimeout(pushDebounceRef.current)
              pushDebounceRef.current = setTimeout(() => {
                pushDebounceRef.current = null
                pushToSyncRef.current?.()
              }, 250)
            }

          } catch (e) {
            console.error('[sync] Decryption failed:', e)
            setSyncStatus('error')
            toast({ title: 'Sync Decryption Failed', description: 'Wrong password or corrupted data. Disconnect and reconnect with the correct password.', variant: 'destructive' })
          }
        } finally {
          isProcessingSnap = false
          console.debug('[sync] processSnapshot finished, isProcessingSnap reset to false, pendingSnap:', !!pendingSnap)
          // Process any snapshot that arrived while we were busy
          if (pendingSnap) {
            const next = pendingSnap
            pendingSnap = null
            console.debug('[sync] processing queued pending snapshot')
            processSnapshot(next)
          }
        }
      }

      unsubscribeRef.current = onSnapshot(docRef, {
        next: async (docSnap) => {
          console.debug('[sync] snapshot received:', {
            exists: docSnap.exists(),
            isPushing: isPushingRef.current,
            isProcessingSnap,
          })
          // If we're currently pushing or processing a previous snapshot,
          // queue this one for later instead of dropping it.
          if (isPushingRef.current || isProcessingSnap) {
            pendingSnap = docSnap
            console.debug('[sync] snapshot queued (push/processing in progress)')
            return
          }
          processSnapshot(docSnap)
        },
        error: (err) => {
          console.error('[sync] Firestore snapshot error:', err)
          setSyncStatus('error')
          toast({ title: 'Sync Error', description: `Lost connection: ${err.message.substring(0, 100)}`, variant: 'destructive' })
        }
      })

      // Note: we do NOT set status to 'synced' here. The status is set to
      // 'synced' inside processSnapshot() only after the first real snapshot
      // arrives successfully. This avoids a misleading "Synced" flash if
      // Firestore rules deny access (the onSnapshot error callback would
      // then fire and set 'error', but the user would have already seen
      // "Secure Sync Active" momentarily).
      setSyncStatus('connecting')
    } catch (error) {
      console.error('Sync connection error:', error)
      setSyncStatus('error')
    }
    // roomId and password are read via refs to avoid recreating on every keystroke

  }, [
    isLoaded,
    reminderIsLoaded,
    customSubstancesLoaded,
    medicationsLoaded,
    setDosesFromSync,
    setRemindersFromSync,
    setCustomSubstancesFromSync,
    setMedicationsFromSync,
    pushToSync,
    setSyncStatus,
  ])

  const disconnectSync = useCallback(() => {
    if (unsubscribeRef.current) unsubscribeRef.current()
    unsubscribeRef.current = null
    cryptoKeyRef.current = null
    hashedRoomRef.current = null
    lastPushedHashRef.current = null
    skipAutoPushCountRef.current = 0
    lastWriteTimeRef.current = 0
    if (pushDebounceRef.current) {
      clearTimeout(pushDebounceRef.current)
      pushDebounceRef.current = null
    }
    localStorage.removeItem(SYNC_AUTH_KEY)
    // D3 — clear both room and password from their split storage.
    clearSyncCredentials()
    // D2 — clear the baseline and pending conflicts so a reconnect
    // starts fresh (no stale "last synced" state).
    clearDoseBaseline()
    setPendingConflicts([])
    setSyncStatus('idle')
    setLastSyncedAt(null)
    setRoomId('')
    setPassword('')
    toast({ title: 'Sync Disconnected', description: 'Data will only save locally.' })

  }, [setSyncStatus])

  // D2 — Resolve a pending conflict.
  //   'local'  — overwrite the remote by writing local back with a fresh
  //              updatedAt (next push propagates it).
  //   'remote' — discard the local version; the merged state already
  //              kept the remote (since remote-wins is the default), so
  //              we just need to remove the conflict from the queue.
  //   'both'   — keep the remote (already in the store) AND create a
  //              new dose from the local version with a fresh ID.
  const resolveConflict = useCallback((conflictId: string, choice: 'local' | 'remote' | 'both') => {
    const conflict = pendingConflicts.find((c) => c.id === conflictId)
    if (!conflict) return

    if (choice === 'local') {
      // Re-apply local version with bumped updatedAt so it wins next push
      const now = new Date().toISOString()
      useDoseStore.getState().updateDose({ ...conflict.local, updatedAt: now })
      toast({
        title: 'Conflict resolved',
        description: `Kept your version of ${conflict.local.substanceName}.`,
      })
    } else if (choice === 'both') {
      // Create a new dose from the local version with a fresh ID
      const now = new Date().toISOString()
      const newId = `dose_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      useDoseStore.getState().addDose({
        ...conflict.local,
        id: newId,
        notes: conflict.local.notes ? `${conflict.local.notes}\n[duplicate from sync conflict]` : '[duplicate from sync conflict]',
        createdAt: now,
        updatedAt: now,
      })
      toast({
        title: 'Conflict resolved',
        description: `Kept both versions of ${conflict.local.substanceName}.`,
      })
    } else {
      // 'remote' — nothing to do, the merge already kept the remote.
      toast({
        title: 'Conflict resolved',
        description: `Kept the synced version of ${conflict.local.substanceName}.`,
      })
    }

    setPendingConflicts((prev) => prev.filter((c) => c.id !== conflictId))
  }, [pendingConflicts])

  const dismissConflict = useCallback((conflictId: string) => {
    setPendingConflicts((prev) => prev.filter((c) => c.id !== conflictId))
  }, [])

  // Auto-connect on load.
  // D3 — Only the room name is in localStorage (not sensitive). The
  // password is in sessionStorage, so auto-reconnect only works within
  // the same tab session. If the user closed the tab, the room name
  // is pre-filled but they'll need to re-enter the password.
  useEffect(() => {
    const creds = loadSyncCredentials()
    if (creds) {
      setRoomId(creds.room)
      setPassword(creds.pass)
      connectToSync(creds.room, creds.pass)
    } else {
      // No password in sessionStorage — but maybe the room name is in
      // localStorage from a previous session. Pre-fill it so the user
      // only has to type the password.
      const storedRoom = hasStoredRoom()
      if (storedRoom) setRoomId(storedRoom)
    }
    return () => { if (unsubscribeRef.current) unsubscribeRef.current() }

  }, [])

  const contextValue = useMemo(() => ({
    syncStatus, lastSyncedAt, roomId, password, setRoomId, setPassword, connectToSync, disconnectSync, pushToSync,
    pendingConflicts, resolveConflict, dismissConflict,
  }), [syncStatus, lastSyncedAt, roomId, password, connectToSync, disconnectSync, pushToSync, pendingConflicts, resolveConflict, dismissConflict])

  return (
    <SyncContext.Provider value={contextValue}>
      {children}
    </SyncContext.Provider>
  )
}

export const useSync = () => {
  const context = useContext(SyncContext)
  if (!context) throw new Error("useSync must be used within a SyncProvider")
  return context
}
