// Kit.tsx — komponen kecil bersama: EmptyState, FotoUnit (dengan gambar cadangan), PillStatus, Skeleton, Banner.
import { ComponentChildren } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { IconBox, IconImage } from '../Icons';

export function EmptyState({ icon, judul, desk, aksi }: { icon?: ComponentChildren; judul: string; desk?: string; aksi?: ComponentChildren }) {
  return (
    <div class="empty-state">
      <div class="empty-icon">{icon ?? <IconBox size={26} />}</div>
      <h2>{judul}</h2>
      {desk && <p>{desk}</p>}
      {aksi && <div style={{ marginTop: '8px' }}>{aksi}</div>}
    </div>
  );
}

/** Foto unit: bila tidak ada atau gagal dimuat, tampil ikon cadangan dengan fallback otomatis CDN. */
export function FotoUnit({ src, alt, size = 48, radius = 8 }: { src?: string; alt: string; size?: number; radius?: number }) {
  const [gagal, setGagal] = useState(false);
  const [urlAktif, setUrlAktif] = useState(src);

  useEffect(() => {
    setUrlAktif(src);
    setGagal(false);
  }, [src]);

  const tanganiGalat = () => {
    if (urlAktif && urlAktif.includes('lh3.googleusercontent.com/d/')) {
      const id = urlAktif.split('/d/')[1]?.split('?')[0];
      if (id) {
        setUrlAktif(`https://drive.google.com/thumbnail?id=${id}&sz=w800`);
        return;
      }
    }
    setGagal(true);
  };

  const ada = !!urlAktif && !gagal;
  return (
    <div class="foto-box" style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, border: '1px solid var(--border)' }} role="img" aria-label={alt}>
      {ada ? <img src={urlAktif} alt="" loading="lazy" referrerPolicy="no-referrer" onError={tanganiGalat} /> : <IconImage size={Math.round(size * 0.42)} />}
    </div>
  );
}

const KELAS_STATUS: Record<string, string> = {
  Ready: 'badge-ready', Servis: 'badge-servis', Dipesan: 'badge-info', Terjual: 'badge-neutral', Rusak: 'badge-telat', Retur: 'badge-servis',
  Lunas: 'badge-ready', Sebagian: 'badge-servis', Selesai: 'badge-ready', Dibatalkan: 'badge-telat', Aktif: 'badge-info',
  Antri: 'badge-info', Dikerjakan: 'badge-servis', Diambil: 'badge-neutral',
  Belum: 'badge-info', Telat: 'badge-telat', Dibuka: 'badge-info', Diproses: 'badge-servis', Ditolak: 'badge-telat',
};
export function kelasStatus(s: string): string { return KELAS_STATUS[s] || 'badge-neutral'; }
export function PillStatus({ status, label }: { status: string; label?: string }) {
  return <span class={`badge ${kelasStatus(status)}`}>{label ?? status}</span>;
}

export function Skeleton({ h = 16, w = '100%', r }: { h?: number; w?: number | string; r?: number }) {
  return <div class="skeleton" style={{ height: h, width: w, borderRadius: r }} aria-hidden="true" />;
}

export function Banner({ tipe = 'info', icon, children, aksi, class: cls = '' }: { tipe?: 'info' | 'success' | 'warning' | 'danger' | 'neutral'; icon?: ComponentChildren; children: ComponentChildren; aksi?: ComponentChildren; class?: string }) {
  return (
    <div class={`banner banner-${tipe} ${cls}`} role={tipe === 'danger' ? 'alert' : 'status'}>
      {icon}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {aksi && <div class="banner-actions">{aksi}</div>}
    </div>
  );
}

/** <img> dengan cadangan: bila gagal dimuat tampil placeholder, bukan kotak hitam dengan teks alt. */
export function ImgAman({ src, alt, style, class: cls }: { src?: string; alt: string; style?: Record<string, string | number>; class?: string }) {
  const [gagal, setGagal] = useState(false);
  const [urlAktif, setUrlAktif] = useState(src);

  useEffect(() => {
    setUrlAktif(src);
    setGagal(false);
  }, [src]);

  const tanganiGalat = () => {
    if (urlAktif && urlAktif.includes('lh3.googleusercontent.com/d/')) {
      const id = urlAktif.split('/d/')[1]?.split('?')[0];
      if (id) {
        setUrlAktif(`https://drive.google.com/thumbnail?id=${id}&sz=w800`);
        return;
      }
    }
    setGagal(true);
  };

  if (!urlAktif || gagal) {
    return <div class="img-fallback" role="img" aria-label={alt}><IconImage size={40} /><span>Foto tidak tersedia</span></div>;
  }
  return <img src={urlAktif} alt={alt} style={style} class={cls} referrerPolicy="no-referrer" onError={tanganiGalat} />;
}
