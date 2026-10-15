// app.tsx — Epic Phone: shell, routing hash, state tunggal, pintasan, dan semua aksi data.
// Desain v2: sidebar/rail/bilah bawah, toast di atas modal, Esc/Back menutup overlay teratas,
// tema/privasi/kepadatan tersimpan, dan setiap aksi mengubah data yang sama dengan yang tampil di layar.

import { useState, useEffect, useRef, useMemo, useCallback } from 'preact/hooks';
import { LOGO_DATA_URI, ambilUrlLogo } from './lib/logo';
import { IconHome, IconBox, IconPlus, IconClock, IconWrench, IconShield, IconSearch, IconBell, IconEye, IconEyeOff, IconMenu, IconSettings, IconInvoice, IconBanknote, IconChart, IconUsers, IconTag, IconSidebar, IconSun, IconMoon, IconClose, IconRefresh } from './components/Icons';

import { BerandaScreen } from './routes/BerandaScreen';
import { StokScreen } from './routes/StokScreen';
import { TagihanScreen } from './routes/TagihanScreen';
import { LaporanScreen } from './routes/LaporanScreen';
import type { LaporanLayar } from './lib/laporan';
import { RiwayatScreen } from './routes/RiwayatScreen';
import { ServisScreen } from './routes/ServisScreen';
import { GaransiScreen } from './routes/GaransiScreen';
import { BiayaScreen } from './routes/BiayaScreen';
import { KontakScreen } from './routes/KontakScreen';
import { KatalogScreen } from './routes/KatalogScreen';
import { PengaturanScreen, normalisasiPaketBonus } from './routes/PengaturanScreen';

import { BarangMasukModal, DataBarangMasuk } from './components/BarangMasukModal';
import { POSISI_FOTO } from './components/FormUnitHP';
import { JualModal, HasilJual } from './components/JualModal';
import { TransaksiModal } from './components/TransaksiModal';
import { NotaModal, DataNota, PdfNota, TokoNota } from './components/NotaModal';
import type { ServerPengaturan, LogItemServer, HasilKonsistensiUI, StatusSistemUI, InfoBackupUI } from './routes/PengaturanScreen';
import { AksesorisMasukModal, DataAksesorisMasuk } from './components/AksesorisMasukModal';
import type { HasilCariGaransi, KlaimEkstra } from './routes/GaransiScreen';
import { PusatPeringatanModal } from './components/PusatPeringatanModal';
import { PencarianGlobalModal } from './components/PencarianGlobalModal';
import { MenuLengkapModal } from './components/MenuLengkapModal';
import { DetailUnitModal } from './components/DetailUnitModal';
import { FotoUnitModal } from './components/FotoUnitModal';
import { DetailTagihanModal } from './components/DetailTagihanModal';
import { BatalkanTransaksiModal } from './components/BatalkanTransaksiModal';
import { Toaster } from './components/Toaster';
import { Galeri } from './components/Galeri';

import type { UnitHP, Aksesoris, Tagihan, TransaksiItem, ServisItem, KlaimItem, BiayaOperasional, KontakItem, ProdukKatalog } from './mock/data-contoh';
import { apiCall, buatIdemKey, sesuai, DataServer, HasilServerJual, FotoServer } from './lib/api';
import type { PembelianInput } from '../backend/PembelianService';
import type { ServisInput } from '../backend/ServisService';
import type { KlaimInput } from '../backend/GaransiService';
import type { BiayaInput } from '../backend/BiayaService';
import type { KontakInput, ProdukInput } from '../backend/MasterService';

import { toast, getToastLog } from './lib/toast';
import { closeTopOverlay, overlayCount } from './lib/overlay';
import { usePersist } from './lib/usePersist';
import { tglWib, jamWib, nomorDokumen, urutanBerikut, rupiah, parseTgl } from './lib/format';
import { platformDariMerek } from './lib/produk';
import { hitungDashboard, buatPeringatan } from './lib/derive';
import { notaDariTransaksi, GARANSI_HARI_DEFAULT } from './lib/nota';
import { getDraf, setDraf, subscribeDraf, DrafJual } from './lib/draf';

export type NavTab =
  | 'beranda' | 'stok' | 'riwayat' | 'servis' | 'garansi' | 'tagihan'
  | 'laporan' | 'biaya' | 'kontak' | 'katalog' | 'pengaturan' | 'galeri';

const TABS: NavTab[] = ['beranda', 'stok', 'riwayat', 'servis', 'garansi', 'tagihan', 'laporan', 'biaya', 'kontak', 'katalog', 'pengaturan', 'galeri'];
const JUDUL: Record<NavTab, string> = {
  beranda: 'Beranda', stok: 'Stok', riwayat: 'Riwayat', servis: 'Servis', garansi: 'Garansi dan Retur', tagihan: 'Tagihan',
  laporan: 'Laporan', biaya: 'Biaya Operasional', kontak: 'Kontak', katalog: 'Katalog Produk', pengaturan: 'Pengaturan', galeri: 'Galeri komponen',
};
const TAB_DI_MENU: NavTab[] = ['servis', 'garansi', 'tagihan', 'biaya', 'laporan', 'kontak', 'katalog', 'pengaturan'];


function bacaHash(): { tab: NavTab; sub?: string } {
  const m = location.hash.match(/^#\/(_?[a-z]+)(?:\/([\w-]+))?/);
  const t = (m?.[1] === '_galeri' ? 'galeri' : m?.[1]) as NavTab | undefined;
  return { tab: t && TABS.includes(t) ? t : 'beranda', sub: m?.[2] };
}

export function App() {
  const awal = useRef(bacaHash()).current;
  const [tab, setTab] = useState<NavTab>(awal.tab);
  const [pengaturanSub, setPengaturanSub] = useState<string | undefined>(awal.sub);

  // ---- preferensi (tersimpan) ----
  const [tema, setTema] = usePersist<'sistem' | 'terang' | 'gelap'>('tema', 'sistem');
  const [sistemGelap, setSistemGelap] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  const [density, setDensity] = usePersist<'nyaman' | 'padat'>('density', 'nyaman');
  const [isPrivacyMode, setIsPrivacyMode] = usePersist('privasi', false);
  const [ciut, setCiut] = usePersist('sidebar-ciut', false);
  const [demoDitutup, setDemoDitutup] = usePersist('demo-ditutup', false);
  const isDark = tema === 'gelap' || (tema === 'sistem' && sistemGelap);
  const isDemo = false;

  // Bersihkan data contoh lokal lama bila ada, pastikan selalu bersumber dari DB
  useMemo(() => {
    ['stok', 'aksesoris', 'transaksi', 'tagihan', 'servis', 'klaim', 'biaya', 'kontak', 'katalog', 'stok_dev'].forEach(k => {
      localStorage.removeItem('epicphone:data-' + k);
      localStorage.removeItem('epicphone_' + k);
    });
  }, []);

  const [stokList, setStokList] = useState<UnitHP[]>([]);
  const [aksesorisList, setAksesorisList] = useState<Aksesoris[]>([]);
  const [transaksiList, setTransaksiList] = useState<TransaksiItem[]>([]);
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [servisList, setServisList] = useState<ServisItem[]>([]);
  const [klaimList, setKlaimList] = useState<KlaimItem[]>([]);
  const [biayaList, setBiayaList] = useState<BiayaOperasional[]>([]);
  const [kontakList, setKontakList] = useState<KontakItem[]>([]);
  const [katalogList, setKatalogList] = useState<ProdukKatalog[]>([]);

  // ---- overlay ----
  const [isTransaksiOpen, setIsTransaksiOpen] = useState(false);
  const [isBarangMasukOpen, setIsBarangMasukOpen] = useState(false);
  const [isAksMasukOpen, setIsAksMasukOpen] = useState(false);
  const [isJualOpen, setIsJualOpen] = useState(false);
  const [unitDijual, setUnitDijual] = useState<UnitHP | null>(null);
  const [isNotaOpen, setIsNotaOpen] = useState(false);
  const [notaAktif, setNotaAktif] = useState<DataNota | null>(null);
  const [notaPdf, setNotaPdf] = useState<PdfNota | null>(null);
  const notaPdfUntuk = useRef('');
  const [isPencarianOpen, setIsPencarianOpen] = useState(false);
  const [isPeringatanOpen, setIsPeringatanOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [inspectedUnit, setInspectedUnit] = useState<UnitHP | null>(null);
  const [fotoUnitTarget, setFotoUnitTarget] = useState<UnitHP | null>(null);
  const [inspectedTagihan, setInspectedTagihan] = useState<Tagihan | null>(null);
  const [batalTransaksiTarget, setBatalTransaksiTarget] = useState<TransaksiItem | null>(null);

  // ---- target awal untuk halaman tujuan ----
  const [servisUnitTarget, setServisUnitTarget] = useState<UnitHP | null>(null);
  const [garansiImeiTarget, setGaransiImeiTarget] = useState<string | undefined>();
  const [filterStok, setFilterStok] = useState<string | undefined>();
  const [filterTagihan, setFilterTagihan] = useState<string | undefined>();
  const [filterRiwayat, setFilterRiwayat] = useState<string | undefined>();

  const [draf, setDrafState] = useState<DrafJual | null>(getDraf);
  useEffect(() => subscribeDraf(() => setDrafState(getDraf())), []);

  const mainRef = useRef<HTMLElement>(null);

  // ---- tema ke dokumen ----
  useEffect(() => { document.documentElement.classList.toggle('theme-dark', isDark); }, [isDark]);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const h = (e: MediaQueryListEvent) => setSistemGelap(e.matches);
    mq.addEventListener?.('change', h);
    return () => mq.removeEventListener?.('change', h);
  }, []);

  // ---- routing hash ----
  const go = useCallback((t: NavTab, sub?: string) => {
    const target = '#/' + t + (sub ? '/' + sub : '');
    if (location.hash !== target) location.hash = target;
    else { setTab(t); setPengaturanSub(sub); }
  }, []);
  useEffect(() => {
    const h = () => { const r = bacaHash(); setTab(r.tab); setPengaturanSub(r.sub); };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
    document.title = `${JUDUL[tab]} · Epic Phone Purwokerto`;
  }, [tab]);

  // ---- muat semua data dari server (mode nyata) ----
  const [statusData, setStatusData] = useState<'memuat' | 'siap' | 'galat'>(isDemo ? 'siap' : 'memuat');
  const [pesanGalatData, setPesanGalatData] = useState('');
  const terakhirMuat = useRef(0);
  const [statusBackup, setStatusBackup] = useState<{ ok: boolean; terakhir: string; pesan: string } | null>(null);
  const [pengaturanServer, setPengaturanServer] = useState<Record<string, string> | undefined>(undefined);
  const muatSemua = useCallback(async (): Promise<DataServer | null> => {
    if (isDemo) return null;
    const res = await apiCall<DataServer>('getSemuaData');
    if (!res.ok || !res.data) {
      const pesan = res.pesan || 'Gagal memuat data dari server.';
      setPesanGalatData(pesan);
      if (terakhirMuat.current === 0) setStatusData('galat');
      else toast({ tipe: 'warning', judul: 'Data belum diperbarui', desk: pesan });
      return null;
    }
    const d = res.data;
    setStokList(d.stok); setAksesorisList(d.aksesoris); setTransaksiList(d.transaksi);
    setTagihanList(d.tagihan); setKontakList(d.kontak); setKatalogList(d.katalog);
    setServisList(d.servis); setKlaimList(d.klaim); setBiayaList(d.biaya);
    setStatusBackup(d.statusBackup);
    setPengaturanServer(d.pengaturan);
    terakhirMuat.current = Date.now();
    setStatusData('siap');
    return d;
  }, [isDemo]);
  useEffect(() => { muatSemua(); }, []);
  // Auto-refresh: perangkat lain (HP/laptop) bisa mengubah data. Segarkan saat aktif kembali atau polling periodik 45s.
  useEffect(() => {
    if (isDemo) return;
    const h = () => { if (document.visibilityState === 'visible' && Date.now() - terakhirMuat.current > 30_000) muatSemua(); };
    document.addEventListener('visibilitychange', h);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - terakhirMuat.current > 45_000) {
        void muatSemua();
      }
    }, 45_000);
    return () => {
      document.removeEventListener('visibilitychange', h);
      clearInterval(interval);
    };
  }, [isDemo, muatSemua]);

  // Ikon tab browser otomatis mengikuti logo Google Drive dari pengaturan
  useEffect(() => {
    if (pengaturanServer?.ID_BERKAS_LOGO) {
      const fav = ambilUrlLogo(pengaturanServer.ID_BERKAS_LOGO);
      const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
      if (link) link.href = fav;
    }
  }, [pengaturanServer?.ID_BERKAS_LOGO]);

  // ---- pintasan keyboard ----
  const refToggle = useRef({ privasi: () => {} });
  refToggle.current.privasi = () => {
    setIsPrivacyMode(!isPrivacyMode);
    toast({ tipe: 'info', judul: !isPrivacyMode ? 'Angka disembunyikan' : 'Angka ditampilkan', durasi: 2500 });
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (closeTopOverlay()) e.preventDefault(); return; }
      // Pintasan global Ctrl+B / Cmd+B untuk toggle minimize sidebar
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setCiut(c => !c);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const el = e.target as HTMLElement;
      const mengetik = el?.matches?.('input,textarea,select,[contenteditable="true"]');
      if (mengetik || overlayCount() > 0) return;
      const k = e.key.toLowerCase();
      if (k === 'n') { e.preventDefault(); setIsTransaksiOpen(true); }
      else if (k === '/') { e.preventDefault(); setIsPencarianOpen(true); }
      else if (k === 'p') { e.preventDefault(); refToggle.current.privasi(); }
      else if (k === '[') { e.preventDefault(); setCiut(c => !c); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // ---- turunan ----
  // Ambang dan garansi dari Pengaturan (mode nyata); tanpa itu dipakai nilai bawaan
  const angkaP = (k: string) => { const n = Number(pengaturanServer?.[k]); return Number.isFinite(n) && n > 0 ? n : undefined; };
  const ambang = { umurStokHari: angkaP('BATAS_UMUR_STOK_HARI'), tempoHari: angkaP('AMBANG_TEMPO_HARI') };
  const garansiHariPakai = angkaP('GARANSI_BEKAS_HARI') ?? GARANSI_HARI_DEFAULT;
  const garansiBaruPakai = angkaP('GARANSI_BARU_BULAN') ?? 12;
  const dash = useMemo(() => hitungDashboard({ transaksi: transaksiList, stok: stokList, tagihan: tagihanList, servis: servisList, demo: isDemo, ambang }), [transaksiList, stokList, tagihanList, servisList, isDemo, ambang.umurStokHari, ambang.tempoHari]);
  const peringatan = useMemo(() => buatPeringatan({ transaksi: transaksiList, stok: stokList, aksesoris: aksesorisList, tagihan: tagihanList, servis: servisList, demo: isDemo, ambang }), [transaksiList, stokList, aksesorisList, tagihanList, servisList, isDemo, ambang.umurStokHari, ambang.tempoHari]);
  const overdueCount = tagihanList.filter(t => t.jenis === 'Piutang pelanggan' && t.status !== 'Lunas' && (t.status === 'Telat' || t.hariTelat > 0)).length;
  const perhatianCount = peringatan.filter(p => p.tingkat !== 'info').length;

  // ---- helper navigasi ----
  const tutupSemuaOverlay = () => { for (let i = 0; i < 6 && closeTopOverlay(); i++); };
  const setelahOverlay = (fn: () => void) => { if (overlayCount() > 0) { tutupSemuaOverlay(); setTimeout(fn, 80); } else fn(); };

  const [lanjutDraf, setLanjutDraf] = useState(false);
  const bukaJual = (u: UnitHP | null = null, lanjut = false) => { setUnitDijual(u); setLanjutDraf(lanjut); setIsJualOpen(true); };

  const handlePilihAksiTransaksi = (aksi: string) => {
    setIsTransaksiOpen(false);
    setTimeout(() => {
      if (aksi === 'barang-masuk') setIsBarangMasukOpen(true);
      else if (aksi === 'jual') bukaJual(null);
      else if (aksi === 'bayar') { setFilterTagihan(undefined); go('tagihan'); toast({ tipe: 'info', judul: 'Pilih tagihan yang dibayar', desk: 'Ketuk satu tagihan, lalu catat pembayarannya.' }); }
      else if (aksi === 'servis') go('servis');
    }, 60);
  };

  const bukaItemPeringatan = (p: { linkTab: string; filterValue?: string; refId?: string }) => {
    setelahOverlay(() => {
      if (p.linkTab === 'tagihan') {
        const t = tagihanList.find(x => x.id === p.refId);
        setFilterTagihan(p.filterValue); go('tagihan');
        if (t) setInspectedTagihan(t);
      } else if (p.linkTab === 'stok') { setFilterStok(p.filterValue); go('stok'); }
      else go(p.linkTab as NavTab, p.filterValue);
    });
  };

  /** PDF nota dari server. `buat` = buat versi baru; selain itu membuka yang sudah ada tanpa membuat versi baru. */
  const siapkanPdfNota = async (id: string, buat: boolean) => {
    if (isDemo) return;
    notaPdfUntuk.current = id;
    setNotaPdf({ status: 'membuat' });
    const res = await apiCall<{ urlLihat: string; urlUnduh: string; base64: string; nama: string }>(buat ? 'buatNota' : 'ambilNota', id);
    if (notaPdfUntuk.current !== id) return; // nota lain sudah dibuka
    if (!res.ok || !res.data) { setNotaPdf({ status: 'gagal', pesan: res.pesan }); return; }
    setNotaPdf({ status: 'siap', ...res.data });
  };

  const bukaNotaTransaksi = (t: TransaksiItem) => {
    setNotaAktif(notaDariTransaksi(t, garansiHariPakai));
    setNotaPdf(null);
    setIsNotaOpen(true);
    if (t.tipe === 'Jual' && t.status !== 'Dibatalkan') void siapkanPdfNota(t.id, false);
  };

  // ---- aksi data ----
  /** Unggah foto unit satu per satu setelah unit tersimpan; kegagalan foto tidak membatalkan unit. */
  const unggahFotoUnit = async (idUnit: string, fotoPosisi: Record<string, string>) => {
    const daftar = Object.entries(fotoPosisi).filter(([, uri]) => uri);
    if (!daftar.length) return;
    let gagal = 0;
    for (const [posisi, dataUri] of daftar) {
      const res = await apiCall('unggahFoto', {
        jenisReferensi: 'Unit', idReferensi: idUnit, posisi, base64Data: dataUri.split(',')[1] || '', mimeType: 'image/jpeg',
      }, buatIdemKey());
      if (!res.ok) gagal++;
    }
    if (gagal) toast({ tipe: 'warning', judul: `${gagal} foto belum terunggah`, desk: `${idUnit} sudah tersimpan. Unggah ulang fotonya dari detail unit.`, durasi: 8000 });
    else toast({ tipe: 'info', judul: `${daftar.length} foto ${idUnit} terunggah ke Drive` });
  };

  const sedangProses = useRef(false);

  /** Aksesoris masuk: menambah stok (harga beli rata-rata dihitung server). Mode demo hanya mengubah daftar lokal. */
  const handleSimpanAksesorisMasuk = async (data: DataAksesorisMasuk): Promise<{ ok: boolean; pesan?: string }> => {
    if (isDemo) {
      setAksesorisList(l => {
        const ada = l.find(a => a.nama.toLowerCase() === String(data.nama).toLowerCase());
        const stokBaru = (ada?.stok || 0) + data.qty;
        const ubah: Aksesoris = {
          sku: ada?.sku || `ACC-DEMO-${String(l.length + 1).padStart(4, '0')}`, nama: data.nama, kategori: data.kategori, stok: stokBaru,
          stokMin: ada?.stokMin ?? 3, hargaBeliRata2: data.hargaBeli, hargaJual: data.hargaJual || ada?.hargaJual || 0,
          status: stokBaru <= 0 ? 'Habis' : stokBaru <= (ada?.stokMin ?? 3) ? 'Menipis' : 'Aman',
        };
        return ada ? l.map(a => (a.sku === ada.sku ? ubah : a)) : [ubah, ...l];
      });
      toast({ judul: `${data.nama} +${data.qty}`, desk: 'Stok aksesoris diperbarui (mode demo).' });
      return { ok: true };
    }
    if (sedangProses.current) return { ok: false, pesan: 'Sedang memproses penyimpanan...' };
    sedangProses.current = true;
    try {
      const res = await apiCall<any>('simpanPembelian', sesuai<PembelianInput>({
        tanggal: data.tanggalMasuk,
        namaSupplier: data.supplier || 'Supplier', metodeBayar: data.metodeBayar || 'Tunai', dibayar: data.dibayar, jatuhTempo: data.jatuhTempo, catatan: data.catatan,
        items: [{ tipe: 'Aksesoris', namaBarang: data.nama, sku: data.sku, kategori: data.kategori, qty: data.qty, hargaBeli: data.hargaBeli, hargaJualTarget: data.hargaJual }],
      }), buatIdemKey());
      if (!res.ok) {
        toast({ tipe: 'error', judul: 'Aksesoris belum tersimpan', desk: res.pesan || 'Periksa koneksi lalu coba lagi.', durasi: 8000 });
        return { ok: false, pesan: res.pesan };
      }
      toast({ judul: `${data.nama} +${data.qty}`, desk: `Stok bertambah. Total ${rupiah(data.qty * data.hargaBeli)}.` });
      void muatSemua();
      return { ok: true };
    } finally {
      sedangProses.current = false;
    }
  };

  /** Catat model ke Katalog Produk bila belum ada. Gagal/ganda tidak menghalangi pencatatan unit. */
  const catatKatalogBarangMasuk = async (data: DataBarangMasuk) => {
    if (!data.simpanKatalog) return;
    if (isDemo) {
      setKatalogList(l => [{
        id: `PRD-${String(l.reduce((m, k) => Math.max(m, parseInt(k.id.replace(/\D/g, ''), 10) || 0), 0) + 1).padStart(4, '0')}`,
        jenis: 'HP', platform: platformDariMerek(data.merek), merek: data.merek, model: data.model, varian: data.varian, warna: data.warna,
        hargaStandar: data.hargaJualTarget, aktif: true,
      }, ...l]);
      return;
    }
    await apiCall('simpanProduk', sesuai<ProdukInput>({
      jenis: 'HP', platform: platformDariMerek(data.merek), merek: data.merek, model: data.model, varian: data.varian, warna: data.warna, hargaStandar: data.hargaJualTarget,
    }), buatIdemKey());
  };

  const handleSimpanBarangMasuk = async (data: DataBarangMasuk): Promise<{ ok: boolean; pesan?: string }> => {
    if (sedangProses.current) return { ok: false, pesan: 'Sedang memproses penyimpanan...' };
    sedangProses.current = true;
    try {
      await catatKatalogBarangMasuk(data);
      const res = await apiCall<any>('simpanPembelian', sesuai<PembelianInput>({
        tanggal: data.tanggalMasuk,
        namaSupplier: data.supplier || 'Supplier',
        metodeBayar: data.metodeBayar || 'Tunai',
        dibayar: data.dibayar ?? data.hargaBeli,
        jatuhTempo: data.jatuhTempo,
        items: [{
          tipe: 'HP', namaBarang: data.nama, imei1: data.imei, imei2: data.imei2, kondisi: data.kondisi, grade: data.grade,
          kelengkapan: data.kelengkapan, bateraiPersen: data.baterai, bebasKunciAkun: data.bebasKunci,
          hargaBeli: data.hargaBeli, biayaLain: data.biayaLain, hargaJualTarget: data.hargaJualTarget, perluServis: data.perluServis,
          keluhanServis: data.keluhanServis, estimasiServis: data.estimasiServis, catatan: data.catatan,
          pelaksanaServis: data.perluServis ? 'Teknisi sendiri' : undefined,
        }],
      }), buatIdemKey());
      if (!res.ok) {
        toast({ tipe: 'error', judul: 'Unit belum tersimpan', desk: res.pesan || 'Periksa koneksi lalu coba lagi.' });
        return { ok: false, pesan: res.pesan };
      }
      if (!isDemo) {
        const idUnit: string | undefined = res.data?.unitsCreated?.[0];
        toast({ judul: `${data.nama} dicatat`, desk: `${idUnit || ''} · IMEI ...${String(data.imei).slice(-4)} · modal ${rupiah((data.hargaBeli || 0) + (data.biayaLain || 0))}` });
        if (idUnit && data.fotoPosisi && Object.keys(data.fotoPosisi).length > 0) {
          const fotoPreview = Object.values(data.fotoPosisi).filter(Boolean);
          setStokList(l => l.map(u => u.id === idUnit ? { ...u, foto: fotoPreview } : u));
          void unggahFotoUnit(idUnit, data.fotoPosisi).then(() => muatSemua());
        } else {
          void muatSemua();
        }
        return { ok: true };
      }
      const urutUnit = urutanBerikut(stokList.map(u => u.id), 'UNT');
      const id = res.data?.unitsCreated?.[0] || nomorDokumen('UNT', urutUnit);
      const modal = (data.hargaBeli || 0) + (data.biayaLain || 0);
      const umurHari = data.tanggalMasuk
        ? Math.max(0, Math.floor((Date.now() - new Date(data.tanggalMasuk + 'T00:00:00Z').getTime()) / 86400000))
        : 0;
      const tglMasuk = data.tanggalMasuk && data.tanggalMasuk !== new Date().toISOString().slice(0, 10)
        ? data.tanggalMasuk
        : 'Hari ini';
      const unit: UnitHP = {
        id, nama: data.nama, merek: data.merek || 'HP', model: data.model || data.nama, imei: data.imei, imei2: data.imei2,
        kondisi: data.kondisi || 'Bekas', grade: data.grade, kelengkapan: (data.kelengkapan as UnitHP['kelengkapan']) || 'Fullset', baterai: data.baterai,
        bebasKunci: (data.bebasKunci as UnitHP['bebasKunci']) || 'Ya', hargaBeli: data.hargaBeli, biayaLain: data.biayaLain || 0, biayaServis: 0, hpp: modal,
        hargaJualTarget: data.hargaJualTarget || Math.round(modal * 1.15), status: data.perluServis ? 'Servis' : 'Ready',
        umurHari, tglMasuk, catatan: [data.catatan, data.keluhanServis].filter(Boolean).join(' · '), foto: data.foto || [], sumberSupplier: data.supplier,
      };
      setStokList(l => [unit, ...l]);
      setTransaksiList(l => [{
        id: nomorDokumen('BELI', urutanBerikut(l.map(x => x.id), 'BELI')), jam: jamWib(), tanggal: tglWib(), tipe: 'Beli',
        judul: `Beli · ${data.nama}`, subjudul: `${id} • IMEI ...${String(data.imei).slice(-4)}`, pihak: data.supplier || 'Supplier',
        nominal: modal, status: 'Lunas', items: [{ nama: data.nama, qty: 1, harga: modal, imei: data.imei }], dibayar: modal, sisa: 0,
      }, ...l]);
      toast({ judul: `${data.nama} dicatat`, desk: `${id} · IMEI ...${String(data.imei).slice(-4)} · modal ${rupiah(modal)}` });
      return { ok: true };
    } finally {
      sedangProses.current = false;
    }
  };

  const jualLokal = (h: HasilJual) => {
    const { nota } = h;
    const sisa = nota.sisa;
    const idTrx = nota.noNota;
    const modal = h.modalUnit + h.modalAksesoris;
    const jmlUnit = h.unitIds.length;
    const trx: TransaksiItem = {
      id: idTrx, jam: jamWib(), tanggal: tglWib(), tipe: 'Jual',
      judul: `Jual · ${nota.items[0]?.nama || 'Penjualan'}${nota.items.length > 1 ? ` + ${nota.items.length - 1} item` : ''}`,
      subjudul: `${idTrx} • ${nota.metodeBayar}${jmlUnit > 1 ? ` • ${jmlUnit} unit HP` : ''}`, pihak: nota.namaPelanggan, nominal: nota.totalTagihan,
      status: sisa > 0 ? 'Sebagian' : 'Lunas', items: nota.items.map(i => ({ nama: i.nama, qty: i.qty, harga: i.harga, imei: i.imei })),
      bonus: nota.bonus, diskon: nota.diskon, tukarTambah: nota.tukarTambah.ada ? { unit: nota.tukarTambah.unit || '', nilai: nota.tukarTambah.nilai || 0 } : undefined,
      dibayar: nota.dibayar, sisa, jatuhTempo: nota.jatuhTempo, modal, biayaBonus: h.biayaBonus,
      // sama dengan hitungan server: nilai tukar tambah tidak mengurangi laba (HP lama masuk stok sebesar nilainya)
      laba: nota.subtotal - nota.diskon - modal - h.biayaBonus,
      garansiSampai: nota.garansiSampai,
    };
    (trx as any).metode = nota.metodeBayar;
    setTransaksiList(l => [trx, ...l]);
    const tt = h.tukarTambah;
    const unitTt: UnitHP | null = tt ? {
      id: nomorDokumen('UNT', urutanBerikut(stokList.map(u => u.id), 'UNT')), nama: tt.nama, merek: tt.form.merek || 'HP', model: tt.form.model || tt.nama,
      imei: tt.form.imei, imei2: tt.form.imei2 || undefined, kondisi: tt.form.kondisi, grade: tt.form.kondisi === 'Bekas' ? tt.form.grade : undefined,
      kelengkapan: tt.form.kelengkapan, baterai: tt.form.baterai ? +tt.form.baterai : undefined, bebasKunci: tt.form.bebasKunci,
      hargaBeli: tt.nilai, biayaLain: 0, biayaServis: 0, hpp: tt.nilai, hargaJualTarget: tt.hargaJualTarget, status: 'Ready', umurHari: 0, tglMasuk: 'Hari ini',
      catatan: tt.catatan ? `Tukar tambah ${idTrx}. ${tt.catatan}` : `Tukar tambah ${idTrx}`, foto: POSISI_FOTO.map(p => tt.form.foto[p.id]).filter(Boolean), sumberSupplier: nota.namaPelanggan,
    } : null;
    setStokList(l => {
      const baru = l.map(u => h.unitIds.includes(u.id) ? { ...u, status: 'Terjual' as const, notaJualId: idTrx } : u);
      return unitTt ? [unitTt, ...baru] : baru;
    });
    if (Object.keys(h.aksesorisQty).length) {
      setAksesorisList(l => l.map(a => {
        const q = h.aksesorisQty[a.sku]; if (!q) return a;
        const stok = Math.max(0, a.stok - q);
        return { ...a, stok, status: stok === 0 ? 'Habis' : stok <= a.stokMin ? 'Menipis' : 'Aman' };
      }));
    }
    if (sisa > 0) {
      setTagihanList(l => [{
        id: nomorDokumen('TGH', urutanBerikut(l.map(x => x.id), 'TGH')), jenis: 'Piutang pelanggan', kontak: nota.namaPelanggan, noWa: nota.noWa || '',
        total: nota.totalTagihan, terbayar: nota.dibayar, sisa, jatuhTempo: nota.jatuhTempo || '', hariTelat: 0,
        status: nota.dibayar > 0 ? 'Sebagian' : 'Belum', refId: idTrx,
        riwayatBayar: nota.dibayar > 0 ? [{ tanggal: tglWib(), jam: jamWib(), nominal: nota.dibayar, metode: nota.metodeBayar }] : [],
      }, ...l]);
    }
    if (nota.noWa && nota.namaPelanggan && !/umum/i.test(nota.namaPelanggan)) {
      setKontakList(l => l.some(k => k.noWa.replace(/\D/g, '') === nota.noWa!.replace(/\D/g, ''))
        ? l.map(k => k.noWa.replace(/\D/g, '') === nota.noWa!.replace(/\D/g, '') ? { ...k, totalTransaksi: k.totalTransaksi + 1 } : k)
        : [{ id: nomorDokumen('KTK', urutanBerikut(l.map(x => x.id), 'KTK')).replace(/-\d{4}-/, '-'), nama: nota.namaPelanggan, tipe: 'Pelanggan', noWa: nota.noWa!, alamat: '', totalTransaksi: 1, aktif: true }, ...l]);
    }
    setDraf(null);
    setNotaAktif(nota);
    setIsJualOpen(false);
    setTimeout(() => setIsNotaOpen(true), 120);
    toast({ judul: `Penjualan ${idTrx} tersimpan`, desk: `Total ${rupiah(nota.totalTagihan)}, ${sisa > 0 ? `sisa ${rupiah(sisa)}` : 'lunas'}.` });
  };

  const handleJualSukses = async (h: HasilJual): Promise<boolean | void> => {
    if (isDemo) { jualLokal(h); return; }
    if (sedangProses.current) return false;
    sedangProses.current = true;
    try {
      const res = await apiCall<HasilServerJual>('simpanPenjualan', h.payload, h.idemKey);
      if (!res.ok || !res.data) {
        toast({ tipe: 'error', judul: 'Penjualan belum tersimpan', desk: res.pesan || 'Periksa koneksi lalu coba lagi.', durasi: 8000 });
        return false;
      }
      const s = res.data;
      // Nota memakai angka dan nomor dari server (sumber kebenaran), bukan hitungan layar
      const nota: DataNota = {
        ...h.nota, noNota: s.idPenjualan, subtotal: s.subtotal, diskon: s.diskon, totalTagihan: s.total,
        dibayar: s.dibayar, sisa: s.sisa, garansiSampai: s.garansiSampai,
        tukarTambah: h.nota.tukarTambah.ada ? { ...h.nota.tukarTambah, nilai: s.nilaiTukarTambah } : h.nota.tukarTambah,
        jatuhTempo: s.sisa > 0 ? h.nota.jatuhTempo : undefined,
      };
      setDraf(null);
      setNotaAktif(nota);
      setIsJualOpen(false);
      setNotaPdf(null);
      if (s.idUnitTukarTambah && h.tukarTambah) void unggahFotoUnit(s.idUnitTukarTambah, h.tukarTambah.form.foto); // foto HP tukar tambah masuk folder unitnya
      setTimeout(() => setIsNotaOpen(true), 120);
      void siapkanPdfNota(s.idPenjualan, true); // gagal membuat PDF tidak membatalkan penjualan: tampil tombol Buat ulang nota
      toast({ judul: `Penjualan ${s.idPenjualan} tersimpan`, desk: `Total ${rupiah(s.total)}, ${s.sisa > 0 ? `sisa ${rupiah(s.sisa)}` : 'lunas'}.` });
      void muatSemua();
      return true;
    } finally {
      sedangProses.current = false;
    }
  };

  const bayarLokal = (tghId: string, nominal: number, metode: string, catatan: string) => {
    const t = tagihanList.find(x => x.id === tghId);
    if (!t || nominal <= 0) return;
    const bayar = Math.min(nominal, t.sisa);
    const sisaBaru = t.sisa - bayar;
    const baru: Tagihan = {
      ...t, sisa: sisaBaru, terbayar: t.terbayar + bayar,
      status: sisaBaru === 0 ? 'Lunas' : 'Sebagian', hariTelat: sisaBaru === 0 ? 0 : t.hariTelat,
      riwayatBayar: [...t.riwayatBayar, { tanggal: tglWib(), jam: jamWib(), nominal: bayar, metode }],
    };
    setTagihanList(l => l.map(x => x.id === tghId ? baru : x));
    setInspectedTagihan(baru);
    setTransaksiList(l => {
      const diperbarui = l.map(x => x.id === t.refId ? { ...x, dibayar: (x.dibayar || 0) + bayar, sisa: sisaBaru, status: (sisaBaru === 0 ? 'Lunas' : 'Sebagian') as TransaksiItem['status'] } : x);
      return [{
        id: nomorDokumen('BYR', urutanBerikut(l.map(x => x.id), 'BYR')), jam: jamWib(), tanggal: tglWib(), tipe: 'Bayar',
        judul: `Bayar · ${t.jenis === 'Piutang pelanggan' ? 'Cicilan' : 'Hutang'} ${t.kontak}`, subjudul: `${t.id} • ${metode}${catatan ? ' • ' + catatan : ''}`,
        pihak: t.kontak, nominal: bayar, status: 'Lunas', dibayar: bayar, sisa: 0,
      }, ...diperbarui];
    });
    toast({ judul: `Pembayaran ${rupiah(bayar)} dicatat`, desk: sisaBaru === 0 ? `${t.kontak} lunas.` : `Sisa ${rupiah(sisaBaru)}.` });
  };

  const handleBayarTagihan = async (tghId: string, nominal: number, metode: string, catatan: string) => {
    if (isDemo) { bayarLokal(tghId, nominal, metode, catatan); return; }
    if (sedangProses.current || nominal <= 0) return;
    sedangProses.current = true;
    try {
      const res = await apiCall<{ sisa: number }>('terimaPembayaran', tghId, nominal, metode, catatan, buatIdemKey());
      if (!res.ok || !res.data) {
        toast({ tipe: 'error', judul: 'Pembayaran belum tersimpan', desk: res.pesan || 'Periksa koneksi lalu coba lagi.', durasi: 8000 });
        return;
      }
      const d = await muatSemua();
      const baru = d?.tagihan.find(x => x.id === tghId);
      if (baru) setInspectedTagihan(baru);
      if (baru?.refId.startsWith('JUAL-')) void apiCall('buatNota', baru.refId); // nota ikut status terbaru (versi lama masuk RIWAYAT)
      toast({ judul: `Pembayaran ${rupiah(nominal)} dicatat`, desk: res.data.sisa === 0 ? 'Tagihan lunas.' : `Sisa ${rupiah(res.data.sisa)}.` });
    } finally {
      sedangProses.current = false;
    }
  };

  const batalLokal = (id: string, alasan: string, catatan: string) => {
    const t = transaksiList.find(x => x.id === id);
    if (!t) return;
    setTransaksiList(l => l.map(x => x.id === id ? { ...x, status: 'Dibatalkan', catatanBatal: [alasan, catatan].filter(Boolean).join(': ') } : x));
    if (t.tipe === 'Jual') {
      setStokList(l => l.map(u => u.notaJualId === id ? { ...u, status: 'Ready', notaJualId: undefined } : u));
      setTagihanList(l => l.filter(x => x.refId !== id));
    } else if (t.tipe === 'Beli') {
      setStokList(l => l.filter(u => !u.id.includes(id)));
      setTagihanList(l => l.filter(x => x.refId !== id));
    }
    setBatalTransaksiTarget(null);
    toast({ tipe: 'warning', judul: `${id} dibatalkan`, desk: t.tipe === 'Jual' ? 'Unit kembali Ready dan piutang terkait dihapus dari Tagihan.' : 'Pembelian dibatalkan, unit ditarik dan kewajiban disesuaikan.' });
  };

  const handleBatalTransaksi = async (id: string, alasan: string, catatan: string) => {
    if (isDemo) { batalLokal(id, alasan, catatan); return; }
    if (sedangProses.current) return;
    sedangProses.current = true;
    try {
      const res = await apiCall('batalkanTransaksi', id, alasan, catatan, buatIdemKey());
      if (!res.ok) {
        toast({ tipe: 'error', judul: `${id} belum dibatalkan`, desk: res.pesan || 'Periksa koneksi lalu coba lagi.', durasi: 8000 });
        return;
      }
      setBatalTransaksiTarget(null);
      await muatSemua();
      if (id.startsWith('JUAL-')) void apiCall('buatNota', id); // nota berwatermark DIBATALKAN
      toast({ tipe: 'warning', judul: `${id} dibatalkan`, desk: id.startsWith('JUAL-') ? 'Unit kembali Ready dan piutang terkait dibatalkan.' : 'Pembelian dibatalkan, unit ditarik dan kewajiban disesuaikan.' });
    } finally {
      sedangProses.current = false;
    }
  };

  const handleEditUnit = async (idUnit: string, data: any) => {
    if (isDemo) {
      setStokList(l => l.map(u => u.id === idUnit ? { ...u, ...data } : u));
      setInspectedUnit(prev => prev && prev.id === idUnit ? { ...prev, ...data } : prev);
      toast({ judul: `Data unit ${idUnit} diperbarui` });
      return;
    }
    if (sedangProses.current) return;
    sedangProses.current = true;
    try {
      const res = await apiCall('editUnit', idUnit, data, buatIdemKey());
      if (!res.ok) {
        toast({ tipe: 'error', judul: 'Gagal mengubah unit', desk: res.pesan, durasi: 8000 });
        return;
      }
      toast({ judul: `Unit ${idUnit} diperbarui` });
      await muatSemua();
      setInspectedUnit(prev => prev && prev.id === idUnit ? { ...prev, ...data } : prev);
    } finally {
      sedangProses.current = false;
    }
  };

  const handleHapusUnit = async (idUnit: string, alasan: string) => {
    if (isDemo) {
      setStokList(l => l.filter(u => u.id !== idUnit));
      setInspectedUnit(null);
      toast({ tipe: 'warning', judul: `Unit ${idUnit} dibatalkan dari stok` });
      return;
    }
    if (sedangProses.current) return;
    sedangProses.current = true;
    try {
      const res = await apiCall('hapusUnit', idUnit, alasan, buatIdemKey());
      if (!res.ok) {
        toast({ tipe: 'error', judul: 'Gagal membatalkan unit', desk: res.pesan, durasi: 8000 });
        return;
      }
      setInspectedUnit(null);
      toast({ tipe: 'warning', judul: `Unit ${idUnit} dibatalkan dari stok` });
      void muatSemua();
    } finally {
      sedangProses.current = false;
    }
  };

  const handleTambahAksesoris = async (data: any) => {
    if (isDemo) {
      const sku = data.sku || `AKS-${String(aksesorisList.length + 1).padStart(4, '0')}`;
      setAksesorisList(l => [...l, { ...data, sku, status: 'Aman' }]);
      toast({ judul: `Aksesoris ${data.nama} ditambahkan` });
      return;
    }
    if (sedangProses.current) return;
    sedangProses.current = true;
    try {
      const res = await apiCall('simpanAksesoris', data, buatIdemKey());
      if (!res.ok) {
        toast({ tipe: 'error', judul: 'Gagal menambah aksesoris', desk: res.pesan, durasi: 8000 });
        return;
      }
      toast({ judul: `Aksesoris ${data.nama} ditambahkan` });
      void muatSemua();
    } finally {
      sedangProses.current = false;
    }
  };

  const handleEditAksesoris = async (sku: string, data: any) => {
    if (isDemo) {
      setAksesorisList(l => l.map(a => a.sku === sku ? { ...a, ...data } : a));
      toast({ judul: `Aksesoris ${sku} diperbarui` });
      return;
    }
    if (sedangProses.current) return;
    sedangProses.current = true;
    try {
      const res = await apiCall('editAksesoris', sku, data, buatIdemKey());
      if (!res.ok) {
        toast({ tipe: 'error', judul: 'Gagal mengubah aksesoris', desk: res.pesan, durasi: 8000 });
        return;
      }
      toast({ judul: `Aksesoris ${sku} diperbarui` });
      void muatSemua();
    } finally {
      sedangProses.current = false;
    }
  };

  const handleHapusAksesoris = async (sku: string, alasan?: string) => {
    if (isDemo) {
      setAksesorisList(l => l.filter(a => a.sku !== sku));
      toast({ tipe: 'warning', judul: `Aksesoris ${sku} dinonaktifkan` });
      return;
    }
    if (sedangProses.current) return;
    sedangProses.current = true;
    try {
      const res = await apiCall('hapusAksesoris', sku, alasan, buatIdemKey());
      if (!res.ok) {
        toast({ tipe: 'error', judul: 'Gagal menghapus aksesoris', desk: res.pesan, durasi: 8000 });
        return;
      }
      toast({ tipe: 'warning', judul: `Aksesoris ${sku} dinonaktifkan` });
      void muatSemua();
    } finally {
      sedangProses.current = false;
    }
  };

  const handleEditKontak = async (id: string, data: any) => {
    if (isDemo) {
      setKontakList(l => l.map(k => k.id === id ? { ...k, ...data } : k));
      toast({ judul: `Kontak diperbarui` });
      return;
    }
    if (sedangProses.current) return;
    sedangProses.current = true;
    try {
      const res = await apiCall('editKontak', id, data, buatIdemKey());
      if (!res.ok) {
        toast({ tipe: 'error', judul: 'Gagal mengubah kontak', desk: res.pesan, durasi: 8000 });
        return;
      }
      toast({ judul: `Kontak diperbarui` });
      void muatSemua();
    } finally {
      sedangProses.current = false;
    }
  };

  const handleHapusKontak = async (id: string, alasan?: string) => {
    if (isDemo) {
      setKontakList(l => l.filter(k => k.id !== id));
      toast({ tipe: 'warning', judul: `Kontak dinonaktifkan` });
      return;
    }
    if (sedangProses.current) return;
    sedangProses.current = true;
    try {
      const res = await apiCall('hapusKontak', id, alasan, buatIdemKey());
      if (!res.ok) {
        toast({ tipe: 'error', judul: 'Gagal menghapus kontak', desk: res.pesan, durasi: 8000 });
        return;
      }
      toast({ tipe: 'warning', judul: `Kontak dinonaktifkan` });
      void muatSemua();
    } finally {
      sedangProses.current = false;
    }
  };

  const handleEditBiaya = async (id: string, data: any) => {
    if (isDemo) {
      setBiayaList(l => l.map(b => b.id === id ? { ...b, ...data } : b));
      toast({ judul: `Biaya diperbarui` });
      return;
    }
    if (sedangProses.current) return;
    sedangProses.current = true;
    try {
      const res = await apiCall('editBiaya', id, data, buatIdemKey());
      if (!res.ok) {
        toast({ tipe: 'error', judul: 'Gagal mengubah biaya', desk: res.pesan, durasi: 8000 });
        return;
      }
      toast({ judul: `Biaya diperbarui` });
      void muatSemua();
    } finally {
      sedangProses.current = false;
    }
  };

  const handleHapusBiaya = async (id: string, alasan?: string) => {
    if (isDemo) {
      setBiayaList(l => l.filter(b => b.id !== id));
      toast({ tipe: 'warning', judul: `Biaya dibatalkan` });
      return;
    }
    if (sedangProses.current) return;
    sedangProses.current = true;
    try {
      const res = await apiCall('hapusBiaya', id, alasan, buatIdemKey());
      if (!res.ok) {
        toast({ tipe: 'error', judul: 'Gagal menghapus biaya', desk: res.pesan, durasi: 8000 });
        return;
      }
      toast({ tipe: 'warning', judul: `Biaya dibatalkan` });
      void muatSemua();
    } finally {
      sedangProses.current = false;
    }
  };

  const handleEditServis = async (idServis: string, data: any) => {
    if (isDemo) {
      setServisList(l => l.map(s => s.id === idServis ? { ...s, ...data } : s));
      toast({ judul: `Tiket servis diperbarui` });
      return;
    }
    if (sedangProses.current) return;
    sedangProses.current = true;
    try {
      const res = await apiCall('editServis', idServis, data, buatIdemKey());
      if (!res.ok) {
        toast({ tipe: 'error', judul: 'Gagal mengubah tiket servis', desk: res.pesan, durasi: 8000 });
        return;
      }
      toast({ judul: `Tiket servis diperbarui` });
      void muatSemua();
    } finally {
      sedangProses.current = false;
    }
  };

  const handleBatalkanServis = async (idServis: string, alasan: string) => {
    if (isDemo) {
      const s = servisList.find(x => x.id === idServis);
      setServisList(l => l.map(x => x.id === idServis ? { ...x, status: 'Batal' as any } : x));
      if (s?.unitHpId) setStokList(l => l.map(u => u.id === s.unitHpId ? { ...u, status: 'Ready' } : u));
      toast({ tipe: 'warning', judul: `Servis ${idServis} dibatalkan` });
      return;
    }
    if (sedangProses.current) return;
    sedangProses.current = true;
    try {
      const res = await apiCall('batalkanServis', idServis, alasan, buatIdemKey());
      if (!res.ok) {
        toast({ tipe: 'error', judul: 'Gagal membatalkan servis', desk: res.pesan, durasi: 8000 });
        return;
      }
      toast({ tipe: 'warning', judul: `Servis ${idServis} dibatalkan` });
      void muatSemua();
    } finally {
      sedangProses.current = false;
    }
  };

  const tambahKontak = async (k: KontakItem) => {
    if (isDemo) { setKontakList(l => [k, ...l]); toast({ judul: `${k.nama} ditambahkan ke kontak` }); return; }
    if (sedangProses.current) return;
    sedangProses.current = true;
    try {
      const res = await apiCall('simpanKontak', sesuai<KontakInput>({ nama: k.nama, tipe: k.tipe === 'Keduanya' ? 'Pelanggan' : k.tipe, noWa: k.noWa, alamat: k.alamat, catatan: k.catatan }), buatIdemKey());
      if (!res.ok) { toast({ tipe: 'error', judul: 'Kontak belum tersimpan', desk: res.pesan, durasi: 8000 }); return; }
      toast({ judul: `${k.nama} ditambahkan ke kontak` });
      void muatSemua();
    } finally {
      sedangProses.current = false;
    }
  };

  const tambahKatalog = async (p: ProdukKatalog) => {
    if (isDemo) { setKatalogList(l => [p, ...l]); toast({ judul: `${p.merek} ${p.model} masuk katalog` }); return; }
    if (sedangProses.current) return;
    sedangProses.current = true;
    try {
      const res = await apiCall('simpanProduk', sesuai<ProdukInput>({
        jenis: p.jenis, platform: p.platform || platformDariMerek(p.merek), merek: p.merek, model: p.model, varian: p.varian, warna: p.warna, hargaStandar: p.hargaStandar,
      }), buatIdemKey());
      if (!res.ok) { toast({ tipe: 'error', judul: 'Produk belum tersimpan', desk: res.pesan, durasi: 8000 }); return; }
      toast({ judul: `${p.merek} ${p.model} masuk katalog` });
      void muatSemua();
    } finally {
      sedangProses.current = false;
    }
  };

  const servisSelesaiLokal = (id: string, part: number, jasa: number) => {
    const total = part + jasa;
    const idOrImei = id;
    const s = servisList.find(x => x.id === idOrImei || x.imei === idOrImei);
    setServisList(l => l.map(x => (x.id === idOrImei || x.imei === idOrImei) ? { ...x, status: 'Selesai', tahap: 'sesudah', biayaPart: part, biayaJasa: jasa } : x));
    const unitId = s?.unitHpId;
    if (unitId) setStokList(l => l.map(u => u.id === unitId ? { ...u, status: 'Ready', biayaServis: u.biayaServis + total, hpp: u.hpp + total } : u));
    toast({ judul: `Servis ${s?.namaPerangkat || ''} selesai`, desk: unitId ? `Unit kembali Ready. Biaya ${rupiah(total)} ditambahkan ke modal.` : `Biaya ${rupiah(total)}.` });
  };

  const handleServisSelesai = async (id: string, part: number, jasa: number): Promise<boolean | void> => {
    if (isDemo) { servisSelesaiLokal(id, part, jasa); return; }
    if (sedangProses.current) return false;
    sedangProses.current = true;
    try {
      const s = servisList.find(x => x.id === id);
      const res = await apiCall<{ hppLama?: number; hppBaru?: number; labaServis?: number }>(
        'updateStatusServis', id, 'Selesai', { biayaPart: part, biayaJasa: jasa, jadikanReady: s?.jenis === 'Internal' }, buatIdemKey());
      if (!res.ok || !res.data) {
        toast({ tipe: 'error', judul: 'Servis belum diselesaikan', desk: res.pesan || 'Periksa koneksi lalu coba lagi.', durasi: 8000 });
        return false;
      }
      void muatSemua();
      const r = res.data;
      toast({
        judul: `Servis ${s?.namaPerangkat || id} selesai`,
        desk: r.hppBaru !== undefined ? `Unit kembali Ready. Modal naik ${rupiah(r.hppLama || 0)} → ${rupiah(r.hppBaru)}.`
          : r.labaServis !== undefined ? `Laba servis ${rupiah(r.labaServis)}.` : `Biaya ${rupiah(part + jasa)}.`,
      });
      return true;
    } finally {
      sedangProses.current = false;
    }
  };

  /** Antri -> Dikerjakan dan Selesai -> Diambil. Di mode nyata disimpan ke server (sebelumnya hanya berubah di layar). */
  const ubahStatusServis = async (id: string, status: 'Dikerjakan' | 'Diambil'): Promise<boolean | void> => {
    const s = servisList.find(x => x.id === id);
    if (isDemo) {
      setServisList(l => l.map(x => x.id === id ? { ...x, status, tahap: status === 'Dikerjakan' ? 'proses' : 'sesudah' } : x));
      toast({ judul: status === 'Dikerjakan' ? 'Servis mulai dikerjakan' : (s?.jenis === 'Internal' ? 'Unit ditandai sudah diambil' : 'Servis diserahkan ke pelanggan'), desk: s?.namaPerangkat });
      return;
    }
    if (sedangProses.current) return false;
    sedangProses.current = true;
    try {
      const res = await apiCall('updateStatusServis', id, status, {}, buatIdemKey());
      if (!res.ok) { toast({ tipe: 'error', judul: 'Status servis belum berubah', desk: res.pesan || 'Periksa koneksi lalu coba lagi.', durasi: 8000 }); return false; }
      void muatSemua();
      toast({ judul: status === 'Dikerjakan' ? 'Servis mulai dikerjakan' : 'Servis ditandai diambil', desk: s?.namaPerangkat });
      return true;
    } finally {
      sedangProses.current = false;
    }
  };

  const tambahServis = async (baru: ServisItem): Promise<boolean | void> => {
    if (isDemo) {
      setServisList(l => [baru, ...l]);
      if (baru.unitHpId) setStokList(l => l.map(u => u.id === baru.unitHpId ? { ...u, status: 'Servis' } : u));
      setServisUnitTarget(null);
      toast({ judul: `Servis ${baru.id} diterima`, desk: baru.namaPerangkat });
      return;
    }
    if (sedangProses.current) return false;
    sedangProses.current = true;
    try {
      const vendor = /vendor/i.test(baru.teknisi);
      const res = await apiCall<{ idServis: string }>('simpanServis', sesuai<ServisInput>({
        jenis: baru.jenis, idUnit: baru.unitHpId, imei: baru.imei === '-' ? undefined : baru.imei, namaPerangkat: baru.namaPerangkat,
        namaPelanggan: baru.namaPelanggan, noWa: baru.noWa === '-' ? undefined : baru.noWa, keluhan: baru.keluhan,
        pelaksana: vendor ? 'Vendor luar' : 'Teknisi sendiri', namaVendor: baru.teknisi,
        estimasiBiaya: baru.estimasiBiaya, tarifPelanggan: baru.tarifPelanggan,
      }), buatIdemKey());
      if (!res.ok || !res.data) {
        toast({ tipe: 'error', judul: 'Servis belum tersimpan', desk: res.pesan || 'Periksa koneksi lalu coba lagi.', durasi: 8000 });
        return false;
      }
      setServisUnitTarget(null);
      toast({ judul: `Servis ${res.data.idServis} diterima`, desk: baru.namaPerangkat });
      void muatSemua();
      return true;
    } finally {
      sedangProses.current = false;
    }
  };

  const cekGaransiServer = async (q: string): Promise<HasilCariGaransi | null> => {
    const res = await apiCall<HasilCariGaransi | null>('cekGaransi', q);
    if (!res.ok) { toast({ tipe: 'error', judul: 'Garansi belum bisa dicek', desk: res.pesan, durasi: 8000 }); return null; }
    return res.data ?? null;
  };

  const simpanKlaim = async (k: KlaimItem, e: KlaimEkstra): Promise<boolean | void> => {
    if (isDemo) { setKlaimList(l => [k, ...l]); toast({ judul: `Klaim ${k.id} dibuka`, desk: k.namaBarang }); return; }
    if (sedangProses.current) return false;
    sedangProses.current = true;
    try {
      const res = await apiCall<{ idKlaim: string; masihGaransi: boolean }>('simpanKlaim', sesuai<KlaimInput>({
        referensi: k.notaId, jenis: k.jenis, alasan: e.alasanPokok, catatan: e.catatan, tindakan: e.tindakan,
        nilaiRefund: e.nilaiRefund, unitPengganti: e.unitPengganti, kondisiKembali: e.kondisiKembali,
      }), buatIdemKey());
      if (!res.ok || !res.data) {
        toast({ tipe: 'error', judul: 'Klaim belum tersimpan', desk: res.pesan || 'Periksa koneksi lalu coba lagi.', durasi: 8000 });
        return false;
      }
      void muatSemua();
      toast({ judul: `Klaim ${res.data.idKlaim} dicatat`, desk: res.data.masihGaransi ? k.namaBarang : `${k.namaBarang} (garansi sudah habis)` });
      return true;
    } finally {
      sedangProses.current = false;
    }
  };

  const tambahBiaya = async (b: BiayaOperasional): Promise<boolean | void> => {
    if (isDemo) { setBiayaList(l => [b, ...l]); toast({ judul: `Biaya ${b.kategori} dicatat`, desk: `${rupiah(b.nominal)} · ${b.tanggal}` }); return; }
    if (sedangProses.current) return false;
    sedangProses.current = true;
    try {
      const d = parseTgl(b.tanggal);
      if (!d) { toast({ tipe: 'error', judul: 'Tanggal biaya tidak terbaca', desk: 'Tulis seperti 05 Okt 2026.' }); return false; }
      const res = await apiCall('simpanBiaya', sesuai<BiayaInput>({ kategori: b.kategori, nominal: b.nominal, tanggal: d.toISOString().slice(0, 10), catatan: b.keterangan }), buatIdemKey());
      if (!res.ok) { toast({ tipe: 'error', judul: 'Biaya belum tersimpan', desk: res.pesan || 'Periksa koneksi lalu coba lagi.', durasi: 8000 }); return false; }
      toast({ judul: `Biaya ${b.kategori} dicatat`, desk: `${rupiah(b.nominal)} · ${b.tanggal}` });
      void muatSemua();
      return true;
    } finally {
      sedangProses.current = false;
    }
  };

  const muatLaporan = async (periodeApi: string): Promise<LaporanLayar | null> => {
    const r = await apiCall<LaporanLayar>('getLaporanLayar', periodeApi);
    if (!r.ok || !r.data) { toast({ tipe: 'error', judul: 'Laporan belum bisa dimuat', desk: r.pesan, durasi: 8000 }); return null; }
    return r.data;
  };

  const kunciBulanServer = async (bulan: string): Promise<boolean> => {
    const r = await apiCall('kunciBulan', bulan);
    if (!r.ok) { toast({ tipe: 'error', judul: 'Bulan belum bisa dikunci', desk: r.pesan, durasi: 8000 }); return false; }
    return true;
  };

  const unduhLaporanPdf = async (bulan: string): Promise<boolean> => {
    const r = await apiCall<{ nama: string; urlLihat: string; base64: string }>('buatLaporanPdf', bulan);
    if (!r.ok || !r.data) { toast({ tipe: 'error', judul: 'PDF laporan belum jadi', desk: r.pesan, durasi: 8000 }); return false; }
    const biner = atob(r.data.base64);
    const bytes = new Uint8Array(biner.length);
    for (let i = 0; i < biner.length; i++) bytes[i] = biner.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = r.data.nama;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast({ judul: 'PDF laporan dibuat', desk: `${r.data.nama} juga tersimpan di Drive (06_LAPORAN).` });
    return true;
  };

  const serverPengaturan: ServerPengaturan = {
    simpan: async pasangan => {
      const r = await apiCall('simpanPengaturan', pasangan);
      if (r.ok) void muatSemua();
      else toast({ tipe: 'error', judul: 'Pengaturan belum tersimpan', desk: r.pesan, durasi: 8000 });
      return r.ok;
    },
    muatLog: async () => { const r = await apiCall<LogItemServer[]>('getLogTerbaru', 100); return r.ok && r.data ? r.data : []; },
    backupSekarang: async () => (await apiCall('backupSekarang')).ok,
    cekKonsistensi: async () => { const r = await apiCall<HasilKonsistensiUI>('cekKonsistensi'); return r.ok && r.data ? r.data : null; },
    muatStatus: async () => { const r = await apiCall<StatusSistemUI>('getStatusSistem'); return r.ok && r.data ? r.data : null; },
    muatBackup: async () => { const r = await apiCall<InfoBackupUI[]>('getDaftarBackup'); return r.ok && r.data ? r.data : []; },
  };

  const logoSrc = ambilUrlLogo(pengaturanServer?.ID_BERKAS_LOGO);

  /** Identitas toko pada nota: murni dari sheet Pengaturan database */
  const tokoNota: TokoNota = {
    nama: pengaturanServer?.NAMA_TOKO || 'Epic Phone Purwokerto',
    tagline: pengaturanServer?.TAGLINE || '',
    alamat: pengaturanServer?.ALAMAT || '',
    wa: pengaturanServer?.NO_WA || '',
    instagram: pengaturanServer?.INSTAGRAM || '',
    syarat: pengaturanServer?.SYARAT_GARANSI || 'Garansi berlaku sesuai ketentuan nota.',
    logoUrl: logoSrc,
  };

  const fotoServer = isDemo ? undefined : {
    muat: async (unitId: string): Promise<FotoServer[]> => {
      const r = await apiCall<FotoServer[]>('getFotoReferensi', 'Unit', unitId);
      return r.ok && r.data ? r.data : [];
    },
    unggah: async (unitId: string, posisi: string, f: { base64Data: string }) => {
      const r = await apiCall('unggahFoto', { jenisReferensi: 'Unit', idReferensi: unitId, posisi, base64Data: f.base64Data, mimeType: 'image/jpeg' }, buatIdemKey());
      if (r.ok) void muatSemua();
      return { ok: r.ok, pesan: r.pesan };
    },
    hapus: async (idBerkas: string) => {
      const ok = (await apiCall('hapusFoto', idBerkas)).ok;
      if (ok) void muatSemua();
      return ok;
    },
  };

  const handleKirimKeServis = (u: UnitHP) => { setServisUnitTarget(u); go('servis'); };
  const handleCekGaransi = (imei?: string) => { setGaransiImeiTarget(imei); go('garansi'); };

  const handleHasilCari = {
    unit: (u: UnitHP) => setelahOverlay(() => { go('stok'); setInspectedUnit(u); }),
    trx: (t: TransaksiItem) => setelahOverlay(() => { go('riwayat'); bukaNotaTransaksi(t); }),
    kontak: (_k: KontakItem) => setelahOverlay(() => go('kontak')),
    aks: (_a: Aksesoris) => setelahOverlay(() => { setFilterStok('aksesoris'); go('stok'); }),
    pintasan: (t: string, f?: string) => setelahOverlay(() => {
      if (t === 'stok') setFilterStok(f); if (t === 'tagihan') setFilterTagihan(f); go(t as NavTab);
    }),
  };

  const badgeMenu: Record<string, number> = { tagihan: overdueCount, servis: dash.servisSiap };
  const dotMenu = overdueCount > 0 || dash.servisSiap > 0;

  // status backup di sidebar: dari server (mode nyata), bukan teks tetap
  const backupTeks = isDemo ? 'Mode demo, tanpa backup'
    : !statusBackup ? 'Memeriksa backup…'
    : statusBackup.ok ? `Backup ${statusBackup.terakhir || 'aktif'}` : 'Backup perlu perhatian';
  const backupKelas = isDemo || !statusBackup ? 'warn' : statusBackup.ok ? '' : 'bad';

  // ---- UI ----
  const item = (t: NavTab, ikon: any, label: string, badge = 0) => (
    <button type="button" class={`side-item ${tab === t ? 'aktif' : ''}`} onClick={() => go(t)} aria-current={tab === t ? 'page' : undefined} title={ciut ? label : undefined}>
      {ikon}
      <span class="side-text">{label}</span>
      {badge > 0 && <span class="side-badge" aria-label={`${badge} perlu perhatian`}>{badge}</span>}
      {badge > 0 && <span class="side-badge-dot" aria-hidden="true" />}
    </button>
  );

  return (
    <div class={`shell ${ciut ? 'collapsed' : ''}`}>
      <a class="skip-link" href="#konten" onClick={e => { e.preventDefault(); mainRef.current?.focus(); }}>Lewati ke konten</a>

      <aside class="sidebar" aria-label="Navigasi utama">
        <div class="sidebar-brand">
          <div
            class="sidebar-brand-link"
            onClick={ciut ? () => setCiut(false) : undefined}
            role={ciut ? 'button' : undefined}
            tabIndex={ciut ? 0 : undefined}
            aria-label={ciut ? 'Besarkan menu samping (Ctrl+B)' : undefined}
            title={ciut ? 'Besarkan menu samping (Ctrl+B)' : undefined}
            onKeyDown={ciut ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCiut(false); } } : undefined}
          >
            <img src={logoSrc} alt="Epic Phone" onError={e => { (e.target as HTMLImageElement).src = LOGO_DATA_URI; }} />
            <div class="sidebar-brand-text"><span class="sidebar-brand-title">EPIC PHONE</span><span class="sidebar-brand-sub">PURWOKERTO</span></div>
          </div>
          <button type="button" class="icon-btn sidebar-toggle" onClick={() => setCiut(!ciut)} aria-label={ciut ? 'Besarkan menu samping (Ctrl+B)' : 'Kecilkan menu samping (Ctrl+B)'} aria-expanded={!ciut} title={ciut ? 'Besarkan menu samping (Ctrl+B)' : 'Kecilkan menu samping (Ctrl+B)'}>
            <IconSidebar size={20} ciut={ciut} />
          </button>
        </div>
        <div class="sidebar-new">
          <button type="button" class="btn btn-primary" onClick={() => setIsTransaksiOpen(true)} title="Transaksi baru (N)">
            <IconPlus size={18} /><span class="btn-text">Transaksi baru</span><kbd class="kbd-hint" aria-hidden="true">N</kbd>
          </button>
        </div>
        <nav class="side-nav" aria-label="Halaman">
          <div class="side-group">
            <span class="side-label">Harian</span>
            {item('beranda', <IconHome size={20} />, 'Beranda')}
            {item('stok', <IconBox size={20} />, 'Stok')}
            {item('riwayat', <IconClock size={20} />, 'Riwayat')}
          </div>
          <div class="side-group">
            <span class="side-label">Layanan</span>
            {item('servis', <IconWrench size={20} />, 'Servis', dash.servisSiap)}
            {item('garansi', <IconShield size={20} />, 'Garansi dan Retur')}
          </div>
          <div class="side-group">
            <span class="side-label">Keuangan</span>
            {item('tagihan', <IconInvoice size={20} />, 'Tagihan', overdueCount)}
            {item('biaya', <IconBanknote size={20} />, 'Biaya Operasional')}
            {item('laporan', <IconChart size={20} />, 'Laporan')}
          </div>
          <div class="side-group">
            <span class="side-label">Data</span>
            {item('kontak', <IconUsers size={20} />, 'Kontak')}
            {item('katalog', <IconTag size={20} />, 'Katalog Produk')}
          </div>
        </nav>
        <div class="sidebar-foot">
          {item('pengaturan', <IconSettings size={20} />, 'Pengaturan')}
          <button type="button" class="sys-chip" onClick={() => go('pengaturan', 'backup')} title={backupTeks} aria-label={`Status backup: ${backupTeks}`}>
            <span class={`sys-dot ${backupKelas}`} aria-hidden="true" /><span class="sys-text">{backupTeks}</span>
          </button>
        </div>
      </aside>

      <div class="shell-col">
        <header class="topbar">
          <div class="topbar-brand"><img src={logoSrc} alt="Epic Phone" onError={e => { (e.target as HTMLImageElement).src = LOGO_DATA_URI; }} /></div>
          <h1 class="topbar-title">{JUDUL[tab]}</h1>
          <button type="button" class="omnibox" onClick={() => setIsPencarianOpen(true)} aria-label="Cari model, IMEI, nota, atau pelanggan">
            <IconSearch size={18} /><span>Cari model, IMEI, nota, pelanggan</span><kbd>/</kbd>
          </button>
          <div class="topbar-actions">
            <span class={`privacy-pill ${isPrivacyMode ? 'on' : ''}`}>Angka disembunyikan</span>
            <button type="button" class="icon-btn" onClick={() => { void muatSemua(); toast({ tipe: 'info', judul: 'Menyegarkan data dari database...', durasi: 2000 }); }} title="Segarkan data dari database" aria-label="Segarkan data">
              <IconRefresh size={18} />
            </button>
            <button type="button" class="icon-btn phone-search" onClick={() => setIsPencarianOpen(true)} aria-label="Cari"><IconSearch size={20} /></button>
            <button type="button" class="icon-btn" onClick={() => setTema(isDark ? 'terang' : 'gelap')} aria-label={isDark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'} title={isDark ? 'Tema terang' : 'Tema gelap'}>
              {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
            </button>
            <button type="button" class="icon-btn" onClick={() => refToggle.current.privasi()} aria-pressed={isPrivacyMode} title="Sembunyikan angka (P)" aria-label={isPrivacyMode ? 'Tampilkan angka' : 'Sembunyikan angka'}>
              {isPrivacyMode ? <IconEyeOff size={20} /> : <IconEye size={20} />}
            </button>
            <button type="button" class="icon-btn" onClick={() => setIsPeringatanOpen(true)} aria-label={perhatianCount ? `Peringatan, ${perhatianCount} perlu perhatian` : 'Peringatan'}>
              <IconBell size={20} />
              {perhatianCount > 0 && <span class="icon-dot" aria-hidden="true">{perhatianCount}</span>}
            </button>
          </div>
        </header>

        {isDemo && !demoDitutup && (
          <div class="demo-bar" role="status">
            <span><strong>Mode demo.</strong> Data di layar adalah data contoh dan tersimpan hanya di perangkat ini.</span>
            <button type="button" class="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setDemoDitutup(true)} aria-label="Tutup pemberitahuan"><IconClose size={16} /></button>
          </div>
        )}

        {!isDemo && statusData === 'memuat' && (
          <div class="demo-bar" role="status"><span><strong>Memuat data…</strong> Mengambil data terbaru dari server.</span></div>
        )}
        {!isDemo && statusBackup && !statusBackup.ok && (
          <div class="demo-bar" role="alert"><span><strong>Backup perlu perhatian.</strong> {statusBackup.pesan}{statusBackup.terakhir ? ` (terakhir ${statusBackup.terakhir})` : ''}</span></div>
        )}
        {!isDemo && statusData === 'galat' && (
          <div class="demo-bar" role="alert">
            <span><strong>Data belum termuat.</strong> {pesanGalatData}</span>
            <button type="button" class="btn btn-ghost" onClick={() => { setStatusData('memuat'); muatSemua(); }}>Coba lagi</button>
          </div>
        )}


        <main id="konten" class="main" ref={mainRef} tabIndex={-1}>
          {tab === 'beranda' && (
            <BerandaScreen
              dash={dash}
              perhatian={peringatan}
              draf={draf}
              isPrivacyMode={isPrivacyMode}
              onBukaJual={() => bukaJual(null)}
              onBukaBarangMasuk={() => setIsBarangMasukOpen(true)}
              onBukaServis={() => go('servis')}
              onBukaBayar={() => { setFilterTagihan(undefined); go('tagihan'); }}
              onBukaPerhatian={bukaItemPeringatan}
              onSemuaPerhatian={() => setIsPeringatanOpen(true)}
              onBukaTransaksi={bukaNotaTransaksi}
              onLihatSemuaTransaksi={() => { setFilterRiwayat(undefined); go('riwayat'); }}
              onGo={(t, f) => { if (t === 'stok') setFilterStok(f); if (t === 'tagihan') setFilterTagihan(f); if (t === 'riwayat') setFilterRiwayat(f); go(t as NavTab); }}
              onLanjutkanDraf={() => bukaJual(null, true)}
              onBuangDraf={() => { setDraf(null); toast({ tipe: 'info', judul: 'Draf penjualan dibuang' }); }}
            />
          )}
          {tab === 'stok' && (
            <StokScreen
              key={filterStok || 'semua'}
              filterAwal={filterStok}
              units={stokList}
              aksesoris={aksesorisList}
              onBukaBarangMasuk={() => setIsBarangMasukOpen(true)}
              onJualUnit={u => bukaJual(u)}
              onKirimKeServis={handleKirimKeServis}
              onBukaDetailUnit={u => setInspectedUnit(u)}
              onCekGaransi={handleCekGaransi}
              onTambahAksesoris={handleTambahAksesoris}
              onEditAksesoris={handleEditAksesoris}
              onHapusAksesoris={handleHapusAksesoris}
              isPrivacyMode={isPrivacyMode}
              density={density}
              onToggleDensity={() => setDensity(density === 'nyaman' ? 'padat' : 'nyaman')}
            />
          )}
          {tab === 'riwayat' && (
            <RiwayatScreen
              key={filterRiwayat || 'semua'}
              filterAwal={filterRiwayat}
              transaksiList={transaksiList}
              onBukaNota={bukaNotaTransaksi}
              onBukaBatal={t => setBatalTransaksiTarget(t)}
              onBukaUnit={id => { const u = stokList.find(x => x.id === id); if (u) setInspectedUnit(u); }}
              isPrivacyMode={isPrivacyMode}
            />
          )}
          {tab === 'servis' && (
            <ServisScreen
              servisList={servisList}
              stokHpList={stokList}
              unitAwal={servisUnitTarget}
              onServisSelesai={handleServisSelesai}
              onUbahStatus={ubahStatusServis}
              onTambahServis={tambahServis}
              onEditServis={handleEditServis}
              onBatalkanServis={handleBatalkanServis}
            />
          )}
          {tab === 'garansi' && (
            <GaransiScreen
              klaimList={klaimList}
              stokList={stokList}
              transaksiList={transaksiList}
              imeiAwal={garansiImeiTarget}
              garansiHari={garansiHariPakai}
              onCekGaransi={isDemo ? undefined : cekGaransiServer}
              onSimpanKlaimBaru={simpanKlaim}
            />
          )}
          {tab === 'tagihan' && (
            <TagihanScreen
              key={filterTagihan || 'semua'}
              tagihanList={tagihanList}
              filterAwal={filterTagihan}
              onBukaDetailTagihan={t => setInspectedTagihan(t)}
            />
          )}
          {tab === 'laporan' && (
            <LaporanScreen
              onBukaRiwayatFilter={k => { setFilterRiwayat(k); go('riwayat'); }}
              onShowToast={(m, tp) => toast({ tipe: tp === 'error' ? 'error' : 'success', judul: m })}
              isPrivacyMode={isPrivacyMode}
              toko={tokoNota}
              muat={isDemo ? undefined : muatLaporan}
              onKunciBulan={isDemo ? undefined : kunciBulanServer}
              onUnduhPdf={isDemo ? undefined : unduhLaporanPdf}
            />
          )}
          {tab === 'biaya' && (
            <BiayaScreen
              biayaList={biayaList}
              onTambahBiaya={tambahBiaya}
              onEditBiaya={handleEditBiaya}
              onHapusBiaya={handleHapusBiaya}
            />
          )}
          {tab === 'kontak' && (
            <KontakScreen
              kontakList={kontakList}
              onTambahKontak={tambahKontak}
              onEditKontak={handleEditKontak}
              onHapusKontak={handleHapusKontak}
              onBukaRiwayatTransaksi={nama => { setFilterRiwayat(nama); go('riwayat'); }}
            />
          )}
          {tab === 'katalog' && <KatalogScreen katalogList={katalogList} onTambahKatalog={tambahKatalog} />}
          {import.meta.env.DEV && tab === 'galeri' && <Galeri />}
          {tab === 'pengaturan' && (
            <PengaturanScreen
              server={isDemo ? undefined : serverPengaturan}
              pengaturan={isDemo ? undefined : pengaturanServer}
              statusBackup={isDemo ? undefined : statusBackup}
              subSection={pengaturanSub}
              isDark={isDark}
              onToggleTheme={() => setTema(isDark ? 'terang' : 'gelap')}
              density={density}
              onChangeDensity={setDensity}
              isPrivacyMode={isPrivacyMode}
              onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}
              onShowToast={(m, tp) => toast({ tipe: tp === 'error' ? 'error' : 'success', judul: m })}
              aksesorisList={aksesorisList}
            />
          )}
        </main>

        <nav class="bottom-nav" aria-label="Navigasi utama">
          <button type="button" class={`bn-item ${tab === 'beranda' ? 'aktif' : ''}`} onClick={() => go('beranda')} aria-current={tab === 'beranda' ? 'page' : undefined}>
            <span class="bn-icon"><IconHome size={22} /></span><span>Beranda</span>
          </button>
          <button type="button" class={`bn-item ${tab === 'stok' ? 'aktif' : ''}`} onClick={() => go('stok')} aria-current={tab === 'stok' ? 'page' : undefined}>
            <span class="bn-icon"><IconBox size={22} /></span><span>Stok</span>
          </button>
          <button type="button" class="bn-fab" onClick={() => setIsTransaksiOpen(true)} aria-label="Transaksi baru"><IconPlus size={26} /></button>
          <button type="button" class={`bn-item ${tab === 'riwayat' ? 'aktif' : ''}`} onClick={() => go('riwayat')} aria-current={tab === 'riwayat' ? 'page' : undefined}>
            <span class="bn-icon"><IconClock size={22} /></span><span>Riwayat</span>
          </button>
          <button type="button" class={`bn-item ${TAB_DI_MENU.includes(tab) ? 'aktif' : ''}`} onClick={() => setIsMenuOpen(true)} aria-haspopup="dialog" aria-label={dotMenu ? 'Menu, ada yang perlu perhatian' : 'Menu'}>
            <span class="bn-icon"><IconMenu size={22} /></span><span>Menu</span>
            {dotMenu && <span class="bn-dot" aria-hidden="true" />}
          </button>
        </nav>
      </div>

      <Toaster />

      {isTransaksiOpen && (
        <TransaksiModal
          onClose={() => setIsTransaksiOpen(false)}
          onPilih={handlePilihAksiTransaksi}
          draf={draf ? { ringkas: draf.ringkas } : null}
          onLanjutDraf={() => { setIsTransaksiOpen(false); setTimeout(() => bukaJual(null, true), 60); }}
        />
      )}
      {isPeringatanOpen && <PusatPeringatanModal onClose={() => setIsPeringatanOpen(false)} list={peringatan} log={getToastLog()} onBuka={bukaItemPeringatan} />}
      {isPencarianOpen && (
        <PencarianGlobalModal
          onClose={() => setIsPencarianOpen(false)}
          units={stokList} aksesoris={aksesorisList} transaksi={transaksiList} kontak={kontakList}
          onPilihUnit={handleHasilCari.unit} onPilihTransaksi={handleHasilCari.trx} onPilihKontak={handleHasilCari.kontak}
          onPilihAksesoris={handleHasilCari.aks} onPintasan={handleHasilCari.pintasan}
        />
      )}
      {isMenuOpen && (
        <MenuLengkapModal
          onClose={() => setIsMenuOpen(false)}
          onNavigasi={dest => { setelahOverlay(() => go(dest as NavTab)); }}
          isDark={isDark} onToggleTheme={() => setTema(isDark ? 'terang' : 'gelap')}
          isPrivacy={isPrivacyMode} onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}
          badge={badgeMenu}
        />
      )}
      {inspectedUnit && (
        <DetailUnitModal
          unit={stokList.find(u => u.id === inspectedUnit.id) || inspectedUnit}
          isOpen={true}
          onClose={() => setInspectedUnit(null)}
          onJual={u => { setInspectedUnit(null); setTimeout(() => bukaJual(u), 60); }}
          onKirimKeServis={u => { setInspectedUnit(null); handleKirimKeServis(u); }}
          onBukaFoto={u => setFotoUnitTarget(u)}
          onLihatNota={id => { const t = transaksiList.find(x => x.id === id); if (t) { setInspectedUnit(null); setTimeout(() => bukaNotaTransaksi(t), 60); } }}
          onEditUnit={handleEditUnit}
          onHapusUnit={handleHapusUnit}
          isPrivacyMode={isPrivacyMode}
        />
      )}
      {fotoUnitTarget && (
        <FotoUnitModal
          unit={stokList.find(u => u.id === fotoUnitTarget.id) || fotoUnitTarget}
          isOpen={true}
          onClose={() => setFotoUnitTarget(null)}
          server={fotoServer}
          onSimpanFoto={(unitId, fotoList) => {
            setStokList(l => l.map(u => u.id === unitId ? { ...u, foto: fotoList } : u));
            toast({ judul: 'Foto unit diperbarui', desk: `${fotoList.length} foto tersimpan.` });
          }}
        />
      )}
      {inspectedTagihan && (
        <DetailTagihanModal
          tagihan={tagihanList.find(t => t.id === inspectedTagihan.id) || inspectedTagihan}
          isOpen={true}
          onClose={() => setInspectedTagihan(null)}
          onSimpanPembayaran={handleBayarTagihan}
          onBukaTransaksi={id => { const t = transaksiList.find(x => x.id === id); if (t) { setInspectedTagihan(null); setTimeout(() => bukaNotaTransaksi(t), 60); } }}
        />
      )}
      {batalTransaksiTarget && (
        <BatalkanTransaksiModal
          isOpen={true}
          onClose={() => setBatalTransaksiTarget(null)}
          transaksi={batalTransaksiTarget}
          onKonfirmasiBatal={handleBatalTransaksi}
        />
      )}
      {isAksMasukOpen && <AksesorisMasukModal onClose={() => setIsAksMasukOpen(false)} onSimpan={handleSimpanAksesorisMasuk} aksesorisList={aksesorisList}
        suppliers={kontakList.filter(k => k.tipe === 'Supplier' || k.tipe === 'Keduanya').map(k => k.nama)}
        onPilihHp={() => { setIsAksMasukOpen(false); setIsBarangMasukOpen(true); }} />}
      {isBarangMasukOpen && <BarangMasukModal onClose={() => setIsBarangMasukOpen(false)} onPilihAksesoris={() => { setIsBarangMasukOpen(false); setIsAksMasukOpen(true); }} onSimpan={handleSimpanBarangMasuk} stokList={stokList} katalog={katalogList} suppliers={kontakList.filter(k => k.tipe === 'Supplier').map(k => k.nama)} />}
      {isJualOpen && (
        <JualModal
          lanjutDraf={lanjutDraf}
          isPrivacyMode={isPrivacyMode}
          onClose={() => setIsJualOpen(false)}
          unitAwal={unitDijual}
          units={stokList}
          aksesoris={aksesorisList}
          kontak={kontakList}
          katalog={katalogList}
          paketBonus={normalisasiPaketBonus(pengaturanServer?.PAKET_BONUS)}
          garansiBaruBulan={garansiBaruPakai}
          nomorNota={nomorDokumen('JUAL', urutanBerikut(transaksiList.map(t => t.id), 'JUAL'))}
          garansiHari={garansiHariPakai}
          onSimpanSukses={handleJualSukses}
        />
      )}
      {isNotaOpen && (
        <NotaModal
          isOpen={true}
          onClose={() => setIsNotaOpen(false)}
          nota={notaAktif}
          toko={tokoNota}
          ukuran={pengaturanServer?.NOTA_UKURAN === '80mm' ? '80mm' : 'A5'}
          pdf={notaPdf}
          onBuatUlangPdf={() => notaAktif && void siapkanPdfNota(notaAktif.noNota, true)}
          onPenjualanBaru={() => { setIsNotaOpen(false); setTimeout(() => bukaJual(null), 80); }}
        />
      )}
    </div>
  );
}
