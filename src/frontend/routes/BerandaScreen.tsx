import { useState } from 'preact/hooks';
import { Dashboard } from '../lib/derive';
import type { PeringatanItem, TransaksiItem } from '../mock/data-contoh';
import { DrafJual } from '../lib/draf';
import { rupiah, rupiahRingkas, MASK, tglPanjang, linkWa, parseTgl } from '../lib/format';
import { BarChart, Sparkline } from '../components/Charts';
import { EmptyState, PillStatus, Banner } from '../components/ui/Kit';
import {
  IconArrowUp, IconArrowDown, IconMinus, IconReceipt, IconBox, IconWrench, IconBanknote, IconChevronRight,
  IconCheckCircle, IconAlertTriangle, IconInvoice, IconClock,
} from '../components/Icons';

interface Props {
  dash: Dashboard;
  perhatian: PeringatanItem[];
  draf: DrafJual | null;
  isPrivacyMode: boolean;
  onBukaJual: () => void;
  onBukaBarangMasuk: () => void;
  onBukaServis: () => void;
  onBukaBayar: () => void;
  onBukaPerhatian: (p: PeringatanItem) => void;
  onSemuaPerhatian: () => void;
  onBukaTransaksi: (t: TransaksiItem) => void;
  onLihatSemuaTransaksi: () => void;
  onGo: (tab: string, filter?: string) => void;
  onLanjutkanDraf: () => void;
  onBuangDraf: () => void;
}

function Delta({ now, prev, label }: { now: number; prev: number | null | undefined; label: string }) {
  if (prev == null) return <span class="delta flat"><IconMinus size={12} /> belum ada pembanding</span>;
  if (prev === 0) return now > 0 ? <span class="delta up"><IconArrowUp size={12} /> baru hari ini</span> : <span class="delta flat"><IconMinus size={12} /> sama {label}</span>;
  const p = Math.round(((now - prev) / prev) * 100);
  if (p === 0) return <span class="delta flat"><IconMinus size={12} /> sama {label}</span>;
  return <span class={`delta ${p > 0 ? 'up' : 'down'}`}>{p > 0 ? <IconArrowUp size={12} /> : <IconArrowDown size={12} />} {p > 0 ? 'naik' : 'turun'} {Math.abs(p)}% {label}</span>;
}

export function BerandaScreen(p: Props) {
  const { dash: d, isPrivacyMode: priv } = p;
  const uang = (n: number) => priv ? MASK : rupiah(n);
  const ringkas = (n: number) => priv ? MASK : rupiahRingkas(n);
  const tanggal = parseTgl(d.tanggalRef) || new Date();
  const kosong = d.transaksiTerakhir.length === 0 && d.stokReady === 0;
  const kemarin = d.kemarin;
  const perhatianTampil = p.perhatian.slice(0, 5);
  const [filterTren, setFilterTren] = useState<'hari-ini' | '7-hari' | '30-hari'>('7-hari');
  const dataTren = filterTren === 'hari-ini'
    ? (d.trenHariIni || d.tren)
    : filterTren === '30-hari'
    ? (d.tren30Hari || d.tren)
    : d.tren;
  const judulTren = filterTren === 'hari-ini'
    ? 'Omzet hari ini (per jam)'
    : filterTren === '30-hari'
    ? 'Omzet 30 hari terakhir'
    : 'Omzet 7 hari terakhir';

  return (
    <div class="page">
      <div class="page-head">
        <div class="page-head-text">
          <div class="page-sub">{tglPanjang(tanggal)}</div>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" onClick={p.onBukaJual}><IconReceipt size={18} /> Jual sekarang</button>
        </div>
      </div>

      {p.draf && (
        <Banner tipe="neutral" class="banner-draf" icon={<IconReceipt size={20} />}
          aksi={<><button type="button" class="btn btn-primary btn-sm" onClick={p.onLanjutkanDraf}>Lanjutkan</button><button type="button" class="btn btn-ghost btn-sm" onClick={p.onBuangDraf}>Buang</button></>}>
          <strong>Penjualan belum selesai</strong>
          <div class="title-sub">{p.draf.ringkas}</div>
        </Banner>
      )}

      {kosong ? (
        <div class="card">
          <EmptyState icon={<IconBox size={26} />} judul="Toko Anda masih kosong" desk="Mulai dengan mencatat barang masuk pertama. Setelah itu penjualan, laba, dan peringatan akan muncul di sini."
            aksi={<button type="button" class="btn btn-primary" onClick={p.onBukaBarangMasuk}>Catat barang masuk</button>} />
        </div>
      ) : (
        <>
          <section class="dash-hero" aria-label="Ringkasan hari ini">
            <button type="button" class="hero-kpi" onClick={() => p.onGo('laporan')} aria-label={`Laba kotor hari ini ${priv ? 'disembunyikan' : rupiah(d.hariIni.laba)}. Buka laporan.`}>
              <span class="eyebrow">Laba kotor hari ini</span>
              <span class="hero-kpi-val">{uang(d.hariIni.laba)}</span>
              <span class="hero-kpi-foot"><Delta now={d.hariIni.laba} prev={kemarin?.laba} label="dari kemarin" /></span>
              <Sparkline class="hero-spark" values={d.tren.map(t => t.laba)} />
            </button>
            <div class="kpi-row4">
              <button type="button" class="kpi-mini" onClick={() => p.onGo('riwayat', 'Jual')}>
                <span class="kpi-mini-label">Omzet</span>
                <span class="kpi-mini-val" title={priv ? undefined : rupiah(d.hariIni.omzet)}>{ringkas(d.hariIni.omzet)}</span>
                <Delta now={d.hariIni.omzet} prev={kemarin?.omzet} label="" />
              </button>
              <button type="button" class="kpi-mini" onClick={() => p.onGo('laporan')}>
                <span class="kpi-mini-label">Kas masuk</span>
                <span class="kpi-mini-val" title={priv ? undefined : rupiah(d.hariIni.kas)}>{ringkas(d.hariIni.kas)}</span>
                <Delta now={d.hariIni.kas} prev={kemarin?.kas} label="" />
              </button>
              <button type="button" class="kpi-mini" onClick={() => p.onGo('riwayat', 'Jual')}>
                <span class="kpi-mini-label">Unit terjual</span>
                <span class="kpi-mini-val">{d.hariIni.unit} unit</span>
                <Delta now={d.hariIni.unit} prev={kemarin?.unit} label="" />
              </button>
              <button type="button" class="kpi-mini" onClick={() => p.onGo('stok', 'ready')}>
                <span class="kpi-mini-label">Stok siap jual</span>
                <span class="kpi-mini-val">{d.stokReady} unit</span>
                <span class="delta flat">{d.stokMengendap > 0 ? `${d.stokMengendap} mengendap` : 'semua lancar'}</span>
              </button>
            </div>
          </section>

          <div class="dash-cols">
            <section class="card area-attn" aria-labelledby="h-attn">
              <div class="dash-sec-title">
                <h2 id="h-attn">Perlu perhatian{p.perhatian.length ? ` (${p.perhatian.length})` : ''}</h2>
                {p.perhatian.length > 5 && <button type="button" class="link-btn" onClick={p.onSemuaPerhatian}>Lihat semua <IconChevronRight size={14} /></button>}
              </div>
              {perhatianTampil.length === 0 ? (
                <div class="empty-state" style={{ padding: '24px 8px' }}>
                  <div class="empty-icon" style={{ background: 'var(--ok-bg)', color: 'var(--ok-fg)' }}><IconCheckCircle size={26} /></div>
                  <h2>Semua beres</h2><p>Tidak ada tagihan telat, servis menunggu, atau stok mengendap.</p>
                </div>
              ) : (
                <div class="attn-list">
                  {perhatianTampil.map(a => (
                    <div key={a.id} class={`attn-item ${a.tingkat || 'info'}`}>
                      <span class="attn-dot">{a.tipe === 'telat' ? <IconInvoice size={18} /> : a.tipe === 'servis-siap' ? <IconWrench size={18} /> : a.tipe === 'sistem' ? <IconAlertTriangle size={18} /> : <IconBox size={18} />}</span>
                      <span class="attn-text"><strong>{a.judul}</strong><span>{a.deskripsi}</span></span>
                      {a.noWa && a.aksiLabel
                        ? <a class="btn btn-secondary btn-sm attn-act" href={linkWa(a.noWa, `Halo, kami dari Epic Phone. ${a.judul}. ${a.deskripsi}.`)} target="_blank" rel="noopener noreferrer">{a.aksiLabel}</a>
                        : <button type="button" class="btn btn-secondary btn-sm attn-act" onClick={() => p.onBukaPerhatian(a)}>{a.aksiLabel || 'Buka'}</button>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section class="card area-trend" aria-labelledby="h-trend">
              <div class="dash-sec-title" style={{ flexWrap: 'wrap', gap: 8 }}>
                <h2 id="h-trend">{judulTren}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div class="segmented" style={{ padding: 2 }} role="group" aria-label="Filter tren omzet">
                    <button type="button" style={{ height: 26, padding: '0 8px', fontSize: 12 }} class={filterTren === 'hari-ini' ? 'aktif' : ''} aria-pressed={filterTren === 'hari-ini'} onClick={() => setFilterTren('hari-ini')}>Hari ini</button>
                    <button type="button" style={{ height: 26, padding: '0 8px', fontSize: 12 }} class={filterTren === '7-hari' ? 'aktif' : ''} aria-pressed={filterTren === '7-hari'} onClick={() => setFilterTren('7-hari')}>7 hari</button>
                    <button type="button" style={{ height: 26, padding: '0 8px', fontSize: 12 }} class={filterTren === '30-hari' ? 'aktif' : ''} aria-pressed={filterTren === '30-hari'} onClick={() => setFilterTren('30-hari')}>30 hari</button>
                  </div>
                  <button type="button" class="link-btn" onClick={() => p.onGo('laporan')}>Laporan <IconChevronRight size={14} /></button>
                </div>
              </div>
              <BarChart data={dataTren} privasi={priv} judul={judulTren} />
            </section>

            <section class="card area-trx" aria-labelledby="h-trx">
              <div class="dash-sec-title">
                <h2 id="h-trx">Transaksi terakhir</h2>
                <button type="button" class="link-btn" onClick={p.onLihatSemuaTransaksi}>Lihat riwayat <IconChevronRight size={14} /></button>
              </div>
              <div>
                {d.transaksiTerakhir.map(t => (
                  <button key={t.id} type="button" class="trx-row" onClick={() => p.onBukaTransaksi(t)}>
                    <span class={`trx-ico ${t.tipe.toLowerCase()}`}>{t.tipe === 'Jual' ? <IconReceipt size={18} /> : t.tipe === 'Beli' ? <IconBox size={18} /> : t.tipe === 'Servis' ? <IconWrench size={18} /> : <IconBanknote size={18} />}</span>
                    <span class="trx-main"><strong>{t.judul}</strong><span>{t.jam} · {t.pihak}</span></span>
                    <span class="trx-amt"><span>{t.status === 'Dibatalkan' ? <s>{uang(t.nominal)}</s> : uang(t.nominal)}</span><PillStatus status={t.status} /></span>
                  </button>
                ))}
              </div>
            </section>

            <section class="card area-quick" aria-labelledby="h-quick">
              <div class="dash-sec-title"><h2 id="h-quick">Aksi cepat</h2></div>
              <div class="quick-grid">
                <button type="button" class="quick-tile" onClick={p.onBukaJual}><span class="qt-ico"><IconReceipt size={18} /></span>Jual</button>
                <button type="button" class="quick-tile" onClick={p.onBukaBarangMasuk}><span class="qt-ico"><IconBox size={18} /></span>Barang masuk</button>
                <button type="button" class="quick-tile" onClick={p.onBukaServis}><span class="qt-ico"><IconWrench size={18} /></span>Servis</button>
                <button type="button" class="quick-tile" onClick={p.onBukaBayar}><span class="qt-ico"><IconBanknote size={18} /></span>Terima bayar</button>
              </div>
              <div class="kondisi">
                <button type="button" class="kondisi-row" onClick={() => p.onGo('tagihan')}><span><IconInvoice size={16} /> Piutang</span><strong>{ringkas(d.piutang)}{d.piutangTelat > 0 && <span class="badge badge-telat" style={{ marginLeft: 8 }}>{d.piutangTelat} telat</span>}</strong></button>
                <button type="button" class="kondisi-row" onClick={() => p.onGo('servis')}><span><IconWrench size={16} /> Servis berjalan</span><strong>{d.servisBerjalan}{d.servisSiap > 0 && <span class="badge badge-ready" style={{ marginLeft: 8 }}>{d.servisSiap} siap</span>}</strong></button>
                <button type="button" class="kondisi-row" onClick={() => p.onGo('stok', 'lama')}><span><IconClock size={16} /> Stok mengendap</span><strong>{d.stokMengendap} unit</strong></button>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
