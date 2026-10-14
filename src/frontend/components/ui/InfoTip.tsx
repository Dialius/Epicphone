// InfoTip.tsx — ikon info dengan keterangan yang benar-benar muncul:
// hover (desktop), fokus keyboard, dan ketuk (HP). Esc atau ketuk di luar menutup.
import { useEffect, useRef, useState } from 'preact/hooks';
import { IconInfo } from '../Icons';

let uid = 0;

export function InfoTip({ teks, label = 'Keterangan', rata = 'tengah' }: { teks: string; label?: string; rata?: 'tengah' | 'kiri' }) {
  const [buka, setBuka] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const idRef = useRef('tip-' + ++uid);

  useEffect(() => {
    if (!buka) return;
    const luar = (e: Event) => { if (ref.current && !ref.current.contains(e.target as Node)) setBuka(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setBuka(false); e.stopPropagation(); } };
    document.addEventListener('pointerdown', luar);
    document.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('pointerdown', luar); document.removeEventListener('keydown', esc, true); };
  }, [buka]);

  return (
    <span ref={ref} class={`infotip ${rata === 'kiri' ? 'kiri' : ''} ${buka ? 'buka' : ''}`}>
      <button type="button" class="infotip-btn" aria-label={`${label}: ${teks}`} aria-describedby={idRef.current} aria-expanded={buka}
        onClick={e => { e.stopPropagation(); setBuka(b => !b); }}>
        <IconInfo size={16} />
      </button>
      <span id={idRef.current} role="tooltip" class="infotip-pop">{teks}</span>
    </span>
  );
}
