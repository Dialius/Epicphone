import { ImgAman } from './ui/Kit';
import { useOverlay } from '../lib/overlay';
// DetailUnitModal.tsx — S05 Detail Unit
// Complete unit inspector: 4:3 gallery, privacy-aware modal/laba, breakdown, timeline & contextual actions

import { useState } from 'preact/hooks';
import { UnitHP } from '../mock/data-contoh';
import { IconClose, IconCopy, IconCheck, IconWrench, IconReceipt, IconLock, IconCamera, IconChevronRight, IconChevronLeft, IconAlertTriangle } from './Icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  unit: UnitHP | null;
  onJual: (u: UnitHP) => void;
  onKirimKeServis: (u: UnitHP) => void;
  onBukaFoto: (u: UnitHP) => void;
  onLihatNota?: (notaId: string) => void;
  isPrivacyMode: boolean;
}

export function DetailUnitModal({
  isOpen,
  onClose,
  unit,
  onJual,
  onKirimKeServis,
  onBukaFoto,
  onLihatNota,
  isPrivacyMode,
}: Props) {
  useOverlay(onClose);
  if (!isOpen || !unit) return null;

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [copiedImei, setCopiedImei] = useState(false);

  const rupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');
  const maskText = 'Rp ••• •••';

  const photos = unit.foto && unit.foto.length > 0 ? unit.foto : [];

  const handleCopyImei = () => {
    navigator.clipboard?.writeText(unit.imei);
    setCopiedImei(true);
    setTimeout(() => setCopiedImei(false), 2000);
  };

  const nextPhoto = () => {
    if (photos.length > 1) {
      setActivePhotoIdx((activePhotoIdx + 1) % photos.length);
    }
  };

  const prevPhoto = () => {
    if (photos.length > 1) {
      setActivePhotoIdx((activePhotoIdx - 1 + photos.length) % photos.length);
    }
  };

  const potensiLaba = unit.hargaJualTarget - unit.hpp;

  return (
    <div class="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="title-unit-detail">
      <div class="sheet-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div class="sheet-drag-handle" />

        {/* 1. Header */}
        <div class="sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', background: 'var(--neutral-surface-2)', padding: '3px 6px', borderRadius: '4px' }}>
              {unit.id}
            </span>
            <span class={`badge ${
              unit.status === 'Ready' ? 'badge-ready' :
              unit.status === 'Servis' ? 'badge-servis' :
              unit.status === 'Terjual' ? 'badge-neutral' :
              unit.status === 'Dipesan' ? 'badge-info' : 'badge-telat'
            }`}>
              {unit.status}
            </span>
          </div>
          <button class="btn-icon" onClick={onClose} aria-label="Tutup detail unit">
            <IconClose size={20} />
          </button>
        </div>

        <div class="sheet-body" style={{ maxHeight: '72vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Status Variant Banner (Section 8.6) */}
          {unit.status === 'Servis' && (
            <div class="banner banner-warning" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <IconWrench size={20} />
              <div style={{ fontSize: 'var(--text-xs)' }}>
                <strong>Sedang diservis.</strong> Selesaikan servis terlebih dahulu sebelum unit dapat dijual.
              </div>
            </div>
          )}

          {unit.status === 'Dipesan' && (
            <div class="banner banner-warning" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <IconAlertTriangle size={20} />
              <div style={{ fontSize: 'var(--text-xs)' }}>
                <strong>Dipesan.</strong> Unit sedang disimpan untuk transaksi yang belum selesai dibayar.
              </div>
            </div>
          )}

          {unit.status === 'Terjual' && (
            <div class="banner banner-neutral" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <IconCheck size={20} />
              <div style={{ fontSize: 'var(--text-xs)' }}>
                <strong>Terjual.</strong> Unit ini telah laku terjual {unit.notaJualId ? `(Nota: ${unit.notaJualId})` : ''}.
              </div>
            </div>
          )}

          {unit.status === 'Rusak' && (
            <div class="banner banner-danger" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <IconAlertTriangle size={20} />
              <div style={{ fontSize: 'var(--text-xs)' }}>
                <strong>Ditandai Rusak.</strong> Kerugian modal tercatat sebesar {isPrivacyMode ? maskText : rupiah(unit.hpp)}.
              </div>
            </div>
          )}

          {/* 2. Gallery 4:3 Carousel */}
          <div class="unit-gallery-box">
            {photos.length > 0 ? (
              <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', borderRadius: 'var(--rad-lg)', overflow: 'hidden', background: 'var(--bg-subtle)' }}>
                <ImgAman
                  src={photos[activePhotoIdx]}
                  alt={`${unit.nama} foto ${activePhotoIdx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span class="gallery-counter">
                  {activePhotoIdx + 1} / {photos.length}
                </span>

                {photos.length > 1 && (
                  <>
                    <button class="gallery-nav-btn prev" onClick={prevPhoto} aria-label="Foto sebelumnya">
                      <IconChevronLeft size={20} />
                    </button>
                    <button class="gallery-nav-btn next" onClick={nextPhoto} aria-label="Foto selanjutnya">
                      <IconChevronRight size={20} />
                    </button>
                  </>
                )}

                <button class="gallery-btn-tambah" onClick={() => onBukaFoto(unit)}>
                  <IconCamera size={16} />
                  <span>Kelola Foto ({photos.length})</span>
                </button>
              </div>
            ) : (
              <div class="gallery-empty clickable" onClick={() => onBukaFoto(unit)}>
                <IconCamera size={32} class="text-tertiary" />
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginTop: '6px' }}>Belum ada foto</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Ketuk untuk tambah foto unit</span>
              </div>
            )}
          </div>

          {/* 3. Title & Specs Chips */}
          <div>
            <h1 id="title-unit-detail" class="title-lg" style={{ color: 'var(--text-primary)', lineHeight: 1.25 }}>
              {unit.nama}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              <span class="badge">{unit.kondisi}</span>
              {unit.grade && <span class="badge">Grade {unit.grade}</span>}
              {unit.baterai && <span class="badge">Baterai {unit.baterai}%</span>}
              <span class={`badge ${unit.bebasKunci === 'Ya' ? 'badge-ready' : 'badge-servis'}`}>
                {unit.bebasKunci === 'Ya' ? 'Bebas Kunci Akun' : 'Kunci Belum Dicek'}
              </span>
              <span class="badge">{unit.kelengkapan}</span>
              <span class="badge">{unit.umurHari} hari di stok</span>
            </div>
          </div>

          {/* 4. Harga & Margin Card */}
          <div class="card" style={{ background: 'var(--neutral-surface-2)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
              Harga Jual Target
            </span>
            <div class="text-uang" style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--brand-green-700)', marginTop: '2px' }}>
              {rupiah(unit.hargaJualTarget)}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Modal:</span>
              <strong class="text-uang">
                {isPrivacyMode ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <IconLock size={12} /> {maskText}
                  </span>
                ) : (
                  rupiah(unit.hpp)
                )}
              </strong>
              <span>•</span>
              <span style={{ color: 'var(--text-secondary)' }}>Potensi Laba:</span>
              <strong class="text-uang" style={{ color: potensiLaba >= 0 ? 'var(--brand-green-700)' : 'var(--status-danger-solid)' }}>
                {isPrivacyMode ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <IconLock size={12} /> {maskText}
                  </span>
                ) : (
                  `+${rupiah(potensiLaba)}`
                )}
              </strong>
            </div>
          </div>

          {/* 5. Rincian Modal (Section 8.6) */}
          <div class="card" style={{ padding: '14px' }}>
            <h3 class="title-sm" style={{ marginBottom: '8px' }}>Rincian Modal</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: 'var(--text-xs)' }}>
              <div class="flex-between">
                <span class="text-secondary">Harga Beli Unit:</span>
                <span class="text-uang font-semibold">{isPrivacyMode ? maskText : rupiah(unit.hargaBeli)}</span>
              </div>
              <div class="flex-between">
                <span class="text-secondary">Biaya Lain (Ongkir/Cuci):</span>
                <span class="text-uang font-semibold">{isPrivacyMode ? maskText : rupiah(unit.biayaLain)}</span>
              </div>
              <div class="flex-between">
                <span class="text-secondary">Biaya Servis Aktual:</span>
                <span class="text-uang font-semibold">{isPrivacyMode ? maskText : rupiah(unit.biayaServis)}</span>
              </div>
              {unit.estimasiServis && unit.estimasiServis > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-warning-solid)', background: 'var(--status-warning-bg)', padding: '4px 6px', borderRadius: '4px' }}>
                  <span>Estimasi servis (belum selesai):</span>
                  <span class="text-uang">+{rupiah(unit.estimasiServis)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px', fontWeight: 700 }}>
                <span>Total Modal Unit:</span>
                <span class="text-uang" style={{ color: 'var(--brand-navy-900)' }}>
                  {isPrivacyMode ? maskText : rupiah(unit.hpp)}
                </span>
              </div>
            </div>
          </div>

          {/* 6. Info IMEI & Detail Identitas */}
          <div class="card" style={{ padding: '14px' }}>
            <h3 class="title-sm" style={{ marginBottom: '8px' }}>Identitas Perangkat</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: 'var(--text-xs)' }}>
              <div class="flex-between">
                <span class="text-secondary">IMEI Utama (15 Digit):</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{unit.imei}</code>
                  <button class="btn-icon" onClick={handleCopyImei} aria-label="Salin IMEI" style={{ width: '28px', height: '28px' }}>
                    {copiedImei ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  </button>
                </div>
              </div>

              <div class="flex-between">
                <span class="text-secondary">Sumber Pengadaan:</span>
                <strong>{unit.sumberSupplier || 'Supplier Umum'}</strong>
              </div>

              <div class="flex-between">
                <span class="text-secondary">Tanggal Masuk Toko:</span>
                <span>{unit.tglMasuk}</span>
              </div>

              {unit.catatan && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                  <span class="text-secondary">Catatan Fisik / Kondisi:</span>
                  <p style={{ marginTop: '2px', fontStyle: 'italic', color: 'var(--text-primary)' }}>{unit.catatan}</p>
                </div>
              )}
            </div>
          </div>

          {/* 7. Riwayat Timeline Perjalanan Unit */}
          <div class="card" style={{ padding: '14px' }}>
            <h3 class="title-sm" style={{ marginBottom: '10px' }}>Riwayat Status Unit</h3>
            <div class="timeline-container">
              <div class="timeline-step done">
                <div class="timeline-bullet" />
                <div class="timeline-content">
                  <span class="timeline-title">Barang Masuk Toko</span>
                  <span class="timeline-date">{unit.tglMasuk} • Modal {isPrivacyMode ? maskText : rupiah(unit.hargaBeli)}</span>
                </div>
              </div>

              {unit.biayaServis > 0 && (
                <div class="timeline-step done">
                  <div class="timeline-bullet" />
                  <div class="timeline-content">
                    <span class="timeline-title">Servis Selesai</span>
                    <span class="timeline-date">Biaya part & jasa {isPrivacyMode ? maskText : rupiah(unit.biayaServis)} ditambahkan ke Modal</span>
                  </div>
                </div>
              )}

              {unit.status === 'Servis' && (
                <div class="timeline-step current">
                  <div class="timeline-bullet" />
                  <div class="timeline-content">
                    <span class="timeline-title">Sedang Diservis</span>
                    <span class="timeline-date">Dalam pengerjaan teknisi</span>
                  </div>
                </div>
              )}

              {unit.status === 'Ready' && (
                <div class="timeline-step current">
                  <div class="timeline-bullet" />
                  <div class="timeline-content">
                    <span class="timeline-title">Siap Dijual (Ready)</span>
                    <span class="timeline-date">Pajang di etalase toko</span>
                  </div>
                </div>
              )}

              {unit.status === 'Terjual' && (
                <div class="timeline-step done">
                  <div class="timeline-bullet" />
                  <div class="timeline-content">
                    <span class="timeline-title">Laku Terjual</span>
                    <span class="timeline-date">Nota {unit.notaJualId || 'JUAL-2610-0042'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 8. Contextual Bottom Actions Bar */}
        <div class="sheet-footer flex gap-2">
          {unit.status === 'Ready' && (
            <>
              <button
                class="btn btn-secondary"
                onClick={() => { onKirimKeServis(unit); onClose(); }}
                style={{ flex: 1 }}
              >
                <IconWrench size={18} />
                <span>Kirim ke Servis</span>
              </button>
              <button
                class="btn btn-primary"
                onClick={() => { onJual(unit); onClose(); }}
                style={{ flex: 2 }}
              >
                <IconReceipt size={18} />
                <span>Jual Sekarang</span>
              </button>
            </>
          )}

          {unit.status === 'Servis' && (
            <button
              class="btn btn-primary btn-block"
              onClick={() => { onKirimKeServis(unit); onClose(); }}
            >
              <IconWrench size={18} />
              <span>Buka Kartu Servis</span>
            </button>
          )}

          {unit.status === 'Terjual' && onLihatNota && (
            <button
              class="btn btn-primary btn-block"
              onClick={() => { onLihatNota(unit.notaJualId || 'JUAL-2610-0042'); onClose(); }}
            >
              <IconReceipt size={18} />
              <span>Lihat Nota Transaksi</span>
            </button>
          )}

          {unit.status === 'Rusak' && (
            <button class="btn btn-secondary btn-block" onClick={onClose}>
              Tutup Detail
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
