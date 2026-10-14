// Config.ts — Semua konstanta terpusat. Tidak ada string hardcode di tempat lain.

export const TIMEZONE = 'Asia/Jakarta';
export const SPREADSHEET_NAME = 'EPICPHONE_DB_UTAMA';
export const LOCK_TIMEOUT_MS = 20_000;
export const CACHE_TTL_S = 600; // 10 menit
export const IDEM_TTL_S = 600;
export const FOTO_MAKS = 12;
export const FOTO_MAKS_BYTES = 2_097_152; // Maksimal 2 MB (2 * 1024 * 1024) setelah decode base64

export const SHEET = {
  PRODUK: 'Produk',
  KONTAK: 'Kontak',
  STOK_HP: 'Stok_HP',
  STOK_AKSESORIS: 'Stok_Aksesoris',
  PEMBELIAN: 'Pembelian',
  PEMBELIAN_ITEM: 'Pembelian_Item',
  PENJUALAN: 'Penjualan',
  PENJUALAN_ITEM: 'Penjualan_Item',
  TUKAR_TAMBAH: 'Tukar_Tambah',
  SERVIS: 'Servis',
  GARANSI_RETUR: 'Garansi_Retur',
  HUTANG_PIUTANG: 'Hutang_Piutang',
  PEMBAYARAN: 'Pembayaran',
  BIAYA_OPERASIONAL: 'Biaya_Operasional',
  DASHBOARD: 'Dashboard',
  LABA_BULANAN: 'Laba_Bulanan',
  PENGATURAN: 'Pengaturan',
  REFERENSI: 'Referensi',
  LOG_AKTIVITAS: 'Log_Aktivitas',
  BERKAS_FOTO: 'Berkas_Foto',
} as const;

export const PREFIX_ID = {
  PRODUK: 'PRD',
  KONTAK: 'KTK',
  UNIT: 'UNT',
  AKSESORIS: 'ACC',
  PEMBELIAN: 'BELI',
  PENJUALAN: 'JUAL',
  TUKAR_TAMBAH: 'TT',
  SERVIS: 'SRV',
  KLAIM: 'KLM',
  TAGIHAN: 'TGH',
  PEMBAYARAN: 'BYR',
  BIAYA: 'BIA',
  BERKAS: 'BRK',
} as const;

export const STATUS_UNIT = {
  READY: 'Ready',
  DIPESAN: 'Dipesan',
  SERVIS: 'Servis',
  TERJUAL: 'Terjual',
  RETUR: 'Retur',
  RUSAK: 'Rusak',
  BATAL: 'Batal', // unit tukar tambah dari penjualan yang dibatalkan
} as const;

export const FOLDER = {
  UTAMA: 'EPICPHONE_00_SISTEM',
  ASET_BRAND: '00_ASET-BRAND',
  DATABASE: '01_DATABASE',
  FOTO_HP: '02_FOTO-HP',
  TERHAPUS: '_TERHAPUS',
  NOTA: '03_NOTA',
  NOTA_RIWAYAT: 'RIWAYAT',
  BUKTI_TRANSAKSI: '04_BUKTI-TRANSAKSI',
  BUKTI_PEMBELIAN: 'PEMBELIAN',
  BUKTI_PEMBAYARAN: 'PEMBAYARAN',
  BUKTI_BIAYA: 'BIAYA',
  SERVIS: '05_SERVIS',
  LAPORAN: '06_LAPORAN',
  BACKUP: '07_BACKUP',
  BACKUP_HARIAN: 'HARIAN',
  BACKUP_BULANAN: 'BULANAN',
  BACKUP_MINGGUAN: 'MINGGUAN',
  BACKUP_PRA_RILIS: 'PRA-RILIS',
  BACKUP_PRA_MIGRASI: 'PRA-MIGRASI',
  BACKUP_PENGAMAN: 'PENGAMAN-PULIH',
  ARSIP: '08_ARSIP',
  TEMPLATE_IMPOR: '09_TEMPLATE-IMPOR',
} as const;

export const POSISI_FOTO = [
  'DEPAN', 'BELAKANG', 'SAMPING', 'LAYAR-MENYALA',
  'IMEI', 'BATERAI', 'DUS', 'KELENGKAPAN', 'CACAT', 'LAINNYA',
] as const;

export const TAHAP_SERVIS = ['SEBELUM', 'PROSES', 'SESUDAH'] as const;

export const GARANSI_DEFAULT = {
  BARU_BULAN: 12,
  BEKAS_HARI: 7,
  AKSESORIS_HARI: 3,
} as const;

export const BATAS_BONUS_PERSEN = 50;
export const BATAS_UMUR_STOK_HARI = 30;
