// api.ts — Pembungkus komunikasi frontend ke backend Apps Script + Mock Dev Mode

import { MOCK_STOK_HP, UnitHP, Aksesoris, TransaksiItem, Tagihan, KontakItem, ProdukKatalog, ServisItem, KlaimItem, BiayaOperasional } from '../mock/data-contoh';

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  kode?: string;
  pesan?: string;
}

declare global {
  interface Window {
    google?: {
      script: {
        run: {
          withSuccessHandler: (fn: (res: any) => void) => {
            withFailureHandler: (fn: (err: Error) => void) => any;
          };
        };
      };
    };
  }
}

/** Isi getSemuaData() dari server: semua daftar dalam model layar */
export interface DataServer {
  stok: UnitHP[];
  aksesoris: Aksesoris[];
  transaksi: TransaksiItem[];
  tagihan: Tagihan[];
  kontak: KontakItem[];
  katalog: ProdukKatalog[];
  servis: ServisItem[];
  klaim: KlaimItem[];
  biaya: BiayaOperasional[];
  statusBackup: { ok: boolean; terakhir: string; pesan: string };
  /** Pengaturan toko dan ambang dari sheet Pengaturan */
  pengaturan: Record<string, string>;
  /** Daftar yang belum dilayani server (tetap lokal di perangkat); kosong bila semua tersambung */
  belumTerhubung: string[];
  waktuServer: string;
}

/** Hasil simpanPenjualan dari server */
export interface HasilServerJual {
  idPenjualan: string;
  subtotal: number;
  diskon: number;
  nilaiTukarTambah: number;
  total: number;
  dibayar: number;
  sisa: number;
  idTagihan?: string;
  idUnitTukarTambah?: string;
  garansiSampai: string;
}

/** Pastikan isi permintaan sesuai tipe masukan server (literal objek diperiksa: kunci yang meleset = galat kompilasi) */
export const sesuai = <T>(x: T): T => x;

/** Foto server untuk galeri unit */
export interface FotoServer {
  idBerkas: string;
  posisi: string;
  urutan: number;
  nama: string;
  link: string;
  pratinjau: string;
}

/** Batas tunggu per panggilan (PRD 04 bagian 7): 30 detik; unggah foto/nota ke Drive diberi lebih lama */
const batasWaktu = (fnName: string) => (fnName === 'unggahFoto' || fnName === 'buatNota' ? 90_000 : 30_000);

/** Buat kunci unik anti-ganda (idemKey) untuk setiap penulisan */
export function buatIdemKey(): string {
  return 'idem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

// Local mock database in memory/localStorage for offline dev mode
const STORAGE_KEY_STOK = 'epicphone_stok_dev';

function getLocalStok(): UnitHP[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STOK);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return MOCK_STOK_HP;
}

function saveLocalStok(list: UnitHP[]) {
  try {
    localStorage.setItem(STORAGE_KEY_STOK, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/**
 * Panggil fungsi backend Apps Script secara asynchronous.
 * Bila di browser biasa (mode dev lokal), otomatis memakai mock handler.
 */
/**
 * Panggil fungsi server. Pembacaan (get*, cari*, cek*) otomatis diulang sekali bila jaringan gagal;
 * penulisan tidak pernah diulang otomatis (pengguna yang memutuskan; idemKey mencegah ganda).
 */
export async function apiCall<T = unknown>(fnName: string, ...args: any[]): Promise<ApiResponse<T>> {
  const hasil = await panggilSekali<T>(fnName, ...args);
  const baca = /^(get|cari|cek)/.test(fnName);
  if (!hasil.ok && baca && (hasil.kode === 'NETWORK_ERROR' || hasil.kode === 'TIMEOUT')) return panggilSekali<T>(fnName, ...args);
  return hasil;
}

async function panggilSekali<T = unknown>(fnName: string, ...args: any[]): Promise<ApiResponse<T>> {
  // 1. Production Mode: Menggunakan google.script.run
  if (typeof window !== 'undefined' && window.google?.script?.run) {
    return new Promise((resolve) => {
      let selesai = false;
      const akhiri = (r: ApiResponse<T>) => { if (!selesai) { selesai = true; clearTimeout(timer); resolve(r); } };
      // Penulisan memakai idemKey, jadi mengulang dengan kunci yang sama aman
      const timer = setTimeout(() => akhiri({
        ok: false, kode: 'TIMEOUT',
        pesan: 'Server terlalu lama menjawab. Periksa koneksi, lalu cek Riwayat sebelum mengulang (data mungkin sudah tersimpan).',
      }), batasWaktu(fnName));
      const runner = window.google!.script.run
        .withSuccessHandler((res: ApiResponse<T>) => akhiri(res ?? { ok: false, kode: 'RESPONS_KOSONG', pesan: 'Server tidak mengirim jawaban.' }))
        .withFailureHandler((err: Error) =>
          akhiri({ ok: false, kode: 'NETWORK_ERROR', pesan: err?.message || 'Gagal menghubungi server Google.' })
        );

      if (typeof runner[fnName] === 'function') {
        runner[fnName](...args);
      } else {
        akhiri({ ok: false, kode: 'NO_FUNCTION', pesan: `Fungsi ${fnName} tidak ditemukan di server.` });
      }
    });
  }

  // 2. Dev Mode: terhubung langsung ke backend Apps Script nyata lewat RPC bridge
  try {
    const res = await fetch('/api/gas-rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fn: fnName, args }),
    });
    if (res.ok) {
      const json = await res.json();
      return json as ApiResponse<T>;
    }
  } catch {
    // fallback bila bridge tidak aktif
  }

  // 3. Dev Mock Mode (bila offline)
  return new Promise((resolve) => {
    setTimeout(() => {
      const stokList = getLocalStok();

      if (fnName === 'cariStok') {
        const query = (args[0] || '').toLowerCase();
        const hasil = stokList.filter(
          u => u.nama.toLowerCase().includes(query) || u.imei.includes(query) || u.id.toLowerCase().includes(query)
        );
        return resolve({ ok: true, data: hasil as unknown as T });
      }

      if (fnName === 'simpanPembelian') {
        const input = args[0];
        const item = input.items[0];
        const nextId = `UNT-2610-${String(stokList.length + 1).padStart(4, '0')}`;
        const newUnit: UnitHP = {
          id: nextId,
          nama: item.namaBarang,
          merek: 'Smartphone',
          model: item.namaBarang,
          imei: item.imei1,
          kondisi: item.kondisi || 'Bekas',
          grade: item.grade,
          kelengkapan: item.kelengkapan || 'Fullset',
          baterai: item.bateraiPersen,
          bebasKunci: item.bebasKunciAkun || 'Ya',
          hargaBeli: item.hargaBeli,
          biayaLain: item.biayaLain || 0,
          biayaServis: 0,
          hpp: (item.hargaBeli || 0) + (item.biayaLain || 0),
          hargaJualTarget: Math.round((item.hargaBeli || 0) * 1.15),
          status: item.perluServis ? 'Servis' : 'Ready',
          umurHari: 0,
          tglMasuk: 'Hari ini',
          catatan: item.keluhanServis || '',
          foto: [],
        };

        const updated = [newUnit, ...stokList];
        saveLocalStok(updated);

        return resolve({
          ok: true,
          data: {
            idPembelian: `BELI-2610-${Date.now().toString().slice(-4)}`,
            unitsCreated: [nextId],
          } as unknown as T,
        });
      }

      resolve({ ok: true, data: 'OK (Mock Dev Mode)' as unknown as T });
    }, 150);
  });
}
