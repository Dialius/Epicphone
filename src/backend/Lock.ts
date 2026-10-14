// Lock.ts — satu pintu untuk LockService. Boleh dipanggil bersarang:
// bila eksekusi ini sudah memegang kunci, fungsi langsung dijalankan (tidak minta lagi,
// sehingga tidak saling menunggu diri sendiri).

import { LOCK_TIMEOUT_MS } from './Config';
import { GalatBisnis } from './Galat';

let kedalaman = 0;

export function denganLock<T>(fn: () => T): T {
  if (kedalaman > 0) return fn();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    throw new GalatBisnis('SISTEM_SIBUK', 'Sistem sedang menyimpan data lain. Coba lagi beberapa detik lagi.');
  }
  kedalaman++;
  try {
    return fn();
  } finally {
    kedalaman--;
    lock.releaseLock();
  }
}
