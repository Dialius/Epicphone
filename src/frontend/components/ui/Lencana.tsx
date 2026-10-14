

export function Lencana({ count, class: className = '' }: { count: number, class?: string }) {
  if (count <= 0) return null;
  return <span class={`lencana ${className}`}>{count > 99 ? '99+' : count}</span>;
}
