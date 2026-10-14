// produk.ts — penamaan produk yang SAMA di Katalog Produk, Barang Masuk, dan Tukar Tambah.
// Nama lengkap = merek + model + varian + warna (persis aturan di backend MasterService.simpanProduk),
// sehingga unit yang masuk otomatis tertaut ke katalog (cariIdProduk mencocokkan nama lengkap).

import type { ProdukKatalog } from '../mock/data-contoh';

export interface BagianNama { merek: string; model: string; varian: string; warna: string }

const rapi = (t: string) => t.replace(/\s+/g, ' ').trim();

export function namaLengkap(b: BagianNama): string {
  return [b.merek, b.model, b.varian, b.warna].map(rapi).filter(Boolean).join(' ');
}

/** Kunci pembanding nama (tanpa beda huruf besar/kecil dan spasi ganda) */
export const kunciNama = (t: string) => rapi(t).toLowerCase();

export const MEREK_UMUM = [
  'Samsung', 'Apple', 'Xiaomi', 'Redmi', 'POCO', 'Oppo', 'Vivo', 'Realme', 'Infinix', 'Tecno', 'Itel',
  'Huawei', 'Honor', 'Asus', 'OnePlus', 'Nokia', 'Google', 'Motorola',
];
export const VARIAN_UMUM = ['3/32 GB', '4/64 GB', '4/128 GB', '6/128 GB', '8/128 GB', '8/256 GB', '12/256 GB', '12/512 GB', '64 GB', '128 GB', '256 GB', '512 GB', '1 TB'];
export const WARNA_UMUM = ['Hitam', 'Putih', 'Biru', 'Hijau', 'Merah', 'Ungu', 'Emas', 'Perak', 'Abu-abu', 'Midnight', 'Starlight'];

export const platformDariMerek = (merek: string): 'iPhone' | 'Android' => (/^(apple|iphone)$/i.test(rapi(merek)) ? 'iPhone' : 'Android');

/** Unik, urut abjad, tanpa nilai kosong */
export function unik(nilai: string[]): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  nilai.forEach(v => { const r = rapi(v); const k = r.toLowerCase(); if (r && !seen.has(k)) { seen.add(k); out.push(r); } });
  return out.sort((a, b) => a.localeCompare(b, 'id'));
}

export interface SaranKatalog { merek: string[]; model: string[]; varian: string[]; warna: string[] }

/** Saran isian bertingkat: model menyesuaikan merek, varian dan warna menyesuaikan model */
export function saranDariKatalog(katalog: ProdukKatalog[], pilih: { merek: string; model: string }): SaranKatalog {
  const hp = katalog.filter(k => k.jenis === 'HP');
  const m = kunciNama(pilih.merek), md = kunciNama(pilih.model);
  const dgMerek = m ? hp.filter(k => kunciNama(k.merek) === m) : hp;
  const dgModel = md ? dgMerek.filter(k => kunciNama(k.model) === md) : dgMerek;
  return {
    merek: unik([...hp.map(k => k.merek), ...MEREK_UMUM]),
    model: unik(dgMerek.map(k => k.model)),
    varian: unik([...dgModel.map(k => k.varian), ...(md ? [] : VARIAN_UMUM), ...(md && !dgModel.length ? VARIAN_UMUM : [])]),
    warna: unik([...dgModel.map(k => k.warna), ...(dgModel.length ? [] : WARNA_UMUM)]),
  };
}

/** Produk katalog yang namanya sama persis dengan isian (null bila belum ada) */
export function cariDiKatalog(katalog: ProdukKatalog[], b: BagianNama): ProdukKatalog | null {
  const target = kunciNama(namaLengkap(b));
  if (!target) return null;
  return katalog.find(k => k.jenis === 'HP' && kunciNama(namaLengkap(k)) === target) || null;
}
