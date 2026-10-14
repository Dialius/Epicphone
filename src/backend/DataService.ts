// DataService.ts — getSemuaData(): satu panggilan yang membawa semua daftar yang dipakai layar,
// sudah berbentuk model layar (camelCase). Dipakai agar layar tidak memanggil server berkali-kali
// (tiap panggilan google.script.run sekitar 0,5-2 detik). Semua tanggal berupa teks, tidak ada Date.

import { SHEET, STATUS_UNIT } from './Config';
import { Db } from './Db';
import { sekarang, tglIso, jamHm, tglId, jamId, angka, selisihHariIso, isoValid, normalisasiWA } from './Utils';

/** "14 Okt 2026 (7 hari)" / "07 Okt 2027 (12 bulan)" dari tanggal jual dan batas garansi */
function labelGaransi(tglJual: unknown, hingga: unknown): string | undefined {
  const h = teks(hingga);
  if (!isoValid(h)) return undefined;
  const hari = selisihHariIso(teks(tglJual), h);
  const label = hari >= 300 ? `${Math.round(hari / 30.4)} bulan` : `${hari} hari`;
  return `${tglId(h)} (${label})`;
}
import { statusAksesoris, umurStokHari } from './StokService';
import { statusTagihan } from './TagihanService';
import { bacaPengaturan } from './Pengaturan';

type R = Record<string, unknown>;

const HARI_TERJUAL_DITAMPILKAN = 180;
const MAKS_TRANSAKSI = 500;

const teks = (v: unknown) => String(v ?? '');
const opsional = (v: unknown) => (teks(v) === '' ? undefined : teks(v));

/** "62812..." -> "0812..." untuk tampilan */
function waTampil(no: unknown): string {
  const d = normalisasiWA(teks(no)).replace(/\D/g, '');
  if (!d) return '';
  return d.startsWith('62') ? '0' + d.slice(2) : d;
}

function groupBy(rows: R[], kolom: string): Record<string, R[]> {
  const o: Record<string, R[]> = {};
  for (const r of rows) {
    const k = teks(r[kolom]);
    (o[k] = o[k] || []).push(r);
  }
  return o;
}

export interface StatusBackup {
  ok: boolean;
  terakhir: string;
  pesan: string;
}

export interface SemuaData {
  stok: unknown[];
  aksesoris: unknown[];
  transaksi: unknown[];
  tagihan: unknown[];
  kontak: unknown[];
  katalog: unknown[];
  servis: unknown[];
  klaim: unknown[];
  biaya: unknown[];
  statusBackup: StatusBackup;
  /** Pengaturan toko dan ambang (nilai bawaan bila belum diisi) */
  pengaturan: Record<string, string>;
  /** Daftar yang belum dilayani server; layar tetap memakai data lokal untuk bagian ini */
  belumTerhubung: string[];
  waktuServer: string;
}

export function getSemuaData(): SemuaData {
  const hariIni = tglIso(sekarang());

  const stokRows = Db.getAll(SHEET.STOK_HP);
  const aksRows = Db.getAll(SHEET.STOK_AKSESORIS);
  const penjualan = Db.getAll(SHEET.PENJUALAN);
  const penjItem = groupBy(Db.getAll(SHEET.PENJUALAN_ITEM), 'ID_Penjualan');
  const ttRows = groupBy(Db.getAll(SHEET.TUKAR_TAMBAH), 'ID_Penjualan');
  const pembelian = Db.getAll(SHEET.PEMBELIAN);
  const pembItem = groupBy(Db.getAll(SHEET.PEMBELIAN_ITEM), 'ID_Pembelian');
  const hutang = Db.getAll(SHEET.HUTANG_PIUTANG);
  const hutangByRef = groupBy(hutang, 'ID_Referensi');
  const hutangById: Record<string, R> = {};
  hutang.forEach(h => { hutangById[teks(h.ID_Tagihan)] = h; });
  const bayar = Db.getAll(SHEET.PEMBAYARAN);
  const bayarByTagihan = groupBy(bayar, 'ID_Hutang_Piutang');
  const kontakRows = Db.getAll(SHEET.KONTAK);
  const produkRows = Db.getAll(SHEET.PRODUK);
  const servisRows = Db.getAll(SHEET.SERVIS);
  const klaimRows = Db.getAll(SHEET.GARANSI_RETUR);
  const biayaRows = Db.getAll(SHEET.BIAYA_OPERASIONAL);
  const logRows = Db.getAll(SHEET.LOG_AKTIVITAS);
  const fotoRows = Db.getAll(SHEET.BERKAS_FOTO) as Array<Record<string, unknown>>;

  const fotoByRef: Record<string, string[]> = {};
  fotoRows.forEach(f => {
    if (f.Status === 'Aktif') {
      const idRef = teks(f.ID_Referensi);
      if (!fotoByRef[idRef]) fotoByRef[idRef] = [];
      const fileId = teks(f.ID_File_Drive);
      const url = fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : teks(f.Link);
      if (url) fotoByRef[idRef].push(url);
    }
  });

  const supplierByBeli: Record<string, string> = {};
  pembelian.forEach(p => { supplierByBeli[teks(p.ID_Pembelian)] = teks(p.Nama_Supplier); });
  const imeiByUnit: Record<string, string> = {};
  stokRows.forEach(u => { imeiByUnit[teks(u.ID_Unit)] = teks(u.IMEI_1); });

  // ── Stok HP ────────────────────────────────────────────────────────────────
  const stok = stokRows
    .filter(u => {
      if (u.Status === STATUS_UNIT.BATAL) return false;
      if (u.Status === STATUS_UNIT.TERJUAL && isoValid(teks(u.Tgl_Keluar))) {
        return selisihHariIso(teks(u.Tgl_Keluar), hariIni) <= HARI_TERJUAL_DITAMPILKAN;
      }
      return true;
    })
    .map(u => {
      const akhir = u.Status === STATUS_UNIT.TERJUAL && isoValid(teks(u.Tgl_Keluar)) ? teks(u.Tgl_Keluar) : hariIni;
      const nama = teks(u.Nama_Barang);
      const idUnit = teks(u.ID_Unit);
      return {
        id: idUnit,
        nama,
        merek: nama.split(' ')[0] || 'HP',
        model: nama,
        imei: teks(u.IMEI_1),
        imei2: opsional(u.IMEI_2),
        kondisi: teks(u.Kondisi) || 'Bekas',
        grade: opsional(u.Grade),
        kelengkapan: teks(u.Kelengkapan) || 'Fullset',
        baterai: teks(u.Baterai_Persen) === '' ? undefined : angka(u.Baterai_Persen),
        bebasKunci: teks(u.Bebas_Kunci_Akun) || 'Belum dicek',
        hargaBeli: angka(u.Harga_Beli),
        biayaLain: angka(u.Biaya_Lain),
        biayaServis: angka(u.Biaya_Servis),
        hpp: angka(u.HPP),
        hargaJualTarget: angka(u.Harga_Jual_Target),
        status: teks(u.Status),
        umurHari: umurStokHari(teks(u.Tgl_Masuk), akhir),
        tglMasuk: tglId(u.Tgl_Masuk),
        catatan: opsional(u.Catatan),
        sumberSupplier: u.Sumber === 'Pembelian' ? opsional(supplierByBeli[teks(u.ID_Sumber)]) : undefined,
        foto: fotoByRef[idUnit] || [],
        estimasiServis: angka(u.Estimasi_Servis) || undefined,
        notaJualId: opsional(u.ID_Penjualan),
      };
    });

  // ── Aksesoris ──────────────────────────────────────────────────────────────
  const aksesoris = aksRows.map(a => ({
    sku: teks(a.SKU),
    nama: teks(a.Nama_Barang),
    kategori: teks(a.Kategori) || 'Lainnya',
    stok: angka(a.Stok),
    stokMin: angka(a.Stok_Minimum),
    hargaBeliRata2: angka(a.Harga_Beli_Rata2),
    hargaJual: angka(a.Harga_Jual),
    status: statusAksesoris(angka(a.Stok), angka(a.Stok_Minimum)),
  }));

  // ── Transaksi (gabungan Jual, Beli, Bayar) ─────────────────────────────────
  type Trx = { sortKey: string; [k: string]: unknown };
  const transaksi: Trx[] = [];

  for (const p of penjualan) {
    if (p.Status !== 'Aktif' && p.Status !== 'Batal') continue;
    const id = teks(p.ID_Penjualan);
    const items = penjItem[id] || [];
    const barang = items.filter(i => i.Tipe !== 'Bonus');
    const bonus = items.filter(i => i.Tipe === 'Bonus');
    const tt = (ttRows[id] || [])[0];
    const tagihan = (hutangByRef[id] || [])[0];
    const sisa = angka(p.Sisa_Tagihan);
    const batal = p.Status === 'Batal';
    const catatan = teks(p.Catatan);
    const idxBatal = catatan.indexOf('BATAL: ');
    transaksi.push({
      sortKey: `${teks(p.Tanggal)} ${teks(p.Jam)} ${id}`,
      id,
      jam: jamId(p.Jam),
      tanggal: tglId(p.Tanggal),
      tipe: 'Jual',
      judul: `Jual · ${teks(barang[0]?.Nama_Barang) || 'Penjualan'}${barang.length > 1 ? ` + ${barang.length - 1} item` : ''}`,
      subjudul: `${id} • ${teks(p.Metode_Bayar)}`,
      pihak: teks(p.Nama_Pelanggan),
      nominal: angka(p.Total_Tagihan),
      status: batal ? 'Dibatalkan' : sisa > 0 ? 'Sebagian' : 'Lunas',
      items: barang.map(i => ({ nama: teks(i.Nama_Barang), qty: angka(i.Qty), harga: angka(i.Harga_Jual), imei: opsional(i.IMEI) })),
      bonus: bonus.map(i => ({ nama: teks(i.Nama_Barang), qty: angka(i.Qty) })),
      diskon: angka(p.Diskon),
      tukarTambah: tt ? { unit: teks(tt.Nama_Barang), nilai: angka(tt.Nilai_Taksir) } : undefined,
      dibayar: angka(p.Dibayar),
      sisa,
      jatuhTempo: tagihan ? tglId(tagihan.Jatuh_Tempo) : undefined,
      modal: barang.reduce((s, i) => s + angka(i.HPP) * angka(i.Qty), 0),
      laba: angka(p.Laba_Kotor),
      biayaBonus: angka(p.Biaya_Bonus),
      catatanBatal: batal && idxBatal >= 0 ? catatan.slice(idxBatal + 7) : undefined,
      metode: teks(p.Metode_Bayar),
      garansiSampai: labelGaransi(p.Tanggal, barang.find(i => i.Tipe === 'HP')?.Garansi_Hingga),
    });
  }

  for (const p of pembelian) {
    if (p.Status !== 'Aktif') continue;
    const id = teks(p.ID_Pembelian);
    const items = pembItem[id] || [];
    const sisa = angka(p.Sisa);
    const hp = items.find(i => i.Tipe === 'HP');
    const imei = hp ? imeiByUnit[teks(hp.ID_Unit_atau_SKU)] || '' : '';
    const tagihan = (hutangByRef[id] || [])[0];
    transaksi.push({
      sortKey: `${teks(p.Tanggal)} ${teks(p.Jam)} ${id}`,
      id,
      jam: jamId(p.Jam),
      tanggal: tglId(p.Tanggal),
      tipe: 'Beli',
      judul: `Beli · ${teks(items[0]?.Nama_Barang) || 'Barang masuk'}${items.length > 1 ? ` + ${items.length - 1} item` : ''}`,
      subjudul: hp ? `${teks(hp.ID_Unit_atau_SKU)} • IMEI ...${imei.slice(-4)}` : id,
      pihak: teks(p.Nama_Supplier),
      nominal: angka(p.Total),
      status: sisa > 0 ? 'Sebagian' : 'Lunas',
      items: items.map(i => ({ nama: teks(i.Nama_Barang), qty: angka(i.Qty), harga: angka(i.Harga_Satuan), imei: i.Tipe === 'HP' ? opsional(imeiByUnit[teks(i.ID_Unit_atau_SKU)]) : undefined })),
      dibayar: angka(p.Dibayar),
      sisa,
      jatuhTempo: tagihan ? tglId(tagihan.Jatuh_Tempo) : undefined,
      metode: teks(p.Metode_Bayar),
    });
  }

  for (const b of bayar) {
    const idT = teks(b.ID_Hutang_Piutang);
    if (!idT || teks(b.Catatan).indexOf('Pembayaran awal') === 0) continue; // pembayaran awal sudah ada di baris Jual/Beli
    const t = hutangById[idT];
    const ket = teks(b.Catatan);
    transaksi.push({
      sortKey: `${teks(b.Tanggal)} ${teks(b.Jam)} ${teks(b.ID_Bayar)}`,
      id: teks(b.ID_Bayar),
      jam: jamId(b.Jam),
      tanggal: tglId(b.Tanggal),
      tipe: 'Bayar',
      judul: `Bayar · ${t && t.Jenis === 'Hutang supplier' ? 'Hutang' : 'Cicilan'} ${teks(b.Nama)}`,
      subjudul: `${idT} • ${teks(b.Metode)}${ket ? ' • ' + ket : ''}`,
      pihak: teks(b.Nama),
      nominal: angka(b.Jumlah),
      status: 'Lunas',
      dibayar: angka(b.Jumlah),
      sisa: 0,
    });
  }

  for (const sv of servisRows) {
    if (sv.Status !== 'Selesai' && sv.Status !== 'Diambil') continue;
    const pel = sv.Jenis === 'Pelanggan';
    transaksi.push({
      sortKey: `${teks(sv.Tgl_Selesai)} 99:99 ${teks(sv.ID_Servis)}`, id: teks(sv.ID_Servis), jam: '', tanggal: tglId(sv.Tgl_Selesai), tipe: 'Servis',
      judul: `Servis · ${teks(sv.Perangkat)}`, subjudul: `${teks(sv.ID_Servis)} • ${teks(sv.Jenis)}`,
      pihak: pel ? teks(sv.Nama_Pelanggan) : 'Internal', nominal: pel ? angka(sv.Tarif_Pelanggan) : angka(sv.Biaya_Part) + angka(sv.Biaya_Jasa_Teknisi),
      status: 'Selesai',
    });
  }
  for (const k of klaimRows) {
    transaksi.push({
      sortKey: `${teks(k.Tanggal)} ${teks(k.Jam)} ${teks(k.ID_Klaim)}`, id: teks(k.ID_Klaim), jam: jamId(k.Jam), tanggal: tglId(k.Tanggal), tipe: 'Klaim',
      judul: `Klaim · ${teks(k.Jenis)} · ${teks(k.Nama_Barang)}`, subjudul: `${teks(k.ID_Klaim)} • ${teks(k.ID_Penjualan)}`,
      pihak: teks((penjualan.find(p => p.ID_Penjualan === k.ID_Penjualan) || {}).Nama_Pelanggan), nominal: angka(k.Nilai_Refund),
      status: k.Status === 'Selesai' ? 'Selesai' : 'Aktif',
    });
  }
  for (const b of biayaRows) {
    transaksi.push({
      sortKey: `${teks(b.Tanggal)} 99:99 ${teks(b.ID_Biaya)}`, id: teks(b.ID_Biaya), jam: '', tanggal: tglId(b.Tanggal), tipe: 'Biaya',
      judul: `Biaya · ${teks(b.Kategori)}`, subjudul: teks(b.ID_Biaya), pihak: 'Operasional', nominal: angka(b.Nominal), status: 'Lunas',
    });
  }

  transaksi.sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0));
  const transaksiOut = transaksi.slice(0, MAKS_TRANSAKSI).map(t => {
    const { sortKey: _, ...sisa } = t;
    void _;
    return sisa;
  });

  // ── Tagihan ────────────────────────────────────────────────────────────────
  const kontakById: Record<string, R> = {};
  const kontakByNama: Record<string, R> = {};
  kontakRows.forEach(k => { kontakById[teks(k.ID_Kontak)] = k; kontakByNama[teks(k.Nama).toLowerCase()] = k; });

  const tagihan = hutang
    .filter(h => h.Status !== 'Batal')
    .map(h => {
      const sisa = angka(h.Sisa);
      const st = statusTagihan(sisa, teks(h.Jatuh_Tempo), hariIni);
      const status = st.status === 'Lunas' ? 'Lunas' : st.status === 'Telat' ? 'Telat' : angka(h.Terbayar) > 0 ? 'Sebagian' : 'Belum';
      const k = kontakById[teks(h.ID_Kontak)] || kontakByNama[teks(h.Nama).toLowerCase()];
      return {
        id: teks(h.ID_Tagihan),
        jenis: teks(h.Jenis),
        kontak: teks(h.Nama),
        noWa: k ? waTampil(k.No_WA) : '',
        total: angka(h.Total),
        terbayar: angka(h.Terbayar),
        sisa,
        jatuhTempo: tglId(h.Jatuh_Tempo),
        hariTelat: st.hariTelat,
        status,
        refId: teks(h.ID_Referensi),
        riwayatBayar: (bayarByTagihan[teks(h.ID_Tagihan)] || []).map(b => ({
          tanggal: tglId(b.Tanggal), jam: jamId(b.Jam), nominal: angka(b.Jumlah), metode: teks(b.Metode), bukti: opsional(b.Link_Bukti),
        })),
      };
    });

  // ── Kontak & Katalog ───────────────────────────────────────────────────────
  const jumlahTransaksi: Record<string, number> = {};
  penjualan.filter(p => p.Status === 'Aktif').forEach(p => { jumlahTransaksi[teks(p.ID_Pelanggan)] = (jumlahTransaksi[teks(p.ID_Pelanggan)] || 0) + 1; });
  pembelian.filter(p => p.Status === 'Aktif').forEach(p => { jumlahTransaksi[teks(p.ID_Supplier)] = (jumlahTransaksi[teks(p.ID_Supplier)] || 0) + 1; });
  const kontak = kontakRows.map(k => ({
    id: teks(k.ID_Kontak),
    nama: teks(k.Nama),
    tipe: teks(k.Tipe) || 'Pelanggan',
    noWa: waTampil(k.No_WA),
    alamat: teks(k.Alamat),
    totalTransaksi: jumlahTransaksi[teks(k.ID_Kontak)] || 0,
    catatan: opsional(k.Catatan),
    aktif: true,
  }));

  const katalog = produkRows.map(p => {
    const aktif = p.Aktif;
    return {
      id: teks(p.ID_Produk),
      jenis: teks(p.Jenis) || 'HP',
      platform: opsional(p.Platform),
      merek: teks(p.Merek),
      model: teks(p.Model),
      varian: teks(p.Varian),
      warna: teks(p.Warna),
      hargaStandar: angka(p.Harga_Jual_Standar),
      aktif: !(aktif === false || /^(tidak|false|0)$/i.test(teks(aktif))),
    };
  });

  // ── Servis, Klaim, Biaya ───────────────────────────────────────────────────
  const waByNama: Record<string, string> = {};
  kontakRows.forEach(k => { waByNama[teks(k.Nama).toLowerCase()] = waTampil(k.No_WA); });
  const servis = servisRows
    .filter(sv => sv.Status !== 'Batal')
    .map(sv => {
      const st = teks(sv.Status);
      return {
        id: teks(sv.ID_Servis), tglMasuk: tglId(sv.Tgl_Masuk), jenis: teks(sv.Jenis), namaPerangkat: teks(sv.Perangkat),
        imei: teks(sv.IMEI) || '-', namaPelanggan: teks(sv.Nama_Pelanggan) || 'Internal',
        noWa: waByNama[teks(sv.Nama_Pelanggan).toLowerCase()] || '-', keluhan: teks(sv.Keluhan),
        teknisi: teks(sv.Nama_Vendor) || (sv.Pelaksana === 'Vendor luar' ? 'Vendor luar' : 'Teknisi sendiri'),
        estimasiBiaya: angka(sv.Estimasi_Biaya), biayaPart: angka(sv.Biaya_Part), biayaJasa: angka(sv.Biaya_Jasa_Teknisi),
        tarifPelanggan: angka(sv.Tarif_Pelanggan), status: st,
        tahap: st === 'Antri' ? 'sebelum' : st === 'Dikerjakan' ? 'proses' : 'sesudah',
        unitHpId: opsional(sv.ID_Unit), catatan: opsional(sv.Tindakan), foto: fotoByRef[teks(sv.ID_Servis)] || [],
      };
    });
  const klaim = klaimRows.map(k => {
    const p = penjualan.find(x => x.ID_Penjualan === k.ID_Penjualan);
    const u = stokRows.find(x => x.ID_Unit === k.ID_Unit);
    return {
      id: teks(k.ID_Klaim), tanggal: tglId(k.Tanggal), notaId: teks(k.ID_Penjualan), imei: u ? teks(u.IMEI_1) : '-',
      namaBarang: teks(k.Nama_Barang), pelanggan: p ? teks(p.Nama_Pelanggan) : '-', jenis: teks(k.Jenis), alasan: teks(k.Alasan),
      status: teks(k.Status), tindakan: teks(k.Tindakan), nilaiRefund: angka(k.Nilai_Refund) || undefined,
      unitPengganti: opsional(k.Unit_Pengganti), dampakLaba: angka(k.Dampak_Laba),
    };
  });
  const biaya = biayaRows.map(b => ({ id: teks(b.ID_Biaya), tanggal: tglId(b.Tanggal), kategori: teks(b.Kategori), nominal: angka(b.Nominal), keterangan: teks(b.Catatan) }))
    .reverse();

  return {
    stok, aksesoris, transaksi: transaksiOut, tagihan, kontak, katalog, servis, klaim, biaya,
    statusBackup: hitungStatusBackup(logRows, hariIni, jamHm(sekarang())),
    pengaturan: bacaPengaturan(),
    belumTerhubung: [],
    waktuServer: new Date().toISOString(),
  };
}


/** Status backup harian dari Log_Aktivitas: gagal atau lebih dari 36 jam tanpa backup berhasil = peringatan di Beranda */
export function hitungStatusBackup(log: R[], hariIni: string, jamSekarang: string): StatusBackup {
  const entri = log.filter(l => l.Aksi === 'Sistem' && l.Sheet === 'Jobs' && l.ID_Data === 'jobBackupHarian');
  if (!entri.length) return { ok: true, terakhir: '', pesan: 'Backup pertama menunggu jadwal 01:00.' };
  const terakhir = entri[entri.length - 1];
  const menit = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
  const label = `${tglId(terakhir.Tanggal)} ${jamId(terakhir.Jam)}`;
  if (teks(terakhir.Ringkasan).indexOf('GAGAL') === 0) {
    return { ok: false, terakhir: label, pesan: `Backup harian terakhir gagal: ${teks(terakhir.Ringkasan).slice(6)}` };
  }
  const umurMenit = selisihHariIso(teks(terakhir.Tanggal), hariIni) * 1440 + menit(jamSekarang) - menit(teks(terakhir.Jam));
  if (umurMenit > 36 * 60) return { ok: false, terakhir: label, pesan: 'Sudah lebih dari 36 jam tanpa backup berhasil.' };
  return { ok: true, terakhir: label, pesan: 'Backup harian berjalan normal.' };
}
