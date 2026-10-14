// Utils.ts — format, validasi, sanitasi

import { TIMEZONE } from './Config';

/** Format Rupiah: 3250000 -> "Rp 3.250.000" */
export function formatRupiah(angka: number): string {
  // Pemisah titik dibuat manual: tidak bergantung pada dukungan locale runtime Apps Script
  const n = Math.round(angka);
  const teks = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-Rp ' : 'Rp ') + teks;
}

/** Parse Rupiah string -> number; toleran terhadap titik dan spasi */
export function parseRupiah(str: string): number {
  return parseInt(str.replace(/[^\d]/g, ''), 10) || 0;
}

/** Format tanggal: Date -> "05 Okt 2026" */
export function formatTanggal(d: Date): string {
  return Utilities.formatDate(d, TIMEZONE, 'dd MMM yyyy');
}

/** Format jam: Date -> "14:32" */
export function formatJam(d: Date): string {
  return Utilities.formatDate(d, TIMEZONE, 'HH:mm');
}

/** Sekarang dalam WIB */
export function sekarang(): Date {
  return new Date();
}

/** Validasi IMEI: harus 15 digit angka */
export function validasiIMEI(imei: string): boolean {
  return /^\d{15}$/.test(imei.trim());
}

/**
 * Sanitasi teks agar tidak dieksekusi sebagai rumus Spreadsheet.
 * Hapus karakter awal =, +, -, @
 */
export function sanitasi(teks: string): string {
  if (!teks) return '';
  return teks.replace(/^[=+\-@]+/, '').trim();
}

/** Normalisasi nomor WA ke format 62 */
export function normalisasiWA(no: string): string {
  const bersih = no.replace(/\D/g, '');
  if (bersih.startsWith('0')) return '62' + bersih.slice(1);
  if (bersih.startsWith('62')) return bersih;
  return bersih;
}

/** Slug: teks bebas -> UPPER-KEBAB-CASE, hanya A-Z 0-9 - */
export function slug(teks: string, maks = 80): string {
  return teks
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maks);
}

/** 4 digit terakhir IMEI */
export function imeiAkhir(imei: string): string {
  return imei.slice(-4);
}

/** YYMM dari Date: "2610" untuk Oktober 2026 */
export function yymm(d: Date): string {
  const y = Utilities.formatDate(d, TIMEZONE, 'yy');
  const m = Utilities.formatDate(d, TIMEZONE, 'MM');
  return y + m;
}

// ── Tanggal untuk penyimpanan (ISO, tidak ambigu) dan tampilan ───────────────

const BULAN_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Tanggal simpan: Date -> "2026-10-05" (WIB) */
export function tglIso(d: Date): string {
  return Utilities.formatDate(d, TIMEZONE, 'yyyy-MM-dd');
}

/** Jam simpan: Date -> "14:32" (WIB) */
export function jamHm(d: Date): string {
  return Utilities.formatDate(d, TIMEZONE, 'HH:mm');
}

/** "2026-10-05" -> "05 Okt 2026". Nilai yang bukan ISO dikembalikan apa adanya. */
export function tglId(iso: unknown): string {
  const s = String(iso ?? '');
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  return `${m[3]} ${BULAN_ID[Number(m[2]) - 1]} ${m[1]}`;
}

/** "14:32" -> "14.32" (format tampilan di layar) */
export function jamId(hm: unknown): string {
  return String(hm ?? '').replace(':', '.');
}

function msIso(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
}

/** Selisih hari kalender b - a (keduanya ISO). NaN bila tidak valid. */
export function selisihHariIso(a: string, b: string): number {
  return Math.round((msIso(b) - msIso(a)) / 86400000);
}

/** Tambah n hari ke tanggal ISO */
export function tambahHariIso(iso: string, n: number): string {
  const d = new Date(msIso(iso) + n * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Tambah n bulan ke tanggal ISO (hari dipangkas ke akhir bulan bila perlu) */
export function tambahBulanIso(iso: string, n: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const total = Number(m[1]) * 12 + (Number(m[2]) - 1) + n;
  const y = Math.floor(total / 12);
  const mo = total % 12;
  const akhir = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  const h = Math.min(Number(m[3]), akhir);
  return `${y}-${String(mo + 1).padStart(2, '0')}-${String(h).padStart(2, '0')}`;
}

/** Apakah string ISO tanggal yang valid (yyyy-mm-dd) */
export function isoValid(s: unknown): boolean {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(msIso(s));
}

/** Angka aman dari nilai sel (string/number/kosong) */
export function angka(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** "2026-10-05" -> Date tengah malam waktu skrip (WIB). Di Apps Script zona skrip = Asia/Jakarta. */
export function isoKeDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Minggu ISO "2026-W40" dari tanggal ISO (PRD 09: nama backup mingguan) */
export function mingguIso(iso: string): string {
  const d = new Date(msIso(iso));
  const hari = (d.getUTCDay() + 6) % 7; // Senin = 0
  d.setUTCDate(d.getUTCDate() - hari + 3); // Kamis pada minggu yang sama menentukan tahun ISO
  const tahun = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(tahun, 0, 4));
  const minggu = 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${tahun}-W${String(minggu).padStart(2, '0')}`;
}

/** "2026-10" -> "Okt 2026" */
export function labelBulan(bulan: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(bulan);
  return m ? `${BULAN_ID[Number(m[2]) - 1]} ${m[1]}` : bulan;
}

/** Tambah n bulan ke "YYYY-MM" */
export function geserBulan(bulan: string, n: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(bulan);
  if (!m) return bulan;
  const t = Number(m[1]) * 12 + Number(m[2]) - 1 + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

const KATA_SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

/** Angka bulat menjadi kata: 1500000 -> "satu juta lima ratus ribu" */
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

/** "Satu juta lima ratus ribu rupiah" */
export function terbilangRupiah(angka: number): string {
  const t = terbilang(angka);
  return `${t.charAt(0).toUpperCase()}${t.slice(1)} rupiah`;
}
