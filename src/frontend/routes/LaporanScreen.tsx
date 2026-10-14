// LaporanScreen.tsx — S31-S35 Laporan Keuangan, Arus Kas, Stok, Tagihan, dan Cetak/PDF.
// v3: jarak antar kartu konsisten (kelas lap-*), ikon info punya keterangan (hover, fokus, ketuk),
// semua nominal ikut mode privasi, opsi "Bandingkan" benar-benar berfungsi, grafik batang punya tinggi nyata,
// dan pratinjau cetak memakai dokumen yang sama persis dengan hasil cetak/PDF.

import { useEffect, useMemo, useState } from 'preact/hooks';
import { ModalShell } from '../components/ModalShell';
import { PratinjauDokumen } from '../components/PratinjauDokumen';
import { Banner } from '../components/ui/Kit';
import { InfoTip } from '../components/ui/InfoTip';
import { TokoNota, TOKO_DEMO } from '../components/NotaModal';
import { LaporanLayar, PERIODE_API, laporanContoh } from '../lib/laporan';
import { laporanDokumen } from '../lib/dokumen';
import { cetakHtml, bukaDiTabBaru } from '../lib/cetak';
import { tglWib, jamWib, rupiah, MASK } from '../lib/format';
import { toast } from '../lib/toast';
import { IconLock, IconDownload, IconPrinter } from '../components/Icons';

interface Props {
  onBukaRiwayatFilter?: (kategori: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  isPrivacyMode: boolean;
  toko?: TokoNota;
  /** Mode nyata: angka dihitung server. Tanpa ini layar menampilkan contoh (demo). */
  muat?: (periodeApi: string) => Promise<LaporanLayar | null>;
  onKunciBulan?: (bulan: string) => Promise<boolean>;
  onUnduhPdf?: (bulan: string) => Promise<boolean>;
}

type TabLaporan = 'ringkasan' | 'kas' | 'stok' | 'tagihan' | 'pdf';
const TAB: Array<{ k: TabLaporan; l: string }> = [
  { k: 'ringkasan', l: 'Ringkasan' }, { k: 'kas', l: 'Arus kas' }, { k: 'stok', l: 'Stok' }, { k: 'tagihan', l: 'Tagihan' }, { k: 'pdf', l: 'Cetak dan PDF' },
];
const PERIODE = ['Hari ini', '7 hari', 'Bulan ini', 'Bulan lalu'] as const;

/** Judul kecil kartu + ikon info */
const Judul = ({ teks, info }: { teks: string; info?: string }) => (
  <div class="lap-card-head"><h2 class="lap-card-title">{teks}</h2>{info && <InfoTip teks={info} label={teks} />}</div>
);

export function LaporanScreen({ onBukaRiwayatFilter, onShowToast, isPrivacyMode, toko = TOKO_DEMO, muat, onKunciBulan, onUnduhPdf }: Props) {
  const [activeTab, setActiveTab] = useState<TabLaporan>('ringkasan');
  const [periode, setPeriode] = useState<typeof PERIODE[number]>('Bulan ini');
  const [bandingkan, setBandingkan] = useState(true);
  const [isKunciBulanOpen, setIsKunciBulanOpen] = useState(false);
  const [bulanTerkunci, setBulanTerkunci] = useState(false);
  const [pahamKunci, setPahamKunci] = useState(false);
  const demo = !muat;
  const [data, setData] = useState<LaporanLayar | null>(() => (demo ? laporanContoh() : null));
  const [memuat, setMemuat] = useState(!demo);
  const [galat, setGalat] = useState('');
  const [versi, setVersi] = useState(0);
  const [mengunduh, setMengunduh] = useState(false);

  useEffect(() => {
    if (!muat) {
      setData(laporanContoh(PERIODE_API[periode]));
      return;
    }
    let batal = false;
    setMemuat(true);
    setGalat('');
    muat(PERIODE_API[periode]).then(d => {
      if (batal) return;
      if (d) setData(d); else setGalat('Laporan belum bisa dimuat. Periksa koneksi lalu coba lagi.');
      setMemuat(false);
    });
    return () => { batal = true; };
  }, [periode, versi, muat]);

  // Semua nominal mengikuti mode privasi (sebelumnya hanya laba bersih)
  const uang = (n: number) => (isPrivacyMode ? MASK : rupiah(n));
  const koma = (n: number) => String(n).replace('.', ',');

  const L = data;
  const terkunci = demo ? bulanTerkunci : !!L?.isLocked;
  const bisaKunci = demo ? !bulanTerkunci : !!L?.bisaDikunci;

  const dicetak = `${tglWib()}, ${jamWib()}`;
  const htmlLayar = useMemo(() => (L && activeTab === 'pdf' ? laporanDokumen(L, toko, { dicetak, samarkan: isPrivacyMode, layar: true }) : ''), [L, toko, isPrivacyMode, activeTab]);

  const handleKunciBulan = async () => {
    if (!L) return;
    if (onKunciBulan) {
      const ok = await onKunciBulan(L.bulan);
      if (!ok) return;
      setVersi(v => v + 1);
    } else {
      setBulanTerkunci(true);
    }
    setIsKunciBulanOpen(false); setPahamKunci(false);
    onShowToast(`${L.periode} dikunci. Angka dibekukan.`);
  };

  const handleUnduhPdf = async () => {
    if (!L || !onUnduhPdf || mengunduh) return;
    setMengunduh(true);
    try { await onUnduhPdf(L.bulan); } finally { setMengunduh(false); }
  };

  const handleCetak = async () => {
    if (!L) return;
    const html = laporanDokumen(L, toko, { dicetak, layar: false });
    const ok = await cetakHtml(html);
    if (ok) { onShowToast('Di dialog cetak, pilih "Simpan sebagai PDF" bila ingin berkas PDF.'); return; }
    if (bukaDiTabBaru(laporanDokumen(L, toko, { dicetak, layar: true }))) toast({ tipe: 'info', judul: 'Laporan dibuka di tab baru', desk: 'Tekan Ctrl+P di tab itu untuk mencetak.' });
    else toast({ tipe: 'error', judul: 'Cetak belum bisa dibuka', desk: 'Browser memblokirnya. Izinkan pop-up atau gunakan Unduh PDF.', durasi: 8000 });
  };

  // Mode nyata: tunggu angka dari server (tidak pernah menampilkan angka contoh sebagai angka nyata)
  if (!L) {
    return (
      <div class="page">
        {galat
          ? <Banner tipe="warning" aksi={<button type="button" class="btn btn-secondary" onClick={() => setVersi(v => v + 1)}>Coba lagi</button>}><strong>Laporan belum termuat.</strong> {galat}</Banner>
          : <Banner tipe="info">Menghitung laporan dari data transaksi…</Banner>}
      </div>
    );
  }

  const maxLaba12Bulan = Math.max(1, ...L.tren12Bulan.map(m => Math.abs(m.laba)));
  const unitPerHari = L.jumlahHari > 0 ? Math.round((L.unitTerjual / L.jumlahHari) * 10) / 10 : 0;
  const totalUmur = Math.max(1, L.unitStokAktif);
  const umur = [
    { label: '0 - 7 hari (stok baru)', unit: L.stokUmur.sampai7.unit, nilai: L.stokUmur.sampai7.nilai, merah: false, kelas: 'hijau' },
    { label: '8 - 30 hari (normal)', unit: L.stokUmur.hari8sd30.unit, nilai: L.stokUmur.hari8sd30.nilai, merah: false, kelas: '' },
    { label: 'Lebih dari 30 hari (perlu dipromosikan)', unit: L.unitLebih30Hari, nilai: L.nilaiLebih30Hari, merah: true, kelas: 'merah' },
  ];

  /** Satu baris rincian: label (bisa diklik ke Riwayat) + ikon info + nilai */
  const Baris = ({ label, info, nilai, tanda, filter }: { label: string; info: string; nilai: number; tanda: '+' | '-'; filter: string }) => (
    <div class="lap-row">
      <div class="lap-row-label">
        {onBukaRiwayatFilter
          ? <button type="button" class="lap-row-link" onClick={() => onBukaRiwayatFilter(filter)} title="Lihat transaksi terkait">{label}</button>
          : <span>{label}</span>}
        <InfoTip teks={info} label={label} rata="kiri" />
      </div>
      <strong class={`text-uang ${tanda === '+' ? 'lap-plus' : 'lap-minus'}`}>{tanda === '-' ? '-(' : '+'}{uang(nilai)}{tanda === '-' ? ')' : ''}</strong>
    </div>
  );

  return (
    <div class="page">
      {demo && (
        <Banner tipe="info">
          <strong>Angka di halaman ini contoh (mode demo).</strong> Pada aplikasi yang tersambung ke server, laporan dihitung dari transaksi.
        </Banner>
      )}
      {memuat && <Banner tipe="info">Memperbarui laporan…</Banner>}

      <div class="page-head split">
        <div class="lap-periode">
          <span class={`badge ${terkunci ? 'badge-telat' : 'badge-ready'}`}>{terkunci ? 'Terkunci' : 'Periode terbuka'}</span>
          <div class="segmented" role="group" aria-label="Periode laporan">
            {PERIODE.map(p => <button key={p} type="button" class={periode === p ? 'aktif' : ''} aria-pressed={periode === p} onClick={() => setPeriode(p)}>{p}</button>)}
          </div>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" onClick={() => setActiveTab('pdf')}><IconPrinter size={18} /><span class="btn-label">Cetak dan PDF</span></button>
          <button type="button" class={`btn ${bisaKunci ? 'btn-primary' : 'btn-secondary'}`} disabled={!bisaKunci}
            title={!demo && !L.bisaDikunci && !L.isLocked ? 'Hanya bulan yang sudah lewat yang bisa dikunci' : undefined} onClick={() => setIsKunciBulanOpen(true)}>
            <IconLock size={18} /><span class="btn-label">{terkunci ? 'Bulan dikunci' : 'Kunci bulan'}</span>
          </button>
        </div>
      </div>

      <label class="lap-bandingkan">
        <input type="checkbox" checked={bandingkan} onChange={e => setBandingkan((e.target as HTMLInputElement).checked)} />
        <span>Bandingkan dengan periode sebelumnya</span>
      </label>

      <div class="tabs-underlined" role="tablist" aria-label="Laporan">
        {TAB.map(t => (
          <button key={t.k} type="button" role="tab" id={`tab-${t.k}`} aria-selected={activeTab === t.k} aria-controls={`panel-${t.k}`}
            class={`tab-underline-item ${activeTab === t.k ? 'aktif' : ''}`} onClick={() => setActiveTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {/* RINGKASAN */}
      {activeTab === 'ringkasan' && (
        <div class="lap-stack" id="panel-ringkasan" role="tabpanel" aria-labelledby="tab-ringkasan">
          <section class="lap-hero" aria-label="Laba bersih">
            <div class="lap-hero-top">
              <span class="lap-hero-title">Laba bersih {L.periode}</span>
              <div class="lap-hero-chips">
                {bandingkan && L.pembandingAda && <span class="lap-chip">{L.persenKenaikan >= 0 ? '▲' : '▼'} {koma(Math.abs(L.persenKenaikan))}% dari {L.pembandingLabel}</span>}
                <span class="lap-chip">Margin {koma(L.marginKotor)}%</span>
              </div>
            </div>
            <div class="lap-hero-value text-uang">{uang(L.labaBersih)}</div>
            <div class="lap-hero-sub">
              <div><span>Total omzet</span><strong class="text-uang">{uang(L.omzet)}</strong></div>
              <div><span>Unit terjual</span><strong>{L.unitTerjual} unit</strong></div>
            </div>
          </section>

          <div class="kpi-grid">
            <div class="card kpi-card"><span class="kpi-label">Omzet</span><div class="text-uang kpi-value">{uang(L.omzet)}</div><span class="kpi-hint">{L.transaksiJual} transaksi berhasil</span></div>
            <div class="card kpi-card"><span class="kpi-label">Unit HP terjual</span><div class="text-uang kpi-value lap-plus">{L.unitTerjual} unit</div><span class="kpi-hint">Rata-rata {koma(unitPerHari)} unit per hari</span></div>
            <div class="card kpi-card">
              <span class="kpi-label lap-kpi-label">Rata-rata umur laku <InfoTip teks="Rata-rata berapa hari sebuah unit berada di stok sebelum terjual. Semakin kecil semakin cepat berputar." label="Rata-rata umur laku" /></span>
              <div class="text-uang kpi-value">{L.rataHariTerjual} hari</div><span class="kpi-hint">Kecepatan perputaran stok</span>
            </div>
            <div class="card kpi-card">
              <span class="kpi-label lap-kpi-label">Biaya modal bonus <InfoTip teks="Modal barang yang diberikan gratis ke pelanggan (tempered glass, casing, kabel). Mengurangi laba." label="Biaya modal bonus" /></span>
              <div class="text-uang kpi-value lap-minus">{uang(L.biayaBonus)}</div><span class="kpi-hint">Barang gratis di nota</span>
            </div>
          </div>

          <section class="card">
            <div class="lap-card-head">
              <div class="lap-card-head-grup"><h2 class="lap-card-title">Rincian komponen laba bersih</h2><InfoTip teks="Dari laba kotor tiga sumber, dikurangi biaya bonus, klaim garansi, dan biaya operasional. Ketuk nama baris untuk melihat transaksinya." label="Rincian komponen laba bersih" /></div>
              <span class="badge badge-ready">Audit sesuai</span>
            </div>
            <div class="lap-rows">
              <Baris label="Laba kotor penjualan HP" info="Harga jual dikurangi modal (HPP) setiap HP yang terjual pada periode ini." nilai={L.labaKotorHP} tanda="+" filter="Penjualan" />
              <Baris label="Laba kotor penjualan aksesoris" info="Harga jual dikurangi modal untuk aksesoris yang dijual (bukan bonus)." nilai={L.labaAksesoris} tanda="+" filter="Penjualan" />
              <Baris label="Laba servis unit pelanggan" info="Tarif servis yang dibayar pelanggan dikurangi biaya sparepart dan jasa." nilai={L.labaServis} tanda="+" filter="Servis" />
              <Baris label="Biaya modal bonus (cuma-cuma)" info="Modal barang bonus yang diberikan gratis ke pelanggan." nilai={L.biayaBonus} tanda="-" filter="Penjualan" />
              <Baris label="Biaya klaim garansi toko" info="Biaya perbaikan atau penggantian untuk klaim garansi purna jual." nilai={L.biayaGaransi} tanda="-" filter="Klaim" />
              <Baris label="Beban biaya operasional toko" info="Sewa, listrik, internet, gaji, dan biaya toko lainnya." nilai={L.biayaOperasional} tanda="-" filter="Biaya" />
              <div class="lap-row lap-total"><span>Laba bersih toko</span><strong class="text-uang lap-plus">{uang(L.labaBersih)}</strong></div>
            </div>
          </section>

          <section class="card">
            <Judul
              teks={periode === 'Hari ini' ? 'Tren laba bersih hari ini (per jam)' : periode === '7 hari' ? 'Tren laba bersih 7 hari terakhir' : 'Tren laba bersih 12 bulan terakhir'}
              info={periode === 'Hari ini' ? 'Laba bersih transaksi hari ini per rentang waktu.' : periode === '7 hari' ? 'Laba bersih harian selama 7 hari terakhir.' : 'Laba bersih tiap bulan dalam juta rupiah. Batang hijau adalah bulan berjalan.'}
            />
            <div class="lap-chart" role="img" aria-label={`Grafik batang tren laba. ${L.tren12Bulan.map(m => `${m.bulan} ${m.laba}`).join(', ')}`}>
              {L.tren12Bulan.map((m, idx) => {
                const pct = Math.round((Math.abs(m.laba) / maxLaba12Bulan) * 100);
                const sekarang = idx === L.tren12Bulan.length - 1;
                const labelNilai = isPrivacyMode
                  ? '•••'
                  : Math.abs(m.laba) < 1
                  ? `${Math.round(m.laba * 1000)}rb`
                  : `${m.laba}jt`;
                return (
                  <div key={m.bulan} class="lap-chart-col">
                    <span class="lap-chart-val">{labelNilai}</span>
                    <div class="lap-chart-area"><div class={`lap-chart-fill ${sekarang ? 'sekarang' : ''} ${m.laba < 0 ? 'neg' : ''}`} style={{ height: `${Math.max(4, pct)}%` }} /></div>
                    <span class="lap-chart-lbl">{m.bulan}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <div class="lap-grid2">
            <section class="card">
              <Judul teks="Komposisi sumber laba" info="Porsi tiap sumber terhadap total laba kotor periode ini." />
              <div class="lap-rows tight">
                {([['Penjualan handphone', L.komposisi.hp, L.labaKotorHP, ''], ['Jasa servis dan reparasi', L.komposisi.servis, L.labaServis, 'hijau'], ['Aksesoris eceran', L.komposisi.aksesoris, L.labaAksesoris, 'biru']] as const).map(([nama, persen, nilai, kelas]) => (
                  <div key={nama}>
                    <div class="lap-split"><span>{nama} ({persen}%)</span><strong>{uang(nilai)}</strong></div>
                    <div class="progress-bar-track"><div class={`progress-bar-fill lap-bar ${kelas}`} style={{ width: `${persen}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>
            <section class="card">
              <Judul teks="Model terlaris" info="Lima model HP dengan unit terjual terbanyak pada periode ini." />
              <div class="lap-list">
                {L.top10Model.slice(0, 5).map((item, i) => <div key={item.nama} class="lap-item"><span><span class="lap-rank">{i + 1}</span>{item.nama}</span><strong>{item.terjual} unit</strong></div>)}
                {L.top10Model.length === 0 && <span class="text-secondary">Belum ada penjualan HP pada periode ini.</span>}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ARUS KAS */}
      {activeTab === 'kas' && (
        <div class="lap-stack" id="panel-kas" role="tabpanel" aria-labelledby="tab-kas">
          <div class="kpi-grid lap-kpi3">
            <div class="card kpi-card"><span class="kpi-label">Total kas masuk</span><div class="text-uang kpi-value lap-plus">{uang(L.kasMasuk)}</div><span class="kpi-hint">Jual, pelunasan cicilan, servis pelanggan</span></div>
            <div class="card kpi-card"><span class="kpi-label">Total kas keluar</span><div class="text-uang kpi-value lap-minus">{uang(L.kasKeluar)}</div><span class="kpi-hint">Kulakan, bayar hutang, part, biaya toko, refund</span></div>
            <div class="card kpi-card">
              <span class="kpi-label lap-kpi-label">Arus kas bersih <InfoTip teks="Kas masuk dikurangi kas keluar. Berbeda dengan laba karena memperhitungkan pembelian stok dan pelunasan tagihan." label="Arus kas bersih" /></span>
              <div class="text-uang kpi-value">{L.arusKasBersih >= 0 ? '+' : '-'}{uang(Math.abs(L.arusKasBersih))}</div><span class="kpi-hint">{L.arusKasBersih >= 0 ? 'Kas bertambah' : 'Kas berkurang'}</span>
            </div>
          </div>
          <section class="card">
            <Judul teks="Metode penerimaan kas" info="Rincian kas masuk menurut cara pelanggan membayar." />
            <div class="lap-grid3">
              {(['Tunai', 'Transfer', 'QRIS'] as const).map(m => <div key={m} class="lap-mini"><span class="text-secondary">{m}</span><strong class="text-uang">{uang(L.perMetode[m]?.masuk ?? 0)}</strong></div>)}
            </div>
          </section>
        </div>
      )}

      {/* STOK */}
      {activeTab === 'stok' && (
        <div class="lap-stack" id="panel-stok" role="tabpanel" aria-labelledby="tab-stok">
          <section class="card">
            <Judul teks="Kelompok umur persediaan stok HP" info="Stok yang lama mengendap menahan modal. Unit di atas 30 hari sebaiknya dipromosikan." />
            <div class="lap-rows tight">
              {umur.map(g => (
                <div key={g.label}>
                  <div class="lap-split"><span class={g.merah ? 'lap-minus' : undefined}>{g.label}</span><strong class={g.merah ? 'lap-minus' : undefined}>{g.unit} unit ({uang(g.nilai)})</strong></div>
                  <div class="progress-bar-track"><div class={`progress-bar-fill lap-bar ${g.kelas}`} style={{ width: `${Math.round((g.unit / totalUmur) * 100)}%` }} /></div>
                </div>
              ))}
              <div class="lap-split lap-sep"><span>Total persediaan HP aktif</span><strong>{L.unitStokAktif} unit ({uang(L.nilaiStokAktif)})</strong></div>
              {L.servisUnitCount > 0 && <div class="lap-split"><span>Modal tertahan di servis</span><strong>{L.servisUnitCount} unit ({uang(L.servisModalTertahan)})</strong></div>}
            </div>
          </section>
        </div>
      )}

      {/* TAGIHAN */}
      {activeTab === 'tagihan' && (
        <div class="lap-stack" id="panel-tagihan" role="tabpanel" aria-labelledby="tab-tagihan">
          <section class="card">
            <Judul teks="Piutang dan hutang" info="Piutang adalah uang pelanggan yang belum dibayar. Hutang adalah kewajiban toko ke supplier." />
            <div class="lap-grid3">
              <div class="lap-mini"><span class="text-secondary">Piutang pelanggan</span><strong class="text-uang">{uang(L.piutang)}</strong></div>
              <div class="lap-mini"><span class="text-secondary">Piutang telat</span><strong class="text-uang lap-minus">{uang(L.piutangTelat)}</strong></div>
              <div class="lap-mini"><span class="text-secondary">Hutang supplier</span><strong class="text-uang">{uang(L.hutang)}</strong></div>
            </div>
          </section>
          <section class="card">
            <Judul teks="Umur piutang" info="Piutang dikelompokkan menurut lama keterlambatan dari tanggal jatuh tempo." />
            <div class="lap-list">
              {([['Belum jatuh tempo', L.agingPiutang.belumJatuhTempo], ['Telat 1 - 7 hari', L.agingPiutang.telat1sd7], ['Telat 8 - 30 hari', L.agingPiutang.telat8sd30], ['Telat lebih dari 30 hari', L.agingPiutang.telatDiatas30]] as const).map(([label, nilai]) => (
                <div key={label} class="lap-item"><span>{label}</span><strong>{uang(nilai)}</strong></div>
              ))}
            </div>
          </section>
          <section class="card">
            <Judul teks="Debitur piutang terbesar" />
            <div class="lap-list">
              {L.debiturTerbesar.map(d => (
                <div key={d.id} class="lap-item">
                  <span class={d.hariTelat > 0 ? 'lap-minus' : undefined}>{d.nama} <span class="text-secondary">({d.id}{d.hariTelat > 0 ? `, telat ${d.hariTelat} hari` : ''})</span></span>
                  <strong class={d.hariTelat > 0 ? 'lap-minus' : undefined}>Sisa {uang(d.sisa)}</strong>
                </div>
              ))}
              {L.debiturTerbesar.length === 0 && <span class="text-secondary">Tidak ada piutang berjalan.</span>}
            </div>
          </section>
        </div>
      )}

      {/* CETAK DAN PDF */}
      {activeTab === 'pdf' && (
        <div class="lap-stack" id="panel-pdf" role="tabpanel" aria-labelledby="tab-pdf">
          <section class="card lap-aksi-cetak">
            <div>
              <h2 class="lap-card-title">Laporan {L.periode}</h2>
              <p class="title-sub">Kertas A4. Pratinjau di bawah sama persis dengan hasil cetak dan PDF.</p>
            </div>
            <div class="page-actions">
              <button type="button" class="btn btn-secondary" onClick={handleCetak}><IconPrinter size={18} /> Cetak</button>
              {onUnduhPdf && (
                <button type="button" class="btn btn-primary" disabled={!L.bisaPdf || mengunduh} onClick={handleUnduhPdf} title={!L.bisaPdf ? 'PDF tersedia untuk periode bulanan' : undefined}>
                  <IconDownload size={18} /> {mengunduh ? 'Membuat PDF…' : 'Unduh PDF'}
                </button>
              )}
            </div>
          </section>
          {isPrivacyMode && <Banner tipe="info">Mode privasi aktif: pratinjau menyamarkan angka. Hasil cetak dan PDF berisi angka asli.</Banner>}
          <PratinjauDokumen html={htmlLayar} judul={`Pratinjau laporan ${L.periode}`} minTinggi={480} />
        </div>
      )}

      {isKunciBulanOpen && (
        <ModalShell onClose={() => { setIsKunciBulanOpen(false); setPahamKunci(false); }} title={`Kunci laporan ${L.periode}?`} size="sm"
          footer={<>
            <button type="button" class="btn btn-secondary" onClick={() => { setIsKunciBulanOpen(false); setPahamKunci(false); }}>Batal</button>
            <button type="button" class="btn btn-primary" disabled={!pahamKunci} onClick={handleKunciBulan}>Kunci bulan</button>
          </>}>
          <Banner tipe="warning" icon={<IconLock size={20} />}>
            <strong>Angka bulan ini akan dibekukan.</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Penjualan, laba, dan biaya {L.periode} tidak berubah lagi.</li>
              <li>Pembatalan transaksi bulan ini harus lewat koreksi di bulan berjalan.</li>
              <li>Sebelum mengunci, pastikan tagihan telat sudah ditinjau dan backup terakhir berhasil.</li>
            </ul>
          </Banner>
          <label class="toggle-row" style={{ padding: 0, justifyContent: 'flex-start', gap: 12 }}>
            <input type="checkbox" checked={pahamKunci} onChange={e => setPahamKunci((e.target as HTMLInputElement).checked)} />
            <span style={{ fontSize: 'var(--text-sm)' }}>Saya mengerti dan ingin mengunci bulan ini.</span>
          </label>
        </ModalShell>
      )}
    </div>
  );
}
