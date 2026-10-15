// BatalkanTransaksiModal.tsx — pembatalan transaksi (transaksi tidak pernah dihapus).
// Dampak dijelaskan konkret, alasan wajib, fokus awal pada pilihan aman, tombol bahaya memuat kata kerja.
import { useState } from 'preact/hooks';
import { ModalShell } from './ModalShell';
import { Field, SegmentedField, useFieldId } from './ui/Form';
import { Banner } from './ui/Kit';
import { IconAlertTriangle } from './Icons';
import { TransaksiItem } from '../mock/data-contoh';
import { rupiah } from '../lib/format';

interface Props {
  isOpen?: boolean;
  onClose: () => void;
  transaksi: TransaksiItem | null;
  onKonfirmasiBatal: (id: string, alasan: string, catatan: string) => void;
}

const ALASAN = ['Salah input', 'Pelanggan batal', 'Barang bermasalah', 'Lainnya'] as const;

export function BatalkanTransaksiModal({ onClose, transaksi, onKonfirmasiBatal }: Props) {
  const id = useFieldId('bt');
  const [alasan, setAlasan] = useState<typeof ALASAN[number]>('Salah input');
  const [catatan, setCatatan] = useState('');
  const [coba, setCoba] = useState(false);
  const [memproses, setMemproses] = useState(false);
  if (!transaksi) return null;
  const t = transaksi;
  const perluCatatan = alasan === 'Lainnya' && !catatan.trim();
  const dampak: string[] = [];
  if (t.tipe === 'Jual') {
    const unit = (t.items || []).find(i => i.imei);
    if (unit) dampak.push(`Unit ${unit.nama} kembali berstatus Ready dan bisa dijual lagi.`);
    if ((t.sisa || 0) > 0) dampak.push(`Piutang ${rupiah(t.sisa || 0)} ikut dibatalkan dan hilang dari daftar Tagihan.`);
    if ((t.dibayar || 0) > 0) dampak.push(`Uang masuk ${rupiah(t.dibayar || 0)} dikoreksi dari kas. Kembalikan uang ke pelanggan bila sudah dibayar.`);
  } else if (t.tipe === 'Beli') {
    dampak.push('Semua unit HP dari pembelian ini akan ditarik/dibatalkan dari stok (hanya bisa jika belum terjual).');
    dampak.push('Stok aksesoris yang dibeli akan dikurangi kembali.');
    if ((t.sisa || 0) > 0) dampak.push(`Hutang ke supplier sebesar ${rupiah(t.sisa || 0)} dibatalkan.`);
    if ((t.dibayar || 0) > 0) dampak.push(`Pengeluaran kas sebesar ${rupiah(t.dibayar || 0)} akan dikoreksi balik.`);
  }
  dampak.push('Nota tetap tercatat di Riwayat dengan status Dibatalkan dan alasan yang Anda isi.');

  const konfirmasi = () => {
    setCoba(true);
    if (perluCatatan || memproses) return;
    setMemproses(true);
    onKonfirmasiBatal(t.id, alasan, catatan.trim());
  };

  return (
    <ModalShell onClose={onClose} title={`Batalkan ${t.id}?`} subtitle={`${t.judul.replace(/^[A-Za-z]+\s·\s/, '')} · ${rupiah(t.nominal)}`} size="sm" initialFocus=".sheet-footer .btn-secondary"
      footer={<>
        <button type="button" class="btn btn-secondary" disabled={memproses} onClick={onClose}>Kembali</button>
        <button type="button" class="btn btn-danger" disabled={memproses} onClick={konfirmasi}>
          {memproses ? <span class="spinner" /> : null} Batalkan transaksi
        </button>
      </>}>
      <Banner tipe="warning" icon={<IconAlertTriangle size={20} />}>
        <strong>Yang akan terjadi:</strong>
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: 4 }}>{dampak.map(d => <li key={d}>{d}</li>)}</ul>
      </Banner>
      <div class="form-group"><span class="form-label">Alasan pembatalan</span>
        <div class="seg-grid2"><SegmentedField label="Alasan" value={alasan} onChange={setAlasan} opsi={ALASAN.map(a => ({ v: a, l: a }))} /></div>
      </div>
      <Field id={`${id}-cat`} label={alasan === 'Lainnya' ? 'Jelaskan alasannya' : 'Catatan (opsional)'} wajib={alasan === 'Lainnya'} error={coba && perluCatatan ? 'Tulis alasan pembatalan.' : ''}>
        <textarea id={`${id}-cat`} class="form-input" rows={2} value={catatan} aria-invalid={coba && perluCatatan ? 'true' : undefined} onInput={e => setCatatan((e.target as HTMLTextAreaElement).value)} />
      </Field>
    </ModalShell>
  );
}
