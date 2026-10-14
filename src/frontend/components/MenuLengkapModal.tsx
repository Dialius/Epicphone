// MenuLengkapModal.tsx — menu lengkap di HP: semua halaman yang tidak ada di bilah bawah + tema + privasi.
import { ModalShell } from './ModalShell';
import { IconWrench, IconShield, IconInvoice, IconBanknote, IconChart, IconUsers, IconTag, IconSettings, IconMoon, IconSun, IconEye, IconEyeOff } from './Icons';

interface Props {
  onClose: () => void;
  onNavigasi: (route: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isPrivacy: boolean;
  onTogglePrivacy: () => void;
  badge?: Record<string, number>;
}

const UBIN = [
  { id: 'servis', judul: 'Servis', desk: 'HP toko dan HP pelanggan', ikon: <IconWrench size={22} /> },
  { id: 'garansi', judul: 'Garansi dan Retur', desk: 'Cek garansi, klaim, retur', ikon: <IconShield size={22} /> },
  { id: 'tagihan', judul: 'Tagihan', desk: 'Piutang dan hutang', ikon: <IconInvoice size={22} /> },
  { id: 'biaya', judul: 'Biaya Operasional', desk: 'Sewa, listrik, gaji, dll', ikon: <IconBanknote size={22} /> },
  { id: 'laporan', judul: 'Laporan', desk: 'Laba, arus kas, stok', ikon: <IconChart size={22} /> },
  { id: 'kontak', judul: 'Kontak', desk: 'Pelanggan dan supplier', ikon: <IconUsers size={22} /> },
  { id: 'katalog', judul: 'Katalog Produk', desk: 'Model dan harga acuan', ikon: <IconTag size={22} /> },
  { id: 'pengaturan', judul: 'Pengaturan', desk: 'Toko, nota, backup', ikon: <IconSettings size={22} /> },
];

export function MenuLengkapModal({ onClose, onNavigasi, isDark, onToggleTheme, isPrivacy, onTogglePrivacy, badge = {} }: Props) {
  return (
    <ModalShell onClose={onClose} title="Menu" subtitle="Semua halaman" size="md">
      <div class="menu-tile-grid">
        {UBIN.map(u => (
          <button key={u.id} type="button" class="menu-nav-tile" onClick={() => onNavigasi(u.id)}>
            <span class="menu-icon-circle">{u.ikon}</span>
            <span class="menu-tile-title">{u.judul}</span>
            <span class="menu-tile-desc">{u.desk}</span>
            {(badge[u.id] || 0) > 0 && <span class="lencana menu-tile-badge" aria-label={`${badge[u.id]} perlu perhatian`}>{badge[u.id]}</span>}
          </button>
        ))}
      </div>
      <div class="card" style={{ padding: '4px 16px' }}>
        <div class="toggle-row">
          <span class="row" style={{ gap: '12px' }}>{isDark ? <IconMoon size={20} /> : <IconSun size={20} />}<span><strong style={{ fontSize: 'var(--text-sm)' }}>Tema gelap</strong><br /><span class="title-sub">Nyaman untuk ruangan redup</span></span></span>
          <input type="checkbox" role="switch" checked={isDark} onChange={onToggleTheme} aria-label="Tema gelap" />
        </div>
        <div class="toggle-row" style={{ borderTop: '1px solid var(--border)' }}>
          <span class="row" style={{ gap: '12px' }}>{isPrivacy ? <IconEyeOff size={20} /> : <IconEye size={20} />}<span><strong style={{ fontSize: 'var(--text-sm)' }}>Sembunyikan angka</strong><br /><span class="title-sub">Samarkan modal, laba, dan omzet</span></span></span>
          <input type="checkbox" role="switch" checked={isPrivacy} onChange={onTogglePrivacy} aria-label="Sembunyikan angka" />
        </div>
      </div>
    </ModalShell>
  );
}
