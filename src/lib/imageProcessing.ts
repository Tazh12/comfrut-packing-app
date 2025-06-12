export interface ProcessedImage {
  dataUrl: string;
  file: File;
}

export const processImage = async (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<ProcessedImage> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;

      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        // Create canvas and context
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Convert data URL to Blob
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            // Create new File from Blob
            const processedFile = new File(
              [blob],
              file.name,
              { type: 'image/jpeg', lastModified: Date.now() }
            );

            resolve({
              dataUrl,
              file: processedFile
            });
          })
          .catch(reject);
      };

      img.onerror = () => {
        reject(new Error('Error loading image'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };

    reader.readAsDataURL(file);
  });
}; 