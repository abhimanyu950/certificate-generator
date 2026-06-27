/**
 * Compresses a raster image (PNG, JPEG, JPG) to WebP format with the specified quality in the browser.
 * Bypasses compression for SVG vector graphics to preserve quality.
 */
export const compressImageToWebP = (
  file: File | Blob,
  quality = 0.75
): Promise<{ blob: Blob; filename: string }> => {
  const isSvg =
    file.type === 'image/svg+xml' ||
    (file instanceof File && file.name.toLowerCase().endsWith('.svg'));

  const originalName = file instanceof File ? file.name : 'image';

  if (isSvg) {
    console.log(`[ImageCompressor] SVG detected, bypassing compression: ${originalName}`);
    return Promise.resolve({ blob: file, filename: originalName });
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get 2D context from canvas');
        }

        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const lastDotIndex = originalName.lastIndexOf('.');
              const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
              const webpFilename = `${baseName}.webp`;
              console.log(
                `[ImageCompressor] Compressed ${originalName} (${(file.size / 1024).toFixed(1)} KB) ` +
                `to WebP (${(blob.size / 1024).toFixed(1)} KB), ratio: ${((blob.size / file.size) * 100).toFixed(1)}%`
              );
              resolve({ blob, filename: webpFilename });
            } else {
              reject(new Error('Canvas to Blob conversion returned null'));
            }
          },
          'image/webp',
          quality
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      console.warn('[ImageCompressor] Image loading failed, returning original file as-is:', err);
      resolve({ blob: file, filename: originalName });
    };
  });
};
