// Icons.tsx — Clean Lucide-style outlined SVG icons (1.75px stroke, no external CDN dependencies)

/** Bungkus SVG yang sama untuk semua ikon (mengurangi ukuran berkas) */
function Svg({ size, cls, w = '1.75', children }: { size: number; cls?: string; w?: string; children?: preact.ComponentChildren }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" class={cls}>{children}</svg>
  );
}

interface IconProps {
  size?: number;
  class?: string;
  title?: string;
}

export function IconHome({ size = 20, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </Svg>
  );
}

export function IconBox({ size = 20, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/>
      <path d="M12 22V12"/>
    </Svg>
  );
}

export function IconPlus({ size = 20, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls} w="2.25">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </Svg>
  );
}

export function IconReceipt({ size = 20, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
      <path d="M16 8H8"/>
      <path d="M16 12H8"/>
      <path d="M10 16H8"/>
    </Svg>
  );
}

export function IconChart({ size = 20, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="M3 3v18h18"/>
      <path d="m19 9-5 5-4-4-3 3"/>
    </Svg>
  );
}

export function IconSearch({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </Svg>
  );
}

export function IconScan({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
      <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
      <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <line x1="7" y1="12" x2="17" y2="12"/>
    </Svg>
  );
}

export function IconClose({ size = 20, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls} w="2">
      <path d="M18 6 6 18"/>
      <path d="m6 6 12 12"/>
    </Svg>
  );
}

export function IconWrench({ size = 20, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </Svg>
  );
}

export function IconArrowRight({ size = 16, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls} w="2">
      <path d="M5 12h14"/>
      <path d="m12 5 7 7-7 7"/>
    </Svg>
  );
}

export function IconCheck({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls} w="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </Svg>
  );
}

export function IconPrinter({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect width="12" height="8" x="6" y="14"/>
    </Svg>
  );
}

export function IconCopy({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </Svg>
  );
}

export function IconTrendingUp({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls} w="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </Svg>
  );
}

export function IconShield({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </Svg>
  );
}

export function IconBell({ size = 20, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    </Svg>
  );
}

export function IconEye({ size = 20, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    </Svg>
  );
}

export function IconEyeOff({ size = 20, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
      <line x1="2" y1="2" x2="22" y2="22"/>
    </Svg>
  );
}

export function IconMenu({ size = 20, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <line x1="4" y1="12" x2="20" y2="12"/>
      <line x1="4" y1="6" x2="20" y2="6"/>
      <line x1="4" y1="18" x2="20" y2="18"/>
    </Svg>
  );
}

export function IconChevronRight({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls} w="2">
      <path d="m9 18 6-6-6-6"/>
    </Svg>
  );
}

export function IconChevronDown({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls} w="2">
      <path d="m6 9 6 6 6-6"/>
    </Svg>
  );
}

export function IconChevronLeft({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls} w="2">
      <path d="m15 18-6-6 6-6"/>
    </Svg>
  );
}

export function IconTrash({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </Svg>
  );
}

export function IconEdit({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
      <path d="m15 5 4 4"/>
    </Svg>
  );
}

export function IconDownload({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </Svg>
  );
}

export function IconShare({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <polyline points="16 6 12 2 8 6"/>
      <line x1="12" y1="2" x2="12" y2="15"/>
    </Svg>
  );
}

export function IconUndo({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="M3 7v6h6"/>
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
    </Svg>
  );
}

export function IconGift({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <rect x="3" y="8" width="18" height="4" rx="1"/>
      <path d="M12 8v13"/>
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>
    </Svg>
  );
}

export function IconSwap({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="m16 3 4 4-4 4"/>
      <path d="M20 7H4"/>
      <path d="m8 21-4-4 4-4"/>
      <path d="M4 17h16"/>
    </Svg>
  );
}

export function IconUser({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </Svg>
  );
}

export function IconPhone({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
      <path d="M12 18h.01"/>
    </Svg>
  );
}

export function IconBattery({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <rect width="16" height="10" x="2" y="7" rx="2" ry="2"/>
      <line x1="22" y1="11" x2="22" y2="13"/>
    </Svg>
  );
}

export function IconLock({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </Svg>
  );
}

export function IconUnlock({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
    </Svg>
  );
}

export function IconFilter({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </Svg>
  );
}

export function IconSort({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="m3 16 4 4 4-4"/>
      <path d="M7 20V4"/>
      <path d="m21 8-4-4-4 4"/>
      <path d="M17 4v16"/>
    </Svg>
  );
}

export function IconMore({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <circle cx="12" cy="12" r="1"/>
      <circle cx="12" cy="5" r="1"/>
      <circle cx="12" cy="19" r="1"/>
    </Svg>
  );
}

export function IconSettings({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </Svg>
  );
}

export function IconAlertTriangle({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </Svg>
  );
}

export function IconInfo({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 16v-4"/>
      <path d="M12 8h.01"/>
    </Svg>
  );
}

export function IconCamera({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
      <circle cx="12" cy="13" r="3"/>
    </Svg>
  );
}

export function IconImage({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
      <circle cx="9" cy="9" r="2"/>
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
    </Svg>
  );
}

export function IconWallet({ size = 20, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/>
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
    </Svg>
  );
}

export function IconDatabase({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M3 5V19A9 3 0 0 0 21 19V5"/>
      <path d="M3 12A9 3 0 0 0 21 12"/>
    </Svg>
  );
}

export function IconCalendar({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </Svg>
  );
}

export function IconClock({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </Svg>
  );
}

export function IconTag({ size = 18, class: cls }: IconProps) {
  return (
    <Svg size={size} cls={cls}>
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/>
      <path d="M7 7h.01"/>
    </Svg>
  );
}


// ---- Ikon tambahan (desain ulang v2) ----
const svgp = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, viewBox: '0 0 24 24' };

export function IconCheckCircle({ size = 20, class: cls }: IconProps) {
  return (<svg width={size} height={size} {...svgp} class={cls} aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>);
}
export function IconAlertCircle({ size = 20, class: cls }: IconProps) {
  return (<svg width={size} height={size} {...svgp} class={cls} aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v5"/><path d="M12 16.5h.01"/></svg>);
}
export function IconRefresh({ size = 20, class: cls }: IconProps) {
  return (<svg width={size} height={size} {...svgp} class={cls} aria-hidden="true"><path d="M21 12a9 9 0 0 0-15.5-6.2L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 15.5 6.2L21 16"/><path d="M16 16h5v5"/></svg>);
}
export function IconArrowUp({ size = 20, class: cls }: IconProps) {
  return (<svg width={size} height={size} {...svgp} class={cls} aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>);
}
export function IconArrowDown({ size = 20, class: cls }: IconProps) {
  return (<svg width={size} height={size} {...svgp} class={cls} aria-hidden="true"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>);
}
export function IconMinus({ size = 20, class: cls }: IconProps) {
  return (<svg width={size} height={size} {...svgp} class={cls} aria-hidden="true"><path d="M5 12h14"/></svg>);
}
export function IconBanknote({ size = 20, class: cls }: IconProps) {
  return (<svg width={size} height={size} {...svgp} class={cls} aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>);
}
export function IconInvoice({ size = 20, class: cls }: IconProps) {
  return (<svg width={size} height={size} {...svgp} class={cls} aria-hidden="true"><path d="M4 3h13a2 2 0 0 1 2 2v6"/><path d="M4 3v18l3-2 3 2 2-1.3"/><path d="M8 8h7M8 12h3"/><circle cx="17" cy="17" r="4"/><path d="M17 15.2V17l1.2 1"/></svg>);
}
export function IconUsers({ size = 20, class: cls }: IconProps) {
  return (<svg width={size} height={size} {...svgp} class={cls} aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
}
export function IconPhoneOff({ size = 20, class: cls }: IconProps) {
  return (<svg width={size} height={size} {...svgp} class={cls} aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>);
}
export function IconKeyboard({ size = 20, class: cls }: IconProps) {
  return (<svg width={size} height={size} {...svgp} class={cls} aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M7 15h10"/></svg>);
}
export function IconSun({ size = 20, class: cls }: IconProps) {
  return (<svg width={size} height={size} {...svgp} class={cls} aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>);
}
export function IconMoon({ size = 20, class: cls }: IconProps) {
  return (<svg width={size} height={size} {...svgp} class={cls} aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>);
}
export function IconLayoutGrid({ size = 20, class: cls }: IconProps) {
  return (<svg width={size} height={size} {...svgp} class={cls} aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>);
}
export function IconRows({ size = 20, class: cls }: IconProps) {
  return (<svg width={size} height={size} {...svgp} class={cls} aria-hidden="true"><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/></svg>);
}

/** Ikon panel samping (sidebar): dilengkapi micro-animation arah buka/tutup */
export function IconSidebar({ size = 20, class: cls, ciut = false }: IconProps & { ciut?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      class={`icon-sidebar-anim ${ciut ? 'ciut' : 'lebar'} ${cls || ''}`}
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2.5" class="sb-rect" />
      <path d="M9 3v18" class="sb-line" />
      <path
        d={ciut ? "M13 9l3 3-3 3" : "M16 15l-3-3 3-3"}
        class="sb-arrow"
      />
    </svg>
  );
}
