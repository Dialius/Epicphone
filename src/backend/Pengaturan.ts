// Pengaturan.ts — pembaca sheet Pengaturan. Nilai yang diubah owner di aplikasi benar-benar dipakai logika server.

import { SHEET, GARANSI_DEFAULT, BATAS_UMUR_STOK_HARI } from './Config';
import { Db } from './Db';
import { angka } from './Utils';

export const PENGATURAN_BAWAAN: Record<string, string> = {
  NAMA_TOKO: 'Epic Phone Purwokerto', TAGLINE: 'Inovasi Ada Di Genggaman', INSTAGRAM: '@epicphone_purwokerto', ALAMAT: '', NO_WA: '',
  GARANSI_BARU_BULAN: String(GARANSI_DEFAULT.BARU_BULAN), GARANSI_BEKAS_HARI: String(GARANSI_DEFAULT.BEKAS_HARI),
  GARANSI_AKSESORIS_HARI: String(GARANSI_DEFAULT.AKSESORIS_HARI), BATAS_UMUR_STOK_HARI: String(BATAS_UMUR_STOK_HARI),
  STOK_MINIMUM_DEFAULT: '3', AMBANG_TEMPO_HARI: '3', NOTA_UKURAN: 'A5', NOTA_LINK_PUBLIK: 'Ya', SYARAT_GARANSI: '',
};

/** Seluruh pengaturan sebagai peta; nilai yang belum ada di sheet memakai bawaan */
export function bacaPengaturan(): Record<string, string> {
  const hasil: Record<string, string> = { ...PENGATURAN_BAWAAN };
  (Db.getAll(SHEET.PENGATURAN) as Array<Record<string, unknown>>).forEach(r => {
    const k = String(r.Kunci ?? '');
    if (k && r.Nilai !== undefined && r.Nilai !== '') hasil[k] = String(r.Nilai);
  });
  return hasil;
}

export function angkaPengaturan(p: Record<string, string>, kunci: string, bawaan: number): number {
  const n = angka(p[kunci]);
  return n > 0 ? n : bawaan;
}
