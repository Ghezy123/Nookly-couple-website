// Kompresi ringan di sisi client supaya aman disimpan (localStorage ~5MB).
export const MAX_PHOTOS = 6;

/** Coba decode via <img>, fallback ke createImageBitmap (handle beberapa format Windows Camera). */
async function decodeImage(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  let canvas: HTMLCanvasElement | null = null;
  try {
    // Metode 1: <img> tag biasa
    canvas = await new Promise<HTMLCanvasElement>((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d')?.drawImage(img, 0, 0);
        res(c);
      };
      img.onerror = () => rej(new Error('img_fail'));
      img.src = url;
    });
  } catch {
    // Metode 2: createImageBitmap – handle beberapa format JPEG dari kamera Windows
    if (typeof createImageBitmap !== 'undefined') {
      let bmp: ImageBitmap | null = null;
      try {
        bmp = await createImageBitmap(file);
        canvas = document.createElement('canvas');
        canvas.width = bmp.width; canvas.height = bmp.height;
        canvas.getContext('2d')?.drawImage(bmp, 0, 0);
      } finally {
        bmp?.close();
      }
    }
    if (!canvas) throw new Error(`${file.name} — format gambar tidak didukung browser`);
  } finally {
    URL.revokeObjectURL(url);
  }
  return canvas!;
}

export async function compressImage(file: File, maxSide = 1280, quality = 0.72): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name} bukan file gambar`);
  const src = await decodeImage(file);
  const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(src.width * scale);
  canvas.height = Math.round(src.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas tidak tersedia');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}
