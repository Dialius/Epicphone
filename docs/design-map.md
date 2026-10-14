# Design Map & Audit

## Peta Layar (Screen Map)

| ID Layar | Nama Frame Figma | Rute Hash | Komponen Utama | Fungsi Backend (PRD 03) | Status |
|---|---|---|---|---|---|
| S00 | Splash & Tur | `/tur` | `Button`, `Carousel` | - | 🔴 Belum |
| S01 | Beranda | `/` | `Header`, `Sidebar`, `Kartu`, `Tabel`, `Chart` | `ambilDataBeranda()` | 🔴 Belum |
| S02 | Pusat Peringatan | (Popover) | `Header`, `Popover`, `Lencana` | `ambilPeringatan()` | 🔴 Belum |
| S03 | Pencarian Global | (Popover) | `Header`, `InputTeks`, `Popover` | `cariGlobal()` | 🔴 Belum |
| S04 | Stok HP | `/stok/hp` | `Tabel`, `Filter`, `Lencana` | `ambilStokHP()` | 🔴 Belum |
| S05 | Detail Unit | `/stok/hp/:id` | `PanelTerdocking`, `Tab`, `ChipStatus` | `ambilDetailHP()` | 🔴 Belum |
| S06 | Stok Aksesoris | `/stok/aksesoris` | `Tabel`, `Filter` | `ambilStokAksesoris()` | 🔴 Belum |
| S07 | Detail Aksesoris | `/stok/aksesoris/:id` | `PanelTerdocking`, `Tab` | `ambilDetailAksesoris()` | 🔴 Belum |
| S08 | Menu Transaksi | (Fab/Tombol) | `Tombol`, `Popover` | - | 🔴 Belum |
| S09-S13 | Jual Wizard | `/jual` | `Wizard`, `Form`, `Select`, `InputUang` | `simpanPenjualan()` | 🔴 Belum |
| S14 | Nota (Pratinjau) | `/jual/nota/:id` | `Dialog`, `Button`, `PDFViewer` | `buatNotaPDF()` | 🔴 Belum |
| S15 | Riwayat Transaksi | `/riwayat` | `Tabel`, `Filter`, `ChipStatus` | `ambilRiwayat()` | 🔴 Belum |
| S16 | Detail Transaksi | `/riwayat/:id` | `PanelTerdocking`, `List` | `ambilDetailTransaksi()` | 🔴 Belum |
| S17 | Batalkan Transaksi | (Dialog) | `Dialog`, `Button` | `batalkanTransaksi()` | 🔴 Belum |
| S18-S22 | Barang Masuk Wizard | `/masuk` | `Wizard`, `InputIMEI`, `Upload` | `simpanBarangMasuk()` | 🔴 Belum |
| S23-S25 | Servis | `/servis` | `Tabel`, `Dialog`, `InputUang` | `ambilServis()`, `updateServis()` | 🔴 Belum |
| S26-S27 | Tagihan | `/tagihan` | `Tabel`, `Progress`, `Dialog` | `ambilTagihan()`, `bayarTagihan()` | 🔴 Belum |
| S28-S30 | Garansi & Retur | `/retur` | `Wizard`, `Tabel`, `Dialog` | `prosesRetur()` | 🔴 Belum |
| S31-S35 | Laporan | `/laporan` | `Tab`, `Tabel`, `Chart` | `ambilLaporan()` | 🔴 Belum |
| S36-S38 | Data Screens | `/data/*` | `Tabel`, `Form` | CRUD Data Master | 🔴 Belum |
| S39-S51 | Pengaturan | `/pengaturan/*` | `Tab`, `Switch`, `Form` | `ambilPengaturan()`, `simpanPengaturan()` | 🔴 Belum |
| S52 | System Pages (Error) | `/error` | `KeadaanKosong` | - | 🔴 Belum |

## Hasil Audit & Ketidaksesuaian

1. **Responsif Frame**: Frame desain di spesifikasi fokus pada Desktop & Laptop, sedangkan instruksi menyebutkan pendekatan mobile-first. UI perlu ditangani secara grace-degradation untuk lebar layar di bawah Laptop jika user mengakses lewat HP/Tablet sebelum desain resmi selesai (flagging `TODO(desain)`).
2. **Keterbatasan Font**: Figma memakai Inter, tapi PRD 04 melarang aset eksternal, sehingga fallback ke System UI (seperti Segoe UI / Roboto) akan menyebabkan deviasi render mikro (terutama width pada angka). Solusinya `font-variant-numeric: tabular-nums` sudah disetujui.
3. **QR Menu Digital**: Terdapat layar *QrMenuScreen.tsx* (S36-S38 area) namun PRD/aturan dari pengguna menegaskan **"QR Menu Digital di-hide / tidak ditampilkan ke pengguna. Jangan pernah sebut atau tawarkan fitur/halaman QR Menu lagi."** Ini di-drop dari scope aktif.
4. **Keamanan Nota**: Privasi tampilan seperti modal & laba yang di-mask dengan "Rp ••• •••" butuh persistensi device-level (LocalStorage) tapi dengan memori cadangan di UI state.

## Pertanyaan Konfirmasi

1. Untuk QR Menu Digital, apakah file `QrMenuScreen.tsx` yang sudah ada sebaiknya dihapus dari codebase, atau dibiarkan saja tapi di-remove dari routing?
2. Data mock untuk tabel dan grafik (Langkah 1 & 2), apakah ingin memakai file JSON di dalam folder `/tests` atau ditanam langsung pada `lib/api.ts` mode dev?
3. Lebar panel terdocking (Detail Unit) untuk layar 1366px apakah disetel fixed 400px atau menggunakan persentase (e.g. 33vw)?
4. Saat membuat backup Google Drive (S50), apakah progress bar dari script Google (yang notabene sinkron/sulit emit progress) cukup diganti dengan spinner "Sedang mencadangkan..."?
5. Apabila pengguna menekan 'Back' browser saat berada di tengah Wizard Jual (S09-S13), apakah State harus diselamatkan ke memori sesi atau langsung hilang?

