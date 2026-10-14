// GaransiService.ts — M6 Garansi dan Retur: cek garansi, klaim, retur, refund, tukar unit.
// Dampak laba dicatat di Garansi_Retur.Dampak_Laba dan dipakai laporan (PRD 05 bagian 2).

import { SHEET, PREFIX_ID, STATUS_UNIT } from './Config';
import { Db } from './Db';
import { GalatBisnis } from './Galat';
import { denganLock } from './Lock';
import { buatId } from './Id';
import { log } from './Log';
import { daftarReferensi } from './Skema';
import { sanitasi, angka, tglIso, tglId, jamHm, sekarang, selisihHariIso, isoValid } from './Utils';
import { ubahStatusUnit, wajibUnit } from './StokService';
import { simpanServis } from './ServisService';

type R = Record<string, unknown>;

export interface HasilCekGaransi {
  idPenjualan: string;
  idUnit: string;
  unit: string;
  imei: string;
  nota: string;
  tglJual: string;
  pelanggan: string;
  garansiSampai: string;
  sisaHari: number;
  statusGaransi: 'Aktif' | 'Habis';
  hargaJual: number;
  hpp: number;
}

/** Cari penjualan aktif berdasarkan nomor nota atau IMEI (minimal 4 digit) dan hitung status garansi. */
export function cekGaransi(query: string): HasilCekGaransi | null {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return null;
  const digit = q.replace(/\D/g, '');
  const penjualan = (Db.getAll(SHEET.PENJUALAN) as R[]).filter(p => p.Status === 'Aktif');
  const items = Db.getAll(SHEET.PENJUALAN_ITEM) as R[];
  const hariIni = tglIso(sekarang());

  // terbaru dulu
  const urut = [...penjualan].sort((a, b) => String(b.Tanggal).localeCompare(String(a.Tanggal)) || String(b.Jam).localeCompare(String(a.Jam)));
  for (const p of urut) {
    const id = String(p.ID_Penjualan);
    const barang = items.filter(i => i.ID_Penjualan === id && i.Tipe !== 'Bonus');
    let it: R | undefined;
    if (id.toLowerCase() === q) it = barang.find(i => i.Tipe === 'HP') ?? barang[0];
    else if (digit.length >= 4) it = barang.find(i => i.Tipe === 'HP' && String(i.IMEI).includes(digit));
    if (!it) continue;
    const sampai = String(it.Garansi_Hingga ?? '');
    const sisa = isoValid(sampai) ? selisihHariIso(hariIni, sampai) : -1;
    return {
      idPenjualan: id, idUnit: it.Tipe === 'HP' ? String(it.ID_Unit_atau_SKU) : '', unit: String(it.Nama_Barang), imei: String(it.IMEI || '-'),
      nota: id, tglJual: tglId(p.Tanggal), pelanggan: String(p.Nama_Pelanggan), garansiSampai: tglId(sampai), sisaHari: sisa,
      statusGaransi: sisa >= 0 ? 'Aktif' : 'Habis', hargaJual: angka(it.Harga_Jual), hpp: angka(it.HPP),
    };
  }
  return null;
}

export interface KlaimInput {
  /** Nomor nota atau IMEI */
  referensi: string;
  jenis: 'Klaim garansi' | 'Retur' | 'Refund' | 'Tukar unit';
  alasan: string;
  tindakan?: string;
  catatan?: string;
  /** Refund sebagian */
  nilaiRefund?: number;
  /** Tukar unit: ID unit pengganti (status Ready) */
  unitPengganti?: string;
  /** Retur / tukar unit: kondisi unit yang kembali */
  kondisiKembali?: 'Ready' | 'Rusak';
}

export interface HasilKlaim {
  idKlaim: string;
  status: string;
  masihGaransi: boolean;
  dampakLaba: number;
  idServis?: string;
}

export function simpanKlaim(data: KlaimInput): HasilKlaim {
  return denganLock(() => Db.transaksi(() => {
    if (!data || !daftarReferensi('Jenis_Klaim').includes(data.jenis)) {
      throw new GalatBisnis('JENIS_TIDAK_VALID', `Pilih jenis: ${daftarReferensi('Jenis_Klaim').join(', ')}.`);
    }
    const alasan = sanitasi([data.alasan, data.catatan].filter(Boolean).join('. ').trim());
    if (!alasan) throw new GalatBisnis('ALASAN_KOSONG', 'Isi alasan klaim.');
    const g = cekGaransi(data.referensi);
    if (!g) throw new GalatBisnis('PENJUALAN_TIDAK_DITEMUKAN', 'Nota atau IMEI tidak ditemukan pada penjualan aktif.');
    if (!g.idUnit) throw new GalatBisnis('BUKAN_HP', 'Klaim hanya untuk unit HP yang terjual.');

    const unit = wajibUnit(g.idUnit);
    const masih = g.statusGaransi === 'Aktif';
    const labaItem = g.hargaJual - g.hpp - proporsiDiskon(g);
    const now = sekarang();
    let status = 'Dibuka';
    let dampak = 0;
    let nilaiRefund = 0;
    let idServis: string | undefined;
    let unitPengganti = '';
    const kembali = data.kondisiKembali === 'Rusak' ? STATUS_UNIT.RUSAK : STATUS_UNIT.READY;

    if (data.jenis === 'Klaim garansi') {
      if (/servis/i.test(data.tindakan || 'Servis')) {
        const idKlaimNext = '';
        const sv = simpanServis({ jenis: 'Pelanggan', namaPerangkat: g.unit, imei: g.imei, namaPelanggan: g.pelanggan, keluhan: alasan, tarifPelanggan: 0, idKlaim: idKlaimNext });
        idServis = sv.idServis;
        status = 'Diproses';
      }
    } else if (data.jenis === 'Retur') {
      // Retur penuh: laba penjualan asal dibalik di bulan retur; unit kembali ke stok dengan HPP semula
      nilaiRefund = g.hargaJual;
      dampak = -labaItem;
      ubahStatusUnit(unit.ID_Unit, STATUS_UNIT.RETUR);
      ubahStatusUnit(unit.ID_Unit, kembali);
      Db.updateById(SHEET.STOK_HP, unit.ID_Unit, { Tgl_Keluar: '', ID_Penjualan: '' });
      status = 'Selesai';
    } else if (data.jenis === 'Refund') {
      nilaiRefund = Math.round(angka(data.nilaiRefund));
      if (nilaiRefund <= 0) throw new GalatBisnis('NOMINAL_TIDAK_VALID', 'Isi nilai refund sebagian.');
      if (nilaiRefund >= g.hargaJual) throw new GalatBisnis('REFUND_PENUH', 'Refund penuh dengan barang kembali dicatat sebagai Retur.');
      dampak = -nilaiRefund;
      status = 'Selesai';
    } else {
      // Tukar unit
      const pid = String(data.unitPengganti ?? '').trim();
      if (!pid) throw new GalatBisnis('UNIT_PENGGANTI_KOSONG', 'Pilih unit pengganti dari stok Ready.');
      const peng = wajibUnit(pid);
      if (peng.Status !== STATUS_UNIT.READY) throw new GalatBisnis('UNIT_TIDAK_TERSEDIA', `${peng.Nama_Barang} berstatus ${peng.Status}, tidak bisa jadi unit pengganti.`);
      unitPengganti = peng.ID_Unit;
      dampak = -(angka(peng.HPP) - g.hpp); // selisih modal unit pengganti vs unit lama
      ubahStatusUnit(unit.ID_Unit, STATUS_UNIT.RETUR);
      ubahStatusUnit(unit.ID_Unit, kembali);
      Db.updateById(SHEET.STOK_HP, unit.ID_Unit, { Tgl_Keluar: '', ID_Penjualan: '' });
      Db.updateById(SHEET.STOK_HP, peng.ID_Unit, { Status: STATUS_UNIT.TERJUAL, Tgl_Keluar: tglIso(now), ID_Penjualan: g.idPenjualan });
      status = 'Selesai';
    }

    const id = buatId(PREFIX_ID.KLAIM);
    if (idServis) Db.updateById(SHEET.SERVIS, idServis, { ID_Klaim: id });
    Db.append(SHEET.GARANSI_RETUR, {
      ID_Klaim: id, Tanggal: tglIso(now), Jam: jamHm(now), ID_Penjualan: g.idPenjualan, ID_Unit: unit.ID_Unit,
      Nama_Barang: g.unit, Jenis: data.jenis, Alasan: alasan, Masih_Garansi: masih ? 'Ya' : 'Tidak',
      Tindakan: sanitasi(data.tindakan || data.jenis), Nilai_Refund: nilaiRefund, Unit_Pengganti: unitPengganti,
      Status: status, Dampak_Laba: dampak,
    });
    log('Tambah', SHEET.GARANSI_RETUR, id, `${data.jenis} ${g.nota} ${g.unit}${masih ? '' : ' (garansi habis)'}`);
    return { idKlaim: id, status, masihGaransi: masih, dampakLaba: dampak, idServis };
  }));
}

/** Bagian diskon nota yang melekat pada item (proporsional terhadap nilai item non-bonus) */
function proporsiDiskon(g: HasilCekGaransi): number {
  const p = Db.findById(SHEET.PENJUALAN, g.idPenjualan);
  if (!p) return 0;
  const diskon = angka(p.Diskon);
  if (diskon <= 0) return 0;
  const barang = (Db.getAll(SHEET.PENJUALAN_ITEM) as R[]).filter(i => i.ID_Penjualan === g.idPenjualan && i.Tipe !== 'Bonus');
  const total = barang.reduce((s, i) => s + angka(i.Harga_Jual) * angka(i.Qty), 0);
  return total > 0 ? Math.round(diskon * (g.hargaJual / total)) : 0;
}

export function updateStatusKlaim(idKlaim: string, status: string): { idKlaim: string; status: string } {
  return denganLock(() => Db.transaksi(() => {
    if (!daftarReferensi('Status_Klaim').includes(status)) throw new GalatBisnis('STATUS_TIDAK_VALID', `Status ${status} tidak dikenal.`);
    const k = Db.findById(SHEET.GARANSI_RETUR, idKlaim);
    if (!k) throw new GalatBisnis('KLAIM_TIDAK_ADA', `Klaim ${idKlaim} tidak ditemukan.`);
    if (k.Status === 'Selesai' || k.Status === 'Ditolak') throw new GalatBisnis('KLAIM_SUDAH_TUTUP', `Klaim ${idKlaim} sudah ${String(k.Status)}.`);
    Db.updateById(SHEET.GARANSI_RETUR, idKlaim, { Status: status });
    log('Ubah', SHEET.GARANSI_RETUR, idKlaim, `Status ${String(k.Status)} -> ${status}`);
    return { idKlaim, status };
  }));
}
