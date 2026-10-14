import { h } from 'preact';

export interface InputProps extends Omit<h.JSX.HTMLAttributes<HTMLInputElement>, 'label'> {
  label: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  value?: string;
  type?: string;
}

export function InputTeks({ label, error, id, class: className = '', ...props }: InputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div class={`form-group ${className}`}>
      <label class="form-label" for={inputId}>{label}</label>
      <input id={inputId} class="form-input" aria-invalid={!!error} aria-describedby={error ? `${inputId}-error` : undefined} {...props} />
      {error && <span id={`${inputId}-error`} class="error-text" role="alert">{error}</span>}
    </div>
  );
}
