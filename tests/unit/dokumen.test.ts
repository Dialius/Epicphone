import { describe, it, expect } from 'vitest';
import { notaDokumen, laporanDokumen, esc } from '../../src/frontend/lib/dokumen';
import { TOKO_DEMO, DataNota } from '../../src/frontend/components/NotaModal';
import { laporanContoh } from '../../src/frontend/lib/laporan';

const NOTA: DataNota = {
  noNota: 'JUAL-2610-0043', tanggalWib: '13 Okt 2026, 16.21 WIB', namaPelanggan: 'Budi <b>Santoso</b>', noWa: '0812-3456-7890',
  items: [
    { nama: 'Samsung Galaxy A54 5G 8/256 GB Hitam', imei: '358123456784521', kondisi: 'Bekas (Grade B)', qty: 1, harga: 3250000, subtotal: 3250000, garansi: '20 Okt 2026 (7 hari)' },
    { nama: 'iPhone 13 128 GB Midnight', imei: '359981240181102', kondisi: 'Bekas (Grade A)', qty: 1, harga: 7800000, subtotal: 7800000 },
  ],
  bonus: [{ nama: 'Tempered glass', qty: 1 }], subtotal: 11050000, diskon: 0,
  tukarTambah: { ada: true, unit: 'Samsung Galaxy S21 8/128 GB Abu-abu', imei: '490154203237518', nilai: 1500000 },
  totalTagihan: 9550000, dibayar: 5000000, sisa: 4550000, metodeBayar: 'Tunai', jatuhTempo: '27 Okt 2026', garansiSampai: '20 Okt 2026 (7 hari)',
};

describe('dokumen cetak', () => {
  it('esc melindungi karakter HTML', () => {
    expect(esc('<img onerror="x">&\'')).toBe('&lt;img onerror=&quot;x&quot;&gt;&amp;&#39;');
  });

  it('nota A5: memuat semua bagian penting, terbilang, status belum lunas, dan tidak memuat modal/laba', () => {
    const h = notaDokumen(NOTA, TOKO_DEMO, 'A5');
    for (const t of ['NOTA PENJUALAN', 'JUAL-2610-0043', 'Samsung Galaxy A54 5G 8/256 GB Hitam', 'IMEI 358123456784521', 'Garansi s/d 20 Okt 2026 (7 hari)',
      'BONUS', 'Tempered glass', 'Tukar tambah', 'Rp 9.550.000', 'Sembilan juta lima ratus lima puluh ribu rupiah', 'BELUM LUNAS', 'Rp 4.550.000', 'Penerima', 'Hormat kami', 'Terima kasih']) {
      expect(h, t).toContain(t);
    }
    expect(h).toContain('@page { size: A5 portrait');
    expect(h.replace(/data:image[^"')]+/g, '')).not.toMatch(/HPP|modal|laba/i); // logo (base64) dikecualikan dari pemeriksaan teks
  });

  it('nota meng-escape nama pelanggan (tidak ada HTML liar)', () => {
    const h = notaDokumen(NOTA, TOKO_DEMO, 'A5');
    expect(h).toContain('Budi &lt;b&gt;Santoso&lt;/b&gt;');
    expect(h).not.toContain('<b>Santoso</b>');
  });

  it('nota lunas menampilkan LUNAS; struk 80mm memakai kertas 80mm dan satu kolom', () => {
    const lunas = notaDokumen({ ...NOTA, dibayar: 9550000, sisa: 0 }, TOKO_DEMO, '80mm');
    expect(lunas).toContain('LUNAS');
    expect(lunas).not.toContain('BELUM LUNAS');
    expect(lunas).toContain('@page { size: 80mm 297mm');
  });

  it('pratinjau layar membungkus kertas dengan lebar kertas; versi cetak tanpa bayangan', () => {
    expect(notaDokumen(NOTA, TOKO_DEMO, 'A5', true)).toContain('class="layar"');
    expect(notaDokumen(NOTA, TOKO_DEMO, 'A5', false)).not.toContain('class="layar"');
  });

  it('laporan A4: ringkasan, rincian laba, arus kas, stok, piutang, dan grafik tren', () => {
    const L = laporanContoh();
    const h = laporanDokumen(L, TOKO_DEMO, { dicetak: '13 Okt 2026, 16.19' });
    for (const t of ['LAPORAN KEUANGAN', L.periode, 'Rincian laba bersih', 'Laba bersih toko', 'Arus kas', 'Persediaan stok HP', 'Piutang dan hutang', 'Tren laba bersih', '<svg', '@page { size: A4 portrait']) {
      expect(h, t).toContain(t);
    }
  });

  it('laporan dengan samarkan menyembunyikan angka rupiah', () => {
    const L = laporanContoh();
    const h = laporanDokumen(L, TOKO_DEMO, { dicetak: 'x', samarkan: true });
    expect(h).toContain('Rp ••• •••');
    expect(h).not.toContain(`Rp ${L.omzet.toLocaleString('id-ID')}`);
  });

  it('laporanContoh beradaptasi dengan filter periode hari-ini dan 7-hari', () => {
    const lHari = laporanContoh('hari-ini');
    expect(lHari.periode).toContain('Hari ini');
    expect(lHari.jumlahHari).toBe(1);
    expect(lHari.tren12Bulan).toHaveLength(7); // slot jam hari ini

    const l7Hari = laporanContoh('7-hari');
    expect(l7Hari.periode).toContain('29 Sep');
    expect(l7Hari.jumlahHari).toBe(7);
    expect(l7Hari.tren12Bulan).toHaveLength(7); // 7 hari harian
  });
});
