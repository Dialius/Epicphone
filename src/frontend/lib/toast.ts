// toast.ts — antrean toast: maksimal 3, pesan identik digabung, timer per toast,
// jeda saat di-hover/fokus, error tidak hilang otomatis, 20 terakhir tersimpan.

export type TipeToast = 'success' | 'error' | 'warning' | 'info';
export interface ToastAksi { label: string; onClick: () => void }
export interface ToastItem {
  id: number; tipe: TipeToast; judul: string; desk?: string; aksi?: ToastAksi;
  jumlah: number; durasi: number; // ms; 0 = tetap sampai ditutup
}
export interface ToastLogItem { id: number; tipe: TipeToast; judul: string; desk?: string; waktu: number }

const MAKS = 3;
let seq = 0;
let items: ToastItem[] = [];
let log: ToastLogItem[] = [];
const timers = new Map<number, { t: number; sisa: number; mulai: number }>();
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());

export function subscribeToast(f: () => void) { subs.add(f); return () => { subs.delete(f); }; }
export function getToasts(): ToastItem[] { return items; }
export function getToastLog(): ToastLogItem[] { return log; }

function jadwalkan(id: number, ms: number) {
  clearTimeout(timers.get(id)?.t);
  if (ms <= 0) { timers.delete(id); return; }
  const t = window.setTimeout(() => tutupToast(id), ms);
  timers.set(id, { t, sisa: ms, mulai: Date.now() });
}

export function jedaToast(id: number) {
  const tm = timers.get(id);
  if (!tm) return;
  clearTimeout(tm.t);
  timers.set(id, { ...tm, sisa: Math.max(1500, tm.sisa - (Date.now() - tm.mulai)) });
}
export function lanjutToast(id: number) {
  const tm = timers.get(id);
  if (tm) jadwalkan(id, tm.sisa);
}

export function tutupToast(id: number) {
  clearTimeout(timers.get(id)?.t);
  timers.delete(id);
  const n = items.length;
  items = items.filter(x => x.id !== id);
  if (items.length !== n) emit();
}

export interface OpsiToast { tipe?: TipeToast; judul: string; desk?: string; aksi?: ToastAksi; durasi?: number }

export function toast(o: OpsiToast): number {
  const tipe = o.tipe ?? 'success';
  const durasi = o.durasi ?? (tipe === 'error' ? 0 : tipe === 'warning' ? 8000 : 5000);
  log = [{ id: ++seq, tipe, judul: o.judul, desk: o.desk, waktu: Date.now() }, ...log].slice(0, 20);
  const sama = items.find(x => x.judul === o.judul && x.desk === o.desk && x.tipe === tipe);
  if (sama) {
    sama.jumlah++;
    items = items.slice();
    jadwalkan(sama.id, durasi);
    emit();
    return sama.id;
  }
  const baru: ToastItem = { id: seq, tipe, judul: o.judul, desk: o.desk, aksi: o.aksi, jumlah: 1, durasi };
  items = [...items, baru];
  while (items.length > MAKS) { const t = items[0]; clearTimeout(timers.get(t.id)?.t); timers.delete(t.id); items = items.slice(1); }
  jadwalkan(baru.id, durasi);
  emit();
  return baru.id;
}

/** Pembungkus kompatibel dengan signature lama onShowToast(pesan, tipe?) */
export function tampilToast(pesan: string, tipe: 'success' | 'error' = 'success') {
  return toast({ tipe, judul: pesan });
}
