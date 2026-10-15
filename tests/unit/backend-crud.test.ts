// tests/unit/backend-crud.test.ts — Pengujian CRUD Lengkap (Create, Read, Update, Delete/Batal)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { pasangGasFake, Palsu } from '../helpers/gas-fake';
import { pasangDriveFake, siapkanFolder } from '../helpers/drive-fake';
import { HEADER } from '../../src/backend/Skema';

let palsu: Palsu;
let Code: typeof import('../../src/backend/Code');

const FAKE_IMEI = '990000000000010';

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-15T03:00:00Z'));
  palsu = pasangGasFake();
  const drive = pasangDriveFake();
  siapkanFolder(drive, ['EPICPHONE_00_SISTEM/01_DATABASE']);
  Code = await import('../../src/backend/Code');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CRUD Unit HP & Pembelian', () => {
  it('dapat mengedit data unit HP dan membatalkan unit salah masuk', () => {
    // 1. Simpan Pembelian (Barang Masuk)
    const resBeli = Code.simpanPembelian({
      namaSupplier: 'Supplier Mitra',
      metodeBayar: 'Tunai',
      dibayar: 2000000,
      items: [{
        tipe: 'HP',
        namaBarang: 'iPhone 12 128GB Blue',
        imei1: FAKE_IMEI,
        kondisi: 'Bekas',
        grade: 'B',
        kelengkapan: 'Batangan',
        hargaBeli: 2000000,
        hargaJualTarget: 2500000,
      }],
    });
    expect(resBeli.ok).toBe(true);
    const idUnit = (resBeli as any).data.unitsCreated[0];

    // 2. Edit Unit HP
    const resEdit = Code.editUnit(idUnit, {
      hargaJualTarget: 2700000,
      grade: 'A',
      kelengkapan: 'Fullset',
      catatan: 'Kondisi mulus 99%',
    });
    expect(resEdit.ok).toBe(true);
    const unitDb = palsu.sheet('Stok_HP').data().find(u => u.ID_Unit === idUnit);
    expect(unitDb.Harga_Jual_Target).toBe(2700000);
    expect(unitDb.Grade).toBe('A');
    expect(unitDb.Kelengkapan).toBe('Fullset');
    expect(unitDb.Catatan).toBe('Kondisi mulus 99%');

    // 3. Hapus (Soft Delete / Batal) Unit HP salah input
    const resHapus = Code.hapusUnit(idUnit, 'Salah input IMEI');
    expect(resHapus.ok).toBe(true);
    const unitDbBatal = palsu.sheet('Stok_HP').data().find(u => u.ID_Unit === idUnit);
    expect(unitDbBatal.Status).toBe('Batal');
    expect(unitDbBatal.Catatan).toContain('[BATAL: Salah input IMEI]');
  });

  it('dapat membatalkan transaksi pembelian dan menarik stoknya', () => {
    const resBeli = Code.simpanPembelian({
      namaSupplier: 'Supplier Tempo',
      metodeBayar: 'Tempo',
      dibayar: 500000,
      jatuhTempo: '2026-10-25',
      items: [
        { tipe: 'HP', namaBarang: 'Samsung A54 5G', imei1: '990000000000011', hargaBeli: 3000000 },
        { tipe: 'Aksesoris', namaBarang: 'Case A54 Transparan', sku: 'ACC-A54', qty: 5, hargaBeli: 20000 },
      ],
    });
    expect(resBeli.ok).toBe(true);
    const idPembelian = (resBeli as any).data.idPembelian;

    // Batalkan Pembelian
    const resBatal = Code.batalkanTransaksi(idPembelian, 'Supplier salah kirim');
    expect(resBatal.ok).toBe(true);

    const beliDb = palsu.sheet('Pembelian').data().find(p => p.ID_Pembelian === idPembelian);
    expect(beliDb.Status).toBe('Batal');

    const unitDb = palsu.sheet('Stok_HP').data().find(u => u.IMEI_1 === '990000000000011');
    expect(unitDb.Status).toBe('Batal');

    const aksDb = palsu.sheet('Stok_Aksesoris').data().find(a => a.SKU === 'ACC-A54');
    expect(aksDb.Stok).toBe(0); // dikurangi kembali

    const tagihanDb = palsu.sheet('Hutang_Piutang').data().find(h => h.ID_Referensi === idPembelian);
    expect(tagihanDb.Status).toBe('Batal');
  });
});

describe('CRUD Aksesoris', () => {
  it('dapat menambah, mengedit, dan menghapus aksesoris', () => {
    const resSimpan = Code.simpanAksesoris({
      namaBarang: 'Charger 20W USB-C',
      kategori: 'Charger',
      stok: 10,
      stokMinimum: 2,
      hargaBeliRata2: 45000,
      hargaJual: 85000,
    });
    expect(resSimpan.ok).toBe(true);
    const sku = (resSimpan as any).data.SKU;

    // Edit Aksesoris
    const resEdit = Code.editAksesoris(sku, {
      stok: 15,
      hargaJual: 90000,
      kategori: 'Fast Charger',
    });
    expect(resEdit.ok).toBe(true);
    const aksDb = palsu.sheet('Stok_Aksesoris').data().find(a => a.SKU === sku);
    expect(aksDb.Stok).toBe(15);
    expect(aksDb.Harga_Jual).toBe(90000);
    expect(aksDb.Kategori).toBe('Fast Charger');

    // Hapus Aksesoris
    const resHapus = Code.hapusAksesoris(sku, 'Tidak dijual lagi');
    expect(resHapus.ok).toBe(true);
    const aksBatal = palsu.sheet('Stok_Aksesoris').data().find(a => a.SKU === sku);
    expect(aksBatal.Status).toBe('Batal');
  });
});

describe('CRUD Kontak & Biaya & Servis', () => {
  it('dapat mengedit dan menonaktifkan kontak', () => {
    const resK = Code.simpanKontak({
      nama: 'Budi Santoso',
      tipe: 'Pelanggan',
      noWa: '081234567890',
      alamat: 'Purwokerto Utara',
    });
    expect(resK.ok).toBe(true);
    const idKontak = (resK as any).data.idKontak;

    const resEdit = Code.editKontak(idKontak, {
      nama: 'Budi Santoso VIP',
      alamat: 'Jl. Overste Isdiman',
    });
    expect(resEdit.ok).toBe(true);
    const kDb = palsu.sheet('Kontak').data().find(k => k.ID_Kontak === idKontak);
    expect(kDb.Nama).toBe('Budi Santoso VIP');
    expect(kDb.Alamat).toBe('Jl. Overste Isdiman');

    const resHapus = Code.hapusKontak(idKontak, 'Pindah kota');
    expect(resHapus.ok).toBe(true);
    const kNonaktif = palsu.sheet('Kontak').data().find(k => k.ID_Kontak === idKontak);
    expect(kNonaktif.Tipe).toBe('Nonaktif');
  });

  it('dapat mengedit dan membatalkan biaya operasional', () => {
    const resB = Code.simpanBiaya({
      kategori: 'Listrik',
      nominal: 200000,
      catatan: 'Token listrik awal bulan',
    });
    expect(resB.ok).toBe(true);
    const idBiaya = (resB as any).data.idBiaya;

    const resEdit = Code.editBiaya(idBiaya, {
      nominal: 250000,
      catatan: 'Token listrik 250k',
    });
    expect(resEdit.ok).toBe(true);
    const bDb = palsu.sheet('Biaya_Operasional').data().find(b => b.ID_Biaya === idBiaya);
    expect(bDb.Nominal).toBe(250000);
    expect(bDb.Catatan).toBe('Token listrik 250k');

    const resHapus = Code.hapusBiaya(idBiaya, 'Salah catat');
    expect(resHapus.ok).toBe(true);
    const bBatal = palsu.sheet('Biaya_Operasional').data().find(b => b.ID_Biaya === idBiaya);
    expect(bBatal.Nominal).toBe(0);
    expect(bBatal.Catatan).toContain('[BATAL: Salah catat]');
  });

  it('dapat mengedit dan membatalkan tiket servis', () => {
    const resS = Code.simpanServis({
      jenis: 'Pelanggan',
      namaPerangkat: 'Redmi Note 11',
      namaPelanggan: 'Agus',
      noWa: '085712345678',
      keluhan: 'Layar retak',
      estimasiBiaya: 350000,
    });
    expect(resS.ok).toBe(true);
    const idServis = (resS as any).data.idServis;

    const resEdit = Code.editServis(idServis, {
      keluhan: 'Layar retak dan baterai drop',
      estimasiBiaya: 500000,
    });
    expect(resEdit.ok).toBe(true);
    const sDb = palsu.sheet('Servis').data().find(s => s.ID_Servis === idServis);
    expect(sDb.Keluhan).toBe('Layar retak dan baterai drop');
    expect(sDb.Estimasi_Biaya).toBe(500000);

    const resBatal = Code.batalkanServis(idServis, 'Pelanggan tidak jadi servis');
    expect(resBatal.ok).toBe(true);
    const sBatal = palsu.sheet('Servis').data().find(s => s.ID_Servis === idServis);
    expect(sBatal.Status).toBe('Batal');
  });
});
