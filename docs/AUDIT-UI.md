# Audit UI/UX Mendalam (Berdasarkan Spesifikasi Desain Figma)

## 1. Sidebar & App Shell
- [ ] **Tombol Sidebar**: Terdapat teks '+ Transaksi Baru' plus ikon Plus. Seharusnya teks lebih ringkas, misal 'Transaksi' atau 'Barang Masuk', atau ikon Plus jangan diduplikasi.
- [ ] **Padding Sidebar**: Belum standar. Figma menuntut padding 16px 24px untuk brand, dan 0 16px untuk item navigasi.
- [x] **Collapse Sidebar**: State `isSidebarCollapsed` sudah ada. Namun, implementasi CSS (`.collapsed`) mungkin menumpuk teks alih-alih menyembunyikannya secara halus (butuh `opacity: 0` atau animasi/transition).

## 2. Tipografi & Jarak Teks
- [ ] **Terlalu banyak teks**: Label menu seperti 'Stok Inventaris', 'Riwayat Transaksi', 'Beban Operasional' kemungkinan *wrap* (turun baris) pada lebar 240px jika font terlalu besar. Solusi: Gunakan teks ringkas ('Stok', 'Riwayat', 'Biaya') atau pastikan `white-space: nowrap` dan `text-overflow: ellipsis`.
- [ ] **Format Nama (Logo)**: Teks 'EPIC PHONE PURWOKERTO' mungkin kebesaran (`var(--text-base)` + `font-weight: 800`). Harus diperhalus agar sejajar vertikal dengan Logo.
- [ ] **Line-height**: `line-height` di `.page-container` atau *body* belum di-set optimal, sehingga teks paragraf / label berdempetan. (Butuh `line-height: 1.5` untuk bacaan, `1.2` untuk UI).

## 3. Spacing & Tata Letak Grid
- [ ] **Jarak antar kartu (Gap)**: Banyak layout menggunakan `margin-top: 16px` atau 12px yang sporadis. CSS modern dari Figma mengharuskan kontainer memakai `display: flex; gap: var(--sp-4)` atau `display: grid; gap: var(--sp-6)`.
- [ ] **Padding Komponen (Card & Modal)**: Modal masih menggunakan padding tak standar (ada yang 14px, 16px, 20px). Figma menuntut konsistensi `padding: 24px` untuk Modal Header/Body.

## 4. Modal, Notif, dan Button
- [ ] **Toast Notifikasi**: Tombol 'X' (tutup) menggunakan inline style kotor (`style={{ background: 'none', ... }}`).
- [ ] **Button Width**: Banyak tombol (terutama di Modal) belum mengisi penuh (Full Width) sesuai desain Figma untuk form *submit*.
- [ ] **Modal Overlay**: Latar belakang modal mungkin belum memakai efek *backdrop-blur* atau warna overlay standar (`rgba(15,23,42,0.4)`).