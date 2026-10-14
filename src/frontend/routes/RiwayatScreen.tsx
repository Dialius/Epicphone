// RiwayatScreen.tsx — buku transaksi: dikelompokkan per hari, filter jenis + periode yang benar-benar bekerja,
// ringkasan masuk/keluar, rincian transaksi, ekspor CSV. Transaksi tidak dihapus, hanya dibatalkan.

import { useState, useMemo } from 'preact/hooks';
import { TransaksiItem } from '../mock/data-contoh';
import { ModalShell } from '../components/ModalShell';
import { EmptyState, PillStatus } from '../components/ui/Kit';
import { IconSearch, IconReceipt, IconClose, IconDownload, IconBox, IconWrench, IconBanknote, IconChevronRight } from '../components/Icons';
import { rupiah, MASK, parseTgl, selisihHari, tglWib } from '../lib/format';
import { tanggalAcuan } from '../lib/derive';

interface Props {
  transaksiList?: TransaksiItem[];
  onBukaNota: (transaksi: TransaksiItem) => void;
  onBukaBatal: (transaksi: TransaksiItem) => void;
  onBukaUnit?: (unitId: string) => void;
  isPrivacyMode: boolean;
  /** 'Jual' | 'Beli' | 'Servis' | 'Bayar' atau teks bebas (mis. nama pelanggan dari Kontak) */
  filterAwal?: string;
}

type Jenis = 'Semua' | 'Jual' | 'Beli' | 'Servis' | 'Bayar';
type Periode = 'hari-ini' | '7-hari' | 'bulan-ini' | 'semua';
const JENIS: Jenis[] = ['Semua', 'Jual', 'Beli', 'Servis', 'Bayar'];
const LABEL_JENIS: Record<Jenis, string> = { Semua: 'Semua', Jual: 'Penjualan', Beli: 'Barang masuk', Servis: 'Servis', Bayar: 'Pembayaran' };
const HALAMAN = 30;

function Ikon({ t }: { t: TransaksiItem['tipe'] }) {
  if (t === 'Jual') return <IconReceipt size={18} />;
  if (t === 'Beli') return <IconBox size={18} />;
  if (t === 'Servis') return <IconWrench size={18} />;
  return <IconBanknote size={18} />;
}

export function RiwayatScreen({ transaksiList = [], onBukaNota, onBukaBatal, onBukaUnit, isPrivacyMode: priv, filterAwal }: Props) {
  const awalJenis = (JENIS as string[]).includes(filterAwal || '') ? (filterAwal as Jenis) : 'Semua';
  const [jenis, setJenis] = useState<Jenis>(awalJenis);
  const [periode, setPeriode] = useState<Periode>(filterAwal && awalJenis === 'Semua' ? 'semua' : 'hari-ini');
  const [query, setQuery] = useState(filterAwal && awalJenis === 'Semua' ? filterAwal : '');
  const [terbuka, setTerbuka] = useState<TransaksiItem | null>(null);
  const [tampil, setTampil] = useState(HALAMAN);

  const uang = (n: number) => (priv ? MASK : rupiah(n));
  const ref = useMemo(() => tanggalAcuan(transaksiList), [transaksiList]);

  const terfilter = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transaksiList.filter(t => {
      if (jenis !== 'Semua' && t.tipe !== jenis) return false;
      if (periode !== 'semua') {
        const d = parseTgl(t.tanggal);
        if (!d) return false;
        const selisih = selisihHari(ref, d);
        if (periode === 'hari-ini' && selisih !== 0) return false;
        if (periode === '7-hari' && (selisih < 0 || selisih > 6)) return false;
        if (periode === 'bulan-ini' && (d.getUTCMonth() !== ref.getUTCMonth() || d.getUTCFullYear() !== ref.getUTCFullYear())) return false;
      }
      if (q && !(t.id.toLowerCase().includes(q) || t.judul.toLowerCase().includes(q) || t.pihak.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [transaksiList, jenis, periode, query, ref]);

  const ringkas = useMemo(() => {
    let masuk = 0, keluar = 0;
    terfilter.forEach(t => {
      if (t.status === 'Dibatalkan') return;
      if (t.tipe === 'Jual') masuk += t.dibayar ?? (t.status === 'Lunas' ? t.nominal : 0);
      else if (t.tipe === 'Bayar') masuk += t.nominal;
      else if (t.tipe === 'Beli') keluar += t.dibayar ?? t.nominal;
    });
    return { masuk, keluar };
  }, [terfilter]);

  const grup = useMemo(() => {
    const peta = new Map<string, TransaksiItem[]>();
    terfilter.slice(0, tampil).forEach(t => { (peta.get(t.tanggal) || peta.set(t.tanggal, []).get(t.tanggal)!).push(t); });
    return Array.from(peta.entries());
  }, [terfilter, tampil]);

  const labelHari = (s: string) => {
    const d = parseTgl(s); if (!d) return s;
    const sel = selisihHari(parseTgl(tglWib())!, d);
    return sel === 0 ? `Hari ini, ${s}` : sel === 1 ? `Kemarin, ${s}` : s;
  };

  const unduhCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const baris = ['No,Tanggal,Jam,Tipe,Judul,Pihak,Nominal,Status', ...terfilter.map(t => [t.id, t.tanggal, t.jam, t.tipe, t.judul, t.pihak, t.nominal, t.status].map(esc).join(','))];
    const blob = new Blob(['\ufeff' + baris.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `EPICPHONE_RIWAYAT_${periode}_${jenis}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const adaFilter = jenis !== 'Semua' || periode !== 'hari-ini' || query.trim() !== '';
  const reset = () => { setJenis('Semua'); setPeriode('hari-ini'); setQuery(''); };
  const bisaBatal = (t: TransaksiItem) => t.status !== 'Dibatalkan' && t.tipe === 'Jual';

  return (
    <div class="page">
      <div class="page-head">
        <div class="page-head-text"><div class="page-sub">{terfilter.length} transaksi{adaFilter ? ' sesuai filter' : ''}</div></div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" onClick={unduhCsv} disabled={terfilter.length === 0}><IconDownload size={16} /> Ekspor CSV</button>
        </div>
      </div>

      <div class="toolbar">
        <div class="search-input-box toolbar-search">
          <span class="search-icon-pos"><IconSearch size={18} /></span>
          <input class="search-input" type="search" placeholder="Cari nomor nota, pelanggan, atau barang" value={query} aria-label="Cari transaksi"
            onInput={e => { setQuery((e.target as HTMLInputElement).value); setTampil(HALAMAN); }} />
        </div>
        <select class="form-select" style={{ width: 'auto', minWidth: 150 }} value={periode} aria-label="Periode" onChange={e => { setPeriode((e.target as HTMLSelectElement).value as Periode); setTampil(HALAMAN); }}>
          <option value="hari-ini">Hari ini</option><option value="7-hari">7 hari terakhir</option><option value="bulan-ini">Bulan ini</option><option value="semua">Semua waktu</option>
        </select>
      </div>

      <div class="filter-chip-row" role="group" aria-label="Jenis transaksi">
        {JENIS.map(j => (
          <button key={j} type="button" class={`filter-chip ${jenis === j ? 'aktif' : ''}`} aria-pressed={jenis === j} onClick={() => { setJenis(j); setTampil(HALAMAN); }}>{LABEL_JENIS[j]}</button>
        ))}
        {adaFilter && <button type="button" class="btn btn-ghost btn-sm" onClick={reset}><IconClose size={14} /> Atur ulang</button>}
      </div>

      {terfilter.length > 0 && (
        <div class="sum-strip" aria-label="Ringkasan filter">
          <span>Uang masuk <strong class="text-success">{uang(ringkas.masuk)}</strong></span>
          <span>Uang keluar <strong>{uang(ringkas.keluar)}</strong></span>
        </div>
      )}

      {terfilter.length === 0 ? (
        <div class="card">
          <EmptyState icon={<IconReceipt size={26} />} judul={transaksiList.length === 0 ? 'Belum ada transaksi' : 'Tidak ada transaksi yang cocok'}
            desk={transaksiList.length === 0 ? 'Penjualan, barang masuk, servis, dan pembayaran akan tercatat di sini.' : periode === 'hari-ini' ? 'Belum ada transaksi hari ini. Coba periode yang lebih panjang.' : 'Ubah kata kunci atau filter.'}
            aksi={adaFilter ? <button type="button" class="btn btn-secondary" onClick={() => { setJenis('Semua'); setQuery(''); setPeriode('semua'); }}>Tampilkan semua waktu</button> : undefined} />
        </div>
      ) : (
        <div class="stack" style={{ gap: '20px' }}>
          {grup.map(([tgl, list]) => {
            const omzetHari = list.filter(t => t.tipe === 'Jual' && t.status !== 'Dibatalkan').reduce((s, t) => s + t.nominal, 0);
            return (
              <section key={tgl} aria-label={labelHari(tgl)}>
                <div class="day-head"><h2>{labelHari(tgl)}</h2>{omzetHari > 0 && <span>Penjualan {uang(omzetHari)}</span>}</div>
                <div class="card list-card">
                  {list.map(t => {
                    const batal = t.status === 'Dibatalkan';
                    return (
                      <button key={t.id} type="button" class="trx-row" onClick={() => setTerbuka(t)} aria-label={`${t.judul}, ${t.status}`}>
                        <span class={`trx-ico ${t.tipe.toLowerCase()}`}><Ikon t={t.tipe} /></span>
                        <span class="trx-main"><strong style={batal ? { textDecoration: 'line-through', color: 'var(--text-3)' } : undefined}>{t.judul}</strong><span>{t.id} · {t.jam} · {t.pihak}</span></span>
                        <span class="trx-amt">
                          <span style={batal ? { textDecoration: 'line-through', color: 'var(--text-3)' } : undefined}>{t.tipe === 'Jual' || t.tipe === 'Bayar' ? '+' : t.tipe === 'Beli' ? '−' : ''}{uang(t.nominal)}</span>
                          <PillStatus status={t.status} />
                        </span>
                        <IconChevronRight size={16} class="trx-chev" />
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {terfilter.length > tampil && <button type="button" class="btn btn-secondary" style={{ alignSelf: 'center' }} onClick={() => setTampil(n => n + HALAMAN)}>Muat {Math.min(HALAMAN, terfilter.length - tampil)} lagi ({terfilter.length - tampil} tersisa)</button>}
        </div>
      )}

      {terbuka && (
        <ModalShell onClose={() => setTerbuka(null)} title={terbuka.judul.replace(/^[A-Za-z]+\s·\s/, '')} subtitle={`${terbuka.id} · ${terbuka.tanggal}, ${terbuka.jam} WIB`} size="md"
          footer={<>
            {bisaBatal(terbuka) && <button type="button" class="btn btn-ghost" style={{ marginRight: 'auto', color: 'var(--bad-fg)' }} onClick={() => { const t = terbuka; setTerbuka(null); setTimeout(() => onBukaBatal(t), 60); }}>Batalkan transaksi</button>}
            {terbuka.tipe === 'Jual' && terbuka.status !== 'Dibatalkan' && <button type="button" class="btn btn-primary" onClick={() => { const t = terbuka; setTerbuka(null); setTimeout(() => onBukaNota(t), 60); }}><IconReceipt size={16} /> Lihat nota</button>}
            {!(terbuka.tipe === 'Jual' && terbuka.status !== 'Dibatalkan') && <button type="button" class="btn btn-secondary" onClick={() => setTerbuka(null)}>Tutup</button>}
          </>}>
          <div class="row" style={{ justifyContent: 'space-between' }}><PillStatus status={terbuka.status} /><strong class="title-md">{uang(terbuka.nominal)}</strong></div>
          {terbuka.status === 'Dibatalkan' && <div class="banner banner-neutral">Transaksi ini dibatalkan{(terbuka as any).catatanBatal ? `: ${(terbuka as any).catatanBatal}` : '.'}</div>}
          <dl class="panel-dl">
            <div><dt>Pihak</dt><dd>{terbuka.pihak}</dd></div>
            {terbuka.dibayar != null && <div><dt>Dibayar</dt><dd>{uang(terbuka.dibayar)}</dd></div>}
            {(terbuka.sisa || 0) > 0 && <div><dt>Sisa tagihan</dt><dd class="text-danger">{uang(terbuka.sisa || 0)}</dd></div>}
            {terbuka.jatuhTempo && (terbuka.sisa || 0) > 0 && <div><dt>Jatuh tempo</dt><dd>{terbuka.jatuhTempo}</dd></div>}
            {(terbuka.diskon || 0) > 0 && <div><dt>Diskon</dt><dd>{uang(terbuka.diskon || 0)}</dd></div>}
            {terbuka.tukarTambah && <div><dt>Tukar tambah</dt><dd>{terbuka.tukarTambah.unit} ({uang(terbuka.tukarTambah.nilai)})</dd></div>}
            {terbuka.laba != null && <div><dt>Laba kotor</dt><dd>{uang(terbuka.laba)}</dd></div>}
          </dl>
          {terbuka.items && terbuka.items.length > 0 && (
            <div><div class="eyebrow" style={{ marginBottom: 6 }}>Item</div>
              {terbuka.items.map((i, k) => (
                <div key={k} class="panel-dl"><div><dt>{i.nama}{i.imei ? <span class="title-sub"> · IMEI ...{i.imei.slice(-4)}</span> : null}{i.qty > 1 ? ` x${i.qty}` : ''}</dt><dd>{uang(i.harga * i.qty)}</dd></div></div>
              ))}
            </div>
          )}
          {terbuka.bonus && terbuka.bonus.length > 0 && <div class="title-sub">Bonus: {terbuka.bonus.map(b => `${b.nama}${b.qty > 1 ? ' x' + b.qty : ''}`).join(', ')}</div>}
          {onBukaUnit && terbuka.items?.some(i => i.imei) && <button type="button" class="btn btn-ghost" onClick={() => { const t = terbuka; setTerbuka(null); const u = t.subjudul.match(/UNT-\d{4}-\d+/)?.[0]; if (u) setTimeout(() => onBukaUnit(u), 60); }}>Lihat unit di stok</button>}
        </ModalShell>
      )}
    </div>
  );
}
