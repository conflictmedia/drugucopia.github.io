import type { ActiveReminder, DoseLog, ReminderSchedule } from "../types";

// --- MERGE UTILS ---

const getUpdateTime = (d: DoseLog) =>
  new Date(d.updatedAt || d.createdAt).getTime();

const getScheduleUpdateTime = (s: ReminderSchedule) =>
  new Date(s.updatedAt || s.createdAt).getTime();

type VersionedSyncItem = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

/** Merge an encrypted profile collection using tombstones for deletions and
 * updatedAt for edits. This is shared by custom substances and medications. */
export const mergeVersionedCollection = <T extends VersionedSyncItem>(
  local: T[],
  remote: T[],
  localDeleted: Set<string>,
  remoteDeleted: Set<string>,
) => {
  const deleted = new Set([...localDeleted, ...remoteDeleted]);
  const items = new Map<string, T>();

  for (const item of local) {
    if (!deleted.has(item.id)) items.set(item.id, item);
  }

  for (const item of remote) {
    if (deleted.has(item.id)) continue;
    const existing = items.get(item.id);
    const existingTime = existing
      ? new Date(existing.updatedAt || existing.createdAt).getTime()
      : Number.NEGATIVE_INFINITY;
    const remoteTime = new Date(item.updatedAt || item.createdAt).getTime();
    if (!existing || remoteTime > existingTime) items.set(item.id, item);
  }

  return { items: Array.from(items.values()), deleted };
};

export const versionedCollectionSignature = <T extends VersionedSyncItem>(
  items: T[],
  deleted: Set<string>,
) =>
  JSON.stringify({
    items: items
      .map((item) => `${item.id}:${item.updatedAt || item.createdAt}`)
      .sort(),
    deleted: [...deleted].sort(),
  });

/**
 * D2 — A pending sync conflict for a single dose.
 * The user must pick "keep local", "keep remote", or "keep both"
 * (keep both creates a new dose from the local version with a fresh ID).
 */
export interface DoseConflict {
  id: string;
  local: DoseLog;
  remote: DoseLog;
  /** Why we flagged it: both sides changed since the last sync baseline */
  reason: "both-edited";
}

/**
 * Merge local + remote dose lists. Takes a "baseline" map of
 * `doseId → updatedAt-as-of-last-sync` so we can detect true conflicts
 * (both sides changed since the last sync). When a conflict is detected:
 *   - The newer version wins in the merged output (preserves the old
 *     behavior so the UI doesn't break), BUT
 *   - The conflict is also returned in `conflicts` so the UI can prompt
 *     the user to confirm or override the choice.
 *
 * When baseline is empty (first-ever sync, or baseline was lost), this
 * falls back to pure updatedAt-wins with no conflicts surfaced.
 */
export const mergeDoses = (
  local: DoseLog[],
  remote: DoseLog[],
  localDeleted: Set<string>,
  remoteDeleted: Set<string>,
  baseline: Map<string, number> = new Map(),
) => {
  const allDeleted = new Set([...localDeleted, ...remoteDeleted]);
  const map = new Map<string, DoseLog>();
  const conflicts: DoseConflict[] = [];

  // "Undelete" protection: if a local dose was recently added/modified, it
  // should NOT be deleted by a stale remote `deleted` array entry — the user
  // intentionally re-added it (e.g. via import). We consider a dose "recently
  // modified" if either:
  //   a) its updatedAt is newer than the last sync baseline, OR
  //   b) its updatedAt is within the last 10 minutes (covers the no-baseline
  //      case, e.g. first-ever sync after an import)
  const TEN_MINUTES_MS = 10 * 60 * 1000;
  const nowMs = Date.now();
  const localUndeleted = new Set<string>();
  for (const d of local) {
    const updateTime = getUpdateTime(d);
    const baselineTime = baseline.get(d.id);
    const isNewerThanBaseline =
      baselineTime !== undefined && updateTime > baselineTime;
    const isVeryRecent = Math.abs(nowMs - updateTime) < TEN_MINUTES_MS;
    if (isNewerThanBaseline || isVeryRecent) {
      localUndeleted.add(d.id);
    }
  }
  for (const id of localUndeleted) {
    allDeleted.delete(id);
  }

  // "Undelete" protection for remote doses: if a remote dose was recently
  // added/modified (within 10 minutes), it should NOT be deleted by a stale
  // local `deleted` array entry — the user intentionally re-added it (e.g.
  // via import after deleting all doses). This mirrors the local undelete
  // protection above but applies to incoming remote doses.
  const remoteUndeleted = new Set<string>();
  for (const d of remote) {
    const updateTime = getUpdateTime(d);
    const isVeryRecent = Math.abs(nowMs - updateTime) < TEN_MINUTES_MS;
    if (isVeryRecent) {
      remoteUndeleted.add(d.id);
    }
  }
  for (const id of remoteUndeleted) {
    allDeleted.delete(id);
  }

  for (const d of local) {
    if (!allDeleted.has(d.id)) map.set(d.id, d);
  }

  for (const d of remote) {
    if (allDeleted.has(d.id)) {
      map.delete(d.id);
      continue;
    }
    const existing = map.get(d.id);

    if (!existing) {
      // New remote dose — just take it.
      map.set(d.id, d);
      continue;
    }

    const localTime = getUpdateTime(existing);
    const remoteTime = getUpdateTime(d);
    const baselineTime = baseline.get(d.id);

    // D2 — conflict detection: both sides have an updatedAt newer than
    // the last sync baseline. That means both clients edited the same
    // dose independently since they last synced.
    if (
      baselineTime !== undefined &&
      localTime > baselineTime &&
      remoteTime > baselineTime
    ) {
      // Check that the two versions are actually different (not just
      // identical timestamps). If they're equal content-wise, no
      // conflict needs surfacing.
      const sameContent =
        existing.substanceName === d.substanceName &&
        existing.amount === d.amount &&
        existing.unit === d.unit &&
        existing.route === d.route &&
        existing.notes === d.notes &&
        existing.mood === d.mood &&
        existing.setting === d.setting &&
        getUpdateTime(existing) === getUpdateTime(d);
      if (!sameContent) {
        conflicts.push({
          id: d.id,
          local: existing,
          remote: d,
          reason: "both-edited",
        });
      }
    }

    // Default: remote wins if newer. Same as before D2.
    if (remoteTime > localTime) {
      map.set(d.id, d);
    }
  }

  const doses = Array.from(map.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  return { doses, deleted: allDeleted, conflicts };
};

/**
 * Merge reminder schedules using the same conflict-resolution strategy as doses:
 * - Deleted IDs from both sides are unioned and take priority
 * - For duplicate IDs, the one with the newer updatedAt (or createdAt) wins
 */
export const mergeSchedules = (
  local: ReminderSchedule[],
  remote: ReminderSchedule[],
  localDeleted: Set<string>,
  remoteDeleted: Set<string>,
) => {
  const allDeleted = new Set([...localDeleted, ...remoteDeleted]);
  const map = new Map<string, ReminderSchedule>();

  for (const s of local) {
    if (!allDeleted.has(s.id)) map.set(s.id, s);
  }

  for (const s of remote) {
    if (allDeleted.has(s.id)) {
      map.delete(s.id);
      continue;
    }
    const existing = map.get(s.id);
    if (
      !existing ||
      getScheduleUpdateTime(s) > getScheduleUpdateTime(existing)
    ) {
      map.set(s.id, s);
    }
  }

  return { schedules: Array.from(map.values()), deleted: allDeleted };
};

/**
 * Merge active reminders:
 * - Combine local + remote, dedup by ID
 * - For duplicates, keep the one with the later startedAt (most recent timer)
 * - Filter out stale fired reminders (> 2 hours old)
 */
export const mergeActiveReminders = (
  local: ActiveReminder[],
  remote: ActiveReminder[],
) => {
  const now = Date.now();
  const map = new Map<string, ActiveReminder>();

  const addIfValid = (r: ActiveReminder) => {
    // Skip stale fired reminders (> 2 hours old)
    if (
      r.status === "fired" &&
      now - new Date(r.firesAt).getTime() > 2 * 60 * 60_000
    )
      return;
    // Skip dismissed
    if (r.status === "dismissed") return;

    const existing = map.get(r.id);
    if (
      !existing ||
      new Date(r.startedAt).getTime() > new Date(existing.startedAt).getTime()
    ) {
      map.set(r.id, r);
    }
  };

  for (const r of local) addIfValid(r);
  for (const r of remote) addIfValid(r);

  return Array.from(map.values());
};
