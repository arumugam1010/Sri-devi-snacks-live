import * as pdfjsLib from 'pdfjs-dist';

// Use CDN worker for reliable execution in both dev and production
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ConvertPdfOptions {
  scale?: number;
  onProgress?: (current: number, total: number) => void;
}

export interface ConvertedPdfFile extends File {
  pageCount?: number;
}

/**
 * Converts all pages (1 to N) of a PDF File into a crisp JPEG File object
 * Multi-page PDFs are stitched vertically into a single continuous high-resolution image with page dividers.
 */
export async function convertPdfToImage(
  pdfFile: File,
  optionsOrScale: number | ConvertPdfOptions = 2
): Promise<ConvertedPdfFile> {
  const scale = typeof optionsOrScale === 'number' ? optionsOrScale : (optionsOrScale?.scale ?? 2);
  const onProgress = typeof optionsOrScale === 'object' ? optionsOrScale.onProgress : undefined;

  const arrayBuffer = await pdfFile.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  // Single page PDF optimization
  if (numPages === 1) {
    if (onProgress) onProgress(1, 1);
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context not available');
    }

    canvas.height = Math.ceil(viewport.height);
    canvas.width = Math.ceil(viewport.width);

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
          }) as ConvertedPdfFile;
          imageFile.pageCount = 1;
          resolve(imageFile);
        },
        'image/jpeg',
        0.92
      );
    });
  }

  // Multi-page PDF: stitch all pages vertically
  // Adjust scale dynamically to remain within browser canvas bounds while preserving clarity
  let effectiveScale = scale;
  if (numPages >= 3) {
    effectiveScale = Math.min(effectiveScale, 1.8);
  }
  if (numPages >= 6) {
    effectiveScale = Math.min(effectiveScale, 1.5);
  }
  if (numPages >= 10) {
    effectiveScale = Math.min(effectiveScale, 1.2);
  }

  const pages: { page: any; viewport: any }[] = [];
  let maxWidth = 0;
  let totalHeight = 0;
  const gapHeight = 16; // 16px divider gap between pages

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: effectiveScale });
    pages.push({ page, viewport });
    if (viewport.width > maxWidth) {
      maxWidth = Math.ceil(viewport.width);
    }
    totalHeight += Math.ceil(viewport.height);
  }

  totalHeight += (numPages - 1) * gapHeight;

  const mainCanvas = document.createElement('canvas');
  mainCanvas.width = maxWidth;
  mainCanvas.height = totalHeight;
  const mainCtx = mainCanvas.getContext('2d');
  if (!mainCtx) {
    throw new Error('Canvas 2D context not available');
  }

  // Fill canvas background
  mainCtx.fillStyle = '#f8fafc';
  mainCtx.fillRect(0, 0, maxWidth, totalHeight);

  let currentY = 0;
  for (let i = 0; i < pages.length; i++) {
    const { page, viewport } = pages[i];
    if (onProgress) {
      onProgress(i + 1, numPages);
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Math.ceil(viewport.width);
    tempCanvas.height = Math.ceil(viewport.height);
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      throw new Error('Failed to create page canvas context');
    }

    await page.render({
      canvasContext: tempCtx,
      viewport: viewport,
    }).promise;

    // Center page horizontally if dimensions vary
    const offsetX = Math.floor((maxWidth - viewport.width) / 2);
    mainCtx.drawImage(tempCanvas, offsetX, currentY);

    currentY += Math.ceil(viewport.height);

    // Draw clean divider between pages
    if (i < pages.length - 1) {
      mainCtx.fillStyle = '#e2e8f0';
      mainCtx.fillRect(0, currentY, maxWidth, gapHeight);

      mainCtx.strokeStyle = '#94a3b8';
      mainCtx.lineWidth = 1.5;
      mainCtx.setLineDash([8, 6]);
      mainCtx.beginPath();
      mainCtx.moveTo(24, currentY + gapHeight / 2);
      mainCtx.lineTo(maxWidth - 24, currentY + gapHeight / 2);
      mainCtx.stroke();
      mainCtx.setLineDash([]);

      currentY += gapHeight;
    }
  }

  return new Promise((resolve, reject) => {
    mainCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to convert PDF canvas to image blob'));
          return;
        }
        const cleanName = pdfFile.name.replace(/\.[^/.]+$/, '');
        const imageFile = new File([blob], `${cleanName}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        }) as ConvertedPdfFile;
        imageFile.pageCount = numPages;
        resolve(imageFile);
      },
      'image/jpeg',
      0.92
    );
  });
}

/**
 * Renders all pages of a remote PDF URL into a stitched JPEG data URL
 */
export async function renderPdfUrlToDataUrl(pdfUrl: string, scale = 1.5): Promise<string> {
  const loadingTask = pdfjsLib.getDocument(pdfUrl);
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  if (numPages === 1) {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context not available');

    canvas.height = Math.ceil(viewport.height);
    canvas.width = Math.ceil(viewport.width);

    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.88);
  }

  let effectiveScale = scale;
  if (numPages >= 3) effectiveScale = Math.min(effectiveScale, 1.4);
  if (numPages >= 6) effectiveScale = Math.min(effectiveScale, 1.2);

  const pages: { page: any; viewport: any }[] = [];
  let maxWidth = 0;
  let totalHeight = 0;
  const gapHeight = 16;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: effectiveScale });
    pages.push({ page, viewport });
    if (viewport.width > maxWidth) {
      maxWidth = Math.ceil(viewport.width);
    }
    totalHeight += Math.ceil(viewport.height);
  }

  totalHeight += (numPages - 1) * gapHeight;

  const mainCanvas = document.createElement('canvas');
  mainCanvas.width = maxWidth;
  mainCanvas.height = totalHeight;
  const mainCtx = mainCanvas.getContext('2d');
  if (!mainCtx) throw new Error('Canvas 2D context not available');

  mainCtx.fillStyle = '#f8fafc';
  mainCtx.fillRect(0, 0, maxWidth, totalHeight);

  let currentY = 0;
  for (let i = 0; i < pages.length; i++) {
    const { page, viewport } = pages[i];
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Math.ceil(viewport.width);
    tempCanvas.height = Math.ceil(viewport.height);
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) throw new Error('Canvas context error');

    await page.render({ canvasContext: tempCtx, viewport }).promise;

    const offsetX = Math.floor((maxWidth - viewport.width) / 2);
    mainCtx.drawImage(tempCanvas, offsetX, currentY);

    currentY += Math.ceil(viewport.height);

    if (i < pages.length - 1) {
      mainCtx.fillStyle = '#e2e8f0';
      mainCtx.fillRect(0, currentY, maxWidth, gapHeight);
      mainCtx.strokeStyle = '#94a3b8';
      mainCtx.lineWidth = 1.5;
      mainCtx.setLineDash([8, 6]);
      mainCtx.beginPath();
      mainCtx.moveTo(20, currentY + gapHeight / 2);
      mainCtx.lineTo(maxWidth - 20, currentY + gapHeight / 2);
      mainCtx.stroke();
      mainCtx.setLineDash([]);
      currentY += gapHeight;
    }
  }

  return mainCanvas.toDataURL('image/jpeg', 0.88);
}
