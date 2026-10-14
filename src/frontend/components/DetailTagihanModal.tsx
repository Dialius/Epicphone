import { useOverlay } from '../lib/overlay';
// DetailTagihanModal.tsx — S27 Detail Tagihan + Sheet Terima Pembayaran
// Top block, progress bar, origin link, payment history, and payment sheet with quick chips

import { useState } from 'preact/hooks';
import { Tagihan } from '../mock/data-contoh';
import { IconClose, IconReceipt, IconCheck } from './Icons';
import { MoneyInput } from './ui/Form';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tagihan: Tagihan | null;
  onSimpanPembayaran: (tagihanId: string, nominal: number, metode: string, catatan: string) => void;
  onBukaTransaksi?: (idTransaksi: string) => void;
}

export function DetailTagihanModal({ isOpen, onClose, tagihan, onSimpanPembayaran, onBukaTransaksi }: Props) {
  useOverlay(onClose);

  const [isBayarSheetOpen, setIsBayarSheetOpen] = useState(false);
  const [nominalInput, setNominalInput] = useState(String(tagihan?.sisa ?? 0));
  const [metode, setMetode] = useState<'Tunai' | 'Transfer'>('Tunai');
  const [catatan, setCatatan] = useState('');
  // semua hook di atas; baru boleh keluar lebih awal (urutan hook tidak boleh berubah antar render)
  if (!isOpen || !tagihan) return null;

  const rupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  const persenTerbayar = tagihan.total > 0 ? Math.round((tagihan.terbayar / tagihan.total) * 100) : 0;
  const nominalAngka = parseInt(nominalInput, 10) || 0;
  const sisaSetelahBayar = Math.max(0, tagihan.sisa - nominalAngka);
  const isMelebihi = nominalAngka > tagihan.sisa;

  const handlePilihChip = (mode: 'lunas' | 'setengah' | 'custom') => {
    if (mode === 'lunas') {
      setNominalInput(String(tagihan.sisa));
    } else if (mode === 'setengah') {
      setNominalInput(String(Math.round(tagihan.sisa / 2)));
    } else {
      setNominalInput('');
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitBayar = (e: Event) => {
    e.preventDefault();
    if (nominalAngka <= 0 || isMelebihi || isSubmitting) return;
    setIsSubmitting(true);
    onSimpanPembayaran(tagihan.id, nominalAngka, metode, catatan);
    setIsBayarSheetOpen(false);
    onClose();
  };

  return (
    <div class="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="title-tagihan-detail">
      <div class="sheet-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div class="sheet-drag-handle" />

        <div class="sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', background: 'var(--neutral-surface-2)', padding: '3px 6px', borderRadius: '4px' }}>
              {tagihan.id}
            </span>
            <span class={`badge ${tagihan.status === 'Telat' ? 'badge-telat' : tagihan.status === 'Lunas' ? 'badge-ready' : 'badge-servis'}`}>
              {tagihan.status} {tagihan.hariTelat > 0 ? `(${tagihan.hariTelat} hari)` : ''}
            </span>
          </div>
          <button class="btn-icon" onClick={onClose} aria-label="Tutup detail tagihan">
            <IconClose size={20} />
          </button>
        </div>

        <div class="sheet-body" style={{ maxHeight: '72vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top block */}
          <div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
              {tagihan.jenis}
            </span>
            <h1 id="title-tagihan-detail" class="title-lg" style={{ color: 'var(--text-primary)', marginTop: '2px' }}>
              {tagihan.kontak}
            </h1>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              Nomor WhatsApp: <strong>{tagihan.noWa}</strong>
            </span>
          </div>

          {/* Sisa & Progress Bar Card */}
          <div class="card" style={{ background: 'var(--neutral-surface-2)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
              Sisa Tagihan yang Belum Dibayar
            </span>
            <div class="text-uang" style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: tagihan.sisa > 0 ? 'var(--status-danger-solid)' : 'var(--brand-green-700)', marginTop: '2px' }}>
              {rupiah(tagihan.sisa)}
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: '4px' }}>
                <span class="text-secondary">Terbayar: {rupiah(tagihan.terbayar)} ({persenTerbayar}%)</span>
                <span class="text-secondary">Total: {rupiah(tagihan.total)}</span>
              </div>
              <div class="progress-bar-track">
                <div
                  class="progress-bar-fill"
                  style={{ width: `${Math.min(100, persenTerbayar)}%`, background: tagihan.sisa === 0 ? 'var(--status-success-solid)' : 'var(--brand-navy-900)' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: 'var(--text-xs)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
              <span class="text-secondary">Batas Jatuh Tempo:</span>
              <strong style={{ color: tagihan.status === 'Telat' ? 'var(--status-danger-solid)' : 'var(--text-primary)' }}>
                {tagihan.jatuhTempo}
              </strong>
            </div>
          </div>

          {/* Origin Transaction Card */}
          <div class="card clickable p-3" onClick={() => onBukaTransaksi && onBukaTransaksi(tagihan.refId)}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
              Transaksi Asal (Referensi)
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--brand-navy-900)' }}>{tagihan.refId}</strong>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--brand-green-700)' }}>Lihat Nota Transaksi &rarr;</span>
            </div>
          </div>

          {/* Riwayat Pembayaran List */}
          <div>
            <h3 class="title-sm" style={{ marginBottom: '8px' }}>Riwayat Pembayaran Cicilan</h3>
            {tagihan.riwayatBayar.length === 0 ? (
              <div class="card" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                Belum ada pembayaran dicatat untuk tagihan ini.
              </div>
            ) : (
              <div class="flex-col gap-2">
                {tagihan.riwayatBayar.map((r, idx) => (
                  <div key={idx} class="card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: 'var(--text-sm)' }}>{rupiah(r.nominal)}</strong>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {r.tanggal} {r.jam} • Metode {r.metode}
                      </div>
                    </div>
                    <span class="badge badge-ready">
                      <IconCheck size={12} /> Sukses
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Pembayaran (Nested if opened) */}
          {isBayarSheetOpen && (
            <div class="card" style={{ padding: '16px', border: '2px solid var(--brand-navy-900)', background: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 class="title-sm">Catat Pembayaran Tagihan</h3>
                <button class="btn-icon" onClick={() => setIsBayarSheetOpen(false)} aria-label="Tutup form pembayaran">
                  <IconClose size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitBayar} class="flex-col gap-3">
                <div>
                  <label class="form-label" htmlFor="input-bayar-nominal">Nominal Pembayaran (Rp)</label>
                  <MoneyInput id="input-bayar-nominal" value={nominalInput} onChange={setNominalInput} invalid={isMelebihi} required />

                  {/* Chips: Lunasi, Setengah, Nominal sendiri */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      class="filter-chip"
                      onClick={() => handlePilihChip('lunas')}
                      style={{ fontSize: 'var(--text-xs)', height: '32px' }}
                    >
                      Lunasi ({rupiah(tagihan.sisa)})
                    </button>
                    <button
                      type="button"
                      class="filter-chip"
                      onClick={() => handlePilihChip('setengah')}
                      style={{ fontSize: 'var(--text-xs)', height: '32px' }}
                    >
                      Setengah ({rupiah(Math.round(tagihan.sisa / 2))})
                    </button>
                    <button
                      type="button"
                      class="filter-chip"
                      onClick={() => handlePilihChip('custom')}
                      style={{ fontSize: 'var(--text-xs)', height: '32px' }}
                    >
                      Nominal Sendiri
                    </button>
                  </div>

                  {isMelebihi && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--status-danger-solid)', display: 'block', marginTop: '4px' }}>
                      Nominal melebihi sisa tagihan ({rupiah(tagihan.sisa)}).
                    </span>
                  )}
                </div>

                <div>
                  <label class="form-label">Metode Pembayaran</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      class={`btn ${metode === 'Tunai' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setMetode('Tunai')}
                      style={{ height: '40px', justifyContent: 'center' }}
                    >
                      Tunai (Kas Toko)
                    </button>
                    <button
                      type="button"
                      class={`btn ${metode === 'Transfer' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setMetode('Transfer')}
                      style={{ height: '40px', justifyContent: 'center' }}
                    >
                      Transfer Bank / QRIS
                    </button>
                  </div>
                </div>

                <div>
                  <label class="form-label">Catatan Tambahan (Opsional)</label>
                  <input
                    type="text"
                    class="form-input"
                    placeholder="Contoh: Titip lewat Mas Aris / Bukti TF terlampir"
                    value={catatan}
                    onInput={e => setCatatan((e.target as HTMLInputElement).value)}
                  />
                </div>

                {/* Live Remaining Balance Calculation */}
                <div style={{ background: 'var(--neutral-surface-2)', padding: '8px 12px', borderRadius: 'var(--rad-sm)', fontSize: 'var(--text-xs)' }}>
                  <span>Sisa setelah pembayaran ini: </span>
                  <strong class="text-uang" style={{ color: sisaSetelahBayar === 0 ? 'var(--brand-green-700)' : 'var(--status-danger-solid)' }}>
                    {rupiah(sisaSetelahBayar)} {sisaSetelahBayar === 0 ? '(LUNAS)' : '(Sebagian)'}
                  </strong>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button type="button" class="btn btn-secondary" onClick={() => setIsBayarSheetOpen(false)} style={{ flex: 1 }}>
                    Batal
                  </button>
                  <button type="submit" class="btn btn-primary" disabled={isMelebihi || nominalAngka <= 0 || isSubmitting} style={{ flex: 2 }}>
                    {isSubmitting ? <span class="spinner" /> : null} Simpan Pembayaran
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Sticky footer action */}
        {!isBayarSheetOpen && (
          <div class="sheet-footer">
            {tagihan.sisa > 0 ? (
              <button
                class="btn btn-primary btn-block"
                onClick={() => setIsBayarSheetOpen(true)}
              >
                <IconReceipt size={18} />
                <span>{tagihan.jenis === 'Piutang pelanggan' ? 'Terima Pembayaran Cicilan' : 'Bayar Hutang ke Supplier'}</span>
              </button>
            ) : (
              <button class="btn btn-secondary btn-block" onClick={onClose}>
                Tagihan Sudah Lunas
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
