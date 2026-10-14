// foto.ts — Kompresi foto di peramban sebelum dikirim ke server (PRD 04 bagian 11)

export interface FotoKompresi {
  base64Data: string; // tanpa prefix data:image/...
  dataUri: string;    // untuk pratinjau langsung di layar
  ukuranKB: number;
  lebar: number;
  tinggi: number;
}

/**
 * Kompres file gambar dari kamera / galeri:
 * - Sisi terpanjang maksimal 1600px
 * - Ekspor JPEG kualitas ~0.8
 * - Target ukuran di bawah 400 KB
 */
export function kompresFoto(file: File, maksDimensi = 1600, kualitas = 0.8): Promise<FotoKompresi> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Skala dimensi jika melebihi batas maks
        if (width > height) {
          if (width > maksDimensi) {
            height = Math.round((height * maksDimensi) / width);
            width = maksDimensi;
          }
        } else {
          if (height > maksDimensi) {
            width = Math.round((width * maksDimensi) / height);
            height = maksDimensi;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal menginisialisasi canvas untuk kompresi foto.'));
          return;
        }

        // Gambar ke canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Ekspor JPEG kualitas 0.8
        const dataUri = canvas.toDataURL('image/jpeg', kualitas);
        const base64Data = dataUri.split(',')[1] || '';
        const ukuranKB = Math.round((base64Data.length * 3) / 4 / 1024);

        resolve({
          base64Data,
          dataUri,
          ukuranKB,
          lebar: width,
          tinggi: height,
        });
      };

      img.onerror = () => reject(new Error('Gagal memproses berkas gambar.'));
      img.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Gagal membaca berkas.'));
    reader.readAsDataURL(file);
  });
}
