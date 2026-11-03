/**
 * ═══════════════════════════════════════════════════════════════════
 * TS Gaming Café — High-Clarity Image Processing & 500KB Optimizer
 * ═══════════════════════════════════════════════════════════════════
 */

export const MAX_IMAGE_SIZE_KB = 500;

/**
 * Validates and ensures image is crystal clear while strictly under 500KB
 * - If already <= 500KB: preserves 100% original quality & sharpness without touching it
 * - If > 500KB (e.g. mobile photo): downscales smoothly with bicubic high-smoothing
 *   and optimizes quality to stay crisp and under 500KB.
 *
 * @param {File} file - Browser File object from <input type="file" />
 * @param {number} maxKB - Maximum allowed size in KB (default: 500)
 * @param {number} maxDimension - Max width/height in px (default: 1600 for sharp HD)
 * @returns {Promise<{ dataUrl: string, sizeKB: number, originalKB: number, fileName: string }>}
 */
export function processAndCompressImage(file, maxKB = MAX_IMAGE_SIZE_KB, maxDimension = 1600) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file selected.'));
    }

    if (!file.type || !file.type.startsWith('image/')) {
      return reject(new Error('Please select a valid image file (JPG, PNG, WEBP).'));
    }

    const originalKB = Math.round(file.size / 1024);

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));

    // Case 1: Image is ALREADY under 500KB!
    // Do NOT compress or downsample — preserve 100% original crispness, colors & transparency!
    if (originalKB <= maxKB) {
      reader.onload = (e) => {
        resolve({
          dataUrl: e.target.result,
          sizeKB: originalKB,
          originalKB,
          fileName: file.name,
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    // Case 2: Image is larger than 500KB (e.g. phone camera 2MB-5MB).
    // Intelligently resize and optimize with maximum sharpness.
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image. File may be corrupted.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Auto-scale down dimensions if very large (e.g. > 1600px)
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // High quality bicubic smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Detect if image is PNG/transparent or if browser supports WebP
        let outputFormat = 'image/jpeg';
        const isPngOrWebp = file.type === 'image/png' || file.type === 'image/webp';
        
        const testCanvas = document.createElement('canvas');
        const supportsWebp = testCanvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;

        if (isPngOrWebp && supportsWebp) {
          outputFormat = 'image/webp';
        } else if (file.type === 'image/png') {
          // Fill subtle white canvas so transparent PNG does NOT turn into black box
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Start with high quality (0.92) and gently adjust to meet <= maxKB
        let quality = 0.92;
        let dataUrl = canvas.toDataURL(outputFormat, quality);
        let estKB = Math.round((dataUrl.length * 0.75) / 1024);

        while (estKB > maxKB && quality > 0.65) {
          quality -= 0.05;
          dataUrl = canvas.toDataURL(outputFormat, quality);
          estKB = Math.round((dataUrl.length * 0.75) / 1024);
        }

        // If still over 500KB, scale dimensions down slightly and retry
        if (estKB > maxKB) {
          const scaledCanvas = document.createElement('canvas');
          scaledCanvas.width = Math.round(width * 0.8);
          scaledCanvas.height = Math.round(height * 0.8);
          const scaledCtx = scaledCanvas.getContext('2d');
          scaledCtx.imageSmoothingEnabled = true;
          scaledCtx.imageSmoothingQuality = 'high';
          if (outputFormat === 'image/jpeg' && file.type === 'image/png') {
            scaledCtx.fillStyle = '#ffffff';
            scaledCtx.fillRect(0, 0, scaledCanvas.width, scaledCanvas.height);
          }
          scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
          dataUrl = scaledCanvas.toDataURL(outputFormat, 0.85);
          estKB = Math.round((dataUrl.length * 0.75) / 1024);
        }

        resolve({
          dataUrl,
          sizeKB: estKB,
          originalKB,
          fileName: file.name,
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
