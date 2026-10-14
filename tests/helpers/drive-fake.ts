// drive-fake.ts — Google Drive palsu di memori (folder, berkas, PDF, thumbnail, makeCopy) untuk menguji
// Nota, Foto, Backup, dan Laporan memakai kode asli.

type Blob = { nama: string; tipe: string; bytes: number[]; setName(n: string): Blob; getBytes(): number[]; getContentType(): string; getAs(t: string): Blob };

export class BerkasPalsu {
  dihapus = false;
  sharing = 'PRIVATE';
  penonton: string[] = [];
  constructor(public id: string, public nama: string, public blob: Blob, public induk: FolderPalsu | null, public dibuat: Date, public kopiDari?: string) {}
  getId() { return this.id; }
  getName() { return this.nama; }
  setName(n: string) { this.nama = n; return this; }
  getUrl() { return `https://drive.google.com/file/d/${this.id}/view`; }
  getSize() { return this.blob.bytes.length; }
  getBlob() { return this.blob; }
  getAs(t: string) { return buatBlob(this.nama, t, this.blob.bytes); }
  getThumbnail() { return buatBlob('thumb', 'image/png', [1, 2, 3]); }
  getDateCreated() { return this.dibuat; }
  isTrashed() { return this.dihapus; }
  setTrashed(v: boolean) { this.dihapus = v; if (v && this.induk) this.induk.berkas = this.induk.berkas.filter(b => b !== this); return this; }
  moveTo(f: FolderPalsu) { if (this.induk) this.induk.berkas = this.induk.berkas.filter(b => b !== this); this.induk = f; f.berkas.push(this); return this; }
  setSharing(a: string) { this.sharing = a; return this; }
  addViewer(e: string) { this.penonton.push(e); return this; }
  makeCopy(nama: string, f: FolderPalsu) { const b = new BerkasPalsu('f' + (++dunia.n), nama, this.blob, f, dunia.sekarang(), this.id); f.berkas.push(b); dunia.berkasById.set(b.id, b); return b; }
}

export class FolderPalsu {
  anak: FolderPalsu[] = [];
  berkas: BerkasPalsu[] = [];
  constructor(public id: string, public nama: string) {}
  getId() { return this.id; }
  getName() { return this.nama; }
  getUrl() { return `https://drive.google.com/drive/folders/${this.id}`; }
  private iter<T>(arr: T[]) { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; }
  getFolders() { return this.iter(this.anak); }
  getFoldersByName(n: string) { return this.iter(this.anak.filter(f => f.nama === n)); }
  createFolder(n: string) { const f = new FolderPalsu('d' + (++dunia.n), n); this.anak.push(f); return f; }
  getFiles() { return this.iter([...this.berkas]); }
  getFilesByName(n: string) { return this.iter(this.berkas.filter(b => b.nama === n)); }
  createFile(blob: Blob) { const b = new BerkasPalsu('f' + (++dunia.n), blob.nama, blob, this, dunia.sekarang()); this.berkas.push(b); dunia.berkasById.set(b.id, b); return b; }
}

const dunia = { n: 0, berkasById: new Map<string, BerkasPalsu>(), sekarang: () => new Date() };

function buatBlob(nama: string, tipe: string, bytes: number[]): Blob {
  const b: Blob = {
    nama, tipe, bytes,
    setName(n: string) { b.nama = n; return b; },
    getBytes() { return b.bytes; },
    getContentType() { return b.tipe; },
    getAs(t: string) { return buatBlob(b.nama, t, b.bytes); },
  };
  return b;
}

export interface DrivePalsu {
  root: FolderPalsu;
  folder: (jalur: string) => FolderPalsu | null;
  semuaBerkas: () => BerkasPalsu[];
  berkas: (id: string) => BerkasPalsu | undefined;
  spreadsheetId: string;
}

/** Pasang DriveApp/HtmlService/Utilities(base64) palsu. Buat struktur folder PRD 09 lewat `siapkanFolder`. */
export function pasangDriveFake(opsi: { sekarang?: () => Date } = {}): DrivePalsu {
  const g = globalThis as any;
  dunia.n = 0; dunia.berkasById.clear(); dunia.sekarang = opsi.sekarang ?? (() => new Date());
  const root = new FolderPalsu('root', '(root)');
  const dbFile = new BerkasPalsu('ss-palsu', 'EPICPHONE_DB_UTAMA', buatBlob('db', 'application/vnd.google-apps.spreadsheet', Array.from({ length: 5000 }, (_, i) => i % 255)), null, dunia.sekarang());
  dunia.berkasById.set('ss-palsu', dbFile);
  g.DriveApp = {
    Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK', PRIVATE: 'PRIVATE' }, Permission: { VIEW: 'VIEW' },
    getFoldersByName: (n: string) => root.getFoldersByName(n),
    getFileById: (id: string) => { const f = dunia.berkasById.get(id); if (!f) throw new Error('Berkas tidak ada: ' + id); return f; },
    getRootFolder: () => root,
  };
  g.HtmlService = { createHtmlOutput: (html: string) => ({ getBlob: () => buatBlob('x.html', 'text/html', Array.from(html).map(c => c.charCodeAt(0) % 256)) }) };
  g.Utilities = {
    ...(g.Utilities || {}),
    base64Encode: (b: number[]) => Buffer.from(b).toString('base64'),
    base64Decode: (s: string) => Array.from(Buffer.from(s, 'base64')),
    newBlob: (bytes: number[], tipe: string, nama: string) => buatBlob(nama, tipe, bytes),
  };
  // getAs('application/pdf') pada HTML menghasilkan "PDF" yang memuat teks aslinya (agar bisa diperiksa)
  const asli = buatBlob;
  void asli;
  return {
    root,
    folder: (jalur: string) => jalur.split('/').reduce<FolderPalsu | null>((f, n) => (f ? f.anak.find(x => x.nama === n) ?? null : null), root),
    semuaBerkas: () => [...dunia.berkasById.values()].filter(b => !b.dihapus),
    berkas: (id: string) => dunia.berkasById.get(id),
    spreadsheetId: 'ss-palsu',
  };
}

/** Buat folder-folder yang diharapkan sistem (meniru hasil setupAwal) */
export function siapkanFolder(d: DrivePalsu, jalur: string[]): void {
  jalur.forEach(j => j.split('/').reduce<FolderPalsu>((f, n) => f.anak.find(x => x.nama === n) ?? f.createFolder(n), d.root));
}
