// PratinjauDokumen.tsx — menampilkan HTML dokumen cetak apa adanya (iframe srcdoc), tinggi menyesuaikan isi.
import { useRef, useState } from 'preact/hooks';

export function PratinjauDokumen({ html, judul, minTinggi = 320 }: { html: string; judul: string; minTinggi?: number }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [tinggi, setTinggi] = useState(minTinggi);
  const ukur = () => {
    const d = ref.current?.contentDocument;
    if (!d) return;
    const h = Math.ceil(Math.max(d.documentElement.scrollHeight, d.body?.scrollHeight || 0));
    if (h > 0) setTinggi(Math.max(minTinggi, h));
  };
  return (
    <div class="doc-preview-wrap">
      <iframe ref={ref} class="doc-preview" title={judul} srcDoc={html} style={{ height: `${tinggi}px`, border: 0 }} onLoad={() => { ukur(); setTimeout(ukur, 150); }} />
    </div>
  );
}
