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

export function editBiaya(idBiaya: string, data: Partial<BiayaInput>): { idBiaya: string } {
  return denganLock(() => Db.transaksi(() => {
    const b = Db.findById(SHEET.BIAYA_OPERASIONAL, idBiaya);
    if (!b) throw new GalatBisnis('BIAYA_TIDAK_ADA', `Biaya ${idBiaya} tidak ditemukan.`);
    const ubah: Record<string, unknown> = {};
    if (data.kategori !== undefined) {
      if (!daftarReferensi('Kategori_Biaya').includes(data.kategori)) {
        throw new GalatBisnis('KATEGORI_TIDAK_VALID', `Pilih kategori: ${daftarReferensi('Kategori_Biaya').join(', ')}.`);
      }
      ubah.Kategori = data.kategori;
    }
    if (data.nominal !== undefined) {
      const nom = Math.round(angka(data.nominal));
      if (nom <= 0) throw new GalatBisnis('NOMINAL_TIDAK_VALID', 'Nominal biaya harus lebih dari nol.');
      ubah.Nominal = nom;
    }
    if (data.tanggal !== undefined) {
      const hariIni = tglIso(sekarang());
      if (!isoValid(data.tanggal)) throw new GalatBisnis('TANGGAL_TIDAK_VALID', 'Tanggal biaya tidak valid.');
      if (data.tanggal > hariIni) throw new GalatBisnis('TANGGAL_TIDAK_VALID', 'Tanggal biaya tidak boleh di masa depan.');
      ubah.Tanggal = data.tanggal;
    }
    if (data.catatan !== undefined) ubah.Catatan = sanitasi(data.catatan);

    Db.updateById(SHEET.BIAYA_OPERASIONAL, idBiaya, ubah);
    log('Ubah', SHEET.BIAYA_OPERASIONAL, idBiaya, `Edit biaya ${idBiaya}`);
    return { idBiaya };
  }));
}

export function hapusBiaya(idBiaya: string, alasan?: string): { idBiaya: string; status: string } {
  return denganLock(() => Db.transaksi(() => {
    const b = Db.findById(SHEET.BIAYA_OPERASIONAL, idBiaya);
    if (!b) throw new GalatBisnis('BIAYA_TIDAK_ADA', `Biaya ${idBiaya} tidak ditemukan.`);
    const catatan = `[BATAL: ${alasan || 'Dihapus pengguna'}] ${b.Catatan || ''}`.trim();
    // Nominal dinolkan agar tidak memotong laba bersih
    Db.updateById(SHEET.BIAYA_OPERASIONAL, idBiaya, { Nominal: 0, Catatan: catatan });
    log('Batal', SHEET.BIAYA_OPERASIONAL, idBiaya, `Hapus biaya ${idBiaya}: ${formatRupiah(angka(b.Nominal))}`);
    return { idBiaya, status: 'Batal' };
  }));
}

