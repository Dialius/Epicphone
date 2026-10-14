import { ImgAman } from './ui/Kit';
import { useOverlay } from '../lib/overlay';
// FotoUnitModal.tsx — S20 Foto Unit
// Grid of 96px position tiles, camera/gallery upload simulator, & full-screen photo viewer with mono file name

import { useEffect, useRef, useState } from 'preact/hooks';
import { UnitHP, fotoContoh } from '../mock/data-contoh';
import { FotoServer } from '../lib/api';
import { FotoKompresi, kompresFoto } from '../lib/foto';
import { IconClose, IconCamera, IconTrash, IconCopy, IconCheck } from './Icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  unit: UnitHP | null;
  /** Mode demo: simulasi lokal (gambar contoh). */
  onSimpanFoto: (unitId: string, fotoList: string[]) => void;
  /** Mode nyata: foto dimuat, diunggah (kamera/galeri, dikompres di peramban), dan dibuang lewat server. */
  server?: {
    muat: (unitId: string) => Promise<FotoServer[]>;
    unggah: (unitId: string, posisi: string, foto: FotoKompresi) => Promise<{ ok: boolean; pesan?: string }>;
    hapus: (idBerkas: string) => Promise<boolean>;
  };
}

interface PosisiSlot {
  key: string;
  label: string;
  wajib: boolean;
}

const DAFTAR_POSISI: PosisiSlot[] = [
  { key: 'DEPAN', label: 'Depan', wajib: true },
  { key: 'BELAKANG', label: 'Belakang', wajib: true },
  { key: 'LAYAR-MENYALA', label: 'Layar Menyala', wajib: true },
  { key: 'SAMPING', label: 'Samping', wajib: false },
  { key: 'IMEI', label: 'IMEI / Barcode', wajib: false },
  { key: 'BATERAI', label: 'Baterai / BH', wajib: false },
  { key: 'DUS', label: 'Dus Box', wajib: false },
  { key: 'KELENGKAPAN', label: 'Kelengkapan', wajib: false },
  { key: 'CACAT', label: 'Fisik / Cacat', wajib: false },
  { key: 'LAINNYA', label: 'Lainnya (+)', wajib: false },
];

export function FotoUnitModal({ isOpen, onClose, unit, onSimpanFoto, server }: Props) {
  useOverlay(onClose);
  if (!isOpen || !unit) return null;

  const [serverFoto, setServerFoto] = useState<FotoServer[]>([]);
  const [memuat, setMemuat] = useState(!!server);
  const [mengunggah, setMengunggah] = useState<string | null>(null);
  const [pesan, setPesan] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const posisiTarget = useRef('');
  const muat = async () => {
    if (!server) return;
    setMemuat(true);
    try { setServerFoto(await server.muat(unit.id)); } finally { setMemuat(false); }
  };
  useEffect(() => { muat(); }, [unit.id]);

  const [fotoMapDemo, setFotoMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (unit.foto && unit.foto.length > 0) {
      map['DEPAN'] = unit.foto[0];
      if (unit.foto[1]) map['BELAKANG'] = unit.foto[1];
      if (unit.foto[2]) map['LAYAR-MENYALA'] = unit.foto[2];
    }
    return map;
  });

  // Mode nyata: satu gambar kecil per posisi (foto pertama); gambar kosong bila thumbnail Drive belum siap
  const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#E5E7EB"/></svg>');
  const fotoMap: Record<string, string> = server
    ? serverFoto.reduce<Record<string, string>>((m, f) => {
        if (!m[f.posisi]) {
          const directUrl = f.link?.includes('/file/d/')
            ? `https://lh3.googleusercontent.com/d/${f.link.split('/d/')[1]?.split('/')[0]}`
            : f.link;
          m[f.posisi] = f.pratinjau || directUrl || PLACEHOLDER;
        }
        return m;
      }, {})
    : fotoMapDemo;
  const infoServer = (pos: string) => serverFoto.find(f => f.posisi === pos);

  const pilihFoto = (pos: string) => {
    if (!server) { handleSimulasiUpload(pos); return; }
    posisiTarget.current = pos;
    inputRef.current?.click();
  };

  const onFilePilih = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !server) return;
    const pos = posisiTarget.current;
    setMengunggah(pos);
    setPesan('');
    try {
      const f = await kompresFoto(file);
      const r = await server.unggah(unit.id, pos, f);
      if (!r.ok) setPesan(r.pesan || 'Foto gagal diunggah. Coba lagi.');
      else await muat();
    } catch {
      setPesan('Foto tidak bisa diproses. Coba ambil ulang.');
    } finally {
      setMengunggah(null);
    }
  };

  const [activeViewerPos, setActiveViewerPos] = useState<string | null>(null);
  const [copiedName, setCopiedName] = useState(false);

  // Generate standardized Drive filename (Section 8.12 / PRD-09)
  const getStandardFilename = (pos: string) => {
    return infoServer(pos)?.nama ?? `EPICPHONE_FOTO-HP_${unit.id}_${pos}_01_2026-10-05_1432.jpg`;
  };

  const handleSimulasiUpload = (pos: string) => {
    // Generate high quality sample camera photo
    const sampleUrls: Record<string, string> = {
      'DEPAN': fotoContoh('photo-1610945415295-d9bbf067e59c'),
      'BELAKANG': fotoContoh('photo-1592750475338-74b7b21085ab'),
      'LAYAR-MENYALA': fotoContoh('photo-1511707171634-5f897ff02aa9'),
      'SAMPING': fotoContoh('photo-1565849904461-04a58ad377e0'),
      'IMEI': fotoContoh('photo-1580910051074-3eb694886505'),
      'BATERAI': fotoContoh('photo-1584438784894-089d6a62b8fa'),
      'DUS': fotoContoh('photo-1546868871-7041f2a55e12'),
    };

    const newMap = { ...fotoMap, [pos]: sampleUrls[pos] || sampleUrls['DEPAN'] };
    setFotoMap(newMap);
    onSimpanFoto(unit.id, Object.values(newMap));
  };

  const handleHapusFoto = async (pos: string) => {
    if (server) {
      const info = infoServer(pos);
      if (info && await server.hapus(info.idBerkas)) { await muat(); setActiveViewerPos(null); }
      else setPesan('Foto belum bisa dibuang. Coba lagi.');
      return;
    }
    const newMap = { ...fotoMap };
    delete newMap[pos];
    setFotoMap(newMap);
    onSimpanFoto(unit.id, Object.values(newMap));
    setActiveViewerPos(null);
  };

  const handleCopyName = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedName(true);
    setTimeout(() => setCopiedName(false), 2000);
  };

  const totalFoto = Object.keys(fotoMap).length;

  return (
    <div class="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="title-foto-unit">
      <div class="sheet-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div class="sheet-drag-handle" />

        <div class="sheet-header">
          <div>
            <h2 id="title-foto-unit" class="title-md">Foto Dokumentasi Unit</h2>
            <span class="title-sub">{unit.nama} ({totalFoto} dari 10 slot terisi)</span>
          </div>
          <button class="btn-icon" onClick={onClose} aria-label="Tutup kelola foto">
            <IconClose size={20} />
          </button>
        </div>

        <div class="sheet-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Helper notice */}
          <div class="banner banner-info" style={{ marginBottom: '16px', fontSize: 'var(--text-xs)' }}>
            Foto unit bekas wajib: <strong>Depan, Belakang, dan Layar Menyala</strong>. Foto otomatis dioptimalkan di peramban (maks 2 MB) sebelum disimpan ke Google Drive.
          </div>
          {server && <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFilePilih} />}
          {memuat && <div class="banner banner-info" role="status" style={{ marginBottom: '12px', fontSize: 'var(--text-xs)' }}>Memuat foto dari Google Drive…</div>}
          {pesan && <div class="banner banner-warning" role="alert" style={{ marginBottom: '12px', fontSize: 'var(--text-xs)' }}>{pesan}</div>}

          {/* Grid 96px Tiles (3 cols mobile, 5 cols desktop) */}
          <div class="foto-slot-grid">
            {DAFTAR_POSISI.map(slot => {
              const url = fotoMap[slot.key];
              return (
                <div key={slot.key} class="foto-slot-item">
                  {url ? (
                    <div class="foto-tile-filled" onClick={() => setActiveViewerPos(slot.key)}>
                      <ImgAman src={url} alt={slot.label} class="foto-tile-thumb" />
                      <span class="foto-tile-tag">{slot.label}</span>
                      <div class="foto-tile-check">
                        <IconCheck size={12} />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      class={`foto-tile-empty ${slot.wajib ? 'wajib' : ''}`}
                      disabled={mengunggah !== null}
                      onClick={() => pilihFoto(slot.key)}
                    >
                      <IconCamera size={22} class="text-tertiary" />
                      <span class="foto-tile-label">{mengunggah === slot.key ? 'Mengunggah…' : slot.label}</span>
                      {slot.wajib && <span class="foto-badge-wajib">Wajib</span>}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Photo Full-screen Detail Viewer Drawer (Section 8.12 S20) */}
          {activeViewerPos && fotoMap[activeViewerPos] && (
            <div class="photo-viewer-box" style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: 'var(--text-sm)' }}>
                  Pratinjau Foto: {activeViewerPos}
                </strong>
                <button class="btn-icon" onClick={() => setActiveViewerPos(null)} aria-label="Tutup tampilan foto">
                  <IconClose size={18} />
                </button>
              </div>

              <div style={{ width: '100%', height: '240px', background: 'var(--bg-subtle)', borderRadius: 'var(--rad-md)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ImgAman
                  src={fotoMap[activeViewerPos]}
                  alt="Foto preview"
                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>

              {/* Info Drawer: Posisi, Waktu, Ukuran, File Name in Mono with Copy */}
              <div class="card" style={{ marginTop: '10px', padding: '12px', background: 'var(--neutral-surface-2)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: 'var(--text-xs)' }}>
                  <div class="flex-between">
                    <span class="text-secondary">Posisi Slot:</span>
                    <strong>{activeViewerPos}</strong>
                  </div>
                  {!server && (
                    <>
                      <div class="flex-between">
                        <span class="text-secondary">Waktu Pengambilan:</span>
                        <span>05 Okt 2026, 14:32 WIB</span>
                      </div>
                      <div class="flex-between">
                        <span class="text-secondary">Ukuran Berkas:</span>
                        <span>248 KB (JPEG Canvas Quality 0.8)</span>
                      </div>
                    </>
                  )}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                    <span class="text-secondary">Nama Berkas di Google Drive:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', background: 'var(--bg-surface)', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--border-subtle)', wordBreak: 'break-all', flex: 1 }}>
                        {getStandardFilename(activeViewerPos)}
                      </code>
                      <button
                        class="btn-icon"
                        onClick={() => handleCopyName(getStandardFilename(activeViewerPos))}
                        aria-label="Salin nama file"
                        style={{ width: '28px', height: '28px' }}
                      >
                        {copiedName ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    class="btn btn-danger"
                    onClick={() => handleHapusFoto(activeViewerPos)}
                    style={{ height: '36px', fontSize: 'var(--text-xs)' }}
                  >
                    <IconTrash size={14} />
                    <span>Buang Foto Ini</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div class="sheet-footer">
          <button class="btn btn-primary btn-block" onClick={onClose}>
            Selesai Kelola Foto
          </button>
        </div>
      </div>
    </div>
  );
}
