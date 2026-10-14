// Penamaan.ts — semua nama folder/berkas Drive dibuat di sini.
// Tidak ada kode lain yang menyusun nama sendiri.

import { slug, imeiAkhir, mingguIso } from './Utils';
import { TIMEZONE } from './Config';

export interface InfoUnit {
  idUnit: string;      // "UNT-2610-0007"
  namaBarang: string;  // "Samsung Galaxy A54 5G 8/256 GB Hitam"
  imei1: string;       // "358123456789012"
}

export interface InfoFoto {
  jenis: 'FOTO-HP' | 'FOTO-SERVIS' | 'BUKTI-BELI' | 'BUKTI-BAYAR' | 'BUKTI-BIAYA' | 'FOTO-KLAIM';
  idRef: string;    // ID unit/servis/pembelian/dll
  posisi: string;   // DEPAN / SEBELUM / NOTA-SUPPLIER / dll
  urutan: number;   // 1, 2, ...
  ekstensi?: 'jpg' | 'png' | 'webp';
  waktu: Date;
}

/** "UNT-2610-0007_SAMSUNG-GALAXY-A54_IMEI-4521" */
export function namaFolderUnit(unit: InfoUnit): string {
  const modelSlug = slug(unit.namaBarang, 40);
  const imeiSufiks = imeiAkhir(unit.imei1);
  return `${unit.idUnit}_${modelSlug}_IMEI-${imeiSufiks}`;
}

/**
 * "EPICPHONE_FOTO-HP_UNT-2610-0007_DEPAN_01_2026-10-05_1032.jpg"
 */
export function namaFoto(info: InfoFoto): string {
  const tanggal = Utilities.formatDate(info.waktu, TIMEZONE, 'yyyy-MM-dd');
  const waktuStr = Utilities.formatDate(info.waktu, TIMEZONE, 'HHmm');
  const urutanStr = String(info.urutan).padStart(2, '0');
  const bagian = [
    'EPICPHONE',
    info.jenis,
    info.idRef,
    info.posisi, // kosong untuk FOTO-KLAIM (PRD 09 bagian 4.3)
    urutanStr,
    tanggal,
    waktuStr,
  ].filter(Boolean);
  return bagian.join('_') + '.' + (info.ekstensi || 'jpg');
}

/** "EPICPHONE_BACKUP_HARIAN_2026-10-05_0100" */
export function namaBackup(jenis: 'HARIAN' | 'BULANAN' | 'MINGGUAN' | 'PRA-RILIS' | 'PRA-MIGRASI' | 'PENGAMAN-PULIH', waktu: Date, ekstra = ''): string {
  const tanggal = Utilities.formatDate(waktu, TIMEZONE, 'yyyy-MM-dd');
  const jam = Utilities.formatDate(waktu, TIMEZONE, 'HHmm');
  if (jenis === 'BULANAN') {
    const bulan = Utilities.formatDate(waktu, TIMEZONE, 'yyyy-MM');
    return `EPICPHONE_BACKUP_BULANAN_${bulan}`;
  }
  if (jenis === 'MINGGUAN') {
    // PRD 09: EPICPHONE_BACKUP_MINGGUAN_2026-W40.xlsx (salinan luar berupa berkas Excel)
    return `EPICPHONE_BACKUP_MINGGUAN_${mingguIso(tanggal)}.xlsx`;
  }
  const bagian = ['EPICPHONE', 'BACKUP', jenis, ekstra, tanggal, jam]
    .filter(Boolean)
    .join('_');
  return bagian;
}

/** "EPICPHONE_NOTA_JUAL-2610-0042.pdf" */
export function namaNota(idJual: string, versi?: number, status?: string): string {
  if (versi !== undefined && status) {
    return `EPICPHONE_NOTA_${idJual}_v${versi}_${status}.pdf`;
  }
  return `EPICPHONE_NOTA_${idJual}.pdf`;
}

/** "EPICPHONE_LAPORAN_LABA_2026-10.pdf" */
export function namaLaporan(jenis: 'LABA' | 'ARUS-KAS', bulan: string): string {
  return `EPICPHONE_LAPORAN_${jenis}_${bulan}.pdf`;
}

/** Ekspor CSV: "EPICPHONE_EKSPOR_PENJUALAN_2026-10-01_sd_2026-10-31.csv" */
export function namaEkspor(jenis: string, dari: string, sampai: string): string {
  return `EPICPHONE_EKSPOR_${slug(jenis)}_${dari}_sd_${sampai}.csv`;
}
