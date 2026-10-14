import { describe, it, expect } from 'vitest';
import { terbilang, terbilangRupiah, rupiah, rupiahRingkas, parseTgl, tglWib, nomorDokumen, urutanBerikut, normalisasiWa, linkWa, inisial, selisihHari } from '../../src/frontend/lib/format';

describe('format', () => {
  it('rupiah memakai pemisah titik dan menangani negatif', () => {
    expect(rupiah(1450000)).toBe('Rp 1.450.000');
    expect(rupiah(-500)).toBe('-Rp 500');
    expect(rupiah(NaN)).toBe('Rp 0');
  });
  it('rupiahRingkas meringkas jt dan rb', () => {
    expect(rupiahRingkas(10340000)).toBe('Rp 10,34 jt');
    expect(rupiahRingkas(850000)).toBe('Rp 850 rb');
    expect(rupiahRingkas(500)).toBe('Rp 500');
  });
  it('parseTgl membaca format data aplikasi dan menolak sampah', () => {
    const d = parseTgl('05 Okt 2026')!;
    expect(d.getUTCFullYear()).toBe(2026); expect(d.getUTCMonth()).toBe(9); expect(d.getUTCDate()).toBe(5);
    expect(parseTgl('bukan tanggal')).toBeNull();
    expect(parseTgl(undefined)).toBeNull();
  });
  it('tglWib memakai zona WIB walau zona perangkat berbeda', () => {
    // 2026-10-05 20:00 UTC = 06 Okt 2026 03:00 WIB
    expect(tglWib(new Date(Date.UTC(2026, 9, 5, 20, 0)))).toBe('06 Okt 2026');
    expect(tglWib(new Date(Date.UTC(2026, 9, 5, 2, 0)))).toBe('05 Okt 2026');
  });
  it('selisihHari menghitung selisih tanggal', () => {
    expect(selisihHari(parseTgl('05 Okt 2026')!, parseTgl('02 Okt 2026')!)).toBe(3);
  });
  it('nomorDokumen dan urutanBerikut berurutan, bukan acak', () => {
    const d = new Date(Date.UTC(2026, 9, 5, 5, 0));
    expect(nomorDokumen('JUAL', 43, d)).toBe('JUAL-2610-0043');
    expect(urutanBerikut(['JUAL-2610-0041', 'JUAL-2610-0042', 'BELI-2610-0099'], 'JUAL')).toBe(43);
    expect(urutanBerikut([], 'JUAL')).toBe(1);
  });
  it('normalisasiWa dan linkWa', () => {
    expect(normalisasiWa('0812-3456-7890')).toBe('6281234567890');
    expect(normalisasiWa('+62 812 3456 7890')).toBe('6281234567890');
    expect(normalisasiWa('')).toBe('');
    expect(linkWa('0812', 'Halo & hai')).toContain('text=Halo%20%26%20hai');
  });
  it('inisial', () => {
    expect(inisial('Budi Santoso')).toBe('BS');
    expect(inisial('CV')).toBe('C');
  });
  it('terbilang menulis angka dalam kata bahasa Indonesia', () => {
    expect(terbilang(0)).toBe('nol');
    expect(terbilang(11)).toBe('sebelas');
    expect(terbilang(100)).toBe('seratus');
    expect(terbilang(1000)).toBe('seribu');
    expect(terbilang(2015)).toBe('dua ribu lima belas');
    expect(terbilang(1500000)).toBe('satu juta lima ratus ribu');
    expect(terbilangRupiah(9550000)).toBe('Sembilan juta lima ratus lima puluh ribu rupiah');
  });
});
