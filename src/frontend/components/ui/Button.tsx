import { h } from 'preact';

export interface ButtonProps extends h.JSX.HTMLAttributes<HTMLButtonElement> {
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'utama' | 'sekunder' | 'bahaya' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({ variant = 'utama', size = 'md', loading, children, disabled, class: className = '', ...props }: ButtonProps) {
  const baseClass = `btn btn-${{ utama: 'primary', sekunder: 'secondary', bahaya: 'danger', ghost: 'ghost', link: 'text-link' }[variant]} btn-${size} ${loading ? 'loading' : ''} ${className}`;
  return (
    <button class={baseClass} disabled={disabled || loading} {...props}>
      {loading ? <span class="spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
