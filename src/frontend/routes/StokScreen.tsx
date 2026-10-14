// StokScreen.tsx — Stok HP dan aksesoris.
// Toolbar satu baris, tabel dengan kolom prioritas (nama + meta dalam satu sel), panel detail terdok di layar lebar
// (tanpa auto-pilih unit), kartu di HP, gambar cadangan, empty state untuk "kosong" dan "tidak ada hasil".

import { useState, useMemo, useEffect } from 'preact/hooks';
import { UnitHP, Aksesoris } from '../mock/data-contoh';
import {
  IconSearch, IconClose, IconWrench, IconReceipt, IconShield, IconPlus, IconFilter, IconSort, IconCopy, IconCheck,
  IconChevronRight, IconBox, IconLayoutGrid, IconRows,
} from '../components/Icons';
import { ModalShell } from '../components/ModalShell';
import { EmptyState, FotoUnit, PillStatus } from '../components/ui/Kit';
import { rupiah, MASK } from '../lib/format';
import { AMBANG_MENGENDAP_HARI } from '../lib/derive';

interface Props {
  onBukaBarangMasuk: () => void;
  onJualUnit: (unit: UnitHP) => void;
  onKirimKeServis: (unit: UnitHP) => void;
  onBukaDetailUnit: (unit: UnitHP) => void;
  onCekGaransi?: (imei?: string) => void;
  units?: UnitHP[];
  aksesoris?: Aksesoris[];
  isPrivacyMode: boolean;
  density: 'nyaman' | 'padat';
  onToggleDensity: () => void;
  /** 'ready' | 'lama' | 'aksesoris' dari tautan Beranda atau peringatan */
  filterAwal?: string;
}

type Chip = 'Semua' | 'Ready' | 'Servis' | 'Dipesan' | 'Baru' | 'Bekas' | 'Mengendap';
const platformDari = (u: UnitHP) => (/iphone|apple/i.test(u.merek + ' ' + u.nama) ? 'iPhone' : 'Android');

function useLebar(min: number) {
  const q = `(min-width:${min}px)`;
  const [ok, setOk] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const h = (e: MediaQueryListEvent) => setOk(e.matches);
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, [q]);
  return ok;
}

export function StokScreen(p: Props) {
  const { units = [], aksesoris = [], isPrivacyMode: priv, density } = p;
  const [tabJenis, setTabJenis] = useState<'hp' | 'aksesoris'>(p.filterAwal === 'aksesoris' ? 'aksesoris' : 'hp');
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<Chip>(p.filterAwal === 'ready' ? 'Ready' : p.filterAwal === 'lama' ? 'Mengendap' : 'Semua');
  const [sort, setSort] = useState<'terbaru' | 'terlama' | 'termurah' | 'termahal' | 'nama'>('terbaru');
  const [filterModal, setFilterModal] = useState(false);
  const [fPlatform, setFPlatform] = useState('Semua');
  const [fGrade, setFGrade] = useState('Semua');
  const [dock, setDock] = useState<UnitHP | null>(null);
  const [tersalin, setTersalin] = useState(false);
  const lebar = useLebar(1440);
  const tabel = useLebar(1024);

  const uang = (n: number) => (priv ? MASK : rupiah(n));

  const jumlah = useMemo(() => ({
    Semua: units.length,
    Ready: units.filter(u => u.status === 'Ready').length,
    Servis: units.filter(u => u.status === 'Servis').length,
    Dipesan: units.filter(u => u.status === 'Dipesan').length,
    Baru: units.filter(u => u.kondisi === 'Baru').length,
    Bekas: units.filter(u => u.kondisi === 'Bekas').length,
    Mengendap: units.filter(u => u.status === 'Ready' && u.umurHari > AMBANG_MENGENDAP_HARI).length,
  }), [units]);

  const terfilter = useMemo(() => {
    const q = query.trim().toLowerCase();
    let r = units.filter(u => {
      if (chip === 'Ready' && u.status !== 'Ready') return false;
      if (chip === 'Servis' && u.status !== 'Servis') return false;
      if (chip === 'Dipesan' && u.status !== 'Dipesan') return false;
      if (chip === 'Baru' && u.kondisi !== 'Baru') return false;
      if (chip === 'Bekas' && u.kondisi !== 'Bekas') return false;
      if (chip === 'Mengendap' && !(u.status === 'Ready' && u.umurHari > AMBANG_MENGENDAP_HARI)) return false;
      if (fPlatform !== 'Semua' && platformDari(u) !== fPlatform) return false;
      if (fGrade !== 'Semua' && u.grade !== fGrade) return false;
      if (q && !(u.nama.toLowerCase().includes(q) || u.imei.includes(q) || u.id.toLowerCase().includes(q))) return false;
      return true;
    });
    r = r.slice().sort((a, b) =>
      sort === 'terbaru' ? a.umurHari - b.umurHari : sort === 'terlama' ? b.umurHari - a.umurHari :
      sort === 'termurah' ? a.hargaJualTarget - b.hargaJualTarget : sort === 'termahal' ? b.hargaJualTarget - a.hargaJualTarget :
      a.nama.localeCompare(b.nama));
    return r;
  }, [units, chip, query, sort, fPlatform, fGrade]);

  const aksFilter = useMemo(() => {
    const q = query.trim().toLowerCase();
    return aksesoris.filter(a => !q || a.nama.toLowerCase().includes(q) || a.sku.toLowerCase().includes(q));
  }, [aksesoris, query]);

  const aktifFilterLanjut = (fPlatform !== 'Semua' ? 1 : 0) + (fGrade !== 'Semua' ? 1 : 0);
  const terpilih = dock && units.find(u => u.id === dock.id);
  const bukaUnit = (u: UnitHP) => { if (lebar) setDock(u); else p.onBukaDetailUnit(u); };
  const hapusFilter = () => { setChip('Semua'); setFPlatform('Semua'); setFGrade('Semua'); setQuery(''); };
  const adaFilter = chip !== 'Semua' || aktifFilterLanjut > 0 || query.trim() !== '';
  const salin = (t: string) => { navigator.clipboard?.writeText(t); setTersalin(true); setTimeout(() => setTersalin(false), 1800); };

  const onRowKey = (e: KeyboardEvent, u: UnitHP) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bukaUnit(u); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const tr = e.currentTarget as HTMLElement;
      const sib = (e.key === 'ArrowDown' ? tr.nextElementSibling : tr.previousElementSibling) as HTMLElement | null;
      sib?.focus();
    }
  };

  return (
    <div class="page">
      <div class="page-head split rapat">
        <div class="segmented" role="tablist" aria-label="Jenis stok">
          <button type="button" role="tab" aria-selected={tabJenis === 'hp'} class={tabJenis === 'hp' ? 'aktif' : ''} onClick={() => setTabJenis('hp')}>Handphone ({units.length})</button>
          <button type="button" role="tab" aria-selected={tabJenis === 'aksesoris'} class={tabJenis === 'aksesoris' ? 'aktif' : ''} onClick={() => setTabJenis('aksesoris')}>Aksesoris ({aksesoris.length})</button>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" onClick={p.onBukaBarangMasuk}><IconPlus size={18} /> <span class="btn-label">Barang masuk</span></button>
        </div>
      </div>

      <div class="toolbar">
        <div class="search-input-box toolbar-search">
          <span class="search-icon-pos"><IconSearch size={18} /></span>
          <input class="search-input" type="search" placeholder={tabJenis === 'hp' ? 'Cari nama, IMEI, atau ID unit' : 'Cari nama atau SKU'} value={query} aria-label="Cari stok"
            onInput={e => setQuery((e.target as HTMLInputElement).value)} />
        </div>
        {tabJenis === 'hp' && (
          <>
            <button type="button" class="btn btn-secondary" onClick={() => setFilterModal(true)} aria-label={`Filter${aktifFilterLanjut ? `, ${aktifFilterLanjut} aktif` : ''}`}>
              <IconFilter size={18} /><span class="hide-sm">Filter</span>{aktifFilterLanjut > 0 && <span class="lencana" style={{ background: 'var(--action-bg)', color: 'var(--action-fg)' }}>{aktifFilterLanjut}</span>}
            </button>
            <label class="toolbar-sort">
              <IconSort size={16} /><span class="sr-only">Urutkan</span>
              <select class="form-select" value={sort} onChange={e => setSort((e.target as HTMLSelectElement).value as any)} aria-label="Urutkan">
                <option value="terbaru">Terbaru masuk</option><option value="terlama">Terlama di stok</option>
                <option value="termurah">Harga termurah</option><option value="termahal">Harga termahal</option><option value="nama">Nama A-Z</option>
              </select>
            </label>
            <button type="button" class="icon-btn toolbar-dens" onClick={p.onToggleDensity} aria-label={density === 'nyaman' ? 'Tampilan rapat' : 'Tampilan nyaman'} title={density === 'nyaman' ? 'Ganti ke tampilan rapat' : 'Ganti ke tampilan nyaman'}>
              {density === 'nyaman' ? <IconRows size={20} /> : <IconLayoutGrid size={20} />}
            </button>
          </>
        )}
      </div>

      {tabJenis === 'hp' && (
        <div class="filter-chip-row" role="group" aria-label="Filter cepat">
          {(['Semua', 'Ready', 'Servis', 'Dipesan', 'Baru', 'Bekas', 'Mengendap'] as Chip[]).map(c => (
            <button key={c} type="button" class={`filter-chip ${chip === c ? 'aktif' : ''}`} aria-pressed={chip === c} onClick={() => setChip(c)}>
              {c === 'Mengendap' ? `Lebih dari ${AMBANG_MENGENDAP_HARI} hari` : c} <span class="chip-count">{jumlah[c]}</span>
            </button>
          ))}
          {adaFilter && <button type="button" class="btn btn-ghost btn-sm" onClick={hapusFilter}><IconClose size={14} /> Hapus filter</button>}
        </div>
      )}

      {tabJenis === 'hp' ? (
        units.length === 0 ? (
          <div class="card"><EmptyState judul="Belum ada stok" desk="Catat barang masuk pertama untuk mulai berjualan." aksi={<button type="button" class="btn btn-primary" onClick={p.onBukaBarangMasuk}>Catat barang masuk</button>} /></div>
        ) : terfilter.length === 0 ? (
          <div class="card"><EmptyState icon={<IconSearch size={26} />} judul="Tidak ada unit yang cocok" desk={query ? `Tidak ada hasil untuk "${query.trim()}".` : 'Tidak ada unit dengan filter ini.'} aksi={<button type="button" class="btn btn-secondary" onClick={hapusFilter}>Hapus filter</button>} /></div>
        ) : (
          <div class={`stok-split ${lebar ? 'has-panel' : ''}`}>
            {tabel ? (
              <div class="card stok-table-card">
                <div class="table-scroll">
                  <table class="data-table" data-density={density}>
                    <thead><tr>
                      <th style={{ width: 64 }}><span class="sr-only">Foto</span></th><th>Unit</th>
                      <th class="num col-modal">Modal</th><th class="num">Harga jual</th><th>Status</th><th class="num">Umur</th><th style={{ width: 120 }}><span class="sr-only">Aksi</span></th>
                    </tr></thead>
                    <tbody>
                      {terfilter.map(u => (
                        <tr key={u.id} tabIndex={0} class={terpilih?.id === u.id ? 'aktif' : ''} onClick={() => bukaUnit(u)} onKeyDown={e => onRowKey(e as any, u)} aria-label={`${u.nama}, ${u.status}`}>
                          <td><FotoUnit src={u.foto[0]} alt={u.nama} size={density === 'padat' ? 36 : 48} /></td>
                          <td>
                            <div class="unit-name">{u.nama}</div>
                            <div class="unit-meta">{u.id} · {u.kondisi}{u.grade ? ` Grade ${u.grade}` : ''}{u.baterai ? ` · Baterai ${u.baterai}%` : ''} · IMEI ...{u.imei.slice(-4)}</div>
                          </td>
                          <td class="num col-modal">{uang(u.hpp)}</td>
                          <td class="num"><strong>{rupiah(u.hargaJualTarget)}</strong></td>
                          <td><PillStatus status={u.status} /></td>
                          <td class={`num ${u.status === 'Ready' && u.umurHari > AMBANG_MENGENDAP_HARI ? 'text-danger' : ''}`}>{u.umurHari === 0 ? 'Baru' : `${u.umurHari} hr`}</td>
                          <td onClick={e => e.stopPropagation()}>
                            <div class="row-actions">
                              {u.status === 'Ready' && <button type="button" class="btn btn-secondary btn-sm" onClick={() => p.onJualUnit(u)}>Jual</button>}
                              <button type="button" class="btn-icon" onClick={() => p.onBukaDetailUnit(u)} aria-label={`Detail ${u.nama}`}><IconChevronRight size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div class="mobile-card-list always">
                {terfilter.map(u => (
                  <button key={u.id} type="button" class="unit-card" onClick={() => p.onBukaDetailUnit(u)}>
                    <FotoUnit src={u.foto[0]} alt={u.nama} size={64} radius={10} />
                    <span class="unit-card-main">
                      <span class="unit-card-top"><span class="unit-name">{u.nama}</span><PillStatus status={u.status} /></span>
                      <span class="unit-meta">{u.kondisi}{u.grade ? ` Grade ${u.grade}` : ''}{u.baterai ? ` · Baterai ${u.baterai}%` : ''} · IMEI ...{u.imei.slice(-4)}</span>
                      <span class="unit-card-bottom"><strong>{rupiah(u.hargaJualTarget)}</strong><span class={u.status === 'Ready' && u.umurHari > AMBANG_MENGENDAP_HARI ? 'text-danger' : 'title-sub'}>{u.umurHari === 0 ? 'Baru masuk' : `${u.umurHari} hari di stok`}</span></span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {lebar && (
              <aside class="card unit-panel" aria-label="Detail unit">
                {terpilih ? (
                  <>
                    <div class="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}><div class="eyebrow">{terpilih.id}</div><h2 class="title-md" style={{ marginTop: 2 }}>{terpilih.nama}</h2></div>
                      <button type="button" class="icon-btn" style={{ margin: '-8px -8px 0 0' }} onClick={() => setDock(null)} aria-label="Tutup panel"><IconClose size={18} /></button>
                    </div>
                    <div class="panel-foto"><FotoUnit src={terpilih.foto[0]} alt={terpilih.nama} size={400} radius={12} /></div>
                    <div class="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                      <PillStatus status={terpilih.status} />
                      <span class="badge badge-neutral">{terpilih.kondisi}{terpilih.grade ? ` Grade ${terpilih.grade}` : ''}</span>
                      {terpilih.baterai ? <span class="badge badge-neutral">Baterai {terpilih.baterai}%</span> : null}
                    </div>
                    <dl class="panel-dl">
                      <div><dt>Harga jual target</dt><dd class="big">{rupiah(terpilih.hargaJualTarget)}</dd></div>
                      <div><dt>Modal (HPP)</dt><dd>{uang(terpilih.hpp)}</dd></div>
                      <div><dt>Estimasi laba</dt><dd>{priv ? MASK : rupiah(terpilih.hargaJualTarget - terpilih.hpp)}</dd></div>
                      <div><dt>IMEI</dt><dd class="mono">{terpilih.imei} <button type="button" class="btn-icon" style={{ width: 28, height: 28, display: 'inline-flex', verticalAlign: 'middle' }} onClick={() => salin(terpilih.imei)} aria-label="Salin IMEI">{tersalin ? <IconCheck size={14} /> : <IconCopy size={14} />}</button></dd></div>
                      <div><dt>Kelengkapan</dt><dd>{terpilih.kelengkapan}</dd></div>
                      <div><dt>Umur di stok</dt><dd>{terpilih.umurHari === 0 ? 'Baru masuk' : `${terpilih.umurHari} hari`}</dd></div>
                    </dl>
                    <div class="stack" style={{ marginTop: 'auto', gap: '8px' }}>
                      {terpilih.status === 'Ready'
                        ? <button type="button" class="btn btn-primary btn-lg" onClick={() => p.onJualUnit(terpilih)}><IconReceipt size={18} /> Jual sekarang</button>
                        : <div class="banner banner-neutral">{terpilih.status === 'Servis' ? 'Unit sedang diservis. Selesaikan servis agar bisa dijual.' : terpilih.status === 'Terjual' ? 'Unit sudah terjual.' : `Status: ${terpilih.status}.`}</div>}
                      <div class="row" style={{ gap: '8px' }}>
                        {terpilih.status === 'Ready' && <button type="button" class="btn btn-secondary" style={{ flex: 1 }} onClick={() => p.onKirimKeServis(terpilih)}><IconWrench size={16} /> Servis</button>}
                        <button type="button" class="btn btn-secondary" style={{ flex: 1 }} onClick={() => p.onBukaDetailUnit(terpilih)}>Detail lengkap</button>
                      </div>
                      {p.onCekGaransi && terpilih.status === 'Terjual' && <button type="button" class="btn btn-ghost" onClick={() => p.onCekGaransi!(terpilih.imei)}><IconShield size={16} /> Cek garansi</button>}
                    </div>
                  </>
                ) : (
                  <EmptyState icon={<IconBox size={26} />} judul="Pilih unit" desk="Klik satu baris untuk melihat harga, kondisi, dan aksi cepat di sini." />
                )}
              </aside>
            )}
          </div>
        )
      ) : (
        aksFilter.length === 0 ? (
          <div class="card"><EmptyState icon={<IconSearch size={26} />} judul="Aksesoris tidak ditemukan" desk={query ? `Tidak ada hasil untuk "${query.trim()}".` : 'Belum ada aksesoris.'} /></div>
        ) : (
          <div class="card" style={{ padding: 0 }}>
            <div class="table-scroll">
              <table class="data-table" data-density={density}>
                <thead><tr><th>Aksesoris</th><th>Kategori</th><th class="num">Stok</th><th>Status</th><th class="num col-modal">Modal rata-rata</th><th class="num">Harga jual</th></tr></thead>
                <tbody>
                  {aksFilter.map(a => (
                    <tr key={a.sku}>
                      <td><div class="unit-name">{a.nama}</div><div class="unit-meta">{a.sku}</div></td>
                      <td>{a.kategori}</td>
                      <td class="num"><strong>{a.stok}</strong> <span class="title-sub">min {a.stokMin}</span></td>
                      <td><PillStatus status={a.status === 'Aman' ? 'Ready' : a.status === 'Menipis' ? 'Servis' : 'Dibatalkan'} label={a.status} /></td>
                      <td class="num col-modal">{uang(a.hargaBeliRata2)}</td>
                      <td class="num"><strong>{rupiah(a.hargaJual)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {filterModal && (
        <ModalShell onClose={() => setFilterModal(false)} title="Filter lanjutan" subtitle="Persempit daftar HP" size="sm"
          footer={<><button type="button" class="btn btn-ghost" onClick={() => { setFPlatform('Semua'); setFGrade('Semua'); }}>Atur ulang</button><button type="button" class="btn btn-primary" onClick={() => setFilterModal(false)}>Terapkan</button></>}>
          <div class="form-group"><label class="form-label" for="f-plat">Platform</label>
            <select id="f-plat" class="form-select" value={fPlatform} onChange={e => setFPlatform((e.target as HTMLSelectElement).value)}><option>Semua</option><option>iPhone</option><option>Android</option></select></div>
          <div class="form-group"><label class="form-label" for="f-grade">Grade</label>
            <select id="f-grade" class="form-select" value={fGrade} onChange={e => setFGrade((e.target as HTMLSelectElement).value)}><option>Semua</option><option>A</option><option>B</option><option>C</option></select></div>
        </ModalShell>
      )}
    </div>
  );
}
