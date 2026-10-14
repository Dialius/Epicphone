// cetak.ts — mesin cetak dokumen (nota, laporan). Dokumen dirender sebagai HTML mandiri lalu dicetak lewat
// iframe tersembunyi, jadi hasil cetak tidak bergantung pada tampilan aplikasi (menu, warna tema, scroll modal).
// Pratinjau di layar memakai HTML yang sama persis (iframe srcdoc), sehingga yang dilihat = yang tercetak.

export type Kertas = 'A4' | 'A5' | '80mm';

const HALAMAN: Record<Kertas, string> = {
  A4: '@page { size: A4 portrait; margin: 14mm 14mm 16mm; }',
  A5: '@page { size: A5 portrait; margin: 9mm 10mm 10mm; }',
  '80mm': '@page { size: 80mm 297mm; margin: 3mm 3mm 6mm; }',
};

/** Lebar kertas dalam mm (untuk pratinjau) */
export const LEBAR_MM: Record<Kertas, number> = { A4: 210, A5: 148, '80mm': 80 };

const DASAR = `*,*::before,*::after{box-sizing:border-box;}html,body{margin:0;padding:0;}body{font-family:"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#0F172A;font-size:11px;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact;}table{border-collapse:collapse;width:100%;}tr,.tahan{break-inside:avoid;page-break-inside:avoid;}h1,h2,h3,p{margin:0;}.num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;}.tengah{text-align:center;}.kecil{font-size:9px;color:#64748B;}.tebal{font-weight:700;}/* pratinjau di layar:kertas berada di tengah dengan bayangan */html.layar body{background:#E5E9F0;padding:16px 12px;}html.layar .kertas{margin:0 auto;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.18),0 8px 24px rgba(15,23,42,.10);}@media print{html.layar body{background:#fff;padding:0;}html.layar .kertas{box-shadow:none;}}`;

export interface OpsiDokumen { judul: string; isi: string; css: string; kertas: Kertas; layar?: boolean }

/** HTML lengkap satu dokumen. `layar` = untuk pratinjau (kertas diberi padding sebagai pengganti margin cetak). */
export function dokumenHtml({ judul, isi, css, kertas, layar = false }: OpsiDokumen): string {
  const mm = LEBAR_MM[kertas];
  const pad = kertas === 'A4' ? '14mm' : kertas === 'A5' ? '9mm 10mm' : '3mm';
  const kertasCss = layar
    ? `html.layar .kertas { width: ${mm}mm; max-width: 100%; padding: ${pad}; }`
    : `.kertas { width: 100%; }`;
  return `<!doctype html><html lang="id" class="${layar ? 'layar' : ''}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">`
    + `<title>${judul.replace(/[<>&]/g, '')}</title><style>${HALAMAN[kertas]}${DASAR}${kertasCss}${css}</style></head><body><div class="kertas">${isi}</div></body></html>`;
}

/** Cetak HTML lewat iframe tersembunyi. true = dialog cetak terbuka; false = browser memblokir (mis. jendela tertanam tanpa izin cetak). */
export function cetakHtml(html: string): Promise<boolean> {
  return new Promise(resolve => {
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true');
    f.tabIndex = -1;
    f.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:600px;border:0;opacity:0;pointer-events:none;';
    let selesai = false;
    const bersih = () => { if (f.parentNode) f.parentNode.removeChild(f); };
    const akhir = (ok: boolean) => { if (selesai) return; selesai = true; resolve(ok); };
    f.onload = () => {
      const w = f.contentWindow;
      if (!w) { bersih(); akhir(false); return; }
      // beri waktu gambar (logo) dan font sistem selesai ditata sebelum dialog cetak muncul
      setTimeout(() => {
        try {
          w.addEventListener('afterprint', () => setTimeout(bersih, 300));
          w.focus();
          w.print();
          akhir(true);
          setTimeout(bersih, 120000); // jaga-jaga bila afterprint tidak terpicu
        } catch {
          bersih(); akhir(false);
        }
      }, 250);
    };
    f.srcdoc = html;
    document.body.appendChild(f);
  });
}

/** Alternatif bila cetak diblokir: buka dokumen di tab baru (pengguna dapat Ctrl+P dari sana). */
export function bukaDiTabBaru(html: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const w = window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return !!w;
  } catch { return false; }
}
