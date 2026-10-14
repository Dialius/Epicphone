// Nota.ts — pembuatan nota PDF (PRD 02 bagian 6, PRD 03 bagian 6, PRD 09 penamaan).
// Hanya MEMBUAT dan MENYIMPAN nota; pengiriman dilakukan manual oleh owner.
// Nota tidak memuat modal maupun laba.

import { SHEET, FOLDER } from './Config';
import { Db } from './Db';
import { GalatBisnis } from './Galat';
import { subfolder } from './Drive';
import { esc, htmlKePdf, ambilAtauBuatFolder } from './Pdf';
import { namaNota } from './Penamaan';
import { angka, tglId, jamId, formatRupiah, tglIso, sekarang, terbilangRupiah } from './Utils';

type R = Record<string, unknown>;
const str = (v: unknown) => String(v ?? '');

export interface DataNotaServer {
  toko: { nama: string; tagline: string; alamat: string; wa: string; instagram: string; syarat: string; logo: string; ukuran: 'A5' | '80mm' };
  id: string; tanggal: string; jam: string; pelanggan: string; metode: string;
  status: 'Aktif' | 'Batal';
  subtotal: number; diskon: number; nilaiTukarTambah: number; unitTukarTambah: string;
  total: number; dibayar: number; sisa: number; jatuhTempo?: string;
  barang: Array<{ nama: string; imei: string; kondisi: string; qty: number; harga: number; garansi: string }>;
  bonus: Array<{ nama: string; qty: number }>;
}

/** Render HTML nota untuk dijadikan PDF oleh Apps Script. Fungsi murni: aman diuji tanpa Google.
 *  Pengubah HTML ke PDF milik Google hanya andal untuk tabel dan gaya sebaris (tanpa flex, grid, atau transform),
 *  jadi tata letak seluruhnya memakai tabel. Nota tidak memuat modal maupun laba. */
export function renderNotaHtml(n: DataNotaServer): string {
  const sempit = n.toko.ukuran === '80mm';
  const batal = n.status === 'Batal';
  const lunas = n.sisa <= 0;
  const cap = batal ? 'DIBATALKAN' : lunas ? 'LUNAS' : `BELUM LUNAS${n.jatuhTempo ? ` (jatuh tempo ${n.jatuhTempo})` : ''}`;
  const warnaCap = batal ? '#B42318' : lunas ? '#15803D' : '#B45309';
  const latarCap = batal ? '#FEF2F2' : lunas ? '#F0FDF4' : '#FFFBEB';
  const NAVY = '#0F2A44', GARIS = '#CBD5E1', TIPIS = '#E2E8F0', LATAR = '#F1F5F9', ABU = '#64748B';
  const fs = sempit ? 10 : 11;
  const kecil = `font-size:${sempit ? 8 : 9}px;color:${ABU}`;
  const rp = (v: number) => esc(formatRupiah(v));

  const baris = n.barang.map((b, i) => `<tr>
    <td style="text-align:center;padding:7px 6px;border-bottom:1px solid ${TIPIS};vertical-align:top">${i + 1}</td>
    <td style="padding:7px 6px;border-bottom:1px solid ${TIPIS};vertical-align:top"><b>${esc(b.nama)}</b>${b.imei ? `<br><span style="${kecil}">IMEI ${esc(b.imei)}${b.kondisi ? ` · ${esc(b.kondisi)}` : ''}</span>` : (b.kondisi ? `<br><span style="${kecil}">${esc(b.kondisi)}</span>` : '')}${b.garansi ? `<br><span style="${kecil}">Garansi sampai ${esc(b.garansi)}</span>` : ''}</td>
    <td style="text-align:center;padding:7px 6px;border-bottom:1px solid ${TIPIS};vertical-align:top">${b.qty}</td>
    <td style="text-align:right;padding:7px 6px;border-bottom:1px solid ${TIPIS};vertical-align:top">${rp(b.harga)}</td>
    <td style="text-align:right;padding:7px 6px;border-bottom:1px solid ${TIPIS};vertical-align:top"><b>${rp(b.harga * b.qty)}</b></td></tr>`).join('');
  const bonus = n.bonus.map(b => `<tr>
    <td style="padding:6px;border-bottom:1px solid ${TIPIS};background:#F7FEF9"></td>
    <td style="padding:6px;border-bottom:1px solid ${TIPIS};background:#F7FEF9;color:#15803D"><b>BONUS</b> &nbsp;${esc(b.nama)}</td>
    <td style="text-align:center;padding:6px;border-bottom:1px solid ${TIPIS};background:#F7FEF9;color:#15803D">${b.qty}</td>
    <td style="text-align:right;padding:6px;border-bottom:1px solid ${TIPIS};background:#F7FEF9;color:#15803D" colspan="2">GRATIS</td></tr>`).join('');
  const ringkas = (label: string, nilai: string, opsi: { tebal?: boolean; garis?: boolean; warna?: string } = {}) =>
    `<tr><td style="padding:${opsi.garis ? '7px 0 3px' : '3px 0'};${opsi.garis ? `border-top:2px solid ${NAVY};` : ''}${opsi.tebal ? `font-weight:bold;font-size:${fs + 2}px;` : ''}${opsi.warna ? `color:${opsi.warna};` : ''}">${esc(label)}</td>`
    + `<td style="padding:${opsi.garis ? '7px 0 3px' : '3px 0'};text-align:right;${opsi.garis ? `border-top:2px solid ${NAVY};` : ''}${opsi.tebal ? `font-weight:bold;font-size:${fs + 2}px;` : ''}${opsi.warna ? `color:${opsi.warna};` : ''}">${esc(nilai)}</td></tr>`;

  const kop = `<table style="width:100%;border-collapse:collapse"><tr>
${n.toko.logo ? `<td style="width:${sempit ? 44 : 64}px;vertical-align:middle"><img src="${n.toko.logo}" style="height:${sempit ? 38 : 54}px"></td>` : ''}
<td style="vertical-align:middle"><div style="font-size:${sempit ? 13 : 17}px;font-weight:bold;color:${NAVY}">${esc(n.toko.nama)}</div>${n.toko.tagline ? `<div style="font-size:${fs}px;color:#15803D">${esc(n.toko.tagline)}</div>` : ''}
<div style="${kecil}">${esc(n.toko.alamat)} · WA ${esc(n.toko.wa)}${n.toko.instagram ? ` · IG ${esc(n.toko.instagram)}` : ''}</div></td>
${sempit ? '' : `<td style="text-align:right;vertical-align:middle;width:160px"><div style="font-size:14px;font-weight:bold;color:${NAVY}">NOTA PENJUALAN</div><div style="font-size:11px;font-weight:bold">${esc(n.id)}</div><div style="${kecil}">${esc(n.tanggal)}, ${esc(n.jam)} WIB</div></td>`}
</tr></table>
<table style="width:100%;border-collapse:collapse;margin-top:6px"><tr><td style="height:2px;background:${NAVY};width:${sempit ? '70%' : '85%'}"></td><td style="height:2px;background:#16A34A"></td></tr></table>`;

  const info = sempit
    ? `<div style="font-size:12px;font-weight:bold;margin-top:8px">NOTA PENJUALAN</div>
<table style="width:100%;margin-top:3px"><tr><td>No. nota</td><td style="text-align:right"><b>${esc(n.id)}</b></td></tr>
<tr><td>Tanggal</td><td style="text-align:right">${esc(n.tanggal)}, ${esc(n.jam)} WIB</td></tr>
<tr><td>Pelanggan</td><td style="text-align:right"><b>${esc(n.pelanggan)}</b></td></tr></table>`
    : `<table style="width:100%;border-collapse:separate;border-spacing:0;margin-top:10px"><tr>
<td style="background:${LATAR};padding:8px 10px;width:50%;vertical-align:top"><span style="${kecil};letter-spacing:1px">PELANGGAN</span><br><b style="font-size:12px">${esc(n.pelanggan)}</b></td>
<td style="width:8px"></td>
<td style="background:${LATAR};padding:8px 10px;vertical-align:top"><span style="${kecil};letter-spacing:1px">PEMBAYARAN</span><br><b style="font-size:12px">${esc(n.metode)}</b>${!lunas && !batal && n.jatuhTempo ? `<br><span style="${kecil}">Jatuh tempo ${esc(n.jatuhTempo)}</span>` : ''}</td></tr></table>`;

  const head = sempit
    ? ''
    : `<tr style="background:${NAVY};color:#FFFFFF"><td style="width:26px;text-align:center;padding:6px;font-size:9px"><b>NO</b></td><td style="padding:6px;font-size:9px"><b>BARANG</b></td><td style="width:34px;text-align:center;padding:6px;font-size:9px"><b>QTY</b></td><td style="width:92px;text-align:right;padding:6px;font-size:9px"><b>HARGA</b></td><td style="width:102px;text-align:right;padding:6px;font-size:9px"><b>JUMLAH</b></td></tr>`;

  const total = `<table style="width:${sempit ? '100%' : '100%'};margin-top:8px;border-collapse:collapse">
${ringkas('Subtotal', formatRupiah(n.subtotal))}
${n.diskon > 0 ? ringkas('Diskon', '-' + formatRupiah(n.diskon)) : ''}
${n.nilaiTukarTambah > 0 ? ringkas(`Tukar tambah${n.unitTukarTambah ? ` (${n.unitTukarTambah})` : ''}`, '-' + formatRupiah(n.nilaiTukarTambah)) : ''}
${ringkas('TOTAL', formatRupiah(n.total), { tebal: true, garis: true, warna: NAVY })}
${ringkas(`Dibayar (${n.metode})`, formatRupiah(n.dibayar))}
${n.sisa > 0 ? ringkas('Sisa tagihan', formatRupiah(n.sisa), { tebal: true, warna: '#B91C1C' }) : ''}
</table>`;

  const terbilangBaris = `<div style="margin-top:8px;padding:6px 9px;background:${LATAR};border-left:3px solid ${NAVY};font-size:${sempit ? 8 : 10}px;font-style:italic;color:#334155">Terbilang: ${esc(terbilangRupiah(n.total))}</div>`;

  const bawah = sempit
    ? `${total}${terbilangBaris}`
    : `<table style="width:100%;border-collapse:collapse;margin-top:6px"><tr>
<td style="width:46%;vertical-align:top;padding-right:14px">${terbilangBaris}<div style="margin-top:8px;border:1px solid ${GARIS};padding:6px 9px"><b style="font-size:9px;letter-spacing:1px;color:${NAVY}">KETENTUAN GARANSI</b><div style="font-size:9px;color:#334155;margin-top:2px">${esc(n.toko.syarat)}</div></div></td>
<td style="vertical-align:top">${total}</td></tr></table>`;

  return `<html><body style="font-family:Arial,Helvetica,sans-serif;font-size:${fs}px;color:#0F172A;margin:${sempit ? 6 : 22}px">
<div style="width:${sempit ? '280px' : '100%'}">
${kop}
${info}
<table style="width:100%;border-collapse:collapse;margin-top:10px;border-top:1px solid ${GARIS}">${head}${baris}${bonus}</table>
${bawah}
<table style="width:100%;border-collapse:collapse;margin-top:12px"><tr><td style="text-align:center;padding:8px;border:2px solid ${warnaCap};background:${latarCap};color:${warnaCap};font-weight:bold;font-size:${sempit ? 12 : 14}px;letter-spacing:1px">${esc(cap)}</td></tr></table>
${sempit ? `<div style="font-size:8px;color:#334155;margin-top:6px">${esc(n.toko.syarat)}</div>` : ''}
<table style="width:100%;margin-top:${sempit ? 12 : 20}px"><tr><td style="text-align:center;width:50%">Penjual<br><br><br><br>( ........................ )</td><td style="text-align:center">Pembeli<br><br><br><br>( ........................ )</td></tr></table>
<div style="text-align:center;margin-top:12px;padding-top:6px;border-top:1px dashed ${GARIS};font-size:${sempit ? 9 : 10}px;color:${ABU}">Terima kasih telah berbelanja di <b style="color:${NAVY}">${esc(n.toko.nama)}</b>. Simpan nota ini sebagai bukti pembelian dan klaim garansi.</div>
</div></body></html>`;
}

function pengaturan(): Record<string, string> {
  const hasil: Record<string, string> = {};
  (Db.getAll(SHEET.PENGATURAN) as R[]).forEach(p => { hasil[str(p.Kunci)] = str(p.Nilai); });
  return hasil;
}

function logoDataUri(idFile: string): string {
  if (!idFile || idFile.indexOf('(') === 0) return '';
  try {
    const blob = DriveApp.getFileById(idFile).getBlob();
    return `data:${blob.getContentType()};base64,${Utilities.base64Encode(blob.getBytes())}`;
  } catch {
    return ''; // logo bukan syarat nota
  }
}

export function ambilDataNota(idPenjualan: string): DataNotaServer {
  const p = Db.findById(SHEET.PENJUALAN, idPenjualan);
  if (!p) throw new GalatBisnis('PENJUALAN_TIDAK_ADA', `Penjualan ${idPenjualan} tidak ditemukan.`);
  if (p.Status !== 'Aktif' && p.Status !== 'Batal') throw new GalatBisnis('STATUS_TIDAK_VALID', `Penjualan ${idPenjualan} berstatus ${str(p.Status)}, nota belum bisa dibuat.`);
  const set = pengaturan();
  const items = (Db.getAll(SHEET.PENJUALAN_ITEM) as R[]).filter(i => i.ID_Penjualan === idPenjualan);
  const unit: Record<string, R> = {};
  (Db.getAll(SHEET.STOK_HP) as R[]).forEach(u => { unit[str(u.ID_Unit)] = u; });
  const tt = (Db.getAll(SHEET.TUKAR_TAMBAH) as R[]).find(t => t.ID_Penjualan === idPenjualan);
  const tagihan = (Db.getAll(SHEET.HUTANG_PIUTANG) as R[]).find(h => h.ID_Referensi === idPenjualan);
  return {
    toko: {
      nama: set.NAMA_TOKO || 'Epic Phone', tagline: set.TAGLINE || '', alamat: set.ALAMAT || '', wa: set.NO_WA || '',
      instagram: set.INSTAGRAM || '', syarat: set.SYARAT_GARANSI || '', logo: logoDataUri(set.ID_BERKAS_LOGO || ''),
      ukuran: set.NOTA_UKURAN === '80mm' ? '80mm' : 'A5',
    },
    id: idPenjualan, tanggal: tglId(p.Tanggal), jam: jamId(p.Jam), pelanggan: str(p.Nama_Pelanggan), metode: str(p.Metode_Bayar),
    status: p.Status === 'Batal' ? 'Batal' : 'Aktif',
    subtotal: angka(p.Subtotal), diskon: angka(p.Diskon), nilaiTukarTambah: angka(p.Nilai_Tukar_Tambah),
    unitTukarTambah: tt ? str(tt.Nama_Barang) : '', total: angka(p.Total_Tagihan), dibayar: angka(p.Dibayar), sisa: angka(p.Sisa_Tagihan),
    jatuhTempo: tagihan && str(tagihan.Jatuh_Tempo) ? tglId(tagihan.Jatuh_Tempo) : undefined,
    barang: items.filter(i => i.Tipe !== 'Bonus').map(i => ({
      nama: str(i.Nama_Barang), imei: str(i.IMEI), kondisi: i.Tipe === 'HP' ? str(unit[str(i.ID_Unit_atau_SKU)]?.Kondisi) : '',
      qty: angka(i.Qty), harga: angka(i.Harga_Jual), garansi: str(i.Garansi_Hingga) ? tglId(i.Garansi_Hingga) : '',
    })),
    bonus: items.filter(i => i.Tipe === 'Bonus').map(i => ({ nama: str(i.Nama_Barang), qty: angka(i.Qty) })),
  };
}

export interface HasilNota {
  idFile: string;
  urlLihat: string;
  urlUnduh: string;
  /** PDF dalam base64 agar tombol Unduh dan pratinjau langsung bekerja tanpa izin Drive di peramban */
  base64: string;
  nama: string;
}

/**
 * Buat (atau buat ulang) nota PDF. Versi lama dipindah ke 03_NOTA/RIWAYAT dengan nama ..._v1_DIBATALKAN
 * (atau _DIPERBARUI); nomor nota tetap sama sepanjang transaksi (PRD 03 bagian 6).
 */
export function buatNota(idPenjualan: string): HasilNota {
  const data = ambilDataNota(idPenjualan);
  const hariIni = tglIso(sekarang());
  const tahun = hariIni.slice(0, 4);
  const bulan = hariIni.slice(5, 7);
  const nota = subfolder(FOLDER.NOTA);
  const folder = ambilAtauBuatFolder(ambilAtauBuatFolder(nota, tahun), bulan);
  const riwayat = ambilAtauBuatFolder(nota, FOLDER.NOTA_RIWAYAT);
  const nama = namaNota(idPenjualan);

  // Arsipkan versi lama (di folder bulan mana pun ia dibuat)
  let n = 0;
  const arsipLama = riwayat.getFiles();
  while (arsipLama.hasNext()) if (arsipLama.next().getName().indexOf(`EPICPHONE_NOTA_${idPenjualan}_v`) === 0) n++;
  const cari = [folder, ...semuaFolderBulan(nota)];
  for (const f of cari) {
    const lama = f.getFilesByName(nama);
    while (lama.hasNext()) {
      const berkas = lama.next();
      n++;
      berkas.setName(namaNota(idPenjualan, n, data.status === 'Batal' ? 'DIBATALKAN' : 'DIPERBARUI'));
      berkas.moveTo(riwayat);
    }
  }

  const blob = htmlKePdf(renderNotaHtml(data), nama);
  const file = folder.createFile(blob);
  const publik = pengaturan().NOTA_LINK_PUBLIK !== 'Tidak';
  file.setSharing(publik ? DriveApp.Access.ANYONE_WITH_LINK : DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);

  Db.updateById(SHEET.PENJUALAN, idPenjualan, { Link_Nota_PDF: file.getUrl() });
  return {
    idFile: file.getId(), urlLihat: file.getUrl(), urlUnduh: `https://drive.google.com/uc?export=download&id=${file.getId()}`,
    base64: Utilities.base64Encode(blob.getBytes()), nama,
  };
}

/**
 * Buka nota yang sudah ada tanpa membuat versi baru (dipakai saat membuka ulang dari Riwayat).
 * Bila belum pernah dibuat atau berkasnya sudah hilang dari Drive, dibuat sekarang.
 */
export function ambilNota(idPenjualan: string): HasilNota {
  const p = Db.findById(SHEET.PENJUALAN, idPenjualan);
  if (!p) throw new GalatBisnis('PENJUALAN_TIDAK_ADA', `Penjualan ${idPenjualan} tidak ditemukan.`);
  const m = /\/d\/([^/]+)/.exec(String(p.Link_Nota_PDF ?? ''));
  if (m) {
    try {
      const file = DriveApp.getFileById(m[1]);
      if (file.isTrashed()) throw new Error('berkas ada di tempat sampah'); // getFileById tetap mengembalikan berkas yang dibuang
      return {
        idFile: file.getId(), urlLihat: file.getUrl(), urlUnduh: `https://drive.google.com/uc?export=download&id=${file.getId()}`,
        base64: Utilities.base64Encode(file.getBlob().getBytes()), nama: file.getName(),
      };
    } catch {
      // berkas terhapus: buat ulang di bawah
    }
  }
  return buatNota(idPenjualan);
}

function semuaFolderBulan(nota: GoogleAppsScript.Drive.Folder): GoogleAppsScript.Drive.Folder[] {
  const hasil: GoogleAppsScript.Drive.Folder[] = [];
  const tahun = nota.getFolders();
  while (tahun.hasNext()) {
    const t = tahun.next();
    if (!/^\d{4}$/.test(t.getName())) continue;
    const bulan = t.getFolders();
    while (bulan.hasNext()) hasil.push(bulan.next());
  }
  return hasil;
}

/** Saat pengaturan "tautan publik" diubah: terapkan ke semua nota yang sudah ada (PRD 06 bagian 3.3) */
export function terapkanTautanNota(publik: boolean): number {
  const nota = subfolder(FOLDER.NOTA);
  let jumlah = 0;
  const proses = (f: GoogleAppsScript.Drive.Folder) => {
    const it = f.getFiles();
    while (it.hasNext()) {
      it.next().setSharing(publik ? DriveApp.Access.ANYONE_WITH_LINK : DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
      jumlah++;
    }
  };
  semuaFolderBulan(nota).forEach(proses);
  const r = nota.getFoldersByName(FOLDER.NOTA_RIWAYAT);
  if (r.hasNext()) proses(r.next());
  return jumlah;
}
