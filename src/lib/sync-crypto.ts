// --- CRYPTO UTILS ---
// Chunked to avoid "Maximum call stack size exceeded" on large payloads
const buf2base64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = new Uint8Array(buf)
  const chunkSize = 8192
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as unknown as number[])
  }
  return btoa(binary)
}

const base642buf = (b64: string) => {
  const binaryStr = atob(b64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  return bytes
}

export const hashRoomName = async (roomName: string, password: string) => {
  const data = new TextEncoder().encode(roomName + password + 'drugucopia-salt')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32)
}

export const deriveKey = async (password: string, salt: string) => {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  )
}

export const encryptData = async (dataObj: any, key: CryptoKey) => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(dataObj)))
  return { iv: buf2base64(iv), ciphertext: buf2base64(ciphertext) }
}

export const decryptData = async (encryptedObj: { iv: string; ciphertext: string }, key: CryptoKey) => {
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base642buf(encryptedObj.iv) }, key, base642buf(encryptedObj.ciphertext))
  return JSON.parse(new TextDecoder().decode(decrypted))
}

