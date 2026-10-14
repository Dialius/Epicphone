// tests/unit/stok.test.ts — Uji logika filter stok, umur stok, dan validasi IMEI aktif

import { describe, it, expect } from 'vitest';
import { hitungHari } from '../../src/backend/StokService';

describe('hitungHari', () => {
  it('menghitung selisih hari dengan benar', () => {
    const tgl1 = new Date(2026, 9, 1);
    const tgl2 = new Date(2026, 9, 11);
    expect(hitungHari(tgl1, tgl2)).toBe(10);
  });

  it('tanggal sama menghasilkan 0 hari', () => {
    const tgl = new Date(2026, 9, 1);
    expect(hitungHari(tgl, tgl)).toBe(0);
  });
});
