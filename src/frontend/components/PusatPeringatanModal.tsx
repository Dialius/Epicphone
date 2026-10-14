// PusatPeringatanModal.tsx — peringatan nyata (diturunkan dari data), dikelompokkan menurut tingkat.
import { ModalShell } from './ModalShell';
import { PeringatanItem } from '../mock/data-contoh';
import { ToastLogItem } from '../lib/toast';
import { IconReceipt, IconBox, IconWrench, IconChevronRight, IconCheckCircle } from './Icons';
import { linkWa } from '../lib/format';

interface Props {
  onClose: () => void;
  list: PeringatanItem[];
  log?: ToastLogItem[];
  onBuka: (item: PeringatanItem) => void;
}

const GRUP: Array<{ k: 'kritis' | 'tindakan' | 'info'; judul: string }> = [
  { k: 'kritis', judul: 'Kritis' }, { k: 'tindakan', judul: 'Perlu tindakan' }, { k: 'info', judul: 'Info' },
];

function Ikon({ t }: { t: PeringatanItem['tipe'] }) {
  if (t === 'telat') return <IconReceipt size={18} />;
  if (t === 'servis-siap') return <IconWrench size={18} />;
  return <IconBox size={18} />;
}

export function PusatPeringatanModal({ onClose, list, log = [], onBuka }: Props) {
  return (
    <ModalShell onClose={onClose} title="Pusat peringatan" subtitle={list.length ? `${list.length} hal perlu perhatian` : 'Semua beres'} size="md"
      footer={<button type="button" class="btn btn-secondary btn-block" onClick={onClose}>Tutup</button>}>
      {list.length === 0 && (
        <div class="empty-state">
          <div class="empty-icon" style={{ background: 'var(--ok-bg)', color: 'var(--ok-fg)' }}><IconCheckCircle size={28} /></div>
          <h2>Semua beres</h2>
          <p>Tidak ada tagihan telat, stok mengendap, atau servis yang menunggu.</p>
        </div>
      )}
      {GRUP.map(g => {
        const items = list.filter(p => (p.tingkat || 'info') === g.k);
        if (!items.length) return null;
        return (
          <section key={g.k} class="stack" style={{ gap: '8px' }}>
            <div class="eyebrow">{g.judul} ({items.length})</div>
            {items.map(p => (
              <div key={p.id} class={`alert-row ${g.k === 'kritis' ? 'bad' : g.k === 'info' ? 'info' : ''}`}>
                <span class="alert-icon-wrap"><Ikon t={p.tipe} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{p.judul}</div>
                  <div class="title-sub" style={{ marginTop: '2px' }}>{p.deskripsi}</div>
                  <div class="row" style={{ marginTop: '10px', gap: '8px', flexWrap: 'wrap' }}>
                    {p.noWa && p.aksiLabel ? (
                      <a class="btn btn-secondary btn-sm" href={linkWa(p.noWa!, `Halo, kami dari Epic Phone. ${p.judul}. ${p.deskripsi}.`)} target="_blank" rel="noopener noreferrer">{p.aksiLabel}</a>
                    ) : null}
                    <button type="button" class="btn btn-ghost btn-sm" onClick={() => onBuka(p)}>Buka <IconChevronRight size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        );
      })}
      {log.length > 0 && (
        <section class="stack" style={{ gap: '6px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div class="eyebrow">Aktivitas terbaru</div>
          {log.slice(0, 6).map(l => (
            <div key={l.id} class="row" style={{ alignItems: 'flex-start', fontSize: 'var(--text-sm)', gap: '10px' }}>
              <span style={{ color: l.tipe === 'error' ? 'var(--bad-solid)' : l.tipe === 'warning' ? 'var(--warn-solid)' : 'var(--ok-solid)', marginTop: '2px' }}><IconCheckCircle size={16} /></span>
              <span style={{ flex: 1 }}>{l.judul}</span>
              <span class="title-sub">{new Date(l.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.')}</span>
            </div>
          ))}
        </section>
      )}
    </ModalShell>
  );
}
