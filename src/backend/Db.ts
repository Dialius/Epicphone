// Db.ts — repository generik berbasis nama header.
//  - Spreadsheet dibuka sekali per eksekusi (ID disimpan di ScriptProperties).
//  - Nilai Date dari sel diubah ke teks (google.script.run tidak bisa membawa Date).
//  - transaksi(): semua tulis di dalamnya dicatat; bila ada galat, dikembalikan.
//    Baris tidak dihapus (menggeser baris lain); baris yang dibatalkan dikosongkan
//    dan dilewati saat dibaca, lalu ditimpa penulisan berikutnya.

import { SPREADSHEET_NAME, CACHE_TTL_S, TIMEZONE } from './Config';
import { GalatBisnis } from './Galat';
import { kolomSkema, lembarSkema, FORMAT, LEBAR_BAWAAN, TIPE_ANGKA, TIPE_TEKS } from './Skema';
import { isoKeDate } from './Utils';

export type Row = Record<string, unknown>;

let ssMemo: GoogleAppsScript.Spreadsheet.Spreadsheet | null = null;
const sheetMemo: Record<string, GoogleAppsScript.Spreadsheet.Sheet> = {};
const headerMemo: Record<string, string[]> = {};

function getSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  if (ssMemo) return ssMemo;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SPREADSHEET_ID');
  if (id) {
    try {
      ssMemo = SpreadsheetApp.openById(id);
      return ssMemo;
    } catch {
      // ID usang: cari ulang berdasarkan nama
    }
  }
  const dev = props.getProperty('LINGKUNGAN') === 'dev';
  const files = DriveApp.getFilesByName(dev ? SPREADSHEET_NAME + '_DEV' : SPREADSHEET_NAME);
  if (!files.hasNext()) {
    throw new GalatBisnis('DB_BELUM_SIAP', `Spreadsheet "${SPREADSHEET_NAME}" tidak ditemukan. Jalankan setupAwal() terlebih dahulu.`);
  }
  ssMemo = SpreadsheetApp.open(files.next());
  props.setProperty('SPREADSHEET_ID', ssMemo.getId());
  return ssMemo;
}

/**
 * Sheet yang dibuat oleh versi lama mungkin belum punya kolom baru. Tanpa ini isian untuk kolom itu terbuang
 * tanpa kabar (data "tidak masuk"). Kolom yang hilang disisipkan di posisi skema, data lama ikut bergeser.
 */
function sehatkanKolom(sheet: GoogleAppsScript.Spreadsheet.Sheet, namaSheet: string): void {
  const lembar = lembarSkema(namaSheet);
  if (!lembar || sheet.getLastColumn() < 1) return;
  const h = (sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] as unknown[]).map(x => String(x ?? ''));
  lembar.kolom.forEach((k, i) => {
    if (h.indexOf(k.n) >= 0) return;
    const pos = Math.min(i, h.length);
    if (pos >= h.length) sheet.insertColumnAfter(Math.max(h.length, 1));
    else sheet.insertColumnBefore(pos + 1);
    sheet.getRange(1, pos + 1).setValue(k.n);
    const baris = Math.max(sheet.getMaxRows() - 1, 1);
    sheet.getRange(2, pos + 1, baris, 1).setNumberFormat(FORMAT[k.t]);
    sheet.setColumnWidth(pos + 1, k.w ?? LEBAR_BAWAAN[k.t]);
    h.splice(pos, 0, k.n);
    Logger.log(`Kolom ${k.n} ditambahkan ke sheet ${namaSheet} (sheet dari versi lama).`);
  });
}

function getSheet(namaSheet: string): GoogleAppsScript.Spreadsheet.Sheet {
  const ada = sheetMemo[namaSheet];
  if (ada) return ada;
  const sheet = getSpreadsheet().getSheetByName(namaSheet);
  if (!sheet) throw new GalatBisnis('DB_BELUM_SIAP', `Sheet "${namaSheet}" tidak ditemukan.`);
  sehatkanKolom(sheet, namaSheet);
  sheetMemo[namaSheet] = sheet;
  return sheet;
}

function getHeaders(namaSheet: string): string[] {
  const ada = headerMemo[namaSheet];
  if (ada) return ada;
  const sheet = getSheet(namaSheet);
  const h = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] as string[];
  headerMemo[namaSheet] = h;
  return h;
}

/** Date -> teks. Sel jam murni dibaca Sheets sebagai tahun 1899. */
function normalisasi(v: unknown): unknown {
  if (v instanceof Date) {
    if (v.getFullYear() < 1950) return Utilities.formatDate(v, TIMEZONE, 'HH:mm');
    return Utilities.formatDate(v, TIMEZONE, 'yyyy-MM-dd');
  }
  return v;
}

/** Baca semua baris sebagai array of object {header: nilai}; baris kosong dilewati */
function readAll(namaSheet: string): Row[] {
  const sheet = getSheet(namaSheet);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues() as unknown[][];
  const headers = data[0] as string[];
  const hasil: Row[] = [];
  for (let r = 1; r < data.length; r++) {
    const baris = data[r];
    if (baris[0] === '' || baris[0] === null) continue;
    const o: Row = {};
    for (let c = 0; c < headers.length; c++) o[headers[c]] = normalisasi(baris[c]);
    hasil.push(o);
  }
  return hasil;
}

/** Baca dari cache atau sheet (cache dilewati bila data lebih dari batas 100 KB) */
function getAllCached(namaSheet: string): Row[] {
  const cache = CacheService.getScriptCache();
  const key = `sheet_${namaSheet}`;
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached) as Row[];
  const rows = readAll(namaSheet);
  try {
    const json = JSON.stringify(rows);
    if (json.length < 90_000) cache.put(key, json, CACHE_TTL_S);
  } catch {
    // tidak apa-apa: cache hanya akselerasi
  }
  return rows;
}

function invalidateCache(namaSheet: string): void {
  CacheService.getScriptCache().remove(`sheet_${namaSheet}`);
}

// ── Jurnal transaksi ──────────────────────────────────────────────────────────

let jurnal: Array<() => void> | null = null;

function transaksi<T>(fn: () => T): T {
  if (jurnal) return fn(); // sudah di dalam transaksi
  const catatan: Array<() => void> = [];
  jurnal = catatan;
  try {
    const hasil = fn();
    jurnal = null;
    return hasil;
  } catch (e) {
    jurnal = null;
    for (let i = catatan.length - 1; i >= 0; i--) {
      try { catatan[i](); } catch { /* lanjutkan membatalkan sisanya */ }
    }
    throw e;
  }
}

// ── Tulis ─────────────────────────────────────────────────────────────────────

/**
 * Ubah nilai ke bentuk yang benar untuk kolomnya (skema): tanggal -> tanggal asli (tampil dd MMM yyyy),
 * angka/Rupiah -> angka, sisanya -> teks (IMEI, WA, ID tidak boleh berubah jadi angka).
 */
function untukSel(namaSheet: string, kolom: string, v: unknown): unknown {
  if (v === undefined || v === null || v === '') return '';
  const k = kolomSkema(namaSheet, kolom);
  if (!k) return v;
  if (k.t === 'tgl') {
    if (v instanceof Date) return v;
    return isoKeDate(String(v)) ?? String(v);
  }
  if (TIPE_ANGKA.has(k.t)) {
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : String(v);
  }
  if (TIPE_TEKS.has(k.t)) return String(v);
  return v;
}

/** Sediakan baris bila sheet penuh (Spreadsheet tidak menambah baris sendiri lewat setValues) */
function pastikanBaris(sheet: GoogleAppsScript.Spreadsheet.Sheet, sampai: number): void {
  const maks = sheet.getMaxRows();
  if (sampai > maks) sheet.insertRowsAfter(maks, Math.max(sampai - maks, 500));
}

/** Tambah satu baris; kolom yang tidak ada di header diabaikan. Mengembalikan nomor baris. */
function append(namaSheet: string, data: Row): number {
  const sheet = getSheet(namaSheet);
  const headers = getHeaders(namaSheet);
  // Isian yang tidak punya kolom tidak boleh hilang diam-diam
  const asing = Object.keys(data).filter(k => data[k] !== undefined && data[k] !== null && data[k] !== '' && headers.indexOf(k) < 0);
  if (asing.length) throw new GalatBisnis('KOLOM_TIDAK_DIKENAL', `Kolom ${asing.join(', ')} tidak ada di sheet ${namaSheet}. Jalankan setupAwal() atau migrasiSkema().`);
  const row = headers.map(h => untukSel(namaSheet, h, data[h]));
  const nomor = sheet.getLastRow() + 1;
  pastikanBaris(sheet, nomor);
  sheet.getRange(nomor, 1, 1, headers.length).setValues([row]);
  if (jurnal) {
    jurnal.push(() => {
      sheet.getRange(nomor, 1, 1, headers.length).clearContent();
      invalidateCache(namaSheet);
    });
  }
  invalidateCache(namaSheet);
  return nomor;
}

/** Cari satu baris by nilai kolom tertentu (perbandingan teks, dipangkas) */
function cariBy(namaSheet: string, kolom: string, nilai: unknown): Row | null {
  const target = String(nilai ?? '').trim();
  if (!target) return null;
  return readAll(namaSheet).find(r => String(r[kolom] ?? '').trim() === target) ?? null;
}

/** Cari baris by kolom ID (default kolom pertama) */
function findById(namaSheet: string, id: string, kolomId = 0): Row | null {
  return cariBy(namaSheet, getHeaders(namaSheet)[kolomId], id);
}

/** Ubah satu baris yang kolom `kolomKunci`-nya bernilai `nilai`. Dikembalikan bila galat. */
function updateBy(namaSheet: string, kolomKunci: string, nilai: unknown, data: Row): boolean {
  const sheet = getSheet(namaSheet);
  const headers = getHeaders(namaSheet);
  const kolomIdx = headers.indexOf(kolomKunci);
  if (kolomIdx < 0) throw new GalatBisnis('KOLOM_HILANG', `Kolom ${kolomKunci} tidak ada di sheet ${namaSheet}.`);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const target = String(nilai ?? '').trim();
  const kunci = sheet.getRange(2, kolomIdx + 1, lastRow - 1, 1).getValues() as unknown[][];
  let nomor = -1;
  for (let i = 0; i < kunci.length; i++) {
    if (String(kunci[i][0] ?? '').trim() === target) { nomor = i + 2; break; }
  }
  if (nomor < 0) return false;

  const range = sheet.getRange(nomor, 1, 1, headers.length);
  const lama = range.getValues()[0] as unknown[];
  const baru = lama.slice();
  Object.keys(data).forEach(k => {
    const c = headers.indexOf(k);
    if (c < 0) {
      if (data[k] !== undefined && data[k] !== null && data[k] !== '') {
        throw new GalatBisnis('KOLOM_TIDAK_DIKENAL', `Kolom ${k} tidak ada di sheet ${namaSheet}. Jalankan setupAwal() atau migrasiSkema().`);
      }
      return;
    }
    baru[c] = untukSel(namaSheet, k, data[k]);
  });
  range.setValues([baru]);
  if (jurnal) {
    jurnal.push(() => {
      sheet.getRange(nomor, 1, 1, headers.length).setValues([lama]);
      invalidateCache(namaSheet);
    });
  }
  invalidateCache(namaSheet);
  return true;
}

/** Ubah satu baris by nilai kolom pertama */
function updateById(namaSheet: string, id: string, data: Row): boolean {
  return updateBy(namaSheet, getHeaders(namaSheet)[0], id, data);
}

/** Baca semua (tanpa cache) — untuk operasi tulis yang butuh data segar */
function getAll(namaSheet: string): Row[] {
  return readAll(namaSheet);
}

export const Db = {
  getAll,
  getAllCached,
  findById,
  cariBy,
  append,
  updateById,
  updateBy,
  transaksi,
  invalidateCache,
  getSheet,
  getSpreadsheet,
};
