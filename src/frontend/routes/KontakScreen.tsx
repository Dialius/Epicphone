import { linkWa, normalisasiWa } from '../lib/format';
// KontakScreen.tsx — S37 Kontak (Pelanggan & Supplier)
// Master contact registry, initial avatars, copy WA number, & transaction history tabs

import { useState } from 'preact/hooks';
import { toast } from '../lib/toast';
import type { KontakItem } from '../mock/data-contoh';
import { IconSearch, IconPlus, IconClose, IconCopy, IconCheck, IconReceipt } from '../components/Icons';

interface Props {
  kontakList?: KontakItem[];
  onTambahKontak?: (k: KontakItem) => void;
  onBukaRiwayatTransaksi?: (nama: string) => void;
}

export function KontakScreen({ kontakList = [], onTambahKontak, onBukaRiwayatTransaksi }: Props) {
  const daftar = kontakList; // dikendalikan app: data tidak hilang saat pindah tab
  const [filterTipe, setFilterTipe] = useState<'Semua' | 'Pelanggan' | 'Supplier'>('Semua');
  const [query, setQuery] = useState('');
  const [selectedKontak, setSelectedKontak] = useState<KontakItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);

  // Form State
  const [nama, setNama] = useState('');
  const [tipe, setTipe] = useState<'Pelanggan' | 'Supplier'>('Pelanggan');
  const [noWa, setNoWa] = useState('');
  const [alamat, setAlamat] = useState('');
  const [catatan, setCatatan] = useState('');

  const terfilter = daftar.filter(k => {
    if (filterTipe !== 'Semua' && k.tipe !== filterTipe && k.tipe !== 'Keduanya') return false; // 'Keduanya' muncul di kedua daftar
    if (query) {
      const q = query.toLowerCase();
      const match = k.nama.toLowerCase().includes(q) || k.noWa.includes(q) || k.alamat.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleCopyWa = (nomor: string) => {
    navigator.clipboard?.writeText(nomor);
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2000);
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!nama.trim()) return;

    const baru: KontakItem = {
      id: `KTK-${String(daftar.reduce((m, k) => Math.max(m, parseInt(k.id.replace(/\D/g, ''), 10) || 0), 0) + 1).padStart(4, '0')}`,
      nama,
      tipe,
      noWa: noWa || '-',
      alamat: alamat || 'Purwokerto',
      totalTransaksi: 0,
      catatan,
      aktif: true,
    };

    const digit = (s: string) => s.replace(/\D/g, '');
    const dobel = noWa.trim() && daftar.find(k => digit(k.noWa) && digit(k.noWa) === digit(noWa));
    if (dobel) { toast({ tipe: 'warning', judul: 'Nomor WA sudah terdaftar', desk: `Dipakai oleh ${dobel.nama}.` }); return; }
    if (onTambahKontak) onTambahKontak(baru);
    setIsFormOpen(false);
    setNama('');
    setNoWa('');
    setAlamat('');
    setCatatan('');
  };

  return (
    <div class="page-container">
      {/* Header */}
      <div class="flex-between w-full">
        <button class="btn btn-primary" onClick={() => setIsFormOpen(true)}>
          <IconPlus size={16} />
          <span>Kontak Baru</span>
        </button>
      </div>

      {/* Tabs Filter Tipe */}
      <div class="filter-chip-row" role="group">
        {(['Semua', 'Pelanggan', 'Supplier'] as const).map(t => (
          <button
            key={t}
            class={`filter-chip ${filterTipe === t ? 'aktif' : ''}`}
            onClick={() => setFilterTipe(t)}
          >
            {t === 'Semua' ? 'Semua Kontak' : t === 'Pelanggan' ? 'Pelanggan Toko' : 'Grosir Supplier'}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div class="search-input-box">
        <span class="search-icon-pos">
          <IconSearch size={18} />
        </span>
        <input
          type="text"
          class="search-input"
          placeholder="Cari nama kontak, nomor WhatsApp, atau alamat..."
          value={query}
          onInput={e => setQuery((e.target as HTMLInputElement).value)}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            class="absolute right-3 bg-transparent border-none cursor-pointer text-tertiary"
          >
            <IconClose size={16} />
          </button>
        )}
      </div>

      {/* List Contacts */}
      <div class="grid grid-cols-auto-fill gap-3">
        {terfilter.map(k => {
          const initials = k.nama
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          return (
            <div
              key={k.id}
              class={`card clickable flex items-center gap-3 p-4 ${selectedKontak?.id === k.id ? 'active-card' : ''}`}
              onClick={() => setSelectedKontak(k)}
            >
              <div class="avatar-initials">
                {initials}
              </div>

              <div class="flex-1">
                <div class="flex-between">
                  <strong class="text-sm text-primary">{k.nama}</strong>
                  <span class="badge">{k.tipe}</span>
                </div>
                <div class="text-xs text-secondary mt-1">
                  <span>WA: {k.noWa}</span> • <span>{k.totalTransaksi} transaksi</span>
                </div>
                {normalisasiWa(k.noWa).length >= 10 && (
                  <a class="btn btn-secondary btn-sm mt-2" href={linkWa(k.noWa)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>Chat WhatsApp</a>
                )}
                <div class="text-xs text-tertiary mt-1">
                  {k.alamat}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* S37 Detail Kontak Modal */}
      {selectedKontak && (
        <div class="modal-overlay" onClick={() => setSelectedKontak(null)} role="dialog" aria-modal="true" aria-labelledby="title-detail-kontak">
          <div class="sheet-container max-w-md" onClick={e => e.stopPropagation()}>
            <div class="sheet-header">
              <div class="flex items-center gap-2">
                <div class="avatar-initials w-9 h-9 text-sm">
                  {selectedKontak.nama.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 id="title-detail-kontak" class="title-md">{selectedKontak.nama}</h3>
                  <span class="badge">{selectedKontak.tipe}</span>
                </div>
              </div>
              <button class="btn-icon" onClick={() => setSelectedKontak(null)} aria-label="Tutup">
                <IconClose size={20} />
              </button>
            </div>

            <div class="sheet-body flex flex-col gap-3 text-xs">
              <div class="card p-4 bg-surface-2 border border-subtle">
                <div class="flex-between">
                  <div>
                    <span class="text-secondary">Nomor WhatsApp:</span>
                    <strong class="block text-sm mt-1">{selectedKontak.noWa}</strong>
                  </div>
                  {selectedKontak.noWa !== '-' && (
                    <button class="btn btn-secondary h-8 text-xs" onClick={() => handleCopyWa(selectedKontak.noWa)}>
                      {copiedWa ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      <span>{copiedWa ? 'Tersalin' : 'Salin Nomor'}</span>
                    </button>
                  )}
                </div>

                <div class="border-t border-subtle pt-2 mt-2">
                  <span class="text-secondary">Alamat:</span>
                  <div class="mt-1 text-primary">{selectedKontak.alamat}</div>
                </div>

                <div class="border-t border-subtle pt-2 mt-2">
                  <span class="text-secondary">Total Transaksi:</span>
                  <div><strong>{selectedKontak.totalTransaksi} transaksi</strong> selesai</div>
                </div>
              </div>

              {onBukaRiwayatTransaksi && (
                <button
                  class="btn btn-secondary btn-block"
                  onClick={() => {
                    onBukaRiwayatTransaksi(selectedKontak.nama);
                    setSelectedKontak(null);
                  }}
                >
                  <IconReceipt size={16} />
                  <span>Lihat Riwayat Transaksi Kontak Ini</span>
                </button>
              )}
            </div>

            <div class="sheet-footer">
              <button class="btn btn-secondary btn-block" onClick={() => setSelectedKontak(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Tambah Kontak Modal */}
      {isFormOpen && (
        <div class="modal-overlay" onClick={() => setIsFormOpen(false)} role="dialog" aria-modal="true" aria-labelledby="title-tambah-kontak">
          <div class="sheet-container max-w-sm" onClick={e => e.stopPropagation()}>
            <div class="sheet-header">
              <h2 id="title-tambah-kontak" class="title-md">Kontak baru</h2>
              <button class="btn-icon" onClick={() => setIsFormOpen(false)} aria-label="Tutup">
                <IconClose size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div class="sheet-body flex-col gap-3">
                <div>
                  <label class="form-label">Tipe Kontak</label>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      class={`btn justify-center h-10 ${tipe === 'Pelanggan' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setTipe('Pelanggan')}
                    >
                      Pelanggan
                    </button>
                    <button
                      type="button"
                      class={`btn justify-center h-10 ${tipe === 'Supplier' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setTipe('Supplier')}
                    >
                      Supplier
                    </button>
                  </div>
                </div>

                <div>
                  <label class="form-label">Nama Lengkap / Toko</label>
                  <input
                    type="text"
                    class="form-input"
                    placeholder="Contoh: Budi Santoso atau CV Maju Seluler"
                    value={nama}
                    onInput={e => setNama((e.target as HTMLInputElement).value)}
                    required
                  />
                </div>

                <div>
                  <label class="form-label">Nomor WhatsApp</label>
                  <input
                    type="text"
                    class="form-input"
                    placeholder="Contoh: 0812-3456-7890"
                    value={noWa}
                    onInput={e => setNoWa((e.target as HTMLInputElement).value)}
                  />
                </div>

                <div>
                  <label class="form-label">Alamat / Lokasi</label>
                  <input
                    type="text"
                    class="form-input"
                    placeholder="Contoh: Purwokerto Barat"
                    value={alamat}
                    onInput={e => setAlamat((e.target as HTMLInputElement).value)}
                  />
                </div>

                <div>
                  <label class="form-label">Catatan Tambahan (Opsional)</label>
                  <input
                    type="text"
                    class="form-input"
                    placeholder="Contoh: Langganan tukar tambah / Grosir charger"
                    value={catatan}
                    onInput={e => setCatatan((e.target as HTMLInputElement).value)}
                  />
                </div>
              </div>

              <div class="sheet-footer flex gap-2">
                <button type="button" class="btn btn-secondary flex-1" onClick={() => setIsFormOpen(false)}>
                  Batal
                </button>
                <button type="submit" class="btn btn-primary flex-[2]">
                  Simpan Kontak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
