// PembelianService.ts — M1: Pencatatan Barang Masuk (HP baru/bekas/aksesoris)

import { SHEET, PREFIX_ID, STATUS_UNIT } from './Config';
import { Db } from './Db';
import { GalatBisnis } from './Galat';
import { denganLock } from './Lock';
import { buatId } from './Id';
import { log } from './Log';
import { tglIso, jamHm, validasiIMEI, sanitasi, sekarang, angka, isoValid, formatRupiah } from './Utils';
import { cekImeiAktif, statusAksesoris, UnitRow, AksesorisRow } from './StokService';
import { cariAtauBuatSupplier, cariIdProduk } from './MasterService';
import { bacaPengaturan, angkaPengaturan } from './Pengaturan';
import { selisihHariIso } from './Utils';

export interface ItemMasukInput {
  tipe: 'HP' | 'Aksesoris';
  idProduk?: string;
  namaBarang: string;
  // HP
  imei1?: string;
  imei2?: string;
  kondisi?: 'Baru' | 'Bekas';
  grade?: string;
  kelengkapan?: string;
  bateraiPersen?: number;
  bebasKunciAkun?: string;
  biayaLain?: number;
  // Aksesoris
  sku?: string;
  kategori?: string;
  qty?: number;
  // Umum
  hargaBeli: number; // per unit
  hargaJualTarget?: number;
  catatan?: string;

  // Toggle Perlu Servis Sebelum Dijual (HP)
  perluServis?: boolean;
  keluhanServis?: string;
  estimasiServis?: number;
  pelaksanaServis?: string;
}

export interface PembelianInput {
  tanggal?: string; // yyyy-mm-dd opsional untuk barang lama yang baru dimasukkan
  idSupplier?: string;
  namaSupplier: string;
  metodeBayar: 'Tunai' | 'Transfer' | 'Tempo';
  dibayar: number;
  jatuhTempo?: string; // yyyy-mm-dd
  catatan?: string;
  items: ItemMasukInput[];
}

export interface HasilPembelian {
  idPembelian: string;
  total: number;
  unitsCreated: string[];
  servisCreated: string[];
  aksesorisUpdated: string[];
  idTagihan?: string;
}

export function simpanPembelian(data: PembelianInput): HasilPembelian {
  return denganLock(() => Db.transaksi(() => {
    const now = sekarang();
    const tgl = data.tanggal && /^\d{4}-\d{2}-\d{2}$/.test(data.tanggal) ? data.tanggal : tglIso(now);
    const jam = jamHm(now);

    // 1. Validasi (semua sebelum menulis apa pun)
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      throw new GalatBisnis('DATA_KOSONG', 'Pembelian harus memiliki minimal satu item.');
    }
    if (!['Tunai', 'Transfer', 'Tempo'].includes(data.metodeBayar)) {
      throw new GalatBisnis('METODE_TIDAK_VALID', `Metode bayar "${String(data.metodeBayar)}" tidak dikenal.`);
    }
    const stokSekarang = Db.getAll(SHEET.STOK_HP) as unknown as UnitRow[];
    const imeiDiRequest = new Set<string>();
    let totalPra = 0;
    for (const item of data.items) {
      if (!item.namaBarang || !String(item.namaBarang).trim()) {
        throw new GalatBisnis('NAMA_KOSONG', 'Nama barang wajib diisi.');
      }
      if (angka(item.hargaBeli) < 0) throw new GalatBisnis('HARGA_TIDAK_VALID', 'Harga beli tidak boleh negatif.');
      if (item.tipe === 'HP') {
        const imei = String(item.imei1 ?? '').trim();
        if (!validasiIMEI(imei)) {
          throw new GalatBisnis('IMEI_TIDAK_VALID', `IMEI "${imei}" tidak valid. Wajib 15 angka.`);
        }
        if (imeiDiRequest.has(imei)) {
          throw new GalatBisnis('IMEI_GANDA', `IMEI ${imei} tertulis dua kali di pembelian ini.`);
        }
        imeiDiRequest.add(imei);
        const cek = cekImeiAktif(imei, stokSekarang);
        if (cek.ada) {
          throw new GalatBisnis('IMEI_GANDA', `IMEI ini sudah ada di stok (${cek.idUnit}, status ${cek.status}).`);
        }
        const imei2 = String(item.imei2 ?? '').trim();
        if (imei2) {
          if (!validasiIMEI(imei2)) throw new GalatBisnis('IMEI_TIDAK_VALID', `IMEI 2 "${imei2}" tidak valid. Wajib 15 angka.`);
          if (imei2 === imei) throw new GalatBisnis('IMEI_GANDA', 'IMEI 2 sama dengan IMEI 1.');
          if (imeiDiRequest.has(imei2) || cekImeiAktif(imei2, stokSekarang).ada) throw new GalatBisnis('IMEI_GANDA', `IMEI 2 ${imei2} sudah ada di stok.`);
          imeiDiRequest.add(imei2);
        }
        totalPra += Math.max(0, Math.round(angka(item.hargaBeli)));
      } else if (item.tipe === 'Aksesoris') {
        if (!(angka(item.qty) >= 1)) throw new GalatBisnis('QTY_TIDAK_VALID', 'Jumlah aksesoris minimal 1.');
        totalPra += Math.max(0, Math.round(angka(item.hargaBeli))) * Math.round(angka(item.qty));
      } else {
        throw new GalatBisnis('TIPE_TIDAK_DIKENAL', `Tipe item "${String((item as ItemMasukInput).tipe)}" tidak dikenal.`);
      }
    }
    if (data.jatuhTempo && !isoValid(data.jatuhTempo)) {
      throw new GalatBisnis('TANGGAL_TIDAK_VALID', 'Tanggal jatuh tempo tidak valid.');
    }
    // Hutang supplier: harus jelas kepada siapa dan kapan jatuh tempo
    const namaSup = sanitasi(String(data.namaSupplier ?? '').trim());
    const sisaPra = totalPra - Math.min(totalPra, Math.max(0, Math.round(angka(data.dibayar))));
    if (sisaPra > 0) {
      if (!namaSup || /^supplier$/i.test(namaSup)) throw new GalatBisnis('TEMPO_BUTUH_SUPPLIER', 'Hutang supplier wajib atas nama supplier. Isi asal barang.');
      if (!isoValid(data.jatuhTempo)) throw new GalatBisnis('TEMPO_BUTUH_TANGGAL', 'Isi tanggal jatuh tempo hutang.');
      if (selisihHariIso(tgl, String(data.jatuhTempo)) < 0) throw new GalatBisnis('TEMPO_TANGGAL_LALU', 'Tanggal jatuh tempo tidak boleh sebelum hari ini.');
    }
    const pengaturan = bacaPengaturan();
    const stokMinimum = angkaPengaturan(pengaturan, 'STOK_MINIMUM_DEFAULT', 3);
    const idSupplier = data.idSupplier || cariAtauBuatSupplier(namaSup);

    const idPembelian = buatId(PREFIX_ID.PEMBELIAN);
    let total = 0;
    const unitsCreated: string[] = [];
    const servisCreated: string[] = [];
    const aksesorisUpdated: string[] = [];

    // 2. Tulis tiap item
    data.items.forEach((it, i) => {
      const hargaBeli = Math.max(0, Math.round(angka(it.hargaBeli)));
      const idItem = `${idPembelian}-${i + 1}`;

      if (it.tipe === 'HP') {
        const biayaLain = Math.max(0, Math.round(angka(it.biayaLain)));
        const idUnit = buatId(PREFIX_ID.UNIT);
        unitsCreated.push(idUnit);
        total += hargaBeli;

        Db.append(SHEET.STOK_HP, {
          ID_Unit: idUnit,
          Tgl_Masuk: tgl,
          Jam_Masuk: jam,
          IMEI_1: String(it.imei1).trim(),
          IMEI_2: it.imei2 ? String(it.imei2).trim() : '',
          ID_Produk: it.idProduk || cariIdProduk(it.namaBarang, 'HP'),
          Nama_Barang: sanitasi(it.namaBarang),
          Kondisi: it.kondisi || 'Bekas',
          Grade: it.grade || '',
          Kelengkapan: it.kelengkapan || 'Fullset',
          Baterai_Persen: it.bateraiPersen ?? '',
          Bebas_Kunci_Akun: it.bebasKunciAkun || 'Ya',
          Sumber: 'Pembelian',
          ID_Sumber: idPembelian,
          Harga_Beli: hargaBeli,
          Biaya_Lain: biayaLain,
          Biaya_Servis: 0,
          HPP: hargaBeli + biayaLain, // estimasi servis belum masuk modal
          Estimasi_Servis: Math.max(0, Math.round(angka(it.estimasiServis))),
          Harga_Jual_Target: Math.max(0, Math.round(angka(it.hargaJualTarget))),
          Status: it.perluServis ? STATUS_UNIT.SERVIS : STATUS_UNIT.READY,
          Umur_Stok_Hari: Math.max(0, selisihHariIso(tgl, tglIso(now))),
          Tgl_Keluar: '',
          ID_Penjualan: '',
          Link_Foto: '',
          Catatan: sanitasi(it.catatan || ''),
          Dibuat_Oleh: 'Owner',
        });

        if (it.perluServis) {
          const idServis = buatId(PREFIX_ID.SERVIS);
          servisCreated.push(idServis);
          Db.append(SHEET.SERVIS, {
            ID_Servis: idServis,
            Tgl_Masuk: tgl,
            Jam_Masuk: jam,
            Tgl_Selesai: '',
            Jenis: 'Internal',
            Pelaksana: it.pelaksanaServis || 'Teknisi sendiri',
            Nama_Vendor: '',
            ID_Unit: idUnit,
            Nama_Pelanggan: '',
            Perangkat: sanitasi(it.namaBarang),
            IMEI: String(it.imei1).trim(),
            Keluhan: sanitasi(it.keluhanServis || 'Perbaikan unit sebelum dijual'),
            Tindakan: '',
            Estimasi_Biaya: Math.max(0, Math.round(angka(it.estimasiServis))),
            Biaya_Part: 0,
            Biaya_Jasa_Teknisi: 0,
            Tarif_Pelanggan: 0,
            Laba_Servis: 0,
            Status: 'Antri',
            Dibuat_Oleh: 'Owner',
          });
        }

        Db.append(SHEET.PEMBELIAN_ITEM, {
          ID_Item: idItem, ID_Pembelian: idPembelian, Tipe: 'HP', ID_Unit_atau_SKU: idUnit,
          Nama_Barang: sanitasi(it.namaBarang), Qty: 1, Harga_Satuan: hargaBeli, Subtotal: hargaBeli,
        });
      } else {
        const qty = Math.round(angka(it.qty));
        const subtotal = hargaBeli * qty;
        total += subtotal;

        // Cari aksesoris yang sudah ada (SKU, lalu nama); bila tidak ada, buat baru
        const semua = Db.getAll(SHEET.STOK_AKSESORIS) as unknown as AksesorisRow[];
        const namaBersih = sanitasi(it.namaBarang).toLowerCase();
        const ada = semua.find(a => (it.sku && a.SKU === it.sku) || String(a.Nama_Barang).toLowerCase() === namaBersih);
        let sku: string;
        if (ada) {
          sku = ada.SKU;
          const stokLama = angka(ada.Stok);
          const stokBaru = stokLama + qty;
          // Harga beli rata-rata tertimbang
          const rata = stokBaru > 0 ? Math.round((angka(ada.Harga_Beli_Rata2) * stokLama + hargaBeli * qty) / stokBaru) : hargaBeli;
          Db.updateById(SHEET.STOK_AKSESORIS, sku, {
            Stok: stokBaru,
            Harga_Beli_Rata2: rata,
            Harga_Jual: it.hargaJualTarget ? Math.round(angka(it.hargaJualTarget)) : ada.Harga_Jual,
            Status: statusAksesoris(stokBaru, angka(ada.Stok_Minimum)),
          });
        } else {
          sku = it.sku || buatId(PREFIX_ID.AKSESORIS);
          Db.append(SHEET.STOK_AKSESORIS, {
            SKU: sku,
            Nama_Barang: sanitasi(it.namaBarang),
            Kategori: it.kategori || 'Lainnya',
            Stok: qty,
            Stok_Minimum: stokMinimum,
            Harga_Beli_Rata2: hargaBeli,
            Harga_Jual: Math.max(0, Math.round(angka(it.hargaJualTarget))),
            Status: statusAksesoris(qty, stokMinimum),
          });
        }
        aksesorisUpdated.push(sku);
        Db.append(SHEET.PEMBELIAN_ITEM, {
          ID_Item: idItem, ID_Pembelian: idPembelian, Tipe: 'Aksesoris', ID_Unit_atau_SKU: sku,
          Nama_Barang: sanitasi(it.namaBarang), Qty: qty, Harga_Satuan: hargaBeli, Subtotal: subtotal,
        });
      }
    });

    // 3. Header pembelian
    const dibayar = Math.min(total, Math.max(0, Math.round(angka(data.dibayar))));
    const sisa = total - dibayar;
    const statusBayar = sisa === 0 ? 'Lunas' : dibayar > 0 ? 'Sebagian' : 'Belum';

    Db.append(SHEET.PEMBELIAN, {
      ID_Pembelian: idPembelian,
      Tanggal: tgl,
      Jam: jam,
      ID_Supplier: idSupplier,
      Nama_Supplier: sanitasi(data.namaSupplier || 'Supplier'),
      Total: total,
      Metode_Bayar: data.metodeBayar,
      Dibayar: dibayar,
      Sisa: sisa,
      Status_Bayar: statusBayar,
      Link_Nota: '',
      Status: 'Aktif',
      Catatan: sanitasi(data.catatan || ''),
      Dibuat_Oleh: 'Owner',
    });

    // 4. Hutang supplier bila masih ada sisa
    let idTagihan: string | undefined;
    if (sisa > 0) {
      idTagihan = buatId(PREFIX_ID.TAGIHAN);
      Db.append(SHEET.HUTANG_PIUTANG, {
        ID_Tagihan: idTagihan,
        Jenis: 'Hutang supplier',
        ID_Referensi: idPembelian,
        ID_Kontak: idSupplier,
        Nama: sanitasi(data.namaSupplier || 'Supplier'),
        Total: total,
        Terbayar: dibayar,
        Sisa: sisa,
        Jatuh_Tempo: data.jatuhTempo || '',
        Hari_Telat: 0,
        Status: dibayar > 0 ? 'Sebagian' : 'Belum',
      });
    }

    // Pembayaran awal selalu dicatat (juga bila lunas) agar arus kas lengkap
    if (dibayar > 0) {
      Db.append(SHEET.PEMBAYARAN, {
        ID_Bayar: buatId(PREFIX_ID.PEMBAYARAN), Tanggal: tgl, Jam: jam, ID_Hutang_Piutang: idTagihan || '',
        Nama: sanitasi(data.namaSupplier || 'Supplier'), Jumlah: dibayar, Metode: data.metodeBayar,
        Catatan: `Pembayaran awal ${idPembelian}`, Link_Bukti: '',
      });
    }

    log('Tambah', SHEET.PEMBELIAN, idPembelian,
      `Barang masuk ${unitsCreated.length} unit HP, ${aksesorisUpdated.length} aksesoris, total ${formatRupiah(total)}`);

    return { idPembelian, total, unitsCreated, servisCreated, aksesorisUpdated, idTagihan };
  }));
}
