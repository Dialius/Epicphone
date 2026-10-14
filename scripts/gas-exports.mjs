// gas-exports.mjs — Apps Script hanya melihat fungsi tingkat atas. Bundel esbuild membungkus
// semuanya dalam IIFE, jadi google.script.run dan trigger tidak menemukan apa pun.
// Berkas ini membuat pembungkus global untuk setiap `export function` pada berkas masuk backend
// (src/backend/Code.ts untuk Code.gs, src/backend/SetupSheets.ts untuk SetupSheets.gs).
import fs from 'fs';

export function namaFungsiPublik(sumber = 'src/backend/Code.ts') {
  const teks = fs.readFileSync(sumber, 'utf8');
  return [...teks.matchAll(/^export function (\w+)\s*\(/gm)].map(m => m[1]);
}

/** Teks JS berisi `function nama() { return <globalName>.nama.apply(this, arguments); }` */
export function buatPembungkus({ sumber = 'src/backend/Code.ts', globalName = '__epicphone__', kecuali = [] } = {}) {
  return namaFungsiPublik(sumber)
    .filter(n => !kecuali.includes(n))
    .map(n => `function ${n}() { return ${globalName}.${n}.apply(this, arguments); }`)
    .join('\n');
}
