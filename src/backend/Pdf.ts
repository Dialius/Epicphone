// Pdf.ts — HTML -> PDF di Drive (Apps Script: HtmlService + getAs). Dipakai nota dan laporan.
// Catatan: ukuran halaman lewat CSS @page tidak selalu dipatuhi pengubah PDF Google; tata letak
// memakai tabel dan lebar tetap agar tampilan stabil di A5/A4.

import { GalatBisnis } from './Galat';

export function htmlKePdf(html: string, namaBerkas: string): GoogleAppsScript.Base.Blob {
  const blob = HtmlService.createHtmlOutput(html).getBlob().getAs('application/pdf');
  blob.setName(namaBerkas);
  return blob;
}

export function ambilAtauBuatFolder(induk: GoogleAppsScript.Drive.Folder, nama: string): GoogleAppsScript.Drive.Folder {
  const it = induk.getFoldersByName(nama);
  return it.hasNext() ? it.next() : induk.createFolder(nama);
}

/** Keluar-masuk teks HTML aman (nama pelanggan, catatan, dll.) */
export function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);
}

export function wajibFile(f: GoogleAppsScript.Drive.File | null, pesan: string): GoogleAppsScript.Drive.File {
  if (!f) throw new GalatBisnis('BERKAS_TIDAK_ADA', pesan);
  return f;
}
