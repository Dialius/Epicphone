// PencarianGlobalModal.tsx — palet pencarian: unit, aksesoris, transaksi, kontak, pintasan.
// Panah atas/bawah memilih, Enter membuka, Esc menutup. Pencarian terakhir tersimpan.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { UnitHP, Aksesoris, TransaksiItem, KontakItem } from '../mock/data-contoh';
import { IconSearch, IconBox, IconReceipt, IconUser, IconTag, IconClose, IconChevronRight, IconClock } from './Icons';
import { registerOverlay, jebakFokus } from '../lib/overlay';
import { bacaLocal, tulisLocal } from '../lib/usePersist';
import { rupiah } from '../lib/format';

interface Props {
  onClose: () => void;
  units: UnitHP[];
  aksesoris: Aksesoris[];
  transaksi: TransaksiItem[];
  kontak: KontakItem[];
  onPilihUnit: (u: UnitHP) => void;
  onPilihTransaksi: (t: TransaksiItem) => void;
  onPilihKontak: (k: KontakItem) => void;
  onPilihAksesoris: (a: Aksesoris) => void;
  onPintasan: (tab: string, filter?: string) => void;
}

interface Hasil { grup: string; id: string; judul: string; sub: string; ikon: any; aksi: () => void }

const PINTASAN = [
  { judul: 'Stok siap jual', sub: 'Unit berstatus Ready', tab: 'stok', filter: 'ready' },
  { judul: 'Tagihan telat', sub: 'Piutang lewat jatuh tempo', tab: 'tagihan', filter: 'telat' },
  { judul: 'Servis berjalan', sub: 'Antri dan dikerjakan', tab: 'servis' },
];

function Sorot({ teks, q }: { teks: string; q: string }) {
  if (!q) return <>{teks}</>;
  const i = teks.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{teks}</>;
  return <>{teks.slice(0, i)}<mark style={{ background: 'var(--warn-bg)', color: 'inherit', borderRadius: 3 }}>{teks.slice(i, i + q.length)}</mark>{teks.slice(i + q.length)}</>;
}

export function PencarianGlobalModal(p: Props) {
  const [q, setQ] = useState('');
  const [aktif, setAktif] = useState(0);
  const [terakhir, setTerakhir] = useState<string[]>(() => bacaLocal<string[]>('cari-terakhir', []));
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const closeRef = useRef(p.onClose); closeRef.current = p.onClose;

  useEffect(() => {
    const lepas = registerOverlay(() => closeRef.current());
    const lepasFokus = box.current ? jebakFokus(box.current) : () => {};
    setTimeout(() => input.current?.focus(), 20);
    return () => { lepasFokus(); lepas(); };
  }, []);

  const needle = q.trim().toLowerCase();
  const hasil: Hasil[] = useMemo(() => {
    const r: Hasil[] = [];
    const digits = needle.replace(/\D/g, '');
    if (needle.length < 1) {
      PINTASAN.forEach(x => r.push({ grup: 'Pintasan', id: 'pt-' + x.judul, judul: x.judul, sub: x.sub, ikon: <IconChevronRight size={18} />, aksi: () => p.onPintasan(x.tab, x.filter) }));
      return r;
    }
    (p.units || []).filter(u => u.nama.toLowerCase().includes(needle) || u.imei.includes(needle) || u.id.toLowerCase().includes(needle)).slice(0, 5)
      .forEach(u => r.push({ grup: 'Unit HP', id: u.id, judul: u.nama, sub: `${u.id} · IMEI ...${u.imei.slice(-4)} · ${u.status} · ${rupiah(u.hargaJualTarget)}`, ikon: <IconBox size={18} />, aksi: () => p.onPilihUnit(u) }));
    (p.aksesoris || []).filter(a => a.nama.toLowerCase().includes(needle) || a.sku.toLowerCase().includes(needle)).slice(0, 5)
      .forEach(a => r.push({ grup: 'Aksesoris', id: a.sku, judul: a.nama, sub: `${a.sku} · stok ${a.stok} · ${rupiah(a.hargaJual)}`, ikon: <IconTag size={18} />, aksi: () => p.onPilihAksesoris(a) }));
    (p.transaksi || []).filter(t => t.id.toLowerCase().includes(needle) || t.judul.toLowerCase().includes(needle) || t.pihak.toLowerCase().includes(needle)).slice(0, 5)
      .forEach(t => r.push({ grup: 'Transaksi', id: t.id, judul: t.judul, sub: `${t.id} · ${t.tanggal} · ${t.pihak} · ${rupiah(t.nominal)}`, ikon: <IconReceipt size={18} />, aksi: () => p.onPilihTransaksi(t) }));
    (p.kontak || []).filter(k => k.nama.toLowerCase().includes(needle) || (digits.length >= 3 && k.noWa.replace(/\D/g, '').includes(digits))).slice(0, 5)
      .forEach(k => r.push({ grup: 'Kontak', id: k.id, judul: k.nama, sub: `${k.tipe} · ${k.noWa}`, ikon: <IconUser size={18} />, aksi: () => p.onPilihKontak(k) }));
    return r;
  }, [needle, p.units, p.aksesoris, p.transaksi, p.kontak]);

  useEffect(() => { setAktif(0); }, [needle]);
  useEffect(() => { box.current?.querySelector('.search-result-row.aktif')?.scrollIntoView({ block: 'nearest' }); }, [aktif]);

  const pilih = (h?: Hasil) => {
    if (!h) return;
    if (needle) { const baru = [q.trim(), ...terakhir.filter(x => x !== q.trim())].slice(0, 5); setTerakhir(baru); tulisLocal('cari-terakhir', baru); }
    h.aksi();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAktif(a => Math.min(hasil.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAktif(a => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); pilih(hasil[aktif]); }
  };

  let lastGrup = '';
  return (
    <div class="modal-overlay palette-ov" onMouseDown={e => { if (e.target === e.currentTarget) p.onClose(); }}>
      <div ref={box} class="sheet-container palette" role="dialog" aria-modal="true" aria-label="Pencarian">
        <div class="palette-bar">
          <span class="search-icon-pos" style={{ position: 'static', transform: 'none' }}><IconSearch size={20} /></span>
          <input ref={input} class="palette-input" type="search" inputMode="search" placeholder="Cari unit, IMEI, nota, pelanggan..." value={q}
            onInput={e => setQ((e.target as HTMLInputElement).value)} onKeyDown={onKey} aria-label="Kata kunci pencarian" autocomplete="off"
            role="combobox" aria-expanded="true" aria-controls="palette-list" />
          <button type="button" class="icon-btn" onClick={p.onClose} aria-label="Tutup pencarian"><IconClose size={20} /></button>
        </div>
        <div class="palette-list" id="palette-list" role="listbox">
          {!needle && terakhir.length > 0 && (
            <div>
              <div class="eyebrow palette-grup">Pencarian terakhir</div>
              <div class="filter-chip-row" style={{ padding: '0 12px 8px' }}>
                {terakhir.map(t => <button key={t} type="button" class="filter-chip" onClick={() => setQ(t)}><IconClock size={14} /> {t}</button>)}
              </div>
            </div>
          )}
          {hasil.map((h, i) => {
            const head = h.grup !== lastGrup ? <div class="eyebrow palette-grup">{h.grup}</div> : null;
            lastGrup = h.grup;
            return (
              <div key={h.grup + h.id}>
                {head}
                <button type="button" role="option" aria-selected={i === aktif} class={`search-result-row ${i === aktif ? 'aktif' : ''}`} onMouseEnter={() => setAktif(i)} onClick={() => pilih(h)}>
                  <span class="search-result-icon">{h.ikon}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Sorot teks={h.judul} q={q.trim()} /></span>
                    <span class="title-sub" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.sub}</span>
                  </span>
                </button>
              </div>
            );
          })}
          {needle && hasil.length === 0 && (
            <div class="empty-state"><div class="empty-icon"><IconSearch size={24} /></div><h3>Tidak ada hasil untuk "{q.trim()}"</h3><p>Coba IMEI lengkap, nomor nota, atau nama pelanggan.</p></div>
          )}
        </div>
        <div class="palette-foot"><span><kbd class="pick-key">↑</kbd> <kbd class="pick-key">↓</kbd> pilih</span><span><kbd class="pick-key">Enter</kbd> buka</span><span><kbd class="pick-key">Esc</kbd> tutup</span></div>
      </div>
    </div>
  );
}
