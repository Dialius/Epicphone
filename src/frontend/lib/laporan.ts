// laporan.ts — bentuk data layar Laporan. Mode nyata: dihitung server (getLaporanLayar, PRD 05).
// Mode demo: contoh dari mock.

import { MOCK_LAPORAN, MOCK_TREN_12_BULAN, MOCK_TOP_MODEL } from '../mock/data-contoh';

export interface LaporanLayar {
  periode: string;
  bulan: string;
  dari: string;
  sampai: string;
  isLocked: boolean;
  bisaDikunci: boolean;
  bisaPdf: boolean;
  pembandingLabel: string;
  jumlahHari: number;
  omzet: number; unitTerjual: number; rataHariTerjual: number; transaksiJual: number;
  labaKotorHP: number; labaAksesoris: number; labaServis: number; biayaBonus: number; biayaGaransi: number;
  pembalikanRetur: number; kerugianRefund: number; kerugianRusak: number; biayaOperasional: number;
  labaBersih: number; labaBulanLalu: number; persenKenaikan: number; pembandingAda: boolean; marginKotor: number;
  komposisi: { hp: number; aksesoris: number; servis: number };
  tren12Bulan: Array<{ bulan: string; laba: number }>;
  agingPiutang: { belumJatuhTempo: number; telat1sd7: number; telat8sd30: number; telatDiatas30: number };
  top10Model: Array<{ nama: string; terjual: number; laba: number }>;
  bonusPalingSering: Array<{ nama: string; qty: number }>;
  kasMasuk: number; kasKeluar: number; arusKasBersih: number;
  perMetode: Record<string, { masuk: number; keluar: number }>;
  nilaiStokAktif: number; unitStokAktif: number; unitLebih30Hari: number; nilaiLebih30Hari: number;
  servisModalTertahan: number; servisUnitCount: number;
  stokUmur: { sampai7: { unit: number; nilai: number }; hari8sd30: { unit: number; nilai: number }; hari31sd60: { unit: number; nilai: number }; lebih60: { unit: number; nilai: number } };
  piutang: number; piutangTelat: number; hutang: number;
  debiturTerbesar: Array<{ id: string; nama: string; sisa: number; hariTelat: number }>;
}

/** Nama periode di layar -> parameter server */
export const PERIODE_API = { 'Bulan ini': 'bulan-ini', 'Hari ini': 'hari-ini', '7 hari': '7-hari', 'Bulan lalu': 'bulan-lalu' } as const;

/** Contoh untuk mode demo (angka tetap, bukan hitungan) */
export function laporanContoh(): LaporanLayar {
  const m = MOCK_LAPORAN;
  return {
    periode: 'Oktober 2026', bulan: '2026-10', dari: '2026-10-01', sampai: '2026-10-05', isLocked: false, bisaDikunci: true, bisaPdf: true,
    pembandingLabel: 'September', jumlahHari: 31, omzet: m.omzet, unitTerjual: m.unitTerjual, rataHariTerjual: m.rataHariTerjual, transaksiJual: 31,
    labaKotorHP: m.labaKotorHP, labaAksesoris: m.labaAksesoris, labaServis: m.labaServis, biayaBonus: m.biayaBonus, biayaGaransi: m.biayaGaransi,
    pembalikanRetur: 0, kerugianRefund: 0, kerugianRusak: 0, biayaOperasional: m.biayaOperasional, labaBersih: m.labaBersih,
    labaBulanLalu: Math.round(m.labaBersih / 1.121), persenKenaikan: 12.1, pembandingAda: true, marginKotor: 8.1,
    komposisi: { hp: 82, aksesoris: 7, servis: 11 },
    tren12Bulan: MOCK_TREN_12_BULAN.map(t => ({ bulan: t.bulan, laba: t.laba })),
    agingPiutang: { belumJatuhTempo: 3000000, telat1sd7: 1200000, telat8sd30: 0, telatDiatas30: 0 },
    top10Model: MOCK_TOP_MODEL.map(t => ({ nama: t.model, terjual: t.terjual, laba: 0 })),
    bonusPalingSering: [],
    kasMasuk: 94200000, kasKeluar: 68450000, arusKasBersih: 25750000,
    perMetode: { Tunai: { masuk: 42100000, keluar: 0 }, Transfer: { masuk: 38600000, keluar: 0 }, QRIS: { masuk: 13500000, keluar: 0 } },
    nilaiStokAktif: 114800000, unitStokAktif: 38, unitLebih30Hari: 12, nilaiLebih30Hari: 32100000, servisModalTertahan: 0, servisUnitCount: 0,
    stokUmur: { sampai7: { unit: 8, nilai: 28500000 }, hari8sd30: { unit: 18, nilai: 54200000 }, hari31sd60: { unit: 12, nilai: 32100000 }, lebih60: { unit: 0, nilai: 0 } },
    piutang: 4200000, piutangTelat: 1200000, hutang: 0,
    debiturTerbesar: [{ id: 'TGH-2610-0009', nama: 'Siti Rahayu', sisa: 3000000, hariTelat: 0 }, { id: 'TGH-2610-0004', nama: 'Budi Santoso', sisa: 1200000, hariTelat: 3 }],
  };
}
