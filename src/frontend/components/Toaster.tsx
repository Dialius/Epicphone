// Toaster.tsx — render antrean toast (live region, jeda saat hover/fokus, tombol tutup 44px).
import { useEffect, useState } from 'preact/hooks';
import { IconCheckCircle, IconAlertCircle, IconAlertTriangle, IconInfo, IconClose } from './Icons';
import { subscribeToast, getToasts, tutupToast, jedaToast, lanjutToast, ToastItem } from '../lib/toast';

function Ikon({ tipe }: { tipe: ToastItem['tipe'] }) {
  if (tipe === 'success') return <IconCheckCircle size={20} />;
  if (tipe === 'error') return <IconAlertCircle size={20} />;
  if (tipe === 'warning') return <IconAlertTriangle size={20} />;
  return <IconInfo size={20} />;
}

export function Toaster() {
  const [, tick] = useState(0);
  useEffect(() => subscribeToast(() => tick(n => n + 1)), []);
  const items = getToasts();
  return (
    <div class="toaster" aria-live="polite" aria-atomic="false" role="region" aria-label="Notifikasi">
      {items.map(t => (
        <div
          key={t.id}
          class={`toast toast-${t.tipe}`}
          role={t.tipe === 'error' ? 'alert' : 'status'}
          onMouseEnter={() => jedaToast(t.id)}
          onMouseLeave={() => lanjutToast(t.id)}
          onFocusIn={() => jedaToast(t.id)}
          onFocusOut={() => lanjutToast(t.id)}
        >
          <span class="toast-icon"><Ikon tipe={t.tipe} /></span>
          <div class="toast-body">
            <div class="toast-title">{t.judul}{t.jumlah > 1 ? ` (${t.jumlah}x)` : ''}</div>
            {t.desk && <div class="toast-desc">{t.desk}</div>}
          </div>
          {t.aksi && (
            <button type="button" class="toast-action" onClick={() => { t.aksi!.onClick(); tutupToast(t.id); }}>{t.aksi.label}</button>
          )}
          <button type="button" class="toast-close-btn" onClick={() => tutupToast(t.id)} aria-label="Tutup notifikasi"><IconClose size={16} /></button>
        </div>
      ))}
    </div>
  );
}
