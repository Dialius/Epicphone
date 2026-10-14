// usePersist.ts — state yang bertahan setelah muat ulang (localStorage), dengan cadangan memori
// bila penyimpanan diblokir (mis. iframe sandbox Apps Script).
import { useState, useEffect } from 'preact/hooks';

const NS = 'epicphone:';

export function bacaLocal<T>(key: string, awal: T): T {
  try {
    const raw = localStorage.getItem(NS + key);
    if (raw != null) return JSON.parse(raw) as T;
  } catch { /* abaikan */ }
  return awal;
}
export function tulisLocal(key: string, val: unknown) {
  try { localStorage.setItem(NS + key, JSON.stringify(val)); } catch { /* abaikan */ }
}
export function hapusLocal(key: string) {
  try { localStorage.removeItem(NS + key); } catch { /* abaikan */ }
}

/**
 * State yang bertahan setelah muat ulang. Dengan { simpan: false } nilainya hanya di memori
 * (dipakai untuk data milik server, agar data basi dari perangkat tidak pernah tampil sebagai data nyata).
 */
export function usePersist<T>(key: string, awal: T, opsi: { simpan?: boolean } = {}) {
  const simpan = opsi.simpan !== false;
  const [v, setV] = useState<T>(() => (simpan ? bacaLocal(key, awal) : awal));
  useEffect(() => { if (simpan) tulisLocal(key, v); }, [key, v, simpan]);
  return [v, setV] as const;
}
