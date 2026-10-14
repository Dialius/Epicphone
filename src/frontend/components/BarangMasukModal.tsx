// BarangMasukModal.tsx — catat HP masuk (input beruntun, D007).
// v3: identitas unit memakai merek, model, varian, warna terpisah (sama dengan Katalog Produk) dan nama tersusun otomatis;
// IMEI dicek angka/duplikat/checksum, foto wajib ditegakkan, harga jual target terlihat + margin,
// catatan opsional punya bagian sendiri, "Simpan dan tambah lagi" mempertahankan model yang sama.

import { useMemo, useRef, useState } from 'preact/hooks';
import { ModalShell } from './ModalShell';
import { Field, MoneyInput, SegmentedField, useFieldId, duit } from './ui/Form';
import { Banner } from './ui/Kit';
import { IconCheckCircle } from './Icons';
import { IdentitasUnit, KondisiUnit, FotoUnitForm, UnitForm, UNIT_KOSONG, POSISI_FOTO, galatUnit, unitTerisi } from './FormUnitHP';
import { rupiah, parseTgl, tglWib } from '../lib/format';
import { namaLengkap, cariDiKatalog } from '../lib/produk';
import { UnitHP, ProdukKatalog } from '../mock/data-contoh';

/** Tanggal hari ini (WIB) dalam bentuk yyyy-mm-dd untuk isian tanggal */
function isoHariIni(): string {
  const d = parseTgl(tglWib());
  return d ? d.toISOString().slice(0, 10) : '';
}

/** Isian yang dikirim modal ini ke pemanggil */
export interface DataBarangMasuk {
  nama: string; merek: string; model: string; varian: string; warna: string;
  imei: string; imei2?: string; catatan?: string; supplier: string;
  metodeBayar: 'Tunai' | 'Transfer' | 'Tempo'; dibayar: number; jatuhTempo?: string;
  kondisi: 'Baru' | 'Bekas'; grade?: 'A' | 'B' | 'C'; kelengkapan: string; baterai?: number; bebasKunci: string;
  hargaBeli: number; biayaLain: number; hargaJualTarget: number;
  perluServis: boolean; keluhanServis: string; estimasiServis: number;
  foto: string[]; fotoPosisi: Record<string, string>;
  /** minta server mencatat model ini ke Katalog Produk (hanya bila belum ada) */
  simpanKatalog: boolean;
}

interface Props {
  isOpen?: boolean;
  onClose: () => void;
  onSimpan: (unitData: DataBarangMasuk) => Promise<{ ok: boolean; pesan?: string }> | { ok: boolean; pesan?: string } | void;
  /** Pindah ke pencatatan stok aksesoris */
  onPilihAksesoris?: () => void;
  stokList?: UnitHP[];
  katalog?: ProdukKatalog[];
  suppliers?: string[];
}

const bulat = (n: number) => Math.round(n / 10000) * 10000;

export function BarangMasukModal({ onClose, onSimpan, onPilihAksesoris, stokList = [], katalog = [], suppliers = [] }: Props) {
  const id = useFieldId('bm');
  const [u, setU] = useState<UnitForm>(UNIT_KOSONG);
  const ubah = (patch: Partial<UnitForm>) => setU(x => ({ ...x, ...patch }));
  const [catatan, setCatatan] = useState('');
  const [supplier, setSupplier] = useState('');
  const [metode, setMetode] = useState<'Tunai' | 'Transfer' | 'Tempo'>('Tunai');
  const [dibayarStr, setDibayarStr] = useState('');
  const [tempo, setTempo] = useState('');
  const [hargaBeli, setHargaBeli] = useState('');
  const [biayaLain, setBiayaLain] = useState('');
  const [hargaJual, setHargaJual] = useState('');
  const [perluServis, setPerluServis] = useState(false);
  const [keluhan, setKeluhan] = useState('');
  const [estServis, setEstServis] = useState('');
  const [tambahKatalog, setTambahKatalog] = useState(true);
  const [coba, setCoba] = useState(false);
  const [menyimpan, setMenyimpan] = useState<'tutup' | 'lagi' | null>(null);
  const [sesi, setSesi] = useState<Array<{ nama: string; imei: string }>>([]);
  const imeiRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const nama = namaLengkap(u);
  const beli = duit(hargaBeli), lain = duit(biayaLain), modal = beli + lain + (perluServis ? duit(estServis) : 0);
  const saran = modal > 0 ? bulat(modal * 1.15) : 0;
  const jual = hargaJual ? duit(hargaJual) : saran;
  const margin = modal > 0 && jual > 0 ? Math.round(((jual - modal) / modal) * 100) : null;
  const diKatalog = useMemo(() => cariDiKatalog(katalog, u), [katalog, u.merek, u.model, u.varian, u.warna]);

  const gu = galatUnit(u, stokList);
  const galat = {
    beli: beli <= 0 ? 'Isi harga beli.' : '',
    keluhan: perluServis && !keluhan.trim() ? 'Tulis keluhan yang akan diservis.' : '',
    supplier: metode === 'Tempo' && !supplier.trim() ? 'Isi nama supplier agar hutang bisa dicatat.' : '',
    dibayar: metode === 'Tempo' && beli > 0 && duit(dibayarStr) >= beli ? 'Untuk tempo, bayar sekarang harus kurang dari harga beli.' : '',
    tempo: metode === 'Tempo' && (!tempo || tempo < isoHariIni()) ? (!tempo ? 'Isi tanggal jatuh tempo.' : 'Tanggal jatuh tempo tidak boleh sebelum hari ini.') : '',
  };
  const kurang: string[] = [...gu.kurang];
  if (galat.beli) kurang.push('harga beli');
  if (galat.keluhan) kurang.push('keluhan servis');
  if (galat.supplier) kurang.push('nama supplier');
  if (galat.dibayar) kurang.push('jumlah bayar');
  if (galat.tempo) kurang.push('jatuh tempo');
  const valid = kurang.length === 0;
  const dirty = unitTerisi(u) || !!beli;
  const dibayarSekarang = metode === 'Tempo' ? Math.min(duit(dibayarStr), beli) : beli;
  const sisaHutang = Math.max(0, beli - dibayarSekarang);

  const simpan = async (mode: 'tutup' | 'lagi') => {
    setCoba(true);
    if (!valid) { bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); return; }
    setMenyimpan(mode);
    const hasil = await Promise.resolve(onSimpan({
      nama, merek: u.merek.trim(), model: u.model.trim(), varian: u.varian.trim(), warna: u.warna.trim(),
      imei: u.imei, imei2: u.imei2 || undefined, catatan: catatan.trim() || undefined, supplier: supplier.trim(),
      metodeBayar: metode, dibayar: dibayarSekarang, jatuhTempo: sisaHutang > 0 ? tempo : undefined,
      kondisi: u.kondisi, grade: u.kondisi === 'Bekas' ? u.grade : undefined, kelengkapan: u.kelengkapan,
      baterai: u.kondisi === 'Bekas' ? (u.baterai === '' ? undefined : +u.baterai) : 100, bebasKunci: u.bebasKunci,
      hargaBeli: beli, biayaLain: lain, hargaJualTarget: jual,
      perluServis, keluhanServis: perluServis ? keluhan.trim() : '', estimasiServis: perluServis ? duit(estServis) : 0,
      foto: POSISI_FOTO.map(p => u.foto[p.id]).filter(Boolean),
      fotoPosisi: { ...u.foto },
      simpanKatalog: !diKatalog && tambahKatalog && !!u.merek.trim() && !!u.model.trim(),
    }));
    setMenyimpan(null);
    if (hasil && hasil.ok === false) return;
    setSesi(s => [...s, { nama, imei: u.imei }]);
    if (mode === 'tutup') { onClose(); return; }
    // tambah lagi: model dan harga dipertahankan (sering beli beberapa unit sejenis); yang khas per unit dikosongkan
    setU(x => ({ ...x, imei: '', imei2: '', foto: {}, baterai: '' }));
    setCatatan(''); setDibayarStr(''); setCoba(false); setPerluServis(false); setKeluhan(''); setEstServis('');
    bodyRef.current?.closest('.sheet-body')?.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => imeiRef.current?.focus(), 80);
  };

  const terakhir = sesi[sesi.length - 1];
  const tampilGalat = (k: keyof typeof galat) => (coba ? galat[k] : '');

  return (
    <ModalShell onClose={onClose} title="Barang masuk" subtitle="Catat HP baru atau bekas ke stok" size="lg" dirty={dirty} initialFocus={`#${id}-merek`}
      footer={<>
        <span class="footer-note always" aria-live="polite">{valid ? (margin != null ? `Modal ${rupiah(modal)}, jual ${rupiah(jual)} (margin ${margin}%).` : '') : `Lengkapi dulu: ${kurang.join(', ')}.`}</span>
        <button type="button" class="btn btn-secondary" disabled={menyimpan !== null} onClick={() => simpan('lagi')}>{menyimpan === 'lagi' ? <span class="spinner" /> : null} Simpan dan tambah lagi</button>
        <button type="button" class="btn btn-primary" disabled={menyimpan !== null} onClick={() => simpan('tutup')}>{menyimpan === 'tutup' ? <span class="spinner" /> : null} Simpan</button>
      </>}
      bodyClass="wrap-body">
      <div ref={bodyRef} style={{ display: 'contents' }}>
        {onPilihAksesoris && (
          <SegmentedField label="Jenis barang masuk" value={'HP' as 'HP' | 'Aksesoris'} onChange={v => { if (v === 'Aksesoris') onPilihAksesoris(); }}
            opsi={[{ v: 'HP', l: 'HP' }, { v: 'Aksesoris', l: 'Aksesoris', d: 'Casing, kabel, dll' }]} />
        )}
        {terakhir && (
          <Banner tipe="success" icon={<IconCheckCircle size={20} />}>
            <strong>Tersimpan: {terakhir.nama}</strong> (IMEI ...{terakhir.imei.slice(-4)}). Siap untuk unit berikutnya. Sesi ini: {sesi.length} unit dicatat.
          </Banner>
        )}

        <IdentitasUnit id={id} f={u} set={ubah} coba={coba} galat={gu} katalog={katalog} imeiRef={imeiRef}
          onPilihKatalog={p => { if (!hargaJual && p.hargaStandar > 0) setHargaJual(String(p.hargaStandar)); }}
          tambahKatalog={{ nilai: tambahKatalog, ubah: setTambahKatalog }} />

        <KondisiUnit id={id} f={u} set={ubah} coba={coba} galat={gu} />

        <section class="form-section" aria-labelledby={`${id}-s3`}>
          <h3 class="form-section-title" id={`${id}-s3`}>Harga</h3>
          <div class="form-grid2 stack-sm">
            <Field id={`${id}-beli`} label="Harga beli" wajib error={tampilGalat('beli')}><MoneyInput id={`${id}-beli`} value={hargaBeli} onChange={setHargaBeli} invalid={!!tampilGalat('beli')} describedBy={tampilGalat('beli') ? `${id}-beli-err` : undefined} /></Field>
            <Field id={`${id}-lain`} label="Biaya lain" hint="Ongkir, poles, dll"><MoneyInput id={`${id}-lain`} value={biayaLain} onChange={setBiayaLain} /></Field>
          </div>
          <Field id={`${id}-jual`} label="Harga jual target" hint={saran > 0 ? `Saran ${rupiah(saran)} (margin 15% dari modal ${rupiah(modal)})${margin != null && hargaJual ? `. Margin Anda ${margin}%.` : ''}` : 'Terisi otomatis setelah harga beli diisi'}>
            <MoneyInput id={`${id}-jual`} value={hargaJual} onChange={setHargaJual} placeholder={saran ? saran.toLocaleString('id-ID') : '0'} />
          </Field>
          {saran > 0 && !hargaJual && <button type="button" class="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setHargaJual(String(saran))}>Pakai saran {rupiah(saran)}</button>}
        </section>

        <section class="form-section" aria-labelledby={`${id}-s3b`}>
          <h3 class="form-section-title" id={`${id}-s3b`}>Pembayaran ke supplier</h3>
          <Field id={`${id}-sup`} label={metode === 'Tempo' ? 'Supplier' : 'Asal barang (opsional)'} wajib={metode === 'Tempo'} error={tampilGalat('supplier')} hint="Supplier atau nama penjual; supplier baru otomatis masuk ke Kontak">
            <input id={`${id}-sup`} class="form-input" list={`${id}-sups`} value={supplier} placeholder="Contoh: CV Maju Seluler" aria-invalid={tampilGalat('supplier') ? 'true' : undefined} onInput={e => setSupplier((e.target as HTMLInputElement).value)} />
            <datalist id={`${id}-sups`}>{suppliers.map(s => <option key={s} value={s} />)}</datalist>
          </Field>
          <SegmentedField label="Cara bayar" value={metode} onChange={setMetode} opsi={[{ v: 'Tunai', l: 'Tunai' }, { v: 'Transfer', l: 'Transfer' }, { v: 'Tempo', l: 'Tempo', d: 'Bayar sebagian atau nanti' }]} />
          {metode === 'Tempo' && (
            <div class="form-grid2 stack-sm">
              <Field id={`${id}-dibayar`} label="Bayar sekarang" error={tampilGalat('dibayar')} hint={beli > 0 ? `Sisa hutang ${rupiah(sisaHutang)}` : undefined}>
                <MoneyInput id={`${id}-dibayar`} value={dibayarStr} onChange={setDibayarStr} />
              </Field>
              <Field id={`${id}-tempo`} label="Jatuh tempo" wajib error={tampilGalat('tempo')}>
                <input id={`${id}-tempo`} type="date" class="form-input" min={isoHariIni()} value={tempo} aria-invalid={tampilGalat('tempo') ? 'true' : undefined} onInput={e => setTempo((e.target as HTMLInputElement).value)} />
              </Field>
            </div>
          )}
        </section>

        <FotoUnitForm id={id} f={u} set={ubah} />

        <section class="form-section" aria-labelledby={`${id}-s5`}>
          <h3 class="form-section-title" id={`${id}-s5`}>Catatan <span class="badge badge-neutral" style={{ marginLeft: 8 }}>Opsional</span></h3>
          <Field id={`${id}-cat`} label="Catatan unit" hint="Kondisi khusus, kekurangan, janji ke supplier. Boleh dikosongkan.">
            <textarea id={`${id}-cat`} class="form-input" rows={3} maxLength={300} value={catatan} placeholder="Contoh: lecet halus di frame, charger bawaan tidak ada" onInput={e => setCatatan((e.target as HTMLTextAreaElement).value)} />
          </Field>
        </section>

        <section class="form-section" aria-labelledby={`${id}-s6`}>
          <h3 class="form-section-title" id={`${id}-s6`}>Servis</h3>
          <label class="toggle-row" style={{ padding: 0 }}>
            <span><strong style={{ fontSize: 'var(--text-sm)' }}>Perlu servis sebelum dijual</strong><br /><span class="title-sub">Unit langsung berstatus Servis dan tercatat di halaman Servis</span></span>
            <input type="checkbox" role="switch" checked={perluServis} onChange={e => setPerluServis((e.target as HTMLInputElement).checked)} />
          </label>
          {perluServis && (
            <div class="form-grid2 stack-sm">
              <Field id={`${id}-kel`} label="Keluhan" wajib error={tampilGalat('keluhan')}><input id={`${id}-kel`} class="form-input" value={keluhan} placeholder="Contoh: LCD retak" aria-invalid={tampilGalat('keluhan') ? 'true' : undefined} onInput={e => setKeluhan((e.target as HTMLInputElement).value)} /></Field>
              <Field id={`${id}-est`} label="Estimasi biaya servis"><MoneyInput id={`${id}-est`} value={estServis} onChange={setEstServis} /></Field>
            </div>
          )}
        </section>
      </div>
    </ModalShell>
  );
}
