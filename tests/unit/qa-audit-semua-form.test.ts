// qa-audit-semua-form.test.ts — Pengujian Komprehensif QA: Setiap Form, Setiap Fungsi Backend, Kolom, Tipe Data, Efek Samping, & Kasus Tepi
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { pasangGasFake, Palsu } from '../helpers/gas-fake';
import { pasangDriveFake, siapkanFolder } from '../helpers/drive-fake';
import { HEADER } from '../../src/backend/Skema';

let palsu: Palsu;
let drive: any;
let Code: typeof import('../../src/backend/Code');
let api: typeof import('../../src/frontend/lib/api');

const FAKE_IMEI_1 = '990000000000001';
const FAKE_IMEI_2 = '990000000000002';
const FAKE_IMEI_3 = '990000000000003';
const FAKE_IMEI_4 = '990000000000004';
const FAKE_IMEI_TT = '990000000000005';

function pasangRunner(codeObj: Record<string, (...a: unknown[]) => unknown>) {
  const runner = (ok?: (r: unknown) => void, gagal?: (e: Error) => void): unknown =>
    new Proxy({} as Record<string, unknown>, {
      get(_t, prop: string) {
        if (prop === 'withSuccessHandler') return (f: (r: unknown) => void) => runner(f, gagal);
        if (prop === 'withFailureHandler') return (f: (e: Error) => void) => runner(ok, f);
        if (typeof codeObj[prop] !== 'function') return undefined;
        return (...args: unknown[]) => setTimeout(() => {
          try {
            const res = codeObj[prop](...(JSON.parse(JSON.stringify(args)) as unknown[]));
            ok?.(JSON.parse(JSON.stringify(res)));
          } catch (e) { gagal?.(e as Error); }
        }, 0);
      },
    });
  (globalThis as any).window = globalThis;
  (globalThis as any).google = { script: { run: runner() } };
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-14T03:00:00Z')); // 14 Okt 2026 10:00 WIB
  palsu = pasangGasFake();
  drive = pasangDriveFake();
  siapkanFolder(drive, [
    'EPICPHONE_00_SISTEM/01_DATABASE',
    'EPICPHONE_00_SISTEM/02_FOTO-HP',
    'EPICPHONE_00_SISTEM/02_FOTO-HP/_TERHAPUS',
    'EPICPHONE_00_SISTEM/03_NOTA',
    'EPICPHONE_00_SISTEM/03_NOTA/RIWAYAT',
    'EPICPHONE_00_SISTEM/04_BUKTI-TRANSAKSI',
    'EPICPHONE_00_SISTEM/05_SERVIS',
    'EPICPHONE_00_SISTEM/06_LAPORAN',
    'EPICPHONE_00_SISTEM/07_BACKUP',
    'EPICPHONE_00_SISTEM/07_BACKUP/HARIAN',
  ]);
  Code = await import('../../src/backend/Code');
  pasangRunner(Code as any);
  api = await import('../../src/frontend/lib/api');
});

afterEach(() => {
  vi.useRealTimers();
  delete (globalThis as any).window;
  delete (globalThis as any).google;
});

describe('QA - Form 1: Barang Masuk (Unit HP & Aksesoris)', () => {
  it('1.1 Masuk Unit HP Baru & Bekas tersimpan di sheet Stok_HP, Pembelian, Pembelian_Item dengan format dan kolom benar', async () => {
    const payload = {
      namaSupplier: 'TEST_QA_Supplier_Maju',
      metodeBayar: 'Tunai',
      dibayar: 5000000,
      catatan: 'TEST_QA_Catatan pembelian unit',
      items: [
        {
          tipe: 'HP',
          namaBarang: 'TEST_QA_Samsung Galaxy A54 8/256 GB Hitam',
          imei1: FAKE_IMEI_1,
          kondisi: 'Bekas',
          grade: 'A',
          kelengkapan: 'Fullset',
          bateraiPersen: 94,
          bebasKunciAkun: 'Ya',
          hargaBeli: 3000000,
          biayaLain: 50000,
          hargaJualTarget: 3600000,
          catatan: 'TEST_QA_Lecet tipis di bezel',
        },
        {
          tipe: 'HP',
          namaBarang: 'TEST_QA_iPhone 13 128 GB Biru',
          imei1: FAKE_IMEI_2,
          kondisi: 'Baru',
          kelengkapan: 'Fullset',
          bebasKunciAkun: 'Ya',
          hargaBeli: 2000000,
          biayaLain: 0,
          hargaJualTarget: 2500000,
        }
      ]
    };

    const res = await api.apiCall<any>('simpanPembelian', payload, api.buatIdemKey());
    expect(res.ok).toBe(true);
    expect(res.data.unitsCreated).toHaveLength(2);

    const unit1Id = res.data.unitsCreated[0];
    const unit2Id = res.data.unitsCreated[1];

    // Cek sheet Stok_HP
    const stokRows = palsu.sheet('Stok_HP').data();
    expect(stokRows).toHaveLength(2);
    const u1 = stokRows.find(r => r.ID_Unit === unit1Id)!;
    expect(u1.IMEI_1).toBe(FAKE_IMEI_1);
    expect(u1.Kondisi).toBe('Bekas');
    expect(u1.Grade).toBe('A');
    expect(u1.Harga_Beli).toBe(3000000);
    expect(u1.Biaya_Lain).toBe(50000);
    expect(u1.HPP).toBe(3050000);
    expect(u1.Status).toBe('Ready');

    // Cek sheet Pembelian
    const beliRows = palsu.sheet('Pembelian').data();
    expect(beliRows).toHaveLength(1);
    expect(beliRows[0].ID_Supplier).toMatch(/^KTK-/);
    expect(beliRows[0].Total).toBe(5000000);
    expect(beliRows[0].Dibayar).toBe(5000000);
    expect(beliRows[0].Status_Bayar).toBe('Lunas');

    // Cek Pembelian_Item
    const itemRows = palsu.sheet('Pembelian_Item').data();
    expect(itemRows).toHaveLength(2);
    expect(itemRows[0].ID_Unit_atau_SKU).toBe(unit1Id);
    expect(itemRows[1].ID_Unit_atau_SKU).toBe(unit2Id);
  });

  it('1.2 Masuk Barang dengan opsi "Perlu Servis" otomatis berstatus Servis dan membuat tugas di sheet Servis', async () => {
    const payload = {
      namaSupplier: 'TEST_QA_Supplier_Rusak',
      metodeBayar: 'Tunai',
      dibayar: 1500000,
      items: [
        {
          tipe: 'HP',
          namaBarang: 'TEST_QA_Xiaomi Redmi Note 12',
          imei1: FAKE_IMEI_3,
          kondisi: 'Bekas',
          kelengkapan: 'Unit saja',
          hargaBeli: 1500000,
          biayaLain: 0,
          hargaJualTarget: 2200000,
          perluServis: true,
          keluhanServis: 'TEST_QA_LCD blank butuh ganti',
          estimasiServis: 350000,
          pelaksanaServis: 'Teknisi sendiri',
        }
      ]
    };

    const res = await api.apiCall<any>('simpanPembelian', payload, api.buatIdemKey());
    expect(res.ok).toBe(true);
    const unitId = res.data.unitsCreated[0];

    const u = palsu.sheet('Stok_HP').data().find(r => r.ID_Unit === unitId)!;
    expect(u.Status).toBe('Servis');
    expect(u.Estimasi_Servis).toBe(350000);

    const srv = palsu.sheet('Servis').data().find(r => r.ID_Unit === unitId)!;
    expect(srv).toBeDefined();
    expect(srv.Jenis).toBe('Internal');
    expect(srv.Status).toBe('Antri');
    expect(srv.Keluhan).toBe('TEST_QA_LCD blank butuh ganti');
  });

  it('1.3 Masuk Aksesoris menambah stok dan menghitung harga beli rata-rata tertimbang', async () => {
    // Pembelian aksesoris pertama: 10 pcs @ 10.000
    await api.apiCall<any>('simpanPembelian', {
      namaSupplier: 'TEST_QA_Supplier_Aks',
      metodeBayar: 'Tunai',
      dibayar: 100000,
      items: [{
        tipe: 'Aksesoris',
        namaBarang: 'TEST_QA_Tempered Glass A54',
        sku: 'TEST_QA_ACC_01',
        kategori: 'Pelindung layar',
        qty: 10,
        hargaBeli: 10000,
        hargaJualTarget: 25000,
      }]
    }, api.buatIdemKey());

    let aks = palsu.sheet('Stok_Aksesoris').data().find(r => r.SKU === 'TEST_QA_ACC_01')!;
    expect(aks.Stok).toBe(10);
    expect(aks.Harga_Beli_Rata2).toBe(10000);

    // Pembelian aksesoris kedua: 10 pcs @ 20.000 -> rata-rata (10*10rb + 10*20rb) / 20 = 15.000
    await api.apiCall<any>('simpanPembelian', {
      namaSupplier: 'TEST_QA_Supplier_Aks',
      metodeBayar: 'Tunai',
      dibayar: 200000,
      items: [{
        tipe: 'Aksesoris',
        namaBarang: 'TEST_QA_Tempered Glass A54',
        sku: 'TEST_QA_ACC_01',
        kategori: 'Pelindung layar',
        qty: 10,
        hargaBeli: 20000,
        hargaJualTarget: 25000,
      }]
    }, api.buatIdemKey());

    aks = palsu.sheet('Stok_Aksesoris').data().find(r => r.SKU === 'TEST_QA_ACC_01')!;
    expect(aks.Stok).toBe(20);
    expect(aks.Harga_Beli_Rata2).toBe(15000);
  });
});

describe('QA - Form 2: Penjualan Baru (Single, Multi, Bonus, Tukar Tambah, Cicilan)', () => {
  beforeEach(async () => {
    // Siapkan unit ready dan aksesoris di stok
    await api.apiCall('simpanPembelian', {
      namaSupplier: 'TEST_QA_Supplier_Stock',
      metodeBayar: 'Tunai',
      dibayar: 6100000,
      items: [
        {
          tipe: 'HP',
          namaBarang: 'TEST_QA_Samsung Galaxy A54',
          imei1: FAKE_IMEI_1,
          kondisi: 'Baru',
          hargaBeli: 3000000,
          hargaJualTarget: 3500000,
        },
        {
          tipe: 'HP',
          namaBarang: 'TEST_QA_iPhone 13',
          imei1: FAKE_IMEI_2,
          kondisi: 'Bekas',
          hargaBeli: 3000000,
          hargaJualTarget: 3800000,
        },
        {
          tipe: 'Aksesoris',
          namaBarang: 'TEST_QA_Kabel C to C',
          sku: 'TEST_QA_ACC_KBL',
          kategori: 'Kabel',
          qty: 5,
          hargaBeli: 20000,
          hargaJualTarget: 50000,
        }
      ]
    }, api.buatIdemKey());
  });

  it('2.1 Penjualan 1 unit HP tunai lunas mengurangi stok menjadi Terjual dan mencatat laba', async () => {
    const unitId = 'UNT-2610-0001';
    const res = await api.apiCall<any>('simpanPenjualan', {
      namaPelanggan: 'TEST_QA_Pelanggan_Andi',
      noWa: '081299990001',
      items: [{ tipe: 'HP', idUnit: unitId, harga: 3500000 }],
      bonus: [],
      diskon: 50000,
      tukarTambah: { ada: false },
      metodeBayar: 'Tunai',
      dibayar: 3450000,
    }, api.buatIdemKey());

    expect(res.ok).toBe(true);
    expect(res.data.idPenjualan).toMatch(/^JUAL-/);
    expect(res.data.total).toBe(3450000);
    expect(res.data.sisa).toBe(0);

    // Cek unit HP status
    const u = palsu.sheet('Stok_HP').data().find(r => r.ID_Unit === unitId)!;
    expect(u.Status).toBe('Terjual');
    expect(u.ID_Penjualan).toBe(res.data.idPenjualan);

    // Cek Penjualan
    const j = palsu.sheet('Penjualan').data().find(r => r.ID_Penjualan === res.data.idPenjualan)!;
    expect(j.Status_Bayar).toBe('Lunas');
    expect(j.Laba_Kotor).toBe(450000); // 3.450.000 - 3.000.000 (modal)
  });

  it('2.2 Penjualan multi-item + bonus stok & non-stok + tukar tambah + cicilan tempo konsisten di semua sheet', async () => {
    const res = await api.apiCall<any>('simpanPenjualan', {
      namaPelanggan: 'TEST_QA_Pelanggan_Budi',
      noWa: '081299990002',
      items: [
        { tipe: 'HP', idUnit: 'UNT-2610-0002', harga: 3800000 },
        { tipe: 'Aksesoris', sku: 'TEST_QA_ACC_KBL', qty: 1, harga: 50000 }
      ],
      bonus: [
        { tipe: 'Aksesoris', sku: 'TEST_QA_ACC_KBL', qty: 1, nama: 'TEST_QA_Kabel' },
        { tipe: 'Bonus', nama: 'TEST_QA_Voucher Pulsa', hpp: 25000, qty: 1 }
      ],
      diskon: 100000,
      tukarTambah: {
        ada: true,
        model: 'TEST_QA_iPhone 11 64GB',
        imei: FAKE_IMEI_TT,
        nilai: 1500000,
        estimasiJual: 2000000,
        catatan: 'TEST_QA_TT mulus',
      },
      metodeBayar: 'Cicilan',
      dibayar: 1000000,
      jatuhTempo: '2026-11-15',
    }, api.buatIdemKey());

    expect(res.ok).toBe(true);
    const jId = res.data.idPenjualan;
    // Subtotal: 3.800.000 + 50.000 = 3.850.000
    // Total Tagihan: 3.850.000 - 100.000 (diskon) - 1.500.000 (TT) = 2.250.000
    // Sisa: 2.250.000 - 1.000.000 = 1.250.000
    expect(res.data.total).toBe(2250000);
    expect(res.data.sisa).toBe(1250000);

    // Cek stok aksesoris berkurang 2 (1 terjual + 1 bonus stok) dari 5 jadi 3
    const aks = palsu.sheet('Stok_Aksesoris').data().find(r => r.SKU === 'TEST_QA_ACC_KBL')!;
    expect(aks.Stok).toBe(3);

    // Cek unit tukar tambah masuk ke Stok_HP sebagai unit Ready
    const unitTT = palsu.sheet('Stok_HP').data().find(r => r.IMEI_1 === FAKE_IMEI_TT)!;
    expect(unitTT).toBeDefined();
    expect(unitTT.Status).toBe('Ready');
    expect(unitTT.Sumber).toBe('Tukar Tambah');
    expect(unitTT.Harga_Beli).toBe(1500000);
    expect(unitTT.HPP).toBe(1500000);

    // Cek sheet Tukar_Tambah
    const ttRow = palsu.sheet('Tukar_Tambah').data().find(r => r.ID_Penjualan === jId)!;
    expect(ttRow).toBeDefined();
    expect(ttRow.Nilai_Taksir).toBe(1500000);

    // Cek sheet Hutang_Piutang (tagihan cicilan)
    const tgh = palsu.sheet('Hutang_Piutang').data().find(r => r.ID_Referensi === jId)!;
    expect(tgh).toBeDefined();
    expect(tgh.Jenis).toBe('Piutang pelanggan');
    expect(tgh.Total).toBe(2250000);
    expect(tgh.Terbayar).toBe(1000000);
    expect(tgh.Sisa).toBe(1250000);
    expect(tgh.Status).toBe('Sebagian');

    // Cek sheet Pembayaran (bayar DP awal)
    const byr = palsu.sheet('Pembayaran').data().find(r => r.ID_Hutang_Piutang === tgh.ID_Tagihan)!;
    expect(byr).toBeDefined();
    expect(byr.Jumlah).toBe(1000000);
  });
});

describe('QA - Form 3: Tagihan & Pembayaran Cicilan', () => {
  it('3.1 Pembayaran cicilan melunasi piutang dan memperbarui status tagihan & penjualan', async () => {
    // Siapkan pembelian dan penjualan tempo
    await api.apiCall('simpanPembelian', {
      namaSupplier: 'TEST_QA_Supplier_S',
      metodeBayar: 'Tunai',
      dibayar: 2000000,
      items: [{ tipe: 'HP', namaBarang: 'TEST_QA_HP Tempo', imei1: FAKE_IMEI_1, hargaBeli: 2000000 }]
    }, api.buatIdemKey());

    const jual = await api.apiCall<any>('simpanPenjualan', {
      namaPelanggan: 'TEST_QA_Pelanggan_Cicil',
      noWa: '081299990003',
      items: [{ tipe: 'HP', idUnit: 'UNT-2610-0001', harga: 2500000 }],
      metodeBayar: 'Cicilan',
      dibayar: 1500000,
      jatuhTempo: '2026-11-20',
    }, api.buatIdemKey());

    const tghId = jual.data.idTagihan;
    expect(tghId).toBeDefined();

    // Bayar sisa 1.000.000
    const bayar = await api.apiCall<any>('terimaPembayaran', tghId, 1000000, 'Transfer', 'TEST_QA_Pelunasan', api.buatIdemKey());
    expect(bayar.ok).toBe(true);
    expect(bayar.data.sisa).toBe(0);
    expect(bayar.data.status).toBe('Lunas');

    const tgh = palsu.sheet('Hutang_Piutang').data().find(r => r.ID_Tagihan === tghId)!;
    expect(tgh.Sisa).toBe(0);
    expect(tgh.Status).toBe('Lunas');

    const j = palsu.sheet('Penjualan').data().find(r => r.ID_Penjualan === jual.data.idPenjualan)!;
    expect(j.Sisa_Tagihan).toBe(0);
    expect(j.Status_Bayar).toBe('Lunas');
  });

  it('3.2 Tolak pembayaran yang melebihi sisa tagihan', async () => {
    await api.apiCall('simpanPembelian', {
      namaSupplier: 'TEST_QA_Supplier_S',
      metodeBayar: 'Tunai',
      dibayar: 1000000,
      items: [{ tipe: 'HP', namaBarang: 'TEST_QA_HP Tempo 2', imei1: FAKE_IMEI_2, hargaBeli: 1000000 }]
    }, api.buatIdemKey());

    const jual = await api.apiCall<any>('simpanPenjualan', {
      namaPelanggan: 'TEST_QA_Pelanggan_Over',
      noWa: '081299990004',
      items: [{ tipe: 'HP', idUnit: 'UNT-2610-0001', harga: 1500000 }],
      metodeBayar: 'Cicilan',
      dibayar: 1000000,
      jatuhTempo: '2026-11-20',
    }, api.buatIdemKey());

    // Sisa adalah 500.000; coba bayar 600.000
    const res = await api.apiCall<any>('terimaPembayaran', jual.data.idTagihan, 600000, 'Tunai', 'Lebih', api.buatIdemKey());
    expect(res.ok).toBe(false);
    expect(res.kode).toBe('MELEBIHI_SISA');
  });
});

describe('QA - Form 4: Pembatalan Transaksi', () => {
  it('4.1 Membatalkan penjualan mengembalikan unit ke status Ready dan membatalkan piutang', async () => {
    await api.apiCall('simpanPembelian', {
      namaSupplier: 'TEST_QA_Sup',
      metodeBayar: 'Tunai',
      dibayar: 2000000,
      items: [{ tipe: 'HP', namaBarang: 'TEST_QA_HP Batal', imei1: FAKE_IMEI_1, hargaBeli: 2000000 }]
    }, api.buatIdemKey());

    const jual = await api.apiCall<any>('simpanPenjualan', {
      namaPelanggan: 'TEST_QA_Pelanggan_Batal',
      noWa: '081299990002',
      items: [{ tipe: 'HP', idUnit: 'UNT-2610-0001', harga: 2500000 }],
      metodeBayar: 'Cicilan',
      dibayar: 1000000,
      jatuhTempo: '2026-11-20',
    }, api.buatIdemKey());

    const jId = jual.data.idPenjualan;
    const batal = await api.apiCall<any>('batalkanTransaksi', jId, 'TEST_QA_Batal beli', 'Salah barang', api.buatIdemKey());
    expect(batal.ok).toBe(true);

    // Unit kembali Ready
    const u = palsu.sheet('Stok_HP').data().find(r => r.ID_Unit === 'UNT-2610-0001')!;
    expect(u.Status).toBe('Ready');
    expect(u.ID_Penjualan).toBe('');

    // Status penjualan Batal
    const j = palsu.sheet('Penjualan').data().find(r => r.ID_Penjualan === jId)!;
    expect(j.Status).toBe('Batal');

    // Tagihan dibatalkan
    const tgh = palsu.sheet('Hutang_Piutang').data().find(r => r.ID_Referensi === jId)!;
    expect(tgh.Status).toBe('Batal');
  });
});

describe('QA - Form 5: Servis (Pelanggan & Internal)', () => {
  it('5.1 Servis Pelanggan: catat baru -> kerjakan -> selesai dengan biaya part & jasa', async () => {
    const srv = await api.apiCall<any>('simpanServis', {
      jenis: 'Pelanggan',
      namaPerangkat: 'TEST_QA_Oppo Reno 8',
      imei: FAKE_IMEI_4,
      namaPelanggan: 'TEST_QA_Pelanggan_Servis',
      noWa: '081299990005',
      keluhan: 'TEST_QA_Port charger goyang',
      pelaksana: 'Teknisi sendiri',
      estimasiBiaya: 100000,
      tarifPelanggan: 200000,
    }, api.buatIdemKey());

    expect(srv.ok).toBe(true);
    const srvId = srv.data.idServis;

    // Ubah ke Dikerjakan
    const dikerjakan = await api.apiCall<any>('updateStatusServis', srvId, 'Dikerjakan', {}, api.buatIdemKey());
    expect(dikerjakan.ok).toBe(true);

    // Selesaikan dengan biaya part 40rb, jasa 60rb -> total biaya 100rb, tarif 200rb, laba 100rb
    const selesai = await api.apiCall<any>('updateStatusServis', srvId, 'Selesai', {
      biayaPart: 40000,
      biayaJasa: 60000,
      jadikanReady: false,
    }, api.buatIdemKey());

    expect(selesai.ok).toBe(true);
    expect(selesai.data.labaServis).toBe(100000);

    const s = palsu.sheet('Servis').data().find(r => r.ID_Servis === srvId)!;
    expect(s.Status).toBe('Selesai');
    expect(s.Biaya_Part).toBe(40000);
    expect(s.Biaya_Jasa_Teknisi).toBe(60000);
    expect(s.Laba_Servis).toBe(100000);
  });

  it('5.2 Servis Internal: Selesai menaikkan HPP unit dan mengubah status menjadi Ready', async () => {
    // Masukkan unit rusak
    await api.apiCall('simpanPembelian', {
      namaSupplier: 'TEST_QA_Sup',
      metodeBayar: 'Tunai',
      dibayar: 2000000,
      items: [{
        tipe: 'HP',
        namaBarang: 'TEST_QA_Unit Rusak',
        imei1: FAKE_IMEI_1,
        hargaBeli: 2000000,
        perluServis: true,
        keluhanServis: 'TEST_QA_LCD Rusak',
        estimasiServis: 400000,
      }]
    }, api.buatIdemKey());

    const srvRow = palsu.sheet('Servis').data().find(r => r.ID_Unit === 'UNT-2610-0001')!;
    expect(srvRow).toBeDefined();

    // Selesaikan servis internal: biaya part 300rb, jasa 100rb -> HPP naik dari 2jt menjadi 2.4jt
    const selesai = await api.apiCall<any>('updateStatusServis', srvRow.ID_Servis, 'Selesai', {
      biayaPart: 300000,
      biayaJasa: 100000,
      jadikanReady: true,
    }, api.buatIdemKey());

    expect(selesai.ok).toBe(true);
    expect(selesai.data.hppBaru).toBe(2400000);

    const u = palsu.sheet('Stok_HP').data().find(r => r.ID_Unit === 'UNT-2610-0001')!;
    expect(u.Status).toBe('Ready');
    expect(u.Biaya_Servis).toBe(400000);
    expect(u.HPP).toBe(2400000);
  });
});

describe('QA - Form 6: Master Kontak & Katalog Produk', () => {
  it('6.1 Tambah Kontak tersimpan dengan normalisasi No_WA', async () => {
    const res = await api.apiCall<any>('simpanKontak', {
      nama: 'TEST_QA_Kontak_Baru',
      tipe: 'Supplier',
      noWa: '0812-3456-7899',
      alamat: 'TEST_QA_Jl. Jenderal Sudirman 10',
      catatan: 'TEST_QA_Supplier aksesoris',
    }, api.buatIdemKey());

    expect(res.ok).toBe(true);
    const k = palsu.sheet('Kontak').data().find(r => r.ID_Kontak === res.data.idKontak)!;
    expect(k.Nama).toBe('TEST_QA_Kontak_Baru');
    expect(k.Tipe).toBe('Supplier');
    expect(k.No_WA).toBe('6281234567899');
  });

  it('6.2 Tambah Katalog Produk menyusun Nama_Lengkap otomatis', async () => {
    const res = await api.apiCall<any>('simpanProduk', {
      jenis: 'HP',
      platform: 'Android',
      merek: 'Samsung',
      model: 'TEST_QA_Galaxy S25 Ultra',
      varian: '12/512 GB',
      warna: 'Titanium Gray',
      hargaStandar: 21000000,
    }, api.buatIdemKey());

    expect(res.ok).toBe(true);
    const p = palsu.sheet('Produk').data().find(r => r.ID_Produk === res.data.idProduk)!;
    expect(p.Nama_Lengkap).toBe('Samsung TEST_QA_Galaxy S25 Ultra 12/512 GB Titanium Gray');
    expect(p.Harga_Jual_Standar).toBe(21000000);
  });
});

describe('QA - Form 7: Biaya Operasional, Pengaturan, & Log Aktivitas', () => {
  it('7.1 Catat Biaya Operasional tersimpan di Biaya_Operasional dan Log_Aktivitas', async () => {
    const res = await api.apiCall<any>('simpanBiaya', {
      kategori: 'Listrik',
      nominal: 250000,
      tanggal: '2026-10-14',
      catatan: 'TEST_QA_Listrik bulan Oktober',
    }, api.buatIdemKey());

    expect(res.ok).toBe(true);
    const b = palsu.sheet('Biaya_Operasional').data().find(r => r.Catatan === 'TEST_QA_Listrik bulan Oktober')!;
    expect(b).toBeDefined();
    expect(b.Nominal).toBe(250000);

    const logs = palsu.sheet('Log_Aktivitas').data();
    expect(logs.some(l => l.Sheet === 'Biaya_Operasional')).toBe(true);
  });

  it('7.2 Simpan Pengaturan memperbarui nilai di sheet Pengaturan', async () => {
    const res = await api.apiCall<any>('simpanPengaturan', {
      TAGLINE: 'TEST_QA_Tagline_Updated',
      BATAS_UMUR_STOK_HARI: '45',
    });
    expect(res.ok).toBe(true);

    const pRows = palsu.sheet('Pengaturan').data();
    const tag = pRows.find(r => r.Kunci === 'TAGLINE')!;
    expect(tag.Nilai).toBe('TEST_QA_Tagline_Updated');
    const umur = pRows.find(r => r.Kunci === 'BATAS_UMUR_STOK_HARI')!;
    expect(umur.Nilai).toBe('45');
  });
});

describe('QA - Form 8: Garansi & Klaim Retur Refund', () => {
  it('8.1 Cek status garansi dan simpan klaim refund', async () => {
    await api.apiCall('simpanPembelian', {
      namaSupplier: 'TEST_QA_Sup',
      metodeBayar: 'Tunai',
      dibayar: 3000000,
      items: [{ tipe: 'HP', namaBarang: 'TEST_QA_HP Garansi', imei1: FAKE_IMEI_1, hargaBeli: 3000000 }]
    }, api.buatIdemKey());

    const jual = await api.apiCall<any>('simpanPenjualan', {
      namaPelanggan: 'TEST_QA_Pelanggan_Garansi',
      noWa: '081299990006',
      items: [{ tipe: 'HP', idUnit: 'UNT-2610-0001', harga: 3500000 }],
      metodeBayar: 'Tunai',
      dibayar: 3500000,
    }, api.buatIdemKey());

    const g = await api.apiCall<any>('cekGaransi', FAKE_IMEI_1);
    expect(g.ok).toBe(true);
    expect(g.data.statusGaransi).toBe('Aktif');

    const klaim = await api.apiCall<any>('simpanKlaim', {
      referensi: jual.data.idPenjualan,
      jenis: 'Refund',
      alasan: 'TEST_QA_Layar flicker',
      catatan: 'TEST_QA_Refund 150rb',
      tindakan: 'Refund',
      nilaiRefund: 150000,
    }, api.buatIdemKey());

    expect(klaim.ok).toBe(true);
    expect(klaim.data.masihGaransi).toBe(true);

    const klmRow = palsu.sheet('Garansi_Retur').data().find(r => r.ID_Klaim === klaim.data.idKlaim)!;
    expect(klmRow.Jenis).toBe('Refund');
    expect(klmRow.Nilai_Refund).toBe(150000);
    expect(klmRow.Dampak_Laba).toBe(-150000);
  });
});

describe('QA - Tahap 4: Uji Kasus Tepi (Edge Cases & Keamanan)', () => {
  it('4.1 Field wajib kosong ditolak', async () => {
    const r1 = await api.apiCall<any>('simpanPembelian', { namaSupplier: '', items: [] }, api.buatIdemKey());
    expect(r1.ok).toBe(false);
    expect(r1.kode).toBe('DATA_KOSONG');

    const r2 = await api.apiCall<any>('simpanPenjualan', { items: [] }, api.buatIdemKey());
    expect(r2.ok).toBe(false);
    expect(r2.kode).toBe('DATA_KOSONG');
  });

  it('4.2 Harga negatif atau angka tidak sah ditolak', async () => {
    const r = await api.apiCall<any>('simpanPembelian', {
      namaSupplier: 'TEST_QA_Sup',
      metodeBayar: 'Tunai',
      dibayar: 1000,
      items: [{ tipe: 'HP', namaBarang: 'TEST_QA', imei1: FAKE_IMEI_1, hargaBeli: -50000 }]
    }, api.buatIdemKey());
    expect(r.ok).toBe(false);
    expect(r.kode).toBe('HARGA_TIDAK_VALID');
  });

  it('4.3 IMEI tidak 15 digit atau duplikat ditolak', async () => {
    // 14 digit
    const r1 = await api.apiCall<any>('simpanPembelian', {
      namaSupplier: 'TEST_QA_Sup',
      metodeBayar: 'Tunai',
      dibayar: 1000,
      items: [{ tipe: 'HP', namaBarang: 'TEST_QA', imei1: '12345678901234', hargaBeli: 100000 }]
    }, api.buatIdemKey());
    expect(r1.ok).toBe(false);
    expect(r1.kode).toBe('IMEI_TIDAK_VALID');

    // Masukkan IMEI sah
    await api.apiCall('simpanPembelian', {
      namaSupplier: 'TEST_QA_Sup',
      metodeBayar: 'Tunai',
      dibayar: 100000,
      items: [{ tipe: 'HP', namaBarang: 'TEST_QA', imei1: FAKE_IMEI_1, hargaBeli: 100000 }]
    }, api.buatIdemKey());

    // Coba masukkan IMEI yang sama lagi saat masih Ready
    const r2 = await api.apiCall<any>('simpanPembelian', {
      namaSupplier: 'TEST_QA_Sup2',
      metodeBayar: 'Tunai',
      dibayar: 100000,
      items: [{ tipe: 'HP', namaBarang: 'TEST_QA 2', imei1: FAKE_IMEI_1, hargaBeli: 100000 }]
    }, api.buatIdemKey());
    expect(r2.ok).toBe(false);
    expect(r2.kode).toBe('IMEI_GANDA');
  });

  it('4.4 Double submit (ketukan ganda) dicegah oleh idemKey', async () => {
    const key = api.buatIdemKey();
    const payload = {
      namaSupplier: 'TEST_QA_Sup_Idem',
      metodeBayar: 'Tunai',
      dibayar: 100000,
      items: [{ tipe: 'Aksesoris', namaBarang: 'TEST_QA_Idem', sku: 'ACC_IDEM', qty: 5, hargaBeli: 10000 }]
    };

    const res1 = await api.apiCall<any>('simpanPembelian', payload, key);
    expect(res1.ok).toBe(true);

    // Panggilan kedua dengan idemKey yang sama
    const res2 = await api.apiCall<any>('simpanPembelian', payload, key);
    expect(res2.ok).toBe(true);
    expect(res2.data.idPembelian).toBe(res1.data.idPembelian);

    // Baris di Pembelian hanya bertambah 1, bukan 2!
    const beliRows = palsu.sheet('Pembelian').data().filter(r => r.Catatan?.includes('Idem') || r.ID_Pembelian === res1.data.idPembelian);
    expect(beliRows).toHaveLength(1);
  });

  it('4.5 Sanitasi teks mencegah formula injection (=, +, -, @)', async () => {
    const res = await api.apiCall<any>('simpanKontak', {
      nama: '=SUM(A1:A10)',
      tipe: 'Supplier',
      catatan: '+cmd|"/C calc"!A0',
    }, api.buatIdemKey());

    expect(res.ok).toBe(true);
    const k = palsu.sheet('Kontak').data().find(r => r.ID_Kontak === res.data.idKontak)!;
    expect(k.Nama).toBe('SUM(A1:A10)'); // Tanda = di awal dihilangkan
    expect(k.Catatan).toBe('cmd|"/C calc"!A0'); // Tanda + di awal dihilangkan
  });
});
