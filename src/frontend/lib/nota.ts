// nota.ts — membangun DataNota dari transaksi nyata (bukan teks karangan).
import type { TransaksiItem } from '../mock/data-contoh';
import type { DataNota } from '../components/NotaModal';
import { parseTgl, tglWib } from './format';

export const GARANSI_HARI_DEFAULT = 7;

export function tambahHari(tgl: string, hari: number): string {
  const d = parseTgl(tgl) || new Date();
  return tglWib(new Date(d.getTime() + hari * 86400000));
}

/** Tambah bulan kalender ("04 Okt 2026" + 12 = "04 Okt 2027"); hari dipotong ke akhir bulan bila perlu */
export function tambahBulan(tgl: string, bulan: number): string {
  const d = parseTgl(tgl) || new Date();
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + bulan, hari = d.getUTCDate();
  const akhir = new Date(Date.UTC(y, m + 1, 0, 12)).getUTCDate();
  return tglWib(new Date(Date.UTC(y, m, Math.min(hari, akhir), 12)));
}

export function notaDariTransaksi(t: TransaksiItem, garansiHari = GARANSI_HARI_DEFAULT): DataNota {
  const items = (t.items && t.items.length)
    ? t.items.map(i => ({ nama: i.nama, imei: i.imei, qty: i.qty, harga: i.harga, subtotal: i.qty * i.harga }))
    : [{ nama: t.judul.replace(/^(Jual|Beli|Servis|Bayar)\s*·\s*/, ''), qty: 1, harga: t.nominal, subtotal: t.nominal }];
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const diskon = t.diskon || 0;
  const tt = t.tukarTambah;
  const total = t.nominal;
  const dibayar = t.dibayar ?? (t.status === 'Lunas' ? total : 0);
  const sisa = t.sisa ?? Math.max(0, total - dibayar);
  // Server menghitung garansi per unit (baru 12 bulan, bekas 7 hari); hitungan lokal hanya untuk mode demo
  const garansi = t.tipe === 'Jual' ? (t.garansiSampai || `${tambahHari(t.tanggal, garansiHari)} (${garansiHari} hari)`) : '-';
  return {
    noNota: t.id,
    tanggalWib: `${t.tanggal}, ${t.jam} WIB`,
    namaPelanggan: t.pihak,
    items,
    bonus: (t.bonus || []).map(b => ({ nama: b.nama, qty: b.qty })),
    subtotal: Math.max(subtotal, total + diskon + (tt?.nilai || 0)),
    diskon,
    tukarTambah: tt ? { ada: true, unit: tt.unit, nilai: tt.nilai } : { ada: false },
    totalTagihan: total,
    dibayar, sisa,
    metodeBayar: t.metode || 'Tunai',
    jatuhTempo: t.jatuhTempo,
    garansiSampai: garansi,
  };
}
