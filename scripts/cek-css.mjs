// cek-css.mjs — pagar pengaman CSS (jalankan: npm run cek:css)
// Gagal (exit 1) bila ada kelas dipakai di JSX tanpa definisi CSS, variabel CSS tanpa definisi,
// ukuran font di bawah 12px, atau berkas dist melewati anggaran.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'src/frontend';
const walk = (d, ok) => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p, ok) : ok(p) ? [p] : []; });
const tsx = walk(SRC, p => p.endsWith('.tsx'));
const css = walk(SRC, p => p.endsWith('.css'));
const cssText = css.map(f => readFileSync(f, 'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
const jsText = tsx.map(f => readFileSync(f, 'utf8'));

const definedClass = new Set([...cssText.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(m => m[1]));
const definedVar = new Set([...cssText.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
const usedClass = new Map();
jsText.forEach((t, i) => {
  for (const m of t.matchAll(/class(?:Name)?=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    const s = (m[1] ?? m[2] ?? '').replace(/\$\{[^}]*\}/g, ' ');
    s.split(/\s+/).filter(c => /^[\w-]+$/.test(c)).forEach(c => usedClass.set(c, tsx[i]));
  }
});
// kelas penanda keadaan/tes yang sah tanpa gaya sendiri
const BOLEH = new Set(['aktif', 'selesai', 'done', 'current', 'next', 'prev', 'on', 'wide', 'masked', 'aksi', 'terisi', 'wajib', 'up', 'down', 'flat', 'today', 'bad', 'info', 'kritis', 'tindakan', 'mono', 'loading', 'invalid', 'always', 'ok', 'warn']);
const yatimKelas = [...usedClass].filter(([c]) => !definedClass.has(c) && !BOLEH.has(c) && !c.endsWith('-')); // akhiran '-' = awalan kelas dinamis
const usedVar = new Map();
[...jsText, cssText].forEach((t, i) => { for (const m of t.matchAll(/var\((--[\w-]+)/g)) usedVar.set(m[1], i); });
const yatimVar = [...usedVar.keys()].filter(v => !definedVar.has(v));
const kecil = [...cssText.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)].filter(m => +m[1] < 12).length;

let gagal = false;
const lapor = (judul, daftar) => { if (daftar.length) { gagal = true; console.log(`GAGAL ${judul} (${daftar.length}):`, daftar.slice(0, 40).join(', ')); } else console.log(`ok    ${judul}`); };
lapor('kelas dipakai tanpa definisi CSS', yatimKelas.map(([c, f]) => `${c} (${f.replace(SRC + '/', '')})`));
lapor('variabel CSS tanpa definisi', yatimVar);
lapor('font-size di bawah 12px', kecil ? [`${kecil} deklarasi`] : []);
const inline = jsText.reduce((n, t) => n + (t.match(/style=\{\{/g) || []).length, 0);
console.log(`info  inline style di JSX: ${inline} (target jangka panjang: 0 untuk layar yang sudah dimigrasi)`);
if (existsSync('dist/index.html')) {
  const kb = statSync('dist/index.html').size / 1024;
  if (kb > 500) { gagal = true; console.log(`GAGAL dist/index.html ${kb.toFixed(0)} KB melewati anggaran 500 KB`); } else console.log(`ok    dist/index.html ${kb.toFixed(0)} KB (anggaran 500 KB)`);
}
process.exit(gagal ? 1 : 0);
