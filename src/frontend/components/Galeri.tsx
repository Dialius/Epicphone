
import { Button } from './ui/Button';
import { InputTeks } from './ui/InputTeks';
import { ChipStatus } from './ui/ChipStatus';
import { Lencana } from './ui/Lencana';

export function Galeri() {
  return (
    <div class="galeri-container" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1>Galeri Komponen (Dev Only)</h1>
      
      <section>
        <h2>Tombol</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="utama">Utama</Button>
          <Button variant="sekunder">Sekunder</Button>
          <Button variant="bahaya">Bahaya</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
        </div>
      </section>

      <section>
        <h2>Input Teks</h2>
        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', maxWidth: '300px' }}>
          <InputTeks label="Nama Default" placeholder="Ketik nama..." />
          <InputTeks label="Dengan Error" placeholder="Ketik..." error="Wajib diisi" />
          <InputTeks label="Disabled" disabled value="Tidak bisa diedit" />
        </div>
      </section>

      <section>
        <h2>Chip Status</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <ChipStatus status="Tersedia" />
          <ChipStatus status="Terjual" />
          <ChipStatus status="Booking" />
          <ChipStatus status="Retur" />
        </div>
      </section>

      <section>
        <h2>Lencana</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Lencana count={5} />
          <Lencana count={12} />
          <Lencana count={150} />
        </div>
      </section>
    </div>
  );
}
