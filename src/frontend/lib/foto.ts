// foto.ts — Kompresi foto di peramban sebelum dikirim ke server (PRD 04 bagian 11)

export interface FotoKompresi {
  base64Data: string; // tanpa prefix data:image/...
  dataUri: string;    // untuk pratinjau langsung di layar
  ukuranKB: number;
  lebar: number;
  tinggi: number;
}

/**
 * Kompres file gambar dari kamera atau galeri foto:
 * - Ukuran maksimal 2 MB (2000 KB) untuk Google Drive
 * - Mempertahankan ketajaman visual tinggi dengan skala proporsional
 * - Otomatis dioptimalkan agar tidak pernah melebihi batas 2 MB
 */
export function kompresFoto(file: File, maksDimensi = 1920, targetMaksKB = 2000): Promise<FotoKompresi> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Skala dimensi awal jika melebihi batas maks
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

        let kualitas = 0.85;
        let dataUri = canvas.toDataURL('image/jpeg', kualitas);
        let base64Data = dataUri.split(',')[1] || '';
        let ukuranKB = Math.round((base64Data.length * 3) / 4 / 1024);

        // Jika ukuran melebihi 2 MB, optimalkan kualitas dan dimensi secara bertahap sampai <= targetMaksKB
        let iterasi = 0;
        while (ukuranKB > targetMaksKB && iterasi < 5) {
          iterasi++;
          kualitas = Math.max(0.5, kualitas - 0.12);
          if (iterasi >= 2) {
            width = Math.round(width * 0.85);
            height = Math.round(height * 0.85);
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
          }
          dataUri = canvas.toDataURL('image/jpeg', kualitas);
          base64Data = dataUri.split(',')[1] || '';
          ukuranKB = Math.round((base64Data.length * 3) / 4 / 1024);
        }

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
