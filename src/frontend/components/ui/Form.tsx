// Form.tsx — Field (label terhubung, teks bantu, galat), MoneyInput (Rp + pemisah ribuan), SegmentedField.
import { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import { IconAlertCircle } from '../Icons';

let uid = 0;
export const useFieldId = (prefix = 'f') => `${prefix}-${++uid}`;

export function Field({ id, label, hint, error, children, wajib }: { id: string; label: string; hint?: string; error?: string; children: ComponentChildren; wajib?: boolean }) {
  return (
    <div class="form-group">
      <label class="form-label" for={id}>{label}{wajib && <span aria-hidden="true" style={{ color: 'var(--bad-fg)' }}> *</span>}</label>
      {children}
      {error
        ? <div class="error-text" id={`${id}-err`} role="alert"><IconAlertCircle size={14} /> {error}</div>
        : hint ? <div class="form-hint" id={`${id}-hint`}>{hint}</div> : null}
    </div>
  );
}

/** Nilai disimpan sebagai string angka murni ("2500000"); tampilan memakai pemisah ribuan (2.500.000). */
export function MoneyInput({ id, value, onChange, placeholder = '0', invalid, describedBy, autoFocus, required, ariaLabel, disabled }: {
  id: string; value: string; onChange: (digits: string) => void; placeholder?: string; invalid?: boolean; describedBy?: string; autoFocus?: boolean;
  required?: boolean; ariaLabel?: string; disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const tampil = value ? Number(value).toLocaleString('id-ID') : '';
  const saatKetik = (e: Event) => {
    const el = e.target as HTMLInputElement;
    const posisi = el.selectionStart ?? el.value.length;
    const digitSebelumKursor = el.value.slice(0, posisi).replace(/\D/g, '').length;
    const digit = el.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 12);
    const rapi = digit ? Number(digit).toLocaleString('id-ID') : '';
    el.value = rapi; // tulis langsung: huruf yang diketik hilang, titik ribuan langsung tampil
    let n = 0, i = 0;
    for (; i < rapi.length && n < digitSebelumKursor; i++) if (/\d/.test(rapi[i])) n++;
    try { el.setSelectionRange(i, i); } catch { /* beberapa tipe input tidak mendukung */ }
    onChange(digit);
  };
  return (
    <div class="money-wrap">
      <span class="money-prefix" aria-hidden="true">Rp</span>
      <input ref={ref} id={id} class="form-input money-input" inputMode="numeric" autoComplete="off" placeholder={placeholder} value={tampil}
        aria-invalid={invalid ? 'true' : undefined} aria-describedby={describedBy} aria-label={ariaLabel} autoFocus={autoFocus} required={required} disabled={disabled}
        onInput={saatKetik} />
    </div>
  );
}

/** Angka bulat dari isian uang (string digit). Kosong = 0. */
export const duit = (v: string): number => (v ? Number(v) || 0 : 0);

export function SegmentedField<T extends string>({ value, onChange, opsi, label }: { value: T; onChange: (v: T) => void; opsi: Array<{ v: T; l: string; d?: string }>; label: string }) {
  return (
    <div class="seg-field" role="radiogroup" aria-label={label}>
      {opsi.map(o => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} class={`seg-opt ${value === o.v ? 'aktif' : ''}`} onClick={() => onChange(o.v)}>
          <span class="seg-l">{o.l}</span>{o.d && <span class="seg-d">{o.d}</span>}
        </button>
      ))}
    </div>
  );
}
