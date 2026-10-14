// ServisScreen.tsx — daftar servis, servis baru, detail servis, dan selesaikan servis.
// v3: tombol dirapikan (status sebagai kontrol segmen dengan jumlah, jenis sebagai pilihan, satu tombol aksi per kartu,
// satu tombol utama per modal), modal memakai ModalShell (bisa di-scroll, Esc/Back), semua isian uang berformat Rp,
// perubahan status tersimpan lewat pemanggil (tidak lagi mengubah data props langsung), unit internal dipilih dari stok.

import { useEffect, useMemo, useState } from 'preact/hooks';
import { tglWib, nomorDokumen, urutanBerikut, rupiah, normalisasiWa } from '../lib/format';
import type { ServisItem, UnitHP } from '../mock/data-contoh';
import { ModalShell } from '../components/ModalShell';
import { Field, MoneyInput, SegmentedField, useFieldId, duit } from '../components/ui/Form';
import { Banner, EmptyState } from '../components/ui/Kit';
import { IconPlus, IconCheck, IconSearch, IconWrench, IconChevronRight } from '../components/Icons';

type StatusServis = ServisItem['status'];
type StatusTab = 'Semua' | StatusServis;

interface Props {
  servisList?: ServisItem[];
  stokHpList?: UnitHP[];
  /** Kembalikan false bila gagal agar dialog tetap terbuka */
  onServisSelesai: (idServis: string, biayaPart: number, biayaJasa: number) => void | boolean | Promise<boolean | void>;
  /** Antri -> Dikerjakan, Selesai -> Diambil */
  onUbahStatus: (idServis: string, status: 'Dikerjakan' | 'Diambil') => void | boolean | Promise<boolean | void>;
  onTambahServis: (baru: ServisItem) => void | boolean | Promise<boolean | void>;
  /** unit stok yang dikirim ke servis dari halaman Stok: form langsung terbuka dan terisi */
  unitAwal?: UnitHP | null;
}

const TAB: StatusTab[] = ['Semua', 'Antri', 'Dikerjakan', 'Selesai', 'Diambil'];
const kelasBadge = (s: StatusServis) => (s === 'Selesai' ? 'badge-ready' : s === 'Dikerjakan' ? 'badge-servis' : s === 'Diambil' ? 'badge-neutral' : 'badge-info');

/** Aksi berikutnya untuk satu servis (null = tidak ada aksi lagi) */
function aksiBerikut(s: ServisItem): { kunci: 'mulai' | 'selesai' | 'serah'; label: string } | null {
  if (s.status === 'Antri') return { kunci: 'mulai', label: 'Mulai kerjakan' };
  if (s.status === 'Dikerjakan') return { kunci: 'selesai', label: 'Selesaikan' };
  if (s.status === 'Selesai' && s.jenis === 'Pelanggan') return { kunci: 'serah', label: 'Serahkan ke pelanggan' };
  return null;
}

export function ServisScreen({ servisList = [], stokHpList = [], onServisSelesai, onUbahStatus, onTambahServis, unitAwal }: Props) {
  const id = useFieldId('sv');
  const [tab, setTab] = useState<StatusTab>('Semua');
  const [filterJenis, setFilterJenis] = useState<'Semua' | 'Internal' | 'Pelanggan'>('Semua');
  const [query, setQuery] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formBaru, setFormBaru] = useState(false);
  const [selesaiId, setSelesaiId] = useState<string | null>(null);
  const [proses, setProses] = useState<string | null>(null);

  // ---- form servis baru ----
  const [jenis, setJenis] = useState<'Internal' | 'Pelanggan'>('Internal');
  const [unitId, setUnitId] = useState('');
  const [perangkat, setPerangkat] = useState('');
  const [imei, setImei] = useState('');
  const [pelanggan, setPelanggan] = useState('');
  const [wa, setWa] = useState('');
  const [keluhan, setKeluhan] = useState('');
  const [estimasi, setEstimasi] = useState('');
  const [tarif, setTarif] = useState('');
  const [pelaksana, setPelaksana] = useState<'Teknisi sendiri' | 'Vendor luar'>('Teknisi sendiri');
  const [namaTeknisi, setNamaTeknisi] = useState('');
  const [coba, setCoba] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);

  // ---- dialog selesai ----
  const [biayaPart, setBiayaPart] = useState('');
  const [biayaJasa, setBiayaJasa] = useState('');

  const unitServis = useMemo(() => stokHpList.filter(u => u.status === 'Ready' || u.id === unitAwal?.id), [stokHpList, unitAwal]);

  const bukaForm = () => {
    setJenis('Internal'); setUnitId(''); setPerangkat(''); setImei(''); setPelanggan(''); setWa(''); setKeluhan(''); setEstimasi(''); setTarif('');
    setPelaksana('Teknisi sendiri'); setNamaTeknisi(''); setCoba(false); setFormBaru(true);
  };

  useEffect(() => {
    if (!unitAwal) return;
    setJenis('Internal'); setUnitId(unitAwal.id); setPerangkat(unitAwal.nama); setImei(unitAwal.imei); setKeluhan(''); setEstimasi('');
    setPelaksana('Teknisi sendiri'); setNamaTeknisi(''); setCoba(false); setFormBaru(true);
  }, [unitAwal]);

  const pilihUnit = (v: string) => {
    setUnitId(v);
    const u = stokHpList.find(x => x.id === v);
    setPerangkat(u?.nama || ''); setImei(u?.imei || '');
  };

  const jumlah = useMemo(() => {
    const j: Record<StatusTab, number> = { Semua: servisList.length, Antri: 0, Dikerjakan: 0, Selesai: 0, Diambil: 0 };
    servisList.forEach(s => { j[s.status]++; });
    return j;
  }, [servisList]);

  const terfilter = useMemo(() => {
    const q = query.trim().toLowerCase();
    return servisList.filter(s => {
      if (tab !== 'Semua' && s.status !== tab) return false;
      if (filterJenis !== 'Semua' && s.jenis !== filterJenis) return false;
      if (q && !(s.namaPerangkat.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.imei.includes(q) || s.namaPelanggan.toLowerCase().includes(q) || s.keluhan.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [servisList, tab, filterJenis, query]);

  const detail = detailId ? servisList.find(s => s.id === detailId) || null : null;
  const selesaiItem = selesaiId ? servisList.find(s => s.id === selesaiId) || null : null;

  // ---- galat form baru ----
  const galat = {
    unit: jenis === 'Internal' && !unitId ? 'Pilih unit dari stok yang akan diservis.' : '',
    perangkat: jenis === 'Pelanggan' && !perangkat.trim() ? 'Isi nama perangkat.' : '',
    pelanggan: jenis === 'Pelanggan' && !pelanggan.trim() ? 'Isi nama pemilik.' : '',
    wa: jenis === 'Pelanggan' && wa.trim() && normalisasiWa(wa).length < 10 ? 'Nomor WhatsApp terlalu pendek.' : '',
    keluhan: !keluhan.trim() ? 'Tulis keluhan atau kerusakannya.' : '',
  };
  const formValid = !Object.values(galat).some(Boolean);

  const simpanBaru = async (e?: Event) => {
    e?.preventDefault();
    setCoba(true);
    if (!formValid || menyimpan) return;
    const unit = jenis === 'Internal' ? stokHpList.find(u => u.id === unitId) : undefined;
    const teknisi = `${pelaksana}${namaTeknisi.trim() ? ` (${namaTeknisi.trim()})` : ''}`;
    const item: ServisItem = {
      id: nomorDokumen('SRV', urutanBerikut(servisList.map(s => s.id), 'SRV')),
      tglMasuk: tglWib(), jenis,
      namaPerangkat: unit ? unit.nama : perangkat.trim(), imei: (unit ? unit.imei : imei.trim()) || '-',
      namaPelanggan: jenis === 'Internal' ? 'Unit Toko' : pelanggan.trim(), noWa: jenis === 'Internal' ? '-' : (wa.trim() || '-'),
      keluhan: keluhan.trim(), teknisi, estimasiBiaya: duit(estimasi), biayaPart: 0, biayaJasa: 0,
      tarifPelanggan: jenis === 'Internal' ? 0 : duit(tarif), status: 'Antri', tahap: 'sebelum', unitHpId: unit?.id,
    };
    setMenyimpan(true);
    const hasil = await Promise.resolve(onTambahServis(item));
    setMenyimpan(false);
    if (hasil === false) return;
    setFormBaru(false);
  };

  const jalankanAksi = async (s: ServisItem, kunci: 'mulai' | 'selesai' | 'serah') => {
    if (proses) return;
    if (kunci === 'selesai') {
      setBiayaPart(s.estimasiBiaya > 0 ? String(s.estimasiBiaya) : ''); setBiayaJasa(''); setSelesaiId(s.id); return;
    }
    setProses(s.id);
    try { await Promise.resolve(onUbahStatus(s.id, kunci === 'mulai' ? 'Dikerjakan' : 'Diambil')); } finally { setProses(null); }
  };

  const konfirmasiSelesai = async (e?: Event) => {
    e?.preventDefault();
    if (!selesaiItem || menyimpan) return;
    setMenyimpan(true);
    const hasil = await Promise.resolve(onServisSelesai(selesaiItem.id, duit(biayaPart), duit(biayaJasa)));
    setMenyimpan(false);
    if (hasil === false) return;
    setSelesaiId(null);
  };

  const adaFilter = tab !== 'Semua' || filterJenis !== 'Semua' || query.trim() !== '';

  return (
    <div class="page">
      <div class="page-head split rapat">
        <div class="segmented" role="tablist" aria-label="Status servis">
          {TAB.map(st => (
            <button key={st} type="button" role="tab" aria-selected={tab === st} class={tab === st ? 'aktif' : ''} onClick={() => setTab(st)}>{st} <span class="chip-count">{jumlah[st]}</span></button>
          ))}
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" onClick={bukaForm}><IconPlus size={18} /> <span class="btn-label">Servis baru</span></button>
        </div>
      </div>

      <div class="toolbar">
        <div class="search-input-box toolbar-search">
          <span class="search-icon-pos"><IconSearch size={18} /></span>
          <input class="search-input" type="search" placeholder="Cari perangkat, IMEI, pelanggan, atau ID servis" value={query} aria-label="Cari servis" onInput={e => setQuery((e.target as HTMLInputElement).value)} />
        </div>
        <select class="form-select toolbar-select" value={filterJenis} aria-label="Jenis servis" onChange={e => setFilterJenis((e.target as HTMLSelectElement).value as typeof filterJenis)}>
          <option value="Semua">Semua jenis</option><option value="Internal">Unit stok toko</option><option value="Pelanggan">Unit pelanggan</option>
        </select>
      </div>

      {servisList.length === 0 ? (
        <div class="card"><EmptyState icon={<IconWrench size={26} />} judul="Belum ada servis" desk="Catat servis unit stok atau HP milik pelanggan di sini." aksi={<button type="button" class="btn btn-primary" onClick={bukaForm}>Servis baru</button>} /></div>
      ) : terfilter.length === 0 ? (
        <div class="card"><EmptyState icon={<IconSearch size={26} />} judul="Tidak ada servis yang cocok" desk="Ubah status, jenis, atau kata kunci pencarian." aksi={adaFilter ? <button type="button" class="btn btn-secondary" onClick={() => { setTab('Semua'); setFilterJenis('Semua'); setQuery(''); }}>Hapus filter</button> : undefined} /></div>
      ) : (
        <div class="servis-grid">
          {terfilter.map(s => {
            const aksi = aksiBerikut(s);
            return (
              <article key={s.id} class="card card-clickable servis-card" tabIndex={0} aria-label={`${s.namaPerangkat}, ${s.status}`}
                onClick={() => setDetailId(s.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailId(s.id); } }}>
                <div class="servis-card-top">
                  <div style={{ minWidth: 0 }}>
                    <span class="mono title-sub">{s.id}</span>
                    <h2 class="title-md servis-nama">{s.namaPerangkat}</h2>
                    <span class="title-sub">{s.jenis === 'Internal' ? 'Unit stok toko' : `Pelanggan: ${s.namaPelanggan}`}</span>
                  </div>
                  <span class={`badge ${kelasBadge(s.status)}`}>{s.status}</span>
                </div>
                <p class="servis-keluhan"><span class="text-secondary">Keluhan: </span><strong>{s.keluhan}</strong></p>
                <div class="card-actions">
                  <div class="meta">
                    <div>{s.teknisi}</div>
                    <div>Estimasi <strong class="text-uang">{rupiah(s.estimasiBiaya)}</strong></div>
                  </div>
                  {aksi
                    ? <button type="button" class="btn btn-secondary btn-sm" disabled={proses === s.id} onClick={e => { e.stopPropagation(); void jalankanAksi(s, aksi.kunci); }}>{proses === s.id ? <span class="spinner" /> : null}{aksi.label}</button>
                    : <span class="title-sub servis-lihat">Lihat detail <IconChevronRight size={14} /></span>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Detail servis */}
      {detail && (() => {
        const aksi = aksiBerikut(detail);
        const aktual = detail.biayaPart + detail.biayaJasa;
        const tahapIdx = ['Antri', 'Dikerjakan', 'Selesai', 'Diambil'].indexOf(detail.status);
        const langkah = (i: number) => (i < tahapIdx ? 'done' : i === tahapIdx ? (detail.status === 'Diambil' ? 'done' : 'current') : '');
        return (
          <ModalShell onClose={() => setDetailId(null)} title={detail.namaPerangkat} subtitle={`${detail.id} · ${detail.jenis === 'Internal' ? 'Unit stok toko' : `Pelanggan ${detail.namaPelanggan}`}`} size="md"
            footer={<>
              <button type="button" class="btn btn-secondary" onClick={() => setDetailId(null)}>Tutup</button>
              {aksi && <button type="button" class="btn btn-primary" disabled={proses === detail.id} onClick={() => { void jalankanAksi(detail, aksi.kunci); }}>{aksi.kunci === 'selesai' ? <IconCheck size={18} /> : null}{aksi.label}</button>}
            </>}>
            <div class="timeline-container" aria-label="Tahap servis">
              <div class={`timeline-step ${langkah(0)}`}><div class="timeline-bullet" /><div class="timeline-content"><span class="timeline-title">Masuk antrean servis</span><span class="timeline-date">{detail.tglMasuk}</span></div></div>
              <div class={`timeline-step ${langkah(1)}`}><div class="timeline-bullet" /><div class="timeline-content"><span class="timeline-title">Sedang dikerjakan</span><span class="timeline-date">{detail.teknisi}</span></div></div>
              <div class={`timeline-step ${langkah(2)}`}><div class="timeline-bullet" /><div class="timeline-content"><span class="timeline-title">Perbaikan selesai</span><span class="timeline-date">{detail.jenis === 'Internal' ? 'Unit kembali Ready di stok' : 'Menunggu diambil pelanggan'}</span></div></div>
              {detail.jenis === 'Pelanggan' && <div class={`timeline-step ${langkah(3)}`}><div class="timeline-bullet" /><div class="timeline-content"><span class="timeline-title">Diserahkan ke pelanggan</span><span class="timeline-date">{detail.status === 'Diambil' ? 'Sudah diambil' : 'Belum diambil'}</span></div></div>}
            </div>

            <div class="card" style={{ background: 'var(--bg-subtle)' }}>
              <span class="eyebrow">Keluhan kerusakan</span>
              <p style={{ marginTop: 4 }}>{detail.keluhan}</p>
              {detail.catatan && <p class="title-sub" style={{ marginTop: 4 }}>Catatan: {detail.catatan}</p>}
              <dl class="panel-dl" style={{ marginTop: 8 }}>
                {detail.imei && detail.imei !== '-' && <div><dt>IMEI</dt><dd class="mono">{detail.imei}</dd></div>}
                {detail.jenis === 'Pelanggan' && detail.noWa && detail.noWa !== '-' && <div><dt>WhatsApp</dt><dd>{detail.noWa}</dd></div>}
              </dl>
            </div>

            <div class="card">
              <span class="eyebrow">Rincian biaya</span>
              <dl class="panel-dl" style={{ marginTop: 4 }}>
                <div><dt>Estimasi awal</dt><dd>{rupiah(detail.estimasiBiaya)}</dd></div>
                {detail.jenis === 'Pelanggan' && <div><dt>Tarif ke pelanggan</dt><dd>{rupiah(detail.tarifPelanggan)}</dd></div>}
                <div><dt>Biaya sparepart</dt><dd>{rupiah(detail.biayaPart)}</dd></div>
                <div><dt>Biaya jasa / vendor</dt><dd>{rupiah(detail.biayaJasa)}</dd></div>
                <div><dt><strong>Total biaya aktual</strong></dt><dd class="big">{rupiah(aktual)}</dd></div>
              </dl>
              {detail.jenis === 'Internal' && <div class="form-hint" style={{ marginTop: 8 }}>Biaya aktual otomatis menambah modal unit di Stok saat servis diselesaikan.</div>}
            </div>
          </ModalShell>
        );
      })()}

      {/* Servis baru */}
      {formBaru && (
        <ModalShell onClose={() => setFormBaru(false)} title="Servis baru" subtitle="Catat unit stok atau HP milik pelanggan" size="md" dirty={!!(keluhan || perangkat || pelanggan)} initialFocus={`#${id}-unit, #${id}-perangkat`}
          footer={<>
            <button type="button" class="btn btn-ghost" onClick={() => setFormBaru(false)}>Batal</button>
            <button type="submit" form={`${id}-form`} class="btn btn-primary" disabled={menyimpan}>{menyimpan ? <span class="spinner" /> : null} Simpan servis</button>
          </>}>
          <form id={`${id}-form`} class="form-stack" onSubmit={simpanBaru} noValidate>
            <SegmentedField label="Jenis servis" value={jenis} onChange={v => { setJenis(v); setCoba(false); }}
              opsi={[{ v: 'Internal', l: 'Unit stok toko', d: 'Menambah modal unit' }, { v: 'Pelanggan', l: 'Unit pelanggan', d: 'Jasa servis berbayar' }]} />

            {jenis === 'Internal' ? (
              <Field id={`${id}-unit`} label="Unit dari stok" wajib error={coba ? galat.unit : ''} hint={unitServis.length === 0 ? 'Belum ada unit Ready di stok.' : `${unitServis.length} unit siap diservis`}>
                <select id={`${id}-unit`} class="form-select" value={unitId} aria-invalid={coba && galat.unit ? 'true' : undefined} onChange={e => pilihUnit((e.target as HTMLSelectElement).value)}>
                  <option value="">Pilih unit…</option>
                  {unitServis.map(u => <option key={u.id} value={u.id}>{u.nama} · IMEI ...{u.imei.slice(-4)}</option>)}
                </select>
              </Field>
            ) : (
              <>
                <Field id={`${id}-perangkat`} label="Nama perangkat" wajib error={coba ? galat.perangkat : ''}>
                  <input id={`${id}-perangkat`} class="form-input" placeholder="Contoh: Samsung Galaxy A54 5G" value={perangkat} aria-invalid={coba && galat.perangkat ? 'true' : undefined} onInput={e => setPerangkat((e.target as HTMLInputElement).value)} />
                </Field>
                <Field id={`${id}-imei`} label="IMEI (opsional)">
                  <input id={`${id}-imei`} class="form-input mono" inputMode="numeric" placeholder="15 angka" value={imei} onInput={e => setImei((e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 15))} />
                </Field>
                <div class="form-grid2 stack-sm">
                  <Field id={`${id}-pel`} label="Nama pemilik" wajib error={coba ? galat.pelanggan : ''}>
                    <input id={`${id}-pel`} class="form-input" placeholder="Nama pelanggan" value={pelanggan} aria-invalid={coba && galat.pelanggan ? 'true' : undefined} onInput={e => setPelanggan((e.target as HTMLInputElement).value)} />
                  </Field>
                  <Field id={`${id}-wa`} label="WhatsApp (opsional)" error={coba ? galat.wa : ''}>
                    <input id={`${id}-wa`} class="form-input" inputMode="tel" placeholder="0812-3456-7890" value={wa} onInput={e => setWa((e.target as HTMLInputElement).value.replace(/[^\d+\-\s]/g, ''))} />
                  </Field>
                </div>
              </>
            )}

            <Field id={`${id}-keluhan`} label="Keluhan atau kerusakan" wajib error={coba ? galat.keluhan : ''}>
              <textarea id={`${id}-keluhan`} class="form-input" rows={3} placeholder="Contoh: layar retak, sentuhan tidak responsif" value={keluhan} aria-invalid={coba && galat.keluhan ? 'true' : undefined} onInput={e => setKeluhan((e.target as HTMLTextAreaElement).value)} />
            </Field>

            <div class="form-grid2 stack-sm">
              <Field id={`${id}-est`} label="Estimasi biaya modal" hint="Perkiraan sparepart dan jasa"><MoneyInput id={`${id}-est`} value={estimasi} onChange={setEstimasi} /></Field>
              {jenis === 'Pelanggan' && <Field id={`${id}-tarif`} label="Tarif ke pelanggan" hint="Yang dibayar pelanggan"><MoneyInput id={`${id}-tarif`} value={tarif} onChange={setTarif} /></Field>}
            </div>

            <div class="form-group">
              <span class="form-label">Pelaksana</span>
              <SegmentedField label="Pelaksana" value={pelaksana} onChange={setPelaksana} opsi={[{ v: 'Teknisi sendiri', l: 'Teknisi sendiri' }, { v: 'Vendor luar', l: 'Vendor luar' }]} />
            </div>
            <Field id={`${id}-tek`} label={pelaksana === 'Vendor luar' ? 'Nama vendor (opsional)' : 'Nama teknisi (opsional)'}>
              <input id={`${id}-tek`} class="form-input" value={namaTeknisi} placeholder={pelaksana === 'Vendor luar' ? 'Contoh: Mitra Service Center' : 'Contoh: Mas Danang'} onInput={e => setNamaTeknisi((e.target as HTMLInputElement).value)} />
            </Field>
          </form>
        </ModalShell>
      )}

      {/* Selesaikan servis */}
      {selesaiItem && (
        <ModalShell onClose={() => setSelesaiId(null)} title="Selesaikan servis" subtitle={selesaiItem.namaPerangkat} size="sm" initialFocus={`#${id}-part`}
          footer={<>
            <button type="button" class="btn btn-ghost" onClick={() => setSelesaiId(null)}>Batal</button>
            <button type="submit" form={`${id}-selesai`} class="btn btn-primary" disabled={menyimpan}>{menyimpan ? <span class="spinner" /> : <IconCheck size={18} />} Konfirmasi selesai</button>
          </>}>
          <form id={`${id}-selesai`} class="form-stack" onSubmit={konfirmasiSelesai}>
            <Field id={`${id}-part`} label="Biaya sparepart aktual" hint={selesaiItem.estimasiBiaya > 0 ? `Estimasi awal ${rupiah(selesaiItem.estimasiBiaya)}` : undefined}><MoneyInput id={`${id}-part`} value={biayaPart} onChange={setBiayaPart} /></Field>
            <Field id={`${id}-jasa`} label="Biaya jasa atau vendor luar"><MoneyInput id={`${id}-jasa`} value={biayaJasa} onChange={setBiayaJasa} /></Field>
            <Banner tipe={selesaiItem.jenis === 'Internal' ? 'success' : 'info'}>
              Total biaya {selesaiItem.jenis === 'Internal' ? 'masuk modal unit' : 'servis'}: <strong>{rupiah(duit(biayaPart) + duit(biayaJasa))}</strong>
              {selesaiItem.jenis === 'Pelanggan' && selesaiItem.tarifPelanggan > 0 && <div class="title-sub" style={{ color: 'inherit' }}>Tarif pelanggan {rupiah(selesaiItem.tarifPelanggan)}, laba {rupiah(selesaiItem.tarifPelanggan - duit(biayaPart) - duit(biayaJasa))}.</div>}
            </Banner>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
