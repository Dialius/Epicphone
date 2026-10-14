// AksesorisMasukModal.tsx — catat aksesoris masuk (casing, kabel, tempered glass, dll). Menambah stok;
// harga beli rata-rata dihitung server (rata-rata tertimbang). Tanpa ini stok aksesoris tidak pernah terisi.

import { useState } from 'preact/hooks';
import { ModalShell } from './ModalShell';
import { Field, MoneyInput, SegmentedField, useFieldId, duit } from './ui/Form';
import { Banner } from './ui/Kit';
import { IconCheckCircle } from './Icons';
import { rupiah, parseTgl, tglWib } from '../lib/format';
import { Aksesoris } from '../mock/data-contoh';

const KATEGORI: Array<Aksesoris['kategori']> = ['Casing', 'Charger', 'Kabel', 'Pelindung layar', 'Lainnya'];

function isoHariIni(): string {
  const d = parseTgl(tglWib());
  return d ? d.toISOString().slice(0, 10) : '';
}

/** Isian yang dikirim modal ini ke pemanggil */
export interface DataAksesorisMasuk {
  tanggalMasuk?: string;
  nama: string; kategori: Aksesoris['kategori']; qty: number; hargaBeli: number; hargaJual: number; sku?: string;
  supplier: string; metodeBayar: 'Tunai' | 'Transfer' | 'Tempo'; dibayar: number; jatuhTempo?: string;
  catatan?: string;
}

interface Props {
  onClose: () => void;
  onSimpan: (data: DataAksesorisMasuk) => Promise<{ ok: boolean; pesan?: string }> | { ok: boolean; pesan?: string } | void;
  /** Kembali ke pencatatan HP */
  onPilihHp?: () => void;
  aksesorisList?: Aksesoris[];
  suppliers?: string[];
}

export function AksesorisMasukModal({ onClose, onSimpan, onPilihHp, aksesorisList = [], suppliers = [] }: Props) {
  const id = useFieldId('am');
  const [tanggalMasuk, setTanggalMasuk] = useState<string>(isoHariIni());
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState<Aksesoris['kategori']>('Lainnya');
  const [qty, setQty] = useState('');
  const [hargaBeli, setHargaBeli] = useState('');
  const [hargaJual, setHargaJual] = useState('');
  const [supplier, setSupplier] = useState('');
  const [metode, setMetode] = useState<'Tunai' | 'Transfer' | 'Tempo'>('Tunai');
  const [dibayarStr, setDibayarStr] = useState('');
  const [tempo, setTempo] = useState('');
  const [catatan, setCatatan] = useState('');
  const [coba, setCoba] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [sesi, setSesi] = useState<Array<{ nama: string; qty: number }>>([]);

  const ada = aksesorisList.find(a => a.nama.trim().toLowerCase() === nama.trim().toLowerCase());
  const n = Math.max(0, Math.floor(+qty || 0));
  const satuan = duit(hargaBeli);
  const total = n * satuan;
  const dibayarSekarang = metode === 'Tempo' ? Math.min(duit(dibayarStr), total) : total;
  const sisa = Math.max(0, total - dibayarSekarang);

  const galat = {
    nama: !nama.trim() ? 'Isi nama aksesoris.' : '',
    qty: n < 1 ? 'Jumlah minimal 1.' : '',
    beli: satuan <= 0 ? 'Isi harga beli per buah.' : '',
    supplier: metode === 'Tempo' && !supplier.trim() ? 'Isi nama supplier agar hutang bisa dicatat.' : '',
    dibayar: metode === 'Tempo' && total > 0 && duit(dibayarStr) >= total ? 'Untuk tempo, bayar sekarang harus kurang dari total.' : '',
    tempo: metode === 'Tempo' && (!tempo || tempo < isoHariIni()) ? (!tempo ? 'Isi tanggal jatuh tempo.' : 'Tanggal jatuh tempo tidak boleh sebelum hari ini.') : '',
  };
  const valid = !Object.values(galat).some(Boolean);
  const dirty = !!(nama || qty || hargaBeli || catatan);

  const simpan = async (tutup: boolean) => {
    if (menyimpan) return;
    setCoba(true);
    if (!valid) return;
    setMenyimpan(true);
    const hasil = await Promise.resolve(onSimpan({
      tanggalMasuk: tanggalMasuk || isoHariIni(),
      nama: nama.trim(), kategori: ada ? ada.kategori : kategori, qty: n, hargaBeli: satuan, hargaJual: duit(hargaJual) || (ada ? ada.hargaJual : 0), sku: ada?.sku, catatan: catatan.trim() || undefined,
      supplier: supplier.trim(), metodeBayar: metode, dibayar: dibayarSekarang, jatuhTempo: sisa > 0 ? tempo : undefined,
    }));
    setMenyimpan(false);
    if (hasil && hasil.ok === false) return;
    setSesi(s => [...s, { nama: nama.trim(), qty: n }]);
    if (tutup) { onClose(); return; }
    setNama(''); setQty(''); setHargaBeli(''); setHargaJual(''); setDibayarStr(''); setCatatan(''); setCoba(false);
  };

  const terakhir = sesi[sesi.length - 1];
  return (
    <ModalShell onClose={onClose} title="Barang masuk" subtitle="Catat aksesoris ke stok" size="lg" dirty={dirty} initialFocus={`#${id}-nama`}
      footer={<>
        <span class="footer-note always" aria-live="polite">{valid ? `${n} buah × ${rupiah(satuan)} = ${rupiah(total)}` : 'Lengkapi isian yang bertanda merah.'}</span>
        <button type="button" class="btn btn-secondary" disabled={menyimpan} onClick={() => simpan(false)}>Simpan dan tambah lagi</button>
        <button type="button" class="btn btn-primary" disabled={menyimpan} onClick={() => simpan(true)}>{menyimpan ? <span class="spinner" /> : null} Simpan</button>
      </>}
      bodyClass="wrap-body">
      <div style={{ display: 'contents' }}>
        {onPilihHp && (
          <SegmentedField label="Jenis barang masuk" value={'Aksesoris' as 'HP' | 'Aksesoris'} onChange={v => { if (v === 'HP') onPilihHp(); }}
            opsi={[{ v: 'HP', l: 'HP' }, { v: 'Aksesoris', l: 'Aksesoris', d: 'Casing, kabel, dll' }]} />
        )}
        {terakhir && (
          <Banner tipe="success" icon={<IconCheckCircle size={20} />}><strong>Tersimpan: {terakhir.nama}</strong> ({terakhir.qty} buah). Sesi ini: {sesi.length} item dicatat.</Banner>
        )}
        <section class="form-section">
          <h3 class="form-section-title">Barang</h3>
          <Field id={`${id}-nama`} label="Nama aksesoris" wajib error={coba ? galat.nama : ''} hint={ada ? `Sudah ada di stok (sisa ${ada.stok}). Jumlah akan ditambahkan.` : 'Barang baru otomatis dibuatkan SKU'}>
            <input id={`${id}-nama`} class="form-input" list={`${id}-acc`} placeholder="Contoh: Tempered Glass iPhone 11" value={nama} autoComplete="off"
              aria-invalid={coba && galat.nama ? 'true' : undefined} onInput={e => setNama((e.target as HTMLInputElement).value)} />
            <datalist id={`${id}-acc`}>{aksesorisList.map(a => <option key={a.sku} value={a.nama} />)}</datalist>
          </Field>
          {!ada && (
            <Field id={`${id}-kat`} label="Kategori">
              <select id={`${id}-kat`} class="form-select" value={kategori} onChange={e => setKategori((e.target as HTMLSelectElement).value as Aksesoris['kategori'])}>
                {KATEGORI.map(k => <option key={k}>{k}</option>)}
              </select>
            </Field>
          )}
          <div class="form-grid2">
            <Field id={`${id}-qty`} label="Jumlah (buah)" wajib error={coba ? galat.qty : ''}>
              <input id={`${id}-qty`} class="form-input" inputMode="numeric" value={qty} onInput={e => setQty((e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 5))} />
            </Field>
            <Field id={`${id}-beli`} label="Harga beli per buah" wajib error={coba ? galat.beli : ''}>
              <MoneyInput id={`${id}-beli`} value={hargaBeli} onChange={setHargaBeli} invalid={coba && !!galat.beli} />
            </Field>
          </div>
          <Field id={`${id}-jual`} label="Harga jual per buah" hint={ada ? `Sekarang ${rupiah(ada.hargaJual)}; kosongkan untuk tidak mengubah` : undefined}>
            <MoneyInput id={`${id}-jual`} value={hargaJual} onChange={setHargaJual} />
          </Field>
        </section>
        <section class="form-section">
          <h3 class="form-section-title">Waktu & Pembayaran Supplier</h3>
          <div class="form-grid2">
            <Field id={`${id}-tgl`} label="Tanggal barang masuk" hint="Bisa diatur jika mencatat stok lama; default hari ini">
              <input id={`${id}-tgl`} type="date" class="form-input" max={isoHariIni()} value={tanggalMasuk} onInput={e => setTanggalMasuk((e.target as HTMLInputElement).value)} />
            </Field>
            <Field id={`${id}-sup`} label={metode === 'Tempo' ? 'Supplier' : 'Asal barang (opsional)'} wajib={metode === 'Tempo'} error={coba ? galat.supplier : ''}>
              <input id={`${id}-sup`} class="form-input" list={`${id}-sups`} value={supplier} placeholder="Contoh: Toko Aksesoris Jaya" onInput={e => setSupplier((e.target as HTMLInputElement).value)} />
              <datalist id={`${id}-sups`}>{suppliers.map(s => <option key={s} value={s} />)}</datalist>
            </Field>
          </div>
          <SegmentedField label="Cara bayar" value={metode} onChange={setMetode} opsi={[{ v: 'Tunai', l: 'Tunai' }, { v: 'Transfer', l: 'Transfer' }, { v: 'Tempo', l: 'Tempo', d: 'Bayar sebagian atau nanti' }]} />
          {metode === 'Tempo' && (
            <div class="form-grid2">
              <Field id={`${id}-dibayar`} label="Bayar sekarang" error={coba ? galat.dibayar : ''} hint={total > 0 ? `Sisa hutang ${rupiah(sisa)}` : undefined}>
                <MoneyInput id={`${id}-dibayar`} value={dibayarStr} onChange={setDibayarStr} />
              </Field>
              <Field id={`${id}-tempo`} label="Jatuh tempo" wajib error={coba ? galat.tempo : ''}>
                <input id={`${id}-tempo`} type="date" class="form-input" min={isoHariIni()} value={tempo} onInput={e => setTempo((e.target as HTMLInputElement).value)} />
              </Field>
            </div>
          )}
        </section>
        <section class="form-section">
          <h3 class="form-section-title">Catatan <span class="badge badge-neutral" style={{ marginLeft: 8 }}>Opsional</span></h3>
          <Field id={`${id}-cat`} label="Catatan barang masuk" hint="Nomor nota supplier, kondisi dus, dll. Boleh dikosongkan.">
            <textarea id={`${id}-cat`} class="form-input" rows={3} maxLength={300} value={catatan} onInput={e => setCatatan((e.target as HTMLTextAreaElement).value)} />
          </Field>
        </section>
      </div>
    </ModalShell>
  );
}
