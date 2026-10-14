// Log.ts — tulis baris ke sheet Log_Aktivitas

import { SHEET } from './Config';
import { tglIso, jamHm, sanitasi, sekarang } from './Utils';
import { Db } from './Db';

export type AksiLog = 'Tambah' | 'Ubah' | 'Batal' | 'Sistem';

export function log(
  aksi: AksiLog,
  sheet: string,
  idData: string,
  ringkasan: string,
): void {
  try {
    const now = sekarang();
    Db.append(SHEET.LOG_AKTIVITAS, {
      Tanggal: tglIso(now),
      Jam: jamHm(now),
      Aksi: aksi,
      Sheet: sheet,
      ID_Data: idData,
      Ringkasan: sanitasi(ringkasan),
    });
  } catch {
    // Log tidak boleh melempar error ke proses utama
  }
}
