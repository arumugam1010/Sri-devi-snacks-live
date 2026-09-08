import * as pdfjsLib from 'pdfjs-dist';

// Use CDN worker for reliable execution in both dev and production
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Converts page 1 of a PDF File into a crisp JPEG File object
 */
export async function convertPdfToImage(pdfFile: File, scale = 2): Promise<File> {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context not available');
  }

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to convert PDF canvas to image blob'));
          return;
        }
        const cleanName = pdfFile.name.replace(/\.[^/.]+$/, '');
        const imageFile = new File([blob], `${cleanName}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        resolve(imageFile);
      },
      'image/jpeg',
      0.92
    );
  });
}

/**
 * Renders page 1 of a remote PDF URL into a JPEG data URL
 */
export async function renderPdfUrlToDataUrl(pdfUrl: string, scale = 1.5): Promise<string> {
  const loadingTask = pdfjsLib.getDocument(pdfUrl);
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context not available');

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.88);
}
