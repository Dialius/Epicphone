// JualModal.tsx — kasir penjualan, 4 langkah (Barang, Pelanggan, Bayar, Periksa).
// v3: bisa menjual BEBERAPA unit HP berbeda sekaligus (harga tiap unit bisa disesuaikan), dan form tukar tambah
// memakai detail unit yang sama dengan Barang Masuk (merek/model/varian/warna, IMEI, kondisi, foto).
// Tetap: setiap langkah divalidasi dengan alasan yang terlihat, draf tersimpan otomatis,
// piutang wajib pelanggan + WA + jatuh tempo, nota memakai nomor/tanggal/garansi nyata.

import { buatIdemKey } from '../lib/api';
import type { PenjualanInput } from '../../backend/PenjualanService';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { UnitHP, Aksesoris, KontakItem, ProdukKatalog } from '../mock/data-contoh';
import { DataNota } from './NotaModal';
import { ModalShell } from './ModalShell';
import { Field, MoneyInput, SegmentedField, useFieldId, duit } from './ui/Form';
import { FotoUnit, Banner } from './ui/Kit';
import { IdentitasUnit, KondisiUnit, FotoUnitForm, UnitForm, UNIT_KOSONG, galatUnit } from './FormUnitHP';
import { IconSearch, IconCheck, IconAlertTriangle, IconReceipt, IconClose } from './Icons';
import { rupiah, MASK, tglWib, tglJamWib, normalisasiWa } from '../lib/format';
import { tambahHari, tambahBulan } from '../lib/nota';
import { namaLengkap } from '../lib/produk';
import { getDraf, setDraf } from '../lib/draf';
import { toast } from '../lib/toast';

/** Checklist cepat kondisi HP tukar tambah (PRD 02 bagian 5.5) */
export interface KondisiTT {
  layar: 'Baik' | 'Cacat'; baterai: 'Baik' | 'Cacat'; kamera: 'Baik' | 'Cacat'; body: 'Baik' | 'Cacat'; faceJari: 'Baik' | 'Cacat';
}

const BARIS_TT: Array<{ k: keyof KondisiTT; l: string }> = [
  { k: 'layar', l: 'Layar' }, { k: 'baterai', l: 'Baterai' }, { k: 'kamera', l: 'Kamera' }, { k: 'body', l: 'Bodi' }, { k: 'faceJari', l: 'Face/Fingerprint' },
];

/** Isi permintaan ke server = tipe masukan server, supaya nama kolom tidak bisa meleset diam-diam */
export type PayloadJual = PenjualanInput;

/** HP lama yang diterima lewat tukar tambah (dipakai mode demo untuk memasukkannya ke stok, dan unggah foto setelah tersimpan) */
export interface HasilTukarTambah {
  nama: string; form: UnitForm; nilai: number; hargaJualTarget: number; kondisi: KondisiTT; catatan: string;
}

export interface HasilJual {
  nota: DataNota;
  /** semua unit HP yang dijual dalam satu nota */
  unitIds: string[];
  aksesorisQty: Record<string, number>;
  /** total modal (HPP) semua unit HP yang dijual */
  modalUnit: number;
  modalAksesoris: number;
  biayaBonus: number;
  tukarTambah?: HasilTukarTambah;
  payload: PayloadJual;
  /** Kunci anti-ganda; tetap sama bila pengguna mengulang setelah gagal */
  idemKey: string;
}

interface Props {
  isOpen?: boolean;
  onClose: () => void;
  unitAwal?: UnitHP | null;
  units?: UnitHP[];
  aksesoris?: Aksesoris[];
  kontak?: KontakItem[];
  katalog?: ProdukKatalog[];
  nomorNota: string;
  garansiHari?: number;
  garansiBaruBulan?: number;
  lanjutDraf?: boolean;
  isPrivacyMode?: boolean;
  /** Kembalikan false bila gagal agar wizard tetap terbuka dan draf tidak hilang */
  onSimpanSukses: (hasil: HasilJual) => void | boolean | Promise<boolean | void>;
}

const BONUS = [
  { k: 'tg', nama: 'Tempered glass layar kaca presisi', modal: 15000 },
  { k: 'case', nama: 'Casing silikon bening anti-shock', modal: 12000 },
  { k: 'kabel', nama: 'Kabel data fast charging', modal: 15000 },
] as const;
const LANGKAH = ['Barang', 'Pelanggan', 'Bayar', 'Periksa'];
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const isoKeTgl = (iso: string) => { const [y, m, d] = iso.split('-'); return iso ? `${d} ${BULAN[+m - 1]} ${y}` : ''; };
const isoPlus = (hari: number) => new Date(Date.now() + hari * 86400000).toISOString().slice(0, 10);

const TT_AWAL: UnitForm = { ...UNIT_KOSONG, kelengkapan: 'Unit saja', bebasKunci: 'Belum dicek' };

export function JualModal({ onClose, unitAwal, units = [], aksesoris = [], kontak = [], katalog = [], nomorNota, garansiHari = 7, garansiBaruBulan = 12, lanjutDraf, isPrivacyMode: priv, onSimpanSukses }: Props) {
  const id = useFieldId('jl');
  const draf = useRef(lanjutDraf && !unitAwal ? getDraf() : null).current;
  // isi draf lama bisa berbeda bentuk antar versi, jadi dibaca longgar lalu diberi nilai bawaan satu per satu
  const d0 = (draf?.data || {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  const [step, setStep] = useState<number>(draf?.step || 1);
  const [unitIds, setUnitIds] = useState<string[]>(unitAwal ? [unitAwal.id] : Array.isArray(d0.unitIds) ? d0.unitIds : d0.unitId ? [d0.unitId] : []);
  const [hargaUnit, setHargaUnit] = useState<Record<string, string>>(d0.hargaUnit || {});
  const [cariUnit, setCariUnit] = useState('');
  const [qtyAks, setQtyAks] = useState<Record<string, number>>(d0.qtyAks || {});
  const [bonus, setBonus] = useState<Record<string, boolean>>(d0.bonus || { tg: true, case: true, kabel: false });
  const [pelanggan, setPelanggan] = useState<string>(d0.pelanggan ?? '');
  const [noWa, setNoWa] = useState<string>(d0.noWa ?? '');
  const [adaTt, setAdaTt] = useState<boolean>(d0.adaTt ?? false);
  const [tt, setTt] = useState<UnitForm>({ ...TT_AWAL, ...(d0.tt || {}), foto: {} });
  const ubahTt = (patch: Partial<UnitForm>) => setTt(x => ({ ...x, ...patch }));
  const [ttNilai, setTtNilai] = useState<string>(d0.ttNilai ?? '');
  const [ttJual, setTtJual] = useState<string>(d0.ttJual ?? '');
  // Bonus yang diambil dari stok aksesoris: stok berkurang dan modalnya memakai harga beli rata-rata
  const [bonusStok, setBonusStok] = useState<Record<string, boolean>>(d0.bonusStok ?? {});
  const [ttKondisi, setTtKondisi] = useState<KondisiTT>(d0.ttKondisi ?? { layar: 'Baik', baterai: 'Baik', kamera: 'Baik', body: 'Baik', faceJari: 'Baik' });
  const [ttCatatan, setTtCatatan] = useState<string>(d0.ttCatatan ?? '');
  const [catatanJual, setCatatanJual] = useState<string>(d0.catatanJual ?? '');
  const [diskon, setDiskon] = useState<string>(d0.diskon ?? '');
  const [metode, setMetode] = useState<'Tunai' | 'Transfer' | 'QRIS' | 'Cicilan'>(d0.metode ?? 'Tunai');
  const [dibayar, setDibayar] = useState<string>(d0.dibayar ?? '');
  const [tempo, setTempo] = useState<string>(d0.tempo ?? isoPlus(14));
  const [coba, setCoba] = useState(false);
  const selesai = useRef(false);
  const idemRef = useRef(buatIdemKey());
  const [menyimpan, setMenyimpan] = useState(false);
  const [rugiOke, setRugiOke] = useState(false);

  const dipilih = useMemo(() => unitIds.map(i => units.find(u => u.id === i)).filter((u): u is UnitHP => !!u), [unitIds, units]);
  const hargaDari = (u: UnitHP) => (hargaUnit[u.id] !== undefined ? duit(hargaUnit[u.id]) : u.hargaJualTarget);
  const siap = useMemo(() => units.filter(u => u.status === 'Ready' || unitIds.includes(u.id) || u.id === unitAwal?.id), [units, unitIds, unitAwal]);
  const hasilCari = useMemo(() => {
    const q = cariUnit.trim().toLowerCase();
    return siap.filter(u => !q || u.nama.toLowerCase().includes(q) || u.imei.includes(q) || u.id.toLowerCase().includes(q));
  }, [siap, cariUnit]);
  const aksJual = aksesoris.filter(a => a.stok > 0 || (qtyAks[a.sku] || 0) > 0);

  const togelUnit = (u: UnitHP) => {
    setUnitIds(l => (l.includes(u.id) ? l.filter(x => x !== u.id) : [...l, u.id]));
    setHargaUnit(h => { if (!(u.id in h)) return h; const c = { ...h }; delete c[u.id]; return c; });
  };

  // ---- hitungan ----
  const subtotalHp = dipilih.reduce((s, u) => s + hargaDari(u), 0);
  const modalHp = dipilih.reduce((s, u) => s + u.hpp, 0);
  const totalAks = aksesoris.reduce((s, a) => s + a.hargaJual * (qtyAks[a.sku] || 0), 0);
  const modalAks = aksesoris.reduce((s, a) => s + a.hargaBeliRata2 * (qtyAks[a.sku] || 0), 0);
  const bonusDariStok = aksesoris.filter(a => bonusStok[a.sku]);
  const biayaBonus = BONUS.reduce((s, b) => s + (bonus[b.k] ? b.modal : 0), 0) + bonusDariStok.reduce((s, a) => s + a.hargaBeliRata2, 0);
  const subtotal = subtotalHp + totalAks;
  const nDiskon = duit(diskon), nTt = adaTt ? duit(ttNilai) : 0;
  const total = Math.max(0, subtotal - nDiskon - nTt);
  const nBayar = dibayar === '' ? total : duit(dibayar);
  const sisa = Math.max(0, total - nBayar);
  const kembalian = Math.max(0, nBayar - total);
  // Laba kotor sama dengan hitungan server: nilai tukar tambah bukan pengurang laba (HP lama masuk stok sebesar nilainya)
  const laba = subtotal - nDiskon - (modalHp + modalAks + biayaBonus);
  const jmlAks = Object.values(qtyAks).reduce((s, n) => s + n, 0);
  const namaUmum = !pelanggan.trim() || /^pelanggan umum$/i.test(pelanggan.trim());
  const waOk = normalisasiWa(noWa).length >= 10;
  const ttNama = namaLengkap(tt);
  const guTt = galatUnit(tt, units, dipilih.map(u => u.imei));

  // ---- galat per langkah ----
  const hargaKosong = dipilih.find(u => hargaDari(u) <= 0);
  const g1 = dipilih.length === 0 ? 'Pilih minimal satu unit HP yang dijual.' : hargaKosong ? `Isi harga jual ${hargaKosong.nama}.` : '';
  const g2 = adaTt ? (guTt.kurang.length ? `Lengkapi HP tukar tambah: ${guTt.kurang.join(', ')}.` : duit(ttNilai) <= 0 ? 'Isi nilai tukar HP lama.' : '') : '';
  const g3: string[] = [];
  if (nDiskon > subtotal) g3.push('Diskon melebihi subtotal.');
  if (nBayar > total * 3 && total > 0) g3.push('Nominal diterima terlihat terlalu besar. Periksa lagi.');
  if (sisa > 0 && namaUmum) g3.push('Piutang wajib atas nama pelanggan (isi di langkah Pelanggan).');
  if (sisa > 0 && !waOk) g3.push('Piutang wajib punya nomor WhatsApp agar bisa ditagih.');
  if (sisa > 0 && !tempo) g3.push('Isi tanggal jatuh tempo.');
  const galatLangkah = [g1, g2 || '', g3[0] || ''];
  const alasan = step <= 3 ? galatLangkah[step - 1] : '';
  const bisaKe = (n: number) => n <= step || (n === step + 1 && !alasan);

  // ---- draf otomatis (foto tidak ikut: terlalu besar untuk penyimpanan lokal) ----
  useEffect(() => {
    if (selesai.current) return;
    const ada = !!(unitIds.length || pelanggan || Object.keys(qtyAks).length);
    if (!ada) { setDraf(null); return; }
    const namaRingkas = dipilih.length ? (dipilih.length === 1 ? dipilih[0].nama : `${dipilih.length} unit HP`) : 'Belum pilih unit';
    const ttTanpaFoto: Partial<UnitForm> = { ...tt }; delete ttTanpaFoto.foto; // foto terlalu besar untuk penyimpanan lokal
    setDraf({
      unitId: unitIds[0] ?? null, unitNama: dipilih[0]?.nama || '', step, simpan: Date.now(),
      ringkas: `${namaRingkas}${jmlAks ? ` + ${jmlAks} aksesoris` : ''}, langkah ${step} dari 4`,
      data: { unitIds, hargaUnit, qtyAks, bonus, bonusStok, pelanggan, noWa, adaTt, tt: ttTanpaFoto, ttNilai, ttJual, ttKondisi, ttCatatan, catatanJual, diskon, metode, dibayar, tempo },
    });
  }, [unitIds, hargaUnit, qtyAks, bonus, bonusStok, pelanggan, noWa, adaTt, tt.merek, tt.model, tt.varian, tt.warna, tt.imei, tt.imei2, tt.kondisi, tt.grade, tt.kelengkapan, tt.baterai, tt.bebasKunci, ttNilai, ttJual, ttKondisi, ttCatatan, catatanJual, diskon, metode, dibayar, tempo, step]);

  const tutup = () => {
    if (!selesai.current && (unitIds.length || pelanggan || jmlAks)) toast({ tipe: 'info', judul: 'Draf penjualan disimpan', desk: 'Lanjutkan dari Beranda atau tombol Transaksi baru.', aksi: { label: 'Buang', onClick: () => setDraf(null) } });
    onClose();
  };

  const pilihPelanggan = (v: string) => {
    setPelanggan(v);
    const k = kontak.find(x => x.nama.toLowerCase() === v.trim().toLowerCase() && x.noWa && x.noWa !== '-');
    if (k && !noWa) setNoWa(k.noWa);
  };

  const ubahAks = (a: Aksesoris, delta: number) => setQtyAks(q => {
    const n = Math.max(0, Math.min(a.stok, (q[a.sku] || 0) + delta));
    const c = { ...q }; if (n === 0) delete c[a.sku]; else c[a.sku] = n; return c;
  });

  /** Garansi per unit: baru = bulan, bekas = hari (angka dari Pengaturan) */
  const garansiUnit = (u: UnitHP) => u.kondisi === 'Baru'
    ? `${tambahBulan(tglWib(), garansiBaruBulan)} (${garansiBaruBulan} bulan)`
    : `${tambahHari(tglWib(), garansiHari)} (${garansiHari} hari)`;
  const ringkasGaransi = (() => {
    const set = new Set(dipilih.map(garansiUnit));
    return set.size === 1 ? [...set][0] : 'Sesuai jenis unit, lihat rincian per barang';
  })();

  const lanjut = () => {
    if (menyimpan) return;
    setCoba(true);
    if (alasan) return;
    if (step === 4 && laba < 0 && !rugiOke) return; // PRD 07 T06: rugi boleh diteruskan, tetapi harus dikonfirmasi
    setCoba(false);
    if (step < 4) { setStep(step + 1); return; }
    terbitkan();
  };

  const terbitkan = async () => {
    if (!dipilih.length || menyimpan) return;
    const items = [
      ...dipilih.map(u => ({ nama: u.nama, imei: u.imei, kondisi: `${u.kondisi}${u.grade ? ` (Grade ${u.grade})` : ''}`, qty: 1, harga: hargaDari(u), subtotal: hargaDari(u), garansi: garansiUnit(u) })),
      ...aksesoris.filter(a => qtyAks[a.sku]).map(a => ({ nama: a.nama, kondisi: 'Baru', qty: qtyAks[a.sku], harga: a.hargaJual, subtotal: a.hargaJual * qtyAks[a.sku] })),
    ];
    const nota: DataNota = {
      noNota: nomorNota, tanggalWib: tglJamWib(), namaPelanggan: namaUmum ? 'Pelanggan Umum' : pelanggan.trim(), noWa: noWa.trim() || undefined,
      items, bonus: [...BONUS.filter(b => bonus[b.k]).map(b => ({ nama: b.nama, qty: 1 })), ...bonusDariStok.map(a => ({ nama: a.nama, qty: 1 }))], subtotal, diskon: nDiskon,
      tukarTambah: { ada: adaTt, unit: adaTt ? ttNama : undefined, imei: adaTt ? tt.imei : undefined, nilai: nTt }, totalTagihan: total,
      dibayar: Math.min(nBayar, total), sisa, metodeBayar: metode, jatuhTempo: sisa > 0 ? isoKeTgl(tempo) : undefined,
      garansiSampai: ringkasGaransi,
    };
    const payload: PayloadJual = {
      namaPelanggan: nota.namaPelanggan, noWa: noWa.trim(),
      items: [
        ...dipilih.map(u => ({ tipe: 'HP' as const, idUnit: u.id, harga: hargaDari(u) })),
        ...aksesoris.filter(a => qtyAks[a.sku]).map(a => ({ tipe: 'Aksesoris' as const, sku: a.sku, qty: qtyAks[a.sku], harga: a.hargaJual })),
      ],
      bonus: [...BONUS.filter(b => bonus[b.k]).map(b => ({ nama: b.nama, qty: 1, hpp: b.modal })), ...bonusDariStok.map(a => ({ nama: a.nama, qty: 1, sku: a.sku }))],
      diskon: nDiskon,
      tukarTambah: adaTt ? {
        ada: true, model: ttNama, imei: tt.imei, imei2: tt.imei2 || undefined, nilai: nTt,
        kondisiUnit: tt.kondisi, grade: tt.kondisi === 'Bekas' ? tt.grade : undefined, kelengkapan: tt.kelengkapan,
        bateraiPersen: tt.kondisi === 'Bekas' && tt.baterai !== '' ? +tt.baterai : undefined, bebasKunciAkun: tt.bebasKunci,
        hargaJualTarget: duit(ttJual) || undefined, kondisi: ttKondisi, catatan: ttCatatan.trim() || undefined,
      } : { ada: false },
      catatan: catatanJual.trim() || undefined,
      metodeBayar: metode, dibayar: Math.min(nBayar, total), jatuhTempo: sisa > 0 ? tempo : undefined,
    };
    setMenyimpan(true);
    let hasil: boolean | void;
    try {
      hasil = await Promise.resolve(onSimpanSukses({
        nota, unitIds: dipilih.map(u => u.id),
        aksesorisQty: bonusDariStok.reduce((m, a) => ({ ...m, [a.sku]: (m[a.sku] || 0) + 1 }), { ...qtyAks } as Record<string, number>),
        modalUnit: modalHp, modalAksesoris: modalAks, biayaBonus,
        tukarTambah: adaTt ? { nama: ttNama, form: tt, nilai: nTt, hargaJualTarget: duit(ttJual) || Math.round(nTt * 1.15), kondisi: ttKondisi, catatan: ttCatatan.trim() } : undefined,
        payload, idemKey: idemRef.current,
      }));
    } finally {
      setMenyimpan(false);
    }
    if (hasil === false) return; // gagal: wizard tetap terbuka, draf tetap tersimpan
    selesai.current = true;
    setDraf(null);
  };

  const uang = (n: number) => (priv ? MASK : rupiah(n));
  const ringkasUnit = dipilih.length === 0 ? '' : dipilih.length === 1 ? ` · ${dipilih[0].nama}` : ` · ${dipilih.length} unit HP`;
  const ringkasFooter = `Total ${rupiah(total)}${ringkasUnit}${jmlAks ? ` + ${jmlAks} aksesoris` : ''}`;

  const stepper = (
    <ol class="wizard-steps-bar" aria-label="Langkah penjualan">
      {LANGKAH.map((l, i) => {
        const n = i + 1;
        return (
          <li key={l}>
            <button type="button" class={`wizard-step-node ${step === n ? 'aktif' : ''} ${n < step ? 'selesai' : ''}`} style={{ width: '100%' }} disabled={!bisaKe(n)} aria-current={step === n ? 'step' : undefined}
              onClick={() => bisaKe(n) && setStep(n)}>
              {n < step ? <IconCheck size={14} /> : <span>{n}</span>} {l}
            </button>
          </li>
        );
      })}
    </ol>
  );

  return (
    <ModalShell onClose={tutup} title="Penjualan baru" subtitle={`Langkah ${step} dari 4: ${LANGKAH[step - 1]}`} size="lg" wizardBar={stepper} initialFocus={step === 1 ? `#${id}-cari` : undefined}
      footer={<>
        <span class="footer-note always" aria-live="polite">{coba && alasan ? <span style={{ color: 'var(--bad-fg)', fontWeight: 600 }}>{alasan}</span> : ringkasFooter}</span>
        {step > 1 && <button type="button" class="btn btn-ghost" onClick={() => setStep(step - 1)}>Kembali</button>}
        <button type="button" class="btn btn-primary" onClick={lanjut} disabled={menyimpan} aria-disabled={!!alasan || menyimpan} style={alasan || menyimpan ? { opacity: .55 } : undefined}>
          {step < 4 ? 'Lanjut' : menyimpan ? 'Menyimpan…' : <><IconReceipt size={16} /> Terbitkan nota</>}
        </button>
      </>}>

      {step === 1 && (
        <>
          <Field id={`${id}-cari`} label="Pilih unit HP yang dijual" error={coba ? g1 : ''} hint={`${siap.length} unit siap jual. Ketuk beberapa unit bila pelanggan membeli lebih dari satu.`}>
            <div class="search-input-box"><span class="search-icon-pos"><IconSearch size={18} /></span>
              <input id={`${id}-cari`} class="search-input" type="search" placeholder="Cari nama, IMEI, atau ID unit" value={cariUnit} onInput={e => setCariUnit((e.target as HTMLInputElement).value)} autoComplete="off" /></div>
          </Field>
          <div class="pilih-unit" role="listbox" aria-multiselectable="true" aria-label="Unit siap jual">
            {hasilCari.length === 0 && <div class="title-sub" style={{ padding: 16, textAlign: 'center' }}>{siap.length === 0 ? 'Belum ada unit berstatus Ready.' : 'Tidak ada unit yang cocok.'}</div>}
            {hasilCari.map(u => {
              const aktif = unitIds.includes(u.id);
              return (
                <button key={u.id} type="button" role="option" aria-selected={aktif} class={`pilih-unit-row ${aktif ? 'aktif' : ''}`} onClick={() => togelUnit(u)}>
                  <span class="cek" aria-hidden="true">{aktif && <IconCheck size={14} />}</span>
                  <FotoUnit src={u.foto[0]} alt={u.nama} size={44} />
                  <span style={{ flex: 1, minWidth: 0 }}><span class="unit-name" style={{ display: 'block' }}>{u.nama}</span><span class="unit-meta" style={{ display: 'block' }}>{u.id} · IMEI ...{u.imei.slice(-4)} · {u.kondisi}{u.grade ? ` ${u.grade}` : ''}</span></span>
                  <strong style={{ fontSize: 'var(--text-sm)' }}>{rupiah(u.hargaJualTarget)}</strong>
                </button>
              );
            })}
          </div>

          {dipilih.length > 0 && (
            <section class="form-section" aria-label="Unit yang dijual">
              <h3 class="form-section-title">Unit yang dijual ({dipilih.length}) <span class="badge badge-info" style={{ marginLeft: 8 }}>Subtotal {rupiah(subtotalHp)}</span></h3>
              <div class="cart-list">
                {dipilih.map(u => (
                  <div key={u.id} class="cart-row">
                    <span style={{ minWidth: 0 }}><span class="unit-name" style={{ display: 'block' }}>{u.nama}</span><span class="unit-meta" style={{ display: 'block' }}>IMEI {u.imei} · modal {uang(u.hpp)}</span></span>
                    <MoneyInput id={`${id}-h-${u.id}`} ariaLabel={`Harga jual ${u.nama}`} value={hargaUnit[u.id] !== undefined ? hargaUnit[u.id] : String(u.hargaJualTarget)}
                      onChange={v => setHargaUnit(h => ({ ...h, [u.id]: v }))} invalid={coba && hargaDari(u) <= 0} />
                    <button type="button" class="icon-btn" onClick={() => togelUnit(u)} aria-label={`Keluarkan ${u.nama} dari penjualan`}><IconClose size={18} /></button>
                  </div>
                ))}
              </div>
              <div class="form-hint">Harga di atas boleh disesuaikan per unit (misalnya hasil tawar-menawar).</div>
            </section>
          )}

          <section class="form-section">
            <h3 class="form-section-title">Aksesoris tambahan (dijual)</h3>
            {aksJual.length === 0 ? <div class="title-sub">Belum ada aksesoris.</div> : aksJual.map(a => (
              <div key={a.sku} class="aks-row">
                <span style={{ flex: 1, minWidth: 0 }}><span class="unit-name" style={{ display: 'block' }}>{a.nama}</span><span class="unit-meta">{rupiah(a.hargaJual)} · stok {a.stok}</span></span>
                <div class="stepper" role="group" aria-label={`Jumlah ${a.nama}`}>
                  <button type="button" onClick={() => ubahAks(a, -1)} disabled={!qtyAks[a.sku]} aria-label="Kurangi">−</button>
                  <output aria-live="polite">{qtyAks[a.sku] || 0}</output>
                  <button type="button" onClick={() => ubahAks(a, 1)} disabled={(qtyAks[a.sku] || 0) >= a.stok} aria-label="Tambah">+</button>
                </div>
              </div>
            ))}
          </section>

          <section class="form-section">
            <h3 class="form-section-title">Bonus gratis di nota <span class="badge badge-ready" style={{ marginLeft: 8 }}>Harga Rp 0</span></h3>
            {BONUS.map(b => (
              <label key={b.k} class="toggle-row" style={{ padding: '6px 0' }}>
                <span style={{ fontSize: 'var(--text-sm)' }}>{b.nama}</span>
                <input type="checkbox" checked={!!bonus[b.k]} onChange={e => setBonus(o => ({ ...o, [b.k]: (e.target as HTMLInputElement).checked }))} />
              </label>
            ))}
            {aksesoris.filter(a => a.stok > 0).length > 0 && (
              <>
                <span class="form-label" style={{ marginTop: '8px' }}>Bonus dari stok aksesoris (stok berkurang)</span>
                {aksesoris.filter(a => a.stok > 0).slice(0, 12).map(a => (
                  <label key={a.sku} class="toggle-row" style={{ padding: '6px 0' }}>
                    <span style={{ fontSize: 'var(--text-sm)' }}>{a.nama} <span class="text-secondary">(sisa {a.stok - (qtyAks[a.sku] || 0)})</span></span>
                    <input type="checkbox" checked={!!bonusStok[a.sku]} disabled={a.stok - (qtyAks[a.sku] || 0) < 1 && !bonusStok[a.sku]}
                      onChange={e => setBonusStok(o => ({ ...o, [a.sku]: (e.target as HTMLInputElement).checked }))} />
                  </label>
                ))}
              </>
            )}
          </section>
        </>
      )}

      {step === 2 && (
        <>
          <Field id={`${id}-nama`} label="Nama pelanggan" hint="Kosongkan untuk Pelanggan Umum (tidak bisa untuk piutang)">
            <input id={`${id}-nama`} class="form-input" list={`${id}-kontak`} value={pelanggan} placeholder="Pelanggan Umum" onInput={e => pilihPelanggan((e.target as HTMLInputElement).value)} autoComplete="off" />
            <datalist id={`${id}-kontak`}>{kontak.filter(k => k.tipe === 'Pelanggan' && !/umum/i.test(k.nama)).map(k => <option key={k.id} value={k.nama} />)}</datalist>
          </Field>
          <Field id={`${id}-wa`} label="WhatsApp" hint="Untuk kirim nota dan menagih">
            <input id={`${id}-wa`} class="form-input" inputMode="tel" autoComplete="tel" placeholder="0812-3456-7890" value={noWa} onInput={e => setNoWa((e.target as HTMLInputElement).value.replace(/[^\d+\-\s]/g, ''))} />
          </Field>
          <section class="form-section">
            <label class="toggle-row" style={{ padding: 0 }}>
              <span><strong style={{ fontSize: 'var(--text-sm)' }}>Tukar tambah</strong><br /><span class="title-sub">Pelanggan menyerahkan HP lama sebagai pengurang harga</span></span>
              <input type="checkbox" role="switch" checked={adaTt} onChange={e => setAdaTt((e.target as HTMLInputElement).checked)} />
            </label>
            {adaTt && <Banner tipe="info">Isi detail HP lama selengkap saat mencatat barang masuk. HP ini otomatis masuk stok berstatus Ready setelah nota terbit.</Banner>}
          </section>

          {adaTt && (
            <>
              <IdentitasUnit id={`${id}-tt`} f={tt} set={ubahTt} coba={coba} galat={guTt} katalog={katalog} judul="HP lama: identitas" />
              <KondisiUnit id={`${id}-tt`} f={tt} set={ubahTt} coba={coba} galat={guTt} judul="HP lama: kondisi" />
              <section class="form-section" aria-labelledby={`${id}-tth`}>
                <h3 class="form-section-title" id={`${id}-tth`}>HP lama: harga</h3>
                <div class="form-grid2 stack-sm">
                  <Field id={`${id}-ttn`} label="Nilai tukar" wajib error={coba && !guTt.kurang.length && duit(ttNilai) <= 0 ? 'Isi nilai tukar HP lama.' : ''} hint="Mengurangi total yang dibayar pelanggan"><MoneyInput id={`${id}-ttn`} value={ttNilai} onChange={setTtNilai} invalid={coba && !guTt.kurang.length && duit(ttNilai) <= 0} /></Field>
                  <Field id={`${id}-ttj`} label="Harga jual target (opsional)" hint={duit(ttNilai) > 0 ? `Kosong = ${rupiah(Math.round(duit(ttNilai) * 1.15))} (margin 15%)` : 'Harga saat HP ini dijual lagi'}><MoneyInput id={`${id}-ttj`} value={ttJual} onChange={setTtJual} placeholder={duit(ttNilai) > 0 ? Math.round(duit(ttNilai) * 1.15).toLocaleString('id-ID') : '0'} /></Field>
                </div>
                <div class="form-group">
                  <span class="form-label">Cek fungsi HP lama</span>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {BARIS_TT.map(b => (
                      <div key={b.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: 'var(--text-sm)' }}>{b.l}</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {(['Baik', 'Cacat'] as const).map(v => (
                            <button type="button" key={v} class={`btn btn-sm ${ttKondisi[b.k] === v ? (v === 'Baik' ? 'btn-primary' : 'btn-secondary') : 'btn-ghost'}`} aria-pressed={ttKondisi[b.k] === v}
                              onClick={() => setTtKondisi(k => ({ ...k, [b.k]: v }))}>{v}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Field id={`${id}-ttc`} label="Catatan HP lama (opsional)"><input id={`${id}-ttc`} class="form-input" value={ttCatatan} placeholder="Contoh: baterai 78%, ada lecet" onInput={e => setTtCatatan((e.target as HTMLInputElement).value)} /></Field>
              </section>
              <FotoUnitForm id={`${id}-tt`} f={tt} set={ubahTt} judul="HP lama: foto" />
            </>
          )}
        </>
      )}

      {step === 3 && (
        <>
          <div class="card" style={{ background: 'var(--bg-subtle)' }}>
            <dl class="panel-dl">
              <div><dt>Subtotal ({dipilih.length + jmlAks} item)</dt><dd>{rupiah(subtotal)}</dd></div>
              {nDiskon > 0 && <div><dt>Diskon</dt><dd>−{rupiah(nDiskon)}</dd></div>}
              {nTt > 0 && <div><dt>Tukar tambah</dt><dd>−{rupiah(nTt)}</dd></div>}
              <div><dt><strong>Total tagihan</strong></dt><dd class="big">{rupiah(total)}</dd></div>
            </dl>
          </div>
          <Field id={`${id}-disk`} label="Diskon (opsional)" error={coba && nDiskon > subtotal ? g3[0] : ''}><MoneyInput id={`${id}-disk`} value={diskon} onChange={setDiskon} /></Field>
          <div class="form-group"><span class="form-label">Metode bayar</span>
            <div class="seg-field seg-4"><SegmentedField label="Metode bayar" value={metode} onChange={setMetode} opsi={[{ v: 'Tunai', l: 'Tunai' }, { v: 'Transfer', l: 'Transfer' }, { v: 'QRIS', l: 'QRIS' }, { v: 'Cicilan', l: 'Cicilan' }]} /></div></div>
          <Field id={`${id}-bayar`} label="Nominal diterima" hint={dibayar === '' ? 'Kosong berarti lunas pas' : undefined}>
            <MoneyInput id={`${id}-bayar`} value={dibayar} onChange={setDibayar} placeholder={total.toLocaleString('id-ID')} />
          </Field>
          <div class="filter-chip-row" aria-label="Nominal cepat">
            <button type="button" class="filter-chip" onClick={() => setDibayar(String(total))}>Uang pas</button>
            <button type="button" class="filter-chip" onClick={() => setDibayar(String(Math.ceil(total / 50000) * 50000))}>Bulatkan 50 rb</button>
            <button type="button" class="filter-chip" onClick={() => setDibayar(String(Math.ceil(total / 100000) * 100000))}>Bulatkan 100 rb</button>
            <button type="button" class="filter-chip" onClick={() => setDibayar('0')}>Belum bayar (tempo)</button>
          </div>
          {kembalian > 0 && <Banner tipe="success" icon={<IconCheck size={20} />}><strong>Kembalian {rupiah(kembalian)}</strong></Banner>}
          <Field id={`${id}-catjual`} label="Catatan penjualan (opsional)" hint="Permintaan pelanggan, kesepakatan, dll">
            <input id={`${id}-catjual`} class="form-input" value={catatanJual} maxLength={200} onInput={e => setCatatanJual((e.target as HTMLInputElement).value)} />
          </Field>
          {sisa > 0 && (
            <>
              <Banner tipe="warning" icon={<IconAlertTriangle size={20} />}><strong>Sisa {rupiah(sisa)} akan menjadi piutang.</strong> Pelanggan dan WhatsApp wajib terisi.</Banner>
              <Field id={`${id}-tempo`} label="Jatuh tempo" wajib><input id={`${id}-tempo`} type="date" class="form-input" min={isoPlus(0)} value={tempo} onInput={e => setTempo((e.target as HTMLInputElement).value)} /></Field>
              {coba && g3.filter((_, i) => i > 0 || nDiskon <= subtotal).slice(0, 3).map(m => <div key={m} class="error-text" role="alert">{m}</div>)}
            </>
          )}
        </>
      )}

      {step === 4 && dipilih.length > 0 && (
        <>
          <div class="card" style={{ background: 'var(--bg-subtle)' }}>
            <div class="eyebrow">Ringkasan nota {nomorNota}</div>
            <dl class="panel-dl" style={{ marginTop: 8 }}>
              <div><dt>Pelanggan</dt><dd>{namaUmum ? 'Pelanggan Umum' : pelanggan.trim()}{noWa ? ` · ${noWa}` : ''}</dd></div>
              {dipilih.map(u => <div key={u.id}><dt>{u.nama}<br /><span class="title-sub">IMEI {u.imei} · garansi s/d {garansiUnit(u)}</span></dt><dd>{rupiah(hargaDari(u))}</dd></div>)}
              {aksesoris.filter(a => qtyAks[a.sku]).map(a => <div key={a.sku}><dt>{a.nama} x{qtyAks[a.sku]}</dt><dd>{rupiah(a.hargaJual * qtyAks[a.sku])}</dd></div>)}
              {BONUS.filter(b => bonus[b.k]).map(b => <div key={b.k}><dt>Bonus: {b.nama}</dt><dd>Gratis</dd></div>)}
              {bonusDariStok.map(a => <div key={a.sku}><dt>Bonus: {a.nama}</dt><dd>Gratis (dari stok)</dd></div>)}
              {nDiskon > 0 && <div><dt>Diskon</dt><dd>−{rupiah(nDiskon)}</dd></div>}
              {nTt > 0 && <div><dt>Tukar tambah {ttNama}<br /><span class="title-sub">IMEI {tt.imei} · {tt.kondisi}{tt.kondisi === 'Bekas' ? ` grade ${tt.grade}` : ''}</span></dt><dd>−{rupiah(nTt)}</dd></div>}
              <div><dt><strong>Total</strong></dt><dd class="big">{rupiah(total)}</dd></div>
              <div><dt>Dibayar ({metode})</dt><dd>{rupiah(Math.min(nBayar, total))}</dd></div>
              {sisa > 0 && <div><dt>Sisa, jatuh tempo {isoKeTgl(tempo)}</dt><dd class="text-danger">{rupiah(sisa)}</dd></div>}
            </dl>
          </div>
          {laba < 0
            ? (
              <Banner tipe="warning" icon={<IconAlertTriangle size={20} />}>
                <strong>Harga jual di bawah modal: rugi {uang(Math.abs(laba))}.</strong> Periksa harga atau diskon. Bila memang disengaja, centang konfirmasi untuk melanjutkan.
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                  <input type="checkbox" checked={rugiOke} onChange={e => setRugiOke((e.target as HTMLInputElement).checked)} />
                  <span>Saya paham dan tetap menerbitkan nota ini</span>
                </label>
                {coba && !rugiOke && <div role="alert" style={{ color: 'var(--status-danger-solid)', marginTop: '4px' }}>Centang konfirmasi dulu.</div>}
              </Banner>
            )
            : <div class="title-sub">Estimasi laba kotor: <strong>{uang(laba)}</strong></div>}
        </>
      )}
    </ModalShell>
  );
}


