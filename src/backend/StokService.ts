// StokService.ts — Manajemen stok unit HP dan stok aksesoris

import { SHEET, STATUS_UNIT, PREFIX_ID } from './Config';
import { Db } from './Db';
import { GalatBisnis } from './Galat';
import { denganLock } from './Lock';
import { buatId } from './Id';
import { angka, selisihHariIso, tglIso, sekarang, sanitasi } from './Utils';
import { log } from './Log';

export interface FilterStok {
  status?: string;
  kondisi?: string;
  umurLebihDari?: number;
}

export interface UnitRow {
  ID_Unit: string;
  Tgl_Masuk: string;
  Jam_Masuk: string;
  IMEI_1: string;
  IMEI_2?: string;
  ID_Produk: string;
  Nama_Barang: string;
  Kondisi: 'Baru' | 'Bekas';
  Grade?: string;
  Kelengkapan: string;
  Baterai_Persen?: number;
  Bebas_Kunci_Akun: string;
  Sumber: string;
  ID_Sumber: string;
  Harga_Beli: number;
  Biaya_Lain: number;
  Biaya_Servis: number;
  HPP: number;
  Estimasi_Servis: number;
  Harga_Jual_Target: number;
  Status: string;
  Umur_Stok_Hari: number;
  Tgl_Keluar?: string;
  ID_Penjualan?: string;
  Link_Foto?: string;
  Catatan?: string;
  Dibuat_Oleh?: string;
  Tgl_Rusak?: string;
}

export interface AksesorisRow {
  SKU: string;
  Nama_Barang: string;
  Kategori: string;
  Stok: number;
  Stok_Minimum: number;
  Harga_Beli_Rata2: number;
  Harga_Jual: number;
  Status: string;
}

export const UKURAN_HALAMAN = 50;

/** Selisih hari antara dua tanggal (Date atau ISO) */
export function hitungHari(tglAwal: Date | string, tglAkhir: Date = sekarang()): number {
  const d1 = typeof tglAwal === 'string' ? new Date(tglAwal) : tglAwal;
  const diffTime = Math.abs(tglAkhir.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/** Umur stok dari tanggal masuk (ISO) sampai hari ini; 0 bila tanggal tidak terbaca */
export function umurStokHari(tglMasukIso: string, hariIniIso: string = tglIso(sekarang())): number {
  const n = selisihHariIso(tglMasukIso, hariIniIso);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Status aksesoris dari stok */
export function statusAksesoris(stok: number, stokMin: number): 'Aman' | 'Menipis' | 'Habis' {
  if (stok <= 0) return 'Habis';
  return stok <= stokMin ? 'Menipis' : 'Aman';
}

export interface HasilCari {
  items: UnitRow[];
  total: number;
  halaman: number;
  ukuran: number;
}

/** Cari stok HP: model/nama/ID/IMEI (termasuk 4 digit akhir), dengan filter dan halaman */
export function cariStok(query = '', filter: FilterStok = {}, halaman = 1): HasilCari {
  const rows = Db.getAll(SHEET.STOK_HP) as unknown as UnitRow[];
  const q = query.trim().toLowerCase();
  const hariIni = tglIso(sekarang());

  const cocok = rows.filter(u => {
    if (u.Status === STATUS_UNIT.BATAL) return false;
    if (q) {
      const imei = String(u.IMEI_1 ?? '');
      const imeiMatch = imei.includes(q) || (q.length === 4 && imei.endsWith(q));
      const namaMatch = String(u.Nama_Barang ?? '').toLowerCase().includes(q);
      const idMatch = String(u.ID_Unit ?? '').toLowerCase().includes(q);
      if (!imeiMatch && !namaMatch && !idMatch) return false;
    }
    if (filter.status && filter.status !== 'Semua' && u.Status !== filter.status) return false;
    if (filter.kondisi && u.Kondisi !== filter.kondisi) return false;
    if (filter.umurLebihDari !== undefined && umurStokHari(u.Tgl_Masuk, hariIni) <= filter.umurLebihDari) return false;
    return true;
  });

  const h = Math.max(1, Math.floor(halaman) || 1);
  const awal = (h - 1) * UKURAN_HALAMAN;
  return { items: cocok.slice(awal, awal + UKURAN_HALAMAN), total: cocok.length, halaman: h, ukuran: UKURAN_HALAMAN };
}

/** Ambil detail satu unit berdasarkan ID_Unit */
export function getUnit(idUnit: string): UnitRow | null {
  return (Db.findById(SHEET.STOK_HP, idUnit) as unknown as UnitRow) || null;
}

/** Ambil semua stok aksesoris */
export function getStokAksesoris(): AksesorisRow[] {
  return Db.getAll(SHEET.STOK_AKSESORIS) as unknown as AksesorisRow[];
}

/** Cek apakah IMEI sudah terdaftar dan masih aktif di stok */
export function cekImeiAktif(imei: string, baris?: UnitRow[]): { ada: boolean; idUnit?: string; status?: string } {
  const rows = baris ?? (Db.getAll(SHEET.STOK_HP) as unknown as UnitRow[]);
  const target = String(imei).trim();
  // Satu IMEI bisa punya beberapa baris riwayat; yang aktif = bukan Terjual/Retur/Batal
  const aktif = rows.find(r => {
    if (String(r.IMEI_1).trim() !== target && String(r.IMEI_2 ?? '').trim() !== target) return false; // IMEI 2 juga unik
    return r.Status !== STATUS_UNIT.TERJUAL && r.Status !== STATUS_UNIT.RETUR && r.Status !== STATUS_UNIT.BATAL;
  });
  return aktif ? { ada: true, idUnit: aktif.ID_Unit, status: aktif.Status } : { ada: false };
}

/** Perbarui status unit (misal Ready -> Servis atau Servis -> Ready) */
export function perbaruiStatusUnit(idUnit: string, statusBaru: string): boolean {
  return Db.updateById(SHEET.STOK_HP, idUnit, { Status: statusBaru });
}

/** Unit harus ada, kalau tidak: galat berkode */
export function wajibUnit(idUnit: string): UnitRow {
  const u = getUnit(idUnit);
  if (!u) throw new GalatBisnis('UNIT_TIDAK_ADA', `Unit ${idUnit} tidak ditemukan.`);
  return u;
}

/** Ubah stok aksesoris dengan selisih (+/-) dan hitung ulang status */
export function ubahStokAksesoris(sku: string, selisih: number): AksesorisRow {
  const a = Db.findById(SHEET.STOK_AKSESORIS, sku) as unknown as AksesorisRow | null;
  if (!a) throw new GalatBisnis('AKSESORIS_TIDAK_ADA', `Aksesoris ${sku} tidak ditemukan.`);
  const stokBaru = angka(a.Stok) + selisih;
  if (stokBaru < 0) throw new GalatBisnis('STOK_KURANG', `Stok ${a.Nama_Barang} tidak cukup (sisa ${angka(a.Stok)}).`);
  Db.updateById(SHEET.STOK_AKSESORIS, sku, { Stok: stokBaru, Status: statusAksesoris(stokBaru, angka(a.Stok_Minimum)) });
  return { ...a, Stok: stokBaru };
}

// ── Alur status unit (PRD 01 bagian 5.5) ──────────────────────────────────────

/** Perpindahan status yang diizinkan. Terjual -> Ready hanya lewat pembatalan penjualan (paksa). */
export const STATUS_BOLEH: Record<string, string[]> = {
  [STATUS_UNIT.READY]: [STATUS_UNIT.DIPESAN, STATUS_UNIT.TERJUAL, STATUS_UNIT.SERVIS],
  [STATUS_UNIT.DIPESAN]: [STATUS_UNIT.READY, STATUS_UNIT.TERJUAL],
  [STATUS_UNIT.SERVIS]: [STATUS_UNIT.READY, STATUS_UNIT.RUSAK],
  [STATUS_UNIT.TERJUAL]: [STATUS_UNIT.RETUR],
  [STATUS_UNIT.RETUR]: [STATUS_UNIT.READY, STATUS_UNIT.RUSAK, STATUS_UNIT.SERVIS],
  [STATUS_UNIT.RUSAK]: [],
};

/** Ubah status unit mengikuti alur; Rusak mencatat tanggalnya (untuk Kerugian barang rusak). */
export function ubahStatusUnit(idUnit: string, ke: string, opsi: { paksa?: boolean } = {}): UnitRow {
  const u = wajibUnit(idUnit);
  if (u.Status === ke) return u;
  if (!opsi.paksa && !(STATUS_BOLEH[u.Status] || []).includes(ke)) {
    throw new GalatBisnis('STATUS_TIDAK_VALID', `Unit ${idUnit} berstatus ${u.Status} dan tidak bisa langsung diubah ke ${ke}.`);
  }
  const data: Record<string, unknown> = { Status: ke };
  if (ke === STATUS_UNIT.RUSAK) data.Tgl_Rusak = tglIso(sekarang());
  Db.updateById(SHEET.STOK_HP, idUnit, data);
  log('Ubah', SHEET.STOK_HP, idUnit, `Status ${u.Status} -> ${ke}`);
  return { ...u, Status: ke };
}

/**
 * Hitung ulang modal unit dari data servis (PRD 01 bagian 3.3):
 *  Biaya_Servis = biaya aktual servis internal berstatus Selesai; Estimasi_Servis = estimasi yang belum selesai;
 *  HPP = Harga_Beli + Biaya_Lain + Biaya_Servis (estimasi belum masuk HPP).
 */
export function hitungUlangModalUnit(idUnit: string): { hppLama: number; hppBaru: number; biayaServis: number; estimasi: number } {
  const u = wajibUnit(idUnit);
  const servis = (Db.getAll(SHEET.SERVIS) as Array<Record<string, unknown>>)
    .filter(s => s.Jenis === 'Internal' && String(s.ID_Unit) === idUnit);
  let biaya = 0;
  let estimasi = 0;
  for (const s of servis) {
    if (s.Status === 'Selesai' || s.Status === 'Diambil') biaya += angka(s.Biaya_Part) + angka(s.Biaya_Jasa_Teknisi);
    else if (s.Status === 'Antri' || s.Status === 'Dikerjakan') estimasi += angka(s.Estimasi_Biaya);
  }
  const hppBaru = angka(u.Harga_Beli) + angka(u.Biaya_Lain) + biaya;
  Db.updateById(SHEET.STOK_HP, idUnit, { Biaya_Servis: biaya, Estimasi_Servis: estimasi, HPP: hppBaru });
  return { hppLama: angka(u.HPP), hppBaru, biayaServis: biaya, estimasi };
}

// ── CRUD Unit HP & Aksesoris ──────────────────────────────────────────────────

export interface UnitEditInput {
  hargaJualTarget?: number;
  kondisi?: 'Baru' | 'Bekas';
  grade?: string;
  kelengkapan?: string;
  bateraiPersen?: number;
  bebasKunciAkun?: string;
  catatan?: string;
}

export function editUnit(idUnit: string, data: UnitEditInput): UnitRow {
  return denganLock(() => Db.transaksi(() => {
    const u = wajibUnit(idUnit);
    if (u.Status === STATUS_UNIT.BATAL) throw new GalatBisnis('UNIT_BATAL', 'Unit yang sudah dibatalkan tidak bisa diubah.');
    const ubah: Record<string, unknown> = {};
    if (data.hargaJualTarget !== undefined) ubah.Harga_Jual_Target = Math.max(0, Math.round(angka(data.hargaJualTarget)));
    if (data.kondisi !== undefined) ubah.Kondisi = data.kondisi === 'Baru' ? 'Baru' : 'Bekas';
    if (data.grade !== undefined) ubah.Grade = sanitasi(data.grade);
    if (data.kelengkapan !== undefined) ubah.Kelengkapan = sanitasi(data.kelengkapan);
    if (data.bateraiPersen !== undefined) ubah.Baterai_Persen = data.bateraiPersen ? Math.max(0, Math.min(100, Math.round(angka(data.bateraiPersen)))) : '';
    if (data.bebasKunciAkun !== undefined) ubah.Bebas_Kunci_Akun = sanitasi(data.bebasKunciAkun);
    if (data.catatan !== undefined) ubah.Catatan = sanitasi(data.catatan);

    Db.updateById(SHEET.STOK_HP, idUnit, ubah);
    log('Ubah', SHEET.STOK_HP, idUnit, `Edit data unit ${u.Nama_Barang}`);
    return { ...u, ...ubah } as UnitRow;
  }));
}

export function hapusUnit(idUnit: string, alasan: string): { idUnit: string; status: string } {
  return denganLock(() => Db.transaksi(() => {
    const u = wajibUnit(idUnit);
    if (u.Status === STATUS_UNIT.TERJUAL) throw new GalatBisnis('UNIT_TERJUAL', 'Unit yang sudah terjual tidak bisa dihapus.');
    if (u.Status === STATUS_UNIT.BATAL) throw new GalatBisnis('SUDAH_BATAL', 'Unit sudah dibatalkan sebelumnya.');
    const ket = sanitasi(alasan || 'Salah input stok');
    const catatanBaru = [u.Catatan, `[BATAL: ${ket}]`].filter(Boolean).join(' ');
    Db.updateById(SHEET.STOK_HP, idUnit, { Status: STATUS_UNIT.BATAL, Catatan: catatanBaru });
    log('Batal', SHEET.STOK_HP, idUnit, `Hapus unit: ${ket}`);
    return { idUnit, status: STATUS_UNIT.BATAL };
  }));
}

export interface AksesorisInput {
  namaBarang: string;
  kategori?: string;
  stok?: number;
  stokMinimum?: number;
  hargaBeliRata2?: number;
  hargaJual?: number;
  sku?: string;
}

export function simpanAksesoris(data: AksesorisInput): AksesorisRow {
  return denganLock(() => Db.transaksi(() => {
    const nama = sanitasi(data.namaBarang || '').trim();
    if (!nama) throw new GalatBisnis('NAMA_KOSONG', 'Nama aksesoris wajib diisi.');
    const sku = data.sku || buatId(PREFIX_ID.AKSESORIS);
    const stok = Math.max(0, Math.round(angka(data.stok)));
    const stokMin = Math.max(0, Math.round(angka(data.stokMinimum ?? 3)));
    const beli = Math.max(0, Math.round(angka(data.hargaBeliRata2)));
    const jual = Math.max(0, Math.round(angka(data.hargaJual)));
    const kat = sanitasi(data.kategori || 'Lainnya');
    const status = statusAksesoris(stok, stokMin);

    Db.append(SHEET.STOK_AKSESORIS, {
      SKU: sku, Nama_Barang: nama, Kategori: kat, Stok: stok, Stok_Minimum: stokMin,
      Harga_Beli_Rata2: beli, Harga_Jual: jual, Status: status,
    });
    log('Tambah', SHEET.STOK_AKSESORIS, sku, `Tambah aksesoris ${nama}`);
    return { SKU: sku, Nama_Barang: nama, Kategori: kat, Stok: stok, Stok_Minimum: stokMin, Harga_Beli_Rata2: beli, Harga_Jual: jual, Status: status };
  }));
}

export function editAksesoris(sku: string, data: Partial<AksesorisInput>): AksesorisRow {
  return denganLock(() => Db.transaksi(() => {
    const a = Db.findById(SHEET.STOK_AKSESORIS, sku) as unknown as AksesorisRow | null;
    if (!a) throw new GalatBisnis('AKSESORIS_TIDAK_ADA', `Aksesoris ${sku} tidak ditemukan.`);
    const ubah: Record<string, unknown> = {};
    if (data.namaBarang !== undefined) ubah.Nama_Barang = sanitasi(data.namaBarang);
    if (data.kategori !== undefined) ubah.Kategori = sanitasi(data.kategori);
    const stok = data.stok !== undefined ? Math.max(0, Math.round(angka(data.stok))) : angka(a.Stok);
    const stokMin = data.stokMinimum !== undefined ? Math.max(0, Math.round(angka(data.stokMinimum))) : angka(a.Stok_Minimum);
    ubah.Stok = stok;
    ubah.Stok_Minimum = stokMin;
    ubah.Status = statusAksesoris(stok, stokMin);
    if (data.hargaBeliRata2 !== undefined) ubah.Harga_Beli_Rata2 = Math.max(0, Math.round(angka(data.hargaBeliRata2)));
    if (data.hargaJual !== undefined) ubah.Harga_Jual = Math.max(0, Math.round(angka(data.hargaJual)));

    Db.updateById(SHEET.STOK_AKSESORIS, sku, ubah);
    log('Ubah', SHEET.STOK_AKSESORIS, sku, `Edit aksesoris ${a.Nama_Barang}`);
    return { ...a, ...ubah } as AksesorisRow;
  }));
}

export function hapusAksesoris(sku: string, alasan?: string): { sku: string; status: string } {
  return denganLock(() => Db.transaksi(() => {
    const a = Db.findById(SHEET.STOK_AKSESORIS, sku) as unknown as AksesorisRow | null;
    if (!a) throw new GalatBisnis('AKSESORIS_TIDAK_ADA', `Aksesoris ${sku} tidak ditemukan.`);
    Db.updateById(SHEET.STOK_AKSESORIS, sku, { Status: 'Batal', Stok: 0 });
    log('Batal', SHEET.STOK_AKSESORIS, sku, `Hapus aksesoris: ${alasan || 'Dihapus pengguna'}`);
    return { sku, status: 'Batal' };
  }));
}
