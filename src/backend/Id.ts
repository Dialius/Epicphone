// Id.ts — pembuat ID PREFIX-YYMM-NNNN dengan LockService + PropertiesService

import { yymm, sekarang } from './Utils';
import { denganLock } from './Lock';

/**
 * Buat ID berikutnya untuk prefix tertentu.
 * Contoh: buatId("UNT") -> "UNT-2610-0007"
 * Counter disimpan di PropertiesService key "counter_UNT_2610".
 * Aman dipanggil dari dalam transaksi yang sudah memegang kunci.
 */
export function buatId(prefix: string): string {
  return denganLock(() => {
    const periode = yymm(sekarang());
    const key = `counter_${prefix}_${periode}`;
    const props = PropertiesService.getScriptProperties();
    const prev = parseInt(props.getProperty(key) ?? '0', 10);
    const next = prev + 1;
    props.setProperty(key, String(next));
    return `${prefix}-${periode}-${String(next).padStart(4, '0')}`;
  });
}
