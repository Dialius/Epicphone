import { useMemo, useState } from 'preact/hooks';
import { ModalShell } from './ModalShell';
import { PratinjauDokumen } from './PratinjauDokumen';
import { Banner } from './ui/Kit';
import { IconPrinter, IconCopy, IconCheck, IconDownload } from './Icons';
import { notaDokumen } from '../lib/dokumen';
import { cetakHtml, bukaDiTabBaru } from '../lib/cetak';
import { toast } from '../lib/toast';

export interface DataNota {
  noNota: string;
  tanggalWib: string;
  namaPelanggan: string;
  noWa?: string;
  items: Array<{
    nama: string;
    imei?: string;
    kondisi?: string;
    qty: number;
    harga: number;
    subtotal: number;
    /** mis. "11 Okt 2026 (7 hari)" */
    garansi?: string;
  }>;
  bonus: Array<{
    nama: string;
    qty: number;
  }>;
  subtotal: number;
  diskon: number;
  tukarTambah: {
    ada: boolean;
    unit?: string;
    imei?: string;
    nilai?: number;
  };
  totalTagihan: number;
  dibayar: number;
  sisa: number;
  metodeBayar: string;
  jatuhTempo?: string;
  garansiSampai: string;
}

/** Status PDF nota buatan server */
export interface PdfNota {
  status: 'membuat' | 'siap' | 'gagal';
  urlLihat?: string;
  urlUnduh?: string;
  base64?: string;
  nama?: string;
  pesan?: string;
}

/** Identitas toko pada nota (dari Pengaturan; contoh pada mode demo) */
export interface TokoNota { nama: string; tagline: string; alamat: string; wa: string; instagram: string; syarat: string; logoUrl?: string }

export const TOKO_DEMO: TokoNota = {
  nama: 'Epic Phone Purwokerto', tagline: 'Inovasi Ada Di Genggaman', alamat: 'Jl. Prof HR Boenyamin No. 7 Purwokerto', wa: '0812-3456-7890', instagram: '@epicphone_purwokerto',
  syarat: 'Segel toko utuh, bukan kesalahan pemakaian (terbentur, pecah, kena air). Membawa nota fisik/digital ini.',
};

interface Props {
  toko?: TokoNota;
  isOpen: boolean;
  onClose: () => void;
  nota: DataNota | null;
  /** Ukuran kertas dari Pengaturan: A5 atau struk 80mm */
  ukuran?: 'A5' | '80mm';
  onPenjualanBaru?: () => void;
  /** Mode nyata: PDF dibuat server (PRD 02 bagian 6) */
  pdf?: PdfNota | null;
  onBuatUlangPdf?: () => void;
}

const rp = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

export function NotaModal({ isOpen, onClose, nota, ukuran = 'A5', onPenjualanBaru, pdf, onBuatUlangPdf, toko = TOKO_DEMO }: Props) {
  const [copied, setCopied] = useState(false);
  const [tautanTersalin, setTautanTersalin] = useState(false);
  // pratinjau dan hasil cetak memakai HTML yang sama persis
  const htmlLayar = useMemo(() => (nota ? notaDokumen(nota, toko, ukuran, true) : ''), [nota, toko, ukuran]);
  if (!isOpen || !nota) return null;

  const isLunas = nota.sisa <= 0;

  const handleCetak = async () => {
    const ok = await cetakHtml(notaDokumen(nota, toko, ukuran, false));
    if (ok) return;
    if (bukaDiTabBaru(notaDokumen(nota, toko, ukuran, true))) toast({ tipe: 'info', judul: 'Nota dibuka di tab baru', desk: 'Tekan Ctrl+P di tab itu untuk mencetak.' });
    else toast({ tipe: 'error', judul: 'Cetak belum bisa dibuka', desk: 'Browser memblokirnya. Gunakan Unduh PDF atau izinkan pop-up untuk situs ini.', durasi: 8000 });
  };

  const unduhPdf = () => {
    if (!pdf?.base64) return;
    const biner = atob(pdf.base64);
    const bytes = new Uint8Array(biner.length);
    for (let i = 0; i < biner.length; i++) bytes[i] = biner.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = pdf.nama || `${nota.noNota}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  const salinTautan = () => {
    if (!pdf?.urlLihat) return;
    navigator.clipboard?.writeText(pdf.urlLihat);
    setTautanTersalin(true);
    setTimeout(() => setTautanTersalin(false), 3000);
  };

  const handleSalinWa = () => {
    const teks = `*${toko.nama.toUpperCase()}*
${toko.tagline ? `_${toko.tagline}_\n` : ''}${[toko.alamat, toko.wa ? `WA: ${toko.wa}` : ''].filter(Boolean).join(' | ')}

*NOTA PENJUALAN: ${nota.noNota}*
Tanggal: ${nota.tanggalWib}
Pelanggan: ${nota.namaPelanggan}
----------------------------------------
${nota.items.map(it => `• ${it.nama} ${it.imei ? `(IMEI: ...${it.imei.slice(-4)})` : ''}\n  ${it.qty}x ${rp(it.harga)} = ${rp(it.subtotal)}`).join('\n')}

*BONUS (GRATIS):*
${nota.bonus.length > 0 ? nota.bonus.map(b => `✓ ${b.nama} (${b.qty}x) - GRATIS`).join('\n') : '-'}
----------------------------------------
Subtotal: ${rp(nota.subtotal)}
${nota.diskon > 0 ? `Diskon: -${rp(nota.diskon)}\n` : ''}${nota.tukarTambah?.ada ? `Tukar Tambah (${nota.tukarTambah.unit}): -${rp(nota.tukarTambah.nilai || 0)}\n` : ''}*TOTAL TAGIHAN: ${rp(nota.totalTagihan)}*
Dibayar (${nota.metodeBayar}): ${rp(nota.dibayar)}
${nota.sisa > 0 ? `SISA: ${rp(nota.sisa)} (Jatuh tempo: ${nota.jatuhTempo || '-'})\nStatus: BELUM LUNAS` : 'Status: LUNAS'}

*GARANSI TOKO:* Berlaku s/d ${nota.garansiSampai}
${toko.syarat ? `(${toko.syarat})\n` : ''}Terima kasih telah berbelanja di ${toko.nama}!`;

    navigator.clipboard?.writeText(teks);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <ModalShell onClose={onClose} title={`Nota ${nota.noNota}`} subtitle={isLunas ? 'Transaksi berhasil dan lunas' : 'Transaksi dicatat, ada sisa tagihan (piutang)'} size="lg"
      footer={<>
        <button type="button" class="btn btn-secondary" onClick={handleSalinWa}>{copied ? <IconCheck size={18} /> : <IconCopy size={18} />}<span>{copied ? 'Tersalin' : 'Salin WA'}</span></button>
        <button type="button" class="btn btn-secondary" onClick={handleCetak}><IconPrinter size={18} /><span>Cetak {ukuran}</span></button>
        {onPenjualanBaru && <button type="button" class="btn btn-secondary" onClick={() => { onClose(); onPenjualanBaru(); }}>Penjualan baru</button>}
        <button type="button" class="btn btn-primary" onClick={onClose}>Selesai</button>
      </>}>
      {pdf?.status === 'gagal' && (
        <Banner tipe="warning" aksi={onBuatUlangPdf ? <button type="button" class="btn btn-secondary btn-sm" onClick={onBuatUlangPdf}>Buat ulang nota</button> : undefined}>
          Penjualan sudah tersimpan, tetapi PDF nota belum jadi{pdf.pesan ? `: ${pdf.pesan}` : '.'}
        </Banner>
      )}
      <PratinjauDokumen html={htmlLayar} judul={`Pratinjau nota ${nota.noNota}`} />
      {pdf && pdf.status !== 'gagal' && (
        <div class="card" style={{ background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div><div class="eyebrow">Berkas PDF nota</div><div class="title-sub">{pdf.status === 'membuat' ? 'Sedang dibuat di server…' : 'Tersimpan di Drive toko'}</div></div>
          {pdf.status === 'siap' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" class="btn btn-secondary btn-sm" onClick={unduhPdf} disabled={!pdf.base64}><IconDownload size={16} /><span>Unduh PDF</span></button>
              {pdf.urlLihat && <button type="button" class="btn btn-secondary btn-sm" onClick={salinTautan}>{tautanTersalin ? <IconCheck size={16} /> : <IconCopy size={16} />}<span>{tautanTersalin ? 'Tautan tersalin' : 'Salin tautan'}</span></button>}
            </div>
          )}
          {pdf.status === 'membuat' && <span class="spinner" aria-label="Membuat PDF" />}
        </div>
      )}
    </ModalShell>
  );
}
