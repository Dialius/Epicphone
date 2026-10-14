// Drive.ts — pencari folder baku di Google Drive (nama folder dari Config.FOLDER)

import { FOLDER } from './Config';
import { GalatBisnis } from './Galat';

/** Folder utama EPICPHONE_00_SISTEM */
export function folderUtama(): GoogleAppsScript.Drive.Folder {
  const it = DriveApp.getFoldersByName(FOLDER.UTAMA);
  if (!it.hasNext()) {
    throw new GalatBisnis('FOLDER_HILANG', `Folder "${FOLDER.UTAMA}" tidak ditemukan. Jalankan setupAwal() atau perbaikiFolder().`);
  }
  return it.next();
}

/** Turun lewat nama-nama subfolder dari folder utama, mis. subfolder(FOLDER.BACKUP, FOLDER.BACKUP_HARIAN) */
export function subfolder(...nama: string[]): GoogleAppsScript.Drive.Folder {
  let f = folderUtama();
  for (const n of nama) {
    const it = f.getFoldersByName(n);
    if (!it.hasNext()) throw new GalatBisnis('FOLDER_HILANG', `Subfolder "${n}" tidak ditemukan.`);
    f = it.next();
  }
  return f;
}
