// Galat.ts — galat bisnis dengan kode, agar layar bisa menampilkan pesan manusia
// dan menentukan tindakan (mis. IMEI_GANDA). Galat lain dianggap ERROR_SISTEM.

export class GalatBisnis extends Error {
  kode: string;
  constructor(kode: string, pesan: string) {
    super(pesan);
    this.kode = kode;
    this.name = 'GalatBisnis';
    Object.setPrototypeOf(this, GalatBisnis.prototype);
  }
}
