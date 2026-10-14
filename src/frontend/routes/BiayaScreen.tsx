// BiayaScreen.tsx — S36 Biaya Operasional (daftar dan form).
// v3: modal memakai ModalShell (bisa di-scroll, Esc/Back), nominal berformat Rp, tanggal dipilih dari kalender
// (bukan diketik), ringkasan memakai bulan berjalan yang sebenarnya, dan daftar kartu punya jarak rapi.

import { useMemo, useState } from 'preact/hooks';
import { tglWib, parseTgl, rupiah } from '../lib/format';
import { BiayaOperasional, MOCK_BIAYA } from '../mock/data-contoh';
import { ModalShell } from '../components/ModalShell';
import { Field, MoneyInput, useFieldId, duit } from '../components/ui/Form';
import { EmptyState } from '../components/ui/Kit';
import { IconPlus, IconReceipt } from '../components/Icons';

interface Props {
  biayaList?: BiayaOperasional[];
  /** Kembalikan false bila gagal agar form tetap terbuka */
  onTambahBiaya?: (biaya: BiayaOperasional) => void | boolean | Promise<boolean | void>;
}

const KATEGORI: Array<BiayaOperasional['kategori']> = ['Sewa', 'Listrik', 'Internet', 'Gaji', 'Transport', 'Iklan', 'Lainnya'];
const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** "13 Okt 2026" -> "2026-10-13" (untuk isian tanggal) */
const keIso = (tgl: string) => { const d = parseTgl(tgl); return d ? d.toISOString().slice(0, 10) : ''; };
/** "2026-10-13" -> "13 Okt 2026" */
const dariIso = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d} ${BULAN_PENDEK[+m - 1]} ${y}`; };
/** kunci bulan dari teks tanggal: "2026-10" */
const kunciBulan = (tgl: string) => keIso(tgl).slice(0, 7);

export function BiayaScreen({ biayaList = MOCK_BIAYA, onTambahBiaya }: Props) {
  const id = useFieldId('by');
  const daftar = biayaList; // dikendalikan app
  const [filterKategori, setFilterKategori] = useState<string>('Semua');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [kategori, setKategori] = useState<BiayaOperasional['kategori']>('Listrik');
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [tanggalIso, setTanggalIso] = useState(keIso(tglWib()));
  const [coba, setCoba] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);

  const hariIniIso = keIso(tglWib());
  const bulanIni = hariIniIso.slice(0, 7);
  const labelBulan = hariIniIso ? `${NAMA_BULAN[+hariIniIso.slice(5, 7) - 1]} ${hariIniIso.slice(0, 4)}` : '';

  const terfilter = useMemo(() => daftar.filter(b => filterKategori === 'Semua' || b.kategori === filterKategori), [daftar, filterKategori]);
  const totalBulanIni = useMemo(() => terfilter.filter(b => kunciBulan(b.tanggal) === bulanIni).reduce((s, b) => s + b.nominal, 0), [terfilter, bulanIni]);

  const galat = {
    nominal: duit(nominal) <= 0 ? 'Isi nominal pengeluaran.' : '',
    tanggal: !tanggalIso ? 'Pilih tanggal.' : tanggalIso > hariIniIso ? 'Tanggal tidak boleh di masa depan.' : '',
  };
  const valid = !galat.nominal && !galat.tanggal;

  const bukaForm = () => { setKategori('Listrik'); setNominal(''); setKeterangan(''); setTanggalIso(hariIniIso); setCoba(false); setIsFormOpen(true); };

  const handleSubmit = async (e?: Event) => {
    e?.preventDefault();
    setCoba(true);
    if (!valid || menyimpan) return;
    const tanggal = dariIso(tanggalIso);
    const baru: BiayaOperasional = {
      id: `BIA-${tanggalIso.slice(2, 4)}${tanggalIso.slice(5, 7)}-${String(daftar.length + 1).padStart(4, '0')}`,
      tanggal, kategori, nominal: duit(nominal), keterangan: keterangan.trim() || kategori,
    };
    setMenyimpan(true);
    const hasil = onTambahBiaya ? await Promise.resolve(onTambahBiaya(baru)) : undefined;
    setMenyimpan(false);
    if (hasil === false) return;
    setIsFormOpen(false);
  };

  return (
    <div class="page">
      <div class="page-head split">
        <div class="page-head-text"><div class="page-sub">{terfilter.length} catatan · sewa, listrik, gaji, dan biaya toko lain</div></div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" onClick={bukaForm}><IconPlus size={18} /> <span class="btn-label">Catat biaya</span></button>
        </div>
      </div>

      <section class="lap-hero" aria-label={`Total biaya ${labelBulan}`}>
        <span class="lap-hero-title">Total biaya {labelBulan}{filterKategori !== 'Semua' ? ` · ${filterKategori}` : ''}</span>
        <div class="lap-hero-value text-uang">{rupiah(totalBulanIni)}</div>
        <span class="lap-hero-note">Biaya ini langsung mengurangi laba bersih toko di laporan bulanan.</span>
      </section>

      <div class="filter-chip-row" role="group" aria-label="Filter kategori">
        {['Semua', ...KATEGORI].map(k => (
          <button key={k} type="button" class={`filter-chip ${filterKategori === k ? 'aktif' : ''}`} aria-pressed={filterKategori === k} onClick={() => setFilterKategori(k)}>{k === 'Semua' ? 'Semua kategori' : k}</button>
        ))}
      </div>

      {terfilter.length === 0 ? (
        <div class="card"><EmptyState icon={<IconReceipt size={26} />} judul="Belum ada biaya tercatat" desk={filterKategori === 'Semua' ? 'Catat pengeluaran toko agar laba bersih di laporan akurat.' : `Tidak ada biaya kategori ${filterKategori}.`}
          aksi={<button type="button" class="btn btn-primary" onClick={bukaForm}>Catat biaya</button>} /></div>
      ) : (
        <div class="card-list">
          {terfilter.map(b => (
            <div key={b.id} class="card biaya-item">
              <div style={{ minWidth: 0 }}>
                <div class="biaya-judul"><span class="badge badge-neutral">{b.kategori}</span><strong>{b.keterangan}</strong></div>
                <span class="title-sub">{b.id} · {b.tanggal}</span>
              </div>
              <div class="text-uang biaya-nominal">-{rupiah(b.nominal)}</div>
            </div>
          ))}
        </div>
      )}

      {isFormOpen && (
        <ModalShell onClose={() => setIsFormOpen(false)} title="Catat biaya operasional" size="sm" dirty={!!(nominal || keterangan)} initialFocus={`#${id}-nominal`}
          footer={<>
            <button type="button" class="btn btn-ghost" onClick={() => setIsFormOpen(false)}>Batal</button>
            <button type="submit" form={`${id}-form`} class="btn btn-primary" disabled={menyimpan}>{menyimpan ? <span class="spinner" /> : null} Simpan biaya</button>
          </>}>
          <form id={`${id}-form`} class="form-stack" onSubmit={handleSubmit} noValidate>
            <div class="form-group">
              <span class="form-label" id={`${id}-kat`}>Kategori biaya</span>
              <div class="filter-chip-row wrap" role="radiogroup" aria-labelledby={`${id}-kat`}>
                {KATEGORI.map(k => <button type="button" key={k} role="radio" aria-checked={kategori === k} class={`filter-chip ${kategori === k ? 'aktif' : ''}`} onClick={() => setKategori(k)}>{k}</button>)}
              </div>
            </div>
            <Field id={`${id}-nominal`} label="Nominal pengeluaran" wajib error={coba ? galat.nominal : ''}>
              <MoneyInput id={`${id}-nominal`} value={nominal} onChange={setNominal} invalid={coba && !!galat.nominal} placeholder="150.000" />
            </Field>
            <Field id={`${id}-tgl`} label="Tanggal" wajib error={coba ? galat.tanggal : ''}>
              <input id={`${id}-tgl`} type="date" class="form-input" max={hariIniIso} value={tanggalIso} aria-invalid={coba && galat.tanggal ? 'true' : undefined} onInput={e => setTanggalIso((e.target as HTMLInputElement).value)} />
            </Field>
            <Field id={`${id}-ket`} label="Keterangan (opsional)" hint="Contoh: Token listrik toko 900VA">
              <input id={`${id}-ket`} class="form-input" value={keterangan} maxLength={120} onInput={e => setKeterangan((e.target as HTMLInputElement).value)} />
            </Field>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
