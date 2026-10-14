# PRD 00 – Ringkasan Proyek: Sistem EPICPHONE (Epic Phone Purwokerto)

Versi 1.0 | Status: Draft untuk review

## 1. Ringkasan

Sistem pencatatan jual-beli handphone (baru dan bekas) berbasis **Google Apps Script + Google Spreadsheet + Google Drive**. Semua data tersimpan di akun Google owner, tanpa server dan tanpa biaya langganan. Pengguna berinteraksi lewat **web app** (bukan mengedit sheet langsung), sedangkan Spreadsheet berfungsi sebagai database yang tetap rapi dan mudah dibaca.

**Identitas toko:** Epic Phone Purwokerto (Instagram @epicphone_purwokerto), jual beli HP iPhone dan Android, tagline "Inovasi Ada Di Genggaman". Logo berwarna biru tua (navy) dan hijau dipakai di aplikasi dan nota (PRD 02 bagian 12). Alamat dan nomor kontak diisi owner di Pengaturan.

## 2. Masalah dan Tujuan

**Masalah:** pencatatan manual rawan salah, stok per unit (IMEI) sulit dilacak, laba bulanan tidak jelas karena biaya servis, tukar tambah, dan retur tidak terhitung.

**Tujuan:**
1. Setiap unit HP terlacak dari masuk sampai keluar lewat IMEI.
2. Laba per transaksi dan per bulan dihitung otomatis dan akurat.
3. Owner bisa input transaksi umum dalam kurang dari 1 menit lewat HP.
4. Data di Spreadsheet selalu terbaca manusia (tanggal, jam WIB, Rupiah, nama barang lengkap).
5. Data aman: ada backup otomatis dan jejak perubahan.

**Bukan tujuan (non-goals):** integrasi marketplace, payment gateway, akuntansi pajak penuh, multi-cabang, aplikasi native.

## 3. Pengguna

| Peran | Keterangan |
|---|---|
| Owner (satu-satunya pengguna) | Akses penuh: input, edit, laporan, pengaturan. Perangkat utama HP, sesekali laptop. |

Karena pengguna tunggal, tidak ada manajemen role. Akses dibatasi ke satu akun Google owner. Desain tetap dibuat agar penambahan role karyawan di masa depan tidak butuh perombakan (kolom `Dibuat_Oleh` sudah disiapkan).

## 4. Ruang Lingkup Modul

| Kode | Modul | Fungsi inti |
|---|---|---|
| M1 | Barang Masuk | Catat pembelian dari supplier / beli putus dari pelanggan, daftar unit per IMEI, foto unit, tandai HP rusak yang perlu servis |
| M2 | Stok | Stok HP per unit, stok aksesoris per SKU, status, umur stok, stok menipis |
| M3 | Penjualan | Jual HP dan aksesoris, diskon, **bonus pembelian** (tempered glass, casing, dll), nota PDF (dikirim manual oleh owner) |
| M4 | Tukar Tambah | Taksir HP lama, masuk otomatis ke stok bekas, potong tagihan |
| M5 | Servis | Servis HP rusak **sebelum dijual** (biaya masuk modal unit) dan servis pelanggan |
| M6 | Garansi dan Retur | Klaim garansi, retur, refund, tukar unit |
| M7 | Hutang-Piutang dan Cicilan | Piutang pelanggan, hutang supplier, pembayaran bertahap, jatuh tempo |
| M8 | Laporan | Dashboard, laba bulanan, stok, arus kas ringkas, ekspor PDF |
| M9 | Pengaturan | Master produk, kontak, kategori, biaya operasional, backup |

## 5. Alur Bisnis Utama

```
Supplier/Pelanggan --> [M1 Barang Masuk] --> Stok (Status: Ready / Perlu Servis)
                                                 |
                      [M5 Servis internal] <-----+
                                                 v
Pelanggan <-- nota PDF <-- [M3 Penjualan] <-- Stok --> [M4 Tukar Tambah] --> Stok bekas baru
                                |
                    Lunas? --tidak--> [M7 Piutang/Cicilan]
                                |
                    Masalah setelah jual --> [M6 Garansi/Retur]
                                |
                                v
                        [M8 Laporan Laba Bulanan]
```

## 6. Aturan Bisnis Kunci

1. **IMEI unik.** Satu IMEI tidak boleh masuk dua kali kecuali status unit sebelumnya Terjual atau Retur. Validasi 15 digit.
2. **HPP unit** = harga beli + biaya servis internal (aktual, setelah selesai) + biaya lain yang menempel pada unit (ongkir, cuci/poles, dll).
3. **Laba kotor penjualan** = harga jual − HPP (per item). Biaya bonus dihitung terpisah.
4. **Laba bersih bulanan** = laba kotor + laba servis pelanggan − biaya bonus − biaya operasional − kerugian retur/refund.
5. **Pengakuan laba:** saat penjualan terjadi (bukan saat lunas). Laporan arus kas terpisah menunjukkan uang yang benar-benar diterima.
6. **Tukar tambah:** nilai taksir HP lama mengurangi tagihan, dan HP lama otomatis jadi unit stok (HPP = nilai taksir).
7. **Transaksi tidak dihapus**, hanya dibatalkan (status Batal) agar jejak audit utuh.
8. **Stok tidak boleh minus.** Aksesoris dengan stok 0 tidak bisa dijual.
9. **Garansi toko** dihitung otomatis dari tanggal jual + lama garansi per kategori (default: baru 12 bulan sesuai garansi resmi, bekas 7 hari, aksesoris 3 hari; bisa diubah di Pengaturan).
10. **Zona waktu** selalu Asia/Jakarta (WIB). Tanggal dan jam disimpan di kolom terpisah.
11. **Bonus penjualan** (misalnya tempered glass atau casing gratis) dicatat sebagai item bertipe Bonus dengan harga jual 0. Modal bonus mengurangi laba dan tampil sebagai Biaya bonus; stok aksesoris bonus berkurang; nota menampilkan bonus tanpa modalnya.
12. **HP rusak yang dibeli** masuk dengan status Servis. Biaya servis aktual (setelah selesai) menambah modal unit; estimasi hanya informasi dan belum masuk modal. Unit baru boleh dijual setelah berstatus Ready.
13. **Penamaan berkas dan folder** di Drive mengikuti PRD 09 dan dibuat otomatis oleh sistem.

## 7. Kebutuhan Non-Fungsional

| Aspek | Target |
|---|---|
| Performa | Halaman utama tampil di bawah 3 detik; simpan transaksi di bawah 4 detik |
| Perangkat | Mobile-first (layar 360 px ke atas), nyaman di laptop |
| Keamanan | Akses hanya akun Google owner; sheet database diproteksi; log aktivitas |
| Keandalan | Backup harian otomatis ke Drive, simpan 30 hari terakhir + 12 backup bulanan |
| Kapasitas | Batas Spreadsheet 10 juta sel; arsip tahunan sebelum mendekati batas |
| Batas Apps Script | Eksekusi maks 6 menit per proses; pakai batch read/write dan cache agar cepat |
| Konkurensi | LockService pada setiap penulisan untuk mencegah data ganda |
| Kemudahan | Tanpa pelatihan panjang; label bahasa Indonesia sehari-hari |
| Responsif | Nyaman dan tanpa gulir horizontal pada layar 320 px sampai desktop 1920 px (HP, tablet, laptop, desktop); detail di PRD 02 bagian 11 dan PRD 04 |
| Kemasan | Seluruh kode aplikasi dibuat sesederhana mungkin: UI satu `index.html`, server satu `Code.gs` (PRD 04) |

## 8. Asumsi

1. Volume: puluhan transaksi per hari, ratusan unit stok aktif.
2. Satu toko, satu lokasi, satu mata uang (Rupiah).
3. Owner punya akun Google pribadi dengan ruang Drive cukup.
4. Sistem hanya membuat nota PDF; pengiriman ke pelanggan dilakukan manual oleh owner (tanpa integrasi WhatsApp otomatis). Printer tidak wajib.
5. Foto unit diambil lewat kamera HP dan disimpan di Drive.
6. Pengembangan memakai Node.js di laptop (Vite) lalu di-deploy ke Apps Script lewat `clasp`.
7. Logo toko tersedia sebagai berkas gambar (PNG 1080 x 1080); versi transparan/vektor akan diminta dari owner untuk hasil cetak terbaik.

## 9. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Spreadsheet diedit manual lalu rusak | Data korup | Proteksi sheet, validasi data, backup harian |
| Kuota Apps Script habis | Sistem berhenti sementara | Batch operation, cache, pantau kuota di Pengaturan |
| Akun Google owner hilang akses | Seluruh data tidak terbuka | Pemulihan akun disiapkan, backup salinan ke akun kedua |
| Data membesar | Lambat | Arsip tahunan, sheet ringkasan terpisah |
| Salah input harga/IMEI | Laba salah | Konfirmasi sebelum simpan, peringatan harga di bawah HPP |

## 10. Metrik Keberhasilan

1. Waktu input penjualan rata-rata di bawah 60 detik.
2. Selisih stok sistem vs fisik (stock opname) di bawah 1 persen.
3. Laporan laba bulanan tersedia otomatis tanggal 1 tiap bulan.
4. Nol transaksi dengan IMEI ganda.

## 11. Seri Dokumen PRD

| No | Dokumen | Isi |
|---|---|---|
| 00 | Ringkasan Proyek | Dokumen ini |
| 01 | Desain Database Spreadsheet | Struktur sheet, kolom, format, relasi, struktur Drive |
| 02 | UI/UX | Prinsip desain, alur layar, wireframe, komponen, empty/error state |
| 03 | Backend Apps Script | Arsitektur kode, fungsi, validasi, API internal, log |
| 04 | Frontend, Build Satu Berkas, dan Responsif | Vite + Preact, hasil satu `index.html`, strategi responsif, integrasi Apps Script |
| 05 | Laporan dan Dashboard | Rumus laba, definisi metrik, arus kas, grafik, tutup buku |
| 06 | Keamanan, Backup, dan Pemulihan | Akses, data pribadi, backup berlapis, prosedur pemulihan |
| 07 | Testing, Migrasi Data, dan Deployment | Skenario uji, impor data awal, rilis, rollback, go-live |
| 08 | Pelatihan, SOP, dan Maintenance | Pelatihan, SOP rutin, pemecahan masalah, serah terima |
| 09 | Standar Penamaan Drive | Struktur folder, format nama foto, Spreadsheet, backup, nota, laporan |

## 12. Milestone

| Fase | Output | Estimasi |
|---|---|---|
| 1. Fondasi | Spreadsheet, master data, M1 + M2 | Minggu 1-2 |
| 2. Transaksi | M3, M4, M7 | Minggu 3-4 |
| 3. Layanan | M5, M6 | Minggu 5 |
| 4. Laporan | M8, dashboard, backup otomatis | Minggu 6 |
| 5. Uji dan Rilis | UAT dengan owner, migrasi data, pelatihan | Minggu 7 |

## 13. Keputusan Teknis

| Keputusan | Pilihan |
|---|---|
| Database | Google Spreadsheet (tetap; data tidak tertanam di berkas HTML) |
| Penyimpanan berkas | Google Drive |
| Backend | Google Apps Script (TypeScript dibundel menjadi satu `Code.gs`) |
| Frontend | Vite + Preact + TypeScript, dibuild menjadi satu `index.html` dengan `vite-plugin-singlefile` |
| Kemasan | Mode A: `Code.gs` + `index.html` (rekomendasi); Mode B: satu `Code.gs` dengan HTML tertanam |
| Nota | Dibuat sistem sebagai PDF, dikirim manual oleh owner |
| Penamaan berkas | Format baku `EPICPHONE_JENIS_ID_...` (PRD 09), dibuat otomatis |
| Identitas | Epic Phone Purwokerto; warna dan logo dari berkas logo toko |
| Pengguna | Owner saja |
