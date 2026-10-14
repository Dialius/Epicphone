// Charts.tsx — grafik SVG inline tanpa pustaka (keputusan D005: satu berkas, tanpa CDN).
// Aksesibel: role="img" + ringkasan teks + tabel tersembunyi. Menghormati mode privasi.
import { useState } from 'preact/hooks';
import { rupiah, rupiahRingkas } from '../lib/format';
import { TitikTren } from '../lib/derive';

export function BarChart({ data, privasi, judul = 'Omzet tren' }: { data: TitikTren[]; privasi?: boolean; judul?: string }) {
  const [tip, setTip] = useState<number | null>(null);
  const W = 560, H = 210, padL = 8, padR = 8, padT = 12, padB = 30;
  const max = Math.max(1, ...data.map(d => d.omzet));
  const nice = (() => {
    const e = Math.pow(10, Math.floor(Math.log10(max))); const f = max / e;
    const langkah = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    return (langkah.find(s => s >= f) || 10) * e;
  })();
  const plotH = H - padT - padB;
  const count = Math.max(1, data.length);
  const bw = (W - padL - padR) / count;
  const avg = data.length ? data.reduce((s, d) => s + d.omzet, 0) / data.length : 0;
  const y = (v: number) => padT + plotH - (v / nice) * plotH;
  const itemPertama = data[0] || { label: '-', omzet: 0, laba: 0, hariIni: false, contoh: false };
  const tertinggi = data.reduce((a, b) => (b.omzet > a.omzet ? b : a), itemPertama);
  const terendah = data.reduce((a, b) => (b.omzet < a.omzet ? b : a), itemPertama);
  const ringkas = privasi
    ? `Grafik ${judul} disembunyikan karena mode privasi aktif.`
    : `${judul}. Tertinggi ${tertinggi.label} ${rupiahRingkas(tertinggi.omzet)}, terendah ${terendah.label} ${rupiahRingkas(terendah.omzet)}, rata-rata ${rupiahRingkas(avg)}.`;
  const padLabel = data.length > 20 ? 4 : data.length > 10 ? 2 : 1;
  return (
    <div class="chart-wrap" style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ringkas} class={privasi ? 'masked' : ''}>
        {[0, 0.5, 1].map(f => (
          <g key={f}>
            <line x1={padL} x2={W - padR} y1={y(nice * f)} y2={y(nice * f)} stroke="var(--border)" stroke-width="1" />
            {!privasi && f > 0 && <text x={padL} y={y(nice * f) - 4} font-size="12" fill="var(--text-3)">{rupiahRingkas(nice * f)}</text>}
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + i * bw + bw * 0.18, w = Math.max(2, bw * 0.64), h = Math.max(2, (d.omzet / nice) * plotH);
          const tampilLabel = i % padLabel === 0 || i === data.length - 1;
          const fontSize = data.length > 15 ? 10 : 12;
          return (
            <g key={i} onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)} onClick={() => setTip(tip === i ? null : i)} style={{ cursor: 'pointer' }}>
              <rect x={padL + i * bw} y={padT} width={bw} height={plotH + padB} fill="transparent" />
              <rect class={`bar ${d.hariIni ? 'today' : ''}`} x={x} y={padT + plotH - h} width={w} height={h} rx={w > 6 ? 4 : 1} />
              {tampilLabel && <text x={x + w / 2} y={H - 10} text-anchor="middle" font-size={fontSize} font-weight={d.hariIni ? 700 : 400} fill={d.hariIni ? 'var(--text)' : 'var(--text-3)'}>{d.label}</text>}
              {d.hariIni && !privasi && data.length <= 10 && <text x={x + w / 2} y={padT + plotH - h - 6} text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">{rupiahRingkas(d.omzet)}</text>}
            </g>
          );
        })}
        {!privasi && avg > 0 && <line x1={padL} x2={W - padR} y1={y(avg)} y2={y(avg)} stroke="var(--warn-solid)" stroke-width="1.5" stroke-dasharray="5 4" />}
      </svg>
      {tip !== null && !privasi && data[tip] && (
        <div class="chart-tip" style={{ left: `${((padL + tip * bw + bw / 2) / W) * 100}%`, top: `${(y(data[tip].omzet) / H) * 100}%` }}>
          {data[tip].label}: {rupiah(data[tip].omzet)}
        </div>
      )}
      {!privasi && avg > 0 && <div class="stale-note" style={{ marginTop: 4 }}>Garis putus-putus: rata-rata {rupiahRingkas(avg)}</div>}
      <table class="sr-only">
        <caption>{judul}</caption>
        <thead><tr><th>Rentang</th><th>Omzet</th></tr></thead>
        <tbody>{data.map(d => <tr key={d.label}><td>{d.label}</td><td>{privasi ? 'disembunyikan' : rupiah(d.omzet)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

/** Garis tren kecil. Garis tipis dan tetap tipis walau grafik melebar (non-scaling-stroke). */
export function Sparkline({ values, class: cls }: { values: number[]; class?: string }) {
  const W = 120, H = 40;
  const max = Math.max(1, ...values), min = Math.min(0, ...values);
  const rng = Math.max(1, max - min);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * (W - 4) + 2},${H - 4 - ((v - min) / rng) * (H - 8)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} class={cls} aria-hidden="true" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="rgba(255,255,255,.8)" stroke-width="1.25" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}
