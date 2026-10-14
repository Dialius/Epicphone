// GaransiScreen.tsx — S28 Garansi & Retur, S29 Form Klaim, & S30 Detail Klaim
// Warranty validation by IMEI/nota, status banners, impact summary card, & claim tracker

import { useState } from 'preact/hooks';
import type { KlaimItem, UnitHP, TransaksiItem } from '../mock/data-contoh';
import { useEffect } from 'preact/hooks';
import { tglWib, parseTgl, selisihHari, urutanBerikut, nomorDokumen } from '../lib/format';
import { tambahHari } from '../lib/nota';
import { IconShield, IconSearch, IconClose, IconAlertTriangle, IconPlus } from '../components/Icons';
import { MoneyInput } from '../components/ui/Form';
import { rupiah as fmtRupiah } from '../lib/format';

export interface HasilCariGaransi {
  unit: string;
  imei: string;
  nota: string;
  tglJual: string;
  pelanggan: string;
  garansiSampai: string;
  sisaHari: number;
  statusGaransi: 'Aktif' | 'Habis' | 'TanpaGaransi';
}

/** Isian tambahan form klaim yang dibutuhkan server */
export interface KlaimEkstra {
  alasanPokok: string;
  catatan: string;
  tindakan: string;
  nilaiRefund?: number;
  unitPengganti?: string;
  kondisiKembali?: 'Ready' | 'Rusak';
}

interface Props {
  klaimList?: KlaimItem[];
  stokList?: UnitHP[];
  transaksiList?: TransaksiItem[];
  imeiAwal?: string;
  garansiHari?: number;
  /** Mode nyata: garansi dihitung server (baru 12 bulan, bekas 7 hari) */
  onCekGaransi?: (query: string) => Promise<HasilCariGaransi | null>;
  /** Kembalikan false bila gagal agar form tetap terbuka */
  onSimpanKlaimBaru?: (klaim: KlaimItem, ekstra: KlaimEkstra) => void | boolean | Promise<boolean | void>;
}

export function GaransiScreen({
  klaimList = [],
  stokList = [],
  transaksiList = [],
  imeiAwal,
  garansiHari = 7,
  onCekGaransi,
  onSimpanKlaimBaru,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hasilCari, setHasilCari] = useState<{
    unit: string;
    imei: string;
    nota: string;
    tglJual: string;
    pelanggan: string;
    garansiSampai: string;
    sisaHari: number;
    statusGaransi: 'Aktif' | 'Habis' | 'TanpaGaransi';
  } | null>(null);
  const [belumKetemu, setBelumKetemu] = useState('');

  const [isFormKlaimOpen, setIsFormKlaimOpen] = useState(false);
  const [selectedKlaim, setSelectedKlaim] = useState<KlaimItem | null>(null);

  // S29 Form State
  const [jenisKlaim, setJenisKlaim] = useState<'Klaim garansi' | 'Retur' | 'Refund' | 'Tukar unit'>('Klaim garansi');
  const [alasanKlaim, setAlasanKlaim] = useState('Layar retak/bergaris');
  const [tindakanKlaim, setTindakanKlaim] = useState<'Servis' | 'Tukar unit' | 'Refund'>('Servis');
  const [catatanKlaim, setCatatanKlaim] = useState('');
  const [nilaiRefund, setNilaiRefund] = useState('');
  const [unitPengganti, setUnitPengganti] = useState('');
  const [kondisiKembali, setKondisiKembali] = useState<'Ready' | 'Rusak'>('Ready');
  const [galatForm, setGalatForm] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  const unitReady = stokList.filter(u => u.status === 'Ready');


  const cariGaransi = async (qRaw: string) => {
    const q = qRaw.trim().toLowerCase();
    if (!q) return;
    if (onCekGaransi) {
      const h = await onCekGaransi(qRaw.trim());
      if (!h) { setHasilCari(null); setBelumKetemu(qRaw.trim()); return; }
      setBelumKetemu('');
      setHasilCari(h);
      return;
    }
    const digit = q.replace(/\D/g, '');
    let trx: TransaksiItem | undefined; let item: NonNullable<TransaksiItem['items']>[number] | undefined;
    for (const x of transaksiList) {
      if (x.tipe !== 'Jual' || x.status === 'Dibatalkan') continue;
      if (x.id.toLowerCase() === q) { trx = x; item = (x.items || []).find(i => i.imei) || (x.items || [])[0]; break; }
      const hit = (x.items || []).find(i => i.imei && digit.length >= 4 && i.imei.includes(digit));
      if (hit) { trx = x; item = hit; break; }
    }
    if (!trx) {
      setHasilCari(null); setBelumKetemu(qRaw.trim()); return;
    }
    setBelumKetemu('');
    const sampai = tambahHari(trx.tanggal, garansiHari);
    const sisa = selisihHari(parseTgl(sampai)!, parseTgl(tglWib())!);
    setHasilCari({
      unit: item?.nama || trx.judul, imei: item?.imei || '-', nota: trx.id, tglJual: trx.tanggal, pelanggan: trx.pihak,
      garansiSampai: sampai, sisaHari: sisa, statusGaransi: sisa >= 0 ? 'Aktif' : 'Habis',
    });
  };
  const handleCari = (e: Event) => { e.preventDefault(); cariGaransi(searchQuery); };
  useEffect(() => { if (imeiAwal) { setSearchQuery(imeiAwal); cariGaransi(imeiAwal); } }, [imeiAwal]);

  const handleSimpanKlaim = async (e: Event) => {
    e.preventDefault();
    if (!hasilCari || menyimpan) return;
    const nRefund = parseInt(nilaiRefund.replace(/\D/g, ''), 10) || 0;
    if (jenisKlaim === 'Refund' && nRefund <= 0) { setGalatForm('Isi nilai refund sebagian.'); return; }
    if (jenisKlaim === 'Tukar unit' && !unitPengganti) { setGalatForm('Pilih unit pengganti dari stok Ready.'); return; }
    setGalatForm('');

    const baru: KlaimItem = {
      id: nomorDokumen('KLM', urutanBerikut(klaimList.map(k => k.id), 'KLM')),
      tanggal: tglWib(),
      notaId: hasilCari.nota,
      imei: hasilCari.imei,
      namaBarang: hasilCari.unit,
      pelanggan: hasilCari.pelanggan,
      jenis: jenisKlaim,
      alasan: `${alasanKlaim}. ${catatanKlaim}`,
      status: 'Dibuka',
      tindakan: tindakanKlaim,
      nilaiRefund: jenisKlaim === 'Refund' ? nRefund : undefined,
      unitPengganti: jenisKlaim === 'Tukar unit' ? unitPengganti : undefined,
      dampakLaba: jenisKlaim === 'Refund' ? -nRefund : 0,
    };

    if (onSimpanKlaimBaru) {
      setMenyimpan(true);
      let hasil: boolean | void;
      try {
        hasil = await Promise.resolve(onSimpanKlaimBaru(baru, {
          alasanPokok: alasanKlaim, catatan: catatanKlaim, tindakan: tindakanKlaim,
          nilaiRefund: jenisKlaim === 'Refund' ? nRefund : undefined,
          unitPengganti: jenisKlaim === 'Tukar unit' ? unitPengganti : undefined,
          kondisiKembali: jenisKlaim === 'Retur' || jenisKlaim === 'Tukar unit' ? kondisiKembali : undefined,
        }));
      } finally { setMenyimpan(false); }
      if (hasil === false) return;
    }
    setNilaiRefund(''); setUnitPengganti(''); setCatatanKlaim('');
    setIsFormKlaimOpen(false);
  };

  return (
    <div class="page-container">
      

      {/* S28 Search Bar */}
      <form onSubmit={handleCari} class="card flex flex-col gap-2 p-4">
        <label class="form-label font-bold">Cari Nota Jual atau 15 Digit IMEI</label>
        <div class="flex gap-2">
          <div class="search-input-box flex-1">
            <span class="search-icon-pos">
              <IconSearch size={20} />
            </span>
            <input
              type="text"
              class="search-input"
              placeholder="IMEI 15 digit atau nomor nota (JUAL-...)"
              value={searchQuery}
              onInput={e => setSearchQuery((e.target as HTMLInputElement).value)}
            />
          </div>
          <button type="submit" class="btn btn-primary px-5">
            Periksa Garansi
          </button>
        </div>
      </form>

      {!hasilCari && !belumKetemu && (
        <div class="card"><div class="empty-state"><div class="empty-icon"><IconShield size={26} /></div><h2>Periksa garansi unit</h2><p>Masukkan IMEI atau nomor nota di atas. Masa garansi dihitung dari tanggal penjualan.</p></div></div>
      )}
      {!hasilCari && belumKetemu && (
        <div class="banner banner-neutral" role="status"><IconAlertTriangle size={20} /><div><strong>Tidak ditemukan untuk "{belumKetemu}"</strong><div class="title-sub" style={{ color: 'inherit' }}>Periksa 15 digit IMEI atau nomor nota. Hanya penjualan yang tidak dibatalkan yang dicek.</div></div></div>
      )}
      {/* Hasil Cek Garansi Banner & Unit Card */}
      {hasilCari && (
        <div class="card flex flex-col gap-3 p-4">
          {/* Banner Status Garansi (Section 8.15) */}
          {hasilCari.statusGaransi === 'Aktif' ? (
            <div class="banner banner-success flex-between">
              <div class="flex items-center gap-2">
                <IconShield size={20} />
                <strong>Garansi Toko Aktif sampai {hasilCari.garansiSampai} (Sisa {hasilCari.sisaHari} hari lagi)</strong>
              </div>
              <span class="badge badge-ready">Berlaku</span>
            </div>
          ) : (
            <div class="banner banner-danger flex-between">
              <div class="flex items-center gap-2">
                <IconAlertTriangle size={20} />
                <strong>Masa Garansi Toko Sudah Berakhir {Math.abs(hasilCari.sisaHari)} hari lalu ({hasilCari.garansiSampai})</strong>
              </div>
              <span class="badge badge-telat">Garansi Habis</span>
            </div>
          )}

          <div class="flex-between w-full">
            <div>
              <h2 class="title-md">{hasilCari.unit}</h2>
              <div class="text-xs text-secondary mt-1 flex flex-wrap gap-2">
                <span>IMEI: <code class="font-mono">{hasilCari.imei}</code></span>
                <span>•</span>
                <span>Nota: <strong>{hasilCari.nota}</strong></span>
                <span>•</span>
                <span>Pembeli: <strong>{hasilCari.pelanggan}</strong></span>
              </div>
            </div>

            <button
              class="btn btn-primary"
              onClick={() => setIsFormKlaimOpen(true)}
            >
              <IconPlus size={16} />
              <span>Buat Klaim / Retur</span>
            </button>
          </div>
        </div>
      )}

      {/* S28 Daftar Riwayat Klaim */}
      <div>
        <h2 class="title-md mb-2">Daftar Klaim & Retur ({klaimList.length})</h2>
        <div class="flex flex-col gap-2">
          {klaimList.map(k => (
            <div
              key={k.id}
              class="card clickable p-4"
              onClick={() => setSelectedKlaim(k)}
            >
              <div class="flex-between items-start w-full">
                <div>
                  <div class="flex items-center gap-1">
                    <span class="text-xs font-mono text-tertiary">
                      {k.id}
                    </span>
                    <strong class="text-sm">{k.namaBarang}</strong>
                  </div>
                  <p class="text-xs text-secondary mt-1">
                    {k.tanggal} • {k.jenis} ({k.tindakan}) • Pelanggan: {k.pelanggan}
                  </p>
                  <p class="text-xs italic mt-0.5">
                    Alasan: {k.alasan}
                  </p>
                </div>

                <span class={`badge ${k.status === 'Selesai' ? 'badge-ready' : k.status === 'Diproses' ? 'badge-servis' : 'badge-info'}`}>
                  {k.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* S29 Form Klaim / Retur Modal */}
      {isFormKlaimOpen && (
        <div class="modal-overlay" onClick={() => setIsFormKlaimOpen(false)} role="dialog" aria-modal="true" aria-labelledby="title-form-klaim">
          <div class="sheet-container max-w-lg" onClick={e => e.stopPropagation()}>
            <div class="sheet-header">
              <h2 id="title-form-klaim" class="title-md">Buat klaim garansi</h2>
              <button class="btn-icon" onClick={() => setIsFormKlaimOpen(false)} aria-label="Tutup">
                <IconClose size={20} />
              </button>
            </div>

            <form onSubmit={handleSimpanKlaim}>
              <div class="sheet-body flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
                {/* Jenis Klaim Radio Cards */}
                <div>
                  <label class="form-label">Jenis Permintaan Klaim</label>
                  <div class="grid grid-cols-2 gap-2">
                    {(['Klaim garansi', 'Retur', 'Refund', 'Tukar unit'] as const).map(j => (
                      <button
                        type="button"
                        key={j}
                        class={`btn ${jenisKlaim === j ? 'btn-primary' : 'btn-secondary'} justify-center text-xs`}
                        onClick={() => setJenisKlaim(j)}
                      >
                        {j}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alasan Klaim Chips */}
                <div>
                  <label class="form-label">Alasan Kerusakan / Klaim</label>
                  <div class="flex flex-wrap gap-1.5 mb-2">
                    {['Layar retak/bergaris', 'Baterai drop cepat panas', 'Speaker suara sember', 'Kamera tidak fokus', 'Mati total'].map(a => (
                      <button
                        type="button"
                        key={a}
                        class={`filter-chip ${alasanKlaim === a ? 'aktif' : ''} text-xs`}
                        onClick={() => setAlasanKlaim(a)}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <textarea
                    class="form-input"
                    rows={2}
                    placeholder="Jelaskan kondisi detail kerusakan yang dialami..."
                    value={catatanKlaim}
                    onInput={e => setCatatanKlaim((e.target as HTMLTextAreaElement).value)}
                  />
                </div>

                {jenisKlaim === 'Refund' && (
                  <div>
                    <label class="form-label" for="refund-nilai">Nilai refund sebagian (Rp)</label>
                    <MoneyInput id="refund-nilai" value={nilaiRefund} onChange={setNilaiRefund} placeholder="150.000" />
                    <span class="text-xs text-secondary">Refund penuh dengan barang kembali dicatat sebagai Retur.</span>
                  </div>
                )}
                {jenisKlaim === 'Tukar unit' && (
                  <div>
                    <label class="form-label" for="tukar-unit">Unit pengganti (stok Ready)</label>
                    <select id="tukar-unit" class="form-input" value={unitPengganti} onChange={e => setUnitPengganti((e.target as HTMLSelectElement).value)}>
                      <option value="">Pilih unit…</option>
                      {unitReady.map(u => <option key={u.id} value={u.id}>{u.nama} · IMEI ...{u.imei.slice(-4)} · {u.id}</option>)}
                    </select>
                  </div>
                )}
                {(jenisKlaim === 'Retur' || jenisKlaim === 'Tukar unit') && (
                  <div>
                    <label class="form-label">Kondisi unit yang dikembalikan</label>
                    <div class="grid grid-cols-2 gap-2">
                      {(['Ready', 'Rusak'] as const).map(k => (
                        <button type="button" key={k} class={`btn ${kondisiKembali === k ? 'btn-primary' : 'btn-secondary'} justify-center text-xs`} onClick={() => setKondisiKembali(k)}>
                          {k === 'Ready' ? 'Bisa dijual lagi' : 'Rusak'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tindakan hanya untuk klaim garansi */}
                {jenisKlaim === 'Klaim garansi' && (
                <div>
                  <label class="form-label">Tindakan Penyelesaian</label>
                  <div class="grid grid-cols-3 gap-1.5">
                    {(['Servis', 'Tukar unit', 'Refund'] as const).map(t => (
                      <button
                        type="button"
                        key={t}
                        class={`btn ${tindakanKlaim === t ? 'btn-primary' : 'btn-secondary'} justify-center text-xs`}
                        onClick={() => setTindakanKlaim(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                )}

                {galatForm && <div class="banner banner-warning" role="alert">{galatForm}</div>}
                {/* Impact Summary Card (Section 8.15) */}
                <div class="card bg-surface-2 p-3 border border-subtle">
                  <span class="text-xs font-bold text-secondary uppercase">
                    Ringkasan Dampak Finansial & Stok:
                  </span>
                  <ul class="list-none mt-1.5 flex flex-col gap-1 text-xs">
                    {jenisKlaim === 'Klaim garansi' && (<>
                      <li class="text-primary">• Dibuat tugas servis untuk {hasilCari?.unit} tanpa tarif bagi pelanggan.</li>
                      <li class="text-primary">• Biaya part dan jasa tercatat sebagai biaya garansi di laporan laba.</li>
                    </>)}
                    {jenisKlaim === 'Retur' && (<>
                      <li class="text-primary">• Unit kembali ke stok ({kondisiKembali === 'Ready' ? 'Ready, modal tetap' : 'Rusak, tercatat sebagai kerugian'}).</li>
                      <li class="text-danger-solid">• Laba penjualan asal dibalik di bulan ini.</li>
                    </>)}
                    {jenisKlaim === 'Refund' && (
                      <li class="text-danger-solid">• Refund {nilaiRefund ? fmtRupiah(Number(nilaiRefund)) : 'sebagian'} tercatat sebagai kerugian bulan ini; unit tetap milik pelanggan.</li>
                    )}
                    {jenisKlaim === 'Tukar unit' && (<>
                      <li class="text-primary">• Unit pengganti keluar dari stok dengan nota yang sama.</li>
                      <li class="text-primary">• Dampak laba = selisih modal unit pengganti dan unit lama.</li>
                    </>)}
                  </ul>
                </div>
              </div>

              <div class="sheet-footer flex gap-2">
                <button type="button" class="btn btn-secondary flex-1" onClick={() => setIsFormKlaimOpen(false)}>
                  Batal
                </button>
                <button type="submit" class="btn btn-primary flex-2" disabled={menyimpan}>
                  {menyimpan ? 'Menyimpan…' : 'Simpan Klaim Garansi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* S30 Detail Klaim Modal */}
      {selectedKlaim && (
        <div class="modal-overlay" onClick={() => setSelectedKlaim(null)} role="dialog" aria-modal="true" aria-labelledby="title-detail-klaim">
          <div class="sheet-container max-w-md" onClick={e => e.stopPropagation()}>
            <div class="sheet-header">
              <div>
                <span class="text-xs font-mono text-tertiary">
                  {selectedKlaim.id}
                </span>
                <h2 id="title-detail-klaim" class="title-md">{selectedKlaim.namaBarang}</h2>
              </div>
              <button class="btn-icon" onClick={() => setSelectedKlaim(null)} aria-label="Tutup">
                <IconClose size={20} />
              </button>
            </div>

            <div class="sheet-body flex flex-col gap-3 text-xs">
              <div>
                <span class="text-secondary">Pelanggan:</span>
                <strong> {selectedKlaim.pelanggan}</strong>
              </div>
              <div>
                <span class="text-secondary">Nomor Nota Asal:</span>
                <strong> {selectedKlaim.notaId}</strong>
              </div>
              <div>
                <span class="text-secondary">Alasan Klaim:</span>
                <p class="mt-0.5 text-primary">{selectedKlaim.alasan}</p>
              </div>
              <div class="flex-between border-t border-subtle pt-2">
                <span class="text-secondary">Tindakan:</span>
                <strong>{selectedKlaim.tindakan}</strong>
              </div>
              <div class="flex-between">
                <span class="text-secondary">Status:</span>
                <span class="badge badge-ready">{selectedKlaim.status}</span>
              </div>
            </div>

            <div class="sheet-footer">
              <button class="btn btn-secondary btn-block" onClick={() => setSelectedKlaim(null)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
