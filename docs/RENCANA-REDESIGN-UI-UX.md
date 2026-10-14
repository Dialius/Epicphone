# Rencana Redesign UI dan UX: Epic Phone Sistem

Versi dokumen: 1.0, 4 Oktober 2026
Basis audit: `epicphone-sistem.zip` (Preact 10, Vite, satu berkas HTML, backend Google Apps Script)
Bahasa: Indonesia. Dokumen ini adalah rencana kerja, bukan kode. Tidak ada berkas proyek yang diubah.

---

## 0. Cara membaca dokumen ini

| Penanda | Arti |
|---|---|
| F0-xx | Masalah fungsional atau fondasi yang harus beres sebelum desain baru dibangun (Fase 0 dan 1) |
| D-xx | Keputusan yang butuh jawaban Anda (ada di Bagian 15) |
| K-xx | Komponen desain sistem baru |
| P-NAMA-xx | Tugas per halaman |
| P0 / P1 / P2 / P3 | Prioritas: P0 menghalangi pemakaian, P1 tinggi, P2 sedang, P3 poles |
| S / M / L / XL | Perkiraan usaha satu developer: S kurang dari 0,5 hari, M 0,5 sampai 1,5 hari, L 2 sampai 4 hari, XL lebih dari 4 hari |

Tingkat bukti ditandai agar Anda tahu seberapa pasti sebuah temuan:

- **[R]** dibuktikan dengan menjalankan aplikasi di browser (desktop 1440 px dan HP 390 px)
- **[K]** disimpulkan dari membaca kode, belum dijalankan
- **[S]** terlihat di screenshot

---

## 1. Ringkasan eksekutif

Kesan "jelek" dan "tidak nyaman" itu benar, dan sebagian besar penyebabnya bukan selera, melainkan cacat teknis yang bisa dibuktikan:

1. Judul halaman dan ikon header **tidak terlihat** di mode terang (putih di atas putih).
2. **Pencarian global dan Pusat Peringatan (lonceng) crash** begitu dipakai.
3. **Menu Lengkap di HP tidak pernah bisa dibuka**, sehingga Riwayat, Garansi, Kontak, Katalog, Biaya, dan Pengaturan tidak terjangkau dari HP.
4. **43% nama kelas CSS yang dipakai di kode tidak punya definisi** (198 dari 458). Banyak di antaranya kelas bergaya Tailwind, padahal proyek ini tidak memakai Tailwind. Inilah penyebab tata letak Stok, Laporan, dan Servis terlihat rusak.
5. **Toast (notifikasi) tertutup modal.** Setelah menyimpan unit di Barang Masuk, tidak ada umpan balik yang terlihat.
6. Data yang diinput di Kontak, Katalog, dan Biaya **hilang saat pindah tab**.
7. Nota memakai **tanggal, masa garansi, dan nomor yang dikarang** (hard-coded atau acak).

Konsekuensinya: **mendesain ulang di atas fondasi ini hanya akan memindahkan masalah.** Urutan kerja yang saya rekomendasikan:

| Fase | Isi | Hasil yang Anda rasakan |
|---|---|---|
| 0 | Perbaiki bug yang menghalangi pemakaian | Semua tombol utama berfungsi, header terbaca |
| 1 | Bangun desain sistem (token, komponen dasar, modal, toast, form) | Satu bahasa visual, tidak ada lagi kelas atau variabel yatim |
| 2 | Shell, navigasi, dan dashboard Beranda baru | Wajah baru aplikasi, navigasi HP lengkap |
| 3 | Stok, Riwayat, Jual, Barang Masuk, Nota | Alur kerja harian di konter jadi cepat dan jelas |
| 4 | Servis, Tagihan, Garansi, Laporan | Operasional dan keuangan |
| 5 | Kontak, Katalog, Biaya, Pengaturan | Data pendukung |
| 6 | QA aksesibilitas, dark mode, cetak, regresi visual | Siap dipakai harian |

### Angka dasar (kondisi sebelum perbaikan)

| Metrik | Nilai | Bukti |
|---|---|---|
| Kelas CSS dipakai tapi tidak didefinisikan | 198 dari 458 (43%); 136 bergaya Tailwind | [R] pemindaian otomatis |
| Variabel CSS dipakai tapi tidak didefinisikan | 18 (`--status-danger-solid` dipakai 27 kali) | [R] |
| Inline style di JSX | 455 (terbanyak: JualModal 81, DetailUnitModal 45, DetailTagihanModal 40) | [R] |
| `!important` di CSS | 49, dari total 3.109 baris CSS | [R] |
| Kontrol interaktif di bawah 44 px (desktop) | 70% sampai 96% per halaman | [R] diukur di browser |
| Tombol ikon di bawah 24 px (Stok desktop) | 12 tombol berukuran 22 x 22 px | [R] |
| Teks di bawah 12 px | Laporan 35 dari 115 elemen teks; Stok HP 22 dari 88 | [R] |
| Halaman dengan skeleton atau status loading | 0 dari 11 | [K] |
| Gambar dengan penanganan error (`onError`) | 0 | [K] |
| Komponen dengan manajemen fokus keyboard | 1 (hanya pencarian global) | [K] |
| Error tipe TypeScript di frontend | 42 (banyak berupa props tidak cocok antara `app.tsx` dan komponen) | [R] `tsc --noEmit` |

### Kontras warna saat ini (WCAG AA meminta 4,5 untuk teks kecil)

| Pasangan warna | Rasio | Status |
|---|---|---|
| Teks status Peringatan di atas latar kuning | 2,64 | Gagal |
| Teks status Berhasil di atas latar hijau muda | 3,00 | Gagal |
| Teks status Bahaya di atas latar merah muda | 3,95 | Gagal |
| Teks status Info di atas latar biru muda | 4,24 | Gagal |
| Hijau merek (500) dipakai sebagai teks di atas putih | 2,57 | Gagal |
| Tombol utama navy di atas latar dark mode | 1,25 | Praktis tak terlihat |
| Teks tersier dark mode di atas permukaan | 4,05 | Gagal |
| Teks utama, sekunder, navy di atas putih | 17,85 / 7,58 / 14,63 | Lulus |

---

## 2. Metode audit dan batasan

**Yang dilakukan**

- Menjalankan aplikasi dari `src/frontend` (build di `dist` lebih tua dari kode sumber, jadi tidak dipakai) dalam mode mock bawaan.
- Mengambil screenshot semua 11 halaman di desktop 1440 x 900 dan sejumlah halaman di HP 390 x 844.
- Mengklik otomatis setiap kontrol di setiap halaman dan mencatat efeknya (dialog muncul, toast, pindah halaman, crash, atau tidak ada efek).
- Menguji keyboard (N, /, Esc, Tab), focus trap, tumpukan modal, alur simpan Barang Masuk, dan persistensi data antar tab.
- Memindai kelas CSS dan variabel CSS yang dipakai tapi tidak ada, menjalankan `tsc --noEmit`, mengukur ukuran target sentuh dan ukuran font, serta menghitung rasio kontras.
- Membaca kode: `app.tsx`, seluruh CSS, `BarangMasukModal`, `JualModal` (bagian utama), dan struktur setiap layar.
- Mencari referensi desain di internet (Bagian 4).

**Belum atau tidak dilakukan**

- Belum membaca baris demi baris: `LaporanScreen`, `PengaturanScreen`, `ServisScreen`, `GaransiScreen`, `DetailUnitModal`, `DetailTagihanModal`, `NotaModal`. Rencana untuk halaman ini berdasar screenshot, hasil klik otomatis, dan struktur kode. Detail kecil bisa bertambah saat implementasi.
- Tidak menguji perangkat fisik (Android, iOS), printer nota, tablet, atau backend Apps Script yang sungguhan.
- Hasil filter chip dari klik otomatis tidak andal dan tidak dijadikan dasar temuan.
- Gambar rusak di screenshot terjadi karena sandbox memblokir `unsplash.com`. Itu bukan bug aplikasi, tetapi kodenya memang tidak punya gambar cadangan (F0-24).

---

## 3. Batasan proyek yang tetap dihormati

Dari `README.md` dan `docs/DECISIONS.md`:

- **Satu berkas, tanpa CDN, aset tertanam** (D005). Konsekuensi untuk redesign: grafik dibuat dengan SVG inline tanpa pustaka, ikon SVG inline, **font sistem** (tidak memuat Google Fonts atau Inter).
- **Transaksi tidak dihapus, hanya dibatalkan** (Status = Batal). Semua desain "hapus" untuk transaksi diganti "Batalkan" dengan alasan wajib.
- **Ergonomi konter satu tangan dan input beruntun** (D007): form Barang Masuk tetap terbuka setelah simpan. Rencana ini mempertahankannya, tetapi umpan balik ("toast melayang di atas") kini terbukti tertutup modal, jadi perlu diperbaiki, bukan dibatalkan.
- **Mode mock otomatis** bila tidak ada Apps Script (D008). Rencana menambahkan penanda yang jelas bahwa data yang tampil adalah data contoh.
- Ukuran: `dist/index.html` saat ini sekitar 370 KB. Anggaran yang diusulkan setelah redesign: di bawah 500 KB.

---

## 4. Referensi desain dan prinsip yang dipakai

Referensi dicari di internet. Yang dipakai adalah **pola dan aturan**, bukan menyalin tampilan merek tertentu.

| Topik | Sumber | Yang diambil |
|---|---|---|
| Navigasi | Material Design 3 (panduan Navigation Bar, Rail, Drawer, via dokumentasi SAP Fiori) <https://www.sap.com/design-system/fiori-design-android/v26-4/components/m3-standard-components/navigation-bar/usage> dan <https://www.sap.com/design-system/fiori-design-android/v26-4/components/m3-standard-components/navigation-rail/usage> | Bilah navigasi bawah untuk 2 sampai 5 tujuan utama di layar kecil. Navigation rail untuk 3 sampai 7 tujuan di layar sedang dan besar. Tujuan sekunder ditaruh di drawer atau menu. Ikon terisi untuk yang aktif, ikon garis untuk yang tidak aktif. |
| Dashboard | Panduan KPI dashboard (Geckoboard, dirangkum <https://blogs.scu.edu/dataviz/?p=955>) dan ringkasan prinsip Nielsen Norman Group <https://echai.ventures/startingup/product-design-ux/how-do-i-make-a-data-heavy-dashboard-readable-instead-of-an-overwhelming-wall-of-numbers> | Dashboard harus bisa dibaca sekilas. Jawaban pertanyaan utama ditaruh paling atas dengan huruf paling besar. Kelompokkan metrik terkait. Tampilkan tren dan perbandingan, bukan angka mentah. |
| Dashboard | Prinsip visual dashboard <https://curatedsql.com/?p=9600> dan panduan layout <https://setproduct.com/blog/dashboard-ui-design> | Pisahkan kelompok metrik dengan ruang kosong, bukan dengan garis tebal. Barisan KPI yang tenang di atas, rincian muncul saat diminta (pola yang sama dipakai Stripe dan Linear). |
| Dashboard | Rekomendasi desain dashboard <https://docs.community.firstwave.com/wiki/display/opCharts/Dashboard+Design+Considerations> | Buang informasi "bagus kalau ada". Sediakan drill-down dari ringkasan ke rincian. |
| Tabel dan daftar | Shopify Polaris, Index Table dan pola Index <https://polaris.shopify.com/components/index-table> dan <https://shopify-dev.shopifycloud.com/docs/api/app-home/patterns/index> | Tabel untuk objek sejenis supaya cepat dipindai dan ditindak. Tampilkan aksi baris hanya saat baris di-hover atau dipilih agar tabel tidak ramai. Halaman indeks memakai lebar penuh. Wajib ada empty state dan loading state. |
| POS | Panduan UI POS Shopify <https://www.shopify.com/retail/pos-ui> dan artikel desain antarmuka pembayaran <https://framna.com/insights/designing-payment-interfaces-for-pos> | Ramah sentuh, kurangi gesekan saat jam ramai, gerak hanya bila menambah kejelasan, form dirancang untuk kecepatan. |
| Toast | Polaris <https://shopify.github.io/polaris-react-archive/components/internal-only/toast>, Maersk <https://designsystem.maersk.com/components/toast/>, ulasan aksesibilitas <https://scottohara.me/blog/2019/07/08/a-toast-to-a11y-toasts.html> | Toast untuk umpan balik singkat yang tidak memblokir. Jangan untuk kesalahan kritis yang menuntut tindakan. Tumpuk maksimal 3. Aksi seperti "Urungkan" harus tersedia juga di tempat lain. Container sebagai live region (`role=status`, `aria-live=polite`). Durasi harus cukup untuk dibaca dan berhenti saat di-hover. |
| Target sentuh | WCAG 2.2 butir 2.5.8 <https://w3c.github.io/wcag/understanding/target-size-minimum> | Target minimal 24 x 24 px CSS, atau beri jarak 24 px dari target lain. Level AAA (2.5.5) menganjurkan 44 x 44 px. |

### Prinsip yang diturunkan untuk Epic Phone

1. **Tenang dan padat informasi.** Pemilik toko memakai aplikasi ini berjam-jam. Warna lembut, hierarki jelas, tidak ada elemen dekoratif.
2. **Satu pertanyaan per layar.** Beranda menjawab "bagaimana toko hari ini dan apa yang perlu saya tangani". Stok menjawab "apa yang saya punya dan bisa dijual". Dan seterusnya.
3. **Aksi utama selalu terjangkau satu tangan** di HP: di bagian bawah layar, bukan di pojok atas.
4. **Setiap aksi punya umpan balik yang terlihat**, termasuk saat menunggu (loading), sukses, dan gagal.
5. **Warna tidak pernah menjadi satu-satunya penanda.** Status selalu berupa ikon atau titik ditambah teks.
6. **Konsisten di semua halaman.** Satu komponen tombol, satu komponen modal, satu komponen toast, satu aturan spasi.
7. **Data tidak boleh palsu.** Nota, draf, dan notifikasi harus bersumber dari data nyata atau diberi label "contoh".

---

## 5. Fase 0: temuan fungsional yang harus diperbaiki lebih dulu

Urutan sudah mengikuti dampak. Semua item P0 dikerjakan sebelum desain baru dimulai.

### 5.1 Hal yang membuat aplikasi tidak bisa dipakai (P0)

| ID | Temuan | Bukti | Perbaikan | Usaha |
|---|---|---|---|---|
| F0-01 | Judul halaman dan ikon header (privasi, lonceng, cari) tidak terlihat di mode terang. `app.tsx` memaksa header berlatar putih lewat inline style, sedangkan CSS memberi teks dan ikon warna putih. Kelas `.page-title` tidak ada. Di HP, ikon header putih di atas putih. | [R] `h1` dan tombol terhitung berwarna `rgb(255,255,255)` pada latar putih | Hapus inline style header. Tetapkan satu varian header (permukaan terang, teks token `--text-primary`). Definisikan `.page-title`. | S |
| F0-02 | Pencarian global crash begitu pengguna mengetik: `Cannot read properties of undefined (reading 'filter')` di `PencarianGlobalModal.tsx:31`. `app.tsx` tidak mengirim props `units`, `aksesoris`, `transaksi`, `kontak`. | [R] | Kirim data dari state aplikasi. Beri nilai default array kosong di komponen. | S |
| F0-03 | Pusat Peringatan (lonceng) tidak terbuka karena crash di `PusatPeringatanModal.tsx:14` (`peringatanList` tidak dikirim). Angka di lonceng berasal dari `MOCK_PERINGATAN` statis. | [R] dan [K] | Turunkan peringatan dari data nyata (Bagian 8.7). | M |
| F0-04 | Menu Lengkap di HP tidak pernah dibuka: `setIsMenuLengkapOpen(true)` tidak dipanggil di mana pun. Dari HP, halaman Riwayat, Garansi, Kontak, Katalog, Biaya, dan Pengaturan (termasuk dark mode) tidak terjangkau. | [R] hanya 5 kontrol di bilah bawah, 0 kontrol yang mengandung nama halaman lain | Bilah bawah baru dengan tombol "Menu" (Bagian 8.2). | S |
| F0-05 | Toast tertutup modal. Toast dan overlay modal sama-sama `z-index: 100`, dan modal dirender belakangan. Setelah "Simpan Unit" berhasil, toast ada di DOM tetapi tertutup header modal. Ini melanggar maksud D007 ("umpan balik via toast melayang di atas"). | [R] `elementFromPoint` pada toast mengembalikan `sheet-header` | Skala z-index baru, toast di lapisan tertinggi (Bagian 6.7). Tambahkan juga strip sukses di dalam modal. | S |
| F0-06 | 198 dari 458 kelas CSS tidak ada definisinya. 136 bergaya Tailwind (`w-[440px]`, `min-w-[220px]`, `flex-[2]`, `grid-cols-3`, `text-[11px]`, `gap-1.5`, dan sebagainya), 62 lainnya kelas bernama khusus (`.timeline-*`, `.foto-tile-*`, `.menu-tile-*`, `.search-result-row`, `.alert-row`, `.banner-success`, `.page-title`, `.text-tertiary`, `.text-secondary`, dan lainnya). Tidak ada Tailwind, UnoCSS, atau Windi di proyek. Akibatnya: kolom cari di toolbar Stok mengecil jadi kotak, panel detail Stok lepas dan terpotong di 1440 px, nama HP membungkus 4 baris, rincian laba tidak rata, kartu Servis tanpa jarak, ikon `text-tertiary` tidak berwarna. | [R] pemindaian otomatis, [S] | Ganti semuanya dengan komponen dan utilitas bernama dari desain sistem baru (Bagian 7). Tambahkan pemeriksaan otomatis di CI yang gagal bila ada kelas atau variabel yatim (Bagian 14). Daftar lengkap di Lampiran A. | L |
| F0-07 | 18 variabel CSS dipakai tanpa definisi (Lampiran B). Paling parah `--status-danger-solid` (27 pemakaian di modal, termasuk Batalkan Transaksi dan Detail Tagihan), sehingga warna bahaya tidak muncul. | [R] | Definisikan atau ganti dengan token baru. | S |
| F0-08 | Tata letak HP rusak: ada aturan padding global 32 px yang berlaku setelah blok `@media print` di `responsive.css`, sehingga konten hanya sekitar 294 px dari 390 px. Grafik dan Aksi Cepat berdampingan sampai terpotong. Omnibox desktop (dengan hint "/") ikut tampil di HP dan terpotong. | [R] dan [S] | Tulis ulang `responsive.css` (Bagian 8.1). | M |
| F0-09 | Props tidak cocok antara `app.tsx` dan komponen. Contoh yang terdeteksi `tsc`: `onSelesaiServis` vs `onServisSelesai`, `onSimpanBayar` vs `onSimpanPembayaran`. Aksi selesai servis, bayar tagihan, batalkan transaksi, dan simpan foto kemungkinan tidak berjalan. | [R] 42 error tipe di frontend; [K] kemungkinan dampak, belum diuji satu per satu | Bereskan semua error tipe, lalu uji tiap aksi. Jadikan `tsc --noEmit` wajib lulus. | M |
| F0-10 | Data hilang saat pindah tab. Kontak, Katalog, dan Biaya menyimpan data di state lokal komponen yang diinisialisasi dari data contoh. Kontak baru yang disimpan lenyap setelah pindah tab dan kembali. | [R] diuji pada Kontak; [K] pola sama pada Katalog dan Biaya | Angkat state ke penyimpanan aplikasi dan sambungkan ke API (lihat F0-13). | M |
| F0-11 | Nota memakai data karangan: tanggal `'01 Okt 2026, 14:35 WIB'`, garansi `'08 Okt 2026 (7 Hari)'`, dan nomor nota acak (`Math.random`) di `JualModal`. Nota yang dibuka dari Riwayat memakai garansi `'12 Okt 2026'` dan hanya 1 item. Nota adalah dokumen pelanggan, jadi ini paling berisiko. | [K] | Ambil tanggal dari jam sistem (WIB), masa garansi dari Pengaturan, nomor nota dari penomor berurutan di backend, item dari transaksi asli. | M |
| F0-12 | "Lanjutkan penjualan yang belum selesai" di Beranda selalu tampil (`hasDraft={true}` ditulis permanen) dan tidak ada draf yang benar-benar tersimpan. | [K] dan [S] | Simpan draf otomatis per langkah wizard, tampilkan banner hanya bila draf ada (Bagian 9.2). | M |
| F0-13 | Hanya dua pemanggilan backend di frontend (`cariStok`, `simpanPembelian`). Penjualan, servis, pembayaran, klaim, kontak, biaya, dan pengaturan hanya mengubah state lokal. Bila daftar stok dari server kosong, data contoh tetap tampil karena pengecekan `length > 0`. | [K] | Keputusan lingkup D-01: apakah redesign ini juga menyambungkan semua aksi ke backend? Minimal, hilangkan data contoh yang menutupi data nyata dan tampilkan banner "Mode demo". | L sampai XL |
| F0-14 | Tombol di layar yang tidak berefek: "Laporan →" di kartu tren Beranda. `onBukaTransaksi` dari Beranda dan Pencarian hanya pindah ke Riwayat tanpa membuka atau menyorot transaksinya. `onBukaRiwayatFilter(kategori)` mengabaikan kategori. | [R] dan [K] | Sambungkan atau hapus. Bagian 8.5 dan 10.2. | S |
| F0-15 | Aksi palsu di Laporan: "Unduh Berkas PDF" dan "Salin tautan" hanya memunculkan toast ("Mengunduh berkas...") tanpa membuat atau mengunduh apa pun. | [K] baris 537 sampai 541 `LaporanScreen.tsx` | Implementasi nyata (cetak via `print.css` atau PDF dari backend) atau sembunyikan sampai siap. | M |

### 5.2 Perilaku interaksi yang keliru (P1)

| ID | Temuan | Bukti | Perbaikan | Usaha |
|---|---|---|---|---|
| F0-16 | Pintasan "P" (mode privasi) tertulis di tooltip tetapi tidak punya handler. Pintasan "N" tidak memeriksa tombol modifier dan tetap aktif saat modal lain terbuka. | [K] | Pengelola pintasan global (Bagian 12.3). | S |
| F0-17 | Esc menutup semua modal sekaligus, termasuk modal yang bertumpuk. | [K] | Tumpukan overlay: Esc hanya menutup yang paling atas. | S |
| F0-18 | Modal tidak memindahkan fokus ke dalam, tidak menjebak fokus, dan tidak mengembalikan fokus saat ditutup. Tidak ada kunci scroll `body` dan tidak ada `overscroll-behavior`. | [R] dan [K] | `ModalShell` baru (Bagian 7, K-05). | M |
| F0-19 | Semua modal memanggil `if (!isOpen) return null` **sebelum** `useState`. Akibatnya state form tidak direset konsisten: setelah form Barang Masuk ditutup dengan Esc dan dibuka lagi, nama unit sebelumnya masih terisi. | [R] dan [K] | Pasang modal hanya saat terbuka, atau reset eksplisit, dan jangan memanggil hook setelah return dini. | M |
| F0-20 | Barang Masuk memakai `alert()` bawaan browser untuk kesalahan IMEI dan foto. Foto bertanda "*Wajib" sebenarnya tidak ditegakkan: unit berhasil disimpan tanpa satu foto pun. Tombol "Simpan Unit" nonaktif tanpa alasan yang terlihat. | [R] | Validasi inline, alasan tombol nonaktif ditampilkan, foto wajib ditegakkan (Bagian 9.3). | S |
| F0-21 | Timer toast tidak dibersihkan dan hanya ada satu toast, sehingga timer toast lama bisa menghapus toast baru. | [K] | Antrean toast (Bagian 11.1). | S |
| F0-22 | Gambar tanpa gambar cadangan: saat gagal dimuat, teks alt menumpuk di kartu. | [R] | Komponen `FotoUnit` dengan placeholder dan `onError`. | S |
| F0-23 | Warna status tidak konsisten secara makna: "Selesai" pada servis di Riwayat berwarna kuning (peringatan). Ikon sidebar sama untuk Tagihan, Laporan, dan Biaya (grafik garis). | [S] | Peta status tunggal (Bagian 6.4), ikon unik per halaman. | S |
| F0-24 | State basi: `handleJualSukses` memakai `unitDijual` yang bisa `null`, `onSelesaiServis` memakai closure `stokList`, `handleSimpanBarangMasuk` menulis supplier "Supplier / Pelanggan", metode bayar "Tunai", merek "Smartphone", dan harga jual target 1,15 kali harga beli secara diam-diam. | [K] | Pembaruan state fungsional, nilai bisnis diambil dari form dan Pengaturan, dan harga jual target terlihat serta bisa diedit. | M |
| F0-25 | Preferensi tidak tersimpan: tema, mode privasi, dan kepadatan tabel kembali ke bawaan setiap dimuat. Tidak ada `prefers-color-scheme` dan `prefers-reduced-motion`. Tidak ada routing sehingga tombol Back browser tidak berfungsi. | [K] | Simpan di `localStorage`, routing hash, dukung preferensi sistem. | M |
| F0-26 | Ikon lonceng dan peringatan yang menampilkan angka berasal dari data contoh, bukan dari kondisi toko. Mode privasi tidak menyamarkan angka pada grafik. | [K] | Bagian 8.5 dan 8.7. | S |

---

## 6. Desain sistem baru: token

Prinsip migrasi: **pertahankan identitas merek** (navy `#0F2A44` dan hijau `#6AB42F`), perbaiki peran dan kontrasnya, dan **buang semua token ganda atau yatim**. Satu sumber kebenaran di `tokens.css`; berkas lain hanya memakai `var(--...)`.

### 6.1 Warna

Hijau merek **tidak dipakai sebagai teks di atas putih** (2,57:1). Hijau dipakai untuk aksen, indikator aktif, dan latar tombol di dark mode. Untuk teks hijau dipakai `--green-700`.

```css
:root {
  /* Merek */
  --navy-900: #0F2A44;  --navy-800: #173B5E;  --navy-50: #EAF0F6;
  --green-500: #6AB42F; --green-700: #3F7D14; --green-50: #EEF7E6;

  /* Netral (terang) */
  --bg-app: #F5F7FA;  --bg-surface: #FFFFFF;  --bg-subtle: #F8FAFC;  --bg-hover: #F1F5F9;
  --border: #E2E8F0;  --border-strong: #CBD5E1;
  --text: #0F172A;    --text-2: #475569;      --text-3: #64748B;   /* 4,76:1 di putih, minimal untuk teks bantu */

  /* Peran aksi (berubah antar tema) */
  --action-bg: var(--navy-900);   --action-bg-hover: var(--navy-800);  --action-fg: #FFFFFF;
  --focus-ring: #1D4ED8;

  /* Status: pasangan latar + teks dengan kontras di atas 4,5 */
  --ok-bg:   #DCFCE7; --ok-fg:   #166534; --ok-solid:   #16A34A;   /* 6,49 */
  --warn-bg: #FEF3C7; --warn-fg: #92400E; --warn-solid: #CA8A04;   /* 6,37 */
  --bad-bg:  #FEE2E2; --bad-fg:  #B91C1C; --bad-solid:  #DC2626;   /* 5,30 */
  --info-bg: #DBEAFE; --info-fg: #1D4ED8; --info-solid: #2563EB;   /* 5,49 */
  --mute-bg: #F1F5F9; --mute-fg: #475569; --mute-solid: #64748B;
}
.theme-dark {
  --bg-app: #0B1620;  --bg-surface: #12222F;  --bg-subtle: #172B3A;  --bg-hover: #1C3447;
  --border: #24394A;  --border-strong: #334D63;
  --text: #E6EDF3;    --text-2: #9FB1C0;      --text-3: #8CA2B3;   /* 6,12:1, naik dari 4,05 */
  --action-bg: var(--green-500);  --action-bg-hover: #7CC43F;  --action-fg: #0B1620;   /* 7,12:1 */
  --focus-ring: #93C5FD;
  --ok-bg: #0F3320;   --ok-fg: #86EFAC;   --warn-bg: #3B2A08; --warn-fg: #FCD34D;
  --bad-bg: #451A1A;  --bad-fg: #FCA5A5;  --info-bg: #14305A; --info-fg: #93C5FD;
  --mute-bg: #1C3447; --mute-fg: #B6C4D0;
}
```

Aturan pemakaian:

- Hanya **satu tombol utama per tampilan** yang memakai `--action-bg`.
- Hijau sebagai aksen: garis penanda menu aktif, batang grafik hari ini, indikator "Ready".
- Jangan memakai warna mentah (`#DBEAFE`, `#1E40AF`, `#991B1B`) di JSX. Saat ini banyak yang tertanam di modal.
- Kandidat nilai di atas perlu diuji ulang pada layar fisik toko (cahaya terang, kecerahan rendah) sebelum dikunci.

### 6.2 Tipografi

Font tetap **font sistem** (D005). Perbaikan: daftar font saat ini menyebut "Inter" di urutan pertama padahal tidak dimuat. Hapus agar konsisten dengan D005.

```css
--font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
body { font-variant-numeric: tabular-nums; }   /* angka rupiah sejajar */
```

| Peran | Ukuran / tinggi baris | Bobot | Dipakai untuk |
|---|---|---|---|
| Display | 32 / 38 (HP 28 / 34) | 700 | Satu angka utama di Beranda dan Laporan |
| H1 | 22 / 28 | 700 | Judul halaman |
| H2 | 18 / 24 | 600 | Judul kartu dan modal |
| H3 | 16 / 22 | 600 | Sub-judul, nama unit di kartu |
| Body | 14 / 20 (HP 15 / 22) | 400 | Teks utama |
| Body kuat | 14 / 20 | 600 | Nama barang, nominal |
| Caption | 12 / 16 | 400 atau 500 | Keterangan, label tabel, metadata |
| Mono | 13 / 18 | 400 | IMEI, nomor nota |

Aturan:

- **Ukuran terkecil 12 px.** Tidak ada `text-[11px]` atau di bawahnya (saat ini Laporan punya 35 elemen).
- **Bobot tebal hanya untuk angka kunci dan nama utama.** Saat ini hampir seluruh teks berbobot 600 sampai 700 sehingga tidak ada hierarki.
- Label huruf kapital semua hanya untuk judul grup kecil (maksimal 12 px, jarak huruf 0,04 em), bukan untuk judul kartu.
- Angka uang selalu `Rp 1.450.000`, rata kanan di tabel, dan tidak pernah terpotong. Ringkasan besar boleh `Rp 6,1 jt` dengan tooltip nilai penuh.

### 6.3 Spasi, radius, bayangan

| Token | Nilai | Pemakaian |
|---|---|---|
| `--sp-1` ke `--sp-8` | 4, 8, 12, 16, 24, 32, 48, 64 px | Satu-satunya skala spasi. Hapus `--space-*`. |
| Padding halaman | 16 (HP), 24 (tablet), 32 (desktop) | Hanya satu aturan padding halaman. |
| Jarak antar kartu | 12 (HP), 16 (desktop) | Menghilangkan kartu Servis yang menempel. |
| Padding kartu | 16 (HP), 20 (desktop) | |
| `--r-sm` / `--r-md` / `--r-lg` / `--r-xl` / `--r-full` | 6 / 8 / 12 / 16 / 9999 | Chip dan pill: full. Input dan tombol: md. Kartu: lg. Sheet dan modal: xl. |
| Kartu | Border 1 px `--border`, tanpa bayangan | Datar dan tenang. Bayangan hanya saat hover kartu yang bisa diklik. |
| Overlay | Bayangan `--elev-3` | Modal, popover, toast. |

### 6.4 Peta status (satu sumber untuk seluruh aplikasi)

Setiap status = ikon kecil atau titik + teks + pasangan warna. Dipakai oleh `StatusPill` (K-04).

| Domain | Status | Warna | Catatan |
|---|---|---|---|
| Stok | Ready | ok | |
| Stok | Servis | warn | |
| Stok | Dipesan | info | |
| Stok | Terjual | mute | |
| Servis | Antri | info | |
| Servis | Dikerjakan | warn | |
| Servis | Selesai | **ok** | Saat ini kuning di Riwayat |
| Servis | Diambil | mute | |
| Transaksi | Lunas | ok | |
| Transaksi | Sebagian / Tempo | warn | |
| Transaksi | Batal | mute dengan teks dicoret | |
| Tagihan | Belum jatuh tempo | info | |
| Tagihan | Telat (n hari) | bad | |
| Tagihan | Lunas | ok | |
| Garansi | Berlaku (sisa n hari) | ok | |
| Garansi | Segera habis (7 hari atau kurang) | warn | |
| Garansi | Habis | bad | |
| Klaim | Diproses | warn | |
| Klaim | Selesai | ok | |

### 6.5 Gerak

Token gerak yang ada (120, 200, 300 ms) dipertahankan. Aturan tambahan:

- Gerak hanya untuk memberi tahu perubahan: sheet naik 200 ms, toast masuk 200 ms, panel geser 200 ms.
- `@media (prefers-reduced-motion: reduce)` mematikan semua transisi dan animasi selain perubahan opasitas singkat.
- Tidak ada animasi dekoratif yang berulang.

### 6.6 Breakpoint dan mode tata letak

| Mode | Lebar | Navigasi | Detail |
|---|---|---|---|
| HP | di bawah 768 px | Bilah bawah (4 tujuan + tombol tengah + Menu) | Daftar berbentuk kartu, modal berbentuk bottom sheet |
| Tablet | 768 sampai 1023 px | Rail 72 px (ikon + label kecil) | Tabel boleh tampil, panel detail berbentuk drawer |
| Desktop | 1024 sampai 1439 px | Sidebar 248 px, bisa diciutkan ke 72 px | Panel detail Stok berbentuk drawer |
| Lebar | 1440 px atau lebih | Sidebar 248 px | Panel detail Stok terdok di kanan (400 px) |

Konten memakai `max-width: 1280px` dan rata tengah di layar lebih lebar dari itu. Hapus `100vw` (saat ini dipakai 5 kali, menimbulkan scroll horizontal saat ada scrollbar).

### 6.7 Skala z-index (memperbaiki F0-05)

| Lapisan | Nilai |
|---|---|
| Konten | 0 |
| Header, tabel sticky | 20 |
| Sidebar | 30 |
| Bilah bawah HP | 40 |
| Dropdown, popover | 60 |
| Overlay dan modal | 100 |
| Toast | **200** |
| Tooltip | 300 |

### 6.8 Ukuran target sentuh

| Elemen | HP | Desktop |
|---|---|---|
| Tombol utama | 48 px tinggi | 40 px |
| Tombol biasa, input | 44 px | 36 sampai 40 px |
| Tombol ikon | 44 x 44 px (ikon 20) | 36 x 36 px (minimum mutlak 24 x 24) |
| Chip filter | 36 px tinggi, jarak 8 px | 32 px |
| Baris daftar yang bisa diketuk | minimal 56 px | minimal 48 px |
| Item bilah bawah | 56 px | tidak berlaku |

Token `--touch-min: 48px` sudah ada tetapi tidak dipakai. Aktifkan.

---

## 7. Komponen desain sistem

Tujuan: satu komponen untuk satu fungsi, tanpa inline style. Saat ini ada dua sistem tombol paralel (`.btn-primary` dan `.btn-utama`, `.btn-outline` dan `.btn-sekunder`), `.btn-header`, `.btn-icon`, tiga gaya chip, dan modal yang masing-masing menulis ulang gaya header dan footer.

| ID | Komponen | Spesifikasi | Menggantikan |
|---|---|---|---|
| K-01 | **Button** | Varian: `primary` (satu per tampilan), `secondary` (garis), `ghost`, `danger`, `success` (hanya konfirmasi bayar). Ukuran: `sm` 32, `md` 40, `lg` 48 (HP, tombol utama footer). Status: normal, hover, active, fokus (cincin 2 px `--focus-ring`, offset 2 px), nonaktif, **loading** (spinner, label tetap, klik diblokir untuk mencegah kirim ganda). Ikon di kiri. Label kalimat biasa ("Simpan unit"), tanpa tanda "+" ganda (Servis saat ini menampilkan "+ + Servis Baru"). Tombol nonaktif selalu disertai teks alasan di dekatnya. | `.btn-primary/.btn-utama/.btn-outline/.btn-sekunder/.btn-header` |
| K-02 | **IconButton** | `aria-label` wajib, tooltip saat hover dan fokus, area 44 px di HP, 36 px di desktop. | `.btn-icon` 22 px |
| K-03 | **Chip / Segmented / Tabs** | *Chip* untuk filter yang bisa dinyalakan bersama atau dihapus, dengan hitungan (`Ready 5`). *Segmented* untuk 2 sampai 5 pilihan yang saling meniadakan (HP/Aksesoris, periode). *Tabs* (garis bawah) untuk bagian halaman. Baris yang bisa digulir horizontal diberi pudar di tepi dan, di desktop, panah geser. | `.filter-chip`, pill tab Pengaturan, tab Stok |
| K-04 | **StatusPill** | Titik atau ikon 12 px + teks, pasangan warna dari peta status (Bagian 6.4). Tidak pernah hanya warna. | `.badge-*` ad hoc |
| K-05 | **ModalShell** (Dialog dan Sheet) | Satu pembungkus untuk semua modal. Ukuran `sm` 440, `md` 560, `lg` 720, `wizard` 640. Di HP menjadi bottom sheet setinggi maksimal 92 dvh dengan pegangan tarik dan footer menempel di bawah (mengikuti safe-area). Fokus masuk ke elemen pertama (atau judul) saat dibuka, fokus terjebak di dalam, dan kembali ke pemicu saat ditutup. `role="dialog"`, `aria-modal`, `aria-labelledby`. Kunci scroll `body`, `overscroll-behavior: contain`. Esc dan tombol Back menutup hanya yang paling atas. Klik overlay menutup hanya jika form tidak berubah (bila berubah, tanya "Buang perubahan?"). Tombol tutup 44 px. `ConfirmDialog` adalah varian `sm` dengan tombol bahaya. | Pola `.modal-overlay` + `.sheet-container` yang diulang di belasan modal |
| K-06 | **Card** | Varian: datar, bisa diklik (hover mengangkat ringan, fokus terlihat), KPI, peringatan (garis kiri berwarna). | `.card`, `.clickable` |
| K-07 | **StatCard (KPI)** | Label (Caption), nilai (Display atau H1), selisih terhadap periode pembanding (`+12% dari kemarin`, ikon panah + teks, bukan hanya warna), sparkline opsional, seluruh kartu bisa diklik menuju halaman yang sudah terfilter. Mendukung mode privasi (nilai diganti `Rp ••••••`, tinggi kartu tetap). | `.kpi-card` |
| K-08 | **DataTable dan CardList** | Desktop: header lengket, tinggi baris 48 (nyaman) atau 40 (rapat), kolom diprioritaskan (Bagian 10.1), aksi baris muncul saat hover atau baris dipilih (pola Polaris), pilihan baris dengan keyboard (panah, Enter), kolom angka rata kanan dan `tabular-nums`. HP: setiap baris menjadi kartu 56 px ke atas dengan satu area ketuk. Semua dilengkapi *skeleton*, *empty state*, dan *error state*. | `.data-table`, daftar kartu manual |
| K-09 | **PageHeader dan Toolbar** | `PageHeader`: judul H1, subjudul (hitungan atau tanggal), aksi di kanan (maksimal 1 utama + 1 sekunder), breadcrumb untuk sub-halaman. `Toolbar`: satu baris berisi pencarian (mengisi sisa lebar, minimal 240 px), tombol Filter dengan lencana jumlah, Sort, Kepadatan. Filter yang aktif tampil sebagai chip yang bisa dihapus dan tombol "Hapus semua". | Baris tombol ad hoc di tiap layar |
| K-10 | **Form** | `Field` (label terhubung `htmlFor`, teks bantu, pesan galat dengan ikon, `aria-invalid`, `aria-describedby`). `TextInput`. `MoneyInput`: awalan "Rp", pemisah ribuan saat mengetik, `inputMode="numeric"`, tanpa nilai bawaan yang menyesatkan. `PhoneInput`: `inputMode="tel"`, normalisasi 08xx ke 628xx. `Combobox` pencarian (unit, kontak, katalog). `Select` bawaan di HP. `Switch`. `Checkbox`. `RadioCards` (metode bayar). `Stepper` jumlah. `DateInput`. `Textarea`. `FotoSlot`. Tinggi input 44 (HP) dan 40 (desktop). Cincin fokus sama dengan tombol. | `.form-input`, `.form-group`, label tanpa `htmlFor` |
| K-11 | **Toast / Toaster** | Spesifikasi di Bagian 11.1. | `.toast-*` |
| K-12 | **Banner** | Inline: info, sukses, peringatan, galat, dan **Mode demo**. Bisa ditutup bila bukan kondisi sistem. | `.banner-*` (belum didefinisikan) |
| K-13 | **EmptyState / Skeleton / ErrorState** | Ikon 40 px, judul, satu kalimat penjelas, satu tombol aksi. Skeleton meniru bentuk konten (baris tabel, kartu KPI), tanpa kilau bila `prefers-reduced-motion`. Galat: pesan manusiawi + "Coba lagi". | tidak ada sama sekali |
| K-14 | **Tooltip / Popover** | Tooltip untuk tombol ikon. Popover untuk ikon info (ⓘ) yang bisa diketuk di HP (saat ini Laporan memakai ikon ⓘ kecil yang tidak bisa ditekan dengan jari). | ikon ⓘ |
| K-15 | **Grafik SVG inline** | `BarChart`, `Sparkline`, `Donut`, `AgingBar`. Tanpa pustaka. `role="img"` + `aria-label` ringkasan + tabel tersembunyi untuk pembaca layar. Tooltip saat hover atau ketuk. Menghormati mode privasi. | grafik batang Beranda |
| K-16 | **FotoUnit dan Ikon** | `FotoUnit`: rasio tetap, `object-fit: cover`, placeholder ikon saat tidak ada atau gagal, label posisi. Set ikon: setiap halaman punya ikon unik (Bagian 8.2). | `<img>` langsung |
| K-17 | **Timeline** | Titik + garis + tanggal + judul + keterangan, untuk riwayat unit, servis, dan klaim. | `.timeline-*` (belum didefinisikan) |
| K-18 | **Kbd** | Petunjuk pintasan kecil (`N`, `/`) yang konsisten. | teks di tooltip |

### Aturan migrasi komponen

1. Bangun K-01 sampai K-14 lebih dulu. **Jangan mulai dari nol:** folder `components/ui` sudah memuat `Button` (varian utama, sekunder, bahaya, ghost, link, dengan status loading), `ChipStatus`, `InputTeks`, dan `Lencana`, tetapi masing-masing hanya dipakai di 1 sampai 2 berkas, sedangkan sisa aplikasi menulis tombol dan chip sendiri [R]. Perluas komponen itu, lalu paksa semua layar memakainya. Halaman `Galeri` sudah ada tetapi tidak punya pemicu apa pun (tab `galeri` tidak bisa dicapai dari UI [K]); jadikan galeri komponen resmi, hanya tampil di mode pengembangan (`#/_galeri`), dan pakai untuk uji visual tiap komponen.
2. Migrasi layar satu per satu. Setiap layar selesai bila: nol inline style, nol kelas bergaya Tailwind, nol warna mentah, nol `alert()`.
3. Hapus CSS lama hanya setelah tidak ada layar yang memakainya (pemindai kelas memastikan).

---

## 8. Shell, navigasi, dan dashboard

### 8.1 Tata letak shell

- Kerangka: CSS grid `grid-template-columns: var(--sidebar-w) 1fr`. Definisikan `--sidebar-w` (248 px, 72 px saat diciutkan). Saat ini variabel itu tidak ada sehingga lebar bergantung pada aturan `!important`.
- Header berada **di dalam kolom konten** (bukan melintang di atas sidebar), lengket di atas, satu tinggi (64 desktop, 56 HP).
- Satu wadah scroll: `.app-main`. Halaman tidak menggulir `body`.
- Konten dibungkus `.page` dengan `max-width: 1280px`, padding sesuai Bagian 6.3. Aturan padding global yang menyebabkan F0-08 dihapus.
- Landmark: `<nav>`, `<header>`, `<main id="konten">`, dan tautan "Lewati ke konten".
- `index.html`: tambahkan `<meta name="theme-color">` per tema agar bilah browser HP menyatu.

### 8.2 Navigasi

**Struktur informasi baru** (11 halaman, 4 grup + pengaturan). "Jual" dan "Barang Masuk" bukan halaman melainkan aksi, dan saat ini tidak punya status aktif sehingga membingungkan. Keduanya pindah ke tombol **Transaksi baru** (lihat D-02).

| Grup | Item | Ikon (garis; terisi saat aktif) | Lencana |
|---|---|---|---|
| Harian | Beranda | rumah | |
| | Stok | kotak | |
| | Riwayat | jam atau struk | |
| Layanan | Servis | kunci pas | jumlah "Selesai, belum diambil" |
| | Garansi dan Retur | perisai | |
| Keuangan | Tagihan | dompet dengan jam | jumlah telat (merah) |
| | Biaya Operasional | uang | |
| | Laporan | grafik batang | |
| Data | Kontak | orang | |
| | Katalog Produk | label | |
| Footer | Pengaturan | roda gigi | |

Ikon baru (`dompet-jam`, `uang`, `struk`, `orang-dua`) ditambahkan ke `Icons.tsx` sebagai SVG inline. Hari ini Tagihan, Laporan, dan Biaya memakai ikon grafik garis yang sama.

**Sidebar desktop**

- Lebar 248 px, bisa diciutkan ke 72 px (ikon + tooltip). Status ciut disimpan.
- Tombol **Transaksi baru** di atas, lebar penuh, dengan `Kbd N`. Teks rata kiri bersama ikon (saat ini teks di tengah dan ikon "+" terpisah jauh di kiri, serta lencana "N" di kanan).
- Padding horizontal seragam 12 px untuk tombol, label grup, dan item. Saat ini tombol memakai margin 16 px sedangkan item menempel di tepi sehingga tidak sejajar.
- Item aktif: latar `--navy-50` (dark: `--bg-hover`), teks tebal, ikon terisi, **bilah hijau 3 px di dalam item** (bukan menempel di tepi layar), `aria-current="page"`.
- Item punya tinggi 40 px. Label grup 12 px, huruf kapital, `--text-3`.
- Footer: Pengaturan, lalu chip status sinkron/backup ("Backup 01.00, Drive OK") yang bisa diklik menuju Pengaturan > Status Sistem. Warna titik: hijau normal, kuning bila lebih dari 24 jam, merah bila gagal.

**Rail tablet (768 sampai 1023 px)**: lebar 72 px, ikon 24 px dengan label 12 px di bawahnya, tombol Transaksi baru berbentuk ikon "+" bulat di atas.

**Bilah bawah HP** (mengikuti panduan 2 sampai 5 tujuan):

| Slot | Isi |
|---|---|
| 1 | Beranda |
| 2 | Stok |
| 3 | Tombol tengah **Transaksi baru** (bulat 56 px, sedikit terangkat) |
| 4 | Riwayat |
| 5 | **Menu** (membuka Menu Lengkap) |

- Tinggi 64 px + `env(safe-area-inset-bottom)`. Ikon 24 px, label 12 px. Aktif: ikon terisi, teks navy, pil latar lembut.
- Lencana titik merah pada **Menu** bila ada Tagihan telat atau peringatan kritis.
- Usulan ini mengganti Tagihan dan Laporan (saat ini slot 4 dan 5) dengan Riwayat dan Menu karena Riwayat lebih sering dipakai di konter dan Menu memperbaiki F0-04. Lihat D-03 bila Anda lebih suka mempertahankan Tagihan di bilah.

**Menu Lengkap (sheet HP)**: grid 2 kolom berisi ubin setiap halaman selain 4 slot bilah (Servis, Garansi, Tagihan, Biaya, Laporan, Kontak, Katalog, Pengaturan). Setiap ubin: ikon dalam lingkaran berwarna lembut, judul, satu baris deskripsi, lencana. Di bagian bawah sheet: saklar **Tema** (Terang / Gelap / Ikuti sistem) dan saklar **Sembunyikan angka**. Kelas `.menu-tile-*` dan `.menu-nav-tile` sudah dipakai di kode tetapi belum didefinisikan, jadi definisikan sebagai bagian K-06.

### 8.3 Header dan pencarian

| | Desktop | HP |
|---|---|---|
| Kiri | Judul halaman H1 (dan breadcrumb bila sub-halaman) | Judul halaman 20 px (potong dengan elipsis) |
| Tengah | Kolom cari 360 px dengan `Kbd /`, ikon kaca pembesar terlihat | tidak ada |
| Kanan | Tombol privasi (mata; saat aktif terisi dan diberi pil kecil "Angka disembunyikan"), lonceng dengan angka nyata, menu toko (menuju Pengaturan) | Ikon cari (membuka pencarian layar penuh), privasi, lonceng. Masing-masing 44 px |

Ikon di kolom cari saat ini tidak terlihat karena kelas `text-tertiary` tidak ada (F0-06).

### 8.4 Routing dan tombol Back

- Rute hash: `#/beranda`, `#/stok`, `#/riwayat`, `#/servis`, `#/tagihan`, `#/garansi`, `#/laporan`, `#/biaya`, `#/kontak`, `#/katalog`, `#/pengaturan/<bagian>`.
- Tautan dalam: `#/stok?unit=UNT-2610-0007`, `#/riwayat?nota=JUAL-2610-0042`, `#/tagihan?id=TGH-2610-0004`. Dipakai oleh pencarian, peringatan, dan kartu di Beranda untuk **membuka dan menyorot tepat item yang dituju** (memperbaiki F0-14).
- Setiap overlay (modal, sheet, pencarian) menambah satu entri riwayat browser. Tombol Back (termasuk tombol fisik Android) menutup overlay teratas sebelum berpindah halaman.
- Pindah halaman menggulir ke atas. Kembali ke halaman sebelumnya memulihkan posisi scroll dan filter.
- `document.title` mengikuti halaman ("Stok, Epic Phone Purwokerto").
- Tab aktif, filter, dan sort halaman Stok serta Riwayat disimpan di query hash agar tidak hilang saat memuat ulang.

### 8.5 Dashboard Beranda

**Pertanyaan yang harus terjawab dalam 5 detik oleh pemilik toko:**

1. Hari ini untung berapa dibanding kemarin?
2. Apa yang harus saya tangani sekarang?
3. Bagaimana kondisi stok, piutang, dan servis?
4. Saya mau mencatat sesuatu, tombolnya di mana?

**Tata letak desktop (1280 px ke atas)**

```
+--------------------------------------------------------------------------------+
| Beranda                         [ Cari model atau IMEI  / ]    (mata) (lonceng)|
| Minggu, 4 Okt 2026         [Hari ini | 7 hari | Bulan ini]     [+ Transaksi N] |
+--------------------------------------------------------------------------------+
| [Banner draf: "Penjualan Samsung A54 belum selesai"  Lanjutkan | Buang]  (opsional)
+----------------------------------+---------------+---------------+-------------+
| LABA KOTOR HARI INI              | Omzet         | Kas masuk     | Unit terjual|
| Rp 1.150.000   (Display 32)      | Rp 12,45 jt   | Rp 9,95 jt    | 3 unit      |
| naik 12% dari kemarin  ~~~~spark | naik 8%       | turun 3%      | sama        |
+----------------------------------+---------------+---------------+-------------+
| KONDISI TOKO                                                                   |
| Stok ready 38 | Mengendap >30 hari 4 | Piutang Rp 4,2 jt (1 telat) | Servis 2 |
+----------------------------------------------------+---------------------------+
| PERLU PERHATIAN (3)                  Lihat semua   | TREN OMZET 7 HARI         |
| ! Tagihan Budi S. telat 3 hari  Rp 1,2 jt [Tagih WA]|   ||  ||                  |
| ! Servis A54 selesai, belum diambil 2 hr [Hubungi] |   ||  ||  ||  ||  ||  ||   |
| ! 4 unit mengendap >30 hari           [Lihat unit] |  Sen Sel Rab Kam Jum Sab Min|
+----------------------------------------------------+ garis rata-rata + tooltip |
| TRANSAKSI TERAKHIR                   Lihat riwayat +---------------------------+
| Jual - Samsung A54 ...  14.32  Rp 3.335.000  Lunas | AKSI CEPAT (2 x 2)        |
| Jual - iPhone 13 ...    12.10  Rp 7.000.000  Sebag.| Jual | Barang masuk       |
| Beli - 3 unit HP ...    10.45  Rp 8.700.000  Sebag.| Servis | Terima bayar     |
+----------------------------------------------------+---------------------------+
```

**Tata letak HP (390 px)**, urutan atas ke bawah:

1. Banner draf (hanya bila ada).
2. Kartu **Laba kotor hari ini** (lebar penuh, angka 28 px, selisih kemarin, sparkline kecil).
3. Grid 2 x 2 KPI sekunder: Omzet, Kas masuk, Unit terjual, Stok ready.
4. **Perlu perhatian**: 3 item teratas, tombol "Lihat semua".
5. **Aksi cepat**: 4 ubin 2 x 2 (tinggi 72 px).
6. **Tren 7 hari**: batang ringkas, lebar penuh (saat ini berdampingan dengan Aksi Cepat dan terpotong).
7. **Transaksi terakhir**: 5 baris.

Kartu KPI saat ini berjajar vertikal satu per satu di HP sehingga memakan hampir dua layar sebelum konten lain; grid 2 x 2 mengatasinya.

**Definisi metrik**

| Metrik | Rumus | Klik menuju | Mode privasi |
|---|---|---|---|
| Laba kotor hari ini | Total harga jual dikurangi modal unit dan modal bonus untuk transaksi tidak batal hari ini | Laporan > Ringkasan | disamarkan |
| Omzet | Jumlah total tagihan penjualan hari ini | Riwayat, filter Penjualan hari ini | disamarkan |
| Kas masuk | Pembayaran diterima hari ini (termasuk cicilan) | Laporan > Arus Kas | disamarkan |
| Unit terjual | Jumlah unit HP pada transaksi penjualan hari ini | Riwayat, filter Penjualan | tampil |
| Stok ready | Unit berstatus Ready | Stok, chip Ready | tampil |
| Mengendap >30 hari | Unit Ready dengan umur di atas ambang (Pengaturan > Ambang Batas) | Stok, chip ">30 hari" | tampil |
| Piutang | Total sisa tagihan pelanggan, dengan jumlah yang telat | Tagihan, tab Piutang | disamarkan |
| Servis berjalan | Servis berstatus Antri atau Dikerjakan | Servis, filter | tampil |

Selisih: dibandingkan dengan hari yang sama pada periode sebelumnya (kemarin, 7 hari lalu, bulan lalu menurut pemilih periode). Bila data pembanding kosong, tampilkan "belum ada pembanding", bukan 0%.

**Daftar "Perlu perhatian"** (urut: tingkat keparahan, lalu umur; tampilkan 5):

| Pemicu | Tingkat | Tombol aksi |
|---|---|---|
| Tagihan telat 1 hari atau lebih | Kritis | Tagih lewat WA (pesan sudah terisi) |
| Backup gagal atau lebih dari 24 jam | Kritis | Buka Status Sistem |
| Tagihan jatuh tempo dalam 3 hari | Perlu tindakan | Tagih lewat WA |
| Servis selesai belum diambil lebih dari 2 hari | Perlu tindakan | Hubungi pelanggan |
| Unit mengendap lebih dari 30 hari | Perlu tindakan | Lihat unit |
| Aksesoris di bawah ambang stok | Info | Lihat aksesoris |

**Grafik tren 7 hari (SVG inline)**

- Batang bersudut atas membulat 4 px: navy untuk hari lalu, hijau untuk hari ini, garis putus-putus rata-rata.
- Sumbu y dengan 3 garis bantu halus; label "Rp juta" dijelaskan (saat ini "6.1j" tidak jelas artinya).
- Label hari pendek ("Sen 28"). Nilai muncul saat hover atau ketuk, dan permanen untuk hari ini.
- Mode privasi: batang tetap digambar rata dengan pola, angka disembunyikan.
- Keterangan teks untuk pembaca layar: "Omzet 7 hari terakhir: tertinggi Selasa Rp 7,9 jt, terendah Jumat Rp 3,2 jt".

**State**

| State | Tampilan |
|---|---|
| Memuat | Skeleton kartu KPI dan baris, tanpa loncatan tata letak |
| Toko baru, belum ada data | Daftar langkah awal: "Catat barang masuk pertama", "Lengkapi profil toko", "Atur ambang batas", masing-masing dengan tombol |
| Galat memuat | Banner galat dengan "Coba lagi", angka terakhir yang diketahui tetap tampil dengan penanda usang |
| Mode demo | Banner kuning "Anda melihat data contoh. Hubungkan ke Apps Script untuk data toko." |

**Kriteria selesai Beranda**

- Angka laba hari ini terbaca dari jarak lengan di layar 390 px tanpa menggulir.
- Semua KPI bisa diklik dan membawa ke daftar yang sudah terfilter.
- Banner draf hanya muncul bila ada draf nyata.
- Tidak ada elemen yang terpotong di 360, 390, 768, 1024, 1440 px.

### 8.6 Pencarian global (palet perintah)

- Desktop: dialog 560 px di tengah atas. HP: layar penuh dengan kolom cari lengket di atas.
- Dibuka dengan `/` atau ikon cari. Fokus langsung ke kolom cari.
- Hasil dikelompokkan: Unit (nama, IMEI, ID), Aksesoris (nama, SKU), Transaksi (nomor, judul, pihak), Kontak (nama, WA), Pintasan (Stok Ready, Tagihan Telat, Servis Berjalan). Maksimal 5 per grup dengan hitungan total dan tautan "Lihat semua".
- Panah atas bawah memindahkan sorotan, Enter membuka, Esc menutup. Teks yang cocok ditebalkan.
- Memilih hasil memakai tautan dalam (Bagian 8.4) sehingga item benar-benar terbuka.
- Pencarian terakhir disimpan (maksimal 5) dan bisa dihapus satu per satu.
- Penundaan ketik 150 ms. Keadaan kosong: "Tidak ada hasil untuk '...'. Coba IMEI lengkap atau nama pelanggan."
- Perbaikan crash F0-02 menjadi prasyarat.

### 8.7 Pusat Peringatan (lonceng)

- Desktop: popover 380 px menempel di lonceng. HP: bottom sheet.
- Dikelompokkan: **Kritis**, **Perlu tindakan**, **Info**, dengan sumber yang sama dengan daftar di Beranda.
- Setiap item: ikon tingkat, judul singkat, keterangan (siapa, berapa, berapa hari), tombol aksi, tombol "Tunda sampai besok".
- Angka di lonceng = jumlah item Kritis + Perlu tindakan yang belum ditunda.
- Bagian bawah: "Aktivitas terbaru" (20 toast terakhir). Ini memberi jalan kembali bagi pengguna yang melewatkan toast, sesuai saran aksesibilitas toast.

---

## 9. Modal, sheet, dan wizard

Semua memakai `ModalShell` (K-05). Setiap modal di bawah ini hanya menjelaskan isi dan perilaku khususnya.

### 9.1 Transaksi baru (pemilih aksi)

Ini sudah menjadi bagian paling rapi di aplikasi. Pertahankan empat kartu (Penjualan Baru, Barang Masuk, Penerimaan Servis, Terima Cicilan atau Pelunasan).

| Perbaikan | Rincian |
|---|---|
| Pintasan | Tampilkan `Kbd` di tiap kartu (J, B, S, P). Menekan huruf saat pemilih terbuka langsung memilih. |
| Draf | Bila ada draf penjualan nyata, tampil sebagai kartu pertama "Lanjutkan penjualan Samsung A54 (draf 14.20)". |
| Warna ikon | Ikuti peta domain (jual = hijau, masuk = biru, servis = kuning, bayar = ungu) dan pakai token, bukan hex mentah. |
| HP | Bottom sheet. Desktop: dialog `sm` di tengah. |

### 9.2 Jual (wizard 4 langkah)

Struktur 4 langkah dipertahankan (Barang, Pelanggan, Bayar, Periksa) karena sudah jelas. Yang berubah:

**Umum**

- Penunjuk langkah bisa diketuk untuk kembali ke langkah yang sudah dilewati. Langkah yang belum valid tidak bisa dilompati.
- **Bilah ringkasan lengket** di atas footer pada semua langkah: nama unit, jumlah item, **Total**. Pengguna selalu tahu angka akhir.
- Tombol **Lanjut** nonaktif disertai teks alasan ("Pilih unit dulu"). Saat ini hanya langkah 1 yang divalidasi, langkah 2 dan 3 bisa dilewati kosong.
- **Draf otomatis** disimpan ke `localStorage` pada setiap perubahan langkah. Menutup modal bertanya "Simpan sebagai draf atau buang?". Inilah yang membuat banner "Lanjutkan penjualan" di Beranda jujur (F0-12).
- Emoji di teks UI (misalnya kotak hadiah di bagian bonus) diganti ikon.
- Semua `label` dihubungkan ke input (`htmlFor`/`id`), dan 81 inline style diganti kelas komponen.

**Langkah 1 Barang**

- Pilihan unit berupa `Combobox` dengan pencarian nama, ID, atau IMEI (dan tombol pindai IMEI bila kamera tersedia), bukan `<select>` bawaan yang memuat seluruh stok.
- Kartu unit terpilih menampilkan foto kecil, nama, IMEI, grade, dan harga.
- Aksesoris: kartu dengan `Stepper` jumlah (tambah dan kurang) yang jelas, bukan deretan tombol "+ Tempered Glass (Rp 25.000)" tanpa pengatur jumlah yang terlihat. Tampilkan stok tersisa dan nonaktifkan bila habis.
- Bonus: daftar centang dengan nama yang sama dengan yang akan tercetak di nota. Saat ini nama di layar ("Tempered Glass Layar Kaca (Gratis Pasang)") berbeda dari nama di nota ("Tempered Glass Layar Kaca Presisi").

**Langkah 2 Pelanggan dan tukar tambah**

- Nama pelanggan dengan saran dari Kontak. Memilih kontak mengisi WA otomatis.
- `PhoneInput` untuk WhatsApp (`inputMode="tel"`, normalisasi 08xx menjadi 628xx, validasi panjang).
- Tukar tambah di bagian yang bisa dilipat, dengan IMEI 15 digit tervalidasi.

**Langkah 3 Harga dan pembayaran**

- Rincian bertingkat: Subtotal, Diskon, Tukar tambah, **Total tagihan** (angka besar).
- Metode bayar sebagai `RadioCards` besar (Tunai, Transfer, QRIS, Cicilan), bukan dropdown.
- "Nominal diterima" dengan chip cepat (Pas, 50 rb, 100 rb, 200 rb, 500 rb) yang sudah ada, dipertahankan. **Kembalian** tampil besar saat nominal melebihi total. **Sisa** tampil sebagai peringatan bila nominal kurang.
- Bila ada sisa (tempo atau cicilan): **nama dan WA pelanggan wajib** dan tanggal jatuh tempo wajib, dengan pesan jelas. Dari kode yang dibaca tidak ada validasi yang mencegah piutang atas "Pelanggan Umum" tanpa kontak, sehingga tidak bisa ditagih ([K], perlu diuji).

**Langkah 4 Periksa**

- Tampilan menyerupai nota (daftar item, bonus, total, pembayaran, jatuh tempo, garansi). Garansi dihitung dari Pengaturan, bukan teks tetap.
- Saklar "Kirim nota ke WA" dan "Cetak nota".
- Tombol utama: **Terbitkan nota**, dengan status loading selama menunggu backend.

**Layar sukses (baru)**

Saat ini modal langsung menutup dan hanya memunculkan toast. Ganti dengan layar sukses di dalam modal: tanda centang, nomor nota, total, status (Lunas atau Tempo), dan empat tombol: **Cetak**, **Kirim WA**, **Penjualan baru**, **Selesai**.

### 9.3 Barang Masuk

Form harian paling sering dipakai, dan paling padat. Tujuan: input beruntun tercepat dengan kesalahan terkecil.

**Susunan (dikelompokkan dengan sub-judul, bukan satu daftar panjang)**

1. **Identitas**: Model dan varian (`Combobox` dengan saran dari Katalog Produk; ini sekaligus memberi Katalog fungsi nyata), IMEI 1, IMEI 2 opsional.
2. **Kondisi**: `Segmented` Baru atau Bekas. Bila Bekas: `Segmented` Grade A, B, C dengan keterangan singkat di bawah tiap pilihan, baterai (angka dengan satuan %), bebas kunci akun, kelengkapan.
3. **Harga**: `MoneyInput` Harga beli (**tanpa nilai bawaan** `2500000`; kolom ini saat ini sudah terisi sehingga mudah tersimpan salah), Biaya lain, dan **Harga jual target** yang terlihat dan bisa diedit. Tampilkan saran dan margin langsung ("Disarankan Rp 3.450.000, margin 15%"). Saat ini hargaJualTarget diam-diam dihitung 1,15 kali harga beli dan pengguna tidak tahu.
4. **Foto**: grid 3 x 2 enam slot (Depan, Belakang, Layar menyala, IMEI, Cacat, Dus). Kamera langsung (`capture="environment"`). Penghitung "2 dari 3 wajib terisi" dan **penegakan sungguhan**: tombol simpan nonaktif bila foto wajib belum ada. Saat ini label "*Wajib" tidak ditegakkan.
5. **Servis sebelum dijual** (opsional, bisa dilipat): keluhan, estimasi biaya.

**Validasi dan umpan balik**

| Aturan | Perilaku |
|---|---|
| IMEI | Hanya angka, hitungan hidup "12/15", pemeriksaan Luhn dan **deteksi duplikat terhadap stok** dengan pesan "IMEI ini sudah ada: Samsung A54 (Ready)" dan tautan ke unitnya. Hapus `alert()`. |
| Tombol simpan nonaktif | Teks di bawah tombol menyebut yang kurang: "Lengkapi: IMEI 15 digit, foto depan". |
| Simpan | Dua tombol: **Simpan** (tutup) dan **Simpan dan tambah lagi** (mempertahankan model, kondisi, dan harga; mengosongkan IMEI dan foto, serta mengembalikan fokus ke IMEI). Ini mengganti kotak centang "simpan cepat lagi", dan menjaga D007. |
| Umpan balik sukses | (1) Strip hijau di dalam modal: "Tersimpan: Samsung S23 (IMEI ...9012). Siap input unit berikutnya." (2) Toast di lapisan atas (F0-05). Penghitung "Sesi ini: 3 unit dicatat". |
| Tutup dengan isian | Bila form berubah dan belum disimpan, tanya "Buang isian?". Setelah ditutup normal, state selalu bersih (F0-19). |
| HP | Tombol simpan lengket di bawah, bayangan lembut di atas footer saat konten bisa digulir, input numerik memunculkan keypad angka. |

### 9.4 Detail unit

Satu komponen `UnitDetail` dipakai di tiga tempat: panel terdok di Stok (layar lebar), drawer (desktop sempit dan tablet), dan sheet (HP). Isi, dari atas:

1. Galeri foto (rasio tetap, penghitung "1/6", ketuk untuk layar penuh, placeholder bila gagal).
2. Nama, spesifikasi, ID, `StatusPill`.
3. **Harga jual target** (besar), Modal, dan **Estimasi laba** (disamarkan dalam mode privasi).
4. Ciri: Kondisi, Grade, Baterai (batang kecil), IMEI (mono, dengan tombol salin), Kelengkapan, Bebas kunci akun.
5. **Riwayat unit** (Timeline): masuk dari siapa, servis, dipesan, terjual.
6. Aksi: **Jual sekarang** (utama), Kirim ke servis, Ubah foto, Salin info untuk WA, Cetak label. Aksi yang tidak berlaku untuk status saat ini disembunyikan, bukan dibiarkan nonaktif (misalnya Jual disembunyikan bila unit sedang Servis, dengan keterangan "Unit sedang diservis, selesaikan dulu").
7. Di HP, tombol "Jual sekarang" lengket di footer sheet.

### 9.5 Foto unit (penampil dan pengelola)

- Penampil layar penuh: gesek untuk berganti foto, cubit untuk memperbesar, panah di desktop (`←` `→`), tombol Esc menutup.
- Deretan miniatur dengan label posisi dan penanda "wajib".
- Menambah atau mengganti memakai kamera. Menghapus foto: **konfirmasi ringan atau Urungkan** (toast dengan "Urungkan" yang juga tersedia dengan mengembalikan dari miniatur).
- Kelas `.gallery-*`, `.foto-tile-*`, `.photo-viewer-box`, `.unit-gallery-box` yang belum didefinisikan harus dibuat sebagai bagian `FotoUnit`.

### 9.6 Detail tagihan

- Kepala: nama kontak (tombol WA langsung), ID tagihan, referensi nota (tautan dalam), `StatusPill` (Telat n hari berwarna bahaya).
- Ringkasan: Total, Sudah dibayar, **Sisa** (besar), batang progres.
- Riwayat pembayaran (Timeline) dengan tanggal, metode, nominal.
- Form **Catat pembayaran**: `MoneyInput` dengan chip "Lunasi" dan "50%", metode, tanggal (bawaan hari ini), catatan. Tombol utama **Simpan pembayaran** dengan loading. Setelah sukses: sisa dan progres diperbarui di tempat, toast "Pembayaran Rp 500.000 dicatat. Sisa Rp 700.000.", dan opsi "Kirim bukti ke WA".
- Aksi sekunder: **Tagih lewat WA** (pesan sudah terisi: nama, sisa, jatuh tempo, nomor rekening dari Pengaturan).
- Perbaiki `--status-danger-solid` yang tidak ada (F0-07) dan ketidakcocokan props `onSimpanBayar` (F0-09).

### 9.7 Nota

- Pratinjau seperti kertas di atas latar abu, dengan pilihan lebar **58 mm**, **80 mm**, dan **A5**.
- Data nyata (F0-11): nomor dari backend, tanggal dan jam WIB dari sistem, item sesuai transaksi, bonus, pembayaran, jatuh tempo, garansi dari Pengaturan, syarat garansi dari Pengaturan > Garansi dan Nota.
- Aksi: **Cetak**, **Kirim WA** (teks nota atau tautan), **Salin**, **Unduh PDF** (bila F0-15 selesai). Tombol tutup di bawah.
- `print.css`: hanya area nota yang tercetak, tanpa sidebar, header, atau overlay; margin dan ukuran kertas sesuai pilihan. Uji cetak pada printer termal toko.
- Hapus 18 inline style, definisikan `.modal-nota-box` dan `.nota-terms`.

### 9.8 Batalkan transaksi

Karena transaksi tidak pernah dihapus, ini adalah satu-satunya jalan "menghapus".

- `ConfirmDialog` tingkat tertinggi: judul "Batalkan JUAL-2610-0042?".
- Menampilkan **dampak** secara konkret: "Unit Samsung A54 kembali berstatus Ready. Piutang Rp 1.200.000 ikut dibatalkan. Kas masuk Rp 300.000 dikoreksi."
- **Alasan wajib**: pilihan cepat (Salah input, Pelanggan batal, Retur, Lainnya) + kolom teks bila Lainnya.
- Tombol: **Kembali** (fokus awal, sekunder) dan **Batalkan transaksi** (bahaya). Tidak ada tombol yang bisa ditekan tidak sengaja dua kali (loading + nonaktif).
- Setelah sukses: baris di Riwayat menjadi "Batal" (teks dicoret, abu-abu) dan **stok serta tagihan benar-benar diperbarui**. Saat ini `onSuksesBatal` hanya menampilkan toast.
- Dicatat di Log Aktivitas (siapa, kapan, alasan).

### 9.9 Dialog di dalam layar

Dialog yang kini ditulis langsung di masing-masing layar, semuanya dipindah ke `ModalShell` dan komponen Form:

| Dialog | Perbaikan khusus |
|---|---|
| Servis baru | Pilih sumber (Unit stok toko atau Unit pelanggan), unit lewat `Combobox`, keluhan dengan chip cepat (Layar, Baterai, Port charger, Mati total, Lainnya), teknisi, estimasi biaya (`MoneyInput`), perkiraan selesai. |
| Klaim atau retur garansi | Jenis (Servis garansi, Tukar unit, Retur uang) sebagai `RadioCards`, alasan dengan chip cepat, foto bukti opsional, keputusan dan biaya yang ditanggung toko. |
| Tambah kontak | Tipe (Pelanggan atau Supplier) sebagai `Segmented`, WA dengan `PhoneInput` dan **deteksi duplikat nomor**, alamat opsional. |
| Tambah katalog | Jenis, platform OS, merek, model, dan **dipakai sebagai saran di Barang Masuk**. |
| Tambah biaya | Kategori sebagai chip (Listrik, Gaji, Sewa, Internet, Lainnya), `MoneyInput`, tanggal bawaan hari ini, keterangan. |
| Kunci bulan | `ConfirmDialog` tingkat tinggi dengan konfirmasi ketik atau kotak "Saya mengerti" (Bagian 11.3) dan daftar tepat apa yang terkunci. |
| Filter Stok | Sheet filter dengan platform, grade, kondisi, rentang harga, rentang umur. Tombol "Terapkan (12 hasil)" menampilkan jumlah hasil sebelum diterapkan, dan "Atur ulang". |

### 9.10 Kode mati yang perlu diputuskan

| Komponen | Kondisi | Rekomendasi |
|---|---|---|
| `BayarModal`, `GaransiModal`, `ServisModal` | Tidak pernah dirender di mana pun [R]. Fungsinya sudah ditulis ulang di dalam layar masing-masing. | Hapus, atau pakai sebagai dasar dialog pada Bagian 9.9 (D-04). |
| `MenuLengkapModal` | Dirender tetapi tidak pernah dibuka | Hidupkan (Bagian 8.2) |
| `Galeri` | Dirender tetapi tidak ada pemicu | Jadikan galeri komponen mode pengembangan |
| Foto unit di tabel dan panel Stok | `<img>` tanpa `onError` | `FotoUnit` (K-16) |

---

## 10. Halaman satu per satu

Setiap halaman: kondisi sekarang, rancangan, perilaku, state, dan kriteria selesai.

### 10.1 Stok

**Kondisi sekarang [S] [R]**: toolbar rusak (kolom cari mengecil jadi kotak 72 px sementara dropdown sort melebar). Panel detail 440 px lepas dari tata letak dan terpotong di 1440 px karena kelas `w-[440px]` tidak ada. Tabel 9 kolom sempit sehingga nama HP membungkus sampai 4 baris dan baris menjadi sangat tinggi. Dua belas tombol ikon 22 x 22 px. Gambar rusak tanpa cadangan. Tombol "Mode Nyaman" tidak jelas artinya. Unit pertama otomatis terpilih di panel padahal pengguna belum memilih apa pun. Header, tab, toolbar, dan chip bertumpuk sebelum konten pertama muncul.

**Rancangan**

- `PageHeader`: "Stok", subjudul "8 HP, 4 aksesoris", aksi utama **Barang masuk**.
- `Segmented` HP / Aksesoris (dengan hitungan).
- `Toolbar` satu baris: Cari (mengisi sisa lebar) | Filter (lencana jumlah) | Urutkan (dropdown ringkas) | Kepadatan (ikon, dengan tooltip "Tampilan rapat atau nyaman").
- Baris chip cepat dengan hitungan: `Semua 8`, `Ready 5`, `Servis 1`, `Dipesan 1`, `Baru`, `Bekas`, `Mengendap >30 hari 2`. Filter yang aktif muncul sebagai chip yang bisa dihapus + "Hapus semua".
- **Tabel desktop** (kolom dan prioritas):

| Kolom | Isi | Hilang di bawah |
|---|---|---|
| Foto | 48 px dengan `FotoUnit` | tidak hilang |
| Unit | Nama (maksimal 2 baris, potong dengan elipsis dan tooltip), baris kedua: spesifikasi dan ID dalam `Caption` | tidak hilang |
| Kondisi | Chip Baru atau Bekas + Grade | 1024 px |
| Baterai | Angka + batang mini (merah di bawah 80%) | 1280 px |
| IMEI | 6 digit terakhir mono, tombol salin saat hover | 1280 px |
| Modal | rata kanan, disamarkan dalam mode privasi | 1280 px |
| Harga jual | rata kanan, tebal | tidak hilang |
| Status | `StatusPill` | tidak hilang |
| Umur | "5 hr", merah bila di atas ambang | tidak hilang |
| Aksi | Muncul saat hover atau baris terpilih: **Jual**, Detail, menu titik tiga | |

- Layar 1440 px ke atas: **master-detail**, daftar di kiri, `UnitDetail` terdok 400 px di kanan, tinggi lengket. Di bawah 1440 px, klik baris membuka drawer. **Panel tidak otomatis memilih unit pertama**; saat belum ada pilihan, panel menampilkan petunjuk "Pilih unit untuk melihat detail".
- **HP**: setiap unit menjadi kartu: foto 64 px, nama (2 baris), baris spesifikasi, harga tebal, `StatusPill` kanan atas, umur. Ketuk kartu membuka sheet `UnitDetail`. Tidak ada tabel di HP.
- Filter lanjutan: sheet (Bagian 9.9).
- Keyboard: `/` fokus cari, panah atas bawah memilih baris, Enter membuka detail, `J` menjual unit terpilih.
- Pilih banyak (P3, opsional): kotak centang per baris untuk cetak label dan ubah harga massal.

**State**: memuat (6 baris skeleton), kosong total ("Belum ada stok. Catat barang masuk pertama." + tombol), kosong karena filter ("Tidak ada unit untuk 'xyz'." + Hapus filter), galat (Coba lagi), gambar gagal (placeholder).

**Kriteria selesai**: tidak ada kelas bergaya Tailwind, tidak ada teks terpotong di 360 sampai 1920 px, baris tabel setinggi maksimal 56 px, semua target 24 px ke atas, `Jual` bisa dicapai dalam dua klik dari daftar.

### 10.2 Riwayat

**Kondisi sekarang [S]**: tidak ada judul terlihat (F0-01), "Ekspor CSV" berdiri sendiri di kiri atas, dua baris filter tanpa hierarki, servis "Selesai" berwarna kuning, tidak ada pengelompokan tanggal, `onBukaNota` membangun nota palsu (F0-11), klik dari pencarian tidak membuka transaksinya.

**Rancangan**

- `PageHeader`: "Riwayat", aksi sekunder **Ekspor CSV** di kanan.
- `Toolbar`: Cari (nomor nota, pelanggan, barang) | `Segmented` jenis (Semua, Penjualan, Barang masuk, Servis, Bayar) | Periode (Hari ini, 7 hari, Bulan ini, Rentang...) sebagai satu dropdown.
- **Ringkasan strip** untuk filter yang aktif: "5 transaksi, masuk Rp 11,5 jt, keluar Rp 8,7 jt".
- **Dikelompokkan per hari** dengan judul lengket ("Hari ini", "Kemarin", "Sen, 28 Sep") yang memuat subtotal harian.
- Baris: lingkaran ikon berwarna per jenis, judul (jenis, barang), baris kedua (nomor, jam, pihak), nominal rata kanan dengan tanda (+ untuk uang masuk hijau-gelap, minus untuk keluar netral), `StatusPill` sesuai peta (Bagian 6.4).
- Klik baris membuka drawer rincian transaksi: ringkasan, item, pembayaran, **Nota** (pratinjau), tombol **Cetak**, **Kirim WA**, dan **Batalkan** (bahaya, sekunder, di bagian bawah).
- "Muat lebih lanjut" per 50 baris. Tautan dalam `#/riwayat?nota=...` menyorot dan membuka baris.
- Filter dari Laporan dan Beranda (`onBukaRiwayatFilter(kategori)`) benar-benar menerapkan kategori (F0-14).

**State**: memuat, kosong ("Belum ada transaksi pada periode ini." + ganti periode), galat.

### 10.3 Servis

**Kondisi sekarang [S]**: kartu menempel tanpa jarak, label tombol "+ + Servis Baru", dua baris chip, semua teks berbobot tebal sehingga tidak ada hierarki, "Keluhan" menjorok aneh.

**Rancangan**

- `PageHeader`: "Servis", subjudul "2 berjalan, 1 selesai belum diambil", aksi utama **Servis baru**.
- Tampilan **papan** di desktop dengan 4 kolom (Antri, Dikerjakan, Selesai, Diambil), bisa dialihkan ke daftar dengan `Segmented`. HP: daftar yang dikelompokkan per status dengan chip status di atas (hitungan).
- Filter sumber (Semua, Unit stok toko, Unit pelanggan) sebagai dropdown di toolbar, bukan baris chip kedua.
- Kartu servis: ID kecil (mono), nama HP (H3), lencana sumber, keluhan (2 baris, teks biasa), inisial teknisi dalam avatar, estimasi biaya kanan, umur ("2 hari"), dan peringatan bila lewat perkiraan.
- **Tombol aksi kontekstual pada kartu** sebagai satu-satunya langkah berikutnya: Antri maka "Mulai kerjakan", Dikerjakan maka "Tandai selesai" (meminta biaya akhir dan catatan), Selesai maka "Serahkan ke pelanggan" (untuk unit pelanggan, menawarkan pencatatan pembayaran).
- Klik kartu membuka drawer rincian: Timeline status, biaya komponen, foto kondisi, catatan teknisi.
- Unit stok toko yang selesai diservis otomatis kembali **Ready** dan HPP bertambah biaya servis (perilaku ini sudah ada di `app.tsx`; pastikan props benar, F0-09).

**State**: kosong ("Tidak ada servis berjalan."), memuat, galat.

### 10.4 Tagihan

**Kondisi sekarang [S]**: struktur sudah baik (3 KPI, aging bar, dua tab, tabel). Kekurangan: legenda aging bar tanpa swatch warna, label huruf kapital semua yang panjang, ikon sidebar sama dengan Laporan, tabel tidak menjadi kartu di HP, tidak ada aksi di baris.

**Rancangan**

- KPI: **Total piutang** (utama, lebih besar), Total hutang supplier, Telat tempo (merah bila lebih dari 0, bisa diklik untuk memfilter).
- **Aging bar** menjadi batang bertingkat dengan swatch warna di legenda dan nilai rupiah: Belum jatuh tempo (info), Telat 1 sampai 7 hari (warn), Telat 8 sampai 30 hari (bad terang), Telat di atas 30 hari (bad gelap). Tiap segmen bisa diklik untuk memfilter tabel.
- Tab **Piutang pelanggan** dan **Hutang supplier** dengan hitungan. Chip: Semua, Telat, Minggu ini, Lunas.
- **Urutan bawaan: paling telat dulu.**
- Baris telat diberi garis kiri merah 3 px dan `StatusPill` "Telat 3 hari".
- Aksi baris (saat hover, selalu terlihat di HP): **Tagih WA** dan **Catat bayar**. Klik baris membuka Detail tagihan (Bagian 9.6).
- HP: tabel menjadi kartu (kontak, sisa besar, progres, jatuh tempo, dua tombol).

### 10.5 Garansi dan Retur

**Kondisi sekarang [S]**: halaman menampilkan hasil contoh ("Garansi Toko Aktif sampai 12 Okt 2026") **sebelum pengguna mencari apa pun**, sehingga tampak seperti data pelanggan sungguhan. Teks di kartu hasil berbobot tebal berantai.

**Rancangan**

- **Pencarian dulu**: kolom besar "Nomor nota atau IMEI 15 digit", tombol pindai, dan Periksa garansi. Sebelum mencari: `EmptyState` ("Masukkan IMEI atau nomor nota untuk memeriksa garansi") dan tautan ke klaim terbaru.
- Hasil berupa kartu status berwarna sesuai peta: **Berlaku** (hijau, "Sisa 7 hari" dengan indikator melingkar), **Segera habis** (kuning), **Habis** (merah, dengan tanggal habis), atau **Tidak ditemukan** (netral, dengan saran).
- Kartu menampilkan unit, IMEI (mono), nota (tautan dalam), pembeli (tombol WA), tanggal beli, syarat singkat dari Pengaturan, dan tombol **Buat klaim atau retur**.
- Daftar klaim: kartu dengan ID, unit, jenis, tanggal, alasan, `StatusPill`, dan Timeline singkat. Filter status. Klik membuka rincian.

### 10.6 Laporan

**Kondisi sekarang [S]**: hero laba bersih navy sudah baik. Masalah: rincian komponen laba memakai kelas yang tidak ada sehingga baris tidak rata (label dan angka menempel), judul dan lencana "Audit sesuai" berhimpitan, kotak centang "Bandingkan dengan bulan lalu" menempel ke teks, 35 elemen teks di bawah 12 px, ikon ⓘ kecil tidak bisa diketuk, "Unduh PDF" dan "Salin tautan" palsu (F0-15), `Kunci Bulan` tanpa penjelasan dampak.

**Rancangan**

- `PageHeader`: "Laporan", status periode ("Periode terbuka" atau "Dikunci 3 Okt oleh ..."), aksi **Unduh PDF** (sekunder) dan **Kunci bulan** (sekunder, bukan utama).
- Filter: `Segmented` periode (Hari ini, 7 hari, Bulan ini, Bulan lalu, Rentang) dan `Switch` "Bandingkan dengan periode lalu" sejajar.
- `Tabs`: Ringkasan, Arus Kas, Stok, Tagihan, Pratinjau PDF.
- **Ringkasan**: hero laba bersih (dipertahankan, dengan selisih periode lalu dan margin), baris 4 KPI, **grafik 12 bulan** (batang), **komposisi laba** (donut atau batang bertingkat dengan legenda), lalu **Rincian komponen laba** sebagai tabel dua kolom: label rata kiri dengan keterangan ⓘ (popover yang bisa diketuk) dan angka rata kanan `tabular-nums`, dengan tanda + atau minus, sub-total tebal, dan baris **Laba bersih** disorot. Garis penuntun titik-titik antara label dan angka.
- Setiap baris rincian bisa diklik menuju transaksi yang menyusunnya (Riwayat terfilter).
- **Kunci bulan**: `ConfirmDialog` yang menjelaskan "Setelah dikunci, transaksi bulan Oktober tidak bisa dibatalkan atau diubah. Pembatalan harus lewat koreksi bulan berjalan." Daftar prasyarat: tagihan telat tinjau, backup terakhir, cek konsistensi lulus. Konfirmasi dengan kotak "Saya mengerti". Setelah dikunci: spanduk dan tombol "Buka kunci" khusus pemilik (dicatat di Log Aktivitas).
- **Pratinjau PDF**: halaman A4 nyata yang bisa dicetak atau disimpan. Unduh benar-benar menghasilkan berkas.
- Tidak ada teks di bawah 12 px.

### 10.7 Kontak

**Rancangan**

- `PageHeader`: "Kontak", subjudul hitungan, aksi utama **Kontak baru**.
- `Toolbar`: Cari (nama, WA, alamat) + `Segmented` Semua, Pelanggan, Supplier.
- Daftar kartu dengan avatar inisial berwarna konsisten, nama, tipe (pill), nomor WA, **saldo piutang atau hutang** bila ada (pill merah bila telat), tombol WA langsung (`wa.me` dengan nomor ternormalisasi) dan tombol salin nomor.
- Detail (drawer): data kontak, ringkasan (jumlah transaksi, total belanja, piutang), **riwayat transaksi** (menuju Riwayat terfilter), tombol Tagih, Edit.
- **Data tersimpan** (F0-10): kontak baru tidak lagi hilang saat pindah tab.
- Form: lihat Bagian 9.9, dengan deteksi duplikat nomor.

### 10.8 Katalog Produk

**Rancangan**

- Fungsi nyata: katalog menjadi **sumber saran model** di Barang Masuk (Bagian 9.3) dan sumber harga acuan.
- Tampilan: tabel (desktop) atau kartu (HP) dikelompokkan per merek, kolom: model, platform OS, harga acuan beli dan jual, jumlah stok saat ini.
- Chip filter Platform OS (Android, iOS) dan Jenis (HP, Aksesoris). Cari per merek atau model.
- Dari baris katalog: tombol "Catat barang masuk model ini" membuka Barang Masuk dengan model terisi.

### 10.9 Biaya Operasional

**Rancangan**

- Ringkasan atas: **Total bulan ini** (besar), perbandingan bulan lalu, dan batang kategori (Listrik, Gaji, Sewa, Internet, Lainnya).
- Daftar dikelompokkan per tanggal: ikon kategori, keterangan, nominal rata kanan, tombol menu (Edit, Batalkan). Bukan "Hapus": prinsip transaksi tidak dihapus berlaku juga di sini.
- Form tambah cepat: kategori sebagai chip, `MoneyInput`, tanggal bawaan hari ini. Simpan lalu toast dengan **Urungkan**.
- Biaya yang dibuat tetap ada setelah pindah tab (F0-10).
- Hapus kelas yang tak ada (`bg-navy-900`, `text-danger-solid`, `text-green-accent`, `text-white/70`).

### 10.10 Pengaturan

**Kondisi sekarang [S]**: sepuluh pill tab dalam satu baris yang terpotong di kanan ("Tentang" setengah terlihat), karena scrollbar disembunyikan global dan tidak ada petunjuk. Form label tebal dan rapat, tombol simpan selalu di bawah.

**Rancangan**

- **Navigasi dua panel**: desktop, daftar bagian di kiri (lebar 240 px) dan isi di kanan; HP, daftar yang ketuk-masuk dengan tombol kembali (pola pengaturan iOS dan Android).
- Pengelompokan:

| Grup | Bagian |
|---|---|
| Toko | Profil Toko, Garansi dan Nota, Paket Bonus, Ambang Batas |
| Tampilan | Tema (Terang, Gelap, Ikuti sistem), Kepadatan tabel, Sembunyikan angka secara bawaan |
| Data | Backup dan Pulihkan, Cek Konsistensi, Log Aktivitas |
| Sistem | Status Sistem, Tentang |

- **Bilah simpan lengket** yang muncul hanya saat ada perubahan: "Ada perubahan yang belum disimpan | Batal | Simpan". Pindah bagian dengan perubahan bertanya "Buang?".
- Validasi inline per kolom (WA, format Instagram, angka ambang), teks bantu di bawah kolom.
- Tema, kepadatan, dan privasi **benar-benar tersimpan** (F0-25).
- Tindakan berbahaya (Pulihkan backup) memakai `ConfirmDialog` dengan konfirmasi ketik "PULIHKAN" dan menampilkan tanggal backup yang akan dipulihkan.
- Status Sistem: kartu status per layanan (Penyimpanan, Backup, Sinkron) dengan titik warna, waktu terakhir, dan tombol "Jalankan sekarang".

---

## 11. Umpan balik sistem: toast, banner, konfirmasi, validasi, loading

### 11.1 Toast

Tujuan: setiap aksi punya umpan balik yang **terlihat, tidak menutupi pekerjaan, dan tidak hilang sebelum sempat dibaca**.

| Aspek | Aturan |
|---|---|
| Posisi | HP: bawah layar, **di atas bilah navigasi** dan safe-area (jangkauan satu tangan, tidak menutupi header). Desktop: kanan atas di bawah header. Posisi konsisten per breakpoint. |
| Lapisan | `z-index: 200`, di atas semua modal (F0-05). |
| Antrean | Maksimal 3 tampil bersamaan, yang tertua keluar bila ada kelima. Pesan identik berurutan digabung menjadi satu ("Unit dicatat (3x)"). Setiap toast punya timer sendiri yang dibersihkan saat ditutup atau di-unmount (F0-21). |
| Varian | Sukses (ikon centang), Info (ikon i), Peringatan (segitiga), Galat (silang). Ikon wajib. Warna dari pasangan `*-bg` dan `*-fg`. |
| Isi | Judul satu baris (wajib) + keterangan satu baris (opsional). Maksimal 2 baris. Kalimat aktif dan konkret: "Pembayaran Rp 500.000 dicatat. Sisa Rp 700.000." |
| Durasi | Sukses dan Info 5 detik. Peringatan 8 detik. Galat tidak hilang otomatis sampai ditutup. Timer berhenti saat di-hover, saat fokus berada di dalam toast, dan saat tab tidak aktif. |
| Aksi | Maksimal satu aksi teks ("Urungkan", "Lihat", "Coba lagi"). Aksi **harus tersedia juga di tempat lain** (Urungkan juga ada di riwayat atau Log Aktivitas), karena toast bisa hilang. |
| Kapan tidak dipakai | Kesalahan yang menuntut keputusan atau tindakan segera (gagal simpan penjualan) memakai banner atau dialog, bukan toast. |
| Aksesibilitas | Container `role="status"` dengan `aria-live="polite"` dan `aria-atomic="true"`. Galat kritis memakai `assertive` dan hanya yang benar-benar mengganggu. Tombol tutup 44 px dengan `aria-label="Tutup notifikasi"`. Toast tidak menerima fokus otomatis. Aksi di dalam toast diberi label yang jelas. |
| Gerak | Masuk 200 ms. Tanpa gerak bila `prefers-reduced-motion`. HP: gesek ke samping untuk menutup. |
| Riwayat | 20 toast terakhir tersimpan dan terlihat di Pusat Peringatan bagian "Aktivitas terbaru". |

Contoh teks baku:

| Peristiwa | Teks |
|---|---|
| Penjualan tersimpan | "Penjualan JUAL-2610-0042 tersimpan. Total Rp 3.335.000, lunas." |
| Barang masuk | "Samsung S23 dicatat (IMEI ...9012)." |
| Pembayaran | "Pembayaran Rp 500.000 dicatat. Sisa Rp 700.000." |
| Foto dihapus | "Foto Tampak Belakang dihapus." dengan aksi "Urungkan" |
| Gagal | "Penjualan belum tersimpan. Periksa koneksi lalu coba lagi." dengan aksi "Coba lagi" |

### 11.2 Banner (pesan yang menetap di halaman)

| Banner | Kondisi | Isi |
|---|---|---|
| Mode demo | Tidak ada `window.google` (mock) | "Anda melihat data contoh. Perubahan tidak disimpan ke toko." Tidak bisa ditutup. |
| Offline atau gagal sinkron | Permintaan gagal atau jaringan putus | "Tidak tersambung. Perubahan terakhir belum tersimpan." dengan "Coba lagi". |
| Periode terkunci | Bulan sudah dikunci | "Oktober 2026 dikunci. Perubahan lewat koreksi bulan berjalan." |
| Draf | Ada draf penjualan | "Penjualan Samsung A54 belum selesai." dengan **Lanjutkan** dan **Buang**. |
| Backup | Backup tertua di atas 24 jam | "Backup terakhir kemarin 01.00." dengan "Lihat status". |

### 11.3 Konfirmasi: tiga tingkat

| Tingkat | Dipakai untuk | Pola |
|---|---|---|
| 1. Tanpa konfirmasi, ada Urungkan | Tindakan yang bisa dibatalkan murah: hapus foto, hapus filter tersimpan, tutup banner | Langsung jalan, toast dengan "Urungkan" |
| 2. Konfirmasi ringan | Buang isian form, batalkan servis, keluar tanpa menyimpan | `ConfirmDialog` dua tombol, fokus awal pada pilihan aman |
| 3. Konfirmasi berat | Batalkan transaksi, kunci bulan, pulihkan backup | Dampak dijelaskan konkret, alasan wajib atau konfirmasi ketik/kotak "Saya mengerti", tombol bahaya dengan teks aksi ("Batalkan transaksi", bukan "Ya") |

Aturan umum: tombol bahaya tidak berdekatan dengan tombol utama biasa tanpa jarak, urutan tombol tetap (aman di kiri, aksi di kanan; HP: aksi di atas, aman di bawah), dan teks tombol selalu kata kerja.

### 11.4 Validasi form

- Validasi saat meninggalkan kolom (blur) dan saat submit. Tidak ada `alert()`.
- Galat tampil di bawah kolom dengan ikon + teks (warna `--bad-fg`), kolom diberi garis `--bad-solid`, `aria-invalid="true"`, `aria-describedby` menunjuk pesan.
- Saat submit gagal, **fokus pindah ke kolom bermasalah pertama** dan, bila lebih dari dua, ringkasan di atas form.
- Pesan membantu, bukan menyalahkan: "IMEI harus 15 angka (kurang 3)" bukan "Input salah".
- Format mengikuti jenis: uang dengan pemisah ribuan, telepon dinormalisasi, IMEI hanya angka.
- Tombol submit tidak dinonaktifkan diam-diam. Bila nonaktif, teks di dekatnya menyebut penyebabnya.

### 11.5 Loading dan UI optimistis

Backend Apps Script lambat dan tidak seragam, jadi:

- Tombol aksi memiliki status **loading** (spinner, klik diblokir) untuk mencegah kirim ganda.
- Daftar memakai **skeleton**, bukan layar kosong atau teks "Memuat".
- Aksi cepat dan reversibel (ubah status servis, tandai selesai) memakai **UI optimistis dengan rollback**: tampilan berubah dulu, bila server menolak kembali ke semula dengan toast galat.
- Aksi uang (simpan penjualan, catat pembayaran) **tidak optimistis**: tampilan menunggu konfirmasi server supaya angka tidak pernah salah.
- Operasi lebih dari 3 detik menampilkan keterangan ("Mengunggah 4 foto...") dengan penghitung.

### 11.6 Empty state dan error state per halaman

| Halaman | Kosong total | Kosong karena filter | Galat |
|---|---|---|---|
| Beranda | Daftar langkah awal toko baru | tidak berlaku | "Belum bisa memuat ringkasan. Coba lagi." |
| Stok | "Belum ada stok. Catat barang masuk pertama." | "Tidak ada unit untuk '...'. Hapus filter." | "Stok gagal dimuat." |
| Riwayat | "Belum ada transaksi." | "Tidak ada transaksi pada periode ini." | idem |
| Servis | "Tidak ada servis berjalan." | "Tidak ada servis dengan status ini." | idem |
| Tagihan | "Tidak ada tagihan. Semua beres." | "Tidak ada tagihan telat." | idem |
| Garansi | "Masukkan IMEI atau nomor nota." | "Tidak ditemukan. Periksa 15 digit IMEI." | idem |
| Kontak | "Belum ada kontak." | "Tidak ada kontak untuk '...'." | idem |
| Katalog | "Katalog masih kosong." | idem | idem |
| Biaya | "Belum ada biaya bulan ini." | idem | idem |

---

## 12. Interaksi: scroll, klik, keyboard, gestur

### 12.1 Scroll

| Aturan | Rincian |
|---|---|
| Satu wadah scroll | `.app-main`. `body` tidak menggulir. Hapus `100vw` yang memicu scroll horizontal (F0-08). |
| Tinggi viewport | Pakai `100dvh` (sudah dipakai di 9 tempat) konsisten, dan hindari `100vh` (masih ada 3) agar tidak terpotong bilah alamat browser HP. |
| Modal | `overscroll-behavior: contain` agar menggulir sheet tidak menggeser halaman di belakang. **Kunci scroll `body`** saat modal terbuka (saat ini tidak ada). |
| Header tabel dan toolbar | `position: sticky` (tabel 20, toolbar di bawah header halaman). |
| Pindah halaman | Menggulir ke atas. Kembali memulihkan posisi (Bagian 8.4). |
| Baris chip horizontal | Pudar di tepi, `scroll-snap`, panah geser di desktop agar tidak ada yang "terpotong tanpa petunjuk" (kasus tab Pengaturan). |
| Scrollbar | Saat ini disembunyikan di seluruh aplikasi (komentar di CSS menyebut permintaan pengguna). Usulan (D-05): tetap tersembunyi di layar sentuh, tetapi di desktop tampilkan scrollbar tipis saat kursor di atas area gulir, agar tabel panjang jelas bisa digulir. |
| Sheet panjang | Bayangan lembut di tepi atas footer saat masih ada konten di bawah (petunjuk "masih bisa digulir"). |
| Footer lengket | `scroll-padding-bottom` memadai agar kolom terakhir tidak tertutup footer atau keyboard HP. |

### 12.2 Klik dan ketuk

- Seluruh kartu atau baris yang bisa dibuka adalah **satu area ketuk** dengan `cursor: pointer`, status hover, dan status fokus. Elemen di dalamnya yang punya aksi sendiri (tombol WA, menu) menghentikan perambatan klik.
- Ketuk pada HP bereaksi langsung (hapus penundaan, atur `touch-action: manipulation`), dengan umpan visual tekan (latar menggelap singkat).
- **Cegah kirim ganda**: semua tombol yang memicu permintaan masuk status loading dan menolak klik kedua.
- Tombol ikon selalu `aria-label`, dan di desktop punya tooltip.
- Teks panjang dipotong dengan elipsis dan menyediakan `title` atau tooltip. Tidak ada teks yang membungkus lebih dari 2 baris di baris tabel.
- Elemen yang tidak bisa diklik tidak boleh terlihat seperti tombol, dan sebaliknya. Tombol yang saat ini tidak berefek (F0-14) disambungkan atau dihapus.
- Aksi bahaya dipisahkan secara spasial (minimal 16 px dari aksi utama) dan memakai warna bahaya hanya setelah konfirmasi.

### 12.3 Keyboard dan pintasan

Pengelola pintasan global tunggal, aktif hanya bila fokus tidak berada di kolom input, tidak ada modifier (Ctrl, Alt, Meta), dan tidak ada modal terbuka (kecuali yang memang untuk modal).

| Tombol | Aksi | Catatan |
|---|---|---|
| `N` | Transaksi baru | sudah ada, perbaiki syarat aktif |
| `/` | Fokus ke pencarian global | sudah ada |
| `P` | Alihkan mode privasi | **tertulis di tooltip tetapi belum ada** (F0-16) |
| `Esc` | Tutup overlay teratas | hanya satu per tekan (F0-17) |
| `?` | Tampilkan daftar pintasan | baru |
| `J` `B` `S` `P` di pemilih transaksi | Pilih Jual, Barang masuk, Servis, Pembayaran | baru (hanya saat pemilih terbuka) |
| Panah atas bawah, `Enter` | Pilih dan buka baris di tabel dan hasil pencarian | baru |

Fokus: urutan Tab mengikuti urutan visual. Cincin fokus 2 px terlihat di terang dan gelap. Saat modal ditutup, fokus kembali ke pemicu. Tautan "Lewati ke konten" di awal halaman.

### 12.4 Gestur di HP

- Tarik ke bawah pada sheet untuk menutup (ada pegangan tarik).
- Tarik untuk menyegarkan pada Stok, Riwayat, dan Tagihan.
- Gesek ke samping untuk menutup toast.
- Cubit dan gesek di penampil foto. Tidak ada gestur lain yang menjadi satu-satunya cara melakukan sesuatu.

### 12.5 Penyegaran data

- Saat ini stok hanya dimuat sekali saat aplikasi dibuka dan tidak ada tombol segarkan. Tambahkan: tombol segarkan di header halaman dengan teks "Diperbarui 2 menit lalu", segarkan otomatis saat tab kembali aktif bila sudah lebih dari 60 detik, dan segarkan setelah setiap aksi tulis yang berhasil.
- Saat gagal segarkan, tampilkan data terakhir dengan penanda "usang" dan banner (Bagian 11.2), bukan layar kosong.

---

## 13. Aksesibilitas dan bahasa

### 13.1 Daftar periksa aksesibilitas

| Area | Persyaratan | Kondisi sekarang |
|---|---|---|
| Kontras | Teks kecil minimal 4,5:1, teks besar dan ikon 3:1, di terang **dan** gelap | Gagal pada semua `StatusPill` dan tombol utama dark (Bagian 1) |
| Ukuran target | Minimal 24 x 24 px (AA), 44 px untuk aksi utama di HP | Desktop 70% sampai 96% kontrol di bawah 44 px; 12 tombol 22 px di Stok |
| Warna bukan satu-satunya penanda | Status = ikon atau titik + teks | Banyak status hanya warna dan teks |
| Fokus | Cincin terlihat, urutan logis, fokus terkelola di modal | 4 aturan `:focus-visible`, hanya pencarian yang mengelola fokus |
| Label form | Setiap input punya `label` terhubung | Banyak label tanpa `htmlFor` (JualModal, Kontak, Katalog, Biaya) |
| Struktur | Landmark, judul berurutan, `aria-current="page"` di menu aktif, tabel dengan `scope` dan `caption` | sebagian |
| Dinamis | Toast dan perubahan status lewat live region | tidak ada |
| Gerak | `prefers-reduced-motion` dihormati | tidak ada (0) |
| Skala teks | Tetap berfungsi pada 200% | Belum diuji, banyak ukuran piksel tetap |
| Grafik | Ringkasan teks dan tabel tersembunyi | tidak ada |
| Bahasa | `lang="id"` | sudah ada |
| Warna sistem | `prefers-color-scheme` dan `color-scheme` | tidak ada |

### 13.2 Kosakata baku

Konsisten di seluruh aplikasi (saat ini satu fungsi punya beberapa nama):

| Konsep | Gunakan | Hindari |
|---|---|---|
| Halaman stok | **Stok** | "Stok Inventaris" di judul padahal menu "Stok" |
| Catat pembelian unit | **Barang masuk** | "Catat Barang Masuk" sebagai judul, "Barang Masuk" di tombol (boleh, tetapi satu kata kerja per konteks: tombol "Barang masuk", judul modal "Barang masuk") |
| Penjualan | **Jual** (aksi), **Penjualan** (data) | "Kasir Penjualan", "Penjualan Baru" bergantian |
| Pembayaran piutang | **Terima pembayaran** | "Terima Cicilan / Pelunasan", "Bayar" bergantian |
| Pembatalan | **Batalkan** | "Hapus" |
| Servis | **Servis** | "Service" |
| Garansi | **Garansi** | "Warranty" |

### 13.3 Format dan gaya penulisan

- Uang: `Rp 1.450.000`, rata kanan di tabel. Ringkasan besar boleh `Rp 6,1 jt` dan selalu ada nilai penuh pada tooltip.
- Tanggal: `4 Okt 2026`. Jam: `14.32 WIB` (titik, bukan titik dua, sesuai kebiasaan Indonesia). Tanggal relatif ("Hari ini", "Kemarin") untuk 2 hari terakhir.
- Huruf: kalimat biasa untuk tombol, judul, dan label ("Simpan unit", bukan "Simpan Unit"). Huruf kapital semua hanya untuk judul grup kecil.
- Tidak ada emoji di antarmuka. Gunakan ikon.
- Tombol memakai kata kerja. Pesan galat menjelaskan penyebab dan langkah berikut.
- Satuan "jt", "rb" dijelaskan pada tooltip atau legenda.

---

## 14. Verifikasi, QA, dan pagar pengaman

### 14.1 Pagar otomatis (dijalankan di setiap perubahan)

| Pemeriksaan | Ambang |
|---|---|
| `tsc --noEmit` | 0 error di `src/frontend` |
| Pemindai kelas yatim | 0 kelas dipakai di JSX tanpa definisi CSS |
| Pemindai variabel yatim | 0 `var(--x)` tanpa definisi |
| Inline style di JSX | 0 (kecuali nilai dinamis yang sah, misalnya lebar batang grafik, ditandai khusus) |
| `!important` | di bawah 5 |
| Ukuran teks minimum | tidak ada deklarasi `font-size` di bawah 12 px |
| Ukuran berkas `dist/index.html` | di bawah 500 KB |
| Pemindaian aksesibilitas otomatis (axe-core) di 11 halaman x 2 tema | 0 pelanggaran tingkat serius atau kritis |
| Playwright (`playwright.config.ts` sudah ada di proyek) | semua alur uji hijau |

Pemindai kelas dan variabel yatim yang saya jalankan untuk audit ini sangat sederhana (mengumpulkan nama dari JSX dan CSS lalu membandingkan). Bisa saya buatkan sebagai skrip repositori bila diinginkan.

### 14.2 Matriks tangkapan layar regresi visual

6 lebar (360, 390, 768, 1024, 1440, 1920) x 2 tema x 11 halaman = 132 tangkapan, ditambah modal utama (Transaksi, Jual langkah 1 sampai 4, Barang Masuk, Detail unit, Nota, Batalkan) pada 390 dan 1440, terang dan gelap.

### 14.3 Alur uji ujung ke ujung (wajib hijau)

1. Jual tunai lunas dari Stok, termasuk cetak nota.
2. Jual tempo dengan pelanggan baru, piutang muncul di Tagihan.
3. Barang masuk beruntun 3 unit dengan "Simpan dan tambah lagi", foto wajib tegakkan, IMEI duplikat ditolak.
4. Servis unit pelanggan dari Antri sampai Diambil dengan pembayaran.
5. Servis unit toko, status unit kembali Ready dan HPP bertambah.
6. Catat pembayaran sebagian lalu lunas pada tagihan.
7. Batalkan transaksi dengan alasan, stok dan piutang terkoreksi.
8. Klaim garansi dari pencarian IMEI.
9. Kunci bulan, upaya batalkan transaksi bulan terkunci ditolak.
10. Pencarian global dengan keyboard dan membuka item tepat.
11. Pintasan N, /, P, Esc bertumpuk, dan tombol Back menutup overlay.
12. Tema, privasi, dan kepadatan tetap setelah memuat ulang.

### 14.4 Uji manual di perangkat nyata

Android Chrome dan iOS Safari (safe-area, keypad numerik, kamera), layar dengan kecerahan rendah dan di bawah cahaya toko, printer termal 58 dan 80 mm, dan koneksi lambat (simulasi 3G). Uji **dengan pegawai konter**: 3 sesi pendek dengan tugas nyata (jual, barang masuk, cari garansi). Metrik yang dicatat: waktu menyelesaikan penjualan, jumlah ketukan dari Beranda ke nota, jumlah salah ketuk, dan hal yang membingungkan.

### 14.5 Target keberhasilan yang bisa diukur

| Target | Ukuran |
|---|---|
| Jual sampai nota (unit sudah dipilih) | 60 detik atau kurang |
| Beranda ke "Jual" | maksimal 2 ketukan |
| Barang masuk per unit (input beruntun) | 45 detik atau kurang |
| Halaman yang terjangkau dari HP | 11 dari 11 |
| Kontrol di bawah 24 px | 0 |
| Pelanggaran aksesibilitas serius | 0 |

---

## 15. Keputusan yang saya butuhkan dari Anda

| ID | Pertanyaan | Rekomendasi saya |
|---|---|---|
| D-01 | **Lingkup backend.** Hari ini hanya 2 aksi yang terhubung ke Apps Script. Apakah redesign ini juga menyambungkan semua aksi (jual, servis, bayar, klaim, kontak, biaya, pengaturan) ke backend? | Bangun lapisan data tunggal yang bekerja di dua mode (demo dan Apps Script), lalu sambungkan aksi satu per satu mengikuti fase halaman. Fase 0 cukup memperbaiki yang rusak dan memberi label demo. |
| D-02 | Hapus "Jual" dan "Barang Masuk" dari menu samping (karena sudah ada di tombol Transaksi baru dan Aksi cepat)? | Ya, hapus dari menu. Tetap ada di tombol dan pintasan. |
| D-03 | Bilah bawah HP: Beranda, Stok, (+), Riwayat, Menu; atau tetap Beranda, Stok, (+), Tagihan, Laporan? | Beranda, Stok, (+), Riwayat, Menu. Tagihan dan Laporan lewat Menu dengan lencana merah di Menu bila ada tagihan telat. |
| D-04 | `BayarModal`, `GaransiModal`, `ServisModal` tidak pernah dirender. Hapus atau jadikan dasar dialog baru? | Hapus, tulis ulang di `ModalShell`. |
| D-05 | Scrollbar disembunyikan di seluruh aplikasi atas permintaan sebelumnya. Boleh ditampilkan tipis di desktop saja? | Ya, hanya di desktop dan hanya saat hover. |
| D-06 | Font: tetap font sistem (D005) atau menanam font seperti Inter (menambah sekitar 40 sampai 60 KB)? | Tetap font sistem. |
| D-07 | Tema bawaan: ikuti pengaturan perangkat, atau selalu terang? | Ikuti perangkat, dengan pilihan manual di Pengaturan. |
| D-08 | Printer nota yang dipakai: lebar kertas berapa (58 mm, 80 mm, A5)? | Perlu jawaban Anda untuk menentukan tata letak cetak utama. |
| D-09 | Apakah ada lebih dari satu peran (pemilik dan pegawai), sehingga modal dan laba harus disembunyikan dari pegawai? | Bila ya, tambahkan peran sebagai fase terpisah. Mode privasi saat ini hanya menyamarkan angka di layar. |
| D-10 | Draf penjualan disimpan di mana? | Diuji dulu (lihat risiko R-01): `localStorage` bila bekerja di deployment Apps Script, bila tidak, simpan di backend. |

---

## 16. Roadmap, usaha, dan risiko

Perkiraan kasar untuk **satu developer**, belum termasuk D-01 (menyambungkan seluruh backend). Dengan dua developer dan pembagian per halaman, Fase 3 sampai 5 bisa berjalan paralel.

| Fase | Isi | Usaha | Syarat selesai |
|---|---|---|---|
| 0. Perbaikan darurat | F0-01 sampai F0-05, F0-07, F0-08, F0-09, F0-14, F0-21, F0-22, label mode demo, data kosong tidak tertutup data contoh | 5 sampai 7 hari | Semua tombol utama berfungsi, header terbaca, lonceng dan pencarian tidak crash, menu HP terbuka, toast terlihat, `tsc` hijau |
| 1. Desain sistem | Token baru, K-01 sampai K-14, `ModalShell`, Toast, Form, hapus kelas Tailwind dan variabel yatim, pagar otomatis | 6 sampai 8 hari | Galeri komponen lulus, CI pemindai hijau, dark mode tombol utama terlihat |
| 2. Shell dan Beranda | Tata letak shell, navigasi (sidebar, rail, bilah HP, Menu), header, routing hash, dashboard Beranda, pencarian, Pusat Peringatan | 5 sampai 6 hari | Kriteria selesai Beranda terpenuhi, 11 halaman terjangkau di HP |
| 3. Alur harian konter | Stok (tabel, kartu, `UnitDetail`), Riwayat, wizard Jual, Barang Masuk, Nota (data nyata), Batalkan transaksi | 8 sampai 10 hari | Alur uji 1, 2, 3, 7 hijau |
| 4. Operasional dan keuangan | Servis (papan), Tagihan, Garansi, Laporan (termasuk PDF dan Kunci Bulan) | 8 sampai 10 hari | Alur uji 4, 5, 6, 8, 9 hijau |
| 5. Data pendukung | Kontak, Katalog, Biaya, Pengaturan (dua panel, bilah simpan, tema tersimpan) | 5 sampai 6 hari | Data tidak hilang saat pindah tab, alur uji 12 hijau |
| 6. QA dan poles | Aksesibilitas, regresi visual 132 tangkapan, uji perangkat, uji cetak, uji bersama pegawai | 4 sampai 5 hari | Semua target di 14.5 tercapai |

Total kasar: sekitar **41 sampai 52 hari kerja** untuk satu developer.

### 16.1 Yang bisa dikerjakan lebih dulu (masing-masing kurang dari setengah hari)

Perbaikan murah dengan dampak paling terasa, bisa dikerjakan sebelum rencana lengkap berjalan:

1. F0-01 header terbaca (hapus inline style header, definisikan `.page-title`).
2. F0-02 dan F0-03 kirim props yang hilang ke pencarian dan Pusat Peringatan.
3. F0-04 tombol Menu di bilah bawah HP.
4. F0-05 naikkan `z-index` toast di atas modal.
5. F0-07 definisikan atau ganti 18 variabel CSS yatim.
6. F0-14 sambungkan atau hapus tombol yang tidak berefek.
7. F0-21 bersihkan timer toast.
8. F0-22 `onError` pada gambar dengan placeholder.

### 16.2 Risiko

| ID | Risiko | Mitigasi |
|---|---|---|
| R-01 | **Aplikasi berjalan di dalam iframe sandbox Google Apps Script.** `localStorage`, `history.pushState`, dan routing hash di dalam iframe itu bisa terbatas atau berperilaku berbeda antar browser. Draf otomatis dan tombol Back overlay bergantung padanya. | Lakukan uji singkat (spike) di deployment nyata sebelum Fase 2. Siapkan cadangan: simpan draf di backend, dan kelola tombol Back lewat tumpukan overlay internal. Ini perkiraan saya, belum diuji di proyek ini. |
| R-02 | Ukuran berkas membengkak karena komponen baru | Tanpa pustaka luar, grafik SVG buatan sendiri, anggaran 500 KB di CI. |
| R-03 | Refaktor hook pada modal (F0-19) menimbulkan regresi | Uji ujung ke ujung dibuat lebih dulu (Bagian 14.3), baru refaktor. |
| R-04 | Menghapus kelas Tailwind mengubah tampilan yang sebenarnya sudah dipakai pengguna | Regresi visual sebelum dan sesudah per layar. |
| R-05 | Latensi Apps Script membuat UI terasa macet | Status loading, skeleton, UI optimistis hanya untuk aksi non-uang. |
| R-06 | Tata letak cetak nota tidak cocok dengan printer toko | Konfirmasi D-08 lebih awal, uji di printer asli di Fase 3. |
| R-07 | Nilai warna usulan belum diuji di layar toko yang sebenarnya | Uji di perangkat nyata pada Fase 1 sebelum dikunci. |

---

## Lampiran A. Kelas CSS yang dipakai tetapi tidak didefinisikan

### A.1 Kelas bernama khusus (62)

`alert-icon-wrap`, `alert-row`, `avatar-initials`, `badge-dot`, `banner-neutral`, `banner-success`, `clickable-row`, `desktop-detail-panel`, `form-hint`, `foto-badge-wajib`, `foto-slot-grid`, `foto-slot-item`, `foto-tile-check`, `foto-tile-empty`, `foto-tile-filled`, `foto-tile-label`, `foto-tile-tag`, `foto-tile-thumb`, `galeri-container`, `gallery-btn-tambah`, `gallery-counter`, `gallery-empty`, `gallery-nav-btn`, `menu-icon-circle`, `menu-nav-tile`, `menu-tile-desc`, `menu-tile-grid`, `menu-tile-title`, `modal-nota-box`, `nota-terms`, `page-title`, `photo-viewer-box`, `search-result-icon`, `search-result-row`, `spinner`, `stok-list-side`, `table-thumb-placeholder`, `timeline-bullet`, `timeline-container`, `timeline-content`, `timeline-date`, `timeline-step`, `timeline-title`, `title-sm`, `unit-gallery-box`, `unit-phone-placeholder`, serta pecahan kelas bervarian (`danger`, `done`, `info`, `success`, `warning`, `current`, `next`, `prev`, `border`, `rounded`, `list-none`, `object-cover`, `right-3`, `theme-dark-text-primary`, `chip-`, `riwayat-icon-`).

Sebagian berasal dari kelas yang dibentuk dinamis, sehingga perlu dicek satu per satu saat migrasi.

### A.2 Kelas bergaya Tailwind (136), dikelompokkan

| Kelompok | Contoh | Pengganti |
|---|---|---|
| Tata letak | `flex-wrap`, `grid`, `grid-cols-2/3/4`, `items-center`, `justify-between`, `inline-flex`, `sticky`, `absolute`, `block`, `mx-auto` | Komponen `Stack`, `Row`, `Grid` kecil atau kelas bernama di komponen |
| Lebar dan tinggi | `w-[440px]`, `w-14`, `w-30`, `h-10`, `h-40`, `h-[180px]`, `max-w-md`, `max-w-[720px]`, `min-w-[220px]`, `max-h-[70vh]` | Token dan properti di kelas komponen |
| Spasi | `mt-1`, `mt-2.5`, `mb-3`, `p-3.5`, `px-2.5`, `py-1.5`, `gap-1.5`, `gap-3.5` | Skala `--sp-*` |
| Tipografi | `text-xs`, `text-sm`, `text-base`, `text-[11px]`, `text-[15px]`, `font-bold`, `font-semibold`, `font-mono`, `uppercase`, `italic` | Peran tipografi (Bagian 6.2) |
| Warna | `text-tertiary`, `text-secondary`, `text-brand-green-700`, `bg-surface-2`, `border-subtle`, `text-white`, `bg-white/20`, `text-status-danger` | Token warna (Bagian 6.1) |
| Lainnya | `overflow-y-auto`, `overflow-hidden`, `shrink-0`, `flex-2`, `flex-[2]`, `rounded-md`, `cursor-pointer` | Kelas komponen |

Peta lengkap per berkas dihasilkan otomatis saat Fase 1 oleh pemindai kelas.

## Lampiran B. Variabel CSS yang dipakai tetapi tidak didefinisikan (18) dan penggantinya

| Variabel yatim | Pemakaian | Pengganti pada token baru |
|---|---|---|
| `--status-danger-solid` | 27 | `--bad-solid` |
| `--status-danger-text` | 2 | `--bad-fg` |
| `--status-info-solid` | 2 | `--info-solid` |
| `--status-info-text` | 1 | `--info-fg` |
| `--status-success-solid` | 2 | `--ok-solid` |
| `--status-warning-solid` | 5 | `--warn-solid` |
| `--status-warning-text` | 2 | `--warn-fg` |
| `--status-ready-bg` | 2 | `--ok-bg` |
| `--status-servis-bg` | 1 | `--warn-bg` |
| `--elevation-e1`, `--elevation-e2` | 5, 1 | `--elev-1`, `--elev-2` |
| `--rad-xl` | 3 | `--r-xl` |
| `--radius-button` | 6 | `--r-md` |
| `--radius-card` | 5 | `--r-lg` |
| `--radius-tag` | 1 | `--r-full` |
| `--sidebar-w` | 2 | definisikan: 248 px, 72 px saat diciutkan |
| `--space-2`, `--space-4` | 3, 2 | `--sp-2`, `--sp-4` |

## Lampiran C. Daftar periksa Fase 0 (salin ke pelacak tugas)

- [ ] F0-01 Header terbaca di mode terang (judul, ikon, ikon cari)
- [ ] F0-02 Pencarian global tidak crash
- [ ] F0-03 Pusat Peringatan terbuka dan datanya nyata
- [ ] F0-04 Menu terbuka dari bilah bawah HP, 11 halaman terjangkau
- [ ] F0-05 Toast terlihat di atas modal
- [ ] F0-06 Kelas yatim dipetakan (penyelesaian penuh di Fase 1)
- [ ] F0-07 Variabel yatim diganti
- [ ] F0-08 `responsive.css` ditulis ulang, tidak ada padding global yang memotong HP
- [ ] F0-09 `tsc --noEmit` hijau dan setiap aksi props diuji
- [ ] F0-10 Data Kontak, Katalog, Biaya tidak hilang saat pindah tab
- [ ] F0-11 Nota memakai tanggal, garansi, nomor, dan item nyata
- [ ] F0-12 Banner draf hanya muncul bila ada draf
- [ ] F0-13 Banner mode demo, data contoh tidak menutupi data kosong dari server
- [ ] F0-14 Tombol tanpa efek disambungkan atau dihapus
- [ ] F0-15 Aksi PDF palsu diimplementasi atau disembunyikan
- [ ] F0-16 sampai F0-26 sesuai tabel Bagian 5.2
