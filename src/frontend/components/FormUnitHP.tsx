// FormUnitHP.tsx — bagian form "detail unit HP" yang dipakai di dua tempat dengan isian yang SAMA:
//   1. Barang Masuk (unit baru dibeli)       2. Tukar Tambah di Penjualan Baru (HP lama pelanggan)
// Model dan varian ditulis terpisah (merek, model, varian, warna) seperti di Katalog Produk;
// nama unit tersusun otomatis dan menyesuaikan katalog.

import { useMemo } from 'preact/hooks';
import { Field, SegmentedField } from './ui/Form';
import { IconCamera, IconClose, IconAlertTriangle, IconCheckCircle } from './Icons';
import { kompresFoto } from '../lib/foto';
import { toast } from '../lib/toast';
import { UnitHP, ProdukKatalog } from '../mock/data-contoh';
import { BagianNama, namaLengkap, saranDariKatalog, cariDiKatalog, kunciNama } from '../lib/produk';
import { rupiah } from '../lib/format';

export interface UnitForm extends BagianNama {
  imei: string; imei2: string;
  kondisi: 'Baru' | 'Bekas';
  grade: 'A' | 'B' | 'C';
  kelengkapan: 'Fullset' | 'Unit saja' | 'Tanpa dus';
  baterai: string;
  bebasKunci: 'Ya' | 'Tidak' | 'Belum dicek';
  /** posisi foto -> data URI (tidak ikut disimpan ke draf: terlalu besar) */
  foto: Record<string, string>;
}

export const UNIT_KOSONG: UnitForm = {
  merek: '', model: '', varian: '', warna: '', imei: '', imei2: '', kondisi: 'Bekas', grade: 'B', kelengkapan: 'Fullset', baterai: '', bebasKunci: 'Ya', foto: {},
};

export const POSISI_FOTO = [
  { id: 'DEPAN', label: 'Tampak depan', wajib: () => true },
  { id: 'BELAKANG', label: 'Tampak belakang', wajib: () => true },
  { id: 'LAYAR-MENYALA', label: 'Layar menyala', wajib: (k: string) => k === 'Bekas' },
  { id: 'IMEI', label: 'Stiker atau menu IMEI', wajib: () => false },
  { id: 'CACAT', label: 'Cacat atau lecet', wajib: () => false },
  { id: 'DUS', label: 'Dus dan kelengkapan', wajib: () => false },
];

/** Checksum Luhn untuk IMEI 15 digit */
export function luhnOk(s: string) {
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    let d = +s[s.length - 1 - i];
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

export interface GalatUnit {
  merek: string; model: string; imei: string; imei2: string; baterai: string;
  dobel?: UnitHP; dobelAktif: boolean;
  fotoKurang: typeof POSISI_FOTO;
  /** daftar singkat untuk catatan di footer */
  kurang: string[];
}

/** Validasi bagian unit. `imeiLain` = IMEI lain yang sedang dipakai di transaksi yang sama (mis. unit yang dijual). */
export function galatUnit(f: UnitForm, stokList: UnitHP[], imeiLain: string[] = [], fotoWajib = true): GalatUnit {
  const dobel = f.imei.length === 15 ? stokList.find(u => u.imei === f.imei) : undefined;
  const dobelAktif = !!dobel && dobel.status !== 'Terjual';
  const samaDenganLain = f.imei.length === 15 && imeiLain.includes(f.imei);
  const fotoKurang = fotoWajib ? POSISI_FOTO.filter(p => p.wajib(f.kondisi) && !f.foto[p.id]) : [];
  const g = {
    merek: !f.merek.trim() ? 'Isi merek HP.' : '',
    model: !f.model.trim() ? 'Isi model HP.' : '',
    imei: f.imei.length !== 15
      ? `IMEI harus 15 angka (${f.imei.length < 15 ? 'kurang ' + (15 - f.imei.length) : 'lebih ' + (f.imei.length - 15)}).`
      : dobelAktif ? `IMEI ini sudah ada di stok: ${dobel!.nama} (${dobel!.status}).`
      : samaDenganLain ? 'IMEI ini sama dengan unit lain di transaksi ini.' : '',
    imei2: f.imei2 !== '' && f.imei2.length !== 15 ? 'IMEI 2 harus 15 angka.' : f.imei2 !== '' && f.imei2 === f.imei ? 'IMEI 2 sama dengan IMEI 1.' : '',
    baterai: f.kondisi === 'Bekas' && f.baterai !== '' && (+f.baterai < 1 || +f.baterai > 100) ? 'Baterai 1 sampai 100 persen.' : '',
  };
  const kurang: string[] = [];
  if (g.merek) kurang.push('merek');
  if (g.model) kurang.push('model');
  if (g.imei) kurang.push(f.imei.length !== 15 ? 'IMEI 15 digit' : 'IMEI unik');
  if (g.imei2) kurang.push('IMEI 2');
  if (g.baterai) kurang.push('baterai');
  fotoKurang.forEach(p => kurang.push('foto ' + p.label.toLowerCase()));
  return { ...g, dobel, dobelAktif, fotoKurang, kurang };
}

interface BagianProps {
  id: string;
  f: UnitForm;
  set: (patch: Partial<UnitForm>) => void;
  /** tampilkan galat setelah pengguna mencoba menyimpan */
  coba: boolean;
  galat: GalatUnit;
}

/** Bagian 1: identitas — merek, model, varian, warna (terpisah), nama otomatis, IMEI */
export function IdentitasUnit({ id, f, set, coba, galat, katalog = [], onPilihKatalog, imeiRef, judul = 'Identitas', tambahKatalog }: BagianProps & {
  katalog?: ProdukKatalog[];
  onPilihKatalog?: (p: ProdukKatalog) => void;
  imeiRef?: preact.RefObject<HTMLInputElement>;
  judul?: string;
  /** kotak centang "tambahkan ke Katalog" bila model belum ada di katalog */
  tambahKatalog?: { nilai: boolean; ubah: (v: boolean) => void };
}) {
  const saran = useMemo(() => saranDariKatalog(katalog, { merek: f.merek, model: f.model }), [katalog, f.merek, f.model]);
  const nama = namaLengkap(f);
  const diKatalog = useMemo(() => cariDiKatalog(katalog, f), [katalog, f.merek, f.model, f.varian, f.warna]);
  const katalogHp = useMemo(() => katalog.filter(k => k.jenis === 'HP' && k.aktif !== false), [katalog]);
  const tampil = (k: keyof GalatUnit) => (coba || (k === 'imei' && f.imei.length > 0 && (f.imei.length === 15 && galat.imei !== ''))) ? (galat[k] as string) : '';
  const adaIsi = !!(f.merek || f.model || f.varian || f.warna);

  return (
    <section class="form-section" aria-labelledby={`${id}-s1`}>
      <h3 class="form-section-title" id={`${id}-s1`}>{judul}</h3>

      {katalogHp.length > 0 && (
        <Field id={`${id}-pilihkat`} label="Pilih dari Katalog Produk" hint="Opsional. Mengisi merek, model, varian, dan warna sekaligus.">
          <select id={`${id}-pilihkat`} class="form-select" value="" onChange={e => {
            const p = katalogHp.find(k => k.id === (e.target as HTMLSelectElement).value);
            if (!p) return;
            set({ merek: p.merek, model: p.model, varian: p.varian || '', warna: p.warna || '' });
            onPilihKatalog?.(p);
            (e.target as HTMLSelectElement).value = '';
          }}>
            <option value="">Pilih model dari katalog…</option>
            {katalogHp.map(k => <option key={k.id} value={k.id}>{namaLengkap(k)}</option>)}
          </select>
        </Field>
      )}

      <div class="form-grid2 stack-sm">
        <Field id={`${id}-merek`} label="Merek" wajib error={tampil('merek')}>
          <input id={`${id}-merek`} class="form-input" list={`${id}-l-merek`} placeholder="Contoh: Samsung" value={f.merek} autoComplete="off" aria-invalid={tampil('merek') ? 'true' : undefined}
            onInput={e => set({ merek: (e.target as HTMLInputElement).value })} />
          <datalist id={`${id}-l-merek`}>{saran.merek.map(m => <option key={m} value={m} />)}</datalist>
        </Field>
        <Field id={`${id}-model`} label="Model seri" wajib error={tampil('model')}>
          <input id={`${id}-model`} class="form-input" list={`${id}-l-model`} placeholder="Contoh: Galaxy A54 5G" value={f.model} autoComplete="off" aria-invalid={tampil('model') ? 'true' : undefined}
            onInput={e => set({ model: (e.target as HTMLInputElement).value })} />
          <datalist id={`${id}-l-model`}>{saran.model.map(m => <option key={m} value={m} />)}</datalist>
        </Field>
      </div>
      <div class="form-grid2 stack-sm">
        <Field id={`${id}-varian`} label="Varian (RAM/ROM)">
          <input id={`${id}-varian`} class="form-input" list={`${id}-l-varian`} placeholder="Contoh: 8/256 GB" value={f.varian} autoComplete="off" onInput={e => set({ varian: (e.target as HTMLInputElement).value })} />
          <datalist id={`${id}-l-varian`}>{saran.varian.map(m => <option key={m} value={m} />)}</datalist>
        </Field>
        <Field id={`${id}-warna`} label="Warna">
          <input id={`${id}-warna`} class="form-input" list={`${id}-l-warna`} placeholder="Contoh: Hitam" value={f.warna} autoComplete="off" onInput={e => set({ warna: (e.target as HTMLInputElement).value })} />
          <datalist id={`${id}-l-warna`}>{saran.warna.map(m => <option key={m} value={m} />)}</datalist>
        </Field>
      </div>

      <div class="card" style={{ background: 'var(--bg-subtle)', padding: '12px 14px' }} aria-live="polite">
        <div class="eyebrow">Nama unit di stok</div>
        <div style={{ fontWeight: 700, marginTop: 2, color: nama ? 'var(--text)' : 'var(--text-3)' }}>{nama || 'Terisi otomatis dari merek, model, varian, dan warna'}</div>
        {adaIsi && nama && (
          diKatalog
            ? <div class="form-hint" style={{ color: 'var(--ok-fg)', display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}><IconCheckCircle size={14} /> Ada di Katalog Produk ({diKatalog.id}){diKatalog.hargaStandar ? `, harga standar ${rupiah(diKatalog.hargaStandar)}` : ''}</div>
            : tambahKatalog && f.merek.trim() && f.model.trim()
              ? (
                <label class="toggle-row" style={{ padding: '8px 0 0', justifyContent: 'flex-start', gap: 10 }}>
                  <input type="checkbox" checked={tambahKatalog.nilai} onChange={e => tambahKatalog.ubah((e.target as HTMLInputElement).checked)} />
                  <span style={{ fontSize: 'var(--text-xs)' }}>Belum ada di Katalog Produk. Tambahkan model ini ke katalog agar lain kali tinggal dipilih.</span>
                </label>
              )
              : <div class="form-hint" style={{ marginTop: 4 }}>Belum ada di Katalog Produk.</div>
        )}
      </div>

      <Field id={`${id}-imei`} label="IMEI 1" wajib error={tampil('imei')} hint={`${f.imei.length}/15 digit${galat.dobel && !galat.dobelAktif ? '. Unit ini pernah terjual, dicatat sebagai masuk kembali.' : ''}`}>
        <input ref={imeiRef} id={`${id}-imei`} class="form-input mono" inputMode="numeric" maxLength={15} placeholder="15 angka" autoComplete="off" value={f.imei}
          aria-invalid={tampil('imei') ? 'true' : undefined} aria-describedby={`${id}-imei-${tampil('imei') ? 'err' : 'hint'}`}
          onInput={e => set({ imei: (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 15) })} />
      </Field>
      {f.imei.length === 15 && !luhnOk(f.imei) && !galat.dobelAktif && (
        <div class="form-hint" style={{ color: 'var(--warn-fg)', display: 'flex', gap: 6, alignItems: 'center' }}><IconAlertTriangle size={14} /> Checksum IMEI tidak cocok. Periksa lagi digitnya, atau lanjutkan bila Anda yakin.</div>
      )}
      <Field id={`${id}-imei2`} label="IMEI 2 (opsional)" error={coba ? galat.imei2 : (f.imei2.length === 15 ? galat.imei2 : '')} hint="Untuk HP dual SIM">
        <input id={`${id}-imei2`} class="form-input mono" inputMode="numeric" maxLength={15} placeholder="15 angka" autoComplete="off" value={f.imei2}
          aria-invalid={galat.imei2 && (coba || f.imei2.length === 15) ? 'true' : undefined}
          onInput={e => set({ imei2: (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 15) })} />
      </Field>
    </section>
  );
}

/** Bagian 2: kondisi fisik */
export function KondisiUnit({ id, f, set, coba, galat, judul = 'Kondisi' }: BagianProps & { judul?: string }) {
  return (
    <section class="form-section" aria-labelledby={`${id}-s2`}>
      <h3 class="form-section-title" id={`${id}-s2`}>{judul}</h3>
      <SegmentedField label="Kondisi unit" value={f.kondisi} onChange={v => set({ kondisi: v })} opsi={[{ v: 'Bekas', l: 'Bekas' }, { v: 'Baru', l: 'Baru' }]} />
      {f.kondisi === 'Bekas' && (
        <>
          <div class="form-group"><span class="form-label">Grade</span>
            <SegmentedField label="Grade" value={f.grade} onChange={v => set({ grade: v })} opsi={[{ v: 'A', l: 'Grade A', d: 'Mulus' }, { v: 'B', l: 'Grade B', d: 'Normal' }, { v: 'C', l: 'Grade C', d: 'Banyak lecet' }]} /></div>
          <div class="form-grid2 stack-sm">
            <Field id={`${id}-bat`} label="Kesehatan baterai (%)" error={coba ? galat.baterai : ''}>
              <input id={`${id}-bat`} class="form-input" inputMode="numeric" placeholder="Contoh: 88" value={f.baterai} aria-invalid={coba && galat.baterai ? 'true' : undefined}
                onInput={e => set({ baterai: (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 3) })} />
            </Field>
            <Field id={`${id}-kunci`} label="Bebas kunci akun">
              <select id={`${id}-kunci`} class="form-select" value={f.bebasKunci} onChange={e => set({ bebasKunci: (e.target as HTMLSelectElement).value as UnitForm['bebasKunci'] })}>
                <option value="Ya">Ya, bebas</option><option value="Tidak">Tidak</option><option value="Belum dicek">Belum dicek</option>
              </select>
            </Field>
          </div>
        </>
      )}
      <Field id={`${id}-lengkap`} label="Kelengkapan">
        <select id={`${id}-lengkap`} class="form-select" value={f.kelengkapan} onChange={e => set({ kelengkapan: (e.target as HTMLSelectElement).value as UnitForm['kelengkapan'] })}>
          <option>Fullset</option><option>Unit saja</option><option>Tanpa dus</option>
        </select>
      </Field>
    </section>
  );
}

/** Bagian 3: foto unit per posisi (kamera belakang di HP) */
export function FotoUnitForm({ id, f, set, wajib = true, judul = 'Foto unit' }: { id: string; f: UnitForm; set: (patch: Partial<UnitForm>) => void; wajib?: boolean; judul?: string }) {
  const jmlWajib = wajib ? POSISI_FOTO.filter(p => p.wajib(f.kondisi)).length : 0;
  const terisiWajib = wajib ? POSISI_FOTO.filter(p => p.wajib(f.kondisi) && f.foto[p.id]).length : 0;
  const pilih = async (pos: string, e: Event) => {
    const el = e.target as HTMLInputElement;
    const file = el.files?.[0]; if (!file) return;
    try { const h = await kompresFoto(file); set({ foto: { ...f.foto, [pos]: h.dataUri } }); }
    catch { toast({ tipe: 'error', judul: 'Foto belum bisa diproses', desk: 'Coba ambil ulang atau pilih foto lain.' }); }
    el.value = '';
  };
  return (
    <section class="form-section" aria-labelledby={`${id}-s4`}>
      <h3 class="form-section-title" id={`${id}-s4`}>{judul} {jmlWajib > 0 && <span class="badge badge-servis" style={{ marginLeft: 8 }}>{terisiWajib} dari {jmlWajib} wajib</span>}</h3>
      <div class="foto-grid">
        {POSISI_FOTO.map(p => {
          const perlu = wajib && p.wajib(f.kondisi), ada = !!f.foto[p.id];
          return (
            <label key={p.id} class={`foto-slot ${ada ? 'terisi' : ''} ${perlu ? 'wajib' : ''}`}>
              {ada ? (<><img src={f.foto[p.id]} alt={`Foto ${p.label}`} /><span class="foto-tag">{p.label}</span>
                <button type="button" class="foto-x" aria-label={`Hapus foto ${p.label}`} onClick={e => { e.preventDefault(); e.stopPropagation(); const c = { ...f.foto }; delete c[p.id]; set({ foto: c }); }}><IconClose size={14} /></button></>)
                : (<><IconCamera size={22} /><span>{p.label}</span>{perlu && <span class="wajib-tag">Wajib</span>}</>)}
              <input type="file" accept="image/*" aria-label={`Pilih atau ambil foto ${p.label}${perlu ? ' (wajib)' : ''}`} onChange={e => pilih(p.id, e)} />
            </label>
          );
        })}
      </div>
    </section>
  );
}

/** Apakah isian unit sudah diisi sedikit saja (untuk konfirmasi tutup) */
export const unitTerisi = (f: UnitForm) => !!(f.merek || f.model || f.imei || Object.keys(f.foto).length);
export { kunciNama };
