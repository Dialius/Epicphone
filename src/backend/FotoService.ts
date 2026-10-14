// FotoService.ts — Unggah, daftar, dan arsip foto/bukti di Google Drive (PRD 03 bagian 12, PRD 09 bagian 4.3).
// Satu fungsi untuk semua jenis: foto unit, servis, bukti pembelian/pembayaran/biaya, foto klaim.

import { SHEET, FOLDER, PREFIX_ID, FOTO_MAKS, FOTO_MAKS_BYTES, POSISI_FOTO } from './Config';
import { GalatBisnis } from './Galat';
import { denganLock } from './Lock';
import { Db } from './Db';
import { buatId } from './Id';
import { log } from './Log';
import { namaFolderUnit, namaFoto, InfoFoto } from './Penamaan';
import { tglIso, jamHm, sekarang } from './Utils';
import { getUnit } from './StokService';
import { subfolder } from './Drive';
import { ambilAtauBuatFolder } from './Pdf';

export type JenisReferensi = 'Unit' | 'Servis' | 'Pembelian' | 'Pembayaran' | 'Biaya' | 'Klaim';

export interface UnggahFotoInput {
  jenisReferensi: JenisReferensi;
  idReferensi: string;
  /** Posisi (unit), tahap (servis), jenis bukti (pembelian), metode (pembayaran), kategori (biaya); kosong untuk klaim */
  posisi?: string;
  base64Data: string; // tanpa header data:image/...
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface HasilUnggahFoto {
  idBerkas: string;
  namaBerkas: string;
  idFileDrive: string;
  linkDrive: string;
  ukuranKB: number;
  /** Gambar kecil (data URI) agar tidak bergantung pada cookie pihak ketiga di iframe; kosong bila tidak tersedia */
  pratinjau: string;
}

const JENIS_NAMA: Record<JenisReferensi, InfoFoto['jenis']> = {
  Unit: 'FOTO-HP', Servis: 'FOTO-SERVIS', Pembelian: 'BUKTI-BELI', Pembayaran: 'BUKTI-BAYAR', Biaya: 'BUKTI-BIAYA', Klaim: 'FOTO-KLAIM',
};

/** Kode yang sah per jenis (kosong = tidak memakai kode) */
const KODE_SAH: Record<JenisReferensi, readonly string[]> = {
  Unit: POSISI_FOTO,
  Servis: ['SEBELUM', 'PROSES', 'SESUDAH'],
  Pembelian: ['NOTA-SUPPLIER', 'KONDISI-BARANG', 'LAINNYA'],
  Pembayaran: ['TUNAI', 'TRANSFER', 'QRIS', 'LAINNYA'],
  Biaya: ['SEWA', 'LISTRIK', 'INTERNET', 'GAJI', 'TRANSPORT', 'IKLAN', 'LAINNYA'],
  Klaim: [],
};

const EKSTENSI: Record<UnggahFotoInput['mimeType'], 'jpg' | 'png' | 'webp'> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** Folder tujuan sesuai PRD 09 bagian 3 */
function folderTujuan(jenis: JenisReferensi, idRef: string): GoogleAppsScript.Drive.Folder {
  if (jenis === 'Unit') {
    const unit = getUnit(idRef);
    if (!unit) throw new GalatBisnis('UNIT_TIDAK_ADA', `Unit ${idRef} tidak ditemukan.`);
    const induk = subfolder(FOLDER.FOTO_HP);
    const nama = namaFolderUnit({ idUnit: unit.ID_Unit, namaBarang: unit.Nama_Barang, imei1: String(unit.IMEI_1) });
    const ada = induk.getFoldersByName(nama);
    if (ada.hasNext()) return ada.next();
    const baru = induk.createFolder(nama);
    Db.updateById(SHEET.STOK_HP, idRef, { Link_Foto: baru.getUrl() });
    return baru;
  }
  if (jenis === 'Servis' || jenis === 'Klaim') return subfolder(FOLDER.SERVIS);
  const bukti = subfolder(FOLDER.BUKTI_TRANSAKSI);
  const nama = jenis === 'Pembelian' ? FOLDER.BUKTI_PEMBELIAN : jenis === 'Pembayaran' ? FOLDER.BUKTI_PEMBAYARAN : FOLDER.BUKTI_BIAYA;
  return ambilAtauBuatFolder(bukti, nama);
}

function pratinjauDari(file: GoogleAppsScript.Drive.File): string {
  try {
    const t = file.getThumbnail();
    return t ? `data:${t.getContentType()};base64,${Utilities.base64Encode(t.getBytes())}` : '';
  } catch {
    return '';
  }
}

export function unggahFoto(input: UnggahFotoInput): HasilUnggahFoto {
  return denganLock(() => {
    const now = sekarang();
    const jenis = input.jenisReferensi;
    if (!JENIS_NAMA[jenis]) throw new GalatBisnis('JENIS_TIDAK_VALID', `Jenis referensi "${String(jenis)}" tidak dikenal.`);
    if (!input.idReferensi) throw new GalatBisnis('REFERENSI_KOSONG', 'ID referensi foto wajib diisi.');

    // 1. Validasi tipe berkas dan kode posisi/tahap
    if (!EKSTENSI[input.mimeType]) throw new GalatBisnis('TIPE_BERKAS_TIDAK_VALID', 'Hanya gambar JPEG, PNG, atau WebP yang diterima.');
    const kodeSah = KODE_SAH[jenis];
    const kode = kodeSah.length ? String(input.posisi ?? '').toUpperCase().replace(/\s+/g, '-') : '';
    if (kodeSah.length && !kodeSah.includes(kode)) {
      throw new GalatBisnis('POSISI_TIDAK_VALID', `Kode "${String(input.posisi ?? '')}" tidak terdaftar untuk foto ${jenis.toLowerCase()}.`);
    }

    // 2. Dekode dan validasi ukuran
    const bytes = Utilities.base64Decode(input.base64Data);
    if (!bytes.length) throw new GalatBisnis('FOTO_KOSONG', 'Berkas foto kosong.');
    if (bytes.length > FOTO_MAKS_BYTES) {
      throw new GalatBisnis('FOTO_TERLALU_BESAR', `Ukuran foto melebihi batas 1,5 MB (${Math.round(bytes.length / 1024)} KB).`);
    }

    // 3. Batas jumlah foto aktif per referensi
    const semua = Db.getAll(SHEET.BERKAS_FOTO) as Array<Record<string, unknown>>;
    const aktif = semua.filter(b => b.ID_Referensi === input.idReferensi && b.Status === 'Aktif');
    if (aktif.length >= FOTO_MAKS) throw new GalatBisnis('FOTO_TERLALU_BANYAK', `Batas maksimal ${FOTO_MAKS} foto sudah tercapai.`);

    // 4. Urutan per kombinasi referensi + kode; berkas tidak pernah menimpa
    const urutan = aktif.filter(b => b.Posisi_atau_Tahap === kode).length + 1;
    const namaFile = namaFoto({ jenis: JENIS_NAMA[jenis], idRef: input.idReferensi, posisi: kode, urutan, waktu: now, ekstensi: EKSTENSI[input.mimeType] });

    // 5. Simpan ke Drive dan catat
    const file = folderTujuan(jenis, input.idReferensi).createFile(Utilities.newBlob(bytes, input.mimeType, namaFile));
    const idBerkas = buatId(PREFIX_ID.BERKAS);
    const ukuranKB = Math.round(bytes.length / 1024);
    Db.append(SHEET.BERKAS_FOTO, {
      ID_Berkas: idBerkas, Tanggal: tglIso(now), Jam: jamHm(now), Jenis_Referensi: jenis, ID_Referensi: input.idReferensi,
      Posisi_atau_Tahap: kode, Urutan: urutan, Nama_Berkas: namaFile, ID_File_Drive: file.getId(), Link: file.getUrl(),
      Ukuran_KB: ukuranKB, Status: 'Aktif',
    });
    log('Tambah', SHEET.BERKAS_FOTO, idBerkas, `Foto ${kode || jenis} untuk ${input.idReferensi} (${ukuranKB} KB)`);
    return { idBerkas, namaBerkas: namaFile, idFileDrive: file.getId(), linkDrive: file.getUrl(), ukuranKB, pratinjau: pratinjauDari(file) };
  });
}

export interface FotoItem {
  idBerkas: string;
  posisi: string;
  urutan: number;
  nama: string;
  link: string;
  pratinjau: string;
}

/** Daftar foto aktif suatu referensi, lengkap dengan gambar kecil (data URI) untuk galeri. */
export function daftarFoto(jenis: JenisReferensi, idReferensi: string, denganPratinjau = true): FotoItem[] {
  const baris = (Db.getAll(SHEET.BERKAS_FOTO) as Array<Record<string, unknown>>)
    .filter(b => b.Jenis_Referensi === jenis && b.ID_Referensi === idReferensi && b.Status === 'Aktif');
  return baris.map(b => {
    let pratinjau = '';
    if (denganPratinjau) {
      try { pratinjau = pratinjauDari(DriveApp.getFileById(String(b.ID_File_Drive))); } catch { /* berkas hilang dari Drive */ }
    }
    return {
      idBerkas: String(b.ID_Berkas), posisi: String(b.Posisi_atau_Tahap), urutan: Number(b.Urutan) || 1,
      nama: String(b.Nama_Berkas), link: String(b.Link), pratinjau,
    };
  });
}

/** Pindahkan foto ke 02_FOTO-HP/_TERHAPUS dan ubah status; penghapusan permanen hanya manual oleh owner. */
export function hapusFoto(idBerkas: string): boolean {
  return denganLock(() => {
    const berkas = Db.findById(SHEET.BERKAS_FOTO, idBerkas);
    if (!berkas) return false;
    if (berkas.Status === 'Terhapus') return true;
    const fileId = String(berkas.ID_File_Drive ?? '');
    if (fileId) {
      try {
        const tujuan = ambilAtauBuatFolder(subfolder(FOLDER.FOTO_HP), FOLDER.TERHAPUS);
        DriveApp.getFileById(fileId).moveTo(tujuan);
      } catch {
        // berkas mungkin sudah tidak ada di Drive; status tetap diperbarui
      }
    }
    Db.updateById(SHEET.BERKAS_FOTO, idBerkas, { Status: 'Terhapus' });
    log('Ubah', SHEET.BERKAS_FOTO, idBerkas, 'Foto dipindahkan ke _TERHAPUS');
    return true;
  });
}
