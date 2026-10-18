/**
 * Compresses an image File or Blob into a square (1:1) compressed base64 JPEG string.
 * Resizes to target dimension (default 200x200) and compresses with JPEG quality 0.82.
 * Output file size is ultra-lightweight (typically 8KB - 16KB).
 */
export async function compressImageFile(
  file: File | Blob,
  targetSize: number = 200,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          // Center-crop square logic so avatar is never distorted
          const minSide = Math.min(img.width, img.height);
          const startX = (img.width - minSide) / 2;
          const startY = (img.height - minSide) / 2;

          ctx.drawImage(
            img,
            startX,
            startY,
            minSide,
            minSide,
            0,
            0,
            targetSize,
            targetSize
          );

          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Gagal memuat gambar'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.readAsDataURL(file);
  });
}

/**
 * Captures a frame from a live HTMLVideoElement, center crops to square,
 * and compresses it to target dimension (default 200x200) base64 JPEG.
 */
export function captureAndCompressVideoFrame(
  video: HTMLVideoElement,
  targetSize: number = 200,
  quality: number = 0.82
): string {
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  const videoWidth = video.videoWidth || 640;
  const videoHeight = video.videoHeight || 480;
  const minSide = Math.min(videoWidth, videoHeight);
  const startX = (videoWidth - minSide) / 2;
  const startY = (videoHeight - minSide) / 2;

  // Mirror effect for natural selfie preview
  ctx.save();
  ctx.translate(targetSize, 0);
  ctx.scale(-1, 1);

  ctx.drawImage(
    video,
    startX,
    startY,
    minSide,
    minSide,
    0,
    0,
    targetSize,
    targetSize
  );
  ctx.restore();

  return canvas.toDataURL('image/jpeg', quality);
}
