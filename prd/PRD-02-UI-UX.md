# PRD 02 – UI/UX Web App EPICPHONE

Versi 1.0 | Mengacu ke PRD 00 dan PRD 01

## 1. Konteks Pengguna

Pendekatan desain **mobile-first namun penuh-responsif** (HP kecil sampai desktop, bagian 11). Owner mengoperasikan sistem sambil berdiri di konter, satu tangan memegang HP, pelanggan menunggu. Artinya: layar harus cepat dipahami, tombol besar dan mudah dijangkau ibu jari, input minim ketikan, dan kesalahan mudah dibatalkan.

## 2. Prinsip UX

1. **Satu layar, satu tugas.** Transaksi panjang dipecah menjadi langkah bertahap (wizard) dengan indikator "Langkah 2 dari 4".
2. **Ketik seminimal mungkin:** scan/tempel IMEI, pencarian cepat, dropdown, tombol nominal cepat, nilai default pintar.
3. **Bahasa sehari-hari.** Pakai "Barang Masuk", "Jual", "Sisa Tagihan"; hindari istilah teknis (HPP tampil sebagai "Modal").
4. **Selalu tahu posisi.** Judul layar jelas, tombol kembali konsisten, langkah aktif terlihat.
5. **Konfirmasi sebelum final** berupa ringkasan, bukan popup "Yakin?" generik.
6. **Aman dari salah:** validasi langsung di kolom, peringatan harga di bawah modal, transaksi bisa dibatalkan dengan alasan, bukan dihapus.
7. **Status tidak hanya warna:** selalu ikon + teks + warna.
8. **Umpan balik instan:** tombol berubah jadi "Menyimpan..." lalu notifikasi hasil.

## 3. Arsitektur Informasi

**Navigasi bawah (5 item):**

| Tab | Isi |
|---|---|
| Beranda | Ringkasan hari ini, peringatan, pintasan |
| Stok | Daftar HP dan aksesoris, pencarian, filter |
| **+ Transaksi** (tombol tengah, menonjol) | Jual, Barang Masuk, Servis, Terima Pembayaran, Garansi/Retur |
| Tagihan | Piutang dan hutang, jatuh tempo, cicilan |
| Laporan | Laba bulanan, grafik, ekspor |

Pengaturan dan Riwayat Transaksi ada di ikon menu pada header Beranda.

## 4. Design System

| Elemen | Spesifikasi |
|---|---|
| Warna brand | Biru tua (navy) dari logo EPICPHONE, perkiraan `#0F2A44`, untuk header, tombol utama, dan judul. Hijau logo, perkiraan `#6AB42F`, untuk aksen (indikator menu aktif, ikon, lencana). Nilai pasti diambil dari berkas logo asli. Hijau terang tidak dipakai sebagai latar teks putih (kontras kurang); untuk teks hijau pakai `#3F7D14` |
| Status | Hijau `#16A34A` (Ready, Lunas), Kuning `#CA8A04` (Servis, Sebagian), Merah `#DC2626` (Telat, Rusak, Habis), Abu `#6B7280` (Terjual, Batal) |
| Latar | Putih / abu sangat muda; mode gelap mengikuti pengaturan HP |
| Font | Font sistem; ukuran dasar 16 px; angka uang 20-28 px tebal |
| Grid | Kelipatan 8 px; margin layar 16 px |
| Tap target | Minimal 48 x 48 px; jarak antar tombol 8 px |
| Komponen | Kartu, chip status, tombol besar (penuh lebar di mobile), bottom sheet untuk pilihan, toast, skeleton loading |
| Format tampilan | `Rp 3.250.000`, `05 Okt 2026`, `14:32 WIB`, nama barang lengkap + IMEI 4 digit terakhir |
| Kontras | Rasio teks minimal AA (4.5:1) |

## 5. Layar dan Wireframe

### 5.1 Beranda
```
+----------------------------------+
| EPICPHONE            [menu]      |
| Kamis, 01 Okt 2026               |
+----------------------------------+
| PENJUALAN HARI INI               |
| Rp 12.450.000   |  3 unit        |
| Laba kotor: Rp 1.150.000         |
+----------------------------------+
| PERLU PERHATIAN                  |
| ! 2 tagihan jatuh tempo >        |
| ! 4 HP stok lebih dari 30 hari > |
| ! 3 aksesoris hampir habis >     |
| ! 1 servis siap diambil >        |
+----------------------------------+
| AKSI CEPAT                       |
| [Jual] [Barang Masuk] [Servis]   |
+----------------------------------+
| TRANSAKSI TERAKHIR               |
| 14:32 Jual - A54 8/256 - Rp 3,2jt|
+----------------------------------+
| Beranda Stok  (+)  Tagihan Lapor |
+----------------------------------+
```

### 5.2 Stok
- Kolom pencarian besar (ketik model/IMEI) + tombol scan IMEI.
- Chip filter: Semua, Ready, Servis, Baru, Bekas, Umur >30 hari.
- Kartu per unit: nama lengkap, kondisi + grade, IMEI akhir, modal, harga jual, chip status, umur stok.
- Ketuk kartu membuka Detail Unit: foto, riwayat (masuk, servis, jual), laba jika terjual, tombol Edit / Jual / Kirim ke Servis.
- Tab Aksesoris: daftar SKU dengan sisa stok dan indikator Aman/Menipis/Habis.
- Keadaan kosong: "Belum ada stok. Mulai dengan Barang Masuk" + tombol.

### 5.3 Jual (wizard 4 langkah)
```
Langkah 1 dari 4: Pilih Barang
[ Cari model / IMEI ........ ] [scan]
Keranjang:
 - Samsung A54 8/256 Hitam (Bekas, B) Rp 3.250.000 [x]
 - Charger 20W x1            Rp 85.000 [x]
 BONUS (gratis):
 - Tempered Glass A54 x1     GRATIS [x]
 - Casing bening A54 x1      GRATIS [x]
 [+ Tambah Bonus]   [Pakai Paket Bonus v]
                       [ Lanjut ]

Langkah 2: Pelanggan & Tukar Tambah
[Pilih pelanggan / Tambah baru] (boleh dikosongkan: "Umum")
[ ] Ada tukar tambah -> form taksir HP lama

Langkah 3: Harga & Pembayaran
Subtotal            Rp 3.275.000
Diskon              [ Rp 0 ]
Tukar tambah        - Rp 0
TOTAL TAGIHAN       Rp 3.275.000
Metode: (Tunai)(Transfer)(QRIS)(Cicilan)
Dibayar: [ Rp 3.275.000 ] [Pas] [Rp 3,3jt]
Sisa: Rp 0   -> Lunas
Jika sisa lebih dari 0: wajib isi jatuh tempo

Langkah 4: Periksa & Simpan
Ringkasan lengkap + bonus (GRATIS) + Biaya bonus dan Laba (hanya terlihat owner)
Peringatan kuning jika harga di bawah modal
                  [ Simpan Penjualan ]
```
Setelah simpan: layar sukses (lihat 6).

### 5.4 Barang Masuk
Pilih jenis (HP baru / HP bekas / Aksesoris) → supplier → tambah unit → bayar (tunai/tempo) → ringkasan.

Isian tiap unit HP: model, IMEI, kondisi, grade, baterai, kelengkapan, harga beli, **biaya lain** (ongkir, dll, opsional), **cek akun terkunci** (iCloud/Google/Mi: Bebas / Terkunci / Belum dicek, wajib untuk bekas), dan **foto unit** (panduan posisi, lihat bagian 13).

**Toggle "Perlu servis sebelum dijual?"** (untuk HP yang dibeli dalam keadaan rusak):
1. Aktifkan toggle, isi kerusakan, estimasi biaya, dan pelaksana (teknisi sendiri / vendor luar); foto kerusakan boleh ditambahkan.
2. Unit tersimpan berstatus **Servis** (tidak bisa dijual) dan tugas servis dibuat otomatis.
3. Ringkasan menampilkan: `Modal saat ini Rp 2.900.000 + estimasi servis Rp 350.000 = perkiraan modal Rp 3.250.000`. Estimasi belum masuk modal sebenarnya.

Mode "Tambah unit berikutnya" menyalin model dan harga dari unit sebelumnya agar input massal cepat.

### 5.5 Tukar Tambah
Dibuka dari langkah 2 penjualan. Checklist cepat (layar, baterai, kamera, body, sidik jari/wajah: Baik/Cacat), input IMEI, nilai taksir, foto. Unit otomatis masuk stok bekas dengan modal = nilai taksir.

### 5.6 Servis
Daftar berstatus (Antri, Dikerjakan, Selesai, Diambil). Form: jenis (internal/pelanggan), pelaksana (sendiri/vendor), perangkat, keluhan, estimasi dan biaya sebenarnya (part dan jasa), tarif pelanggan, foto sebelum/proses/sesudah.

**Alur servis sebelum dijual (HP stok rusak):**
1. Mulai dari Barang Masuk (toggle perlu servis) atau dari Detail Unit lewat tombol **Kirim ke Servis**.
2. Saat status berubah menjadi Selesai, owner mengisi biaya sebenarnya dan sistem menampilkan: `Modal unit naik dari Rp 2.900.000 menjadi Rp 3.250.000`.
3. Muncul pertanyaan: **"Unit sudah selesai diperbaiki. Jadikan Ready dan siap dijual?"** (Ya / Nanti).
4. Servis dibatalkan: unit tetap Servis atau dipindah ke Rusak, modal tidak berubah.

### 5.7 Tagihan dan Cicilan
Dua tab: Piutang (pelanggan berutang) dan Hutang (utang ke supplier). Daftar diurutkan jatuh tempo, chip "Telat 3 hari". Ketuk → rincian + riwayat bayar + tombol **Terima Pembayaran** (nominal cepat: Lunasi, setengah, nominal sendiri). Tidak ada pengiriman pengingat otomatis; owner menghubungi pelanggan sendiri.

### 5.8 Garansi dan Retur
Cari nota/IMEI → sistem langsung menampilkan "Garansi sampai 12 Okt 2026 (masih berlaku)" → pilih jenis (klaim, retur, refund, tukar unit) → tindakan → ringkasan dampak ke laba.

### 5.9 Laporan
Kartu laba bulan ini vs bulan lalu, grafik batang 12 bulan, rincian laba per kategori, daftar 10 unit paling cepat/lambat terjual, tombol **Unduh PDF bulanan**. Detail rumus ada di PRD 04.

## 6. Alur Nota (Dibuat Sistem, Dikirim Manual)

Setelah penjualan tersimpan, layar sukses menampilkan:

```
   (centang hijau)  Penjualan tersimpan
   JUAL-2610-0042 | Rp 3.275.000 | LUNAS
   [ Lihat Nota ]
   [ Unduh PDF ]   [ Salin Tautan ]
   [ Penjualan Baru ]   [ Ke Beranda ]
```

- **Lihat Nota:** pratinjau nota di layar.
- **Unduh PDF:** file tersimpan di perangkat; owner mengirim sendiri lewat aplikasi pilihannya.
- **Salin Tautan:** tautan Drive nota (hanya bisa dibuka yang punya tautan).
- Nota juga selalu bisa dibuka ulang dari Riwayat Transaksi.
- Tidak ada pengiriman otomatis lewat WhatsApp atau email.

### Isi Nota (ukuran A5, opsi struk lebar 80 mm)

| Bagian | Isi |
|---|---|
| Kepala | Logo EPICPHONE, nama toko (Epic Phone Purwokerto), tagline, alamat, nomor kontak, Instagram (dari Pengaturan) |
| Info | Nomor nota, tanggal dan jam WIB, nama pelanggan |
| Tabel barang | No, nama lengkap barang, IMEI (untuk HP), kondisi, jumlah, harga, subtotal |
| Bonus | Bagian "BONUS" berisi nama dan jumlah barang/jasa, harga tertulis GRATIS (modal bonus tidak tampil) |
| Ringkasan | Subtotal, diskon, nilai tukar tambah, total, dibayar, sisa, metode bayar |
| Status | Cap "LUNAS" atau "BELUM LUNAS (jatuh tempo 15 Okt 2026)" |
| Garansi | "Garansi sampai 12 Okt 2026" per barang + syarat singkat dari Pengaturan |
| Penutup | Ucapan terima kasih, kolom tanda tangan penjual dan pembeli |
| Pembatalan | Jika transaksi dibatalkan, nota diberi watermark "DIBATALKAN" |

Nota tidak menampilkan modal maupun laba.

## 7. Keadaan Sistem (State)

| State | Perlakuan |
|---|---|
| Memuat | Skeleton, bukan layar kosong; maksimal 3 detik sebelum pesan "Masih memuat..." |
| Kosong | Ilustrasi sederhana + penjelasan + tombol aksi |
| Error validasi | Pesan merah di bawah kolom: "IMEI harus 15 digit angka" |
| Error sistem | "Gagal menyimpan. Data Anda tidak hilang, coba lagi." + tombol Coba Lagi |
| Koneksi putus | Banner kuning; isian form tersimpan sebagai draf di perangkat dan dipulihkan saat dibuka lagi |
| Sukses | Toast hijau 3 detik atau layar sukses untuk transaksi besar |
| Batalkan transaksi | Bottom sheet: pilih alasan → ringkasan dampak (stok kembali, tagihan hilang) → konfirmasi |

## 8. Mikro-interaksi dan Bantuan

1. Nominal otomatis diformat ribuan saat diketik.
2. Tombol nominal cepat (Pas, pembulatan) pada pembayaran.
3. IMEI ganda: peringatan langsung dengan tautan ke unit yang sudah ada.
4. Ikon "i" di istilah penting (Modal, Margin, Umur stok) membuka penjelasan satu kalimat.
5. Tur pertama kali: 4 kartu pengantar (Jual, Stok, Tagihan, Laporan), bisa dilewati.

## 9. Aksesibilitas

Kontras AA, ukuran teks minimal 14 px, ikon selalu disertai teks, urutan fokus keyboard logis di laptop, mendukung pembesaran teks sistem sampai 130 persen.

## 10. Kriteria Penerimaan dan Uji Kegunaan

| Tugas uji | Target |
|---|---|
| Jual 1 HP + 1 aksesoris, tunai | Di bawah 60 detik |
| Barang masuk 3 unit dari supplier sama | Di bawah 3 menit |
| Cari unit dari 4 digit akhir IMEI | Di bawah 15 detik |
| Terima cicilan | Di bawah 30 detik |
| Unduh ulang nota lama | Di bawah 20 detik |
| Tambah 2 bonus saat jual | Tambahan di bawah 15 detik |
| Masukkan HP rusak + tugas servis | Di bawah 2 menit |
| Ambil dan unggah 3 foto unit | Di bawah 60 detik |

Uji dilakukan dengan owner memakai HP sungguhan; tugas selesai tanpa bantuan minimal 9 dari 10 percobaan. Nota harus terbaca jelas saat dibuka di HP dan saat dicetak A5.

## 11. Desain Responsif (Semua HP, Tablet, Laptop, Desktop)

### 11.1 Breakpoint dan Perilaku

| Kelas | Lebar | Perangkat | Navigasi | Tata letak |
|---|---|---|---|---|
| XS | 320-359 px | HP kecil, layar lipat sempit | Navigasi bawah (ikon + label pendek) | 1 kolom, kartu penuh lebar, tombol penuh lebar |
| SM | 360-599 px | HP standar | Navigasi bawah | 1 kolom |
| MD | 600-1023 px | HP lanskap, tablet | Rel samping ikon (kiri) | 2 kolom untuk dashboard; formulir maks 640 px di tengah |
| LG | 1024-1439 px | Laptop | Sidebar teks + ikon (lebar 240 px) | Master-detail 2 panel, tabel padat |
| XL | 1440 px ke atas | Desktop | Sidebar | Isi dibatasi maksimum 1280 px agar tetap terbaca; 3 panel pada layar stok |

### 11.2 Perubahan Pola Komponen

| Komponen | HP (di bawah 600 px) | Tablet (600-1023 px) | Laptop/Desktop (1024 px ke atas) |
|---|---|---|---|
| Daftar stok | Kartu | Kartu 2 kolom | Tabel dengan kolom dapat diurutkan, diatur, dan baris tinggi padat |
| Detail unit | Layar penuh | Panel geser dari kanan | Panel kanan tetap (master-detail) |
| Pilihan/menu aksi | Bottom sheet | Dialog di tengah | Dialog atau menu dropdown |
| Wizard Jual | 1 langkah per layar | 1 kolom lebar sedang | 2 kolom: formulir kiri, **ringkasan keranjang menempel di kanan** |
| Dashboard | 1 kolom | 2 kolom | 4 kartu per baris + grafik berdampingan |
| Grafik | Tinggi 200 px, label ringkas | 240 px | 320 px, legenda di samping |
| Tombol utama | Penuh lebar di bawah | Lebar otomatis, rata kanan | Rata kanan dengan tombol sekunder di sisi kiri |
| Nota/laporan | Pratinjau satu halaman, zoom dengan cubit | Pratinjau di dialog | Pratinjau di panel + tombol cetak |

### 11.3 Wireframe Laptop/Desktop (Layar Stok)
```
+----------+------------------------------------+-------------------+
|EPICPHONE | [Cari model / IMEI...........] [+] | DETAIL UNIT       |
|          | [Semua][Ready][Servis][Bekas]...   | Samsung A54 8/256 |
| Beranda  |------------------------------------| Bekas - Grade B   |
| > Stok   | Nama          IMEI  Modal  Harga St| IMEI ...4521      |
| Jual     | A54 8/256 Hit ..4521 2,9jt 3,25jt R| Modal  Rp 2.900.000|
| Tagihan  | Redmi 12      ..8830 1,4jt 1,7jt  S| Harga  Rp 3.250.000|
| Laporan  | iPhone 11     ..1102 3,1jt 3,6jt  R| Umur   12 hari    |
| Pengatur | ...                                | [Jual][Servis]    |
+----------+------------------------------------+-------------------+
```

### 11.4 Aturan Lintas Perangkat

1. **Satu basis kode, satu tampilan data.** Hanya tata letak yang berubah, bukan fitur; semua fitur ada di semua ukuran.
2. **Tanpa gulir horizontal** pada lebar 320 px; tabel lebar hanya muncul di LG ke atas, di bawahnya diganti kartu.
3. **Sentuh dan mouse sama baiknya:** target ketuk minimal 48 px di layar sentuh, 36 px di laptop; efek hover hanya untuk perangkat yang mendukung hover.
4. **Keyboard di laptop/desktop:** `/` fokus ke pencarian, `N` transaksi baru, `Enter` simpan, `Esc` tutup dialog, `Tab` urutan logis, fokus terlihat jelas.
5. **Orientasi:** potret dan lanskap sama-sama didukung; di lanskap HP, navigasi bawah berubah menjadi rel samping agar ruang tinggi tidak habis.
6. **Area aman:** konten tidak tertutup notch atau bilah gestur (`safe-area-inset`).
7. **Teks:** ukuran memakai `rem`; tetap rapi saat teks sistem dibesarkan sampai 130 persen (HP) dan zoom peramban 200 persen (laptop).
8. **Cetak:** nota dicetak A5, laporan A4 lewat gaya `@media print`; navigasi dan tombol disembunyikan saat cetak.
9. **Mode gelap** mengikuti pengaturan perangkat dengan kontras tetap AA.
10. **Tabel padat di desktop** menampilkan kolom tambahan (HPP, laba, lokasi) yang disembunyikan di HP dan tersedia di Detail Unit.

### 11.5 Kriteria Penerimaan Responsif

| Uji | Target |
|---|---|
| Viewport 320, 360, 390, 412, 768, 1024, 1280, 1536, 1920 px | Tidak ada gulir horizontal, tidak ada teks/tombol terpotong |
| Semua tugas pada bagian 10 | Selesai di HP dan di laptop dengan waktu sesuai target |
| Rotasi layar saat mengisi form | Isian tidak hilang |
| Navigasi keyboard penuh di laptop | Semua fungsi dapat dijangkau tanpa mouse |
| Cetak nota A5 dan laporan A4 | Tidak terpotong, terbaca jelas |
| Peramban | Chrome, Edge, Firefox, Safari (terbaru dan satu versi sebelumnya), Chrome Android, Safari iOS |

## 12. Identitas Brand EPICPHONE

| Elemen | Ketentuan |
|---|---|
| Nama | Epic Phone Purwokerto; di header aplikasi tampil logo + "EPICPHONE" |
| Tagline | "Inovasi Ada Di Genggaman" pada layar masuk, tentang aplikasi, dan nota |
| Logo | Lingkaran melingkar navy dengan tulisan EPIC PHONE (navy) dan PURWOKERTO (hijau). Dipakai di header (versi ringkas), nota (versi penuh), laporan PDF, dan ikon layar utama/favicon |
| Warna | Navy sebagai warna dominan (header, tombol utama), hijau sebagai aksen; status memakai warna status terpisah (bagian 4) |
| Berkas logo | Logo PNG 1080 x 1080 dari owner dioptimalkan (sekitar 30 KB, latar transparan bila tersedia) dan disimpan di `00_ASET-BRAND`; versi tertanam ke aplikasi sebagai data URI |
| Mode gelap | Memakai versi logo terang/outline agar tetap terbaca |
| Kontras | Teks di atas navy berwarna putih; hijau terang hanya untuk elemen dekoratif besar |

## 13. Alur Foto Unit

1. **Titik masuk:** Barang Masuk (per unit), Detail Unit (tombol Tambah Foto), Servis (foto sebelum/proses/sesudah).
2. **Panduan posisi:** kisi petak ikon (Depan, Belakang, Samping, Layar menyala, IMEI, Baterai, Dus, Kelengkapan, Cacat, Lainnya). Petak yang sudah terisi bertanda centang; petak wajib ditandai.
3. **Ambil foto:** ketuk petak → kamera HP atau pilih dari galeri. Di laptop: pilih berkas atau seret ke petak.
4. **Otomatis:** foto dikompres (maks 1600 px, JPEG, di bawah 400 KB) dan arah foto dikoreksi sebelum diunggah.
5. **Nama otomatis:** pengguna tidak mengetik nama berkas. Setelah unggah tampil nama yang dibuat sistem, contoh `EPICPHONE_FOTO-HP_UNT-2610-0007_DEPAN_01_2026-10-05_1032.jpg` (aturan di PRD 09).
6. **Progres dan gagal:** bilah progres per foto; bila gagal, foto tetap di antrean dengan tombol Coba Lagi dan form tidak ditutup.
7. **Aturan jumlah:** bekas minimal 3 foto (Depan, Belakang, Layar menyala), baru minimal 1, maksimal 12 per unit. Peringatan lembut jika kurang, bukan blokir bagi unit baru.
8. **Galeri:** di Detail Unit tampil kisi foto dengan pratinjau; ketuk untuk memperbesar, geser untuk berpindah.
9. **Hapus foto:** foto dipindahkan ke `_TERHAPUS` (bisa dipulihkan owner dari Drive), bukan dihapus permanen; layar menjelaskan hal ini.
