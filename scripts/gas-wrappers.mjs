// gas-wrappers.mjs — Apps Script hanya melihat fungsi tingkat atas. Bundel esbuild membungkus
// semuanya dalam IIFE (__epicphone__), jadi google.script.run dan trigger tidak menemukan apa pun.
// Berkas ini membuat pembungkus global untuk setiap `export function` di src/backend/Code.ts.
import fs from 'fs';

export function namaFungsiPublik(sumber = 'src/backend/Code.ts') {
  const teks = fs.readFileSync(sumber, 'utf8');
  return [...teks.matchAll(/^export function (\w+)\s*\(/gm)].map(m => m[1]);
}

/** Teks JS berisi `function nama(){ return __epicphone__.nama.apply(this, arguments); }` */
export function buatPembungkus({ kecuali = [] } = {}) {
  return namaFungsiPublik()
    .filter(n => !kecuali.includes(n))
    .map(n => `function ${n}() { return __epicphone__.${n}.apply(this, arguments); }`)
    .join('\n');
}
