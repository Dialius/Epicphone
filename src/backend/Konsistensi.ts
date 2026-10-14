// Konsistensi.ts — Cek Konsistensi (PRD 05 bagian 7): membandingkan angka yang tersimpan dengan hitungan ulang
// dari data dasarnya. Selisih berarti ada data yang tidak masuk atau berubah di luar aplikasi.

import { SHEET, STATUS_UNIT } from './Config';
import { Db } from './Db';
import { angka, sekarang, tglIso, jamHm, selisihHariIso, formatRupiah } from './Utils';
import { statusAksesoris } from './StokService';

type R = Record<string, unknown>;
const str = (v: unknown) => String(v ?? '');

export interface Selisih {
  kode: string;
  sheet: string;
  id: string;
  pesan: string;
}

export interface DataKonsistensi {
  hariIni: string;
  jamSekarang: string;
  penjualan: R[]; penjualanItem: R[]; pembelian: R[]; stok: R[]; aksesoris: R[]; pembayaran: R[]; hutang: R[];
}

export function periksaKonsistensi(d: DataKonsistensi): Selisih[] {
  const s: Selisih[] = [];
  const tambah = (kode: string, sheet: string, id: string, pesan: string) => s.push({ kode, sheet, id, pesan });
  const itemPer: Record<string, R[]> = {};
  d.penjualanItem.forEach(i => { (itemPer[str(i.ID_Penjualan)] = itemPer[str(i.ID_Penjualan)] || []).push(i); });
  const penjualanAktif = new Set(d.penjualan.filter(p => p.Status === 'Aktif').map(p => str(p.ID_Penjualan)));

  // 1. Laba header penjualan = jumlah Laba_Item - diskon; total = subtotal - diskon - tukar tambah
  for (const p of d.penjualan) {
    if (p.Status !== 'Aktif') continue;
    const id = str(p.ID_Penjualan);
    const items = itemPer[id] || [];
    const labaItem = items.reduce((a, i) => a + angka(i.Laba_Item), 0);
    if (Math.abs(labaItem - angka(p.Diskon) - angka(p.Laba_Kotor)) > 1) {
      tambah('LABA_BEDA', SHEET.PENJUALAN, id, `Laba_Kotor ${formatRupiah(angka(p.Laba_Kotor))}, hitungan dari item ${formatRupiah(labaItem - angka(p.Diskon))}.`);
    }
    const subtotal = items.filter(i => i.Tipe !== 'Bonus').reduce((a, i) => a + angka(i.Harga_Jual) * angka(i.Qty), 0);
    if (Math.abs(subtotal - angka(p.Subtotal)) > 1) tambah('SUBTOTAL_BEDA', SHEET.PENJUALAN, id, `Subtotal ${formatRupiah(angka(p.Subtotal))}, jumlah item ${formatRupiah(subtotal)}.`);
    const total = Math.max(0, angka(p.Subtotal) - angka(p.Diskon) - angka(p.Nilai_Tukar_Tambah));
    if (Math.abs(total - angka(p.Total_Tagihan)) > 1) tambah('TOTAL_BEDA', SHEET.PENJUALAN, id, `Total_Tagihan ${formatRupiah(angka(p.Total_Tagihan))}, seharusnya ${formatRupiah(total)}.`);
    if (items.length === 0) tambah('ITEM_HILANG', SHEET.PENJUALAN, id, 'Penjualan aktif tanpa baris di Penjualan_Item.');
    if (Math.abs(angka(p.Total_Tagihan) - angka(p.Dibayar) - angka(p.Sisa_Tagihan)) > 1) {
      tambah('SISA_BEDA', SHEET.PENJUALAN, id, `Total - Dibayar tidak sama dengan Sisa_Tagihan.`);
    }
  }

  // 2. Nilai stok = jumlah HPP unit aktif; HPP = beli + biaya lain + biaya servis
  const aktif = d.stok.filter(u => u.Status === STATUS_UNIT.READY || u.Status === STATUS_UNIT.DIPESAN || u.Status === STATUS_UNIT.SERVIS);
  for (const u of aktif) {
    const hpp = angka(u.Harga_Beli) + angka(u.Biaya_Lain) + angka(u.Biaya_Servis);
    if (Math.abs(hpp - angka(u.HPP)) > 1) tambah('HPP_BEDA', SHEET.STOK_HP, str(u.ID_Unit), `HPP ${formatRupiah(angka(u.HPP))}, seharusnya ${formatRupiah(hpp)}.`);
    if (u.ID_Penjualan) tambah('UNIT_AKTIF_PUNYA_PENJUALAN', SHEET.STOK_HP, str(u.ID_Unit), `Unit ${str(u.Status)} masih terhubung ke ${str(u.ID_Penjualan)}.`);
  }
  for (const u of d.stok) {
    if (u.Status === STATUS_UNIT.TERJUAL && !penjualanAktif.has(str(u.ID_Penjualan))) {
      tambah('TERJUAL_TANPA_PENJUALAN', SHEET.STOK_HP, str(u.ID_Unit), `Unit Terjual tetapi penjualan ${str(u.ID_Penjualan) || '(kosong)'} tidak aktif.`);
    }
  }
  const seen: Record<string, string> = {};
  for (const u of aktif) {
    const imei = str(u.IMEI_1).trim();
    if (!imei) { tambah('IMEI_KOSONG', SHEET.STOK_HP, str(u.ID_Unit), 'Unit aktif tanpa IMEI.'); continue; }
    if (seen[imei]) tambah('IMEI_GANDA', SHEET.STOK_HP, str(u.ID_Unit), `IMEI ${imei} juga dipakai ${seen[imei]}.`);
    seen[imei] = str(u.ID_Unit);
  }

  // 3. Pembayaran per tagihan = Terbayar; Sisa = Total - Terbayar
  const bayarPer: Record<string, number> = {};
  d.pembayaran.forEach(b => { const k = str(b.ID_Hutang_Piutang); if (k) bayarPer[k] = (bayarPer[k] || 0) + angka(b.Jumlah); });
  for (const h of d.hutang) {
    if (h.Status === 'Batal') continue;
    const id = str(h.ID_Tagihan);
    if (Math.abs((bayarPer[id] || 0) - angka(h.Terbayar)) > 1) tambah('TERBAYAR_BEDA', SHEET.HUTANG_PIUTANG, id, `Terbayar ${formatRupiah(angka(h.Terbayar))}, jumlah Pembayaran ${formatRupiah(bayarPer[id] || 0)}.`);
    if (Math.abs(angka(h.Total) - angka(h.Terbayar) - angka(h.Sisa)) > 1) tambah('SISA_TAGIHAN_BEDA', SHEET.HUTANG_PIUTANG, id, 'Total - Terbayar tidak sama dengan Sisa.');
  }

  // 4. Dibayar di penjualan/pembelian = jumlah pembayaran terkait (awal + cicilan)
  const tagihanRef: Record<string, string> = {};
  d.hutang.forEach(h => { tagihanRef[str(h.ID_Referensi)] = str(h.ID_Tagihan); });
  const bayarDokumen = (id: string) => d.pembayaran.filter(b => str(b.Catatan).indexOf(`Pembayaran awal ${id}`) === 0 || (tagihanRef[id] && str(b.ID_Hutang_Piutang) === tagihanRef[id] && str(b.Catatan).indexOf('Pembayaran awal') !== 0))
    .reduce((a, b) => a + angka(b.Jumlah), 0);
  for (const p of d.penjualan) {
    if (p.Status !== 'Aktif') continue;
    const id = str(p.ID_Penjualan);
    if (Math.abs(bayarDokumen(id) - angka(p.Dibayar)) > 1) tambah('DIBAYAR_BEDA', SHEET.PENJUALAN, id, `Dibayar ${formatRupiah(angka(p.Dibayar))}, jumlah Pembayaran ${formatRupiah(bayarDokumen(id))}.`);
  }
  for (const p of d.pembelian) {
    if (p.Status !== 'Aktif') continue;
    const id = str(p.ID_Pembelian);
    if (Math.abs(bayarDokumen(id) - angka(p.Dibayar)) > 1) tambah('DIBAYAR_BEDA', SHEET.PEMBELIAN, id, `Dibayar ${formatRupiah(angka(p.Dibayar))}, jumlah Pembayaran ${formatRupiah(bayarDokumen(id))}.`);
  }

  // 5. Aksesoris: stok tidak negatif dan status sesuai
  for (const a of d.aksesoris) {
    if (angka(a.Stok) < 0) tambah('STOK_NEGATIF', SHEET.STOK_AKSESORIS, str(a.SKU), `Stok ${angka(a.Stok)} (negatif).`);
    if (str(a.Status) !== statusAksesoris(angka(a.Stok), angka(a.Stok_Minimum))) tambah('STATUS_AKSESORIS_BEDA', SHEET.STOK_AKSESORIS, str(a.SKU), `Status ${str(a.Status)} tidak cocok dengan stok ${angka(a.Stok)}.`);
  }

  // 6. Draf penjualan yang macet
  for (const p of d.penjualan) {
    if (p.Status !== 'Draft' && p.Status !== 'Gagal') continue;
    const umurHari = selisihHariIso(str(p.Tanggal), d.hariIni);
    if (p.Status === 'Gagal' || umurHari > 0 || Number(d.jamSekarang.slice(0, 2)) * 60 + Number(d.jamSekarang.slice(3, 5)) - (Number(str(p.Jam).slice(0, 2)) * 60 + Number(str(p.Jam).slice(3, 5))) > 60) {
      tambah('PENJUALAN_MACET', SHEET.PENJUALAN, str(p.ID_Penjualan), `Penjualan berstatus ${str(p.Status)}: tidak selesai tersimpan.`);
    }
  }
  return s;
}

export interface HasilKonsistensi {
  ok: boolean;
  selisih: Selisih[];
  diperiksa: { penjualan: number; pembelian: number; unitAktif: number; tagihan: number; aksesoris: number };
  nilaiStok: number;
  waktu: string;
}

export function jalankanCekKonsistensi(): HasilKonsistensi {
  const now = sekarang();
  const d: DataKonsistensi = {
    hariIni: tglIso(now), jamSekarang: jamHm(now),
    penjualan: Db.getAll(SHEET.PENJUALAN), penjualanItem: Db.getAll(SHEET.PENJUALAN_ITEM), pembelian: Db.getAll(SHEET.PEMBELIAN),
    stok: Db.getAll(SHEET.STOK_HP), aksesoris: Db.getAll(SHEET.STOK_AKSESORIS), pembayaran: Db.getAll(SHEET.PEMBAYARAN), hutang: Db.getAll(SHEET.HUTANG_PIUTANG),
  };
  const selisih = periksaKonsistensi(d);
  const aktif = d.stok.filter(u => u.Status === STATUS_UNIT.READY || u.Status === STATUS_UNIT.DIPESAN || u.Status === STATUS_UNIT.SERVIS);
  return {
    ok: selisih.length === 0, selisih,
    diperiksa: { penjualan: d.penjualan.length, pembelian: d.pembelian.length, unitAktif: aktif.length, tagihan: d.hutang.length, aksesoris: d.aksesoris.length },
    nilaiStok: aktif.reduce((a, u) => a + angka(u.HPP), 0), waktu: `${tglIso(now)} ${jamHm(now)}`,
  };
}
