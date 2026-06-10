export const blobToDataUrl = async (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
};

export const imageBlobToHeroDataUrl = async (blob: Blob, maxSize = 900): Promise<string> => {
  const sourceUrl = URL.createObjectURL(blob);

  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = sourceUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Hero image load failed'));
    });

    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return blobToDataUrl(blob);

    context.drawImage(image, 0, 0, width, height);

    const output = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((nextBlob) => resolve(nextBlob), 'image/jpeg', 0.86);
    });

    return blobToDataUrl(output ?? blob);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
};
