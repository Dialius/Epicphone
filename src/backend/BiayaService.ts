// BiayaService.ts — Biaya operasional (sewa, listrik, dll). PRD 01 bagian 3.11.

import { SHEET, PREFIX_ID } from './Config';
import { Db } from './Db';
import { GalatBisnis } from './Galat';
import { denganLock } from './Lock';
import { buatId } from './Id';
import { log } from './Log';
import { daftarReferensi } from './Skema';
import { sanitasi, angka, tglIso, sekarang, isoValid, formatRupiah } from './Utils';

export interface BiayaInput {
  kategori: string;
  nominal: number;
  /** yyyy-mm-dd; kosong = hari ini */
  tanggal?: string;
  catatan?: string;
}

export function simpanBiaya(data: BiayaInput): { idBiaya: string } {
  return denganLock(() => Db.transaksi(() => {
    if (!data || !daftarReferensi('Kategori_Biaya').includes(data.kategori)) {
      throw new GalatBisnis('KATEGORI_TIDAK_VALID', `Pilih kategori: ${daftarReferensi('Kategori_Biaya').join(', ')}.`);
    }
    const nominal = Math.round(angka(data.nominal));
    if (nominal <= 0) throw new GalatBisnis('NOMINAL_TIDAK_VALID', 'Nominal biaya harus lebih dari nol.');
    const hariIni = tglIso(sekarang());
    const tgl = data.tanggal || hariIni;
    if (!isoValid(tgl)) throw new GalatBisnis('TANGGAL_TIDAK_VALID', 'Tanggal biaya tidak valid.');
    if (tgl > hariIni) throw new GalatBisnis('TANGGAL_TIDAK_VALID', 'Tanggal biaya tidak boleh di masa depan.');

    const id = buatId(PREFIX_ID.BIAYA);
    Db.append(SHEET.BIAYA_OPERASIONAL, { ID_Biaya: id, Tanggal: tgl, Kategori: data.kategori, Nominal: nominal, Catatan: sanitasi(data.catatan || ''), Link_Bukti: '' });
    log('Tambah', SHEET.BIAYA_OPERASIONAL, id, `Biaya ${data.kategori} ${formatRupiah(nominal)}`);
    return { idBiaya: id };
  }));
}
