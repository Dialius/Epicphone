// data-contoh.ts — Realistic Sample Data & Types for EPICPHONE Purwokerto
// Conforms to Section 12 of DESIGN-SPEC-EPICPHONE.md

/** Foto contoh (hanya mode demo). Awalan dan ukuran sama untuk semua, hanya ID foto yang berbeda. */
export const fotoContoh = (id: string) => `https://images.unsplash.com/${id}?w=600&auto=format&fit=crop&q=80`;

export interface TokoProfile {
  nama: string;
  tagline: string;
  alamat: string;
  noWa: string;
  instagram: string;
}

export const MOCK_TOKO: TokoProfile = {
  nama: 'Epic Phone Purwokerto',
  tagline: 'Inovasi Ada Di Genggaman',
  alamat: 'Jl. Prof HR Boenyamin No. 7, Purwokerto',
  noWa: '0812-3456-7890',
  instagram: '@epicphone_purwokerto',
};

export interface RingkasanHariIni {
  omzet: number;
  unitTerjual: number;
  labaKotor: number;
  kasMasuk: number;
  stokReady: number;
}

export interface PeringatanItem {
  id: string;
  tipe: 'telat' | 'stok-lama' | 'stok-habis' | 'servis-siap' | 'sistem';
  judul: string;
  deskripsi: string;
  badge: string;
  count: number;
  linkTab: string;
  filterValue?: string;
  /** diisi oleh derive.ts */
  tingkat?: 'kritis' | 'tindakan' | 'info';
  refId?: string;
  noWa?: string;
  aksiLabel?: string;
}

export interface TransaksiItem {
  /** Metode bayar (Tunai, Transfer, QRIS, Cicilan, Tempo) */
  metode?: string;
  /** Batas garansi yang dihitung server, mis. "14 Okt 2026 (7 hari)" */
  garansiSampai?: string;
  id: string;
  jam: string;
  tanggal: string;
  tipe: 'Jual' | 'Beli' | 'Servis' | 'Bayar' | 'Klaim' | 'Biaya';
  judul: string;
  subjudul: string;
  pihak: string;
  nominal: number;
  status: 'Lunas' | 'Sebagian' | 'Selesai' | 'Dibatalkan' | 'Aktif';
  items?: Array<{ nama: string; qty: number; harga: number; imei?: string }>;
  bonus?: Array<{ nama: string; qty: number }>;
  diskon?: number;
  tukarTambah?: { unit: string; nilai: number };
  dibayar?: number;
  sisa?: number;
  jatuhTempo?: string;
  modal?: number;
  laba?: number;
  biayaBonus?: number;
  catatanBatal?: string;
}

export interface UnitHP {
  id: string;
  nama: string;
  merek: string;
  model: string;
  imei: string;
  imei2?: string;
  kondisi: 'Baru' | 'Bekas';
  grade?: 'A' | 'B' | 'C';
  kelengkapan: 'Fullset' | 'Unit saja' | 'Tanpa dus';
  baterai?: number;
  bebasKunci: 'Ya' | 'Tidak' | 'Belum dicek';
  hargaBeli: number;
  biayaLain: number;
  biayaServis: number;
  hpp: number;
  hargaJualTarget: number;
  status: 'Ready' | 'Dipesan' | 'Servis' | 'Terjual' | 'Rusak' | 'Retur';
  umurHari: number;
  tglMasuk: string;
  catatan?: string;
  sumberSupplier?: string;
  foto: string[];
  estimasiServis?: number;
  notaJualId?: string;
}

export interface Aksesoris {
  sku: string;
  nama: string;
  kategori: 'Pelindung layar' | 'Casing' | 'Charger' | 'Kabel' | 'Lainnya';
  stok: number;
  stokMin: number;
  hargaBeliRata2: number;
  hargaJual: number;
  status: 'Aman' | 'Menipis' | 'Habis';
  riwayat?: Array<{ tanggal: string; tipe: string; refId: string; qty: number }>;
}

export interface Tagihan {
  id: string;
  jenis: 'Piutang pelanggan' | 'Hutang supplier';
  kontak: string;
  noWa: string;
  total: number;
  terbayar: number;
  sisa: number;
  jatuhTempo: string;
  hariTelat: number;
  status: 'Belum' | 'Sebagian' | 'Lunas' | 'Telat';
  refId: string;
  riwayatBayar: Array<{ tanggal: string; jam: string; nominal: number; metode: string; bukti?: string }>;
}

export interface ServisItem {
  id: string;
  tglMasuk: string;
  jenis: 'Internal' | 'Pelanggan';
  namaPerangkat: string;
  imei: string;
  namaPelanggan: string;
  noWa: string;
  keluhan: string;
  teknisi: string;
  estimasiBiaya: number;
  biayaPart: number;
  biayaJasa: number;
  tarifPelanggan: number;
  status: 'Antri' | 'Dikerjakan' | 'Selesai' | 'Diambil' | 'Batal';
  tahap: 'sebelum' | 'proses' | 'sesudah';
  unitHpId?: string;
  catatan?: string;
  foto?: string[];
}

export interface KlaimItem {
  id: string;
  tanggal: string;
  notaId: string;
  imei: string;
  namaBarang: string;
  pelanggan: string;
  jenis: 'Klaim garansi' | 'Retur' | 'Refund' | 'Tukar unit';
  alasan: string;
  status: 'Dibuka' | 'Diproses' | 'Selesai' | 'Ditolak';
  tindakan: string;
  nilaiRefund?: number;
  unitPengganti?: string;
  dampakLaba?: number;
}

export interface BiayaOperasional {
  id: string;
  tanggal: string;
  kategori: 'Sewa' | 'Listrik' | 'Internet' | 'Gaji' | 'Transport' | 'Iklan' | 'Lainnya';
  nominal: number;
  keterangan: string;
}

export interface KontakItem {
  id: string;
  nama: string;
  tipe: 'Pelanggan' | 'Supplier' | 'Keduanya';
  noWa: string;
  alamat: string;
  totalTransaksi: number;
  catatan?: string;
  aktif: boolean;
}

export interface ProdukKatalog {
  id: string;
  jenis: 'HP' | 'Aksesoris';
  platform?: 'iPhone' | 'Android';
  merek: string;
  model: string;
  varian: string;
  warna: string;
  hargaStandar: number;
  aktif: boolean;
}

export interface LogAktivitasItem {
  id: string;
  tanggal: string;
  jam: string;
  aksi: 'CREATE' | 'UPDATE' | 'DELETE' | 'CANCEL' | 'BACKUP';
  sheet: string;
  idData: string;
  ringkasan: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA SECTION 12
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_RINGKASAN: RingkasanHariIni = {
  omzet: 12450000,
  unitTerjual: 3,
  labaKotor: 1150000,
  kasMasuk: 9950000,
  stokReady: 38,
};

export const MOCK_PERINGATAN: PeringatanItem[] = [
  {
    id: 'p-1',
    tipe: 'telat',
    judul: '2 tagihan jatuh tempo',
    deskripsi: 'Budi Santoso (Telat 3 hari) & Siti Rahayu (Jatuh tempo 15 Okt)',
    badge: 'Telat',
    count: 2,
    linkTab: 'tagihan',
    filterValue: 'telat',
  },
  {
    id: 'p-2',
    tipe: 'stok-lama',
    judul: '4 HP stok lebih dari 30 hari',
    deskripsi: 'iPhone 11 64GB (36 hr), Realme C55 (40 hr), Redmi Note 12 (21 hr)',
    badge: '>30 Hari',
    count: 4,
    linkTab: 'stok',
    filterValue: '>30 Hari',
  },
  {
    id: 'p-3',
    tipe: 'stok-habis',
    judul: '3 aksesoris hampir habis / kosong',
    deskripsi: 'Charger 20W (Habis), Casing Bening A54 (sisa 3), TG A54',
    badge: 'Menipis',
    count: 3,
    linkTab: 'stok',
    filterValue: 'aksesoris',
  },
  {
    id: 'p-4',
    tipe: 'servis-siap',
    judul: '1 servis siap diambil',
    deskripsi: 'SRV-2610-0005 Samsung Galaxy A54 ganti layar selesai',
    badge: 'Selesai',
    count: 1,
    linkTab: 'servis',
    filterValue: 'selesai',
  },
];

export const MOCK_STOK_HP: UnitHP[] = [
  {
    id: 'UNT-2610-0007',
    nama: 'Samsung Galaxy A54 5G 8/256 GB Hitam',
    merek: 'Samsung',
    model: 'Galaxy A54 5G',
    imei: '358123456784521',
    kondisi: 'Bekas',
    grade: 'B',
    kelengkapan: 'Fullset',
    baterai: 87,
    bebasKunci: 'Ya',
    hargaBeli: 2900000,
    biayaLain: 0,
    biayaServis: 0,
    hpp: 2900000,
    hargaJualTarget: 3250000,
    status: 'Ready',
    umurHari: 12,
    tglMasuk: '20 Sep 2026',
    sumberSupplier: 'CV Maju Seluler',
    catatan: 'Lecet pemakaian halus di bezel pojok kanan bawah. Layar mulus original.',
    foto: [
      fotoContoh('photo-1610945415295-d9bbf067e59c'),
    ],
  },
  {
    id: 'UNT-2610-0008',
    nama: 'iPhone 13 128 GB Midnight',
    merek: 'Apple',
    model: 'iPhone 13',
    imei: '359981240181102',
    kondisi: 'Bekas',
    grade: 'A',
    kelengkapan: 'Fullset',
    baterai: 91,
    bebasKunci: 'Ya',
    hargaBeli: 6900000,
    biayaLain: 0,
    biayaServis: 0,
    hpp: 6900000,
    hargaJualTarget: 7800000,
    status: 'Ready',
    umurHari: 5,
    tglMasuk: '27 Sep 2026',
    sumberSupplier: 'Toko Cahaya Gadget',
    catatan: 'Kondisi 98% like new, garansi iBox resmi, baterai original health 91%.',
    foto: [
      fotoContoh('photo-1592750475338-74b7b21085ab'),
    ],
  },
  {
    id: 'UNT-2610-0009',
    nama: 'Xiaomi Redmi Note 12 8/256 GB Biru',
    merek: 'Xiaomi',
    model: 'Redmi Note 12',
    imei: '864201948128830',
    kondisi: 'Baru',
    kelengkapan: 'Fullset',
    bebasKunci: 'Ya',
    hargaBeli: 2050000,
    biayaLain: 0,
    biayaServis: 0,
    hpp: 2050000,
    hargaJualTarget: 2350000,
    status: 'Ready',
    umurHari: 21,
    tglMasuk: '11 Sep 2026',
    sumberSupplier: 'CV Maju Seluler',
    catatan: 'Baru BNIB segel pabrik TAM garansi 15 bulan.',
    foto: [],
  },
  {
    id: 'UNT-2610-0010',
    nama: 'Oppo A57 4/64 GB Biru',
    merek: 'Oppo',
    model: 'A57',
    imei: '869018471203377',
    kondisi: 'Bekas',
    grade: 'C',
    kelengkapan: 'Unit saja',
    baterai: 79,
    bebasKunci: 'Ya',
    hargaBeli: 1100000,
    biayaLain: 0,
    biayaServis: 0,
    hpp: 1100000,
    estimasiServis: 150000,
    hargaJualTarget: 1450000,
    status: 'Servis',
    umurHari: 3,
    tglMasuk: '29 Sep 2026',
    sumberSupplier: 'Beli putus pelanggan',
    catatan: 'Baterai boros drop 79%. Sedang servis ganti baterai original.',
    foto: [],
  },
  {
    id: 'UNT-2610-0011',
    nama: 'iPhone 11 64 GB Hitam',
    merek: 'Apple',
    model: 'iPhone 11',
    imei: '357281094819904',
    kondisi: 'Bekas',
    grade: 'B',
    kelengkapan: 'Tanpa dus',
    baterai: 82,
    bebasKunci: 'Ya',
    hargaBeli: 3100000,
    biayaLain: 0,
    biayaServis: 0,
    hpp: 3100000,
    hargaJualTarget: 3600000,
    status: 'Ready',
    umurHari: 36,
    tglMasuk: '26 Agu 2026',
    sumberSupplier: 'Toko Cahaya Gadget',
    catatan: 'Stok lama >30 hari. Layar True Tone on, Face ID lancar.',
    foto: [],
  },
  {
    id: 'UNT-2610-0012',
    nama: 'Vivo Y36 8/128 GB Hijau',
    merek: 'Vivo',
    model: 'Y36',
    imei: '861092847195561',
    kondisi: 'Baru',
    kelengkapan: 'Fullset',
    bebasKunci: 'Ya',
    hargaBeli: 2400000,
    biayaLain: 0,
    biayaServis: 0,
    hpp: 2400000,
    hargaJualTarget: 2700000,
    status: 'Dipesan',
    umurHari: 8,
    tglMasuk: '24 Sep 2026',
    sumberSupplier: 'CV Maju Seluler',
    catatan: 'Dipesan oleh pelanggan untuk ambil sore hari.',
    foto: [],
  },
  {
    id: 'UNT-2610-0013',
    nama: 'Samsung Galaxy S21 8/128 GB Abu',
    merek: 'Samsung',
    model: 'Galaxy S21',
    imei: '354819284012210',
    kondisi: 'Bekas',
    grade: 'B',
    kelengkapan: 'Fullset',
    baterai: 84,
    bebasKunci: 'Ya',
    hargaBeli: 4200000,
    biayaLain: 0,
    biayaServis: 0,
    hpp: 4200000,
    hargaJualTarget: 4800000,
    status: 'Terjual',
    umurHari: 18,
    tglMasuk: '10 Sep 2026',
    notaJualId: 'JUAL-2610-0038',
    sumberSupplier: 'Beli putus pelanggan',
    catatan: 'Terjual ke Mas Andre tanggal 28 Sep 2026.',
    foto: [],
  },
  {
    id: 'UNT-2610-0014',
    nama: 'Realme C55 6/128 GB Hitam',
    merek: 'Realme',
    model: 'C55',
    imei: '860192847197745',
    kondisi: 'Bekas',
    grade: 'A',
    kelengkapan: 'Unit saja',
    baterai: 90,
    bebasKunci: 'Ya',
    hargaBeli: 1650000,
    biayaLain: 0,
    biayaServis: 0,
    hpp: 1650000,
    hargaJualTarget: 1950000,
    status: 'Rusak',
    umurHari: 40,
    tglMasuk: '22 Agu 2026',
    sumberSupplier: 'Beli putus pelanggan',
    catatan: 'Ditandai rusak karena IC power short terkena cairan.',
    foto: [],
  },
];

export const MOCK_AKSESORIS: Aksesoris[] = [
  {
    sku: 'ACC-0012',
    nama: 'Tempered Glass Samsung A54',
    kategori: 'Pelindung layar',
    stok: 14,
    stokMin: 5,
    hargaBeliRata2: 8000,
    hargaJual: 25000,
    status: 'Aman',
    riwayat: [
      { tanggal: '05 Okt 2026', tipe: 'Bonus', refId: 'JUAL-2610-0042', qty: -1 },
      { tanggal: '01 Okt 2026', tipe: 'Beli', refId: 'BELI-2610-0001', qty: 15 },
    ],
  },
  {
    sku: 'ACC-0013',
    nama: 'Casing Bening A54',
    kategori: 'Casing',
    stok: 3,
    stokMin: 5,
    hargaBeliRata2: 12000,
    hargaJual: 35000,
    status: 'Menipis',
    riwayat: [
      { tanggal: '05 Okt 2026', tipe: 'Bonus', refId: 'JUAL-2610-0042', qty: -1 },
      { tanggal: '28 Sep 2026', tipe: 'Jual', refId: 'JUAL-2610-0039', qty: -1 },
    ],
  },
  {
    sku: 'ACC-0020',
    nama: 'Charger 20W Fast Charging',
    kategori: 'Charger',
    stok: 0,
    stokMin: 5,
    hargaBeliRata2: 55000,
    hargaJual: 85000,
    status: 'Habis',
    riwayat: [
      { tanggal: '05 Okt 2026', tipe: 'Jual', refId: 'JUAL-2610-0042', qty: -1 },
      { tanggal: '03 Okt 2026', tipe: 'Jual', refId: 'JUAL-2610-0040', qty: -1 },
    ],
  },
  {
    sku: 'ACC-0031',
    nama: 'Kabel Data Type-C Braided',
    kategori: 'Kabel',
    stok: 22,
    stokMin: 5,
    hargaBeliRata2: 9000,
    hargaJual: 25000,
    status: 'Aman',
    riwayat: [
      { tanggal: '01 Okt 2026', tipe: 'Beli', refId: 'BELI-2610-0001', qty: 25 },
      { tanggal: '04 Okt 2026', tipe: 'Jual', refId: 'JUAL-2610-0041', qty: -3 },
    ],
  },
];

export const MOCK_TRANSAKSI_TERAKHIR: TransaksiItem[] = [
  {
    id: 'JUAL-2610-0042',
    jam: '14:32',
    tanggal: '05 Okt 2026',
    tipe: 'Jual',
    judul: 'Samsung Galaxy A54 5G 8/256 GB Hitam',
    subjudul: 'Charger 20W + 2 bonus gratis',
    pihak: 'Budi Santoso',
    nominal: 3335000,
    status: 'Lunas',
    items: [
      { nama: 'Samsung Galaxy A54 5G 8/256 GB Hitam', qty: 1, harga: 3250000, imei: '358123456784521' },
      { nama: 'Charger 20W Fast Charging', qty: 1, harga: 85000 },
    ],
    bonus: [
      { nama: 'Tempered Glass Samsung A54', qty: 1 },
      { nama: 'Casing Bening A54', qty: 1 },
    ],
    dibayar: 3335000,
    sisa: 0,
    modal: 2963000,
    laba: 372000,
    biayaBonus: 20000,
  },
  {
    id: 'JUAL-2610-0041',
    jam: '12:10',
    tanggal: '05 Okt 2026',
    tipe: 'Jual',
    judul: 'iPhone 13 128 GB Midnight',
    subjudul: 'Tukar tambah Redmi 9 (-Rp 800.000), sisa piutang',
    pihak: 'Siti Rahayu',
    nominal: 7000000,
    status: 'Sebagian',
    items: [
      { nama: 'iPhone 13 128 GB Midnight', qty: 1, harga: 7800000, imei: '359981240181102' },
    ],
    tukarTambah: { unit: 'Redmi 9 4/64 GB', nilai: 800000 },
    dibayar: 4000000,
    sisa: 3000000,
    jatuhTempo: '15 Okt 2026',
    modal: 6900000,
    laba: 900000,
  },
  {
    id: 'BELI-2610-0003',
    jam: '10:45',
    tanggal: '05 Okt 2026',
    tipe: 'Beli',
    judul: 'Barang Masuk 3 Unit HP',
    subjudul: 'Samsung A54, iPhone 13, Redmi Note 12',
    pihak: 'CV Maju Seluler',
    nominal: 8700000,
    status: 'Sebagian',
    sisa: 8700000,
    jatuhTempo: '12 Okt 2026',
  },
  {
    id: 'SRV-2610-0005',
    jam: '09:30',
    tanggal: '05 Okt 2026',
    tipe: 'Servis',
    judul: 'Servis Internal Samsung Galaxy A54',
    subjudul: 'Ganti LCD touchscreen original',
    pihak: 'Teknisi Toko',
    nominal: 350000,
    status: 'Selesai',
  },
  {
    id: 'BYR-2610-0012',
    jam: '09:10',
    tanggal: '05 Okt 2026',
    tipe: 'Bayar',
    judul: 'Cicilan Piutang Siti Rahayu',
    subjudul: 'Transfer BCA via Rekening Toko',
    pihak: 'Siti Rahayu',
    nominal: 500000,
    status: 'Lunas',
  },
];

export const MOCK_TAGIHAN: Tagihan[] = [
  {
    id: 'TGH-2610-0004',
    jenis: 'Piutang pelanggan',
    kontak: 'Budi Santoso',
    noWa: '0812-3456-7890',
    total: 1500000,
    terbayar: 300000,
    sisa: 1200000,
    jatuhTempo: '02 Okt 2026',
    hariTelat: 3,
    status: 'Telat',
    refId: 'JUAL-2610-0035',
    riwayatBayar: [
      { tanggal: '28 Sep 2026', jam: '11:00', nominal: 300000, metode: 'Tunai' },
    ],
  },
  {
    id: 'TGH-2610-0009',
    jenis: 'Piutang pelanggan',
    kontak: 'Siti Rahayu',
    noWa: '0813-9876-5432',
    total: 3000000,
    terbayar: 0,
    sisa: 3000000,
    jatuhTempo: '15 Okt 2026',
    hariTelat: 0,
    status: 'Belum',
    refId: 'JUAL-2610-0041',
    riwayatBayar: [],
  },
  {
    id: 'TGH-2610-0011',
    jenis: 'Hutang supplier',
    kontak: 'CV Maju Seluler',
    noWa: '0811-2233-4455',
    total: 8700000,
    terbayar: 0,
    sisa: 8700000,
    jatuhTempo: '12 Okt 2026',
    hariTelat: 0,
    status: 'Belum',
    refId: 'BELI-2610-0003',
    riwayatBayar: [],
  },
  {
    id: 'TGH-2610-0002',
    jenis: 'Hutang supplier',
    kontak: 'Toko Cahaya Gadget',
    noWa: '0818-7766-5544',
    total: 3300000,
    terbayar: 3300000,
    sisa: 0,
    jatuhTempo: '30 Sep 2026',
    hariTelat: 0,
    status: 'Lunas',
    refId: 'BELI-2609-0018',
    riwayatBayar: [
      { tanggal: '30 Sep 2026', jam: '16:00', nominal: 3300000, metode: 'Transfer' },
    ],
  },
];

export const MOCK_SERVIS: ServisItem[] = [
  {
    id: 'SRV-2610-0005',
    tglMasuk: '03 Okt 2026',
    jenis: 'Internal',
    namaPerangkat: 'Samsung Galaxy A54 5G',
    imei: '358123456784521',
    namaPelanggan: 'Stok Toko',
    noWa: '-',
    keluhan: 'Layar retak sudut atas, ganti LCD fullset original',
    teknisi: 'Teknisi Sendiri (Mas Danang)',
    estimasiBiaya: 350000,
    biayaPart: 250000,
    biayaJasa: 100000,
    tarifPelanggan: 0,
    status: 'Selesai',
    tahap: 'sesudah',
    unitHpId: 'UNT-2610-0007',
    catatan: 'Penggantian LCD sukses. Layar 120Hz responsif & sidik jari layar aktif.',
  },
  {
    id: 'SRV-2610-0006',
    tglMasuk: '04 Okt 2026',
    jenis: 'Internal',
    namaPerangkat: 'Oppo A57 4/64 GB',
    imei: '869018471203377',
    namaPelanggan: 'Stok Toko',
    noWa: '-',
    keluhan: 'Ganti baterai baru original (BH drop 79%)',
    teknisi: 'Vendor Luar (Mitra Service Center)',
    estimasiBiaya: 150000,
    biayaPart: 100000,
    biayaJasa: 50000,
    tarifPelanggan: 0,
    status: 'Dikerjakan',
    tahap: 'proses',
    unitHpId: 'UNT-2610-0010',
    catatan: 'Part baterai original sedang dipasang teknisi.',
  },
  {
    id: 'SRV-2610-0007',
    tglMasuk: '05 Okt 2026',
    jenis: 'Pelanggan',
    namaPerangkat: 'iPhone XR 64 GB',
    imei: '359128301928374',
    namaPelanggan: 'Budi Santoso',
    noWa: '0812-3456-7890',
    keluhan: 'Tidak bisa mengisi daya (port charger kotor/rusak)',
    teknisi: 'Teknisi Sendiri (Mas Danang)',
    estimasiBiaya: 250000,
    biayaPart: 150000,
    biayaJasa: 100000,
    tarifPelanggan: 250000,
    status: 'Antri',
    tahap: 'sebelum',
    catatan: 'Dicek dahulu apakah cukup pembersihan pin atau ganti fleksibel port.',
  },
];

export const MOCK_KLAIM: KlaimItem[] = [
  {
    id: 'KLM-2610-0001',
    tanggal: '02 Okt 2026',
    notaId: 'JUAL-2609-0032',
    imei: '358992019928114',
    namaBarang: 'iPhone 11 128 GB Hitam',
    pelanggan: 'Rian Ardiansyah',
    jenis: 'Klaim garansi',
    alasan: 'Speaker atas kemresek suara pelan saat telepon',
    status: 'Selesai',
    tindakan: 'Servis',
    dampakLaba: -150000,
  },
  {
    id: 'KLM-2610-0002',
    tanggal: '04 Okt 2026',
    notaId: 'JUAL-2610-0039',
    imei: '864201948128830',
    namaBarang: 'Xiaomi Redmi Note 12',
    pelanggan: 'Siti Rahayu',
    jenis: 'Retur',
    alasan: 'Layar terkadang freeze saat multitasking',
    status: 'Diproses',
    tindakan: 'Tukar unit',
  },
];

export const MOCK_BIAYA: BiayaOperasional[] = [
  { id: 'BIA-2610-0001', tanggal: '01 Okt 2026', kategori: 'Sewa', nominal: 1500000, keterangan: 'Sewa ruko bulan Oktober 2026' },
  { id: 'BIA-2610-0002', tanggal: '02 Okt 2026', kategori: 'Listrik', nominal: 450000, keterangan: 'Token listrik toko 900VA' },
  { id: 'BIA-2610-0003', tanggal: '02 Okt 2026', kategori: 'Internet', nominal: 350000, keterangan: 'IndiHome 50 Mbps toko' },
  { id: 'BIA-2610-0004', tanggal: '03 Okt 2026', kategori: 'Iklan', nominal: 400000, keterangan: 'Iklan Instagram & Facebook Ads' },
  { id: 'BIA-2610-0005', tanggal: '04 Okt 2026', kategori: 'Transport', nominal: 200000, keterangan: 'Ongkir jemput stok & bensin' },
  { id: 'BIA-2610-0006', tanggal: '05 Okt 2026', kategori: 'Gaji', nominal: 300000, keterangan: 'Uang makan teknisi freelance Mas Danang' },
];

export const MOCK_KONTAK: KontakItem[] = [
  { id: 'KTK-0001', nama: 'Budi Santoso', tipe: 'Pelanggan', noWa: '0812-3456-7890', alamat: 'Jl. Overste Isdiman No. 12, Purwokerto', totalTransaksi: 5, aktif: true },
  { id: 'KTK-0002', nama: 'Siti Rahayu', tipe: 'Pelanggan', noWa: '0813-9876-5432', alamat: 'Perumahan Griya Satria Mandirancan', totalTransaksi: 3, aktif: true },
  { id: 'KTK-0003', nama: 'Rian Ardiansyah', tipe: 'Pelanggan', noWa: '0857-1234-5678', alamat: 'Kecamatan Banyumas RT 02/04', totalTransaksi: 2, aktif: true },
  { id: 'KTK-0004', nama: 'Pelanggan Umum', tipe: 'Pelanggan', noWa: '-', alamat: 'Di tempat', totalTransaksi: 42, aktif: true },
  { id: 'KTK-0005', nama: 'CV Maju Seluler', tipe: 'Supplier', noWa: '0811-2233-4455', alamat: 'Ruko Simpang Lima Blok C, Semarang', totalTransaksi: 18, aktif: true },
  { id: 'KTK-0006', nama: 'Toko Cahaya Gadget', tipe: 'Supplier', noWa: '0818-7766-5544', alamat: 'ITC Roxy Mas Lantai 2 No. 44, Jakarta', totalTransaksi: 11, aktif: true },
];

export const MOCK_KATALOG: ProdukKatalog[] = [
  { id: 'PRD-0001', jenis: 'HP', platform: 'Android', merek: 'Samsung', model: 'Galaxy A54 5G', varian: '8/256 GB', warna: 'Hitam', hargaStandar: 3250000, aktif: true },
  { id: 'PRD-0002', jenis: 'HP', platform: 'iPhone', merek: 'Apple', model: 'iPhone 13', varian: '128 GB', warna: 'Midnight', hargaStandar: 7800000, aktif: true },
  { id: 'PRD-0003', jenis: 'HP', platform: 'Android', merek: 'Xiaomi', model: 'Redmi Note 12', varian: '8/256 GB', warna: 'Biru', hargaStandar: 2350000, aktif: true },
  { id: 'PRD-0004', jenis: 'HP', platform: 'Android', merek: 'Oppo', model: 'A57', varian: '4/64 GB', warna: 'Biru', hargaStandar: 1450000, aktif: true },
  { id: 'PRD-0005', jenis: 'HP', platform: 'iPhone', merek: 'Apple', model: 'iPhone 11', varian: '64 GB', warna: 'Hitam', hargaStandar: 3600000, aktif: true },
  { id: 'PRD-0006', jenis: 'HP', platform: 'Android', merek: 'Vivo', model: 'Y36', varian: '8/128 GB', warna: 'Hijau', hargaStandar: 2700000, aktif: true },
  { id: 'PRD-0007', jenis: 'Aksesoris', merek: 'Epic Access', model: 'Tempered Glass Samsung A54', varian: 'Kaca Bening 9H', warna: 'Transparan', hargaStandar: 25000, aktif: true },
  { id: 'PRD-0008', jenis: 'Aksesoris', merek: 'Epic Access', model: 'Casing Bening A54', varian: 'Anti Crack Silikon', warna: 'Clear', hargaStandar: 35000, aktif: true },
  { id: 'PRD-0009', jenis: 'Aksesoris', merek: 'OEM', model: 'Charger 20W Fast Charging', varian: 'Type-C Adapter', warna: 'Putih', hargaStandar: 85000, aktif: true },
  { id: 'PRD-0010', jenis: 'Aksesoris', merek: 'Braided Pro', model: 'Kabel Data Type-C Braided', varian: '1 Meter', warna: 'Hitam', hargaStandar: 25000, aktif: true },
];

export const MOCK_LOG: LogAktivitasItem[] = [
  { id: 'LOG-001', tanggal: '05 Okt 2026', jam: '14:32', aksi: 'CREATE', sheet: 'Penjualan', idData: 'JUAL-2610-0042', ringkasan: 'Penjualan Galaxy A54 + Aksesoris Rp 3.335.000 Lunas' },
  { id: 'LOG-002', tanggal: '05 Okt 2026', jam: '12:10', aksi: 'CREATE', sheet: 'Penjualan', idData: 'JUAL-2610-0041', ringkasan: 'Penjualan iPhone 13 + TT Redmi 9 Rp 7.000.000 (Piutang Rp 3.000.000)' },
  { id: 'LOG-003', tanggal: '05 Okt 2026', jam: '10:45', aksi: 'CREATE', sheet: 'Pembelian', idData: 'BELI-2610-0003', ringkasan: 'Barang Masuk 3 unit HP dari CV Maju Seluler Rp 8.700.000 (Tempo)' },
  { id: 'LOG-004', tanggal: '05 Okt 2026', jam: '09:30', aksi: 'UPDATE', sheet: 'Servis', idData: 'SRV-2610-0005', ringkasan: 'Servis LCD Galaxy A54 selesai, biaya Rp 350.000 masuk Modal' },
  { id: 'LOG-005', tanggal: '05 Okt 2026', jam: '09:10', aksi: 'CREATE', sheet: 'Pembayaran', idData: 'BYR-2610-0012', ringkasan: 'Cicilan piutang Siti Rahayu Rp 500.000 via Transfer' },
  { id: 'LOG-006', tanggal: '05 Okt 2026', jam: '01:00', aksi: 'BACKUP', sheet: 'System', idData: 'SYS-BACKUP', ringkasan: 'Pencadangan harian otomatis Google Drive berhasil' },
];

// Section 12 Laporan Data
export const MOCK_LAPORAN_OKTOBER = {
  periode: 'Oktober 2026',
  isLocked: false,
  omzet: 94200000,
  unitTerjual: 31,
  rataHariTerjual: 9,
  labaKotorHP: 7150000,
  labaAksesoris: 620000,
  labaServis: 900000,
  biayaBonus: 185000,
  biayaGaransi: 150000,
  pembalikanRetur: 0,
  kerugianRefund: 0,
  kerugianRusak: 0,
  biayaOperasional: 3200000,
  labaBersih: 5135000,
  labaBulanLalu: 4580000,
  persenKenaikan: 12.1,
  marginKotor: 8.1,
  komposisi: {
    hp: 82,
    aksesoris: 7,
    servis: 11,
  },
  // Laba bersih 12 bulan (juta)
  tren12Bulan: [
    { bulan: 'Nov 25', laba: 3.1 },
    { bulan: 'Des 25', laba: 3.8 },
    { bulan: 'Jan 26', laba: 2.9 },
    { bulan: 'Feb 26', laba: 4.2 },
    { bulan: 'Mar 26', laba: 4.0 },
    { bulan: 'Apr 26', laba: 3.6 },
    { bulan: 'Mei 26', laba: 4.4 },
    { bulan: 'Jun 26', laba: 4.9 },
    { bulan: 'Jul 26', laba: 4.1 },
    { bulan: 'Agu 26', laba: 4.3 },
    { bulan: 'Sep 26', laba: 4.6 },
    { bulan: 'Okt 26', laba: 5.1 },
  ],
  agingPiutang: {
    belumJatuhTempo: 3000000,
    telat1sd7: 1200000,
    telat8sd30: 0,
    telatDiatas30: 0,
  },
  top10Model: [
    { nama: 'Samsung Galaxy A54 5G', terjual: 9, laba: 3150000 },
    { nama: 'iPhone 13 128 GB', terjual: 6, laba: 5400000 },
    { nama: 'Xiaomi Redmi Note 12', terjual: 5, laba: 1500000 },
    { nama: 'iPhone 11 64 GB', terjual: 4, laba: 2000000 },
    { nama: 'Vivo Y36 8/128 GB', terjual: 3, laba: 900000 },
    { nama: 'Oppo A57 4/64 GB', terjual: 2, laba: 700000 },
    { nama: 'Samsung Galaxy S21', terjual: 1, laba: 600000 },
    { nama: 'Realme C55', terjual: 1, laba: 300000 },
  ],
  bonusPalingSering: [
    { nama: 'Tempered Glass Samsung A54', qty: 12 },
    { nama: 'Casing Bening Anti Shock', qty: 10 },
    { nama: 'Kabel Data Type-C Braided', qty: 4 },
  ],
  kasMasuk: 94200000,
  kasKeluar: 84000000,
  arusKasBersih: 10200000,
  nilaiStokAktif: 412500000,
  unitStokAktif: 183,
  unitLebih30Hari: 12,
  servisModalTertahan: 3500000,
  servisUnitCount: 3,
};

export interface TrenHarian {
  tgl: number;
  label: string;
  omzet: number;
  laba: number;
  unit: number;
}

export const MOCK_TREN_30_HARI: TrenHarian[] = [
  { tgl: 1, label: '01', omzet: 3250000, laba: 350000, unit: 1 },
  { tgl: 2, label: '02', omzet: 2400000, laba: 280000, unit: 1 },
  { tgl: 3, label: '03', omzet: 7800000, laba: 900000, unit: 1 },
  { tgl: 4, label: '04', omzet: 4500000, laba: 520000, unit: 2 },
  { tgl: 5, label: '05', omzet: 12450000, laba: 1150000, unit: 3 },
  { tgl: 6, label: '06', omzet: 3100000, laba: 380000, unit: 1 },
  { tgl: 7, label: '07', omzet: 4800000, laba: 550000, unit: 2 },
  { tgl: 8, label: '08', omzet: 6200000, laba: 710000, unit: 2 },
  { tgl: 9, label: '09', omzet: 2350000, laba: 300000, unit: 1 },
  { tgl: 10, label: '10', omzet: 5100000, laba: 600000, unit: 2 },
  { tgl: 11, label: '11', omzet: 3600000, laba: 420000, unit: 1 },
  { tgl: 12, label: '12', omzet: 1950000, laba: 250000, unit: 1 },
  { tgl: 13, label: '13', omzet: 4200000, laba: 480000, unit: 1 },
  { tgl: 14, label: '14', omzet: 3800000, laba: 450000, unit: 1 },
  { tgl: 15, label: '15', omzet: 8500000, laba: 950000, unit: 2 },
  { tgl: 16, label: '16', omzet: 2700000, laba: 320000, unit: 1 },
  { tgl: 17, label: '17', omzet: 3300000, laba: 390000, unit: 1 },
  { tgl: 18, label: '18', omzet: 4100000, laba: 490000, unit: 1 },
  { tgl: 19, label: '19', omzet: 2900000, laba: 340000, unit: 1 },
  { tgl: 20, label: '20', omzet: 5400000, laba: 630000, unit: 2 },
  { tgl: 21, label: '21', omzet: 3100000, laba: 370000, unit: 1 },
  { tgl: 22, label: '22', omzet: 4600000, laba: 540000, unit: 2 },
  { tgl: 23, label: '23', omzet: 3800000, laba: 440000, unit: 1 },
  { tgl: 24, label: '24', omzet: 6100000, laba: 720000, unit: 2 },
  { tgl: 25, label: '25', omzet: 7900000, laba: 920000, unit: 2 },
  { tgl: 26, label: '26', omzet: 3400000, laba: 400000, unit: 1 },
  { tgl: 27, label: '27', omzet: 4200000, laba: 500000, unit: 1 },
  { tgl: 28, label: '28', omzet: 5800000, laba: 680000, unit: 2 },
  { tgl: 29, label: '29', omzet: 3200000, laba: 380000, unit: 1 },
  { tgl: 30, label: '30', omzet: 4500000, laba: 520000, unit: 2 },
];

export const MOCK_LAPORAN = MOCK_LAPORAN_OKTOBER;
export const MOCK_TREN_12_BULAN = MOCK_LAPORAN_OKTOBER.tren12Bulan;
export const MOCK_TOP_MODEL = MOCK_LAPORAN_OKTOBER.top10Model.map(m => ({ model: m.nama, terjual: m.terjual, laba: m.laba }));
export const MOCK_TOP_BONUS = MOCK_LAPORAN_OKTOBER.bonusPalingSering;


