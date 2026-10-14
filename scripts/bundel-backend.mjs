// bundel-backend.mjs — membundel satu berkas masuk backend menjadi JS gaya Apps Script (V8).
import { build } from 'esbuild';
import fs from 'fs';
import { buatPembungkus, namaFungsiPublik } from './gas-exports.mjs';

export const BERKAS = {
  code: { sumber: 'src/backend/Code.ts', globalName: '__epicphone__' },
  setup: { sumber: 'src/backend/SetupSheets.ts', globalName: '__epicsetup__' },
};

/** Hasilkan teks bundel (tanpa menulis berkas) beserta pembungkus global */
export async function bundelTeks(kunci, { kecuali = [], banner = '' } = {}) {
  const { sumber, globalName } = BERKAS[kunci];
  const hasil = await build({
    entryPoints: [sumber], bundle: true, write: false, platform: 'browser', target: 'es2017',
    format: 'iife', globalName, legalComments: 'none',
  });
  const isi = hasil.outputFiles[0].text;
  const bungkus = buatPembungkus({ sumber, globalName, kecuali });
  return `${banner}${isi}\n${bungkus}\n`;
}

export function fungsiGlobal(kunci) {
  return namaFungsiPublik(BERKAS[kunci].sumber);
}

export function kb(berkas) {
  return (fs.statSync(berkas).size / 1024).toFixed(0) + ' KB';
}
