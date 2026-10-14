import { describe, it, expect } from 'vitest';
import { hitungDashboard, buatPeringatan } from '../../src/frontend/lib/derive';
import { notaDariTransaksi, tambahHari } from '../../src/frontend/lib/nota';
import { MOCK_STOK_HP, MOCK_AKSESORIS, MOCK_TAGIHAN, MOCK_TRANSAKSI_TERAKHIR, MOCK_SERVIS } from '../../src/frontend/mock/data-contoh';

const data = { transaksi: MOCK_TRANSAKSI_TERAKHIR, stok: MOCK_STOK_HP, aksesoris: MOCK_AKSESORIS, tagihan: MOCK_TAGIHAN, servis: MOCK_SERVIS };

describe('derive', () => {
  it('dashboard dihitung dari transaksi, bukan angka tertulis', () => {
    const d = hitungDashboard(data);
    const jual = MOCK_TRANSAKSI_TERAKHIR.filter(t => t.tipe === 'Jual' && t.tanggal === d.tanggalRef);
    expect(d.hariIni.omzet).toBe(jual.reduce((s, t) => s + t.nominal, 0));
    expect(d.tren).toHaveLength(7);
    expect(d.tren[6].hariIni).toBe(true);
    expect(d.trenHariIni).toHaveLength(7);
    expect(d.tren30Hari).toHaveLength(30);
    expect(d.tren30Hari[29].hariIni).toBe(true);
  });
  it('transaksi dibatalkan tidak dihitung', () => {
    const batal = MOCK_TRANSAKSI_TERAKHIR.map(t => (t.tipe === 'Jual' ? { ...t, status: 'Dibatalkan' as const } : t));
    expect(hitungDashboard({ ...data, transaksi: batal }).hariIni.omzet).toBe(0);
  });
  it('peringatan: tagihan telat paling kritis dan berada di urutan pertama', () => {
    const p = buatPeringatan(data);
    expect(p.length).toBeGreaterThan(0);
    expect(p[0].tingkat).toBe('kritis');
    const urut = p.map(x => ({ kritis: 0, tindakan: 1, info: 2 }[x.tingkat || 'info']));
    expect([...urut].sort()).toEqual(urut);
  });
  it('tanpa data tidak ada peringatan dan tidak crash', () => {
    expect(buatPeringatan({ transaksi: [], stok: [], aksesoris: [], tagihan: [], servis: [] })).toEqual([]);
    expect(hitungDashboard({ transaksi: [], stok: [], tagihan: [], servis: [] }).hariIni.omzet).toBe(0);
  });
});

describe('nota', () => {
  it('nota dari transaksi memakai data transaksi, bukan teks karangan', () => {
    const t = MOCK_TRANSAKSI_TERAKHIR.find(x => x.tipe === 'Jual')!;
    const n = notaDariTransaksi(t, 7);
    expect(n.noNota).toBe(t.id);
    expect(n.tanggalWib).toContain(t.tanggal);
    expect(n.totalTagihan).toBe(t.nominal);
    expect(n.garansiSampai).toBe(`${tambahHari(t.tanggal, 7)} (7 hari)`);
    // tanggal lain harus menghasilkan garansi lain (bukan teks tetap)
    expect(notaDariTransaksi({ ...t, tanggal: '10 Okt 2026' }, 7).garansiSampai).toBe('17 Okt 2026 (7 hari)');
  });
  it('tambahHari melewati batas bulan', () => {
    expect(tambahHari('28 Okt 2026', 7)).toBe('04 Nov 2026');
  });
});
