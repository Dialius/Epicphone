// Laporan.ts — M7 Laporan dan dashboard (PRD 05). Semua angka dihitung di server dari data yang
// dibaca sekali per permintaan; fungsi hitung bersifat murni (mudah diuji) dan dipakai layar, PDF, dan job.

import { SHEET, FOLDER } from './Config';
import { Db } from './Db';
import { GalatBisnis } from './Galat';
import { denganLock } from './Lock';
import { log } from './Log';
import { subfolder } from './Drive';
import { esc, htmlKePdf } from './Pdf';
import { namaLaporan } from './Penamaan';
import {
  angka, sekarang, tglIso, tglId, labelBulan, geserBulan, selisihHariIso, formatRupiah, isoValid, tambahHariIso,
} from './Utils';

type R = Record<string, unknown>;

export interface DataLaporan {
  hariIni: string; // yyyy-MM-dd
  penjualan: R[]; penjualanItem: R[]; servis: R[]; garansi: R[]; stok: R[]; aksesoris: R[];
  biaya: R[]; pembayaran: R[]; hutang: R[]; log: R[];
}

export interface LabaBulanan {
  bulan: string;
  jmlUnitTerjual: number; omzet: number; hpp: number;
  labaKotorHP: number; labaAksesoris: number; labaServis: number;
  biayaBonus: number; biayaGaransi: number; pembalikanRetur: number; kerugianRefund: number; kerugianRusak: number;
  biayaOperasional: number; labaBersih: number; marginPersen: number;
}

const str = (v: unknown) => String(v ?? '');

/** Tanggal pembatalan penjualan dari Log_Aktivitas (tidak ada kolomnya di Penjualan) */
function tanggalBatal(d: DataLaporan): Record<string, string> {
  const peta: Record<string, string> = {};
  for (const l of d.log) {
    if (l.Aksi === 'Batal' && l.Sheet === SHEET.PENJUALAN) peta[str(l.ID_Data)] = str(l.Tanggal);
  }
  return peta;
}

/** Laba satu penjualan per kelompok. Diskon dibagi proporsional ke item non-bonus. */
function labaPenjualan(p: R, items: R[]): { omzet: number; hpp: number; labaHP: number; labaAks: number; bonus: number; unit: number; perHp: Array<{ nama: string; qty: number; laba: number }> } {
  const barang = items.filter(i => i.Tipe !== 'Bonus');
  const nilai = barang.map(i => angka(i.Harga_Jual) * angka(i.Qty));
  const total = nilai.reduce((a, b) => a + b, 0);
  const diskon = Math.min(angka(p.Diskon), total);
  let sisaDiskon = diskon;
  let labaHP = 0, labaAks = 0, hpp = 0, unit = 0;
  const perHp: Array<{ nama: string; qty: number; laba: number }> = [];
  barang.forEach((i, idx) => {
    const bagian = idx === barang.length - 1 ? sisaDiskon : (total > 0 ? Math.round(diskon * nilai[idx] / total) : 0);
    sisaDiskon -= bagian;
    const modal = angka(i.HPP) * angka(i.Qty);
    const laba = nilai[idx] - bagian - modal;
    hpp += modal;
    if (i.Tipe === 'HP') { labaHP += laba; unit += angka(i.Qty); perHp.push({ nama: str(i.Nama_Barang), qty: angka(i.Qty), laba }); } else labaAks += laba;
  });
  const bonus = items.filter(i => i.Tipe === 'Bonus').reduce((s, i) => s + angka(i.HPP) * angka(i.Qty), 0);
  return { omzet: total - diskon, hpp, labaHP, labaAks, bonus, unit, perHp };
}

/** Laba untuk bulan penuh "YYYY-MM" */
export function hitungLabaBulanan(d: DataLaporan, bulan: string): LabaBulanan {
  return { bulan, ...hitungLabaRentang(d, `${bulan}-01`, `${bulan}-31`) };
}

/**
 * Laba untuk rentang tanggal (hari ini, 7 hari, bulan berjalan, bulan penuh). Aturan PRD 05:
 * penjualan dibatalkan setelah rentang berakhir tetap dihitung di rentang itu, dan pembaliknya dicatat di rentang pembatalan.
 */
export function hitungLabaRentang(d: DataLaporan, dari: string, sampai: string): Omit<LabaBulanan, 'bulan'> {
  const dalam = (iso: unknown) => { const t = str(iso); return t >= dari && t <= sampai; };
  const batal = tanggalBatal(d);
  const itemPer: Record<string, R[]> = {};
  d.penjualanItem.forEach(i => { (itemPer[str(i.ID_Penjualan)] = itemPer[str(i.ID_Penjualan)] || []).push(i); });

  let omzet = 0, hpp = 0, labaHP = 0, labaAks = 0, bonus = 0, unit = 0, pembalikan = 0;
  for (const p of d.penjualan) {
    const id = str(p.ID_Penjualan);
    const status = str(p.Status);
    if (status !== 'Aktif' && status !== 'Batal') continue;
    const tglB = status === 'Batal' ? (batal[id] || str(p.Tanggal)) : '';
    // Termasuk di rentang penjualan bila aktif, atau dibatalkan setelah rentang itu berakhir
    const termasuk = dalam(p.Tanggal) && (status === 'Aktif' || tglB > sampai);
    if (termasuk) {
      const l = labaPenjualan(p, itemPer[id] || []);
      omzet += l.omzet; hpp += l.hpp; labaHP += l.labaHP; labaAks += l.labaAks; bonus += l.bonus; unit += l.unit;
    }
    // Pembatalan lintas rentang: pembalik dicatat di rentang pembatalan
    if (status === 'Batal' && dalam(tglB) && str(p.Tanggal) < dari) {
      const l = labaPenjualan(p, itemPer[id] || []);
      pembalikan += l.labaHP + l.labaAks - l.bonus;
    }
  }

  let labaServis = 0, biayaGaransi = 0;
  for (const s of d.servis) {
    if (s.Status !== 'Selesai' && s.Status !== 'Diambil') continue;
    if (!dalam(s.Tgl_Selesai)) continue;
    const biaya = angka(s.Biaya_Part) + angka(s.Biaya_Jasa_Teknisi);
    if (str(s.ID_Klaim)) biayaGaransi += biaya;
    else if (s.Jenis === 'Pelanggan') labaServis += angka(s.Tarif_Pelanggan) - biaya;
  }

  let kerugianRefund = 0;
  for (const g of d.garansi) {
    if (!dalam(g.Tanggal)) continue;
    if (g.Jenis === 'Retur' || g.Jenis === 'Tukar unit') pembalikan += -angka(g.Dampak_Laba);
    else if (g.Jenis === 'Refund') kerugianRefund += angka(g.Nilai_Refund);
  }

  const kerugianRusak = d.stok
    .filter(u => u.Status === 'Rusak' && dalam(u.Tgl_Rusak))
    .reduce((s, u) => s + angka(u.HPP), 0);
  const biayaOperasional = d.biaya.filter(b => dalam(b.Tanggal)).reduce((s, b) => s + angka(b.Nominal), 0);

  const labaBersih = labaHP + labaAks + labaServis - bonus - biayaGaransi - pembalikan - kerugianRefund - kerugianRusak - biayaOperasional;
  const marginPersen = omzet > 0 ? Math.round(((labaHP + labaAks - bonus) / omzet) * 1000) / 10 : 0;
  return {
    jmlUnitTerjual: unit, omzet, hpp, labaKotorHP: labaHP, labaAksesoris: labaAks, labaServis,
    biayaBonus: bonus, biayaGaransi, pembalikanRetur: pembalikan, kerugianRefund, kerugianRusak,
    biayaOperasional, labaBersih, marginPersen,
  };
}

// ── Arus kas ──────────────────────────────────────────────────────────────────

export interface ArusKas {
  masuk: number; keluar: number; bersih: number;
  perMetode: Record<string, { masuk: number; keluar: number }>;
  rincianKeluar: { pembelianDanHutang: number; biayaOperasional: number; servis: number; refund: number };
}

export function hitungArusKas(d: DataLaporan, dari: string, sampai: string): ArusKas {
  const dalam = (iso: unknown) => { const t = str(iso); return t >= dari && t <= sampai; };
  const jenisTagihan: Record<string, string> = {};
  d.hutang.forEach(h => { jenisTagihan[str(h.ID_Tagihan)] = str(h.Jenis); });
  const metode: ArusKas['perMetode'] = {};
  const tambah = (m: string, arah: 'masuk' | 'keluar', n: number) => {
    metode[m] = metode[m] || { masuk: 0, keluar: 0 };
    metode[m][arah] += n;
  };
  let masuk = 0, keluar = 0, beliHutang = 0, ops = 0, servis = 0, refund = 0;

  for (const b of d.pembayaran) {
    if (!dalam(b.Tanggal)) continue;
    const n = angka(b.Jumlah);
    const idT = str(b.ID_Hutang_Piutang);
    const catatan = str(b.Catatan);
    let arah: 'masuk' | 'keluar' | null = null;
    if (idT) arah = jenisTagihan[idT] === 'Hutang supplier' ? 'keluar' : 'masuk';
    else if (/^Pembayaran awal JUAL-/.test(catatan)) arah = 'masuk';
    else if (/^Pembayaran awal BELI-/.test(catatan)) arah = 'keluar';
    if (!arah) continue;
    if (arah === 'masuk') masuk += n; else { keluar += n; beliHutang += n; }
    tambah(str(b.Metode) || 'Lainnya', arah, n);
  }
  for (const s of d.servis) {
    if ((s.Status !== 'Selesai' && s.Status !== 'Diambil') || !dalam(s.Tgl_Selesai)) continue;
    if (s.Jenis === 'Pelanggan' && angka(s.Tarif_Pelanggan) > 0) { masuk += angka(s.Tarif_Pelanggan); tambah('Lainnya', 'masuk', angka(s.Tarif_Pelanggan)); }
    const biaya = angka(s.Biaya_Part) + angka(s.Biaya_Jasa_Teknisi);
    keluar += biaya; servis += biaya; if (biaya) tambah('Lainnya', 'keluar', biaya);
  }
  for (const b of d.biaya) if (dalam(b.Tanggal)) { ops += angka(b.Nominal); keluar += angka(b.Nominal); tambah('Lainnya', 'keluar', angka(b.Nominal)); }
  for (const g of d.garansi) if (dalam(g.Tanggal) && angka(g.Nilai_Refund) > 0) { refund += angka(g.Nilai_Refund); keluar += angka(g.Nilai_Refund); tambah('Lainnya', 'keluar', angka(g.Nilai_Refund)); }

  return { masuk, keluar, bersih: masuk - keluar, perMetode: metode, rincianKeluar: { pembelianDanHutang: beliHutang, biayaOperasional: ops, servis, refund } };
}

// ── Stok, tagihan, penjualan ─────────────────────────────────────────────────

export interface RingkasStok {
  nilaiStok: number; jumlahUnit: number; nilaiAksesoris: number;
  umur: { sampai7: number; hari8sd30: number; hari31sd60: number; lebih60: number };
  umurNilai: { sampai7: number; hari8sd30: number; hari31sd60: number; lebih60: number };
  terlama: Array<{ id: string; nama: string; umurHari: number; hpp: number }>;
  servis: { jumlah: number; estimasi: number };
}

export function ringkasStok(d: DataLaporan): RingkasStok {
  const aktif = d.stok.filter(u => u.Status === 'Ready' || u.Status === 'Dipesan' || u.Status === 'Servis');
  const umur = (u: R) => Math.max(0, selisihHariIso(str(u.Tgl_Masuk), d.hariIni) || 0);
  const k = { sampai7: 0, hari8sd30: 0, hari31sd60: 0, lebih60: 0 };
  const nilai = { sampai7: 0, hari8sd30: 0, hari31sd60: 0, lebih60: 0 };
  aktif.forEach(u => {
    const x = umur(u);
    const g = x <= 7 ? 'sampai7' : x <= 30 ? 'hari8sd30' : x <= 60 ? 'hari31sd60' : 'lebih60';
    k[g]++; nilai[g] += angka(u.HPP);
  });
  const servis = d.stok.filter(u => u.Status === 'Servis');
  return {
    nilaiStok: aktif.reduce((s, u) => s + angka(u.HPP), 0),
    jumlahUnit: aktif.length,
    nilaiAksesoris: d.aksesoris.reduce((s, a) => s + angka(a.Stok) * angka(a.Harga_Beli_Rata2), 0),
    umur: k, umurNilai: nilai,
    terlama: [...aktif].sort((a, b) => umur(b) - umur(a)).slice(0, 10).map(u => ({ id: str(u.ID_Unit), nama: str(u.Nama_Barang), umurHari: umur(u), hpp: angka(u.HPP) })),
    servis: { jumlah: servis.length, estimasi: servis.reduce((s, u) => s + angka(u.Estimasi_Servis), 0) },
  };
}

export interface RingkasTagihan {
  piutang: number; hutang: number; piutangTelat: number;
  aging: { belumJatuhTempo: number; telat1sd7: number; telat8sd30: number; telatLebih30: number };
}

export function ringkasTagihan(d: DataLaporan): RingkasTagihan {
  const hasil: RingkasTagihan = { piutang: 0, hutang: 0, piutangTelat: 0, aging: { belumJatuhTempo: 0, telat1sd7: 0, telat8sd30: 0, telatLebih30: 0 } };
  for (const h of d.hutang) {
    if (h.Status === 'Lunas' || h.Status === 'Batal') continue;
    const sisa = angka(h.Sisa);
    if (sisa <= 0) continue;
    if (h.Jenis === 'Hutang supplier') { hasil.hutang += sisa; continue; }
    hasil.piutang += sisa;
    const telat = isoValid(str(h.Jatuh_Tempo)) ? selisihHariIso(str(h.Jatuh_Tempo), d.hariIni) : 0;
    if (telat <= 0) hasil.aging.belumJatuhTempo += sisa;
    else {
      hasil.piutangTelat += sisa;
      if (telat <= 7) hasil.aging.telat1sd7 += sisa; else if (telat <= 30) hasil.aging.telat8sd30 += sisa; else hasil.aging.telatLebih30 += sisa;
    }
  }
  return hasil;
}

export interface RingkasPenjualan {
  modelTerlaris: Array<{ nama: string; unit: number; laba: number }>;
  rataHariTerjual: number;
  perHariMinggu: number[]; // Senin..Minggu: jumlah unit
  bonusSering: Array<{ nama: string; kali: number }>;
}

export function ringkasPenjualan(d: DataLaporan, dari: string, sampai: string): RingkasPenjualan {
  const jual: Record<string, R> = {};
  d.penjualan.filter(p => p.Status === 'Aktif' && str(p.Tanggal) >= dari && str(p.Tanggal) <= sampai).forEach(p => { jual[str(p.ID_Penjualan)] = p; });
  const itemPer: Record<string, R[]> = {};
  d.penjualanItem.forEach(i => { (itemPer[str(i.ID_Penjualan)] = itemPer[str(i.ID_Penjualan)] || []).push(i); });
  const labaModel: Record<string, number> = {};
  Object.keys(jual).forEach(id => labaPenjualan(jual[id], itemPer[id] || []).perHp.forEach(x => { labaModel[x.nama] = (labaModel[x.nama] || 0) + x.laba; }));
  const model: Record<string, number> = {};
  const bonus: Record<string, number> = {};
  const perHari = [0, 0, 0, 0, 0, 0, 0];
  const unitMap: Record<string, R> = {};
  d.stok.forEach(u => { unitMap[str(u.ID_Unit)] = u; });
  const lama: number[] = [];
  for (const i of d.penjualanItem) {
    const p = jual[str(i.ID_Penjualan)];
    if (!p) continue;
    if (i.Tipe === 'HP') {
      model[str(i.Nama_Barang)] = (model[str(i.Nama_Barang)] || 0) + angka(i.Qty);
      const hari = new Date(`${str(p.Tanggal)}T00:00:00Z`).getUTCDay(); // 0 = Minggu
      perHari[(hari + 6) % 7] += angka(i.Qty);
      const u = unitMap[str(i.ID_Unit_atau_SKU)];
      if (u && isoValid(str(u.Tgl_Masuk))) lama.push(Math.max(0, selisihHariIso(str(u.Tgl_Masuk), str(p.Tanggal))));
    } else if (i.Tipe === 'Bonus') bonus[str(i.Nama_Barang)] = (bonus[str(i.Nama_Barang)] || 0) + 1;
  }
  const top = (o: Record<string, number>, n: number) => Object.keys(o).map(k => ({ k, v: o[k] })).sort((a, b) => b.v - a.v || a.k.localeCompare(b.k)).slice(0, n);
  return {
    modelTerlaris: top(model, 10).map(x => ({ nama: x.k, unit: x.v, laba: labaModel[x.k] || 0 })),
    rataHariTerjual: lama.length ? Math.round((lama.reduce((a, b) => a + b, 0) / lama.length) * 10) / 10 : 0,
    perHariMinggu: perHari,
    bonusSering: top(bonus, 5).map(x => ({ nama: x.k, kali: x.v })),
  };
}

// ── Pembacaan sheet dan fungsi publik ─────────────────────────────────────────

export function bacaDataLaporan(): DataLaporan {
  return {
    hariIni: tglIso(sekarang()),
    penjualan: Db.getAll(SHEET.PENJUALAN), penjualanItem: Db.getAll(SHEET.PENJUALAN_ITEM),
    servis: Db.getAll(SHEET.SERVIS), garansi: Db.getAll(SHEET.GARANSI_RETUR), stok: Db.getAll(SHEET.STOK_HP),
    aksesoris: Db.getAll(SHEET.STOK_AKSESORIS), biaya: Db.getAll(SHEET.BIAYA_OPERASIONAL),
    pembayaran: Db.getAll(SHEET.PEMBAYARAN), hutang: Db.getAll(SHEET.HUTANG_PIUTANG), log: Db.getAll(SHEET.LOG_AKTIVITAS),
  };
}

function wajibBulan(bulan: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(bulan))) throw new GalatBisnis('BULAN_TIDAK_VALID', 'Format bulan harus YYYY-MM, misalnya 2026-10.');
  return bulan;
}

function awalAkhir(bulan: string): { dari: string; sampai: string } {
  return { dari: `${bulan}-01`, sampai: `${bulan}-31` };
}

export interface LaporanBulanan {
  bulan: string; label: string; terkunci: boolean;
  laba: LabaBulanan; bulanLalu: LabaBulanan; selisihBulanLalu: number;
  arusKas: ArusKas; stok: RingkasStok; tagihan: RingkasTagihan; penjualan: RingkasPenjualan;
}

export function getLaporanBulanan(bulan: string): LaporanBulanan {
  wajibBulan(bulan);
  const d = bacaDataLaporan();
  const laba = hitungLabaBulanan(d, bulan);
  const lalu = hitungLabaBulanan(d, geserBulan(bulan, -1));
  const baris = (Db.getAll(SHEET.LABA_BULANAN) as R[]).find(r => str(r.Bulan) === labelBulan(bulan));
  const { dari, sampai } = awalAkhir(bulan);
  return {
    bulan, label: labelBulan(bulan), terkunci: !!baris && baris.Terkunci === 'Ya',
    laba, bulanLalu: lalu, selisihBulanLalu: laba.labaBersih - lalu.labaBersih,
    arusKas: hitungArusKas(d, dari, sampai), stok: ringkasStok(d), tagihan: ringkasTagihan(d), penjualan: ringkasPenjualan(d, dari, sampai),
  };
}

/** Tulis (atau perbarui) satu baris Laba_Bulanan; bulan terkunci tidak disentuh. */
export function simpanBarisLaba(bulan: string, d: DataLaporan = bacaDataLaporan()): { diperbarui: boolean; laba: LabaBulanan } {
  const laba = hitungLabaBulanan(d, bulan);
  const label = labelBulan(bulan);
  const lalu = hitungLabaBulanan(d, geserBulan(bulan, -1));
  const ada = (Db.getAll(SHEET.LABA_BULANAN) as R[]).find(r => str(r.Bulan) === label);
  if (ada && ada.Terkunci === 'Ya') return { diperbarui: false, laba };
  const baris = {
    Bulan: label, Jml_Unit_Terjual: laba.jmlUnitTerjual, Omzet: laba.omzet, HPP: laba.hpp, Laba_Kotor_HP: laba.labaKotorHP,
    Laba_Aksesoris: laba.labaAksesoris, Laba_Servis: laba.labaServis, Biaya_Bonus: laba.biayaBonus, Biaya_Garansi: laba.biayaGaransi,
    Pembalikan_Retur: laba.pembalikanRetur, Kerugian_Refund: laba.kerugianRefund, Kerugian_Rusak: laba.kerugianRusak,
    Biaya_Operasional: laba.biayaOperasional, Laba_Bersih: laba.labaBersih, Margin_Persen: laba.marginPersen,
    Selisih_Bulan_Lalu: laba.labaBersih - lalu.labaBersih, Terkunci: 'Tidak',
  };
  if (ada) Db.updateBy(SHEET.LABA_BULANAN, 'Bulan', label, baris); else Db.append(SHEET.LABA_BULANAN, baris);
  return { diperbarui: true, laba };
}

/** Kunci bulan yang sudah lewat: angkanya dibekukan di Laba_Bulanan (PRD 05 bagian 5). */
export function kunciBulan(bulan: string): { bulan: string; terkunci: true } {
  return denganLock(() => Db.transaksi(() => {
    wajibBulan(bulan);
    if (bulan >= tglIso(sekarang()).slice(0, 7)) throw new GalatBisnis('BULAN_BERJALAN', 'Bulan yang masih berjalan belum bisa dikunci.');
    simpanBarisLaba(bulan);
    Db.updateBy(SHEET.LABA_BULANAN, 'Bulan', labelBulan(bulan), { Terkunci: 'Ya' });
    log('Ubah', SHEET.LABA_BULANAN, bulan, `Bulan ${labelBulan(bulan)} dikunci`);
    return { bulan, terkunci: true as const };
  }));
}

export function bulanTerkunci(bulan: string): boolean {
  const baris = (Db.getAll(SHEET.LABA_BULANAN) as R[]).find(r => str(r.Bulan) === labelBulan(bulan));
  return !!baris && baris.Terkunci === 'Ya';
}

// ── PDF laporan bulanan ───────────────────────────────────────────────────────

export function renderLaporanHtml(l: LaporanBulanan, namaToko: string): string {
  // Pengubah HTML ke PDF milik Google hanya andal untuk tabel dan gaya sebaris, jadi seluruh tata letak memakai tabel.
  const NAVY = '#0F2A44', GARIS = '#CBD5E1', TIPIS = '#E2E8F0', LATAR = '#F1F5F9', ABU = '#64748B', HIJAU = '#15803D', MERAH = '#B91C1C';
  const x = l.laba;
  const sel = l.selisihBulanLalu;
  const sel_t = `${sel >= 0 ? 'Naik' : 'Turun'} ${esc(formatRupiah(Math.abs(sel)))} dari bulan lalu`;
  const td = 'padding:6px 8px;border-bottom:1px solid ' + TIPIS;
  const judul = (t: string) => `<div style="margin:16px 0 5px;padding-bottom:3px;border-bottom:1px solid ${GARIS};font-size:11px;font-weight:bold;letter-spacing:1px;color:${NAVY}">${esc(t.toUpperCase())}</div>`;
  const baris = (nama: string, n: number, opsi: { tebal?: boolean; tanda?: boolean } = {}) => {
    const warna = opsi.tanda ? (n < 0 ? MERAH : HIJAU) : '#0F172A';
    const teks = opsi.tanda && n > 0 ? '+' + formatRupiah(n) : formatRupiah(n);
    return `<tr${opsi.tebal ? ` style="background:${LATAR};font-weight:bold"` : ''}><td style="${td}${opsi.tebal ? `;border-top:2px solid ${NAVY}` : ''}">${esc(nama)}</td><td style="${td};text-align:right;color:${warna}${opsi.tebal ? `;border-top:2px solid ${NAVY}` : ''}">${esc(teks)}</td></tr>`;
  };
  const kpi = (label: string, nilai: string, ket: string, gelap = false) => `<td style="width:25%;padding:9px 10px;background:${gelap ? NAVY : LATAR};color:${gelap ? '#FFFFFF' : '#0F172A'};vertical-align:top"><span style="font-size:8px;letter-spacing:1px;color:${gelap ? '#CBD5E1' : ABU}">${esc(label.toUpperCase())}</span><br><b style="font-size:14px">${esc(nilai)}</b><br><span style="font-size:8px;color:${gelap ? '#CBD5E1' : ABU}">${esc(ket)}</span></td>`;
  const tabel = (isi: string) => `<table style="width:100%;border-collapse:collapse">${isi}</table>`;
  const kepala = (a: string, b: string) => `<tr style="background:${NAVY};color:#FFFFFF"><td style="padding:5px 8px;font-size:9px"><b>${esc(a)}</b></td><td style="padding:5px 8px;font-size:9px;text-align:right"><b>${esc(b)}</b></td></tr>`;
  const terlaris = l.penjualan.modelTerlaris.map((m, i) => `<tr><td style="${td}">${i + 1}. ${esc(m.nama)}</td><td style="${td};text-align:right">${m.unit} unit</td></tr>`).join('') || `<tr><td style="${td}">Belum ada penjualan HP</td><td style="${td}"></td></tr>`;

  return `<html><body style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#0F172A;margin:24px">
<table style="width:100%;border-collapse:collapse"><tr>
<td style="vertical-align:bottom"><div style="font-size:17px;font-weight:bold;color:${NAVY}">${esc(namaToko)}</div><div style="font-size:10px;color:${ABU}">Laporan keuangan bulanan</div></td>
<td style="vertical-align:bottom;text-align:right"><div style="font-size:14px;font-weight:bold;color:${NAVY}">Laporan laba ${esc(l.label)}</div><div style="font-size:9px;color:${l.terkunci ? MERAH : HIJAU}"><b>${l.terkunci ? 'PERIODE TERKUNCI' : 'PERIODE TERBUKA'}</b></div></td></tr></table>
<table style="width:100%;border-collapse:collapse;margin-top:6px"><tr><td style="height:2px;background:${NAVY};width:88%"></td><td style="height:2px;background:#16A34A"></td></tr></table>

<table style="width:100%;border-collapse:separate;border-spacing:6px;margin:8px -6px 0"><tr>
${kpi('Laba bersih', formatRupiah(x.labaBersih), sel_t, true)}
${kpi('Omzet', formatRupiah(x.omzet), 'Total penjualan')}
${kpi('Unit terjual', `${x.jmlUnitTerjual} unit`, 'Handphone')}
${kpi('Margin', `${x.marginPersen}%`, 'Laba dibanding omzet')}
</tr></table>

${judul('Rincian laba bersih')}
${tabel(`${kepala('Komponen', 'Nilai')}
${baris('Omzet', x.omzet)}${baris('Harga pokok penjualan (HPP)', -x.hpp, { tanda: true })}
${baris('Laba kotor penjualan HP', x.labaKotorHP, { tanda: true })}${baris('Laba penjualan aksesoris', x.labaAksesoris, { tanda: true })}
${baris('Laba servis unit pelanggan', x.labaServis, { tanda: true })}${baris('Biaya bonus (barang gratis)', -x.biayaBonus, { tanda: true })}${baris('Biaya klaim garansi', -x.biayaGaransi, { tanda: true })}
${baris('Pembalikan retur dan pembatalan', -x.pembalikanRetur, { tanda: true })}${baris('Kerugian refund sebagian', -x.kerugianRefund, { tanda: true })}
${baris('Kerugian barang rusak', -x.kerugianRusak, { tanda: true })}${baris('Biaya operasional toko', -x.biayaOperasional, { tanda: true })}
${baris('LABA BERSIH', x.labaBersih, { tebal: true })}`)}

${judul('Arus kas')}
${tabel(`${kepala('Uraian', 'Nilai')}${baris('Kas masuk', l.arusKas.masuk, { tanda: true })}${baris('Kas keluar', -l.arusKas.keluar, { tanda: true })}${baris('KAS BERSIH', l.arusKas.bersih, { tebal: true })}`)}

${judul('Persediaan, piutang, dan hutang')}
${tabel(`${kepala('Uraian', 'Nilai')}${baris(`Nilai stok HP (${l.stok.jumlahUnit} unit)`, l.stok.nilaiStok)}${baris('Nilai stok aksesoris', l.stok.nilaiAksesoris)}
${baris('Piutang pelanggan', l.tagihan.piutang)}${baris('Piutang telat', l.tagihan.piutangTelat)}${baris('Hutang supplier', l.tagihan.hutang)}`)}

${judul('Model terlaris')}
${tabel(`${kepala('Model', 'Terjual')}${terlaris}`)}

<div style="margin-top:18px;padding-top:6px;border-top:1px dashed ${GARIS};font-size:9px;color:${ABU}">Dibuat otomatis oleh sistem ${esc(namaToko)} pada ${esc(tglId(tglIso(sekarang())))}${l.terkunci ? '. Periode terkunci: angka tidak berubah lagi.' : '. Periode masih terbuka: angka dapat berubah bila ada transaksi baru.'}</div>
</body></html>`;
}

function namaToko(): string {
  const p = Db.findById(SHEET.PENGATURAN, 'NAMA_TOKO');
  return p ? str(p.Nilai) : 'Epic Phone';
}

/** Job tanggal 1: hitung bulan lalu, tulis Laba_Bulanan, buat PDF di 06_LAPORAN (PRD 05 bagian 5/6). */
export function jalankanLaporanBulanan(paksaBulan?: string): string {
  const hariIni = tglIso(sekarang());
  if (!paksaBulan && hariIni.slice(8, 10) !== '01') return 'Dilewati: bukan tanggal 1.';
  const bulan = paksaBulan || geserBulan(hariIni.slice(0, 7), -1);
  const hasil = denganLock(() => Db.transaksi(() => simpanBarisLaba(bulan)));
  if (!hasil.diperbarui) return `Laporan ${bulan} terkunci, tidak diubah.`;
  const lap = getLaporanBulanan(bulan);
  const blob = htmlKePdf(renderLaporanHtml(lap, namaToko()), namaLaporan('LABA', bulan));
  const folder = subfolder(FOLDER.LAPORAN);
  const lama = folder.getFilesByName(namaLaporan('LABA', bulan));
  while (lama.hasNext()) lama.next().setTrashed(true);
  const file = folder.createFile(blob);
  return `Laporan ${bulan} dibuat: ${file.getName()}`;
}


// ── Data untuk layar Laporan (PRD 05 bagian 4) ────────────────────────────────

const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const namaBulanPanjang = (bulan: string) => `${BULAN_PANJANG[Number(bulan.slice(5, 7)) - 1]} ${bulan.slice(0, 4)}`;

export interface LaporanLayar {
  periode: string;
  /** Bulan yang memuat akhir periode (untuk kunci dan PDF) */
  bulan: string;
  dari: string;
  sampai: string;
  isLocked: boolean;
  /** Bulan penuh yang sudah lewat: boleh dikunci */
  bisaDikunci: boolean;
  /** Bulan penuh: boleh dibuat PDF */
  bisaPdf: boolean;
  pembandingLabel: string;
  /** Jumlah hari dalam periode (bulan berjalan = hari yang sudah lewat) untuk rata-rata per hari */
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

interface Rentang { dari: string; sampai: string; label: string; bulan: string; penuh: boolean; pembanding: { dari: string; sampai: string; label: string } }

/** periode: "hari-ini" | "7-hari" | "bulan-ini" | "bulan-lalu" | "YYYY-MM" */
export function rentangPeriode(periode: string, hariIni: string): Rentang {
  const bulanIni = hariIni.slice(0, 7);
  const bulanPenuh = (b: string, pembandingLabel: string): Rentang => {
    const lalu = geserBulan(b, -1);
    return { dari: `${b}-01`, sampai: `${b}-31`, label: namaBulanPanjang(b), bulan: b, penuh: b < bulanIni, pembanding: { dari: `${lalu}-01`, sampai: `${lalu}-31`, label: pembandingLabel } };
  };
  if (periode === 'hari-ini') {
    const k = tambahHariIso(hariIni, -1);
    return { dari: hariIni, sampai: hariIni, label: tglId(hariIni), bulan: bulanIni, penuh: false, pembanding: { dari: k, sampai: k, label: 'kemarin' } };
  }
  if (periode === '7-hari') {
    const dari = tambahHariIso(hariIni, -6);
    return { dari, sampai: hariIni, label: `${tglId(dari)} - ${tglId(hariIni)}`, bulan: bulanIni, penuh: false, pembanding: { dari: tambahHariIso(hariIni, -13), sampai: tambahHariIso(hariIni, -7), label: '7 hari sebelumnya' } };
  }
  if (periode === 'bulan-ini') {
    // sampai hari ini; pembanding tetap bulan lalu penuh (seperti PRD)
    const r = bulanPenuh(bulanIni, 'bulan lalu');
    return { ...r, sampai: hariIni, penuh: false };
  }
  if (periode === 'bulan-lalu') return bulanPenuh(geserBulan(bulanIni, -1), 'bulan sebelumnya');
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(periode)) return bulanPenuh(periode, 'bulan sebelumnya');
  throw new GalatBisnis('PERIODE_TIDAK_VALID', 'Periode harus hari-ini, 7-hari, bulan-ini, bulan-lalu, atau YYYY-MM.');
}

const bulatSatu = (n: number) => Math.round(n * 10) / 10;

/** Fungsi murni: seluruh angka layar Laporan dari data yang sudah dibaca */
export function hitungLayar(d: DataLaporan, periode: string, bulanTerkunciSet: Set<string>): LaporanLayar {
  const r = rentangPeriode(periode, d.hariIni);
  const x = hitungLabaRentang(d, r.dari, r.sampai);
  const p = hitungLabaRentang(d, r.pembanding.dari, r.pembanding.sampai);
  const kas = hitungArusKas(d, r.dari, r.sampai);
  const stok = ringkasStok(d);
  const tagihan = ringkasTagihan(d);
  const jual = ringkasPenjualan(d, r.dari, r.sampai);

  const kontribusi = x.labaKotorHP + x.labaAksesoris + x.labaServis;
  const hp = kontribusi > 0 ? Math.round((x.labaKotorHP / kontribusi) * 100) : 0;
  const aks = kontribusi > 0 ? Math.round((x.labaAksesoris / kontribusi) * 100) : 0;
  const bulanIni = d.hariIni.slice(0, 7);
  const tren: LaporanLayar['tren12Bulan'] = [];
  for (let i = 11; i >= 0; i--) {
    const b = geserBulan(bulanIni, -i);
    tren.push({ bulan: `${labelBulan(b).slice(0, 3)} ${b.slice(2, 4)}`, laba: bulatSatu(hitungLabaBulanan(d, b).labaBersih / 1_000_000) });
  }
  const penjualanAktif = d.penjualan.filter(q => q.Status === 'Aktif' && str(q.Tanggal) >= r.dari && str(q.Tanggal) <= r.sampai);
  const bonus: Record<string, number> = {};
  const idAktif = new Set(penjualanAktif.map(q => str(q.ID_Penjualan)));
  d.penjualanItem.filter(i => i.Tipe === 'Bonus' && idAktif.has(str(i.ID_Penjualan))).forEach(i => { bonus[str(i.Nama_Barang)] = (bonus[str(i.Nama_Barang)] || 0) + angka(i.Qty); });
  const servisTertahan = d.stok.filter(u => u.Status === 'Servis');

  const debitur = d.hutang
    .filter(h => h.Jenis === 'Piutang pelanggan' && h.Status !== 'Lunas' && h.Status !== 'Batal' && angka(h.Sisa) > 0)
    .map(h => ({ id: str(h.ID_Tagihan), nama: str(h.Nama), sisa: angka(h.Sisa), hariTelat: isoValid(str(h.Jatuh_Tempo)) ? Math.max(0, selisihHariIso(str(h.Jatuh_Tempo), d.hariIni)) : 0 }))
    .sort((a, b) => b.sisa - a.sisa).slice(0, 5);

  const umur = stok.umur, nilai = stok.umurNilai;
  return {
    periode: r.label, bulan: r.bulan, dari: r.dari, sampai: r.sampai,
    isLocked: r.penuh && bulanTerkunciSet.has(r.bulan), bisaDikunci: r.penuh && !bulanTerkunciSet.has(r.bulan),
    bisaPdf: periode !== 'hari-ini' && periode !== '7-hari', pembandingLabel: r.pembanding.label,
    jumlahHari: periode === 'hari-ini' ? 1 : periode === '7-hari' ? 7 : (r.bulan === bulanIni && !r.penuh ? Number(d.hariIni.slice(8, 10)) : new Date(Date.UTC(Number(r.bulan.slice(0, 4)), Number(r.bulan.slice(5, 7)), 0)).getUTCDate()),
    omzet: x.omzet, unitTerjual: x.jmlUnitTerjual, rataHariTerjual: jual.rataHariTerjual, transaksiJual: penjualanAktif.length,
    labaKotorHP: x.labaKotorHP, labaAksesoris: x.labaAksesoris, labaServis: x.labaServis, biayaBonus: x.biayaBonus,
    biayaGaransi: x.biayaGaransi, pembalikanRetur: x.pembalikanRetur, kerugianRefund: x.kerugianRefund, kerugianRusak: x.kerugianRusak,
    biayaOperasional: x.biayaOperasional, labaBersih: x.labaBersih, labaBulanLalu: p.labaBersih,
    persenKenaikan: p.labaBersih !== 0 ? bulatSatu(((x.labaBersih - p.labaBersih) / Math.abs(p.labaBersih)) * 100) : 0,
    pembandingAda: p.labaBersih !== 0, marginKotor: x.marginPersen,
    komposisi: { hp, aksesoris: aks, servis: kontribusi > 0 ? Math.max(0, 100 - hp - aks) : 0 },
    tren12Bulan: tren,
    agingPiutang: { belumJatuhTempo: tagihan.aging.belumJatuhTempo, telat1sd7: tagihan.aging.telat1sd7, telat8sd30: tagihan.aging.telat8sd30, telatDiatas30: tagihan.aging.telatLebih30 },
    top10Model: jual.modelTerlaris.map(m => ({ nama: m.nama, terjual: m.unit, laba: m.laba })),
    bonusPalingSering: jual.bonusSering.map(b => ({ nama: b.nama, qty: b.kali })),
    kasMasuk: kas.masuk, kasKeluar: kas.keluar, arusKasBersih: kas.bersih, perMetode: kas.perMetode,
    nilaiStokAktif: stok.nilaiStok, unitStokAktif: stok.jumlahUnit, unitLebih30Hari: umur.hari31sd60 + umur.lebih60,
    nilaiLebih30Hari: nilai.hari31sd60 + nilai.lebih60,
    servisModalTertahan: servisTertahan.reduce((s, u) => s + angka(u.HPP), 0), servisUnitCount: servisTertahan.length,
    stokUmur: {
      sampai7: { unit: umur.sampai7, nilai: nilai.sampai7 }, hari8sd30: { unit: umur.hari8sd30, nilai: nilai.hari8sd30 },
      hari31sd60: { unit: umur.hari31sd60, nilai: nilai.hari31sd60 }, lebih60: { unit: umur.lebih60, nilai: nilai.lebih60 },
    },
    piutang: tagihan.piutang, piutangTelat: tagihan.piutangTelat, hutang: tagihan.hutang,
    debiturTerbesar: debitur,
  };
}

function setBulanTerkunci(): Set<string> {
  const hasil = new Set<string>();
  (Db.getAll(SHEET.LABA_BULANAN) as R[]).filter(r => r.Terkunci === 'Ya').forEach(r => {
    hasil.add(str(r.Bulan));
  });
  return hasil;
}

/** Data layar Laporan. Bulan terkunci dikenali dari label "Okt 2026" di Laba_Bulanan. */
export function getLaporanLayar(periode: string): LaporanLayar {
  const d = bacaDataLaporan();
  const label = setBulanTerkunci();
  const terkunci = new Set<string>();
  for (let i = 0; i < 36; i++) { const b = geserBulan(d.hariIni.slice(0, 7), -i); if (label.has(labelBulan(b))) terkunci.add(b); }
  return hitungLayar(d, periode, terkunci);
}

/** PDF laporan bulan penuh atau bulan berjalan, disimpan di 06_LAPORAN dan dikembalikan sebagai base64 untuk diunduh. */
export function buatLaporanPdf(bulan: string): { nama: string; urlLihat: string; base64: string } {
  wajibBulan(bulan);
  const lap = getLaporanBulanan(bulan);
  const nama = namaLaporan('LABA', bulan);
  const blob = htmlKePdf(renderLaporanHtml(lap, namaToko()), nama);
  const folder = subfolder(FOLDER.LAPORAN);
  const lama = folder.getFilesByName(nama);
  while (lama.hasNext()) lama.next().setTrashed(true);
  const file = folder.createFile(blob);
  return { nama, urlLihat: file.getUrl(), base64: Utilities.base64Encode(blob.getBytes()) };
}
