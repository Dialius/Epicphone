// purge-css.mjs — membuang aturan CSS yang kelasnya tidak dipakai di kode (src/frontend/**/*.ts|tsx|html).
// Dipakai agar Index.html tetap di bawah 400 KB (PRD 04 bagian 9). Konservatif: sebuah kelas dianggap dipakai bila
// namanya muncul sebagai teks di berkas sumber mana pun, atau diawali awalan yang disusun dinamis (btn-, toast-, ...).
// Pakai:  node scripts/purge-css.mjs          -> hanya melaporkan
//         node scripts/purge-css.mjs --tulis  -> menulis ulang berkas CSS
import fs from 'fs';
import path from 'path';
import postcss from 'postcss';

const akar = 'src/frontend';
const tulis = process.argv.includes('--tulis');
const AWALAN_DINAMIS = ['btn-', 'toast-', 'sheet-', 'banner-', 'chip-', 'badge-', 'pick-', 'seg-', 'tl-'];

const jelajah = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? jelajah(path.join(d, e.name)) : [path.join(d, e.name)]));
const sumber = jelajah(akar).filter(f => /\.(tsx?|html)$/.test(f) && !f.includes('.tmp-single')).map(f => fs.readFileSync(f, 'utf8')).join('\n');
const dipakai = c => sumber.includes(c) || AWALAN_DINAMIS.some(a => c.startsWith(a));

let totalBuang = 0;
for (const f of jelajah(`${akar}/styles`).filter(f => f.endsWith('.css'))) {
  const css = fs.readFileSync(f, 'utf8');
  const ast = postcss.parse(css);
  let buang = 0;
  ast.walkRules(rule => {
    if (rule.parent?.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
    const pakai = rule.selectors.filter(sel => {
      const kelas = [...sel.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(m => m[1]);
      return kelas.length === 0 || kelas.every(dipakai);
    });
    if (pakai.length === 0) { buang += rule.toString().length; if (tulis) rule.remove(); }
    else if (pakai.length < rule.selectors.length && tulis) rule.selectors = pakai;
  });
  if (tulis) {
    ast.walkAtRules(a => { if (a.nodes && a.nodes.length === 0 && a.name !== 'font-face') a.remove(); });
    fs.writeFileSync(f, ast.toString());
  }
  totalBuang += buang;
  console.log(`${path.basename(f).padEnd(14)} ${String(css.length).padStart(6)} B, ${tulis ? 'dibuang' : 'dapat dibuang'} ~${buang} B`);
}
console.log(`total ~${totalBuang} B ${tulis ? 'dibuang' : 'dapat dibuang (jalankan dengan --tulis)'}`);
