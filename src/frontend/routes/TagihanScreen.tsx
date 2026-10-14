import { linkWa, normalisasiWa } from '../lib/format';
// TagihanScreen.tsx — S26 Buku Tagihan (Piutang & Hutang)
// Summary strip, aging segmented horizontal bar, filtering, & debt/receivable ledger

import { useState } from 'preact/hooks';
import { Tagihan, MOCK_TAGIHAN } from '../mock/data-contoh';
import { IconReceipt } from '../components/Icons';

interface Props {
  tagihanList?: Tagihan[];
  onBukaDetailTagihan: (t: Tagihan) => void;
  filterAwal?: string;
}

export function TagihanScreen({ tagihanList = MOCK_TAGIHAN, onBukaDetailTagihan, filterAwal }: Props) {
  const [tabJenis, setTabJenis] = useState<'Piutang pelanggan' | 'Hutang supplier'>('Piutang pelanggan');
  const [filterChip, setFilterChip] = useState<'Semua' | 'Telat' | 'Minggu ini' | 'Lunas'>(filterAwal === 'telat' ? 'Telat' : 'Semua');

  const rupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  const daftar = tagihanList.filter(t => {
    if (t.jenis !== tabJenis) return false;
    if (filterChip === 'Telat') return t.status === 'Telat' || t.hariTelat > 0;
    if (filterChip === 'Lunas') return t.status === 'Lunas' || t.sisa === 0;
    if (filterChip === 'Minggu ini') return t.sisa > 0 && t.hariTelat <= 7;
    return true;
  });

  const totalPiutang = tagihanList
    .filter(t => t.jenis === 'Piutang pelanggan')
    .reduce((acc, curr) => acc + curr.sisa, 0);

  const totalHutang = tagihanList
    .filter(t => t.jenis === 'Hutang supplier')
    .reduce((acc, curr) => acc + curr.sisa, 0);

  const totalTelat = tagihanList.filter(t => t.status === 'Telat' || t.hariTelat > 0).length;

  const pesanTagih = (t: Tagihan) => `Halo ${t.kontak}, kami dari Epic Phone Purwokerto. Mengingatkan tagihan ${t.id} sisa ${rupiah(t.sisa)} dengan jatuh tempo ${t.jatuhTempo}. Terima kasih.`;
  const bisaTagih = (t: Tagihan) => t.jenis === 'Piutang pelanggan' && t.sisa > 0 && normalisasiWa(t.noWa).length >= 10;

  return (
    <div class="page-container">
      {/* Header Summary Strip (Section 8.14 S26) */}
      <div class="tagihan-summary-strip">
        <div class="tagihan-strip-item">
          <span class="tagihan-strip-lbl">Total Piutang (Pelanggan)</span>
          <div class="text-uang tagihan-strip-val text-brand">
            {rupiah(totalPiutang)}
          </div>
        </div>

        <div class="tagihan-strip-item">
          <span class="tagihan-strip-lbl">Total Hutang (Supplier)</span>
          <div class="text-uang tagihan-strip-val text-danger">
            {rupiah(totalHutang)}
          </div>
        </div>

        <div class="tagihan-strip-item">
          <span class="tagihan-strip-lbl">Tagihan Telat Tempo</span>
          <div class="text-uang tagihan-strip-val text-danger">
            {totalTelat} Tagihan
          </div>
        </div>
      </div>

      {/* Aging Segmented Horizontal Bar (Section 8.14 S26) */}
      <div class="card">
        <div class="aging-card-header">
          <span class="aging-card-title">
            Analisis Umur Tagihan (Aging Bar)
          </span>
          <span class="aging-card-subtitle">Jatuh Tempo</span>
        </div>

        {/* Segmented Bar */}
        <div class="aging-bar-container">
          <div class="aging-bar-seg seg-belum" style={{ width: '60%' }} title="Belum Jatuh Tempo (60%)" />
          <div class="aging-bar-seg seg-telat-1-7" style={{ width: '25%' }} title="Telat 1-7 Hari (25%)" />
          <div class="aging-bar-seg seg-telat-8-30" style={{ width: '15%' }} title="Telat 8-30 Hari (15%)" />
        </div>

        {/* Legend */}
        <div class="aging-legend-row mt-2">
          <div class="aging-legend-item">
            <div class="aging-dot dot-belum" />
            <span>Belum Jatuh Tempo (Rp 3,0jt)</span>
          </div>
          <div class="aging-legend-item">
            <div class="aging-dot dot-telat-1-7" />
            <span>Telat 1-7 Hari (Rp 1,2jt)</span>
          </div>
          <div class="aging-legend-item">
            <div class="aging-dot dot-telat-8-30" />
            <span>Telat &gt;30 Hari (Rp 0)</span>
          </div>
        </div>
      </div>

      {/* Tabs Piutang vs Hutang */}
      <div class="tabs-underlined" role="tablist" aria-label="Jenis Tagihan">
        <button
          role="tab"
          aria-selected={tabJenis === 'Piutang pelanggan'}
         
          id="tab-piutang"
          class={`tab-underline-item ${tabJenis === 'Piutang pelanggan' ? 'aktif' : ''}`}
          onClick={() => setTabJenis('Piutang pelanggan')}
        >
          Piutang Pelanggan ({tagihanList.filter(t => t.jenis === 'Piutang pelanggan').length})
        </button>
        <button
          role="tab"
          aria-selected={tabJenis === 'Hutang supplier'}
         
          id="tab-hutang"
          class={`tab-underline-item ${tabJenis === 'Hutang supplier' ? 'aktif' : ''}`}
          onClick={() => setTabJenis('Hutang supplier')}
        >
          Hutang Supplier ({tagihanList.filter(t => t.jenis === 'Hutang supplier').length})
        </button>
      </div>

      {/* Filter Chips */}
      <div class="filter-chip-row" role="group" aria-label="Filter status tagihan">
        {(['Semua', 'Telat', 'Minggu ini', 'Lunas'] as const).map(c => (
          <button
            key={c}
            class={`filter-chip ${filterChip === c ? 'aktif' : ''}`}
            onClick={() => setFilterChip(c)}
            aria-pressed={filterChip === c}
          >
            {c}
          </button>
        ))}
      </div>

      {/* List & Table Tagihan */}
      {daftar.length === 0 ? (
        <div class="card list-tagihan-empty">
          <IconReceipt size={32} class="text-tertiary mx-auto mb-2 block" />
          <h2 class="title-md text-primary">Tidak ada tagihan. Semua beres.</h2>
          <p>Semua cicilan dan tempo pembayaran pada kategori ini telah lunas.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div class="desktop-table-wrapper card p-0 overflow-hidden">
            <table class="data-table" data-density="nyaman">
              <thead>
                <tr>
                  <th scope="col">ID Tagihan</th>
                  <th scope="col">Kontak</th>
                  <th scope="col">Status</th>
                  <th scope="col">Progres Pembayaran</th>
                  <th scope="col">Sisa Tagihan</th>
                  <th scope="col">Jatuh Tempo</th>
                  <th scope="col"><span class="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                {daftar.map(t => {
                  const persen = t.total > 0 ? Math.round((t.terbayar / t.total) * 100) : 0;
                  return (
                    <tr key={t.id} class="clickable cursor-pointer" onClick={() => onBukaDetailTagihan(t)}>
                      <td>
                        <div class="tagihan-card-ref">{t.id}</div>
                        <div class="tagihan-card-ref">Ref: {t.refId}</div>
                      </td>
                      <td>
                        <div class="font-bold text-primary">{t.kontak}</div>
                        <div class="tagihan-card-wa">WA: {t.noWa}</div>
                      </td>
                      <td>
                        <span class={`badge ${t.status === 'Telat' ? 'badge-telat' : t.status === 'Lunas' ? 'badge-ready' : 'badge-servis'}`}>
                          {t.status} {t.hariTelat > 0 ? `(${t.hariTelat} hari)` : ''}
                        </span>
                      </td>
                      <td>
                        <div class="tagihan-card-progress-labels">
                          <span class="text-secondary">{persen}% ({rupiah(t.terbayar)})</span>
                        </div>
                        <div class="progress-bar-track">
                          <div
                            class={`progress-bar-fill ${t.sisa === 0 ? 'bg-success' : 'bg-brand'}`}
                            style={{ width: `${Math.min(100, persen)}%` }}
                          />
                        </div>
                      </td>
                      <td>
                        <div class={`text-uang font-bold text-base ${t.sisa > 0 ? 'text-danger' : 'text-success'}`}>
                          {rupiah(t.sisa)}
                        </div>
                      </td>
                      <td>
                        <div class={`font-bold ${t.status === 'Telat' ? 'text-danger' : 'text-primary'}`}>
                          {t.jatuhTempo}
                        </div>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        {bisaTagih(t) && <a class="btn btn-secondary btn-sm" href={linkWa(t.noWa, pesanTagih(t))} target="_blank" rel="noopener noreferrer">Tagih WA</a>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div class="mobile-card-list">
            {daftar.map(t => {
              const persen = t.total > 0 ? Math.round((t.terbayar / t.total) * 100) : 0;
              return (
                <div
                  key={t.id}
                  class="card card-clickable flex flex-col gap-2"
                  onClick={() => onBukaDetailTagihan(t)}
                >
                  <div class="flex-between w-full">
                    <div>
                      <span class="tagihan-card-ref">
                        {t.id} • Ref: {t.refId}
                      </span>
                      <h2 class="title-md mt-1">{t.kontak}</h2>
                      <span class="tagihan-card-wa">WA: {t.noWa}</span>
                    </div>

                    <span class={`badge ${t.status === 'Telat' ? 'badge-telat' : t.status === 'Lunas' ? 'badge-ready' : 'badge-servis'}`}>
                      {t.status} {t.hariTelat > 0 ? `(${t.hariTelat} hari)` : ''}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div class="tagihan-card-progress-labels">
                      <span class="text-secondary">Terbayar: {rupiah(t.terbayar)} ({persen}%)</span>
                      <span class="text-secondary">Total: {rupiah(t.total)}</span>
                    </div>
                    <div class="progress-bar-track">
                      <div
                        class={`progress-bar-fill ${t.sisa === 0 ? 'bg-success' : 'bg-brand'}`}
                        style={{ width: `${Math.min(100, persen)}%` }}
                      />
                    </div>
                  </div>

                  <div class="tagihan-card-footer">
                    <div>
                      <span class="tagihan-card-footer-lbl">Sisa Tagihan:</span>
                      <div class={`text-uang tagihan-card-sisa ${t.sisa > 0 ? 'text-danger' : 'text-success'}`}>
                        {rupiah(t.sisa)}
                      </div>
                    </div>

                    <div class="text-right">
                      <span class="tagihan-card-footer-lbl">Jatuh Tempo:</span>
                      <div class={`tagihan-card-tempo ${t.status === 'Telat' ? 'text-danger' : 'text-primary'}`}>
                        {t.jatuhTempo}
                      </div>
                    </div>
                  </div>
                  {bisaTagih(t) && <a class="btn btn-secondary btn-block" href={linkWa(t.noWa, pesanTagih(t))} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>Tagih lewat WhatsApp</a>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
