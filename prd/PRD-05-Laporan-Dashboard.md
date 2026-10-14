# PRD 05 – Laporan dan Dashboard

Versi 1.0 | Mengacu ke PRD 01 (data), PRD 02 (tampilan), PRD 03 (fungsi)

## 1. Tujuan

Owner bisa menjawab tiga pertanyaan tanpa menghitung manual: **berapa untung bulan ini, berapa uang dan barang yang masih tersangkut, dan apa yang perlu ditindak hari ini.**

## 2. Definisi Metrik

Semua transaksi berstatus Batal dikecualikan. Periode ditentukan oleh tanggal transaksi (WIB).

| Metrik | Rumus | Sumber |
|---|---|---|
| Omzet | Jumlah (Harga_Jual × Qty) semua item − diskon | Penjualan_Item, Penjualan |
| Diskon per item | Diskon nota dibagi proporsional terhadap nilai item | Penjualan |
| Laba kotor HP | Jumlah (Harga_Jual bersih − HPP) item bertipe HP | Penjualan_Item |
| Laba aksesoris | Jumlah (Harga_Jual bersih − HPP) item bertipe Aksesoris (tidak termasuk Bonus) | Penjualan_Item |
| Biaya bonus | Jumlah HPP item bertipe Bonus (harga jual 0) | Penjualan_Item |
| Laba servis | Jumlah (Tarif_Pelanggan − Biaya_Part − Biaya_Jasa) servis pelanggan berstatus Selesai/Diambil, menurut Tgl_Selesai | Servis |
| Biaya garansi | Biaya servis atas klaim garansi (tanpa tarif) | Servis, Garansi_Retur |
| Pembalikan retur | Laba penjualan asal yang dibalik karena retur/refund penuh, dicatat di **bulan retur** | Garansi_Retur |
| Kerugian refund sebagian | Nilai refund sebagian | Garansi_Retur |
| Kerugian barang rusak | HPP unit berstatus Rusak pada bulan itu | Stok_HP |
| Biaya operasional | Jumlah Nominal pada bulan itu | Biaya_Operasional |
| **Laba bersih** | Laba kotor HP + Laba aksesoris + Laba servis − Biaya bonus − Biaya garansi − Pembalikan retur − Kerugian refund sebagian − Kerugian barang rusak − Biaya operasional | Gabungan |
| Margin kotor | (Laba kotor HP + Laba aksesoris − Biaya bonus) / Omzet | Gabungan |
| Nilai stok | Jumlah HPP unit Ready/Dipesan/Servis + stok aksesoris × harga beli rata-rata | Stok_HP, Stok_Aksesoris |
| Umur stok | Hari sejak Tgl_Masuk (kelompok: sampai 7, 8-30, 31-60, di atas 60) | Stok_HP |
| Rata-rata hari terjual | Rata-rata (Tgl_Keluar − Tgl_Masuk) unit terjual pada periode | Stok_HP |
| Piutang | Jumlah Sisa tagihan pelanggan | Hutang_Piutang |
| Aging piutang | Kelompok keterlambatan: belum jatuh tempo, telat 1-7, 8-30, di atas 30 hari | Hutang_Piutang |
| Hutang supplier | Jumlah Sisa hutang ke supplier | Hutang_Piutang |

### Perlakuan Kasus Khusus

1. **Tukar tambah:** nilai taksir dianggap pembayaran, bukan pengurang omzet. HP lama masuk stok dengan HPP = nilai taksir, jadi laba penjualan baru tidak terdistorsi.
2. **Penjualan tempo:** laba diakui saat penjualan; piutang dilaporkan terpisah. Arus kas menunjukkan uang yang benar-benar masuk.
3. **Pembatalan sebelum bulan berganti:** transaksi hilang dari angka bulan itu. Pembatalan lintas bulan dicatat sebagai pembalik di bulan pembatalan.
4. **Servis internal:** biayanya masuk HPP unit, sehingga mengurangi laba saat unit terjual (bukan saat servis dikerjakan).
5. **Retur dengan unit kembali ke stok:** unit masuk lagi dengan HPP semula; hanya selisih yang jadi kerugian.
6. **Bonus penjualan:** bonus tidak menambah omzet. Modal bonus dicatat sebagai Biaya bonus pada bulan penjualan dan mengurangi laba bersih. Pembatalan penjualan membatalkan bonus dan mengembalikan stok bonus.
7. **Servis sebelum dijual:** biaya servis aktual (setelah Selesai) masuk modal unit dan mengurangi laba saat unit terjual. Unit rusak yang akhirnya tidak dijual dicatat sebagai Kerugian barang rusak sebesar HPP-nya (harga beli + biaya lain + servis).
8. **Biaya lain unit** (ongkir, cuci/poles) ikut modal unit.

## 3. Arus Kas Ringkas

| Baris | Isi |
|---|---|
| Kas masuk | Pembayaran penjualan (termasuk cicilan), pembayaran servis pelanggan |
| Kas keluar | Pembelian yang dibayar, pembayaran hutang, biaya operasional, refund, biaya servis (part dan jasa) |
| **Arus kas bersih** | Kas masuk − Kas keluar |
| Rincian per metode | Tunai, Transfer, QRIS |

Tersedia per hari, minggu, dan bulan. Digunakan owner untuk mencocokkan uang di laci dan rekening.

## 4. Dashboard

### Beranda (hari ini)
Kartu: Penjualan hari ini (nilai, unit, laba kotor), Kas masuk hari ini, Peringatan (tagihan jatuh tempo, stok lama, aksesoris menipis, servis siap diambil, kegagalan backup), Transaksi terakhir.

### Layar Laporan
| Bagian | Isi |
|---|---|
| Filter periode | Hari ini, 7 hari, Bulan ini, Bulan lalu, Pilih bulan, Rentang bebas |
| Ringkasan | Laba bersih (angka besar) + selisih persen dari periode sebelumnya + margin |
| Rincian laba | Tabel komponen laba bersih sesuai rumus bagian 2 |
| Grafik | Batang laba bersih 12 bulan; garis omzet vs laba; donat komposisi laba (HP/aksesoris/servis) |
| Stok | Nilai stok, jumlah unit per kelompok umur, 10 unit terlama, unit dalam servis (jumlah dan estimasi biaya) |
| Penjualan | Top 10 model terlaris, rata-rata hari terjual, penjualan per hari dalam seminggu, total Biaya bonus dan bonus yang paling sering diberikan |
| Tagihan | Total piutang dan hutang, aging piutang |
| Ekspor | PDF bulanan, CSV transaksi periode |

Tata letak responsif: 1 kolom di HP, 2 kolom di tablet, 4 kartu per baris di laptop/desktop (PRD 02 bagian 11).

## 5. Tutup Buku Bulanan

1. Tanggal 1 pukul 03:00, `jobLaporanBulanan` menghitung bulan lalu, menulis satu baris ke sheet `Laba_Bulanan`, dan membuat PDF `EPICPHONE_LAPORAN_LABA_2026-10.pdf` di folder `06_LAPORAN` (penamaan: PRD 09).
2. Owner dapat menekan **Kunci Bulan** di Laporan. Angka bulan yang dikunci dibekukan.
3. Mengubah/membatalkan transaksi pada bulan terkunci menampilkan peringatan; koreksi dicatat sebagai pembalik di bulan berjalan (bukan mengubah bulan terkunci).
4. Bulan berjalan selalu dihitung ulang saat dibuka (dengan cache 5 menit).

## 6. Format PDF Laporan Bulanan

1. Halaman 1: judul toko, periode, laba bersih, omzet, margin, jumlah unit, perbandingan bulan lalu.
2. Halaman 2: tabel rincian laba (bagian 2), arus kas ringkas.
3. Halaman 3: stok (nilai, umur), piutang dan hutang, top model, catatan otomatis (misalnya "4 unit tertahan lebih dari 60 hari").
4. Ukuran A4, tanggal dan jam cetak WIB, angka berformat `Rp 12.450.000`.

## 7. Rekonsiliasi dan Validasi

1. Jumlah laba per item pada sheet Penjualan harus sama dengan Laba_Kotor di Penjualan_Item (cek otomatis harian, selisih tampil sebagai peringatan).
2. Nilai stok dari rumus harus sama dengan jumlah HPP unit aktif.
3. Total Pembayaran per tagihan harus sama dengan kolom Terbayar.
4. Fitur **Cek Konsistensi** di Pengaturan menjalankan ketiganya dan menampilkan daftar selisih.

## 8. Performa

1. Agregasi dihitung di server dari data yang dibaca sekali per permintaan, bukan rumus sel yang berat.
2. Bulan yang sudah dikunci dibaca dari `Laba_Bulanan`, tidak dihitung ulang.
3. Hasil laporan di-cache 5 menit dan dibersihkan setiap ada transaksi baru.

## 9. Kriteria Penerimaan

1. Laba bersih sistem sama dengan hitungan manual pada 20 transaksi uji yang mencakup tukar tambah, tempo, retur, servis, bonus, dan biaya operasional.
2. Laporan bulanan dibuka di bawah 3 detik untuk 1.000 transaksi.
3. PDF bulanan otomatis tersedia tanggal 1 setiap bulan.
4. Cek Konsistensi tidak menemukan selisih pada data uji.
5. Semua grafik terbaca dan tidak terpotong pada layar 320 px sampai 1920 px.
