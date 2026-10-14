// TagihanService.ts — Hutang-piutang: terima/catat pembayaran, status telat

import { SHEET, PREFIX_ID } from './Config';
import { Db } from './Db';
import { GalatBisnis } from './Galat';
import { denganLock } from './Lock';
import { buatId } from './Id';
import { log } from './Log';
import { tglIso, jamHm, sekarang, angka, sanitasi, selisihHariIso, isoValid, formatRupiah } from './Utils';

export interface HasilPembayaran {
  idBayar: string;
  idTagihan: string;
  terbayar: number;
  sisa: number;
  status: 'Lunas' | 'Sebagian' | 'Telat';
}

/** Status tagihan dari sisa dan jatuh tempo (dipakai juga oleh job harian & pembaca data) */
export function statusTagihan(sisa: number, jatuhTempo: string, hariIni: string): { status: 'Lunas' | 'Sebagian' | 'Telat' | 'Belum'; hariTelat: number } {
  if (sisa <= 0) return { status: 'Lunas', hariTelat: 0 };
  if (isoValid(jatuhTempo)) {
    const telat = selisihHariIso(jatuhTempo, hariIni);
    if (telat > 0) return { status: 'Telat', hariTelat: telat };
  }
  return { status: 'Belum', hariTelat: 0 };
}

/** Catat pembayaran untuk satu tagihan (piutang pelanggan atau hutang supplier). Ditolak bila melebihi sisa. */
export function terimaPembayaran(idTagihan: string, jumlah: number, metode: string, catatan = ''): HasilPembayaran {
  return denganLock(() => Db.transaksi(() => {
    const t = Db.findById(SHEET.HUTANG_PIUTANG, idTagihan);
    if (!t) throw new GalatBisnis('TAGIHAN_TIDAK_ADA', `Tagihan ${idTagihan} tidak ditemukan.`);
    if (t.Status === 'Lunas') throw new GalatBisnis('SUDAH_LUNAS', 'Tagihan ini sudah lunas.');
    if (t.Status === 'Batal') throw new GalatBisnis('TAGIHAN_BATAL', 'Tagihan ini sudah dibatalkan.');

    const nominal = Math.round(angka(jumlah));
    const sisaLama = angka(t.Sisa);
    if (nominal <= 0) throw new GalatBisnis('NOMINAL_TIDAK_VALID', 'Nominal pembayaran harus lebih dari nol.');
    if (nominal > sisaLama) {
      throw new GalatBisnis('MELEBIHI_SISA', `Nominal melebihi sisa tagihan (sisa ${formatRupiah(sisaLama)}).`);
    }
    if (!String(metode || '').trim()) throw new GalatBisnis('METODE_KOSONG', 'Pilih metode pembayaran.');

    const now = sekarang();
    const hariIni = tglIso(now);
    const terbayar = angka(t.Terbayar) + nominal;
    const sisa = sisaLama - nominal;
    const st = statusTagihan(sisa, String(t.Jatuh_Tempo ?? ''), hariIni);
    const status: 'Lunas' | 'Sebagian' | 'Telat' = st.status === 'Lunas' ? 'Lunas' : st.status === 'Telat' ? 'Telat' : 'Sebagian';

    const idBayar = buatId(PREFIX_ID.PEMBAYARAN);
    Db.append(SHEET.PEMBAYARAN, {
      ID_Bayar: idBayar, Tanggal: hariIni, Jam: jamHm(now), ID_Hutang_Piutang: idTagihan,
      Nama: String(t.Nama ?? ''), Jumlah: nominal, Metode: sanitasi(metode), Catatan: sanitasi(catatan || ''), Link_Bukti: '',
    });
    Db.updateById(SHEET.HUTANG_PIUTANG, idTagihan, { Terbayar: terbayar, Sisa: sisa, Status: status, Hari_Telat: st.hariTelat });

    // Sinkronkan transaksi asal
    const ref = String(t.ID_Referensi ?? '');
    const statusBayar = sisa === 0 ? 'Lunas' : 'Sebagian';
    if (ref.startsWith(PREFIX_ID.PENJUALAN + '-')) {
      const p = Db.findById(SHEET.PENJUALAN, ref);
      if (p) Db.updateById(SHEET.PENJUALAN, ref, { Dibayar: angka(p.Dibayar) + nominal, Sisa_Tagihan: sisa, Status_Bayar: statusBayar });
    } else if (ref.startsWith(PREFIX_ID.PEMBELIAN + '-')) {
      const p = Db.findById(SHEET.PEMBELIAN, ref);
      if (p) Db.updateById(SHEET.PEMBELIAN, ref, { Dibayar: angka(p.Dibayar) + nominal, Sisa: sisa, Status_Bayar: statusBayar });
    }

    log('Tambah', SHEET.PEMBAYARAN, idBayar, `Pembayaran ${formatRupiah(nominal)} untuk ${idTagihan} (${String(t.Nama ?? '')}), sisa ${formatRupiah(sisa)}`);
    return { idBayar, idTagihan, terbayar, sisa, status };
  }));
}

/** Job harian 06:00: tandai Telat dan hitung Hari_Telat */
export function cekTagihanTelat(): number {
  return denganLock(() => {
    const hariIni = tglIso(sekarang());
    let berubah = 0;
    for (const t of Db.getAll(SHEET.HUTANG_PIUTANG)) {
      if (t.Status === 'Lunas' || t.Status === 'Batal') continue;
      const st = statusTagihan(angka(t.Sisa), String(t.Jatuh_Tempo ?? ''), hariIni);
      const baru = st.status === 'Telat' ? 'Telat' : (angka(t.Terbayar) > 0 ? 'Sebagian' : 'Belum');
      if (baru !== t.Status || st.hariTelat !== angka(t.Hari_Telat)) {
        Db.updateById(SHEET.HUTANG_PIUTANG, String(t.ID_Tagihan), { Status: baru, Hari_Telat: st.hariTelat });
        berubah++;
      }
    }
    return berubah;
  });
}
