// MasterService.ts — data master: Kontak (pelanggan/supplier) dan Produk (katalog)

import { SHEET, PREFIX_ID } from './Config';
import { Db } from './Db';
import { GalatBisnis } from './Galat';
import { denganLock } from './Lock';
import { buatId } from './Id';
import { log } from './Log';
import { sanitasi, normalisasiWA, angka } from './Utils';

export interface KontakInput {
  nama: string;
  tipe: 'Pelanggan' | 'Supplier';
  noWa?: string;
  alamat?: string;
  catatan?: string;
}

export interface ProdukInput {
  jenis: 'HP' | 'Aksesoris';
  platform?: string;
  merek: string;
  model: string;
  varian?: string;
  warna?: string;
  hargaStandar?: number;
}

export function simpanKontak(data: KontakInput): { idKontak: string } {
  return denganLock(() => Db.transaksi(() => {
    const nama = sanitasi(String(data?.nama ?? '').trim());
    if (!nama) throw new GalatBisnis('NAMA_KOSONG', 'Nama kontak wajib diisi.');
    if (data.tipe !== 'Pelanggan' && data.tipe !== 'Supplier') throw new GalatBisnis('TIPE_TIDAK_VALID', 'Pilih jenis kontak: Pelanggan atau Supplier.');

    const wa = normalisasiWA(data.noWa || '').replace(/\D/g, '');
    if (wa) {
      if (wa.length < 10) throw new GalatBisnis('WA_TIDAK_VALID', 'Nomor WhatsApp terlalu pendek.');
      const ganda = (Db.getAll(SHEET.KONTAK) as Array<Record<string, unknown>>)
        .find(k => normalisasiWA(String(k.No_WA ?? '')).replace(/\D/g, '') === wa);
      if (ganda) throw new GalatBisnis('WA_GANDA', `Nomor ini sudah dipakai ${String(ganda.Nama)} (${String(ganda.ID_Kontak)}).`);
    }

    const id = buatId(PREFIX_ID.KONTAK);
    Db.append(SHEET.KONTAK, {
      ID_Kontak: id, Nama: nama, Tipe: data.tipe, No_WA: wa, Alamat: sanitasi(data.alamat || ''),
      Catatan: sanitasi(data.catatan || ''), Total_Transaksi: 0,
    });
    log('Tambah', SHEET.KONTAK, id, `Kontak ${data.tipe}: ${nama}`);
    return { idKontak: id };
  }));
}

export function simpanProduk(data: ProdukInput): { idProduk: string } {
  return denganLock(() => Db.transaksi(() => {
    const merek = sanitasi(String(data?.merek ?? '').trim());
    const model = sanitasi(String(data?.model ?? '').trim());
    if (!merek || !model) throw new GalatBisnis('NAMA_KOSONG', 'Merek dan model wajib diisi.');
    if (data.jenis !== 'HP' && data.jenis !== 'Aksesoris') throw new GalatBisnis('TIPE_TIDAK_VALID', 'Pilih jenis produk: HP atau Aksesoris.');
    const harga = Math.round(angka(data.hargaStandar));
    if (harga < 0) throw new GalatBisnis('HARGA_TIDAK_VALID', 'Harga tidak boleh negatif.');

    const varian = sanitasi(data.varian || '');
    const warna = sanitasi(data.warna || '');
    const lengkap = [merek, model, varian, warna].filter(Boolean).join(' ');
    const ganda = (Db.getAll(SHEET.PRODUK) as Array<Record<string, unknown>>)
      .find(p => String(p.Nama_Lengkap ?? '').toLowerCase() === lengkap.toLowerCase());
    if (ganda) throw new GalatBisnis('PRODUK_GANDA', `${lengkap} sudah ada di katalog (${String(ganda.ID_Produk)}).`);

    const id = buatId(PREFIX_ID.PRODUK);
    Db.append(SHEET.PRODUK, {
      ID_Produk: id, Jenis: data.jenis, Platform: data.platform || '', Merek: merek, Model: model,
      Varian: varian, Warna: warna, Nama_Lengkap: lengkap, Harga_Jual_Standar: harga, Aktif: 'Ya',
    });
    log('Tambah', SHEET.PRODUK, id, `Produk ${lengkap}`);
    return { idProduk: id };
  }));
}

/** Cari kontak pelanggan berdasarkan nomor WA; bila belum ada, buat (Total_Transaksi dihitung saat dibaca). */
export function cariAtauBuatKontak(nama: string, waDigit: string): { idKontak: string; baru: boolean } {
  const ada = (Db.getAll(SHEET.KONTAK) as Array<Record<string, unknown>>)
    .find(k => normalisasiWA(String(k.No_WA ?? '')).replace(/\D/g, '') === waDigit);
  if (ada) return { idKontak: String(ada.ID_Kontak), baru: false };
  const id = buatId(PREFIX_ID.KONTAK);
  Db.append(SHEET.KONTAK, { ID_Kontak: id, Nama: sanitasi(nama), Tipe: 'Pelanggan', No_WA: waDigit, Alamat: '', Catatan: '', Total_Transaksi: 0 });
  return { idKontak: id, baru: true };
}


const NAMA_UMUM = /^(supplier|pelanggan umum|-|\s*)$/i;
const rapi = (t: unknown) => String(t ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Supplier dari Barang Masuk dicatat di Kontak (Tipe Supplier) agar muncul di daftar kontak dan hutangnya bisa ditagih.
 * Cocok berdasarkan nama; kontak Pelanggan bernama sama menjadi "Keduanya". Nama kosong/umum tidak dibuat kontak.
 */
export function cariAtauBuatSupplier(nama: string): string {
  const bersih = sanitasi(String(nama ?? '').trim());
  if (NAMA_UMUM.test(bersih)) return '';
  const ada = (Db.getAll(SHEET.KONTAK) as Array<Record<string, unknown>>).find(k => rapi(k.Nama) === rapi(bersih));
  if (ada) {
    if (ada.Tipe === 'Pelanggan') Db.updateById(SHEET.KONTAK, String(ada.ID_Kontak), { Tipe: 'Keduanya' });
    return String(ada.ID_Kontak);
  }
  const id = buatId(PREFIX_ID.KONTAK);
  Db.append(SHEET.KONTAK, { ID_Kontak: id, Nama: bersih, Tipe: 'Supplier', No_WA: '', Alamat: '', Catatan: '', Total_Transaksi: 0 });
  return id;
}

/** ID_Produk dari nama lengkap yang diketik/dipilih (merek + model + varian + warna); kosong bila tidak ada di katalog */
export function cariIdProduk(nama: string, jenis: 'HP' | 'Aksesoris' = 'HP'): string {
  const target = rapi(nama);
  if (!target) return '';
  const p = (Db.getAll(SHEET.PRODUK) as Array<Record<string, unknown>>).find(r => {
    if (r.Jenis && r.Jenis !== jenis) return false;
    const lengkap = rapi(r.Nama_Lengkap) || rapi([r.Merek, r.Model, r.Varian, r.Warna].filter(Boolean).join(' '));
    return lengkap === target;
  });
  return p ? String(p.ID_Produk) : '';
}
