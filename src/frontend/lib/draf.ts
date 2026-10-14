// draf.ts — draf penjualan yang benar-benar tersimpan; banner "Lanjutkan" hanya muncul bila ada.
import { bacaLocal, tulisLocal, hapusLocal } from './usePersist';

export interface DrafJual { unitId: string | null; unitNama: string; step: number; ringkas: string; simpan: number; data: Record<string, unknown> }
const KEY = 'draf-jual';
const subs = new Set<() => void>();
export function getDraf(): DrafJual | null { return bacaLocal<DrafJual | null>(KEY, null); }
export function setDraf(d: DrafJual | null) { if (d) tulisLocal(KEY, d); else hapusLocal(KEY); subs.forEach(f => f()); }
export function subscribeDraf(f: () => void) { subs.add(f); return () => { subs.delete(f); }; }
