// Jobs.ts — pekerjaan terjadwal (trigger): backup, cek tagihan, bersihkan.
// Kegagalan dicatat di Log_Aktivitas (lalu dilempar ulang supaya tercatat di eksekusi Apps Script).

import { SHEET, FOLDER } from './Config';
import { Db } from './Db';
import { subfolder } from './Drive';
import { log } from './Log';
import { SKEMA } from './Skema';
import { namaBackup } from './Penamaan';
import { cekTagihanTelat } from './TagihanService';
import { denganLock } from './Lock';
import { sekarang, tglIso, jamHm, selisihHariIso } from './Utils';

const HARI_SIMPAN_HARIAN = 30;
const JUMLAH_SIMPAN_BULANAN = 12;

function jalankan(nama: string, fn: () => string): void {
  try {
    const ringkas = fn();
    log('Sistem', 'Jobs', nama, ringkas);
  } catch (e) {
    log('Sistem', 'Jobs', nama, 'GAGAL: ' + (e instanceof Error ? e.message : String(e)));
    throw e;
  }
}

function salinDatabase(folder: GoogleAppsScript.Drive.Folder, nama: string): void {
  jalankanBackupSalinan(folder, nama);
}

/** Pangkas berkas bernama berawalan `awalan` di folder: hapus yang lebih dari `lebihDariHari`, atau sisakan `maks` terbaru */
function pangkas(folder: GoogleAppsScript.Drive.Folder, awalan: string, opsi: { lebihDariHari?: number; maks?: number }): number {
  const berkas: GoogleAppsScript.Drive.File[] = [];
  const it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    if (f.getName().indexOf(awalan) === 0) berkas.push(f);
  }
  berkas.sort((a, b) => b.getDateCreated().getTime() - a.getDateCreated().getTime());
  let dihapus = 0;
  berkas.forEach((f, i) => {
    const usiaHari = (Date.now() - f.getDateCreated().getTime()) / 86400000;
    const kelebihan = opsi.maks !== undefined && i >= opsi.maks;
    const kadaluarsa = opsi.lebihDariHari !== undefined && usiaHari > opsi.lebihDariHari;
    if (kelebihan || kadaluarsa) { f.setTrashed(true); dihapus++; }
  });
  return dihapus;
}

export function jalankanBackupHarian(): void {
  jalankan('jobBackupHarian', () => {
    const folder = subfolder(FOLDER.BACKUP, FOLDER.BACKUP_HARIAN);
    const nama = namaBackup('HARIAN', sekarang());
    salinDatabase(folder, nama);
    const hapus = pangkas(folder, 'EPICPHONE_BACKUP_HARIAN_', { lebihDariHari: HARI_SIMPAN_HARIAN });
    return `Backup harian ${nama}; ${hapus} backup lama dihapus.`;
  });
}

export function jalankanBackupBulanan(): void {
  jalankan('jobBackupBulanan', () => {
    if (Number(tglIso(sekarang()).slice(8, 10)) !== 1) return 'Dilewati: bukan tanggal 1.';
    const folder = subfolder(FOLDER.BACKUP, FOLDER.BACKUP_BULANAN);
    const nama = namaBackup('BULANAN', sekarang());
    salinDatabase(folder, nama);
    const hapus = pangkas(folder, 'EPICPHONE_BACKUP_BULANAN_', { maks: JUMLAH_SIMPAN_BULANAN });
    return `Backup bulanan ${nama}; ${hapus} backup lama dihapus.`;
  });
}

export function jalankanCekTagihan(): void {
  jalankan('jobCekTagihan', () => `${cekTagihanTelat()} tagihan diperbarui statusnya.`);
}

/** Mingguan/harian: penjualan Draft yang macet lebih dari 1 jam ditandai Gagal */
export function jalankanBersihkan(): void {
  jalankan('jobBersihkan', () => denganLock(() => {
    const now = sekarang();
    const hariIni = tglIso(now);
    const menitSekarang = Number(jamHm(now).slice(0, 2)) * 60 + Number(jamHm(now).slice(3, 5));
    let n = 0;
    for (const p of Db.getAll(SHEET.PENJUALAN)) {
      if (p.Status !== 'Draft') continue;
      const hari = selisihHariIso(String(p.Tanggal), hariIni);
      const jam = String(p.Jam ?? '00:00');
      const menit = Number(jam.slice(0, 2)) * 60 + Number(jam.slice(3, 5));
      if (hari > 0 || menitSekarang - menit > 60) {
        Db.updateById(SHEET.PENJUALAN, String(p.ID_Penjualan), { Status: 'Gagal' });
        n++;
      }
    }
    return `${n} draf penjualan macet ditandai Gagal.`;
  }));
}

// ── Verifikasi, backup mingguan, pemulihan (PRD 06 bagian 5) ──────────────────

/** Bandingkan jumlah baris per sheet antara sumber dan salinan; kembalikan daftar selisih (kosong = sama). */
export function bandingkanJumlahBaris(sumber: Record<string, number>, salinan: Record<string, number>): string[] {
  const masalah: string[] = [];
  Object.keys(sumber).forEach(n => {
    if (salinan[n] === undefined) masalah.push(`Sheet ${n} tidak ada di salinan`);
    else if (salinan[n] !== sumber[n]) masalah.push(`Sheet ${n}: ${sumber[n]} baris di sumber, ${salinan[n]} di salinan`);
  });
  return masalah;
}

function hitungBaris(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): Record<string, number> {
  const hasil: Record<string, number> = {};
  ss.getSheets().forEach(s => { hasil[s.getName()] = s.getLastRow(); });
  return hasil;
}

/** Setiap salinan diperiksa: jumlah sheet dan baris harus sama dengan sumber. Salinan rusak dihapus agar tidak dikira aman. */
function verifikasiSalinan(salinan: GoogleAppsScript.Drive.File): void {
  const sumber = hitungBaris(Db.getSpreadsheet());
  const masalah = bandingkanJumlahBaris(sumber, hitungBaris(SpreadsheetApp.openById(salinan.getId())));
  if (masalah.length) {
    salinan.setTrashed(true);
    throw new Error('Verifikasi backup gagal: ' + masalah.join('; '));
  }
}

function jalankanBackupSalinan(folder: GoogleAppsScript.Drive.Folder, nama: string): GoogleAppsScript.Drive.File {
  return denganLock(() => {
    const salinan = DriveApp.getFileById(Db.getSpreadsheet().getId()).makeCopy(nama, folder);
    verifikasiSalinan(salinan);
    return salinan;
  });
}

/** Minggu: ekspor .xlsx (salinan luar). Bila EMAIL_AKUN_CADANGAN diisi di Pengaturan, berkas dibagikan ke akun itu. */
export function jalankanBackupMingguan(): void {
  jalankan('jobBackupMingguan', () => {
    const folder = subfolder(FOLDER.BACKUP, FOLDER.BACKUP_MINGGUAN);
    const nama = namaBackup('MINGGUAN', sekarang());
    const blob = DriveApp.getFileById(Db.getSpreadsheet().getId()).getAs('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    blob.setName(nama);
    const file = folder.createFile(blob);
    if (file.getSize() < 1024) { file.setTrashed(true); throw new Error('Ekspor Excel kosong atau rusak'); }
    const email = String((Db.findById(SHEET.PENGATURAN, 'EMAIL_AKUN_CADANGAN') || {}).Nilai ?? '').trim();
    if (email && email.indexOf('@') > 0) file.addViewer(email);
    const hapus = pangkas(folder, 'EPICPHONE_BACKUP_MINGGUAN_', { maks: 8 });
    return `Backup mingguan ${nama}${email ? ` dibagikan ke ${email}` : ''}; ${hapus} lama dihapus.`;
  });
}

/** Manual: sebelum rilis kode. Simpan 3 terakhir. */
export function jalankanBackupPraRilis(versi: string): string {
  const folder = subfolder(FOLDER.BACKUP, FOLDER.BACKUP_PRA_RILIS);
  const nama = namaBackup('PRA-RILIS', sekarang(), 'v' + String(versi).replace(/\./g, '-'));
  jalankanBackupSalinan(folder, nama);
  pangkas(folder, 'EPICPHONE_BACKUP_PRA-RILIS_', { maks: 3 });
  log('Sistem', 'Jobs', 'backupPraRilis', nama);
  return nama;
}

export interface InfoBackup { id: string; nama: string; jenis: string; tanggal: string }

/** Daftar backup yang bisa dipulihkan (terbaru dulu) */
export function daftarBackupTersedia(): InfoBackup[] {
  const hasil: InfoBackup[] = [];
  [FOLDER.BACKUP_HARIAN, FOLDER.BACKUP_BULANAN, FOLDER.BACKUP_PRA_RILIS, FOLDER.BACKUP_PRA_MIGRASI].forEach(sub => {
    const it = subfolder(FOLDER.BACKUP, sub).getFiles();
    while (it.hasNext()) {
      const f = it.next();
      hasil.push({ id: f.getId(), nama: f.getName(), jenis: sub, tanggal: tglIso(new Date(f.getDateCreated().getTime())) });
    }
  });
  return hasil.sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.nama.localeCompare(a.nama));
}

/**
 * Pemulihan: (1) salinan pengaman kondisi sekarang, (2) database lama diganti namanya, (3) backup dipilih
 * disalin menjadi EPICPHONE_DB_UTAMA di 01_DATABASE, (4) ID Spreadsheet di sistem dialihkan.
 * Dijalankan dari editor: isi Properti Skrip PULIH_ID_BACKUP dan PULIH_KONFIRMASI=YA lebih dulu.
 */
export function jalankanPemulihan(idBackup: string, konfirmasi: string): string {
  if (konfirmasi !== 'YA') throw new Error('Pemulihan dibatalkan: konfirmasi harus berisi YA.');
  const props = PropertiesService.getScriptProperties();
  const sekarangDb = DriveApp.getFileById(Db.getSpreadsheet().getId());
  const folderDb = subfolder(FOLDER.DATABASE);
  const pengaman = namaBackup('PENGAMAN-PULIH', sekarang());
  sekarangDb.makeCopy(pengaman, subfolder(FOLDER.BACKUP, FOLDER.BACKUP_PENGAMAN));
  const cadangan = DriveApp.getFileById(idBackup);
  const nama = props.getProperty('LINGKUNGAN') === 'dev' ? 'EPICPHONE_DB_UTAMA_DEV' : 'EPICPHONE_DB_UTAMA';
  sekarangDb.setName(`${nama}_SEBELUM-PULIH_${tglIso(sekarang())}_${jamHm(sekarang()).replace(':', '')}`);
  const baru = cadangan.makeCopy(nama, folderDb);
  props.setProperty('SPREADSHEET_ID', baru.getId());
  const p = SpreadsheetApp.openById(baru.getId()).getSheetByName(SHEET.PENGATURAN);
  if (p) {
    const nilai = p.getRange(2, 1, Math.max(p.getLastRow() - 1, 1), 2).getValues() as unknown[][];
    nilai.forEach((r, i) => { if (r[0] === 'SPREADSHEET_ID') p.getRange(i + 2, 2).setValue(baru.getId()); });
  }
  CacheService.getScriptCache().removeAll(SKEMA.map(l => 'sheet_' + l.nama));
  log('Sistem', 'Jobs', 'pulihkanDariBackup', `Dipulihkan dari ${cadangan.getName()}; pengaman: ${pengaman}`);
  return `Dipulihkan dari ${cadangan.getName()}. Salinan pengaman: ${pengaman}. Spreadsheet baru: ${baru.getUrl()}`;
}
