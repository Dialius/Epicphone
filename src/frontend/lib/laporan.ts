// laporan.ts — bentuk data layar Laporan. Mode nyata: dihitung server (getLaporanLayar, PRD 05).
// Mode demo: contoh dari mock.

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

/** Contoh untuk mode demo (angka realistis berubah sesuai periode) */
const BASE_LAPORAN: LaporanLayar = {
  periode: 'Oktober 2026', bulan: '2026-10', dari: '2026-10-01', sampai: '2026-10-05', isLocked: false, bisaDikunci: true, bisaPdf: true,
  pembandingLabel: 'September', jumlahHari: 31, omzet: 94500000, unitTerjual: 31, rataHariTerjual: 5.5, transaksiJual: 31,
  labaKotorHP: 11200000, labaAksesoris: 1200000, labaServis: 1650000, biayaBonus: 450000, biayaGaransi: 120000,
  pembalikanRetur: 0, kerugianRefund: 0, kerugianRusak: 0, biayaOperasional: 2350000, labaBersih: 11130000,
  labaBulanLalu: 9928635, persenKenaikan: 12.1, pembandingAda: true, marginKotor: 8.1,
  komposisi: { hp: 82, aksesoris: 7, servis: 11 },
  tren12Bulan: [
    { bulan: 'Okt 25', laba: 7.2 }, { bulan: 'Nov 25', laba: 6.8 }, { bulan: 'Des 25', laba: 9.4 },
    { bulan: 'Jan 26', laba: 5.9 }, { bulan: 'Feb 26', laba: 6.5 }, { bulan: 'Mar 26', laba: 8.1 },
    { bulan: 'Apr 26', laba: 7.4 }, { bulan: 'Mei 26', laba: 8.8 }, { bulan: 'Jun 26', laba: 9.1 },
    { bulan: 'Jul 26', laba: 7.9 }, { bulan: 'Agu 26', laba: 8.6 }, { bulan: 'Sep 26', laba: 10.8 },
  ],
  agingPiutang: { belumJatuhTempo: 3000000, telat1sd7: 1200000, telat8sd30: 0, telatDiatas30: 0 },
  top10Model: [
    { nama: 'iPhone 13 128GB', terjual: 3, laba: 1050000 },
    { nama: 'Samsung A54 5G', terjual: 2, laba: 600000 },
    { nama: 'Redmi Note 12', terjual: 2, laba: 400000 },
    { nama: 'Oppo Reno 8T', terjual: 2, laba: 500000 },
  ],
  bonusPalingSering: [],
  kasMasuk: 94200000, kasKeluar: 68450000, arusKasBersih: 25750000,
  perMetode: { Tunai: { masuk: 42100000, keluar: 0 }, Transfer: { masuk: 38600000, keluar: 0 }, QRIS: { masuk: 13500000, keluar: 0 } },
  nilaiStokAktif: 114800000, unitStokAktif: 38, unitLebih30Hari: 12, nilaiLebih30Hari: 32100000, servisModalTertahan: 0, servisUnitCount: 0,
  stokUmur: { sampai7: { unit: 8, nilai: 28500000 }, hari8sd30: { unit: 18, nilai: 54200000 }, hari31sd60: { unit: 12, nilai: 32100000 }, lebih60: { unit: 0, nilai: 0 } },
  piutang: 4200000, piutangTelat: 1200000, hutang: 0,
  debiturTerbesar: [{ id: 'TGH-2610-0009', nama: 'Siti Rahayu', sisa: 3000000, hariTelat: 0 }, { id: 'TGH-2610-0004', nama: 'Budi Santoso', sisa: 1200000, hariTelat: 3 }],
};

/** Contoh untuk mode demo (angka realistis berubah sesuai periode) */
export function laporanContoh(periodeApi: string = 'bulan-ini'): LaporanLayar {
  if (periodeApi === 'hari-ini' || periodeApi === 'Hari ini') {
    return {
      ...BASE_LAPORAN,
      periode: 'Hari ini (05 Okt 2026)', bulan: '2026-10', dari: '2026-10-05', sampai: '2026-10-05',
      pembandingLabel: 'Kemarin', jumlahHari: 1, omzet: 4250000, unitTerjual: 2, rataHariTerjual: 4.5, transaksiJual: 2,
      labaKotorHP: 550000, labaAksesoris: 70000, labaServis: 120000, biayaBonus: 35000, biayaGaransi: 0,
      biayaOperasional: 85000, labaBersih: 620000,
      tren12Bulan: [
        { bulan: '09:00', laba: 0.15 }, { bulan: '11:00', laba: 0.35 }, { bulan: '13:00', laba: 0.08 },
        { bulan: '15:00', laba: 0.42 }, { bulan: '17:00', laba: 0.22 }, { bulan: '19:00', laba: 0.58 }, { bulan: '21:00', laba: 0.12 },
      ],
      top10Model: [{ nama: 'iPhone 13 128GB', terjual: 1, laba: 350000 }, { nama: 'Redmi Note 12', terjual: 1, laba: 200000 }],
    };
  }

  if (periodeApi === '7-hari' || periodeApi === '7 hari') {
    return {
      ...BASE_LAPORAN,
      periode: '29 Sep - 05 Okt 2026', bulan: '2026-10', dari: '2026-09-29', sampai: '2026-10-05',
      pembandingLabel: '7 hari sebelumnya', jumlahHari: 7, omzet: 26800000, unitTerjual: 9, rataHariTerjual: 5.2, transaksiJual: 11,
      labaKotorHP: 3450000, labaAksesoris: 390000, labaServis: 650000, biayaBonus: 145000, biayaGaransi: 0,
      biayaOperasional: 620000, labaBersih: 3725000,
      tren12Bulan: [
        { bulan: 'Sel 29', laba: 0.45 }, { bulan: 'Rab 30', laba: 0.52 }, { bulan: 'Kam 01', laba: 0.38 },
        { bulan: 'Jum 02', laba: 0.65 }, { bulan: 'Sab 03', laba: 0.82 }, { bulan: 'Min 04', laba: 0.78 }, { bulan: 'Sen 05', laba: 0.62 },
      ],
    };
  }

  if (periodeApi === 'bulan-lalu' || periodeApi === 'Bulan lalu') {
    return {
      ...BASE_LAPORAN,
      periode: 'September 2026', bulan: '2026-09', dari: '2026-09-01', sampai: '2026-09-30',
      isLocked: true, bisaDikunci: false, bisaPdf: true,
      pembandingLabel: 'Agustus', jumlahHari: 30, omzet: 84100000, unitTerjual: 28, rataHariTerjual: 6.1, transaksiJual: 29,
      labaKotorHP: 10800000, labaAksesoris: 1150000, labaServis: 1620000, biayaBonus: 410000, biayaGaransi: 150000,
      biayaOperasional: 2200000, labaBersih: 10810000,
    };
  }

  return { ...BASE_LAPORAN };
}
