// derive.ts — angka dashboard dan daftar peringatan diturunkan dari data nyata di state,
// bukan dari angka contoh yang ditulis permanen.

import {
  UnitHP, Aksesoris, TransaksiItem, Tagihan, ServisItem, PeringatanItem, MOCK_TREN_30_HARI,
} from '../mock/data-contoh';
import { tglWib, parseTgl, selisihHari, rupiah } from './format';

const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
export const AMBANG_MENGENDAP_HARI = 30;

export interface Metrik { omzet: number; laba: number; kas: number; unit: number }
export interface TitikTren { label: string; omzet: number; laba: number; hariIni: boolean; contoh: boolean }
export interface Dashboard {
  tanggalRef: string;
  hariIni: Metrik;
  kemarin: Metrik | null;
  stokReady: number; stokMengendap: number;
  piutang: number; piutangTelat: number;
  servisBerjalan: number; servisSiap: number;
  tren: TitikTren[];
  trenHariIni: TitikTren[];
  tren30Hari: TitikTren[];
  transaksiTerakhir: TransaksiItem[];
}

const urutanTingkat = { kritis: 0, tindakan: 1, info: 2 } as const;

function metrik(list: TransaksiItem[]): Metrik {
  const m: Metrik = { omzet: 0, laba: 0, kas: 0, unit: 0 };
  list.forEach(t => {
    if (t.status === 'Dibatalkan') return;
    if (t.tipe === 'Jual') {
      m.omzet += t.nominal;
      m.laba += t.laba ?? 0;
      m.kas += t.dibayar ?? (t.status === 'Lunas' ? t.nominal : 0);
      const unit = (t.items || []).filter(i => i.imei).length;
      m.unit += unit || 1;
    } else if (t.tipe === 'Bayar') {
      m.kas += t.nominal;
    }
  });
  return m;
}

function geser(d: Date, hari: number): Date { return new Date(d.getTime() + hari * 86400000); }

/** Tanggal acuan "hari ini": hari ini sungguhan bila ada transaksinya, selain itu transaksi terbaru (data contoh). */
export function tanggalAcuan(transaksi: TransaksiItem[]): Date {
  const sekarang = parseTgl(tglWib())!;
  const adaHariIni = transaksi.some(t => t.tanggal === tglWib());
  if (adaHariIni || !transaksi.length) return sekarang;
  let max: Date | null = null;
  transaksi.forEach(t => { const d = parseTgl(t.tanggal); if (d && (!max || d > max)) max = d; });
  return max || sekarang;
}

export function hitungDashboard(a: {
  transaksi: TransaksiItem[]; stok: UnitHP[]; tagihan: Tagihan[]; servis: ServisItem[];
  /** false = data nyata: "hari ini" selalu hari ini (bukan hari terakhir ada transaksi) dan tidak memakai angka contoh */
  demo?: boolean;
  /** Ambang dari Pengaturan (hari); bawaan 30 untuk umur stok */
  ambang?: { umurStokHari?: number; tempoHari?: number };
}): Dashboard {
  const demo = a.demo !== false;
  const ref = demo ? tanggalAcuan(a.transaksi) : (parseTgl(tglWib()) as Date);
  const refStr = tglWib(ref);
  const hariIni = metrik(a.transaksi.filter(t => t.tanggal === refStr));
  const kmrStr = tglWib(geser(ref, -1));
  const kmrList = a.transaksi.filter(t => t.tanggal === kmrStr);
  let kemarin: Metrik | null = kmrList.length ? metrik(kmrList) : null;
  if (!kemarin && demo) { // data contoh: pakai deret tren sebagai pembanding agar dashboard demo punya selisih
    const m = MOCK_TREN_30_HARI.find(x => x.tgl === geser(ref, -1).getUTCDate());
    if (m) kemarin = { omzet: m.omzet, laba: m.laba, kas: m.omzet, unit: m.unit };
  }

  const tren: TitikTren[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = geser(ref, -i);
    const s = tglWib(d);
    const dayList = a.transaksi.filter(t => t.tanggal === s);
    const nyata = dayList.length > 0;
    const mock = demo && !nyata ? MOCK_TREN_30_HARI.find(x => x.tgl === d.getUTCDate()) : undefined;
    const m = nyata ? metrik(dayList) : null;
    tren.push({ label: `${HARI_PENDEK[d.getUTCDay()]} ${d.getUTCDate()}`, omzet: m ? m.omzet : (mock?.omzet ?? 0), laba: m ? m.laba : (mock?.laba ?? 0), hariIni: i === 0, contoh: demo && !nyata });
  }

  // Tren 30 hari terakhir
  const tren30Hari: TitikTren[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = geser(ref, -i);
    const s = tglWib(d);
    const dayList = a.transaksi.filter(t => t.tanggal === s);
    const nyata = dayList.length > 0;
    const mock = demo && !nyata ? MOCK_TREN_30_HARI.find(x => x.tgl === d.getUTCDate()) : undefined;
    const m = nyata ? metrik(dayList) : null;
    tren30Hari.push({ label: `${d.getUTCDate()}`, omzet: m ? m.omzet : (mock?.omzet ?? 0), laba: m ? m.laba : (mock?.laba ?? 0), hariIni: i === 0, contoh: demo && !nyata });
  }

  // Tren Hari Ini per slot waktu
  const slotWaktu = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00'];
  const trxHariIni = a.transaksi.filter(t => t.tanggal === refStr && t.status !== 'Dibatalkan');
  const mockHariIniOmzet = [450000, 850000, 350000, 1100000, 650000, 1250000, 400000];
  const mockHariIniLaba = [90000, 150000, 70000, 220000, 110000, 250000, 80000];
  const trenHariIni: TitikTren[] = slotWaktu.map((slot, idx) => {
    const nextSlot = slotWaktu[idx + 1] || '23:59';
    const trxSlot = trxHariIni.filter(t => {
      const jam = t.jam || '00:00';
      return jam >= slot && jam < nextSlot;
    });
    const nyata = trxSlot.length > 0;
    const omzet = nyata ? trxSlot.reduce((acc, t) => acc + (t.tipe === 'Jual' ? t.nominal : 0), 0) : (demo && trxHariIni.length === 0 ? mockHariIniOmzet[idx] : 0);
    const laba = nyata ? trxSlot.reduce((acc, t) => acc + (t.tipe === 'Jual' ? (t.laba ?? 0) : 0), 0) : (demo && trxHariIni.length === 0 ? mockHariIniLaba[idx] : 0);
    return {
      label: slot,
      omzet,
      laba,
      hariIni: true,
      contoh: demo && trxHariIni.length === 0,
    };
  });

  const piutangList = a.tagihan.filter(t => t.jenis === 'Piutang pelanggan' && t.status !== 'Lunas' && t.sisa > 0);
  return {
    tanggalRef: refStr, hariIni, kemarin,
    stokReady: a.stok.filter(u => u.status === 'Ready').length,
    stokMengendap: a.stok.filter(u => u.status === 'Ready' && u.umurHari > (a.ambang?.umurStokHari ?? AMBANG_MENGENDAP_HARI)).length,
    piutang: piutangList.reduce((s, t) => s + t.sisa, 0),
    piutangTelat: piutangList.filter(t => t.hariTelat > 0 || t.status === 'Telat').length,
    servisBerjalan: a.servis.filter(s => s.status === 'Antri' || s.status === 'Dikerjakan').length,
    servisSiap: a.servis.filter(s => s.status === 'Selesai' && s.jenis === 'Pelanggan').length, // servis unit toko yang selesai langsung Ready di stok, bukan tugas menunggu
    tren,
    trenHariIni,
    tren30Hari,
    transaksiTerakhir: a.transaksi.slice(0, 5),
  };
}

export function buatPeringatan(a: {
  transaksi: TransaksiItem[]; stok: UnitHP[]; aksesoris: Aksesoris[]; tagihan: Tagihan[]; servis: ServisItem[];
  /** false = data nyata: tanggal acuan selalu hari ini */
  demo?: boolean;
  /** Ambang dari Pengaturan (hari): umur stok mengendap dan jarak jatuh tempo */
  ambang?: { umurStokHari?: number; tempoHari?: number };
}): PeringatanItem[] {
  const batasUmur = a.ambang?.umurStokHari ?? AMBANG_MENGENDAP_HARI;
  const batasTempo = a.ambang?.tempoHari ?? 3;
  const out: PeringatanItem[] = [];
  const ref = a.demo !== false ? tanggalAcuan(a.transaksi) : (parseTgl(tglWib()) as Date);

  a.tagihan.filter(t => t.jenis === 'Piutang pelanggan' && t.status !== 'Lunas' && t.sisa > 0).forEach(t => {
    const telat = t.hariTelat > 0 || t.status === 'Telat';
    const tempo = parseTgl(t.jatuhTempo);
    const sisaHari = tempo ? selisihHari(tempo, ref) : 99;
    if (telat) {
      out.push({ id: 'tgh-' + t.id, tipe: 'telat', tingkat: 'kritis', judul: `${t.kontak} telat ${t.hariTelat || 1} hari`,
        deskripsi: `Sisa ${rupiah(t.sisa)} · ${t.id}`, badge: 'Telat', count: 1, linkTab: 'tagihan', filterValue: 'telat',
        refId: t.id, noWa: t.noWa, aksiLabel: 'Tagih lewat WA' });
    } else if (sisaHari >= 0 && sisaHari <= batasTempo) {
      out.push({ id: 'tmp-' + t.id, tipe: 'telat', tingkat: 'tindakan', judul: `${t.kontak} jatuh tempo ${sisaHari === 0 ? 'hari ini' : sisaHari + ' hari lagi'}`,
        deskripsi: `Sisa ${rupiah(t.sisa)} · ${t.id}`, badge: 'Segera', count: 1, linkTab: 'tagihan',
        refId: t.id, noWa: t.noWa, aksiLabel: 'Tagih lewat WA' });
    }
  });

  // hanya HP pelanggan yang menunggu diambil; unit toko yang selesai sudah otomatis Ready di stok
  a.servis.filter(s => s.status === 'Selesai' && s.jenis === 'Pelanggan').forEach(s => {
    out.push({ id: 'srv-' + s.id, tipe: 'servis-siap', tingkat: 'tindakan', judul: `${s.namaPerangkat} selesai diservis`,
      deskripsi: s.jenis === 'Pelanggan' ? `Belum diambil ${s.namaPelanggan}` : 'Unit toko siap dijual lagi', badge: 'Selesai', count: 1,
      linkTab: 'servis', refId: s.id, noWa: s.jenis === 'Pelanggan' ? s.noWa : undefined, aksiLabel: s.jenis === 'Pelanggan' ? 'Hubungi pelanggan' : 'Lihat servis' });
  });

  const lama = a.stok.filter(u => u.status === 'Ready' && u.umurHari > batasUmur);
  if (lama.length) out.push({ id: 'stok-lama', tipe: 'stok-lama', tingkat: 'tindakan', judul: `${lama.length} unit mengendap lebih dari ${batasUmur} hari`,
    deskripsi: lama.slice(0, 3).map(u => u.nama).join(', ') + (lama.length > 3 ? ', dan lainnya' : ''), badge: 'Mengendap', count: lama.length,
    linkTab: 'stok', filterValue: 'lama', aksiLabel: 'Lihat unit' });

  const habis = a.aksesoris.filter(x => x.stok <= x.stokMin);
  if (habis.length) out.push({ id: 'aks-tipis', tipe: 'stok-habis', tingkat: 'info', judul: `${habis.length} aksesoris di bawah batas stok`,
    deskripsi: habis.slice(0, 3).map(x => x.nama).join(', '), badge: 'Menipis', count: habis.length, linkTab: 'stok', filterValue: 'aksesoris', aksiLabel: 'Lihat aksesoris' });

  return out.sort((x, y) => urutanTingkat[x.tingkat || 'info'] - urutanTingkat[y.tingkat || 'info']);
}
