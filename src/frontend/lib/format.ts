// format.ts — format uang, tanggal, dan penomoran. Satu sumber untuk seluruh UI.

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const MASK = 'Rp ••• •••';

export function rupiah(n: number): string {
  const v = Math.round(Number.isFinite(n) ? n : 0);
  return (v < 0 ? '-Rp ' : 'Rp ') + Math.abs(v).toLocaleString('id-ID');
}

/** Ringkas: Rp 6,1 jt / Rp 850 rb. Nilai penuh tetap harus tersedia lewat tooltip. */
export function rupiahRingkas(n: number): string {
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e9) return `${s}Rp ${(a / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
  if (a >= 1e6) return `${s}Rp ${(a / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 2 })} jt`;
  if (a >= 1e3) return `${s}Rp ${Math.round(a / 1e3).toLocaleString('id-ID')} rb`;
  return `${s}Rp ${Math.round(a)}`;
}

export function angka(n: number): string {
  return Math.round(n).toLocaleString('id-ID');
}

/** Ambil bagian tanggal/jam di zona Asia/Jakarta (WIB) tanpa bergantung zona perangkat. */
function wibParts(d: Date) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'long',
  });
  const p: Record<string, string> = {};
  f.formatToParts(d).forEach(x => { p[x.type] = x.value; });
  return { y: +p.year, m: +p.month, d: +p.day, hh: p.hour === '24' ? '00' : p.hour, mm: p.minute };
}

/** "04 Okt 2026" (format yang dipakai data di seluruh aplikasi) */
export function tglWib(d: Date = new Date()): string {
  const p = wibParts(d);
  return `${String(p.d).padStart(2, '0')} ${BULAN[p.m - 1]} ${p.y}`;
}

/** "14.32" */
export function jamWib(d: Date = new Date()): string {
  const p = wibParts(d);
  return `${p.hh}.${p.mm}`;
}

/** "04 Okt 2026, 14.32 WIB" */
export function tglJamWib(d: Date = new Date()): string {
  return `${tglWib(d)}, ${jamWib(d)} WIB`;
}

/** "Minggu, 4 Okt 2026" */
export function tglPanjang(d: Date = new Date()): string {
  const p = wibParts(d);
  const dow = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  return `${HARI[dow]}, ${p.d} ${BULAN[p.m - 1]} ${p.y}`;
}

/** "05 Okt 2026" -> Date (UTC, tengah hari agar aman dari pergeseran zona). null bila tidak terbaca. */
export function parseTgl(s: string | undefined): Date | null {
  if (!s) return null;
  const m = s.match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  if (!m) return null;
  const mi = BULAN.findIndex(b => b.toLowerCase() === m[2].toLowerCase());
  if (mi < 0) return null;
  return new Date(Date.UTC(+m[3], mi, +m[1], 12));
}

export function selisihHari(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

/** Nomor dokumen: JUAL-2610-0043 (YYMM + urutan). */
export function nomorDokumen(prefix: string, urutan: number, d: Date = new Date()): string {
  const p = wibParts(d);
  return `${prefix}-${String(p.y).slice(2)}${String(p.m).padStart(2, '0')}-${String(urutan).padStart(4, '0')}`;
}

/** Urutan berikutnya dari daftar ID yang berpola PREFIX-YYMM-NNNN. */
export function urutanBerikut(ids: string[], prefix: string): number {
  let max = 0;
  ids.forEach(id => {
    const m = id.match(new RegExp('^' + prefix + '-\\d{4}-(\\d+)$'));
    if (m) max = Math.max(max, +m[1]);
  });
  return max + 1;
}

/** 08xx / +62xx / 62xx -> 62xxxxxxxx (untuk tautan wa.me) */
export function normalisasiWa(no: string): string {
  const d = (no || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('62')) return d;
  if (d.startsWith('0')) return '62' + d.slice(1);
  return '62' + d;
}

export function linkWa(no: string, pesan?: string): string {
  const n = normalisasiWa(no);
  return `https://wa.me/${n}${pesan ? '?text=' + encodeURIComponent(pesan) : ''}`;
}

export function inisial(nama: string): string {
  const w = (nama || '?').trim().split(/\s+/);
  return ((w[0]?.[0] || '') + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
}

const KATA_SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

/** Angka bulat menjadi kata bahasa Indonesia: 1500000 -> "satu juta lima ratus ribu" */
export function terbilang(angka: number): string {
  const n = Math.floor(Math.abs(Number(angka) || 0));
  if (n === 0) return 'nol';
  const k = (x: number): string => {
    if (x < 12) return KATA_SATUAN[x];
    if (x < 20) return `${k(x - 10)} belas`;
    if (x < 100) return `${k(Math.floor(x / 10))} puluh${x % 10 ? ' ' + k(x % 10) : ''}`;
    if (x < 200) return `seratus${x - 100 ? ' ' + k(x - 100) : ''}`;
    if (x < 1000) return `${k(Math.floor(x / 100))} ratus${x % 100 ? ' ' + k(x % 100) : ''}`;
    if (x < 2000) return `seribu${x - 1000 ? ' ' + k(x - 1000) : ''}`;
    if (x < 1e6) return `${k(Math.floor(x / 1e3))} ribu${x % 1e3 ? ' ' + k(x % 1e3) : ''}`;
    if (x < 1e9) return `${k(Math.floor(x / 1e6))} juta${x % 1e6 ? ' ' + k(x % 1e6) : ''}`;
    if (x < 1e12) return `${k(Math.floor(x / 1e9))} miliar${x % 1e9 ? ' ' + k(x % 1e9) : ''}`;
    return `${k(Math.floor(x / 1e12))} triliun${x % 1e12 ? ' ' + k(x % 1e12) : ''}`;
  };
  return k(n);
}

/** "Satu juta lima ratus ribu rupiah" (untuk nota) */
export function terbilangRupiah(angka: number): string {
  const t = terbilang(angka);
  return `${t.charAt(0).toUpperCase()}${t.slice(1)} rupiah`;
}
