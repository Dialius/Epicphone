// PengaturanScreen.tsx — S39-S51 Pengaturan Indeks & Semua Submodul
// Profil Toko, Garansi & Nota, Paket Bonus, Ambang, Tampilan, Backup & Pemulihan (PULIHKAN keyword), Konsistensi, Log, & Tentang

import { useEffect, useState } from 'preact/hooks';
import type { Aksesoris } from '../mock/data-contoh';
import { IconShield, IconDatabase, IconAlertTriangle, IconPlus, IconClose } from '../components/Icons';
import { ModalShell } from '../components/ModalShell';
import { Field } from '../components/ui/Form';

export interface ItemBonusPreset {
  sku?: string;
  nama: string;
  qty: number;
}

export interface PaketBonusPreset {
  id: string;
  nama: string;
  deskripsi?: string;
  items: ItemBonusPreset[];
  aktif?: boolean;
}

export const DEFAULT_PAKET_BONUS: PaketBonusPreset[] = [
  {
    id: 'p1',
    nama: 'Paket Dasar',
    items: [
      { nama: 'Tempered Glass Layar 9H', qty: 1 },
      { nama: 'Casing Silikon Bening', qty: 1 },
    ],
    aktif: true,
  },
  {
    id: 'p2',
    nama: 'Paket Lengkap VIP',
    items: [
      { nama: 'Tempered Glass Layar 9H', qty: 1 },
      { nama: 'Casing Silikon Bening', qty: 1 },
      { nama: 'Kabel Fast Charging', qty: 1 },
    ],
    aktif: true,
  },
];

const ITEM_BONUS_STANDAR = [
  'Tempered Glass Layar 9H',
  'Casing Silikon Bening',
  'Kabel Fast Charging',
  'Gratis Pindah Data',
  'Adaptor Quick Charge',
];

const SHORTCUT_SECTIONS = [
  {
    t: '1. Navigasi Global',
    s: [
      { d: 'Ciutkan Sidebar', k: 'Ctrl+B / [' },
      { d: 'Menu Cepat', k: 'N' },
      { d: 'Cari Global', k: '/' },
      { d: 'Privasi', k: 'P' },
      { d: 'Tutup Pop-up', k: 'Esc' },
    ],
  },
  {
    t: '2. Menu Cepat (N)',
    s: [
      { d: 'Kasir Penjualan', k: 'J' },
      { d: 'Barang Masuk', k: 'B' },
      { d: 'Servis Masuk', k: 'S' },
      { d: 'Terima Piutang', k: 'P' },
    ],
  },
  {
    t: '3. Navigasi Tabel',
    s: [
      { d: 'Pindah Baris', k: '↓ / ↑' },
      { d: 'Buka Detail / Aksi', k: 'Enter / Spasi' },
      { d: 'Pindah Kolom', k: 'Tab' },
    ],
  },
];

export interface LogItemServer { tanggal: string; jam: string; aksi: string; sheet: string; id: string; ringkasan: string }
export interface HasilKonsistensiUI {
  ok: boolean;
  selisih: Array<{ kode: string; sheet: string; id: string; pesan: string }>;
  diperiksa: { penjualan: number; pembelian: number; unitAktif: number; tagihan: number; aksesoris: number };
  nilaiStok: number;
  waktu: string;
}
export interface StatusSistemUI {
  trigger: { aktif: number; total: number; hilang: string[] };
  drive: { terpakaiGB: number; batasGB: number };
  versi: string; versiSkema: string; baris: Record<string, number>;
}
export interface InfoBackupUI { id: string; nama: string; jenis: string; tanggal: string }

/** Hubungan ke server (mode nyata). Tanpa ini layar berjalan sebagai demo dengan contoh. */
export interface ServerPengaturan {
  simpan: (pasangan: Record<string, string>) => Promise<boolean>;
  muatLog: () => Promise<LogItemServer[]>;
  backupSekarang: () => Promise<boolean>;
  cekKonsistensi: () => Promise<HasilKonsistensiUI | null>;
  muatStatus: () => Promise<StatusSistemUI | null>;
  muatBackup: () => Promise<InfoBackupUI[]>;
}

interface Props {
  server?: ServerPengaturan;
  /** Nilai dari sheet Pengaturan */
  pengaturan?: Record<string, string>;
  statusBackup?: { ok: boolean; terakhir: string; pesan: string } | null;
  subSection?: string;
  isDark: boolean;
  onToggleTheme: () => void;
  density: 'nyaman' | 'padat';
  onChangeDensity: (d: 'nyaman' | 'padat') => void;
  isPrivacyMode: boolean;
  onTogglePrivacy: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  aksesorisList?: Aksesoris[];
}

export function PengaturanScreen({
  server,
  pengaturan,
  statusBackup,
  subSection = 'indeks',
  isDark,
  onToggleTheme,
  density,
  onChangeDensity,
  isPrivacyMode,
  onTogglePrivacy,
  onShowToast,
  aksesorisList = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<string>(subSection === 'backup' ? 'backup' : subSection === 'tentang' ? 'tentang' : 'profil');

  // S40 Profil State
  const P = pengaturan ?? {};
  const [namaToko, setNamaToko] = useState(P.NAMA_TOKO ?? '');
  const [tagline, setTagline] = useState(P.TAGLINE ?? '');
  const [alamat, setAlamat] = useState(P.ALAMAT ?? '');
  const [noWa, setNoWa] = useState(P.NO_WA ?? '');
  const [ig, setIg] = useState(P.INSTAGRAM ?? '');
  const [menyimpan, setMenyimpan] = useState(false);

  // S41 Garansi & Nota State
  const [garansiBaru, setGaransiBaru] = useState(P.GARANSI_BARU_BULAN ?? '12');
  const [garansiBekas, setGaransiBekas] = useState(P.GARANSI_BEKAS_HARI ?? '7');
  const [garansiAcc, setGaransiAcc] = useState(P.GARANSI_AKSESORIS_HARI ?? '3');
  const [ukuranNota, setUkuranNota] = useState<'A5' | '80mm'>(P.NOTA_UKURAN === '80mm' ? '80mm' : 'A5');
  const [syaratGaransi, setSyaratGaransi] = useState(P.SYARAT_GARANSI ?? 'Segel baut toko utuh, tidak ada bekas jatuh/terkena air, bukan kesalahan pemakaian software root.');

  // S42 Paket Bonus State
  const parsePaketBonus = (raw?: string): PaketBonusPreset[] => {
    try {
      const p = raw && JSON.parse(raw);
      if (Array.isArray(p) && p.length) return p;
    } catch {}
    return DEFAULT_PAKET_BONUS;
  };
  const [paketBonusList, setPaketBonusList] = useState<PaketBonusPreset[]>(() => parsePaketBonus(P.PAKET_BONUS));
  const ubahPaket = (pIdx: number, fn: (p: PaketBonusPreset) => PaketBonusPreset) => setPaketBonusList(list => list.map((p, i) => i === pIdx ? fn(p) : p));

  // S43 Ambang Peringatan
  const [ambangUmurStok, setAmbangUmurStok] = useState(P.BATAS_UMUR_STOK_HARI ?? '30');
  const [ambangStokMin, setAmbangStokMin] = useState(P.STOK_MINIMUM_DEFAULT ?? '5');
  const [ambangTempo, setAmbangTempo] = useState(P.AMBANG_TEMPO_HARI ?? '3');

  // Nilai dari server tiba setelah layar dibuka: isi sekali saja, jangan menimpa ketikan pengguna
  const [sinkron, setSinkron] = useState(!!pengaturan);
  useEffect(() => {
    if (!pengaturan || sinkron) return;
    setNamaToko(pengaturan.NAMA_TOKO ?? ''); setTagline(pengaturan.TAGLINE ?? ''); setAlamat(pengaturan.ALAMAT ?? ''); setNoWa(pengaturan.NO_WA ?? '');
    setIg(pengaturan.INSTAGRAM ?? ''); setGaransiBaru(pengaturan.GARANSI_BARU_BULAN ?? '12'); setGaransiBekas(pengaturan.GARANSI_BEKAS_HARI ?? '7');
    setGaransiAcc(pengaturan.GARANSI_AKSESORIS_HARI ?? '3'); setUkuranNota(pengaturan.NOTA_UKURAN === '80mm' ? '80mm' : 'A5');
    setSyaratGaransi(pengaturan.SYARAT_GARANSI ?? ''); setAmbangUmurStok(pengaturan.BATAS_UMUR_STOK_HARI ?? '30');
    setAmbangStokMin(pengaturan.STOK_MINIMUM_DEFAULT ?? '3'); setAmbangTempo(pengaturan.AMBANG_TEMPO_HARI ?? '3');
    if (pengaturan.PAKET_BONUS) setPaketBonusList(parsePaketBonus(pengaturan.PAKET_BONUS));
    setSinkron(true);
  }, [pengaturan]);

  // S45 Backup & Pulihkan State
  const [isPulihkanOpen, setIsPulihkanOpen] = useState(false);
  const [kataKunciPulih, setKataKunciPulih] = useState('');
  const [backupTerakhir, setBackupTerakhir] = useState(server ? (statusBackup?.terakhir || 'Belum ada backup') : 'Hari ini 01:00 WIB (Otomatis)');
  const [backupDaftar, setBackupDaftar] = useState<InfoBackupUI[]>([]);
  const [sedangBackup, setSedangBackup] = useState(false);
  const [logServer, setLogServer] = useState<LogItemServer[] | null>(null);
  const [statusSistem, setStatusSistem] = useState<StatusSistemUI | null>(null);
  const [hasilCek, setHasilCek] = useState<HasilKonsistensiUI | null>(null);

  useEffect(() => { if (server && statusBackup?.terakhir) setBackupTerakhir(statusBackup.terakhir); }, [statusBackup?.terakhir]);
  useEffect(() => {
    if (!server) return;
    if (activeTab === 'log') server.muatLog().then(setLogServer);
    if (activeTab === 'status') server.muatStatus().then(setStatusSistem);
    if (activeTab === 'backup') server.muatBackup().then(setBackupDaftar);
  }, [activeTab]);

  // S46 Konsistensi Data State
  const [cekStatus, setCekStatus] = useState<'belum' | 'proses' | 'selesai'>('belum');

  /** Simpan ke sheet Pengaturan (server) atau hanya menampilkan notifikasi pada mode demo */
  const simpanKe = async (pasangan: Record<string, string>, pesan: string) => {
    if (!server) { onShowToast(pesan); return; }
    if (menyimpan) return;
    setMenyimpan(true);
    const ok = await server.simpan(pasangan);
    setMenyimpan(false);
    onShowToast(ok ? pesan : 'Pengaturan belum tersimpan. Periksa koneksi lalu coba lagi.', ok ? 'success' : 'error');
  };

  const handleSimpanProfil = (e: Event) => {
    e.preventDefault();
    void simpanKe({ NAMA_TOKO: namaToko.trim(), TAGLINE: tagline.trim(), ALAMAT: alamat.trim(), NO_WA: noWa.trim(), INSTAGRAM: ig.trim() }, 'Profil toko berhasil disimpan!');
  };

  const handleBackupSekarang = async () => {
    if (!server) {
      onShowToast('Pencadangan Google Drive dimulai...');
      setTimeout(() => { setBackupTerakhir('Baru saja (Manual)'); onShowToast('Cadangan berhasil disimpan ke Google Drive!'); }, 1200);
      return;
    }
    if (sedangBackup) return;
    setSedangBackup(true);
    onShowToast('Membuat cadangan dan memeriksanya...');
    const ok = await server.backupSekarang();
    setSedangBackup(false);
    if (ok) { setBackupTerakhir('Baru saja (Manual)'); server.muatBackup().then(setBackupDaftar); }
    onShowToast(ok ? 'Cadangan tersimpan dan sudah diverifikasi.' : 'Cadangan gagal dibuat. Cek Log Aktivitas.', ok ? 'success' : 'error');
  };

  const handleKonfirmasiPulihkan = (e: Event) => {
    e.preventDefault();
    if (kataKunciPulih !== 'PULIHKAN') return;
    if (server) {
      setIsPulihkanOpen(false); setKataKunciPulih('');
      onShowToast('Pemulihan dijalankan dari editor Apps Script (fungsi pulihkanDariBackup) agar tidak terjadi tanpa sengaja. Lihat README.', 'error');
      return;
    }
    setIsPulihkanOpen(false);
    setKataKunciPulih('');
    onShowToast('Data berhasil dipulihkan dari cadangan pengaman!');
  };

  const handleJalankanPemeriksaan = async () => {
    if (server) {
      setCekStatus('proses');
      const h = await server.cekKonsistensi();
      setHasilCek(h);
      setCekStatus(h ? 'selesai' : 'belum');
      onShowToast(!h ? 'Pemeriksaan gagal dijalankan. Coba lagi.' : h.ok ? 'Pemeriksaan selesai. Semua data sinkron!' : `Ditemukan ${h.selisih.length} selisih. Lihat daftar di bawah.`, h && !h.ok ? 'error' : 'success');
      return;
    }
    setCekStatus('proses');
    setTimeout(() => {
      setCekStatus('selesai');
      onShowToast('Pemeriksaan konsistensi selesai. Semua data sinkron!');
    }, 800);
  };

  return (
    <div class="page-container">
      

      {/* Tabs Menu Submodul (S39 Indeks) */}
      <div class="filter-chip-row" role="tablist" aria-label="Pengaturan">
        {[
          { key: 'profil', label: 'Profil Toko' },
          { key: 'nota', label: 'Garansi & Nota' },
          { key: 'bonus', label: 'Paket Bonus' },
          { key: 'ambang', label: 'Ambang Batas' },
          { key: 'tampilan', label: 'Tampilan' },
          { key: 'shortcut', label: 'Pintasan Keyboard' },
          { key: 'backup', label: 'Backup & Pulihkan' },
          { key: 'konsistensi', label: 'Cek Konsistensi' },
          { key: 'log', label: 'Log Aktivitas' },
          { key: 'status', label: 'Status Sistem' },
          { key: 'tentang', label: 'Tentang' },
        ].map(item => (
          <button
            key={item.key}
            role="tab"
            aria-selected={activeTab === item.key}
            aria-controls={`panel-${item.key}`}
            id={`tab-${item.key}`}
            class={`filter-chip ${activeTab === item.key ? 'aktif' : ''}`}
            onClick={() => setActiveTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Submodul Content Area */}
      <div class="max-w-[680px] w-full">
        {/* S40: Profil Toko */}
        {activeTab === 'profil' && (
          <div class="card" id="panel-profil" role="tabpanel" aria-labelledby="tab-profil" tabIndex={0}>
            <h2 class="panel-title">Profil toko dan informasi nota</h2>
            <p class="panel-desc">Tampil di kop nota dan laporan yang dicetak.</p>
            <form onSubmit={handleSimpanProfil} class="form-stack">
              <div>
                <label class="form-label" htmlFor="input-nama-toko">Nama Toko</label>
                <input
                  id="input-nama-toko"
                  type="text"
                  class="form-input"
                  value={namaToko}
                  onInput={e => setNamaToko((e.target as HTMLInputElement).value)}
                  required
                />
              </div>

              <div>
                <label class="form-label" htmlFor="input-tagline">Slogan / Tagline</label>
                <input
                  id="input-tagline"
                  type="text"
                  class="form-input"
                  value={tagline}
                  onInput={e => setTagline((e.target as HTMLInputElement).value)}
                />
              </div>

              <div>
                <label class="form-label" htmlFor="input-alamat">Alamat Lengkap</label>
                <input
                  id="input-alamat"
                  type="text"
                  class="form-input"
                  value={alamat}
                  onInput={e => setAlamat((e.target as HTMLInputElement).value)}
                  required
                />
              </div>

              <div class="form-grid2 stack-sm">
                <div>
                  <label class="form-label" htmlFor="input-no-wa">Nomor WhatsApp Toko</label>
                  <input
                    id="input-no-wa"
                    type="text"
                    class="form-input"
                    value={noWa}
                    onInput={e => setNoWa((e.target as HTMLInputElement).value)}
                    required
                />
                </div>
                <div>
                  <label class="form-label" htmlFor="input-ig">Instagram Toko</label>
                  <input
                    id="input-ig"
                    type="text"
                    class="form-input"
                    value={ig}
                    onInput={e => setIg((e.target as HTMLInputElement).value)}
                  />
                </div>
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-primary">Simpan perubahan profil</button>
              </div>
            </form>
          </div>
        )}

        {/* S41: Garansi & Nota */}
        {activeTab === 'nota' && (
          <div class="card flex flex-col gap-4" id="panel-nota" role="tabpanel" aria-labelledby="tab-nota" tabIndex={0}>
            <h2 class="title-md">Konfigurasi Masa Garansi & Nota</h2>

            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="form-label" htmlFor="input-garansi-baru">Garansi Baru (Bln)</label>
                <input
                  id="input-garansi-baru"
                  type="number"
                  class="form-input"
                  value={garansiBaru}
                  onInput={e => setGaransiBaru((e.target as HTMLInputElement).value)}
                />
              </div>
              <div>
                <label class="form-label" htmlFor="input-garansi-bekas">Garansi Bekas (Hari)</label>
                <input
                  id="input-garansi-bekas"
                  type="number"
                  class="form-input"
                  value={garansiBekas}
                  onInput={e => setGaransiBekas((e.target as HTMLInputElement).value)}
                />
              </div>
              <div>
                <label class="form-label" htmlFor="input-garansi-acc">Aksesoris (Hari)</label>
                <input
                  id="input-garansi-acc"
                  type="number"
                  class="form-input"
                  value={garansiAcc}
                  onInput={e => setGaransiAcc((e.target as HTMLInputElement).value)}
                />
              </div>
            </div>

            <div>
              <label class="form-label">Ukuran Kertas Nota Standar</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class={`btn ${ukuranNota === 'A5' ? 'btn-primary' : 'btn-secondary'} h-10 justify-center`}
                  onClick={() => setUkuranNota('A5')}

                >
                  A5 Portrait (Resmi Toko)
                </button>
                <button
                  type="button"
                  class={`btn ${ukuranNota === '80mm' ? 'btn-primary' : 'btn-secondary'} h-10 justify-center`}
                  onClick={() => setUkuranNota('80mm')}

                >
                  Thermal 80mm (Struk Mini)
                </button>
              </div>
            </div>

            <div>
              <label class="form-label">Syarat Garansi Standar di Bagian Bawah Nota</label>
              <textarea
                class="form-input"
                rows={3}
                value={syaratGaransi}
                onInput={e => setSyaratGaransi((e.target as HTMLTextAreaElement).value)}
              />
            </div>

            <button
              class="btn btn-primary h-11"
              onClick={() => void simpanKe({ GARANSI_BARU_BULAN: garansiBaru, GARANSI_BEKAS_HARI: garansiBekas, GARANSI_AKSESORIS_HARI: garansiAcc, NOTA_UKURAN: ukuranNota, SYARAT_GARANSI: syaratGaransi.trim() }, 'Ketentuan garansi & nota disimpan!')}
            >
              Simpan Pengaturan Nota
            </button>
          </div>
        )}

        {/* S42: Paket Bonus */}
        {activeTab === 'bonus' && (
          <div class="card p-4 flex flex-col gap-4" id="panel-bonus" role="tabpanel" aria-labelledby="tab-bonus" tabIndex={0}>
            <div>
              <h2 class="title-md">Paket Bonus Preset Jual</h2>
              <p class="text-xs text-secondary mt-1">
                Atur paket bonus bundling gratis penjualan HP. Terhubung ke stok aksesoris.
              </p>
            </div>

            <div class="flex flex-col gap-3">
              {paketBonusList.map((paket, pIdx) => (
                <div key={paket.id} class="card bg-surface-2 p-3 flex flex-col gap-3 border border-subtle">
                  <div class="flex-between w-full items-center gap-2">
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        class="form-input font-bold text-sm"
                        value={paket.nama}
                        placeholder="Nama Paket Bonus (misal: Paket Dasar)"
                        onInput={e => ubahPaket(pIdx, p => ({ ...p, nama: (e.target as HTMLInputElement).value }))}
                      />
                    </div>
                    <button
                      type="button"
                      class={`btn btn-sm ${paket.aktif !== false ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => ubahPaket(pIdx, p => ({ ...p, aktif: !p.aktif }))}
                    >
                      {paket.aktif !== false ? 'Aktif' : 'Nonaktif'}
                    </button>
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm text-danger-solid"
                      title="Hapus paket"
                      onClick={() => setPaketBonusList(list => list.filter((_, i) => i !== pIdx))}
                    >
                      <IconClose size={16} />
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      class="form-input text-xs"
                      value={paket.deskripsi || ''}
                      placeholder="Keterangan singkat paket (opsional)"
                      onInput={e => ubahPaket(pIdx, p => ({ ...p, deskripsi: (e.target as HTMLInputElement).value }))}
                    />
                  </div>

                  {/* Daftar item bonus dalam paket ini */}
                  <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-semibold text-secondary">Daftar Item Bonus:</span>
                    {paket.items.length === 0 && (
                      <span class="text-xs text-secondary italic">Belum ada item dalam paket ini.</span>
                    )}
                    {paket.items.map((it, itIdx) => (
                      <div key={itIdx} class="flex items-center gap-2 bg-surface-2 p-2 rounded border border-subtle text-xs">
                        <span style={{ flex: 1, minWidth: 0, fontWeight: 500 }}>
                          {it.nama}
                          {it.sku && <span class="badge badge-neutral" style={{ marginLeft: 8, fontSize: '10px' }}>Stok: {it.sku}</span>}
                        </span>
                        <div class="flex items-center gap-1">
                          <button
                            type="button"
                            class="btn btn-ghost btn-sm"
                            disabled={it.qty <= 1}
                            onClick={() => ubahPaket(pIdx, p => ({ ...p, items: p.items.map((x, j) => j === itIdx ? { ...x, qty: Math.max(1, x.qty - 1) } : x) }))}
                          >−</button>
                          <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 'bold' }}>{it.qty}</span>
                          <button
                            type="button"
                            class="btn btn-ghost btn-sm"
                            onClick={() => ubahPaket(pIdx, p => ({ ...p, items: p.items.map((x, j) => j === itIdx ? { ...x, qty: x.qty + 1 } : x) }))}
                          >+</button>
                        </div>
                        <button
                          type="button"
                          class="icon-btn text-secondary"
                          onClick={() => ubahPaket(pIdx, p => ({ ...p, items: p.items.filter((_, j) => j !== itIdx) }))}
                        >
                          <IconClose size={14} />
                        </button>
                      </div>
                    ))}

                    {/* Tambah item baru ke paket ini */}
                    <div class="flex gap-2 items-center mt-1">
                      <select
                        class="form-select text-xs h-8"
                        style={{ flex: 1 }}
                        onChange={e => {
                          const target = e.target as HTMLSelectElement;
                          const val = target.value;
                          if (!val) return;
                          const isStok = val.startsWith('STOK:');
                          const sku = isStok ? val.slice(5) : '';
                          const aks = isStok ? aksesorisList?.find(a => a.sku === sku) : null;
                          ubahPaket(pIdx, p => ({
                            ...p,
                            items: [...p.items, { sku: aks?.sku, nama: aks ? aks.nama : val, qty: 1 }],
                          }));
                          target.value = '';
                        }}
                      >
                        <option value="">+ Tambah item dari aksesoris stok / preset...</option>
                        {aksesorisList && aksesorisList.filter(a => a.stok > 0).length > 0 && (
                          <optgroup label="Aksesoris Ready di Stok (Potong stok fisik)">
                            {aksesorisList.filter(a => a.stok > 0).map(a => (
                              <option key={a.sku} value={`STOK:${a.sku}`}>
                                {a.nama} (Stok: {a.stok})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="Item Bonus Standar (Tanpa stok fisik)">
                          {ITEM_BONUS_STANDAR.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </optgroup>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div class="flex gap-2">
              <button
                type="button"
                class="btn btn-secondary text-xs h-9 justify-center"
                style={{ flex: 1 }}
                onClick={() => {
                  const baruId = `preset-${Date.now()}`;
                  setPaketBonusList(list => [
                    ...list,
                    {
                      id: baruId,
                      nama: `Paket Bonus ${list.length + 1}`,
                      deskripsi: 'Paket bundling khusus',
                      items: [],
                      aktif: true,
                    }
                  ]);
                }}
              >
                <IconPlus size={16} /> Tambah Paket Bonus Baru
              </button>
              <button
                type="button"
                class="btn btn-ghost text-xs h-9"
                onClick={() => setPaketBonusList(DEFAULT_PAKET_BONUS)}
              >
                Reset Default
              </button>
            </div>

            <div class="banner banner-warning text-xs">
              Peringatan modal bonus aktif pada <strong>50% laba kotor</strong>. Kasir dapat memilih preset langsung saat penjualan.
            </div>

            <button
              type="button"
              class="btn btn-primary h-11"
              disabled={menyimpan}
              onClick={() => void simpanKe({ PAKET_BONUS: JSON.stringify(paketBonusList) }, 'Paket bonus preset berhasil disimpan!')}
            >
              {menyimpan ? <span class="spinner" /> : null} Simpan Pengaturan Paket Bonus
            </button>
          </div>
        )}

        {/* S43: Ambang Peringatan */}
        {activeTab === 'ambang' && (
          <div class="card p-4 flex flex-col gap-3" id="panel-ambang" role="tabpanel" aria-labelledby="tab-ambang" tabIndex={0}>
            <h2 class="title-md">Ambang Batas Peringatan Toko</h2>

            <div>
              <label class="form-label" htmlFor="input-ambang-umur">Batas Umur Stok HP (Hari)</label>
              <input
                id="input-ambang-umur"
                type="number"
                class="form-input"
                value={ambangUmurStok}
                onInput={e => setAmbangUmurStok((e.target as HTMLInputElement).value)}
              />
              <span class="form-hint">Unit HP yang tersimpan melebihi hari ini akan ditandai di Pusat Peringatan.</span>
            </div>

            <div>
              <label class="form-label" htmlFor="input-ambang-stok">Stok Minimum Aksesoris (Pcs)</label>
              <input
                id="input-ambang-stok"
                type="number"
                class="form-input"
                value={ambangStokMin}
                onInput={e => setAmbangStokMin((e.target as HTMLInputElement).value)}
              />
              <span class="form-hint">Peringatan stok menipis otomatis aktif jika jumlah stok di bawah angka ini.</span>
            </div>

            <div>
              <label class="form-label" htmlFor="input-ambang-tempo">Peringatan Jatuh Tempo Tagihan (Hari Sebelum)</label>
              <input
                id="input-ambang-tempo"
                type="number"
                class="form-input"
                value={ambangTempo}
                onInput={e => setAmbangTempo((e.target as HTMLInputElement).value)}
              />
            </div>

            <button
              class="btn btn-primary h-11 mt-1"
              onClick={() => void simpanKe({ BATAS_UMUR_STOK_HARI: ambangUmurStok, STOK_MINIMUM_DEFAULT: ambangStokMin, AMBANG_TEMPO_HARI: ambangTempo }, 'Ambang peringatan disimpan!')}

            >
              Simpan Ambang Peringatan
            </button>
          </div>
        )}

        {/* S44: Tampilan & Kepadatan */}
        {activeTab === 'tampilan' && (
          <div class="card p-4 flex flex-col gap-4">
            <h2 class="title-md">Preferensi Tampilan & Ergonomi</h2>

            <div>
              <label class="form-label">Tema Warna Antarmuka</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class={`btn ${!isDark ? 'btn-primary' : 'btn-secondary'} h-10 justify-center`}
                  onClick={() => { if (isDark) onToggleTheme(); }}

                >
                  Tema Terang (Default Toko)
                </button>
                <button
                  type="button"
                  class={`btn ${isDark ? 'btn-primary' : 'btn-secondary'} h-10 justify-center`}
                  onClick={() => { if (!isDark) onToggleTheme(); }}

                >
                  Tema Gelap (Malam Hari)
                </button>
              </div>
            </div>

            <div>
              <label class="form-label">Kepadatan Tabel Data (Laptop / Desktop)</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class={`btn ${density === 'nyaman' ? 'btn-primary' : 'btn-secondary'} h-10 justify-center`}
                  onClick={() => onChangeDensity('nyaman')}

                >
                  Nyaman (Tinggi Baris 52px)
                </button>
                <button
                  type="button"
                  class={`btn ${density === 'padat' ? 'btn-primary' : 'btn-secondary'} h-10 justify-center`}
                  onClick={() => onChangeDensity('padat')}

                >
                  Padat (Tinggi Baris 40px)
                </button>
              </div>
            </div>

            <div class="border-t border-subtle pt-3">
              <div class="flex-between w-full">
                <div>
                  <strong class="text-sm block">Mode Privasi Angka Modal & Laba</strong>
                  <span class="text-xs text-secondary">
                    Sembunyikan nominal Modal dan laba (ditampilkan sebagai Rp ••• •••) saat melayani pelanggan di meja kasir.
                  </span>
                </div>
                <button
                  class={`btn ${isPrivacyMode ? 'btn-primary' : 'btn-secondary'} h-9 px-3`.trim()}
                  onClick={onTogglePrivacy}
                 
                >
                  {isPrivacyMode ? 'Aktif (Disembunyikan)' : 'Terlihat'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* S44b: Pintasan Keyboard */}
        {activeTab === 'shortcut' && (
          <div class="card p-4 flex flex-col gap-4" id="panel-shortcut" role="tabpanel" aria-labelledby="tab-shortcut" tabIndex={0}>
            <div>
              <h2 class="title-md">Daftar Pintasan Keyboard (Shortcuts)</h2>
              <p class="text-xs text-secondary mt-1">
                Gunakan tombol pintasan keyboard untuk mempercepat transaksi kasir dan navigasi tanpa perlu menyentuh mouse.
              </p>
            </div>

            <div class="flex flex-col gap-3">
              {SHORTCUT_SECTIONS.map(sec => (
                <div key={sec.t} class="card bg-surface-2 p-3 border border-subtle">
                  <strong class="text-sm block mb-2 font-semibold">{sec.t}</strong>
                  <div class="flex flex-col gap-2 text-xs">
                    {sec.s.map((it, idx) => (
                      <div key={it.d} class={`flex-between ${idx < sec.s.length - 1 ? 'border-b border-subtle' : ''}`} style={{ padding: '4px 0' }}>
                        <span>{it.d}</span>
                        <kbd class="pick-key">{it.k}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div class="banner banner-info text-xs">
              <strong>Tips:</strong> Pintasan tombol nonaktif saat mengetik di dalam kotak isian.
            </div>
          </div>
        )}

        {/* S45: Backup & Pemulihan (Section 8.18 - PULIHKAN flow) */}
        {activeTab === 'backup' && (
          <div class="card p-4 flex flex-col gap-4">
            <div class="flex-between w-full">
              <h2 class="title-md">Cadangan & Pemulihan Google Drive</h2>
              {server && statusBackup && !statusBackup.ok
                ? <span class="badge badge-telat">Perlu perhatian</span>
                : <span class="badge badge-ready">Otomatis Aktif</span>}
            </div>

            <div class="card bg-surface-2 p-3 border border-subtle">
              <div class="flex items-center gap-2">
                <IconShield size={20} class="text-brand-green" />
                <div>
                  <strong class="text-sm">Status Pencadangan Google Drive</strong>
                  <div class="text-xs text-secondary mt-0.5">
                    Pencadangan terakhir: <strong>{backupTerakhir}</strong>
                  </div>
                  {server && statusBackup && <div class="text-xs mt-0.5">{statusBackup.pesan}</div>}
                </div>
              </div>
            </div>

            <div class="flex gap-2">
              <button class="btn btn-primary flex-1 h-11" onClick={handleBackupSekarang} disabled={sedangBackup}>
                <IconDatabase size={18} />
                <span>{sedangBackup ? 'Mencadangkan…' : 'Cadangkan Sekarang'}</span>
              </button>

              <button
                class="btn btn-danger flex-1 h-11"
                onClick={() => setIsPulihkanOpen(true)}

              >
                <span>Pulihkan dari Cadangan</span>
              </button>
            </div>

            <div>
              <h3 class="title-sm mb-2">Riwayat Salinan Cadangan (Google Drive)</h3>
              <div class="flex flex-col gap-1 text-xs">
                {server ? (
                  <>
                    {backupDaftar.map(b => (
                      <div key={b.id} class="p-2 bg-surface-2 rounded flex justify-between">
                        <span>{b.nama}</span>
                        <span class="badge">{b.jenis} • {b.tanggal}</span>
                      </div>
                    ))}
                    {backupDaftar.length === 0 && <span class="text-secondary">Belum ada salinan cadangan.</span>}
                  </>
                ) : (
                  <span class="text-xs text-secondary">Belum ada salinan cadangan.</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* S46: Cek Konsistensi */}
        {activeTab === 'konsistensi' && (
          <div class="card p-4 flex flex-col gap-3">
            <h2 class="title-md">Cek Konsistensi Integritas Database</h2>
            <p class="text-xs text-secondary">
              Memeriksa kesesuaian antara sheet Transaksi, Stok_HP, Tagihan, dan Riwayat Pembayaran di Google Sheets.
            </p>

            <button class="btn btn-primary h-10 justify-center"
              onClick={handleJalankanPemeriksaan}
            >
              {cekStatus === 'proses' ? 'Memeriksa Data...' : 'Jalankan Pemeriksaan Konsistensi'}
            </button>

            {cekStatus === 'selesai' && server && hasilCek && (
              <div class="flex flex-col gap-2 mt-1" role="status">
                <div class={`card p-3 ${hasilCek.ok ? 'bg-ready' : 'bg-telat'}`}>
                  <strong class="text-xs">{hasilCek.ok ? 'Semua data sinkron' : `${hasilCek.selisih.length} selisih ditemukan`}</strong>
                  <div class="text-xs mt-0.5">
                    Diperiksa {hasilCek.waktu}: {hasilCek.diperiksa.penjualan} penjualan, {hasilCek.diperiksa.pembelian} pembelian, {hasilCek.diperiksa.unitAktif} unit aktif, {hasilCek.diperiksa.tagihan} tagihan, {hasilCek.diperiksa.aksesoris} aksesoris.
                  </div>
                </div>
                {hasilCek.selisih.slice(0, 50).map((x, i) => (
                  <div key={i} class="card p-3 bg-surface-2 border border-subtle text-xs">
                    <strong>[{x.sheet}] {x.id}</strong> <span class="badge">{x.kode}</span>
                    <div class="mt-0.5">{x.pesan}</div>
                  </div>
                ))}
              </div>
            )}
            {cekStatus === 'selesai' && !server && (
              <div class="card p-3 bg-surface-2 mt-1">
                <span class="text-xs text-secondary">Pemeriksaan konsistensi membutuhkan koneksi server aktif.</span>
              </div>
            )}
          </div>
        )}

        {/* S49: Log Aktivitas */}
        {activeTab === 'log' && (
          <div class="card" id="panel-log" role="tabpanel" aria-labelledby="tab-log" tabIndex={0}>
            <h2 class="panel-title">Log aktivitas dan audit trail</h2>
            <p class="panel-desc">Riwayat perubahan data terbaru, paling baru di atas.</p>
            <div class="card-list">
              {logServer === null && <span class="text-xs text-secondary">Memuat log…</span>}
              {logServer && logServer.length === 0 && <span class="text-xs text-secondary">Belum ada aktivitas tercatat di database.</span>}
              {(logServer ?? []).map((l, i) => ({ id: `L${i}`, tanggal: l.tanggal, jam: l.jam, aksi: l.aksi, sheet: l.sheet, idData: l.id, ringkasan: l.ringkasan })).map(log => (
                <div key={log.id} class="list-item">
                  <div class="list-item-head">
                    <span class="badge badge-neutral">{log.aksi}</span>
                    <time dateTime={`${log.tanggal}T${log.jam}`} class="text-xs text-tertiary">{log.tanggal} {log.jam}</time>
                  </div>
                  <p class="list-item-body">
                    <strong>[{log.sheet}] {log.idData}:</strong> {log.ringkasan}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* S50: Status Sistem */}
        {activeTab === 'status' && (
          <div class="card p-4 flex flex-col gap-3" id="panel-status" role="tabpanel" aria-labelledby="tab-status" tabIndex={0}>
            <h2 class="title-md">Status Sistem & Kuota Layanan</h2>
            {server ? (
              statusSistem ? (
                <div class="grid grid-cols-auto-fit gap-2">
                  <div class="card p-3 bg-surface-2">
                    <span class="text-secondary text-xs">Trigger otomatis</span>
                    <div class={`text-uang text-xl mt-1 ${statusSistem.trigger.aktif === statusSistem.trigger.total ? 'text-brand-green-700' : 'text-danger'}`}>{statusSistem.trigger.aktif} / {statusSistem.trigger.total} Aktif</div>
                    {statusSistem.trigger.hilang.length > 0 && <div class="text-xs mt-1">Belum terpasang: {statusSistem.trigger.hilang.join(', ')}. Jalankan setupAwal() lagi.</div>}
                  </div>
                  <div class="card p-3 bg-surface-2">
                    <span class="text-secondary text-xs">Penyimpanan Google Drive</span>
                    <div class="text-uang text-xl mt-1">{statusSistem.drive.terpakaiGB} GB / {statusSistem.drive.batasGB} GB</div>
                  </div>
                  <div class="card p-3 bg-surface-2">
                    <span class="text-secondary text-xs">Versi skema sheet</span>
                    <div class="text-uang text-xl mt-1">{statusSistem.versiSkema || '-'}</div>
                  </div>
                  <div class="card p-3 bg-surface-2">
                    <span class="text-secondary text-xs">Baris data</span>
                    <div class="text-xs mt-1">{Object.entries(statusSistem.baris).map(([n, v]) => `${n.replace('_', ' ')}: ${v}`).join(' · ')}</div>
                  </div>
                </div>
              ) : <span class="text-xs text-secondary">Memeriksa sistem…</span>
            ) : (
              <div class="grid grid-cols-auto-fit gap-2">
                <div class="card p-3 bg-surface-2"><span class="text-secondary text-xs">Status sistem</span><div class="text-xs mt-1">Status trigger, Drive, dan baris data terhubung langsung ke Google Sheets.</div></div>
              </div>
            )}
          </div>
        )}

        {/* S51: Tentang */}
        {activeTab === 'tentang' && (
          <div class="card p-4 flex flex-col gap-3">
            <h2 class="title-md">Tentang Sistem EPICPHONE</h2>
            <div class="text-sm text-secondary leading-relaxed">
              <strong>EPICPHONE Versi 1.0.0</strong><br />
              Sistem Manajemen Inventaris HP, Kasir Penjualan, & Laporan Keuangan Toko.<br />
              Dikembangkan khusus untuk <strong>Epic Phone Purwokerto</strong>.<br />
              Database: Google Sheets & Google Drive Storage via Apps Script.
            </div>

            <div class="card bg-surface-2 p-3 mt-2">
              <strong class="text-xs uppercase">Pintasan Keyboard Laptop:</strong>
              <ul class="list-none mt-1 text-xs flex flex-col gap-1">
                <li><code>/</code> : Buka Pencarian Global Cepat</li>
                <li><code>N</code> : Buka Menu Transaksi Baru (+)</li>
                <li><code>Esc</code> : Tutup Dialog / Panel Terbuka</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* S45 Dialog Pemulihan Aman (wajib mengetik 'PULIHKAN') */}
      {isPulihkanOpen && (
        <ModalShell onClose={() => { setIsPulihkanOpen(false); setKataKunciPulih(''); }} title="Konfirmasi pemulihan data" subtitle="Tindakan ini menggantikan data aktif" size="sm" initialFocus="#input-kata-kunci-pulih"
          footer={<>
            <button type="button" class="btn btn-secondary" onClick={() => { setIsPulihkanOpen(false); setKataKunciPulih(''); }}>Batal</button>
            <button type="submit" form="form-pulihkan" class="btn btn-danger" disabled={kataKunciPulih !== 'PULIHKAN'}>Pulihkan sekarang</button>
          </>}>
          <form id="form-pulihkan" class="form-stack" onSubmit={handleKonfirmasiPulihkan} autoComplete="off">
            <div class="banner banner-danger" role="alert" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <IconAlertTriangle size={20} />
              <div>
                <strong>Peringatan keamanan</strong>
                <p style={{ marginTop: 2 }}>Memulihkan data akan menggantikan data aktif saat ini dengan salinan cadangan. Sistem membuat salinan pengaman otomatis terlebih dahulu.</p>
              </div>
            </div>
            <Field id="input-kata-kunci-pulih" label="Ketik PULIHKAN dengan huruf besar untuk mengonfirmasi" hint={kataKunciPulih && kataKunciPulih !== 'PULIHKAN' ? 'Belum cocok. Harus persis PULIHKAN.' : undefined}>
              <input id="input-kata-kunci-pulih" type="text" class="form-input" placeholder="PULIHKAN" value={kataKunciPulih} autoCapitalize="characters" spellcheck={false}
                onInput={e => setKataKunciPulih((e.target as HTMLInputElement).value)} />
            </Field>
          </form>
        </ModalShell>
      )}
    </div>
  );
}