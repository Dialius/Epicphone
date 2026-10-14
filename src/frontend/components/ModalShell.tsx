// ModalShell.tsx — pembungkus tunggal untuk semua modal/sheet (K-05).
// Fokus masuk + terjebak + kembali ke pemicu, Esc/Back menutup hanya yang teratas,
// scroll body dikunci, bottom sheet di HP dan dialog di desktop.

import { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { IconClose } from './Icons';
import { registerOverlay, jebakFokus } from '../lib/overlay';

let uid = 0;

interface Props {
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ComponentChildren;
  children: ComponentChildren;
  /** true bila form berubah; klik overlay lalu tidak menutup diam-diam */
  dirty?: boolean;
  headerExtra?: ComponentChildren;
  /** hapus padding body (mis. daftar yang menempel ke tepi) */
  flush?: boolean;
  /** konten sudah punya header sendiri di dalam body */
  bodyClass?: string;
  wizardBar?: ComponentChildren;
  initialFocus?: string;
}

export function ModalShell({ onClose, title, subtitle, size = 'md', footer, children, dirty, headerExtra, flush, bodyClass = '', wizardBar, initialFocus }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef('ms-' + ++uid);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const lepas = registerOverlay(() => closeRef.current());
    const el = ref.current;
    let lepasFokus = () => {};
    if (el) {
      lepasFokus = jebakFokus(el);
      const target = (initialFocus && el.querySelector<HTMLElement>(initialFocus))
        || el.querySelector<HTMLElement>('.sheet-body input:not([type=hidden]):not([disabled]), .sheet-body select, .sheet-body textarea')
        || el.querySelector<HTMLElement>('.sheet-footer .btn-primary')
        || el;
      setTimeout(() => target.focus({ preventScroll: true } as FocusOptions), 30);
    }
    return () => { lepasFokus(); lepas(); };
  }, []);

  const klikOverlay = (e: MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    if (dirty && !window.confirm('Ada isian yang belum disimpan. Tutup dan buang isian?')) return;
    onClose();
  };

  return (
    <div class="modal-overlay" onMouseDown={klikOverlay}>
      <div
        ref={ref}
        class={`sheet-container sheet-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idRef.current}
        tabIndex={-1}
      >
        <div class="sheet-drag-handle" aria-hidden="true" />
        <div class="sheet-header">
          <div style={{ minWidth: 0 }}>
            <h2 id={idRef.current} class="title-md">{title}</h2>
            {subtitle && <div class="title-sub">{subtitle}</div>}
          </div>
          <div class="row" style={{ gap: '4px', flexShrink: 0 }}>
            {headerExtra}
            <button type="button" class="icon-btn sheet-close" onClick={onClose} aria-label="Tutup">
              <IconClose size={20} />
            </button>
          </div>
        </div>
        {wizardBar}
        <div class={`sheet-body ${bodyClass}`} style={flush ? { padding: 0, gap: 0 } : undefined}>{children}</div>
        {footer && <div class="sheet-footer">{footer}</div>}
      </div>
    </div>
  );
}
