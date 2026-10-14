// PenjualanService.ts — Penjualan (satu transaksi utuh), tukar tambah, pembatalan.
// Urutan mengikuti PRD-03 bagian 5: validasi ulang di server, HPP dibekukan,
// header Draft -> detail -> ubah stok -> Aktif. Bila ada galat, semua tulisan dikembalikan
// (Db.transaksi); bila eksekusi mati di tengah, Draft dibersihkan jobBersihkan.

import { SHEET, PREFIX_ID, STATUS_UNIT, GARANSI_DEFAULT } from './Config';
import { Db } from './Db';
import { GalatBisnis } from './Galat';
import { denganLock } from './Lock';
import { buatId } from './Id';
import { log } from './Log';
import {
  tglIso, jamHm, tglId, sekarang, angka, sanitasi, validasiIMEI, normalisasiWA,
  isoValid, tambahHariIso, tambahBulanIso, selisihHariIso, formatRupiah } from './Utils';
import { cekImeiAktif, ubahStokAksesoris, UnitRow, AksesorisRow } from './StokService';
import { cariIdProduk } from './MasterService';
import { bacaPengaturan, angkaPengaturan } from './Pengaturan';

export interface ItemJualInput {
  tipe: 'HP' | 'Aksesoris';
  idUnit?: string;   // HP
  sku?: string;      // Aksesoris
  qty?: number;      // Aksesoris (HP selalu 1)
  harga: number;     // harga jual per unit
}

export interface BonusInput {
  nama: string;
  qty?: number;
  sku?: string;      // bonus dari stok aksesoris
  hpp?: number;      // bonus non-stok: modal yang diinput
}

export type KondisiTT = 'Baik' | 'Cacat';

export interface TukarTambahInput {
  ada: boolean;
  /** Nama lengkap unit (merek + model + varian + warna) */
  model?: string;
  imei?: string;
  /** Detail unit yang sama dengan Barang Masuk (semua opsional; bawaan lama dipertahankan) */
  imei2?: string;
  kondisiUnit?: 'Baru' | 'Bekas';
  grade?: string;
  kelengkapan?: string;
  bateraiPersen?: number;
  bebasKunciAkun?: string;
  hargaJualTarget?: number;
  nilai?: number;
  /** Checklist cepat PRD 02 bagian 5.5 */
  kondisi?: { layar?: KondisiTT; baterai?: KondisiTT; kamera?: KondisiTT; body?: KondisiTT; faceJari?: KondisiTT };
  catatan?: string;
}

export interface PenjualanInput {
  idPelanggan?: string;
  namaPelanggan: string;
  noWa?: string;
  items: ItemJualInput[];
  bonus?: BonusInput[];
  diskon?: number;
  tukarTambah?: TukarTambahInput;
  metodeBayar: string;
  dibayar: number;
  jatuhTempo?: string; // yyyy-mm-dd, wajib bila ada sisa
  catatan?: string;
}

export interface HasilPenjualan {
  idPenjualan: string;
  tanggal: string;
  jam: string;
  subtotal: number;
  diskon: number;
  nilaiTukarTambah: number;
  total: number;
  dibayar: number;
  sisa: number;
  idTagihan?: string;
  idUnitTukarTambah?: string;
  modal: number;
  biayaBonus: number;
  labaKotor: number;
  garansiSampai: string;
}

const METODE_BOLEH = ['Tunai', 'Transfer', 'QRIS', 'Cicilan', 'Tempo'];

const adaUmum = (nama: string) => !nama.trim() || /^pelanggan umum$/i.test(nama.trim());

/** Lama garansi mengikuti Pengaturan (bukan angka tetap di kode) */
function garansiUnit(u: UnitRow, hariIni: string, p: Record<string, string>): { sampai: string; label: string } {
  if (u.Kondisi === 'Baru') {
    const bulan = angkaPengaturan(p, 'GARANSI_BARU_BULAN', GARANSI_DEFAULT.BARU_BULAN);
    return { sampai: tambahBulanIso(hariIni, bulan), label: `${bulan} bulan` };
  }
  const hari = angkaPengaturan(p, 'GARANSI_BEKAS_HARI', GARANSI_DEFAULT.BEKAS_HARI);
  return { sampai: tambahHariIso(hariIni, hari), label: `${hari} hari` };
}

const kondisiSah = (v: unknown): string => (v === 'Baik' || v === 'Cacat' ? v : '');

export function simpanPenjualan(data: PenjualanInput): HasilPenjualan {
  return denganLock(() => Db.transaksi(() => {
    const now = sekarang();
    const tgl = tglIso(now);
    const jam = jamHm(now);

    // ── 1. Validasi ulang di server ──────────────────────────────────────────
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      throw new GalatBisnis('DATA_KOSONG', 'Pilih minimal satu barang yang dijual.');
    }
    if (!METODE_BOLEH.includes(data.metodeBayar)) {
      throw new GalatBisnis('METODE_TIDAK_VALID', `Metode bayar "${data.metodeBayar}" tidak dikenal.`);
    }

    const pengaturan = bacaPengaturan();
    const semuaUnit = Db.getAll(SHEET.STOK_HP) as unknown as UnitRow[];
    const semuaAks = Db.getAll(SHEET.STOK_AKSESORIS) as unknown as AksesorisRow[];

    interface BarisItem {
      tipe: 'HP' | 'Aksesoris' | 'Bonus';
      ref: string; nama: string; imei: string; qty: number;
      harga: number; hpp: number; garansi: string; alasan: string;
      unit?: UnitRow;
    }
    const baris: BarisItem[] = [];
    const unitDipakai = new Set<string>();
    const qtyAksDipakai: Record<string, number> = {};
    let garansiUtama = '';

    for (const it of data.items) {
      const harga = Math.round(angka(it.harga));
      if (harga < 0) throw new GalatBisnis('HARGA_TIDAK_VALID', 'Harga jual tidak boleh negatif.');
      if (it.tipe === 'HP') {
        const u = semuaUnit.find(x => x.ID_Unit === it.idUnit);
        if (!u) throw new GalatBisnis('UNIT_TIDAK_ADA', `Unit ${it.idUnit ?? ''} tidak ditemukan.`);
        if (u.Status !== STATUS_UNIT.READY && u.Status !== STATUS_UNIT.DIPESAN) {
          throw new GalatBisnis('UNIT_TIDAK_TERSEDIA', `${u.Nama_Barang} (${u.ID_Unit}) berstatus ${u.Status}, tidak bisa dijual.`);
        }
        if (unitDipakai.has(u.ID_Unit)) throw new GalatBisnis('UNIT_GANDA', `Unit ${u.ID_Unit} dipilih dua kali.`);
        unitDipakai.add(u.ID_Unit);
        const g = garansiUnit(u, tgl, pengaturan);
        if (!garansiUtama) garansiUtama = `${tglId(g.sampai)} (${g.label})`;
        baris.push({
          tipe: 'HP', ref: u.ID_Unit, nama: u.Nama_Barang, imei: String(u.IMEI_1), qty: 1,
          harga, hpp: Math.round(angka(u.HPP)), garansi: g.sampai, alasan: '', unit: u,
        });
      } else if (it.tipe === 'Aksesoris') {
        const a = semuaAks.find(x => x.SKU === it.sku);
        if (!a) throw new GalatBisnis('AKSESORIS_TIDAK_ADA', `Aksesoris ${it.sku ?? ''} tidak ditemukan.`);
        const qty = Math.round(angka(it.qty));
        if (qty < 1) throw new GalatBisnis('QTY_TIDAK_VALID', 'Jumlah aksesoris minimal 1.');
        qtyAksDipakai[a.SKU] = (qtyAksDipakai[a.SKU] || 0) + qty;
        baris.push({
          tipe: 'Aksesoris', ref: a.SKU, nama: a.Nama_Barang, imei: '', qty,
          harga, hpp: Math.round(angka(a.Harga_Beli_Rata2)),
          garansi: tambahHariIso(tgl, angkaPengaturan(pengaturan, 'GARANSI_AKSESORIS_HARI', GARANSI_DEFAULT.AKSESORIS_HARI)), alasan: '',
        });
      } else {
        throw new GalatBisnis('TIPE_TIDAK_DIKENAL', 'Jenis barang tidak dikenal.');
      }
    }

    for (const b of data.bonus || []) {
      const qty = Math.max(1, Math.round(angka(b.qty) || 1));
      if (b.sku) {
        const a = semuaAks.find(x => x.SKU === b.sku);
        if (!a) throw new GalatBisnis('AKSESORIS_TIDAK_ADA', `Aksesoris bonus ${b.sku} tidak ditemukan.`);
        qtyAksDipakai[a.SKU] = (qtyAksDipakai[a.SKU] || 0) + qty;
        baris.push({
          tipe: 'Bonus', ref: a.SKU, nama: a.Nama_Barang, imei: '', qty, harga: 0,
          hpp: Math.round(angka(a.Harga_Beli_Rata2)), garansi: '', alasan: 'Bonus penjualan',
        });
      } else {
        if (!String(b.nama || '').trim()) throw new GalatBisnis('NAMA_KOSONG', 'Nama bonus wajib diisi.');
        const hpp = Math.round(angka(b.hpp));
        if (hpp < 0) throw new GalatBisnis('HARGA_TIDAK_VALID', 'Modal bonus tidak boleh negatif.');
        baris.push({
          tipe: 'Bonus', ref: '', nama: sanitasi(b.nama), imei: '', qty, harga: 0,
          hpp, garansi: '', alasan: 'Bonus penjualan',
        });
      }
    }

    // Stok aksesoris (jual + bonus) harus cukup
    for (const sku of Object.keys(qtyAksDipakai)) {
      const a = semuaAks.find(x => x.SKU === sku)!;
      if (angka(a.Stok) < qtyAksDipakai[sku]) {
        throw new GalatBisnis('STOK_KURANG', `Stok ${a.Nama_Barang} tidak cukup (sisa ${angka(a.Stok)}, diminta ${qtyAksDipakai[sku]}).`);
      }
    }

    const subtotal = baris.filter(b => b.tipe !== 'Bonus').reduce((s, b) => s + b.harga * b.qty, 0);
    const diskon = Math.max(0, Math.round(angka(data.diskon)));
    if (diskon > subtotal) throw new GalatBisnis('DISKON_BERLEBIH', 'Diskon melebihi subtotal.');

    const tt = data.tukarTambah && data.tukarTambah.ada ? data.tukarTambah : null;
    const nilaiTT = tt ? Math.max(0, Math.round(angka(tt.nilai))) : 0;
    if (tt) {
      if (!String(tt.model || '').trim()) throw new GalatBisnis('TT_MODEL_WAJIB', 'Isi model HP tukar tambah.');
      const imeiTT = String(tt.imei || '').trim();
      if (!validasiIMEI(imeiTT)) throw new GalatBisnis('IMEI_TIDAK_VALID', 'IMEI HP tukar tambah harus 15 angka.');
      const cek = cekImeiAktif(imeiTT, semuaUnit);
      if (cek.ada) throw new GalatBisnis('IMEI_GANDA', `IMEI tukar tambah sudah ada di stok (${cek.idUnit}, status ${cek.status}).`);
      if (baris.some(b => b.imei === imeiTT)) throw new GalatBisnis('IMEI_GANDA', 'IMEI tukar tambah sama dengan unit yang dijual.');
      const imei2TT = String(tt.imei2 || '').trim();
      if (imei2TT) {
        if (!validasiIMEI(imei2TT)) throw new GalatBisnis('IMEI_TIDAK_VALID', 'IMEI 2 HP tukar tambah harus 15 angka.');
        if (imei2TT === imeiTT) throw new GalatBisnis('IMEI_GANDA', 'IMEI 2 sama dengan IMEI 1.');
        if (cekImeiAktif(imei2TT, semuaUnit).ada || baris.some(b => b.imei === imei2TT)) throw new GalatBisnis('IMEI_GANDA', `IMEI 2 ${imei2TT} sudah ada di stok.`);
      }
      if (tt.bateraiPersen !== undefined && tt.bateraiPersen !== null && String(tt.bateraiPersen) !== '') {
        const b = angka(tt.bateraiPersen);
        if (b < 0 || b > 100) throw new GalatBisnis('BATERAI_TIDAK_VALID', 'Kesehatan baterai HP tukar tambah harus 0 sampai 100 persen.');
      }
    }

    const total = Math.max(0, subtotal - diskon - nilaiTT);
    const dibayar = Math.min(total, Math.max(0, Math.round(angka(data.dibayar))));
    const sisa = total - dibayar;

    const namaPelanggan = adaUmum(data.namaPelanggan || '') ? 'Pelanggan Umum' : sanitasi(data.namaPelanggan.trim());
    const wa = normalisasiWA(data.noWa || '');
    const waDigit = wa.replace(/\D/g, '');
    if (sisa > 0) {
      if (namaPelanggan === 'Pelanggan Umum') {
        throw new GalatBisnis('TEMPO_BUTUH_PELANGGAN', 'Piutang wajib atas nama pelanggan.');
      }
      if (waDigit.length < 10) throw new GalatBisnis('TEMPO_BUTUH_WA', 'Piutang wajib punya nomor WhatsApp agar bisa ditagih.');
      if (!isoValid(data.jatuhTempo)) throw new GalatBisnis('TEMPO_BUTUH_TANGGAL', 'Isi tanggal jatuh tempo.');
      if (selisihHariIso(tgl, String(data.jatuhTempo)) < 0) {
        throw new GalatBisnis('TEMPO_TANGGAL_LALU', 'Tanggal jatuh tempo tidak boleh sebelum hari ini.');
      }
    }

    // Pelanggan: pakai kontak yang sudah ada (cocok nomor WA) atau siapkan ID baru
    let idKontak = data.idPelanggan || '';
    let kontakBaru = false;
    let kontakAda: Record<string, unknown> | undefined;
    if (namaPelanggan !== 'Pelanggan Umum' && waDigit.length >= 10) {
      kontakAda = (Db.getAll(SHEET.KONTAK) as Array<Record<string, unknown>>)
        .find(k => normalisasiWA(String(k.No_WA ?? '')).replace(/\D/g, '') === waDigit);
      if (kontakAda) idKontak = String(kontakAda.ID_Kontak);
      else { idKontak = buatId(PREFIX_ID.KONTAK); kontakBaru = true; }
    } else if (namaPelanggan !== 'Pelanggan Umum') {
      // Pelanggan bernama tanpa WhatsApp tetap dicatat di Kontak. Dipakai ulang hanya bila nama itu tepat satu (tidak ambigu).
      const norm = (t: unknown) => String(t ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
      const sama = (Db.getAll(SHEET.KONTAK) as Array<Record<string, unknown>>).filter(k => norm(k.Nama) === norm(namaPelanggan));
      if (sama.length === 1) { kontakAda = sama[0]; idKontak = String(sama[0].ID_Kontak); }
      else if (sama.length === 0) { idKontak = buatId(PREFIX_ID.KONTAK); kontakBaru = true; }
    }

    // ── 2. HPP dibekukan, laba dihitung ──────────────────────────────────────
    const modal = baris.filter(b => b.tipe !== 'Bonus').reduce((s, b) => s + b.hpp * b.qty, 0);
    const biayaBonus = baris.filter(b => b.tipe === 'Bonus').reduce((s, b) => s + b.hpp * b.qty, 0);
    // Pendapatan = subtotal - diskon. Nilai tukar tambah adalah pembayaran dengan barang:
    // unit TT masuk stok sebesar nilainya, labanya dihitung saat unit itu dijual.
    const labaKotor = subtotal - diskon - modal - biayaBonus;

    // ── 3. Header Draft ──────────────────────────────────────────────────────
    const idJual = buatId(PREFIX_ID.PENJUALAN);
    const statusBayar = sisa === 0 ? 'Lunas' : dibayar > 0 ? 'Sebagian' : 'Belum';
    Db.append(SHEET.PENJUALAN, {
      ID_Penjualan: idJual, Tanggal: tgl, Jam: jam,
      ID_Pelanggan: idKontak, Nama_Pelanggan: namaPelanggan,
      Subtotal: subtotal, Diskon: diskon, Nilai_Tukar_Tambah: nilaiTT, Total_Tagihan: total,
      Biaya_Bonus: biayaBonus, Metode_Bayar: data.metodeBayar, Dibayar: dibayar, Sisa_Tagihan: sisa,
      Status_Bayar: statusBayar, Laba_Kotor: labaKotor, Link_Nota_PDF: '',
      Status: 'Draft', Catatan: sanitasi(data.catatan || ''), Dibuat_Oleh: 'Owner',
    });

    // ── 4. Detail ────────────────────────────────────────────────────────────
    baris.forEach((b, i) => {
      Db.append(SHEET.PENJUALAN_ITEM, {
        ID_Item: `${idJual}-${i + 1}`, ID_Penjualan: idJual, Tipe: b.tipe, ID_Unit_atau_SKU: b.ref,
        Nama_Barang: b.nama, IMEI: b.imei, Qty: b.qty, Harga_Jual: b.harga, HPP: b.hpp,
        Laba_Item: (b.harga - b.hpp) * b.qty, Garansi_Hingga: b.garansi, Alasan_Bonus: b.alasan,
      });
    });

    let idUnitTT: string | undefined;
    if (tt) {
      idUnitTT = buatId(PREFIX_ID.UNIT);
      const imeiTT = String(tt.imei).trim();
      const kondisiTT = tt.kondisiUnit === 'Baru' ? 'Baru' : 'Bekas';
      const hargaJualTT = Math.max(0, Math.round(angka(tt.hargaJualTarget))) || Math.round(nilaiTT * 1.15);
      const bateraiTT = kondisiTT === 'Bekas' && tt.bateraiPersen !== undefined && tt.bateraiPersen !== null && String(tt.bateraiPersen) !== '' ? Math.round(angka(tt.bateraiPersen)) : '';
      Db.append(SHEET.STOK_HP, {
        ID_Unit: idUnitTT, Tgl_Masuk: tgl, Jam_Masuk: jam, IMEI_1: imeiTT, IMEI_2: tt.imei2 ? String(tt.imei2).trim() : '', ID_Produk: cariIdProduk(String(tt.model), 'HP'),
        Nama_Barang: sanitasi(String(tt.model).trim()), Kondisi: kondisiTT, Grade: kondisiTT === 'Bekas' ? sanitasi(tt.grade || '') : '', Kelengkapan: sanitasi(tt.kelengkapan || '') || 'Unit saja',
        Baterai_Persen: bateraiTT, Bebas_Kunci_Akun: sanitasi(tt.bebasKunciAkun || '') || 'Belum dicek', Sumber: 'Tukar Tambah', ID_Sumber: idJual,
        Harga_Beli: nilaiTT, Biaya_Lain: 0, Biaya_Servis: 0, HPP: nilaiTT, Estimasi_Servis: 0,
        Harga_Jual_Target: hargaJualTT, Status: STATUS_UNIT.READY, Umur_Stok_Hari: 0,
        Tgl_Keluar: '', ID_Penjualan: '', Link_Foto: '', Catatan: sanitasi(tt.catatan || '') ? `Tukar tambah ${idJual}. ${sanitasi(tt.catatan || '')}` : `Tukar tambah ${idJual}`, Dibuat_Oleh: 'Owner',
      });
      Db.append(SHEET.TUKAR_TAMBAH, {
        ID_TT: buatId(PREFIX_ID.TUKAR_TAMBAH), Tanggal: tgl, ID_Penjualan: idJual,
        ID_Pelanggan: idKontak, ID_Unit_Masuk: idUnitTT,
        Nama_Barang: sanitasi(String(tt.model).trim()), IMEI: imeiTT,
        Kondisi_Layar: kondisiSah(tt.kondisi?.layar), Kondisi_Baterai: kondisiSah(tt.kondisi?.baterai), Kondisi_Kamera: kondisiSah(tt.kondisi?.kamera),
        Kondisi_Body: kondisiSah(tt.kondisi?.body), Kondisi_FaceJari: kondisiSah(tt.kondisi?.faceJari),
        Nilai_Taksir: nilaiTT, Catatan: sanitasi(tt.catatan || ''),
      });
    }

    let idTagihan: string | undefined;
    if (sisa > 0) {
      idTagihan = buatId(PREFIX_ID.TAGIHAN);
      Db.append(SHEET.HUTANG_PIUTANG, {
        ID_Tagihan: idTagihan, Jenis: 'Piutang pelanggan', ID_Referensi: idJual,
        ID_Kontak: idKontak, Nama: namaPelanggan, Total: total, Terbayar: dibayar, Sisa: sisa,
        Jatuh_Tempo: String(data.jatuhTempo), Hari_Telat: 0, Status: dibayar > 0 ? 'Sebagian' : 'Belum',
      });
    }
    if (dibayar > 0) {
      Db.append(SHEET.PEMBAYARAN, {
        ID_Bayar: buatId(PREFIX_ID.PEMBAYARAN), Tanggal: tgl, Jam: jam, ID_Hutang_Piutang: idTagihan || '',
        Nama: namaPelanggan, Jumlah: dibayar, Metode: data.metodeBayar, Catatan: `Pembayaran awal ${idJual}`, Link_Bukti: '',
      });
    }

    // ── 5. Ubah stok ─────────────────────────────────────────────────────────
    for (const b of baris) {
      if (b.tipe === 'HP') {
        Db.updateById(SHEET.STOK_HP, b.ref, { Status: STATUS_UNIT.TERJUAL, Tgl_Keluar: tgl, ID_Penjualan: idJual });
      }
    }
    for (const sku of Object.keys(qtyAksDipakai)) ubahStokAksesoris(sku, -qtyAksDipakai[sku]);

    // Pelanggan: tambah / naikkan jumlah transaksi
    if (kontakAda) {
      Db.updateById(SHEET.KONTAK, idKontak, { Total_Transaksi: angka(kontakAda.Total_Transaksi) + 1 });
    } else if (kontakBaru) {
      Db.append(SHEET.KONTAK, {
        ID_Kontak: idKontak, Nama: namaPelanggan, Tipe: 'Pelanggan', No_WA: waDigit,
        Alamat: '', Catatan: '', Total_Transaksi: 1,
      });
    }

    // ── 6. Aktifkan & catat ──────────────────────────────────────────────────
    Db.updateById(SHEET.PENJUALAN, idJual, { Status: 'Aktif' });
    log('Tambah', SHEET.PENJUALAN, idJual, `Penjualan total ${formatRupiah(total)}, bayar ${formatRupiah(dibayar)}, sisa ${formatRupiah(sisa)}`);

    return {
      idPenjualan: idJual, tanggal: tgl, jam, subtotal, diskon, nilaiTukarTambah: nilaiTT, total,
      dibayar, sisa, idTagihan, idUnitTukarTambah: idUnitTT, modal, biayaBonus, labaKotor,
      garansiSampai: garansiUtama || '-',
    };
  }));
}

export interface HasilBatal {
  idPenjualan: string;
  status: 'Batal';
}

/** Batalkan penjualan: stok kembali, tagihan dibatalkan, unit tukar tambah ditarik. */
export function batalkanTransaksi(idTransaksi: string, alasan: string, catatan = ''): HasilBatal {
  return denganLock(() => Db.transaksi(() => {
    if (!String(idTransaksi || '').startsWith(PREFIX_ID.PENJUALAN + '-')) {
      throw new GalatBisnis('BATAL_TIDAK_DIDUKUNG', 'Saat ini hanya penjualan yang bisa dibatalkan dari aplikasi.');
    }
    if (!String(alasan || '').trim()) throw new GalatBisnis('ALASAN_KOSONG', 'Isi alasan pembatalan.');

    const p = Db.findById(SHEET.PENJUALAN, idTransaksi);
    if (!p) throw new GalatBisnis('TIDAK_ADA', `Transaksi ${idTransaksi} tidak ditemukan.`);
    if (p.Status === 'Batal') throw new GalatBisnis('SUDAH_BATAL', `${idTransaksi} sudah dibatalkan.`);
    if (p.Status !== 'Aktif') throw new GalatBisnis('STATUS_TIDAK_VALID', `${idTransaksi} berstatus ${String(p.Status)}, tidak bisa dibatalkan.`);

    const items = (Db.getAll(SHEET.PENJUALAN_ITEM) as Array<Record<string, unknown>>).filter(r => r.ID_Penjualan === idTransaksi);
    const ttRows = (Db.getAll(SHEET.TUKAR_TAMBAH) as Array<Record<string, unknown>>).filter(r => r.ID_Penjualan === idTransaksi);

    // Unit tukar tambah harus masih Ready; bila sudah dijual/diservis, pembatalan ditolak
    for (const t of ttRows) {
      const u = Db.findById(SHEET.STOK_HP, String(t.ID_Unit_Masuk));
      if (u && u.Status !== STATUS_UNIT.READY) {
        throw new GalatBisnis('TT_SUDAH_DIPAKAI', `Unit tukar tambah ${String(t.ID_Unit_Masuk)} sudah berstatus ${String(u.Status)}, penjualan ini tidak bisa dibatalkan.`);
      }
    }

    for (const it of items) {
      if (it.Tipe === 'HP') {
        Db.updateById(SHEET.STOK_HP, String(it.ID_Unit_atau_SKU), { Status: STATUS_UNIT.READY, Tgl_Keluar: '', ID_Penjualan: '' });
      } else if (it.ID_Unit_atau_SKU) {
        ubahStokAksesoris(String(it.ID_Unit_atau_SKU), angka(it.Qty));
      }
    }
    for (const t of ttRows) {
      Db.updateById(SHEET.STOK_HP, String(t.ID_Unit_Masuk), { Status: STATUS_UNIT.BATAL });
    }
    Db.updateBy(SHEET.HUTANG_PIUTANG, 'ID_Referensi', idTransaksi, { Status: 'Batal', Hari_Telat: 0 });

    const ket = ['BATAL: ' + sanitasi(alasan.trim()), catatan ? sanitasi(catatan.trim()) : ''].filter(Boolean).join(' - ');
    const lama = String(p.Catatan ?? '');
    Db.updateById(SHEET.PENJUALAN, idTransaksi, { Status: 'Batal', Catatan: lama ? `${lama} | ${ket}` : ket });
    log('Batal', SHEET.PENJUALAN, idTransaksi, ket);

    return { idPenjualan: idTransaksi, status: 'Batal' as const };
  }));
}
