// integrasi-frontend-backend.test.ts — lapisan api.ts frontend memanggil backend ASLI
// lewat google.script.run palsu (meniru aturan Apps Script: Date tidak boleh lewat, data lewat JSON).
// Memastikan bentuk data dari server benar-benar dipahami fungsi frontend (dashboard, peringatan, nota).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { pasangGasFake, Palsu } from '../helpers/gas-fake';

let palsu: Palsu;
let api: typeof import('../../src/frontend/lib/api');
let derive: typeof import('../../src/frontend/lib/derive');
let nota: typeof import('../../src/frontend/lib/nota');

const IMEI_A = '358123456789012';
const IMEI_TT = '490154203237518';

function adaDate(v: unknown): boolean {
  return v instanceof Date || (!!v && typeof v === 'object' && Object.values(v as object).some(adaDate));
}

/** google.script.run palsu: withSuccessHandler/withFailureHandler + pemanggilan fungsi global */
function pasangRunner(Code: Record<string, (...a: unknown[]) => unknown>) {
  const buat = (ok?: (r: unknown) => void, gagal?: (e: Error) => void): unknown =>
    new Proxy({} as Record<string, unknown>, {
      get(_t, prop: string) {
        if (prop === 'withSuccessHandler') return (f: (r: unknown) => void) => buat(f, gagal);
        if (prop === 'withFailureHandler') return (f: (e: Error) => void) => buat(ok, f);
        if (typeof Code[prop] !== 'function') return undefined;
        return (...args: unknown[]) => setTimeout(() => {
          if (args.some(adaDate)) return gagal?.(new Error('Parameter tidak sah: Date'));
          try {
            const hasil = Code[prop](...(JSON.parse(JSON.stringify(args)) as unknown[]));
            ok?.(adaDate(hasil) ? null : JSON.parse(JSON.stringify(hasil)));
          } catch (e) { gagal?.(e as Error); }
        }, 0);
      },
    });
  (globalThis as any).window = globalThis;
  (globalThis as any).google = { script: { run: buat() } };
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T03:00:00Z')); // 07 Okt 2026 10:00 WIB
  palsu = pasangGasFake();
  const Code = await import('../../src/backend/Code');
  pasangRunner(Code as any);
  api = await import('../../src/frontend/lib/api');
  derive = await import('../../src/frontend/lib/derive');
  nota = await import('../../src/frontend/lib/nota');
});
afterEach(() => {
  vi.useRealTimers();
  delete (globalThis as any).window;
  delete (globalThis as any).google;
});

describe('api.ts <-> backend', () => {
  it('alur lengkap: barang masuk -> jual tempo -> bayar -> dashboard & nota dari data server', async () => {
    // 0. database kosong
    const kosong = await api.apiCall<any>('getSemuaData');
    expect(kosong.ok).toBe(true);
    expect(kosong.data.stok).toEqual([]);

    // 1. Barang masuk — payload persis seperti handleSimpanBarangMasuk
    const beli = await api.apiCall<any>('simpanPembelian', {
      namaSupplier: 'CV Maju', metodeBayar: 'Tunai', dibayar: 3000000,
      items: [{
        tipe: 'HP', namaBarang: 'Samsung Galaxy A54', imei1: IMEI_A, kondisi: 'Baru', grade: undefined,
        kelengkapan: 'Fullset', bateraiPersen: 100, bebasKunciAkun: 'Ya', hargaBeli: 3000000, biayaLain: 0,
        hargaJualTarget: 3500000, perluServis: false, keluhanServis: '', estimasiServis: 0,
      }],
    }, api.buatIdemKey());
    expect(beli.ok).toBe(true);
    expect(beli.data.unitsCreated).toEqual(['UNT-2610-0001']);

    // 2. Jual dengan piutang — payload persis seperti PayloadJual dari JualModal
    const jual = await api.apiCall<any>('simpanPenjualan', {
      namaPelanggan: 'Budi Santoso', noWa: '0812-3456-7890',
      items: [{ tipe: 'HP', idUnit: 'UNT-2610-0001', harga: 3500000 }],
      bonus: [{ nama: 'Tempered glass', qty: 1, hpp: 15000 }],
      diskon: 100000, tukarTambah: { ada: true, model: 'iPhone 11', imei: IMEI_TT, nilai: 1000000 },
      metodeBayar: 'Cicilan', dibayar: 1000000, jatuhTempo: '2026-10-10',
    }, api.buatIdemKey());
    expect(jual.ok).toBe(true);
    expect(jual.data).toMatchObject({ idPenjualan: 'JUAL-2610-0001', total: 2400000, sisa: 1400000, garansiSampai: '07 Okt 2027 (12 bulan)' });

    // 3. Bayar sebagian
    const bayar = await api.apiCall<any>('terimaPembayaran', 'TGH-2610-0001', 400000, 'Transfer', 'cicil 1', api.buatIdemKey());
    expect(bayar).toMatchObject({ ok: true, data: { sisa: 1000000, status: 'Sebagian' } });

    // 4. Muat ulang semua dan pakai fungsi frontend yang sebenarnya
    const res = await api.apiCall<import('../../src/frontend/lib/api').DataServer>('getSemuaData');
    expect(res.ok).toBe(true);
    const d = res.data!;
    expect(d.stok.map(u => [u.id, u.status])).toEqual(expect.arrayContaining([['UNT-2610-0001', 'Terjual'], ['UNT-2610-0002', 'Ready']]));

    const dash = derive.hitungDashboard({ transaksi: d.transaksi, stok: d.stok, tagihan: d.tagihan, servis: [] });
    expect(dash.tanggalRef).toBe('07 Okt 2026');
    expect(dash.hariIni.omzet).toBeGreaterThan(0);
    expect(dash.stokReady).toBe(1);
    expect(dash.piutang).toBe(1000000);

    const peringatan = derive.buatPeringatan({ transaksi: d.transaksi, stok: d.stok, aksesoris: d.aksesoris, tagihan: d.tagihan, servis: [] });
    expect(peringatan.some(p => p.id === 'tmp-TGH-2610-0001')).toBe(true); // jatuh tempo 3 hari lagi

    // 5. Nota dari riwayat memakai angka & garansi server
    const trx = d.transaksi.find(t => t.id === 'JUAL-2610-0001')!;
    const n = nota.notaDariTransaksi(trx);
    expect(n).toMatchObject({ noNota: 'JUAL-2610-0001', namaPelanggan: 'Budi Santoso', diskon: 100000, totalTagihan: 2400000, dibayar: 1400000, sisa: 1000000, garansiSampai: '07 Okt 2027 (12 bulan)' });
    expect(n.tukarTambah).toMatchObject({ ada: true, unit: 'iPhone 11', nilai: 1000000 });
    expect(n.bonus.map(b => b.nama)).toEqual(['Tempered glass']);
    expect(d.tagihan[0].noWa).toBe('081234567890');
  });

  it('kontrak data fitur lanjutan: laporan, garansi, foto, nota, servis, klaim, biaya sama bentuknya dengan yang dibaca layar', async () => {
    const { pasangDriveFake, siapkanFolder } = await import('../helpers/drive-fake');
    const drive = pasangDriveFake();
    siapkanFolder(drive, ['EPICPHONE_00_SISTEM/02_FOTO-HP', 'EPICPHONE_00_SISTEM/03_NOTA/RIWAYAT', 'EPICPHONE_00_SISTEM/05_SERVIS', 'EPICPHONE_00_SISTEM/06_LAPORAN']);
    const { laporanContoh } = await import('../../src/frontend/lib/laporan');

    await api.apiCall('simpanPembelian', { namaSupplier: 'CV Maju', metodeBayar: 'Tunai', dibayar: 3000000, items: [{ tipe: 'HP', namaBarang: 'Samsung Galaxy A54', imei1: IMEI_A, kondisi: 'Bekas', hargaBeli: 3000000, hargaJualTarget: 3500000 }] }, api.buatIdemKey());
    const jual = await api.apiCall<any>('simpanPenjualan', { namaPelanggan: 'Budi', noWa: '081234567890', items: [{ tipe: 'HP', idUnit: 'UNT-2610-0001', harga: 3500000 }], bonus: [], diskon: 0, tukarTambah: { ada: false }, metodeBayar: 'Tunai', dibayar: 3500000 }, api.buatIdemKey());
    expect(jual.ok).toBe(true);

    // Garansi: bentuk HasilCariGaransi
    const g = await api.apiCall<any>('cekGaransi', IMEI_A.slice(-4));
    expect(Object.keys(g.data).sort()).toEqual(expect.arrayContaining(['unit', 'imei', 'nota', 'tglJual', 'pelanggan', 'garansiSampai', 'sisaHari', 'statusGaransi']));
    expect(g.data).toMatchObject({ unit: 'Samsung Galaxy A54', nota: 'JUAL-2610-0001', garansiSampai: '14 Okt 2026', sisaHari: 7, statusGaransi: 'Aktif' });
    // klaim persis seperti GaransiScreen mengirim
    const k = await api.apiCall<any>('simpanKlaim', { referensi: 'JUAL-2610-0001', jenis: 'Refund', alasan: 'Lecet', catatan: '', tindakan: 'Refund', nilaiRefund: 100000 }, api.buatIdemKey());
    expect(k).toMatchObject({ ok: true, data: { idKlaim: 'KLM-2610-0001', masihGaransi: true } });

    // Servis & biaya persis seperti app.tsx mengirim
    const sv = await api.apiCall<any>('simpanServis', { jenis: 'Pelanggan', namaPerangkat: 'iPhone 11', namaPelanggan: 'Siti', noWa: '0812-1111-2222', keluhan: 'Baterai', pelaksana: 'Teknisi sendiri', estimasiBiaya: 400000, tarifPelanggan: 300000 }, api.buatIdemKey());
    expect(sv.ok).toBe(true);
    expect((await api.apiCall<any>('updateStatusServis', sv.data.idServis, 'Selesai', { biayaPart: 100000, biayaJasa: 50000, jadikanReady: false }, api.buatIdemKey())).data.labaServis).toBe(150000);
    expect((await api.apiCall<any>('simpanBiaya', { kategori: 'Listrik', nominal: 200000, tanggal: '2026-10-07', catatan: 'Token' }, api.buatIdemKey())).ok).toBe(true);

    // Foto: unggah lalu daftar (bentuk FotoServer)
    const f = await api.apiCall<any>('unggahFoto', { jenisReferensi: 'Unit', idReferensi: 'UNT-2610-0001', posisi: 'DEPAN', base64Data: Buffer.from('x').toString('base64'), mimeType: 'image/jpeg' }, api.buatIdemKey());
    expect(f.ok).toBe(true);
    const daftar = await api.apiCall<any[]>('getFotoReferensi', 'Unit', 'UNT-2610-0001');
    expect(Object.keys(daftar.data![0]).sort()).toEqual(['idBerkas', 'link', 'nama', 'posisi', 'pratinjau', 'urutan']);

    // Nota: buat lalu buka ulang tanpa versi baru
    const n1 = await api.apiCall<any>('buatNota', 'JUAL-2610-0001');
    expect(Object.keys(n1.data).sort()).toEqual(['base64', 'idFile', 'nama', 'urlLihat', 'urlUnduh']);
    const n2 = await api.apiCall<any>('ambilNota', 'JUAL-2610-0001');
    expect(n2.data.idFile).toBe(n1.data.idFile);

    // getSemuaData: servis/klaim/biaya sesuai tipe layar
    const d = (await api.apiCall<import('../../src/frontend/lib/api').DataServer>('getSemuaData')).data!;
    expect(Object.keys(d.servis[0]).sort()).toEqual(expect.arrayContaining(['id', 'tglMasuk', 'jenis', 'namaPerangkat', 'imei', 'namaPelanggan', 'noWa', 'keluhan', 'teknisi', 'estimasiBiaya', 'biayaPart', 'biayaJasa', 'tarifPelanggan', 'status', 'tahap']));
    expect(Object.keys(d.klaim[0]).sort()).toEqual(expect.arrayContaining(['id', 'tanggal', 'notaId', 'imei', 'namaBarang', 'pelanggan', 'jenis', 'alasan', 'status', 'tindakan', 'dampakLaba']));
    expect(Object.keys(d.biaya[0]).sort()).toEqual(['id', 'kategori', 'keterangan', 'nominal', 'tanggal']);
    const dash = derive.hitungDashboard({ transaksi: d.transaksi, stok: d.stok, tagihan: d.tagihan, servis: d.servis, demo: false });
    expect(dash.tanggalRef).toBe('07 Okt 2026');
    expect(dash.hariIni.omzet).toBeGreaterThan(0);
    expect(dash.tren.every(t => t.contoh === false)).toBe(true); // tidak ada angka contoh di data nyata

    // Laporan: kunci objek server SAMA dengan contoh yang dipakai mode demo (kontrak layar)
    const lap = await api.apiCall<any>('getLaporanLayar', 'bulan-ini');
    expect(Object.keys(lap.data).sort()).toEqual(Object.keys(laporanContoh()).sort());
    expect(lap.data).toMatchObject({ periode: 'Oktober 2026', omzet: 3500000, labaKotorHP: 500000, kerugianRefund: 100000, labaServis: 150000, biayaOperasional: 200000 });
    expect(lap.data.labaBersih).toBe(500000 + 150000 - 100000 - 200000);
    const pdf = await api.apiCall<any>('buatLaporanPdf', '2026-10');
    expect(pdf.data.nama).toBe('EPICPHONE_LAPORAN_LABA_2026-10.pdf');
  });

  it('galat server tampil sebagai { ok:false, kode, pesan } di sisi frontend', async () => {
    const r = await api.apiCall<any>('simpanPenjualan', { namaPelanggan: 'X', noWa: '', items: [{ tipe: 'HP', idUnit: 'UNT-9999-0001', harga: 1 }], bonus: [], diskon: 0, tukarTambah: { ada: false }, metodeBayar: 'Tunai', dibayar: 1 }, api.buatIdemKey());
    expect(r).toMatchObject({ ok: false, kode: 'UNIT_TIDAK_ADA' });
    expect(r.pesan).toMatch(/tidak ditemukan/);
  });

  it('server yang membawa Date ditolak runner palsu — memastikan DataService tidak pernah mengirim Date', async () => {
    // seed tanggal sebagai Date (seperti Sheets yang mengubah teks jadi tanggal)
    const { HEADER } = await import('../../src/backend/Skema');
    const h = HEADER.Stok_HP;
    const row = h.map(k => ({ ID_Unit: 'UNT-2609-0001', Tgl_Masuk: new Date('2026-09-20T00:00:00+07:00'), IMEI_1: IMEI_A, Nama_Barang: 'HP Uji', Kondisi: 'Bekas', Status: 'Ready', HPP: 1, Harga_Beli: 1, Harga_Jual_Target: 2 } as Record<string, unknown>)[k] ?? '');
    palsu.sheet('Stok_HP').rows.push(row);
    const r = await api.apiCall<any>('getSemuaData');
    expect(r.ok).toBe(true);
    expect(r.data.stok[0]).toMatchObject({ tglMasuk: '20 Sep 2026', umurHari: 17 });
  });
});
