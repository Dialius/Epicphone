import { describe, it, expect } from 'vitest';
import { namaLengkap, kunciNama, saranDariKatalog, cariDiKatalog, platformDariMerek, unik } from '../../src/frontend/lib/produk';
import type { ProdukKatalog } from '../../src/frontend/mock/data-contoh';

const kat = (o: Partial<ProdukKatalog> & { id: string }): ProdukKatalog => ({
  jenis: 'HP', merek: 'Samsung', model: 'Galaxy A54 5G', varian: '8/256 GB', warna: 'Hitam', hargaStandar: 3250000, aktif: true, ...o,
});
const KATALOG = [
  kat({ id: 'PRD-0001' }),
  kat({ id: 'PRD-0002', warna: 'Putih' }),
  kat({ id: 'PRD-0003', model: 'Galaxy A15', varian: '6/128 GB', warna: 'Biru' }),
  kat({ id: 'PRD-0004', merek: 'Apple', model: 'iPhone 13', varian: '128 GB', warna: 'Midnight' }),
  kat({ id: 'PRD-0005', jenis: 'Aksesoris', merek: 'Anker', model: 'Charger 20W', varian: '', warna: '' }),
];

describe('produk: nama standar yang sama dengan Katalog dan backend', () => {
  it('namaLengkap menggabung merek, model, varian, warna dan membuang spasi berlebih/kosong', () => {
    expect(namaLengkap({ merek: 'Samsung', model: 'Galaxy A54 5G', varian: '8/256 GB', warna: 'Hitam' })).toBe('Samsung Galaxy A54 5G 8/256 GB Hitam');
    expect(namaLengkap({ merek: ' Apple ', model: 'iPhone  13', varian: '', warna: '' })).toBe('Apple iPhone 13');
  });
  it('kunciNama tidak peka huruf besar/kecil dan spasi ganda', () => {
    expect(kunciNama('  Samsung   GALAXY  A54 ')).toBe('samsung galaxy a54');
  });
  it('saran bertingkat: model mengikuti merek, varian dan warna mengikuti model', () => {
    const s = saranDariKatalog(KATALOG, { merek: 'Samsung', model: 'Galaxy A54 5G' });
    expect(s.model).toEqual(['Galaxy A15', 'Galaxy A54 5G']);
    expect(s.varian).toEqual(['8/256 GB']);
    expect(s.warna).toEqual(['Hitam', 'Putih']);
    expect(s.merek).toContain('Apple');
    expect(s.merek).toContain('Xiaomi'); // merek umum selalu ditawarkan
  });
  it('aksesoris tidak masuk saran HP', () => {
    expect(saranDariKatalog(KATALOG, { merek: '', model: '' }).merek).not.toContain('Anker');
  });
  it('cariDiKatalog menemukan produk persis sama (abaikan besar/kecil), null bila belum ada', () => {
    expect(cariDiKatalog(KATALOG, { merek: 'samsung', model: 'galaxy a54 5g', varian: '8/256 gb', warna: 'putih' })?.id).toBe('PRD-0002');
    expect(cariDiKatalog(KATALOG, { merek: 'Samsung', model: 'Galaxy A54 5G', varian: '8/256 GB', warna: 'Merah' })).toBeNull();
    expect(cariDiKatalog(KATALOG, { merek: '', model: '', varian: '', warna: '' })).toBeNull();
  });
  it('platformDariMerek dan unik', () => {
    expect(platformDariMerek('Apple')).toBe('iPhone');
    expect(platformDariMerek('Xiaomi')).toBe('Android');
    expect(unik(['b', 'A', 'a', ' ', 'c'])).toEqual(['A', 'b', 'c']);
  });
});
