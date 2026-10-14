import { render } from 'preact';
import { App } from './app';
import { LOGO_DATA_URI } from './lib/logo';

// Ikon tab = logo Epic Phone. Memakai ulang logo yang sudah ada di berkas (tanpa menambah ukuran Index.html).
// Di Apps Script, halaman tampil di dalam iframe sehingga ikon tab ditentukan backend (doGet -> setFaviconUrl);
// baris ini berlaku saat aplikasi dibuka langsung (mode demo/pengembangan).
{
  const ikon = document.createElement('link');
  ikon.rel = 'icon';
  ikon.type = 'image/jpeg';
  ikon.href = LOGO_DATA_URI;
  document.head.appendChild(ikon);
}

render(<App />, document.getElementById('app')!);
