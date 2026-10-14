// KatalogScreen.tsx — S38 Katalog Produk (HP dan Aksesoris).
// Daftar model standar. Barang Masuk memakai penamaan yang sama (merek + model + varian + warna), jadi unit baru
// otomatis tertaut ke produk di sini. v3: modal memakai ModalShell (bisa di-scroll di HP dan laptop),
// harga berformat Rp, cegah model ganda, kartu produk tersusun rapi dalam grid.

import { useMemo, useState } from 'preact/hooks';
import type { ProdukKatalog } from '../mock/data-contoh';
import { ModalShell } from '../components/ModalShell';
import { Field, MoneyInput, SegmentedField, useFieldId, duit } from '../components/ui/Form';
import { EmptyState } from '../components/ui/Kit';
import { IconPlus, IconClose, IconSearch, IconBox } from '../components/Icons';
import { rupiah } from '../lib/format';
import { BagianNama, namaLengkap, kunciNama, saranDariKatalog, MEREK_UMUM } from '../lib/produk';

interface Props {
  katalogList?: ProdukKatalog[];
  onTambahKatalog?: (prod: ProdukKatalog) => void | boolean | Promise<boolean | void>;
}

export function KatalogScreen({ katalogList = [], onTambahKatalog }: Props) {
  const id = useFieldId('kt');
  const daftar = katalogList; // dikendalikan app
  const [filterJenis, setFilterJenis] = useState<'Semua' | 'HP' | 'Aksesoris'>('Semua');
  const [query, setQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form
  const [jenis, setJenis] = useState<'HP' | 'Aksesoris'>('HP');
  const [platform, setPlatform] = useState<'iPhone' | 'Android'>('Android');
  const [merek, setMerek] = useState('Samsung');
  const [model, setModel] = useState('');
  const [varian, setVarian] = useState('');
  const [warna, setWarna] = useState('');
  const [hargaStandar, setHargaStandar] = useState('');
  const [coba, setCoba] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);

  const bagian: BagianNama = { merek, model, varian, warna };
  const nama = namaLengkap(bagian);
  const saran = useMemo(() => saranDariKatalog(daftar, { merek, model }), [daftar, merek, model]);
  const saranAcc = useMemo(() => Array.from(new Set(daftar.filter(p => p.jenis === 'Aksesoris').map(p => p.merek))).sort(), [daftar]);

  const terfilter = daftar.filter(p => {
    if (filterJenis !== 'Semua' && p.jenis !== filterJenis) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!(p.merek.toLowerCase().includes(q) || p.model.toLowerCase().includes(q) || p.varian.toLowerCase().includes(q) || p.warna.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const jumlah = { Semua: daftar.length, HP: daftar.filter(p => p.jenis === 'HP').length, Aksesoris: daftar.filter(p => p.jenis === 'Aksesoris').length };

  const ganda = !!nama && daftar.some(p => kunciNama(namaLengkap(p)) === kunciNama(nama) && p.jenis === jenis);
  const galat = {
    merek: !merek.trim() ? 'Isi merek.' : '',
    model: !model.trim() ? (jenis === 'HP' ? 'Isi model seri.' : 'Isi nama aksesoris.') : ganda ? 'Produk dengan nama ini sudah ada di katalog.' : '',
    harga: duit(hargaStandar) <= 0 ? 'Isi harga jual standar.' : '',
  };
  const valid = !galat.merek && !galat.model && !galat.harga;

  const bukaForm = () => {
    setJenis('HP'); setPlatform('Android'); setMerek('Samsung'); setModel(''); setVarian(''); setWarna(''); setHargaStandar(''); setCoba(false); setIsFormOpen(true);
  };

  const handleSubmit = async (e?: Event) => {
    e?.preventDefault();
    setCoba(true);
    if (!valid || menyimpan) return;
    const baru: ProdukKatalog = {
      id: `PRD-${String(daftar.reduce((m, k) => Math.max(m, parseInt(k.id.replace(/\D/g, ''), 10) || 0), 0) + 1).padStart(4, '0')}`,
      jenis, platform: jenis === 'HP' ? platform : undefined,
      merek: merek.trim(), model: model.trim(), varian: varian.trim(), warna: warna.trim(), hargaStandar: duit(hargaStandar), aktif: true,
    };
    setMenyimpan(true);
    const hasil = onTambahKatalog ? await Promise.resolve(onTambahKatalog(baru)) : undefined;
    setMenyimpan(false);
    if (hasil === false) return;
    setIsFormOpen(false);
  };

  return (
    <div class="page">
      <div class="page-head split rapat">
        <div class="segmented" role="tablist" aria-label="Jenis produk">
          {(['Semua', 'HP', 'Aksesoris'] as const).map(j => (
            <button key={j} type="button" role="tab" aria-selected={filterJenis === j} class={filterJenis === j ? 'aktif' : ''} onClick={() => setFilterJenis(j)}>
              {j === 'Semua' ? 'Semua' : j === 'HP' ? 'Smartphone' : 'Aksesoris'} <span class="chip-count">{jumlah[j]}</span>
            </button>
          ))}
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" onClick={bukaForm}><IconPlus size={18} /> <span class="btn-label">Tambah katalog</span></button>
        </div>
      </div>

      <div class="search-input-box">
        <span class="search-icon-pos"><IconSearch size={18} /></span>
        <input type="search" class="search-input" placeholder="Cari merek, model, varian, atau warna" aria-label="Cari produk katalog" value={query} onInput={e => setQuery((e.target as HTMLInputElement).value)} />
        {query && <button type="button" class="icon-btn search-clear" onClick={() => setQuery('')} aria-label="Hapus pencarian"><IconClose size={16} /></button>}
      </div>

      {terfilter.length === 0 ? (
        <div class="card"><EmptyState icon={<IconBox size={26} />} judul={daftar.length === 0 ? 'Katalog masih kosong' : 'Tidak ada produk yang cocok'} desk={daftar.length === 0 ? 'Tambahkan model HP atau aksesoris agar mudah dipilih saat barang masuk.' : 'Ubah kata kunci atau jenis produk.'}
          aksi={daftar.length === 0 ? <button type="button" class="btn btn-primary" onClick={bukaForm}>Tambah katalog</button> : undefined} /></div>
      ) : (
        <div class="katalog-grid">
          {terfilter.map(p => (
            <article key={p.id} class="card katalog-card">
              <div class="katalog-top">
                <div style={{ minWidth: 0 }}>
                  <span class="mono title-sub">{p.id}</span>
                  <h2 class="title-md" style={{ marginTop: 2, overflowWrap: 'anywhere' }}>{p.merek} {p.model}</h2>
                  <span class="title-sub">{[p.varian, p.warna].filter(Boolean).join(' · ') || 'Tanpa varian'}</span>
                </div>
                <span class="badge badge-neutral">{p.jenis === 'HP' ? (p.platform || 'HP') : 'Aksesoris'}</span>
              </div>
              <div class="card-actions">
                <span class="meta">Harga jual standar</span>
                <strong class="text-uang">{rupiah(p.hargaStandar)}</strong>
              </div>
            </article>
          ))}
        </div>
      )}

      {isFormOpen && (
        <ModalShell onClose={() => setIsFormOpen(false)} title="Tambah ke katalog" subtitle="Nama produk tersusun otomatis" size="md" dirty={!!(model || varian || warna || hargaStandar)} initialFocus={`#${id}-model`}
          footer={<>
            <button type="button" class="btn btn-ghost" onClick={() => setIsFormOpen(false)}>Batal</button>
            <button type="submit" form={`${id}-form`} class="btn btn-primary" disabled={menyimpan}>{menyimpan ? <span class="spinner" /> : null} Simpan ke katalog</button>
          </>}>
          <form id={`${id}-form`} class="form-stack" onSubmit={handleSubmit} noValidate>
            <div class="card" style={{ background: 'var(--bg-subtle)', padding: '12px 14px' }} aria-live="polite">
              <div class="eyebrow">Pratinjau nama standar</div>
              <div style={{ fontWeight: 700, marginTop: 2, color: nama ? 'var(--text)' : 'var(--text-3)' }}>{nama || 'Terisi dari merek, model, varian, dan warna'}</div>
            </div>

            <SegmentedField label="Jenis produk" value={jenis} onChange={v => { setJenis(v); setCoba(false); }} opsi={[{ v: 'HP', l: 'Smartphone' }, { v: 'Aksesoris', l: 'Aksesoris' }]} />
            {jenis === 'HP' && (
              <SegmentedField label="Platform" value={platform} onChange={v => { setPlatform(v); setMerek(v === 'iPhone' ? 'Apple' : 'Samsung'); }} opsi={[{ v: 'Android', l: 'Android' }, { v: 'iPhone', l: 'Apple iOS' }]} />
            )}

            <div class="form-grid2 stack-sm">
              <Field id={`${id}-merek`} label={jenis === 'HP' ? 'Merek' : 'Merek atau kategori'} wajib error={coba ? galat.merek : ''}>
                <input id={`${id}-merek`} class="form-input" list={`${id}-l-merek`} value={merek} autoComplete="off" aria-invalid={coba && galat.merek ? 'true' : undefined} onInput={e => setMerek((e.target as HTMLInputElement).value)} />
                <datalist id={`${id}-l-merek`}>{(jenis === 'HP' ? [...saran.merek, ...MEREK_UMUM] : saranAcc).map(m => <option key={m} value={m} />)}</datalist>
              </Field>
              <Field id={`${id}-model`} label={jenis === 'HP' ? 'Model seri' : 'Nama aksesoris'} wajib error={coba ? galat.model : ''}>
                <input id={`${id}-model`} class="form-input" placeholder={jenis === 'HP' ? 'Galaxy A54 5G' : 'Charger 20W'} value={model} autoComplete="off" aria-invalid={coba && galat.model ? 'true' : undefined} onInput={e => setModel((e.target as HTMLInputElement).value)} />
              </Field>
            </div>
            <div class="form-grid2 stack-sm">
              <Field id={`${id}-varian`} label={jenis === 'HP' ? 'Varian (RAM/ROM)' : 'Varian (opsional)'}>
                <input id={`${id}-varian`} class="form-input" list={`${id}-l-varian`} placeholder={jenis === 'HP' ? '8/256 GB' : 'Contoh: USB-C'} value={varian} autoComplete="off" onInput={e => setVarian((e.target as HTMLInputElement).value)} />
                {jenis === 'HP' && <datalist id={`${id}-l-varian`}>{saran.varian.map(m => <option key={m} value={m} />)}</datalist>}
              </Field>
              <Field id={`${id}-warna`} label="Warna (opsional)">
                <input id={`${id}-warna`} class="form-input" list={`${id}-l-warna`} placeholder="Hitam" value={warna} autoComplete="off" onInput={e => setWarna((e.target as HTMLInputElement).value)} />
                <datalist id={`${id}-l-warna`}>{saran.warna.map(m => <option key={m} value={m} />)}</datalist>
              </Field>
            </div>
            <Field id={`${id}-harga`} label="Harga jual standar" wajib error={coba ? galat.harga : ''} hint="Acuan harga jual; saat barang masuk muncul sebagai saran">
              <MoneyInput id={`${id}-harga`} value={hargaStandar} onChange={setHargaStandar} invalid={coba && !!galat.harga} placeholder="3.250.000" />
            </Field>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
