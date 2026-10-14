# Desain Spreadsheet EPICPHONE_DB_UTAMA

Dibuat otomatis dari `src/backend/Skema.ts` oleh `npm run dok:skema` (versi skema 3). Jangan diedit manual: ubah Skema.ts lalu jalankan ulang.

## Aturan umum (PRD 01)

- Baris 1 = header (tebal, putih di atas navy), dibekukan, filter aktif, baris selang-seling.
- Tanggal = tanggal asli dengan tampilan `dd MMM yyyy` (lokal Indonesia: Okt, Agu, Des). Jam = teks `HH:mm` WIB.
- Uang = angka asli dengan format `"Rp "#,##0;[Red]-"Rp "#,##0` (negatif merah). IMEI, nomor WA, dan ID = teks (tidak pernah jadi angka).
- Kolom bertanda 🔒 diisi sistem (ID dan kolom turunan); diproteksi dengan peringatan. Kolom lain bebas diedit.
- Tab: master #2F6FB5, transaksi #2E9E5B, laporan #E67E22, sistem #8A949E.
- Warna status: **hijau** (Ready, Lunas, Aman, Aktif, Selesai, Diambil, Ya); **kuning** (Servis, Sebagian, Menipis, Dipesan, Dikerjakan, Antri, Diproses, Dibuka, Belum, Draft); **merah** (Telat, Rusak, Habis, Gagal, Ditolak); **abu** (Terjual, Batal, Terhapus, Retur, Tidak).

## Produk

Grup master; 10 kolom; lebar total 1310 px; 1000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | 🔒 ID_Produk | ID (teks, dikunci) | `@` | 130 |  |
| 2 | Jenis | Teks | `@` | 90 | Jenis_Produk |
| 3 | Platform | Teks | `@` | 90 | Platform |
| 4 | Merek | Teks | `@` | 110 | Merek (peringatan) |
| 5 | Model | Teks | `@` | 170 |  |
| 6 | Varian | Teks | `@` | 110 |  |
| 7 | Warna | Teks | `@` | 100 |  |
| 8 | 🔒 Nama_Lengkap | Nama/label | `@` | 300 |  |
| 9 | Harga_Jual_Standar | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 140 |  |
| 10 | Aktif | Status berwarna | `@` | 70 | Aktif_Produk |

## Kontak

Grup master; 7 kolom; lebar total 1240 px; 1000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | 🔒 ID_Kontak | ID (teks, dikunci) | `@` | 130 |  |
| 2 | Nama | Nama/label | `@` | 220 |  |
| 3 | Tipe | Teks | `@` | 100 | Tipe_Kontak |
| 4 | No_WA | No. WA (teks) | `@` | 130 |  |
| 5 | Alamat | Teks panjang (membungkus) | `@` | 280 |  |
| 6 | Catatan | Teks panjang (membungkus) | `@` | 260 |  |
| 7 | 🔒 Total_Transaksi | Bilangan | `#,##0` | 120 |  |

## Stok_HP

Grup transaksi; 28 kolom; lebar total 3482 px; 2000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | 🔒 ID_Unit | ID (teks, dikunci) | `@` | 130 |  |
| 2 | Tgl_Masuk | Tanggal asli | `dd MMM yyyy` | 105 |  |
| 3 | Jam_Masuk | Jam (teks HH:mm) | `@` | 62 |  |
| 4 | IMEI_1 | IMEI (teks) | `@` | 145 |  |
| 5 | IMEI_2 | IMEI (teks) | `@` | 145 |  |
| 6 | ID_Produk | Teks | `@` | 110 | dari Produk!A2:A (peringatan) |
| 7 | 🔒 Nama_Barang | Nama/label | `@` | 280 |  |
| 8 | Kondisi | Teks | `@` | 75 | Kondisi |
| 9 | Grade | Teks | `@` | 60 | Grade |
| 10 | Kelengkapan | Teks | `@` | 105 | Kelengkapan |
| 11 | Baterai_Persen | Persen | `0"%"` | 100 |  |
| 12 | Bebas_Kunci_Akun | Teks | `@` | 120 | Bebas_Kunci_Akun |
| 13 | Sumber | Teks | `@` | 100 | Sumber_Unit |
| 14 | 🔒 ID_Sumber | ID (teks, dikunci) | `@` | 130 |  |
| 15 | Harga_Beli | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 16 | Biaya_Lain | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 17 | 🔒 Biaya_Servis | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 18 | 🔒 HPP | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 19 | 🔒 Estimasi_Servis | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 20 | Harga_Jual_Target | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 135 |  |
| 21 | Status | Status berwarna | `@` | 100 | Status_Unit |
| 22 | 🔒 Umur_Stok_Hari | Bilangan | `#,##0` | 115 |  |
| 23 | Tgl_Keluar | Tanggal asli | `dd MMM yyyy` | 105 |  |
| 24 | 🔒 ID_Penjualan | ID (teks, dikunci) | `@` | 130 |  |
| 25 | Link_Foto | Tautan | `@` | 150 |  |
| 26 | Catatan | Teks panjang (membungkus) | `@` | 260 |  |
| 27 | Dibuat_Oleh | Teks | `@` | 90 |  |
| 28 | Tgl_Rusak | Tanggal asli | `dd MMM yyyy` | 105 |  |

## Stok_Aksesoris

Grup transaksi; 8 kolom; lebar total 1070 px; 1000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | 🔒 SKU | ID (teks, dikunci) | `@` | 130 |  |
| 2 | Nama_Barang | Nama/label | `@` | 280 |  |
| 3 | Kategori | Teks | `@` | 120 | Kategori_Aksesoris |
| 4 | 🔒 Stok | Bilangan | `#,##0` | 70 |  |
| 5 | Stok_Minimum | Bilangan | `#,##0` | 105 |  |
| 6 | 🔒 Harga_Beli_Rata2 | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 140 |  |
| 7 | Harga_Jual | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 8 | 🔒 Status | Status berwarna | `@` | 100 |  |

## Pembelian

Grup transaksi; 14 kolom; lebar total 1812 px; 2000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | 🔒 ID_Pembelian | ID (teks, dikunci) | `@` | 130 |  |
| 2 | Tanggal | Tanggal asli | `dd MMM yyyy` | 105 |  |
| 3 | Jam | Jam (teks HH:mm) | `@` | 62 |  |
| 4 | 🔒 ID_Supplier | ID (teks, dikunci) | `@` | 130 |  |
| 5 | 🔒 Nama_Supplier | Nama/label | `@` | 200 |  |
| 6 | 🔒 Total | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 7 | Metode_Bayar | Teks | `@` | 105 | Metode_Bayar |
| 8 | Dibayar | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 9 | 🔒 Sisa | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 10 | 🔒 Status_Bayar | Status berwarna | `@` | 105 |  |
| 11 | Link_Nota | Tautan | `@` | 150 |  |
| 12 | Status | Status berwarna | `@` | 100 | Status_Dokumen |
| 13 | Catatan | Teks panjang (membungkus) | `@` | 260 |  |
| 14 | Dibuat_Oleh | Teks | `@` | 90 |  |

## Pembelian_Item

Grup transaksi; 8 kolom; lebar total 1110 px; 3000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | 🔒 ID_Item | ID (teks, dikunci) | `@` | 150 |  |
| 2 | 🔒 ID_Pembelian | ID (teks, dikunci) | `@` | 130 |  |
| 3 | Tipe | Teks | `@` | 90 | Jenis_Produk |
| 4 | 🔒 ID_Unit_atau_SKU | ID (teks, dikunci) | `@` | 150 |  |
| 5 | 🔒 Nama_Barang | Nama/label | `@` | 280 |  |
| 6 | Qty | Bilangan | `#,##0` | 60 |  |
| 7 | Harga_Satuan | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 8 | 🔒 Subtotal | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |

## Penjualan

Grup transaksi; 19 kolom; lebar total 2472 px; 2000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | 🔒 ID_Penjualan | ID (teks, dikunci) | `@` | 130 |  |
| 2 | Tanggal | Tanggal asli | `dd MMM yyyy` | 105 |  |
| 3 | Jam | Jam (teks HH:mm) | `@` | 62 |  |
| 4 | 🔒 ID_Pelanggan | ID (teks, dikunci) | `@` | 130 |  |
| 5 | 🔒 Nama_Pelanggan | Nama/label | `@` | 200 |  |
| 6 | 🔒 Subtotal | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 7 | Diskon | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 8 | Nilai_Tukar_Tambah | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 150 |  |
| 9 | 🔒 Total_Tagihan | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 135 |  |
| 10 | 🔒 Biaya_Bonus | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 11 | Metode_Bayar | Teks | `@` | 105 | Metode_Bayar |
| 12 | Dibayar | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 13 | 🔒 Sisa_Tagihan | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 14 | 🔒 Status_Bayar | Status berwarna | `@` | 105 |  |
| 15 | 🔒 Laba_Kotor | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 16 | Link_Nota_PDF | Tautan | `@` | 150 |  |
| 17 | Status | Status berwarna | `@` | 100 | Status_Penjualan |
| 18 | Catatan | Teks panjang (membungkus) | `@` | 260 |  |
| 19 | Dibuat_Oleh | Teks | `@` | 90 |  |

## Penjualan_Item

Grup transaksi; 12 kolom; lebar total 1660 px; 4000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | 🔒 ID_Item | ID (teks, dikunci) | `@` | 150 |  |
| 2 | 🔒 ID_Penjualan | ID (teks, dikunci) | `@` | 130 |  |
| 3 | Tipe | Teks | `@` | 90 | Tipe_Item_Jual |
| 4 | 🔒 ID_Unit_atau_SKU | ID (teks, dikunci) | `@` | 150 |  |
| 5 | 🔒 Nama_Barang | Nama/label | `@` | 280 |  |
| 6 | 🔒 IMEI | IMEI (teks) | `@` | 145 |  |
| 7 | Qty | Bilangan | `#,##0` | 60 |  |
| 8 | Harga_Jual | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 9 | 🔒 HPP | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 10 | 🔒 Laba_Item | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 11 | 🔒 Garansi_Hingga | Tanggal asli | `dd MMM yyyy` | 120 |  |
| 12 | Alasan_Bonus | Teks | `@` | 160 |  |

## Tukar_Tambah

Grup transaksi; 14 kolom; lebar total 1960 px; 1000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | 🔒 ID_TT | ID (teks, dikunci) | `@` | 130 |  |
| 2 | Tanggal | Tanggal asli | `dd MMM yyyy` | 105 |  |
| 3 | 🔒 ID_Penjualan | ID (teks, dikunci) | `@` | 130 |  |
| 4 | 🔒 ID_Pelanggan | ID (teks, dikunci) | `@` | 130 |  |
| 5 | 🔒 ID_Unit_Masuk | ID (teks, dikunci) | `@` | 130 |  |
| 6 | 🔒 Nama_Barang | Nama/label | `@` | 260 |  |
| 7 | IMEI | IMEI (teks) | `@` | 145 |  |
| 8 | Kondisi_Layar | Teks | `@` | 105 | Kondisi_TT |
| 9 | Kondisi_Baterai | Teks | `@` | 115 | Kondisi_TT |
| 10 | Kondisi_Kamera | Teks | `@` | 110 | Kondisi_TT |
| 11 | Kondisi_Body | Teks | `@` | 100 | Kondisi_TT |
| 12 | Kondisi_FaceJari | Teks | `@` | 115 | Kondisi_TT |
| 13 | Nilai_Taksir | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 14 | Catatan | Teks panjang (membungkus) | `@` | 260 |  |

## Servis

Grup transaksi; 21 kolom; lebar total 2977 px; 1000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | 🔒 ID_Servis | ID (teks, dikunci) | `@` | 130 |  |
| 2 | Tgl_Masuk | Tanggal asli | `dd MMM yyyy` | 105 |  |
| 3 | Jam_Masuk | Jam (teks HH:mm) | `@` | 62 |  |
| 4 | Tgl_Selesai | Tanggal asli | `dd MMM yyyy` | 105 |  |
| 5 | Jenis | Teks | `@` | 90 | Jenis_Servis |
| 6 | Pelaksana | Teks | `@` | 120 | Pelaksana_Servis |
| 7 | Nama_Vendor | Teks | `@` | 150 |  |
| 8 | 🔒 ID_Unit | ID (teks, dikunci) | `@` | 130 |  |
| 9 | Nama_Pelanggan | Nama/label | `@` | 200 |  |
| 10 | Perangkat | Nama/label | `@` | 240 |  |
| 11 | IMEI | IMEI (teks) | `@` | 145 |  |
| 12 | Keluhan | Teks panjang (membungkus) | `@` | 260 |  |
| 13 | Tindakan | Teks panjang (membungkus) | `@` | 260 |  |
| 14 | Estimasi_Biaya | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 130 |  |
| 15 | Biaya_Part | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 16 | Biaya_Jasa_Teknisi | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 150 |  |
| 17 | Tarif_Pelanggan | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 130 |  |
| 18 | 🔒 Laba_Servis | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 19 | Status | Status berwarna | `@` | 100 | Status_Servis |
| 20 | 🔒 ID_Klaim | ID (teks, dikunci) | `@` | 130 |  |
| 21 | Dibuat_Oleh | Teks | `@` | 90 |  |

## Garansi_Retur

Grup transaksi; 14 kolom; lebar total 1987 px; 1000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | 🔒 ID_Klaim | ID (teks, dikunci) | `@` | 130 |  |
| 2 | Tanggal | Tanggal asli | `dd MMM yyyy` | 105 |  |
| 3 | Jam | Jam (teks HH:mm) | `@` | 62 |  |
| 4 | 🔒 ID_Penjualan | ID (teks, dikunci) | `@` | 130 |  |
| 5 | 🔒 ID_Unit | ID (teks, dikunci) | `@` | 130 |  |
| 6 | 🔒 Nama_Barang | Nama/label | `@` | 260 |  |
| 7 | Jenis | Teks | `@` | 110 | Jenis_Klaim |
| 8 | Alasan | Teks panjang (membungkus) | `@` | 260 |  |
| 9 | 🔒 Masih_Garansi | Status berwarna | `@` | 110 |  |
| 10 | Tindakan | Teks panjang (membungkus) | `@` | 220 |  |
| 11 | Nilai_Refund | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 120 |  |
| 12 | 🔒 Unit_Pengganti | ID (teks, dikunci) | `@` | 130 |  |
| 13 | Status | Status berwarna | `@` | 100 | Status_Klaim |
| 14 | 🔒 Dampak_Laba | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 120 |  |

## Hutang_Piutang

Grup transaksi; 11 kolom; lebar total 1400 px; 1000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | 🔒 ID_Tagihan | ID (teks, dikunci) | `@` | 130 |  |
| 2 | Jenis | Teks | `@` | 130 | Jenis_Tagihan |
| 3 | 🔒 ID_Referensi | ID (teks, dikunci) | `@` | 130 |  |
| 4 | 🔒 ID_Kontak | ID (teks, dikunci) | `@` | 130 |  |
| 5 | 🔒 Nama | Nama/label | `@` | 200 |  |
| 6 | Total | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 7 | 🔒 Terbayar | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 8 | 🔒 Sisa | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 9 | Jatuh_Tempo | Tanggal asli | `dd MMM yyyy` | 115 |  |
| 10 | 🔒 Hari_Telat | Bilangan | `#,##0` | 90 |  |
| 11 | 🔒 Status | Status berwarna | `@` | 100 |  |

## Pembayaran

Grup transaksi; 9 kolom; lebar total 1242 px; 1000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | 🔒 ID_Bayar | ID (teks, dikunci) | `@` | 130 |  |
| 2 | Tanggal | Tanggal asli | `dd MMM yyyy` | 105 |  |
| 3 | Jam | Jam (teks HH:mm) | `@` | 62 |  |
| 4 | 🔒 ID_Hutang_Piutang | ID (teks, dikunci) | `@` | 150 |  |
| 5 | 🔒 Nama | Nama/label | `@` | 200 |  |
| 6 | Jumlah | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 7 | Metode | Teks | `@` | 100 | Metode_Bayar |
| 8 | Catatan | Teks panjang (membungkus) | `@` | 220 |  |
| 9 | Link_Bukti | Tautan | `@` | 150 |  |

## Biaya_Operasional

Grup transaksi; 6 kolom; lebar total 880 px; 1000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | 🔒 ID_Biaya | ID (teks, dikunci) | `@` | 130 |  |
| 2 | Tanggal | Tanggal asli | `dd MMM yyyy` | 105 |  |
| 3 | Kategori | Teks | `@` | 110 | Kategori_Biaya |
| 4 | Nominal | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 5 | Catatan | Teks panjang (membungkus) | `@` | 260 |  |
| 6 | Link_Bukti | Tautan | `@` | 150 |  |

## Dashboard

Grup laporan; 3 kolom; lebar total 780 px; 1000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | Metrik | Teks | `@` | 260 |  |
| 2 | Nilai | Teks | `@` | 160 |  |
| 3 | Keterangan | Teks panjang (membungkus) | `@` | 360 |  |

## Laba_Bulanan

Grup laporan; 17 kolom; lebar total 2095 px; 1000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | Bulan | Teks | `@` | 90 |  |
| 2 | Jml_Unit_Terjual | Bilangan | `#,##0` | 120 |  |
| 3 | Omzet | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 135 |  |
| 4 | HPP | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 135 |  |
| 5 | Laba_Kotor_HP | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 135 |  |
| 6 | Laba_Aksesoris | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 135 |  |
| 7 | Laba_Servis | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 8 | Biaya_Bonus | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 120 |  |
| 9 | Biaya_Garansi | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 120 |  |
| 10 | Pembalikan_Retur | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 130 |  |
| 11 | Kerugian_Refund | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 12 | Kerugian_Rusak | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 125 |  |
| 13 | Biaya_Operasional | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 140 |  |
| 14 | Laba_Bersih | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 140 |  |
| 15 | Margin_Persen | Persen 1 desimal | `0.0"%"` | 90 |  |
| 16 | Selisih_Bulan_Lalu | Rupiah | `"Rp "#,##0;[Red]-"Rp "#,##0` | 150 |  |
| 17 | Terkunci | Status berwarna | `@` | 80 | Ya_Tidak |

## Pengaturan

Grup sistem; 3 kolom; lebar total 970 px; 1000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | 🔒 Kunci | Teks | `@` | 230 |  |
| 2 | Nilai | Teks panjang (membungkus) | `@` | 380 |  |
| 3 | Keterangan | Teks panjang (membungkus) | `@` | 360 |  |

## Referensi

Grup sistem; 3 kolom; lebar total 460 px; 1000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | Kelompok | Teks | `@` | 190 |  |
| 2 | Nilai | Teks | `@` | 200 |  |
| 3 | Urutan | Bilangan | `#,##0` | 70 |  |

## Log_Aktivitas

Grup sistem; 6 kolom; lebar total 1067 px; 5000 baris disediakan (bertambah otomatis); seluruh sheet dikunci.

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | Tanggal | Tanggal asli | `dd MMM yyyy` | 105 |  |
| 2 | Jam | Jam (teks HH:mm) | `@` | 62 |  |
| 3 | Aksi | Teks | `@` | 80 |  |
| 4 | Sheet | Teks | `@` | 150 |  |
| 5 | 🔒 ID_Data | ID (teks, dikunci) | `@` | 150 |  |
| 6 | Ringkasan | Teks panjang (membungkus) | `@` | 520 |  |

## Berkas_Foto

Grup sistem; 12 kolom; lebar total 1852 px; 2000 baris disediakan (bertambah otomatis).

| # | Kolom | Tipe | Format sel | Lebar (px) | Dropdown |
|---|---|---|---|---|---|
| 1 | 🔒 ID_Berkas | ID (teks, dikunci) | `@` | 130 |  |
| 2 | Tanggal | Tanggal asli | `dd MMM yyyy` | 105 |  |
| 3 | Jam | Jam (teks HH:mm) | `@` | 62 |  |
| 4 | Jenis_Referensi | Teks | `@` | 120 | Jenis_Referensi_Berkas |
| 5 | 🔒 ID_Referensi | ID (teks, dikunci) | `@` | 150 |  |
| 6 | Posisi_atau_Tahap | Teks | `@` | 140 |  |
| 7 | Urutan | Bilangan | `#,##0` | 65 |  |
| 8 | Nama_Berkas | Nama/label | `@` | 480 |  |
| 9 | ID_File_Drive | Teks | `@` | 260 |  |
| 10 | Link | Tautan | `@` | 150 |  |
| 11 | Ukuran_KB | Bilangan | `#,##0` | 90 |  |
| 12 | Status | Status berwarna | `@` | 100 | Status_Berkas |

Total: 20 sheet, 225 kolom.
