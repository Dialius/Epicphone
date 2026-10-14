// overlay.ts — tumpukan overlay: Esc dan tombol Back hanya menutup yang paling atas,
// scroll body dikunci selama ada overlay, dan fokus kembali ke pemicu saat ditutup.

interface Entry { id: number; close: () => void; popped: boolean; trigger: Element | null }
const stack: Entry[] = [];
let seq = 0;
let ignorePop = 0;

function lock() { document.body.classList.add('scroll-lock'); }
function unlock() { document.body.classList.remove('scroll-lock'); }

export function registerOverlay(close: () => void): () => void {
  const e: Entry = { id: ++seq, close, popped: false, trigger: document.activeElement };
  stack.push(e);
  try { history.pushState({ epOverlay: e.id }, ''); } catch { /* iframe terbatas: abaikan */ }
  lock();
  return () => {
    const i = stack.indexOf(e);
    if (i >= 0) stack.splice(i, 1);
    if (!stack.length) unlock();
    if (!e.popped) {
      try {
        if (history.state && history.state.epOverlay === e.id) { ignorePop++; history.back(); }
      } catch { /* abaikan */ }
    }
    const t = e.trigger as HTMLElement | null;
    if (t && typeof t.focus === 'function' && document.contains(t)) setTimeout(() => t.focus(), 0);
  };
}

export function closeTopOverlay(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.close();
  return true;
}

export function overlayCount(): number { return stack.length; }

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignorePop > 0) { ignorePop--; return; }
    const top = stack[stack.length - 1];
    if (top) { top.popped = true; top.close(); }
  });
}

const FOKUS = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Jebak Tab di dalam container. Mengembalikan fungsi pelepas. */
export function jebakFokus(container: HTMLElement): () => void {
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key !== 'Tab') return;
    const el = Array.from(container.querySelectorAll<HTMLElement>(FOKUS)).filter(x => x.offsetParent !== null);
    if (!el.length) { ev.preventDefault(); return; }
    const first = el[0], last = el[el.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  };
  container.addEventListener('keydown', onKey);
  return () => container.removeEventListener('keydown', onKey);
}

/** Untuk modal lama yang belum memakai ModalShell: Esc, Back, kunci scroll, jebak fokus, fokus awal, kembalikan fokus. */
import { useEffect, useRef } from 'preact/hooks';
export function useOverlay(onClose: () => void) {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    const lepas = registerOverlay(() => ref.current());
    let lepasFokus = () => {};
    const timer = setTimeout(() => {
      const semua = document.querySelectorAll<HTMLElement>('.sheet-container');
      const el = semua[semua.length - 1];
      if (!el) return;
      el.setAttribute('tabindex', '-1');
      lepasFokus = jebakFokus(el);
      const target = el.querySelector<HTMLElement>('.sheet-body input:not([disabled]), .sheet-body select, .sheet-body textarea') || el.querySelector<HTMLElement>('.sheet-footer .btn-primary') || el;
      target.focus({ preventScroll: true } as FocusOptions);
    }, 30);
    return () => { clearTimeout(timer); lepasFokus(); lepas(); };
  }, []);
}
