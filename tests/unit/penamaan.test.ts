// tests/unit/penamaan.test.ts — uji fungsi Penamaan

import { describe, it, expect } from 'vitest';

// Stub Utilities
const Utilities = {
  formatDate: (d: Date, _tz: string, fmt: string) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const M = d.getMonth() + 1;
    const dy = d.getDate();
    const H = d.getHours();
    const m = d.getMinutes();
    return fmt
      .replace('yyyy-MM-dd', `${y}-${pad(M)}-${pad(dy)}`)
      .replace('HHmm', `${pad(H)}${pad(m)}`);
  },
};
// @ts-expect-error stub global
globalThis.Utilities = Utilities;

const { namaFolderUnit, namaFoto, namaBackup, namaNota, namaLaporan } =
  await import('../../src/backend/Penamaan');

describe('namaFolderUnit', () => {
  it('format benar', () => {
    const result = namaFolderUnit({
      idUnit: 'UNT-2610-0007',
      namaBarang: 'Samsung Galaxy A54 5G 8/256 GB Hitam',
      imei1: '358123456789012',
    });
    expect(result).toBe('UNT-2610-0007_SAMSUNG-GALAXY-A54-5G-8-256-GB-HITAM_IMEI-9012');
  });
});

describe('namaFoto', () => {
  it('foto HP format benar', () => {
    const waktu = new Date(2026, 9, 5, 10, 32); // 5 Okt 2026 10:32
    const result = namaFoto({
      jenis: 'FOTO-HP',
      idRef: 'UNT-2610-0007',
      posisi: 'DEPAN',
      urutan: 1,
      waktu,
    });
    expect(result).toBe('EPICPHONE_FOTO-HP_UNT-2610-0007_DEPAN_01_2026-10-05_1032.jpg');
  });

  it('foto servis format benar', () => {
    const waktu = new Date(2026, 9, 5, 11, 0);
    const result = namaFoto({
      jenis: 'FOTO-SERVIS',
      idRef: 'SRV-2610-0005',
      posisi: 'SEBELUM',
      urutan: 1,
      waktu,
    });
    expect(result).toBe('EPICPHONE_FOTO-SERVIS_SRV-2610-0005_SEBELUM_01_2026-10-05_1100.jpg');
  });

  it('urutan dipad 2 digit', () => {
    const waktu = new Date(2026, 9, 5, 10, 0);
    const result = namaFoto({ jenis: 'FOTO-HP', idRef: 'UNT-0001', posisi: 'DEPAN', urutan: 9, waktu });
    expect(result).toContain('_09_');
  });
});

describe('namaBackup', () => {
  it('harian format benar', () => {
    const waktu = new Date(2026, 9, 5, 1, 0);
    expect(namaBackup('HARIAN', waktu)).toBe('EPICPHONE_BACKUP_HARIAN_2026-10-05_0100');
  });
  it('bulanan format benar', () => {
    const waktu = new Date(2026, 9, 1, 2, 0);
    // Stub formatDate harus support yyyy-MM
    expect(namaBackup('BULANAN', waktu)).toContain('EPICPHONE_BACKUP_BULANAN_');
  });
});

describe('namaNota', () => {
  it('nota normal', () => {
    expect(namaNota('JUAL-2610-0042')).toBe('EPICPHONE_NOTA_JUAL-2610-0042.pdf');
  });
  it('nota dibatalkan', () => {
    expect(namaNota('JUAL-2610-0042', 1, 'DIBATALKAN')).toBe('EPICPHONE_NOTA_JUAL-2610-0042_v1_DIBATALKAN.pdf');
  });
});

describe('namaLaporan', () => {
  it('laba bulanan', () => {
    expect(namaLaporan('LABA', '2026-10')).toBe('EPICPHONE_LAPORAN_LABA_2026-10.pdf');
  });
  it('arus kas', () => {
    expect(namaLaporan('ARUS-KAS', '2026-10')).toBe('EPICPHONE_LAPORAN_ARUS-KAS_2026-10.pdf');
  });
});
