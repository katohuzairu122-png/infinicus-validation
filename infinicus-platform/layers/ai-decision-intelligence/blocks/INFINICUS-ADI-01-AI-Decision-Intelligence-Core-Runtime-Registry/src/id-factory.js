const SAFE_PREFIX = /^[a-z][a-z0-9_]{1,31}$/i;

export function createId(prefix = "adi") {
  if (!SAFE_PREFIX.test(prefix)) throw new TypeError("Invalid ID prefix.");
  const random = globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}_${random}`;
}
