export default async function preparePhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15_000_000) {
    throw new Error('Elegí fotos JPG, PNG o WebP de hasta 15 MB.');
  }
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar la foto.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let transparent = false;
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] < 255) { transparent = true; break; }
  }
  if (transparent) {
    const png = canvas.toDataURL('image/png').split(',')[1];
    if (png.length <= 2_666_668) return { mimeType: 'image/png', base64: png };
  }
  const mimeType = transparent ? 'image/webp' : 'image/jpeg';
  for (const quality of [0.82, 0.68, 0.5]) {
    const encoded = canvas.toDataURL(mimeType, quality);
    const actualMime = encoded.slice(5, encoded.indexOf(';'));
    const base64 = encoded.split(',')[1];
    if (base64.length <= 2_666_668) return { mimeType: actualMime, base64 };
  }
  throw new Error('Esta foto es demasiado grande incluso después de comprimirla.');
}
