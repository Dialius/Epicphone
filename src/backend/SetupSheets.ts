// SetupSheets.ts — SetupSheets.gs: membangun Spreadsheet, folder Drive, dan trigger dari Skema.ts.
// Aman dijalankan berulang (idempoten): tidak menimpa data atau pengaturan milik owner.
// Fungsi publik: setupAwal() (sekali), perbaikiFolder(), cekStrukturSheet(), migrasiSkema().

import {
  FOLDER, SPREADSHEET_NAME, TIMEZONE, GARANSI_DEFAULT, BATAS_BONUS_PERSEN, BATAS_UMUR_STOK_HARI,
} from './Config';
import {
  SKEMA, Lembar, Kolom, LEBAR_BAWAAN, FORMAT, WARNA_GRUP, WARNA_STATUS, DATA_REFERENSI, VERSI_SKEMA,
  daftarReferensi, TipeKolom,
} from './Skema';
import { sekarang, tglIso, tglId } from './Utils';
import { log } from './Log';

const NAVY = '#0F2A44';
const NAVY_TURUNAN = '#3B5B7E';
const BARIS_BAWAAN = 1000;

// ── Util kecil ────────────────────────────────────────────────────────────────

/** 1 -> A, 27 -> AA */
function huruf(n: number): string {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

const RATA_KANAN: ReadonlySet<TipeKolom> = new Set(['angka', 'rp', 'persen', 'persen1']);
const RATA_TENGAH: ReadonlySet<TipeKolom> = new Set(['tgl', 'jam', 'status']);

function lebarKolom(k: Kolom): number {
  return k.w ?? LEBAR_BAWAAN[k.t];
}

// ── Spreadsheet ───────────────────────────────────────────────────────────────

function namaSpreadsheet(): string {
  const dev = PropertiesService.getScriptProperties().getProperty('LINGKUNGAN') === 'dev';
  return dev ? SPREADSHEET_NAME + '_DEV' : SPREADSHEET_NAME;
}

function ambilAtauBuatSpreadsheet(folderDatabase: GoogleAppsScript.Drive.Folder): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const nama = namaSpreadsheet();
  const ada = DriveApp.getFilesByName(nama);
  if (ada.hasNext()) {
    const file = ada.next();
    return SpreadsheetApp.open(file);
  }
  const ss = SpreadsheetApp.create(nama);
  // PRD 09: Spreadsheet utama berada di EPICPHONE_00_SISTEM/01_DATABASE
  DriveApp.getFileById(ss.getId()).moveTo(folderDatabase);
  return ss;
}

// ── Bangun satu sheet dari skema ──────────────────────────────────────────────

function targetBaris(sheet: GoogleAppsScript.Spreadsheet.Sheet, l: Lembar): number {
  return Math.max(l.baris ?? BARIS_BAWAAN, sheet.getLastRow() + 200);
}

/**
 * Sheet dari versi lama: samakan urutan kolom dengan skema TANPA menghilangkan data. Kolom yang ada dipindah ke
 * posisi skema, kolom yang belum ada disisipkan, kolom asing (milik owner) dipertahankan di sebelah kanan.
 */
function selaraskanKolom(sheet: GoogleAppsScript.Spreadsheet.Sheet, l: Lembar): number {
  if (sheet.getLastColumn() < 1 || sheet.getLastRow() < 1) return 0;
  const h = (sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] as unknown[]).map(x => String(x ?? ''));
  let perubahan = 0;
  l.kolom.forEach((k, i) => {
    if (h[i] === k.n) return;
    const j = h.indexOf(k.n);
    if (j > i) {
      sheet.moveColumns(sheet.getRange(1, j + 1, Math.max(sheet.getMaxRows(), 1), 1), i + 1);
      const [x] = h.splice(j, 1);
      h.splice(i, 0, x);
    } else if (j < 0) {
      if (i >= h.length) sheet.insertColumnAfter(Math.max(h.length, 1)); else sheet.insertColumnBefore(i + 1);
      sheet.getRange(1, i + 1).setValue(k.n);
      h.splice(i, 0, k.n);
    }
    perubahan++;
  });
  return perubahan;
}

function sesuaikanUkuran(sheet: GoogleAppsScript.Spreadsheet.Sheet, kolom: number, baris: number): void {
  const mc = sheet.getMaxColumns();
  // Jangan pernah menghapus kolom yang berisi (mis. kolom tambahan milik owner)
  const target = Math.max(kolom, sheet.getLastColumn());
  if (mc < target) sheet.insertColumnsAfter(mc, target - mc);
  else if (mc > target) sheet.deleteColumns(target + 1, mc - target);
  const mr = sheet.getMaxRows();
  if (mr < baris) sheet.insertRowsAfter(mr, baris - mr);
  else if (mr > baris) sheet.deleteRows(baris + 1, mr - baris);
}

function gayaHeader(sheet: GoogleAppsScript.Spreadsheet.Sheet, l: Lembar): void {
  const n = l.kolom.length;
  const h = sheet.getRange(1, 1, 1, n);
  h.setValues([l.kolom.map(k => k.n)]);
  h.setFontWeight('bold').setFontColor('#FFFFFF').setBackground(NAVY)
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  // kolom terkunci (ID/turunan) diberi warna header sedikit berbeda
  l.kolom.forEach((k, i) => { if (k.kunci) sheet.getRange(1, i + 1).setBackground(NAVY_TURUNAN); });
  sheet.setRowHeight(1, 36);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(0);
}

function formatData(sheet: GoogleAppsScript.Spreadsheet.Sheet, l: Lembar, baris: number): void {
  const n = l.kolom.length;
  const jumlah = baris - 1;
  const data = sheet.getRange(2, 1, jumlah, n);
  const rep = <T>(row: T[]): T[][] => Array.from({ length: jumlah }, () => row);

  data.setFontSize(10).setVerticalAlignment('middle');
  data.setNumberFormats(rep(l.kolom.map(k => FORMAT[k.t])));
  data.setHorizontalAlignments(rep(l.kolom.map(k => (RATA_KANAN.has(k.t) ? 'right' : RATA_TENGAH.has(k.t) ? 'center' : 'left'))));
  data.setWrapStrategies(rep(l.kolom.map(k => (k.t === 'cat' ? SpreadsheetApp.WrapStrategy.WRAP : SpreadsheetApp.WrapStrategy.CLIP))));

  l.kolom.forEach((k, i) => sheet.setColumnWidth(i + 1, lebarKolom(k)));
}

function bandingDanFilter(sheet: GoogleAppsScript.Spreadsheet.Sheet, l: Lembar, baris: number): void {
  const n = l.kolom.length;
  sheet.getBandings().forEach(b => b.remove());
  const b = sheet.getRange(1, 1, baris, n).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false);
  b.setHeaderRowColor(NAVY).setFirstRowColor('#FFFFFF').setSecondRowColor('#F2F5F9');
  const f = sheet.getFilter();
  if (f) f.remove();
  sheet.getRange(1, 1, baris, n).createFilter();
}

function validasiKolom(ss: GoogleAppsScript.Spreadsheet.Spreadsheet, sheet: GoogleAppsScript.Spreadsheet.Sheet, l: Lembar, baris: number): void {
  l.kolom.forEach((k, i) => {
    if (!k.val) return;
    const rentang = sheet.getRange(2, i + 1, baris - 1, 1);
    let rule: GoogleAppsScript.Spreadsheet.DataValidation | null = null;
    if (k.val.startsWith('RANGE:')) {
      const sumber = ss.getRange(k.val.slice(6));
      rule = SpreadsheetApp.newDataValidation().requireValueInRange(sumber, true).setAllowInvalid(true).build();
    } else {
      const nilai = daftarReferensi(k.val);
      if (!nilai.length) return;
      rule = SpreadsheetApp.newDataValidation().requireValueInList(nilai, true)
        .setAllowInvalid(!!k.lunak).setHelpText(`Pilih salah satu: ${nilai.join(', ')}`).build();
    }
    rentang.setDataValidation(rule);
  });
}

/** Warna status (hijau/kuning/merah/abu) lewat rumus: empat aturan per kolom status */
function warnaStatus(sheet: GoogleAppsScript.Spreadsheet.Sheet, l: Lembar, baris: number): void {
  const aturan: GoogleAppsScript.Spreadsheet.ConditionalFormatRule[] = [];
  l.kolom.forEach((k, i) => {
    if (k.t !== 'status') return;
    const rentang = sheet.getRange(2, i + 1, baris - 1, 1);
    const sel = `$${huruf(i + 1)}2`;
    (Object.keys(WARNA_STATUS) as Array<keyof typeof WARNA_STATUS>).forEach(w => {
      const warna = WARNA_STATUS[w];
      const rumus = '=OR(' + warna.nilai.map(v => `${sel}="${v}"`).join(',') + ')';
      aturan.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(rumus).setBackground(warna.bg).setFontColor(warna.fg).setRanges([rentang]).build());
    });
  });
  sheet.setConditionalFormatRules(aturan);
}

/** Proteksi: seluruh sheet dikunci (peringatan), kecuali kolom isian. Kolom ID/turunan hanya diisi kode. */
function proteksi(sheet: GoogleAppsScript.Spreadsheet.Sheet, l: Lembar, baris: number): void {
  sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(p => p.remove());
  const p = sheet.protect().setDescription('EPICPHONE: kolom ID dan rumus dikunci, perubahan lewat aplikasi').setWarningOnly(true);
  if (l.proteksiPenuh) return;
  // rentang isian = kolom berurutan yang tidak terkunci
  const bebas: GoogleAppsScript.Spreadsheet.Range[] = [];
  let awal = -1;
  l.kolom.forEach((k, i) => {
    if (!k.kunci && awal < 0) awal = i;
    if ((k.kunci || i === l.kolom.length - 1) && awal >= 0) {
      const akhir = k.kunci ? i - 1 : i;
      bebas.push(sheet.getRange(2, awal + 1, baris - 1, akhir - awal + 1));
      awal = -1;
    }
  });
  p.setUnprotectedRanges(bebas);
}

function bangunSheet(ss: GoogleAppsScript.Spreadsheet.Spreadsheet, l: Lembar): GoogleAppsScript.Spreadsheet.Sheet {
  const sheet = ss.getSheetByName(l.nama) ?? ss.insertSheet(l.nama);
  selaraskanKolom(sheet, l);
  const baris = targetBaris(sheet, l);
  sesuaikanUkuran(sheet, l.kolom.length, baris);
  gayaHeader(sheet, l);
  formatData(sheet, l, baris);
  bandingDanFilter(sheet, l, baris);
  validasiKolom(ss, sheet, l, baris);
  warnaStatus(sheet, l, baris);
  sheet.setTabColor(WARNA_GRUP[l.grup]);
  proteksi(sheet, l, baris);
  return sheet;
}

// ── Folder Drive (PRD 09 bagian 3) ────────────────────────────────────────────

function ambilAtauBuatFolder(induk: GoogleAppsScript.Drive.Folder, nama: string): GoogleAppsScript.Drive.Folder {
  const it = induk.getFoldersByName(nama);
  return it.hasNext() ? it.next() : induk.createFolder(nama);
}

function bangunFolder(): { ids: Record<string, string>; database: GoogleAppsScript.Drive.Folder } {
  const utama = ambilAtauBuatFolder(DriveApp.getRootFolder(), FOLDER.UTAMA);
  const sub: Record<string, GoogleAppsScript.Drive.Folder> = {};
  [FOLDER.ASET_BRAND, FOLDER.DATABASE, FOLDER.FOTO_HP, FOLDER.NOTA, FOLDER.BUKTI_TRANSAKSI, FOLDER.SERVIS,
    FOLDER.LAPORAN, FOLDER.BACKUP, FOLDER.ARSIP, FOLDER.TEMPLATE_IMPOR].forEach(n => { sub[n] = ambilAtauBuatFolder(utama, n); });

  ambilAtauBuatFolder(sub[FOLDER.FOTO_HP], FOLDER.TERHAPUS);
  ambilAtauBuatFolder(sub[FOLDER.NOTA], FOLDER.NOTA_RIWAYAT);
  [FOLDER.BUKTI_PEMBELIAN, FOLDER.BUKTI_PEMBAYARAN, FOLDER.BUKTI_BIAYA].forEach(n => ambilAtauBuatFolder(sub[FOLDER.BUKTI_TRANSAKSI], n));
  [FOLDER.BACKUP_HARIAN, FOLDER.BACKUP_BULANAN, FOLDER.BACKUP_MINGGUAN, FOLDER.BACKUP_PRA_RILIS,
    FOLDER.BACKUP_PRA_MIGRASI, FOLDER.BACKUP_PENGAMAN].forEach(n => ambilAtauBuatFolder(sub[FOLDER.BACKUP], n));

  return {
    database: sub[FOLDER.DATABASE],
    ids: {
      ID_FOLDER_UTAMA: utama.getId(), ID_FOLDER_ASET_BRAND: sub[FOLDER.ASET_BRAND].getId(),
      ID_FOLDER_DATABASE: sub[FOLDER.DATABASE].getId(), ID_FOLDER_FOTO_HP: sub[FOLDER.FOTO_HP].getId(),
      ID_FOLDER_NOTA: sub[FOLDER.NOTA].getId(), ID_FOLDER_BUKTI: sub[FOLDER.BUKTI_TRANSAKSI].getId(),
      ID_FOLDER_SERVIS: sub[FOLDER.SERVIS].getId(), ID_FOLDER_LAPORAN: sub[FOLDER.LAPORAN].getId(),
      ID_FOLDER_BACKUP: sub[FOLDER.BACKUP].getId(), ID_FOLDER_ARSIP: sub[FOLDER.ARSIP].getId(),
      ID_FOLDER_TEMPLATE: sub[FOLDER.TEMPLATE_IMPOR].getId(),
    },
  };
}

// ── Isi awal: Referensi dan Pengaturan ────────────────────────────────────────

/** Tambah baris yang belum ada saja; tidak menimpa apa pun */
function tambahBarisBaru(sheet: GoogleAppsScript.Spreadsheet.Sheet, kunci: (r: unknown[]) => string, baru: unknown[][]): number {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const ada = new Set<string>();
  if (lastRow >= 2) (sheet.getRange(2, 1, lastRow - 1, lastCol).getValues() as unknown[][]).forEach(r => ada.add(kunci(r)));
  const tambah = baru.filter(r => !ada.has(kunci(r)));
  if (tambah.length) sheet.getRange(Math.max(lastRow, 1) + 1, 1, tambah.length, lastCol).setValues(tambah);
  return tambah.length;
}

function isiReferensi(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): number {
  const sheet = ss.getSheetByName('Referensi');
  if (!sheet) return 0;
  const baris: unknown[][] = [];
  DATA_REFERENSI.forEach(([kelompok, nilai]) => nilai.forEach((v, i) => baris.push([kelompok, v, i + 1])));
  return tambahBarisBaru(sheet, r => `${String(r[0])}|${String(r[1])}`, baris);
}

export const PAKET_BONUS_AWAL = JSON.stringify([
  { nama: 'Paket Dasar', item: [{ nama: 'Tempered Glass', qty: 1 }, { nama: 'Casing', qty: 1 }] },
]);

function isiPengaturan(ss: GoogleAppsScript.Spreadsheet.Spreadsheet, folderIds: Record<string, string>): number {
  const sheet = ss.getSheetByName('Pengaturan');
  if (!sheet) return 0;
  const rows: Array<[string, string, string]> = [
    ['NAMA_TOKO', 'Epic Phone Purwokerto', 'Nama toko pada nota dan header aplikasi'],
    ['TAGLINE', 'Inovasi Ada Di Genggaman', 'Tagline pada nota dan layar masuk'],
    ['INSTAGRAM', '@epicphone_purwokerto', 'Akun Instagram toko'],
    ['ALAMAT', '(isi alamat toko)', 'Alamat toko untuk nota'],
    ['NO_WA', '(isi nomor WA toko)', 'Nomor WA toko, format 628xxxx'],
    ['ID_BERKAS_LOGO', '(isi ID berkas logo di Drive)', 'ID file logo PNG di Drive (folder 00_ASET-BRAND)'],
    ['GARANSI_BARU_BULAN', String(GARANSI_DEFAULT.BARU_BULAN), 'Lama garansi HP baru (bulan)'],
    ['GARANSI_BEKAS_HARI', String(GARANSI_DEFAULT.BEKAS_HARI), 'Lama garansi HP bekas (hari)'],
    ['GARANSI_AKSESORIS_HARI', String(GARANSI_DEFAULT.AKSESORIS_HARI), 'Lama garansi aksesoris (hari)'],
    ['BATAS_UMUR_STOK_HARI', String(BATAS_UMUR_STOK_HARI), 'Peringatan HP tidak terjual melebihi hari ini'],
    ['STOK_MINIMUM_DEFAULT', '3', 'Stok minimum untuk aksesoris baru'],
    ['AMBANG_TEMPO_HARI', '3', 'Peringatan tagihan jatuh tempo dalam sekian hari'],
    ['BATAS_BONUS_PERSEN', String(BATAS_BONUS_PERSEN), 'Peringatan jika biaya bonus melebihi persen ini dari laba kotor item utama'],
    ['PAKET_BONUS', PAKET_BONUS_AWAL, 'Paket bonus preset (JSON): nama paket dan daftar item'],
    ['NOTA_UKURAN', 'A5', 'Ukuran nota: A5 atau 80mm'],
    ['NOTA_LINK_PUBLIK', 'Ya', 'Nota bisa dibuka siapa pun yang punya tautan (Ya/Tidak)'],
    ['SYARAT_GARANSI', 'Garansi berlaku untuk kerusakan pabrik. Tidak berlaku untuk kerusakan akibat kelalaian pengguna.', 'Syarat singkat garansi pada nota'],
    ...Object.keys(folderIds).map(k => [k, folderIds[k], 'ID folder Drive (jangan diubah manual)'] as [string, string, string]),
    ['SPREADSHEET_ID', ss.getId(), 'ID Spreadsheet utama'],
    ['SETUP_TANGGAL', tglId(tglIso(sekarang())), 'Tanggal setup pertama kali dijalankan'],
    ['VERSI', '1.1.0', 'Versi aplikasi'],
    ['VERSI_SKEMA', String(VERSI_SKEMA), 'Versi skema Spreadsheet (migrasi: PRD 06 bagian 7)'],
  ];
  const sudah = tambahBarisBaru(sheet, r => String(r[0]), rows);
  // ID folder bisa berubah bila folder dibuat ulang: perbarui nilainya
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const nilai = sheet.getRange(2, 1, lastRow - 1, 2).getValues() as unknown[][];
    nilai.forEach((r, i) => {
      const k = String(r[0]);
      if (folderIds[k] !== undefined && r[1] !== folderIds[k]) sheet.getRange(i + 2, 2).setValue(folderIds[k]);
    });
  }
  return sudah;
}

// ── Trigger (PRD 06 bagian 5: terpisah, jam tidak bertabrakan) ───────────────

const JADWAL: Array<{ fungsi: string; jam: number; mingguan?: boolean }> = [
  { fungsi: 'jobBackupHarian', jam: 1 },
  { fungsi: 'jobBackupBulanan', jam: 2 },    // jalan tiap hari, bekerja hanya tanggal 1
  { fungsi: 'jobLaporanBulanan', jam: 3 },   // jalan tiap hari, bekerja hanya tanggal 1
  { fungsi: 'jobBersihkan', jam: 4 },
  { fungsi: 'jobBackupMingguan', jam: 5, mingguan: true },
  { fungsi: 'jobCekTagihan', jam: 6 },
];

function pasangTrigger(): number {
  const nama = new Set(JADWAL.map(j => j.fungsi));
  ScriptApp.getProjectTriggers().filter(t => nama.has(t.getHandlerFunction())).forEach(t => ScriptApp.deleteTrigger(t));
  JADWAL.forEach(j => {
    const b = ScriptApp.newTrigger(j.fungsi).timeBased().inTimezone(TIMEZONE).atHour(j.jam).nearMinute(0);
    if (j.mingguan) b.onWeekDay(ScriptApp.WeekDay.SUNDAY).everyWeeks(1).create();
    else b.everyDays(1).create();
  });
  return JADWAL.length;
}

// ── Fungsi publik ─────────────────────────────────────────────────────────────

/** Jalankan SEKALI dari editor Apps Script untuk membuat seluruh infrastruktur sistem. */
export function setupAwal(): string {
  const { ids, database } = bangunFolder();
  const ss = ambilAtauBuatSpreadsheet(database);
  ss.setSpreadsheetTimeZone(TIMEZONE);
  ss.setSpreadsheetLocale('id_ID'); // bulan tampil Okt/Agu/Des dan pemisah ribuan titik
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());

  SKEMA.forEach(l => bangunSheet(ss, l));
  const bawaan = ss.getSheetByName('Sheet1') ?? ss.getSheetByName('Lembar1');
  if (bawaan && ss.getSheets().length > 1) ss.deleteSheet(bawaan);
  // urutan tab mengikuti PRD
  SKEMA.forEach((l, i) => { const s = ss.getSheetByName(l.nama); if (s) { ss.setActiveSheet(s); ss.moveActiveSheet(i + 1); } });

  isiReferensi(ss);
  isiPengaturan(ss, ids);
  const trigger = pasangTrigger();

  log('Sistem', 'Sistem', 'SETUP', `setupAwal() selesai: ${SKEMA.length} sheet, ${trigger} trigger.`);
  Logger.log('setupAwal() selesai. Spreadsheet: ' + ss.getUrl());
  return ss.getUrl();
}

/** Buat ulang folder yang terhapus dengan nama baku dan perbarui ID di Pengaturan (PRD 03 bagian 12). */
export function perbaikiFolder(): string {
  const { ids } = bangunFolder();
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) isiPengaturan(SpreadsheetApp.openById(id), ids);
  return 'Folder diperiksa dan diperbaiki.';
}

export interface SelisihStruktur { sheet: string; masalah: string }

/** Bandingkan header setiap sheet dengan skema; kembalikan daftar selisih (kosong = sesuai). */
export function cekStrukturSheet(): SelisihStruktur[] {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) return [{ sheet: '-', masalah: 'Spreadsheet belum dibuat. Jalankan setupAwal().' }];
  const ss = SpreadsheetApp.openById(id);
  const hasil: SelisihStruktur[] = [];
  SKEMA.forEach(l => {
    const sheet = ss.getSheetByName(l.nama);
    if (!sheet) { hasil.push({ sheet: l.nama, masalah: 'Sheet tidak ada' }); return; }
    const h = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0] as string[];
    l.kolom.forEach((k, i) => { if (h[i] !== k.n) hasil.push({ sheet: l.nama, masalah: `Kolom ${i + 1} seharusnya ${k.n}, ditemukan ${String(h[i] ?? '(kosong)')}` }); });
    if (h.length > l.kolom.length && h.slice(l.kolom.length).some(x => x !== '')) hasil.push({ sheet: l.nama, masalah: 'Ada kolom tambahan di luar skema' });
  });
  return hasil;
}

/**
 * Migrasi skema bertahap dan idempoten: menyisipkan kolom yang belum ada pada posisi skema,
 * lalu menerapkan ulang format. Backup "pra-migrasi" dibuat lebih dulu (PRD 06 bagian 7).
 */
export function migrasiSkema(): string {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) return 'Spreadsheet belum dibuat. Jalankan setupAwal().';
  const ss = SpreadsheetApp.openById(id);
  let disisipkan = 0;
  SKEMA.forEach(l => {
    const sheet = ss.getSheetByName(l.nama);
    if (!sheet) return;
    l.kolom.forEach((k, i) => {
      const h = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] as string[];
      if (h.indexOf(k.n) < 0) { sheet.insertColumnBefore(i + 1); sheet.getRange(1, i + 1).setValue(k.n); disisipkan++; }
    });
  });
  SKEMA.forEach(l => bangunSheet(ss, l));
  isiReferensi(ss);
  const p = ss.getSheetByName('Pengaturan');
  if (p) isiPengaturan(ss, {});
  return `Migrasi selesai: ${disisipkan} kolom disisipkan.`;
}
