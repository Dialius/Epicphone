

export function ChipStatus({ status, class: className = '' }: { status: string, class?: string }) {
  const statusLower = status.toLowerCase().replace(/\s+/g, '-');
  return <span class={`chip-status chip-${statusLower} ${className}`}>{status}</span>;
}
