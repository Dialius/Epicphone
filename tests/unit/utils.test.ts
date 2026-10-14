// tests/unit/utils.test.ts — uji fungsi Utils (tanpa Apps Script)

import { describe, it, expect } from 'vitest';

// Stub Utilities (Apps Script global) untuk test environment
const Utilities = {
  formatDate: (d: Date, _tz: string, fmt: string) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const M = d.getMonth() + 1;
    const dy = d.getDate();
    const H = d.getHours();
    const m = d.getMinutes();
    return fmt
      .replace('yyyy', String(y))
      .replace('yy', String(y).slice(-2))
      .replace('MM', pad(M))
      .replace('dd', pad(dy))
      .replace('HH', pad(H))
      .replace('mm', pad(m))
      .replace('MMM', ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][M-1]);
  },
};
// @ts-expect-error stub global
globalThis.Utilities = Utilities;

// Import setelah stub
const { formatRupiah, parseRupiah, validasiIMEI, sanitasi, normalisasiWA, slug, imeiAkhir, yymm } =
  await import('../../src/backend/Utils');

describe('formatRupiah', () => {
  it('format ribuan dengan titik', () => {
    expect(formatRupiah(3_250_000)).toBe('Rp 3.250.000');
  });
  it('nol', () => {
    expect(formatRupiah(0)).toBe('Rp 0');
  });
  it('bulatkan desimal', () => {
    expect(formatRupiah(99.6)).toBe('Rp 100');
  });
});

describe('parseRupiah', () => {
  it('strip Rp dan titik', () => {
    expect(parseRupiah('Rp 3.250.000')).toBe(3_250_000);
  });
  it('angka murni', () => {
    expect(parseRupiah('85000')).toBe(85_000);
  });
  it('string kosong -> 0', () => {
    expect(parseRupiah('')).toBe(0);
  });
});

describe('validasiIMEI', () => {
  it('15 digit valid', () => {
    expect(validasiIMEI('358123456789012')).toBe(true);
  });
  it('14 digit invalid', () => {
    expect(validasiIMEI('35812345678901')).toBe(false);
  });
  it('ada huruf invalid', () => {
    expect(validasiIMEI('35812345678901X')).toBe(false);
  });
  it('dengan spasi (trim) valid', () => {
    expect(validasiIMEI(' 358123456789012 ')).toBe(true);
  });
});

describe('sanitasi', () => {
  it('hapus = di depan', () => {
    expect(sanitasi('=FORMULA')).toBe('FORMULA');
  });
  it('hapus + - @ di depan', () => {
    expect(sanitasi('+XSS')).toBe('XSS');
    expect(sanitasi('-DROP')).toBe('DROP');
    expect(sanitasi('@inject')).toBe('inject');
  });
  it('teks normal tidak berubah', () => {
    expect(sanitasi('Samsung Galaxy A54')).toBe('Samsung Galaxy A54');
  });
  it('string kosong', () => {
    expect(sanitasi('')).toBe('');
  });
});

describe('normalisasiWA', () => {
  it('08 -> 628', () => {
    expect(normalisasiWA('081234567890')).toBe('6281234567890');
  });
  it('628 tetap', () => {
    expect(normalisasiWA('6281234567890')).toBe('6281234567890');
  });
  it('strip karakter non-digit', () => {
    expect(normalisasiWA('+62 812-3456-7890')).toBe('6281234567890');
  });
});

describe('slug', () => {
  it('uppercase dan ganti spasi dengan -', () => {
    expect(slug('Samsung Galaxy A54 5G')).toBe('SAMSUNG-GALAXY-A54-5G');
  });
  it('buang tanda kurung dan spesial', () => {
    expect(slug('Xiaomi Redmi Note 12 (8/256)')).toBe('XIAOMI-REDMI-NOTE-12-8-256');
  });
  it('potong sesuai maks', () => {
    expect(slug('ABCDEFGHIJ', 5)).toBe('ABCDE');
  });
  it('tidak ada - di ujung', () => {
    expect(slug('iPhone!')).toBe('IPHONE');
  });
});

describe('imeiAkhir', () => {
  it('4 digit terakhir', () => {
    expect(imeiAkhir('358123456789012')).toBe('9012');
  });
});

describe('yymm', () => {
  it('Oktober 2026 -> 2610', () => {
    const d = new Date(2026, 9, 5); // bulan 0-indexed
    expect(yymm(d)).toBe('2610');
  });
  it('Januari 2027 -> 2701', () => {
    const d = new Date(2027, 0, 1);
    expect(yymm(d)).toBe('2701');
  });
});
