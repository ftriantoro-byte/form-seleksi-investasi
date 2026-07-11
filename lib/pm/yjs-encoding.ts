// Helper encoding untuk state Yjs (Uint8Array) yang harus melewati batas
// server/client: PostgREST mengembalikan kolom bytea sebagai string hex
// "\x..." (format default Postgres), sedangkan Server Action (React Server
// Function) paling aman menerima string biasa - jadi dipakai base64 sebagai
// format transport ke/dari Server Action, dan hex cuma untuk baca awal dari
// Supabase.

export function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.startsWith("\\x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
