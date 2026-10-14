// TransaksiModal.tsx — pemilih aksi cepat (tombol Transaksi baru / +).
// Pintasan J B S P berlaku saat pemilih terbuka.
import { useEffect } from 'preact/hooks';
import { ModalShell } from './ModalShell';
import { IconReceipt, IconBox, IconWrench, IconBanknote, IconChevronRight } from './Icons';

type Aksi = 'jual' | 'barang-masuk' | 'servis' | 'bayar' | 'biaya';
interface Props {
  onClose: () => void;
  onPilih: (aksi: Aksi) => void;
  draf?: { ringkas: string } | null;
  onLanjutDraf?: () => void;
}

const DAFTAR = [
  { id: 'jual', kunci: 'J', judul: 'Penjualan baru', sub: 'Jual HP atau aksesoris, tambah bonus, cetak nota', ikon: <IconReceipt size={22} />, warna: 'ok' },
  { id: 'barang-masuk', kunci: 'B', judul: 'Barang masuk', sub: 'Beli HP dari supplier atau beli putus dari pelanggan', ikon: <IconBox size={22} />, warna: 'info' },
  { id: 'servis', kunci: 'S', judul: 'Terima servis', sub: 'Servis HP toko atau HP milik pelanggan', ikon: <IconWrench size={22} />, warna: 'warn' },
  { id: 'bayar', kunci: 'P', judul: 'Terima pembayaran', sub: 'Pelanggan setor cicilan atau melunasi piutang', ikon: <IconBanknote size={22} />, warna: 'mute' },
] as const;

export function TransaksiModal({ onClose, onPilih, draf, onLanjutDraf }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const d = DAFTAR.find(x => x.kunci.toLowerCase() === e.key.toLowerCase());
      if (d) { e.preventDefault(); onPilih(d.id as Aksi); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onPilih]);

  return (
    <ModalShell onClose={onClose} title="Transaksi baru" subtitle="Pilih yang ingin dicatat" size="sm" initialFocus=".pick-card">
      {draf && onLanjutDraf && (
        <button type="button" class="pick-card pick-draf" onClick={onLanjutDraf}>
          <span class="pick-ico pick-ok"><IconReceipt size={22} /></span>
          <span class="pick-text"><strong>Lanjutkan draf penjualan</strong><span>{draf.ringkas}</span></span>
          <IconChevronRight size={18} />
        </button>
      )}
      {DAFTAR.map(d => (
        <button key={d.id} type="button" class="pick-card" onClick={() => onPilih(d.id as Aksi)}>
          <span class={`pick-ico pick-${d.warna}`}>{d.ikon}</span>
          <span class="pick-text"><strong>{d.judul}</strong><span>{d.sub}</span></span>
          <kbd class="pick-key" aria-hidden="true">{d.kunci}</kbd>
        </button>
      ))}
    </ModalShell>
  );
}
