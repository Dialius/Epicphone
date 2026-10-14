// Setup.ts — setupAwal(): buat seluruh sheet, header, format, validasi,
// proteksi, folder Drive, trigger, dan sheet Pengaturan.

import { SHEET, FOLDER, SPREADSHEET_NAME, TIMEZONE, GARANSI_DEFAULT, BATAS_BONUS_PERSEN, BATAS_UMUR_STOK_HARI } from './Config';
import { formatTanggal, sekarang } from './Utils';
import { log } from './Log';

// ── Definisi header per sheet ─────────────────────────────────────────────────

export const HEADER: Record<string, string[]> = {
  [SHEET.PRODUK]: ['ID_Produk','Jenis','Platform','Merek','Model','Varian','Warna','Nama_Lengkap','Harga_Jual_Standar','Aktif'],
  [SHEET.KONTAK]: ['ID_Kontak','Nama','Tipe','No_WA','Alamat','Catatan','Total_Transaksi'],
  [SHEET.STOK_HP]: ['ID_Unit','Tgl_Masuk','Jam_Masuk','IMEI_1','IMEI_2','ID_Produk','Nama_Barang','Kondisi','Grade','Kelengkapan','Baterai_Persen','Bebas_Kunci_Akun','Sumber','ID_Sumber','Harga_Beli','Biaya_Lain','Biaya_Servis','HPP','Estimasi_Servis','Harga_Jual_Target','Status','Umur_Stok_Hari','Tgl_Keluar','ID_Penjualan','Link_Foto','Catatan','Dibuat_Oleh'],
  [SHEET.STOK_AKSESORIS]: ['SKU','Nama_Barang','Kategori','Stok','Stok_Minimum','Harga_Beli_Rata2','Harga_Jual','Status'],
  [SHEET.PEMBELIAN]: ['ID_Pembelian','Tanggal','Jam','ID_Supplier','Nama_Supplier','Total','Metode_Bayar','Dibayar','Sisa','Status_Bayar','Link_Nota','Status','Catatan','Dibuat_Oleh'],
  [SHEET.PEMBELIAN_ITEM]: ['ID_Item','ID_Pembelian','Tipe','ID_Unit_atau_SKU','Nama_Barang','Qty','Harga_Satuan','Subtotal'],
  [SHEET.PENJUALAN]: ['ID_Penjualan','Tanggal','Jam','ID_Pelanggan','Nama_Pelanggan','Subtotal','Diskon','Nilai_Tukar_Tambah','Total_Tagihan','Biaya_Bonus','Metode_Bayar','Dibayar','Sisa_Tagihan','Status_Bayar','Laba_Kotor','Link_Nota_PDF','Status','Catatan','Dibuat_Oleh'],
  [SHEET.PENJUALAN_ITEM]: ['ID_Item','ID_Penjualan','Tipe','ID_Unit_atau_SKU','Nama_Barang','IMEI','Qty','Harga_Jual','HPP','Laba_Item','Garansi_Hingga','Alasan_Bonus'],
  [SHEET.TUKAR_TAMBAH]: ['ID_TT','Tanggal','ID_Penjualan','ID_Pelanggan','ID_Unit_Masuk','Nama_Barang','IMEI','Kondisi_Layar','Kondisi_Baterai','Kondisi_Kamera','Kondisi_Body','Kondisi_FaceJari','Nilai_Taksir','Catatan'],
  [SHEET.SERVIS]: ['ID_Servis','Tgl_Masuk','Jam_Masuk','Tgl_Selesai','Jenis','Pelaksana','Nama_Vendor','ID_Unit','Nama_Pelanggan','Perangkat','IMEI','Keluhan','Tindakan','Estimasi_Biaya','Biaya_Part','Biaya_Jasa_Teknisi','Tarif_Pelanggan','Laba_Servis','Status','Dibuat_Oleh'],
  [SHEET.GARANSI_RETUR]: ['ID_Klaim','Tanggal','Jam','ID_Penjualan','ID_Unit','Nama_Barang','Jenis','Alasan','Masih_Garansi','Tindakan','Nilai_Refund','Unit_Pengganti','Status'],
  [SHEET.HUTANG_PIUTANG]: ['ID_Tagihan','Jenis','ID_Referensi','ID_Kontak','Nama','Total','Terbayar','Sisa','Jatuh_Tempo','Hari_Telat','Status'],
  [SHEET.PEMBAYARAN]: ['ID_Bayar','Tanggal','Jam','ID_Hutang_Piutang','Nama','Jumlah','Metode','Catatan','Link_Bukti'],
  [SHEET.BIAYA_OPERASIONAL]: ['ID_Biaya','Tanggal','Kategori','Nominal','Catatan','Link_Bukti'],
  [SHEET.DASHBOARD]: ['Metrik','Nilai','Keterangan'],
  [SHEET.LABA_BULANAN]: ['Bulan','Jml_Unit_Terjual','Omzet','HPP','Laba_Kotor_HP','Laba_Aksesoris','Laba_Servis','Kerugian_Retur','Biaya_Operasional','Laba_Bersih','Margin_Persen','Selisih_Bulan_Lalu'],
  [SHEET.PENGATURAN]: ['Kunci','Nilai','Keterangan'],
  [SHEET.REFERENSI]: ['Kelompok','Nilai','Urutan'],
  [SHEET.LOG_AKTIVITAS]: ['Tanggal','Jam','Aksi','Sheet','ID_Data','Ringkasan'],
  [SHEET.BERKAS_FOTO]: ['ID_Berkas','Tanggal','Jam','Jenis_Referensi','ID_Referensi','Posisi_atau_Tahap','Urutan','Nama_Berkas','ID_File_Drive','Link','Ukuran_KB','Status'],
};

// Warna tab: biru=master, hijau=transaksi, oranye=laporan, abu=sistem
const WARNA_TAB: Record<string, string> = {
  [SHEET.PRODUK]: '#4A90D9',
  [SHEET.KONTAK]: '#4A90D9',
  [SHEET.STOK_HP]: '#27AE60',
  [SHEET.STOK_AKSESORIS]: '#27AE60',
  [SHEET.PEMBELIAN]: '#27AE60',
  [SHEET.PEMBELIAN_ITEM]: '#27AE60',
  [SHEET.PENJUALAN]: '#27AE60',
  [SHEET.PENJUALAN_ITEM]: '#27AE60',
  [SHEET.TUKAR_TAMBAH]: '#27AE60',
  [SHEET.SERVIS]: '#27AE60',
  [SHEET.GARANSI_RETUR]: '#27AE60',
  [SHEET.HUTANG_PIUTANG]: '#27AE60',
  [SHEET.PEMBAYARAN]: '#27AE60',
  [SHEET.BIAYA_OPERASIONAL]: '#27AE60',
  [SHEET.DASHBOARD]: '#E67E22',
  [SHEET.LABA_BULANAN]: '#E67E22',
  [SHEET.PENGATURAN]: '#95A5A6',
  [SHEET.REFERENSI]: '#95A5A6',
  [SHEET.LOG_AKTIVITAS]: '#95A5A6',
  [SHEET.BERKAS_FOTO]: '#95A5A6',
};

// ── Helper ────────────────────────────────────────────────────────────────────

function getOrCreateSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const existing = DriveApp.getFilesByName(SPREADSHEET_NAME);
  if (existing.hasNext()) {
    return SpreadsheetApp.open(existing.next());
  }
  return SpreadsheetApp.create(SPREADSHEET_NAME);
}

function getOrCreateSheet(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  nama: string,
): GoogleAppsScript.Spreadsheet.Sheet {
  return ss.getSheetByName(nama) ?? ss.insertSheet(nama);
}

function tulisHeader(sheet: GoogleAppsScript.Spreadsheet.Sheet, headers: string[]): void {
  const row = sheet.getRange(1, 1, 1, headers.length);
  row.setValues([headers]);
  row.setFontWeight('bold');
  row.setBackground('#0F2A44');
  row.setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);
}

// Kolom yang harus tetap berupa teks (Sheets suka mengubah angka panjang dan tanggal)
const KOLOM_TEKS = new Set([
  'IMEI_1', 'IMEI_2', 'IMEI', 'No_WA', 'Tanggal', 'Jam', 'Tgl_Masuk', 'Jam_Masuk', 'Tgl_Selesai', 'Tgl_Keluar',
  'Jatuh_Tempo', 'Garansi_Hingga', 'Bulan',
]);

function formatKolomTeks(sheet: GoogleAppsScript.Spreadsheet.Sheet, headers: string[]): void {
  const baris = Math.max(sheet.getMaxRows() - 1, 1);
  headers.forEach((h, i) => {
    if (KOLOM_TEKS.has(h)) sheet.getRange(2, i + 1, baris, 1).setNumberFormat('@');
  });
}

function setupSheet(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  nama: string,
): GoogleAppsScript.Spreadsheet.Sheet {
  const sheet = getOrCreateSheet(ss, nama);
  const headers = HEADER[nama];
  if (!headers) return sheet;

  // Tulis header hanya jika baris 1 kosong
  if (sheet.getRange(1, 1).getValue() === '') {
    tulisHeader(sheet, headers);
  }

  formatKolomTeks(sheet, headers);

  // Warna tab
  const warna = WARNA_TAB[nama];
  if (warna) sheet.setTabColor(warna);

  // Filter aktif
  if (sheet.getLastRow() >= 1 && !sheet.getFilter()) {
    sheet.getRange(1, 1, 1, headers.length).createFilter();
  }

  // Lebar kolom auto
  sheet.autoResizeColumns(1, headers.length);

  return sheet;
}

// ── Folder Drive ──────────────────────────────────────────────────────────────

function getOrCreateFolder(
  parent: GoogleAppsScript.Drive.Folder,
  nama: string,
): GoogleAppsScript.Drive.Folder {
  const it = parent.getFoldersByName(nama);
  return it.hasNext() ? it.next() : parent.createFolder(nama);
}

function setupFolderDrive(): Record<string, string> {
  const root = DriveApp.getRootFolder();
  const utama = getOrCreateFolder(root, FOLDER.UTAMA);

  const sub: Record<string, GoogleAppsScript.Drive.Folder> = {};
  const namaSubfolder = [
    FOLDER.ASET_BRAND,
    FOLDER.DATABASE,
    FOLDER.FOTO_HP,
    FOLDER.NOTA,
    FOLDER.BUKTI_TRANSAKSI,
    FOLDER.SERVIS,
    FOLDER.LAPORAN,
    FOLDER.BACKUP,
    FOLDER.ARSIP,
    FOLDER.TEMPLATE_IMPOR,
  ];
  namaSubfolder.forEach(n => { sub[n] = getOrCreateFolder(utama, n); });

  // Subfolder khusus
  getOrCreateFolder(sub[FOLDER.FOTO_HP], FOLDER.TERHAPUS);
  getOrCreateFolder(sub[FOLDER.NOTA], FOLDER.NOTA_RIWAYAT);
  getOrCreateFolder(sub[FOLDER.BUKTI_TRANSAKSI], FOLDER.BUKTI_PEMBELIAN);
  getOrCreateFolder(sub[FOLDER.BUKTI_TRANSAKSI], FOLDER.BUKTI_PEMBAYARAN);
  getOrCreateFolder(sub[FOLDER.BUKTI_TRANSAKSI], FOLDER.BUKTI_BIAYA);
  [FOLDER.BACKUP_HARIAN, FOLDER.BACKUP_BULANAN, FOLDER.BACKUP_MINGGUAN,
   FOLDER.BACKUP_PRA_RILIS, FOLDER.BACKUP_PRA_MIGRASI, FOLDER.BACKUP_PENGAMAN]
    .forEach(n => getOrCreateFolder(sub[FOLDER.BACKUP], n));

  return {
    ID_FOLDER_UTAMA: utama.getId(),
    ID_FOLDER_ASET_BRAND: sub[FOLDER.ASET_BRAND].getId(),
    ID_FOLDER_DATABASE: sub[FOLDER.DATABASE].getId(),
    ID_FOLDER_FOTO_HP: sub[FOLDER.FOTO_HP].getId(),
    ID_FOLDER_NOTA: sub[FOLDER.NOTA].getId(),
    ID_FOLDER_BUKTI: sub[FOLDER.BUKTI_TRANSAKSI].getId(),
    ID_FOLDER_SERVIS: sub[FOLDER.SERVIS].getId(),
    ID_FOLDER_LAPORAN: sub[FOLDER.LAPORAN].getId(),
    ID_FOLDER_BACKUP: sub[FOLDER.BACKUP].getId(),
    ID_FOLDER_ARSIP: sub[FOLDER.ARSIP].getId(),
    ID_FOLDER_TEMPLATE: sub[FOLDER.TEMPLATE_IMPOR].getId(),
  };
}

// ── Referensi / dropdown ──────────────────────────────────────────────────────

const DATA_REFERENSI: [string, string, number][] = [
  // [Kelompok, Nilai, Urutan]
  ['Jenis_Produk','HP',1], ['Jenis_Produk','Aksesoris',2],
  ['Platform','iPhone',1], ['Platform','Android',2],
  ['Kondisi','Baru',1], ['Kondisi','Bekas',2],
  ['Grade','A',1], ['Grade','B',2], ['Grade','C',3],
  ['Kelengkapan','Fullset',1], ['Kelengkapan','Unit saja',2], ['Kelengkapan','Tanpa dus',3],
  ['Bebas_Kunci_Akun','Ya',1], ['Bebas_Kunci_Akun','Tidak',2], ['Bebas_Kunci_Akun','Belum dicek',3],
  ['Sumber_Unit','Pembelian',1], ['Sumber_Unit','Tukar Tambah',2], ['Sumber_Unit','Beli Putus',3],
  ['Status_Unit','Ready',1], ['Status_Unit','Dipesan',2], ['Status_Unit','Servis',3], ['Status_Unit','Terjual',4], ['Status_Unit','Retur',5], ['Status_Unit','Rusak',6],
  ['Metode_Bayar','Tunai',1], ['Metode_Bayar','Transfer',2], ['Metode_Bayar','QRIS',3], ['Metode_Bayar','Cicilan',4], ['Metode_Bayar','Tempo',5],
  ['Status_Bayar','Lunas',1], ['Status_Bayar','Sebagian',2], ['Status_Bayar','Belum',3],
  ['Tipe_Kontak','Supplier',1], ['Tipe_Kontak','Pelanggan',2], ['Tipe_Kontak','Keduanya',3],
  ['Jenis_Servis','Internal',1], ['Jenis_Servis','Pelanggan',2],
  ['Pelaksana_Servis','Teknisi sendiri',1], ['Pelaksana_Servis','Vendor luar',2],
  ['Status_Servis','Antri',1], ['Status_Servis','Dikerjakan',2], ['Status_Servis','Selesai',3], ['Status_Servis','Diambil',4], ['Status_Servis','Batal',5],
  ['Jenis_Klaim','Klaim garansi',1], ['Jenis_Klaim','Retur',2], ['Jenis_Klaim','Refund',3], ['Jenis_Klaim','Tukar unit',4],
  ['Status_Klaim','Dibuka',1], ['Status_Klaim','Diproses',2], ['Status_Klaim','Selesai',3], ['Status_Klaim','Ditolak',4],
  ['Jenis_Tagihan','Piutang pelanggan',1], ['Jenis_Tagihan','Hutang supplier',2],
  ['Kategori_Biaya','Sewa',1], ['Kategori_Biaya','Listrik',2], ['Kategori_Biaya','Internet',3], ['Kategori_Biaya','Gaji',4], ['Kategori_Biaya','Transport',5], ['Kategori_Biaya','Iklan',6], ['Kategori_Biaya','Lainnya',7],
  ['Kategori_Aksesoris','Casing',1], ['Kategori_Aksesoris','Charger',2], ['Kategori_Aksesoris','Kabel',3], ['Kategori_Aksesoris','Pelindung layar',4], ['Kategori_Aksesoris','Lainnya',5],
  ['Kondisi_TT','Baik',1], ['Kondisi_TT','Cacat',2],
  ['Jenis_Referensi_Berkas','Unit',1], ['Jenis_Referensi_Berkas','Servis',2], ['Jenis_Referensi_Berkas','Pembelian',3], ['Jenis_Referensi_Berkas','Pembayaran',4], ['Jenis_Referensi_Berkas','Biaya',5], ['Jenis_Referensi_Berkas','Klaim',6],
];

function setupReferensi(ss: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  const sheet = ss.getSheetByName(SHEET.REFERENSI);
  if (!sheet) return;
  if (sheet.getLastRow() <= 1) {
    const rows = DATA_REFERENSI.map(([k, v, u]) => [k, v, u]);
    sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  }
}

// ── Pengaturan default ────────────────────────────────────────────────────────

function setupPengaturan(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  folderIds: Record<string, string>,
): void {
  const sheet = ss.getSheetByName(SHEET.PENGATURAN);
  if (!sheet || sheet.getLastRow() > 1) return;

  const rows: [string, string, string][] = [
    ['NAMA_TOKO','Epic Phone Purwokerto','Nama toko pada nota dan header aplikasi'],
    ['TAGLINE','Inovasi Ada Di Genggaman','Tagline pada nota dan layar masuk'],
    ['INSTAGRAM','@epicphone_purwokerto','Akun Instagram toko'],
    ['ALAMAT','(isi alamat toko)','Alamat toko untuk nota'],
    ['NO_WA','(isi nomor WA toko)','Nomor WA toko, format 628xxxx'],
    ['ID_BERKAS_LOGO','(isi ID berkas logo di Drive)','ID file logo PNG di Drive'],
    ['GARANSI_BARU_BULAN', String(GARANSI_DEFAULT.BARU_BULAN), 'Lama garansi HP baru (bulan)'],
    ['GARANSI_BEKAS_HARI', String(GARANSI_DEFAULT.BEKAS_HARI), 'Lama garansi HP bekas (hari)'],
    ['GARANSI_AKSESORIS_HARI', String(GARANSI_DEFAULT.AKSESORIS_HARI), 'Lama garansi aksesoris (hari)'],
    ['BATAS_UMUR_STOK_HARI', String(BATAS_UMUR_STOK_HARI), 'Peringatan HP tidak terjual melebihi hari ini'],
    ['BATAS_BONUS_PERSEN', String(BATAS_BONUS_PERSEN), 'Peringatan jika bonus melebihi persen laba kotor ini'],
    ['NOTA_UKURAN','A5','Ukuran nota: A5 atau 80mm'],
    ['NOTA_LINK_PUBLIK','Ya','Nota bisa dibuka siapa pun yang punya tautan (Ya/Tidak)'],
    ['PAKET_BONUS','[]','Daftar paket bonus preset (JSON)'],
    ['SYARAT_GARANSI','Garansi berlaku untuk kerusakan pabrik. Tidak berlaku untuk kerusakan akibat kelalaian pengguna.','Syarat garansi pada nota'],
    ...Object.entries(folderIds).map(([k, v]) => [k, v, 'ID folder Drive (jangan diubah manual)'] as [string, string, string]),
    ['SPREADSHEET_ID', ss.getId(), 'ID Spreadsheet utama'],
    ['SETUP_TANGGAL', formatTanggal(sekarang()), 'Tanggal setup pertama kali dijalankan'],
    ['VERSI','1.0.0','Versi sistem'],
  ];

  sheet.getRange(2, 1, rows.length, 3).setValues(rows);
}

// ── Trigger ───────────────────────────────────────────────────────────────────

function setupTrigger(namaFungsi: string, jam: number): void {
  // Hapus trigger lama dengan nama sama
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === namaFungsi)
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger(namaFungsi)
    .timeBased()
    .atHour(jam)
    .everyDays(1)
    .inTimezone(TIMEZONE)
    .create();
}

function setupTriggers(): void {
  setupTrigger('jobBackupHarian', 1);
  setupTrigger('jobCekTagihan', 6);
  setupTrigger('jobBackupBulanan', 2); // jalan tiap hari, hanya bekerja tanggal 1 (dicek di dalam fungsi)
  setupTrigger('jobBersihkan', 3);
  // jobLaporanBulanan ditambahkan saat Laporan.gs selesai dibuat
}

// ── Entry point ───────────────────────────────────────────────────────────────

/** Jalankan SEKALI untuk membuat seluruh infrastruktur sistem. */
export function setupAwal(): void {
  Logger.log('setupAwal() dimulai...');

  const ss = getOrCreateSpreadsheet();
  ss.setSpreadsheetTimeZone(TIMEZONE);
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());

  // Buat semua sheet
  const urutan = Object.keys(HEADER);
  urutan.forEach(nama => setupSheet(ss, nama));

  // Hapus sheet default "Sheet1" jika ada
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  // Setup konten
  setupReferensi(ss);

  // Setup folder Drive
  const folderIds = setupFolderDrive();

  // Pindahkan Spreadsheet ke folder DATABASE
  const folderDb = DriveApp.getFolderById(folderIds.ID_FOLDER_DATABASE);
  const ssFile = DriveApp.getFileById(ss.getId());
  ssFile.moveTo(folderDb);

  // Isi Pengaturan
  setupPengaturan(ss, folderIds);

  // Buat trigger terjadwal
  setupTriggers();

  Logger.log('setupAwal() selesai. Spreadsheet ID: ' + ss.getId());
  log('Sistem', 'Sistem', 'SETUP', 'setupAwal() berhasil dijalankan.');
}
