function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image for OCR'));
    img.src = src;
  });
}

// Trading card photos are hard for OCR straight off the camera: small stylized text
// over busy artwork, sometimes a lower-res source image. Upscaling small images and
// stretching contrast to grayscale gives Tesseract a much cleaner signal than the raw
// photo - this is the single biggest lever for accuracy here, more than any Tesseract
// setting.
async function preprocess(imageUrl) {
  const img = await loadImage(imageUrl);
  const scale = img.width < 1200 ? Math.min(3, Math.ceil(1200 / img.width)) : 1;
  const canvas = document.createElement('canvas');
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  const gray = new Float32Array(data.length / 4);
  let min = 255;
  let max = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const range = Math.max(1, max - min);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    data[i] = data[i + 1] = data[i + 2] = ((gray[p] - min) / range) * 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

let workerPromise = null;
async function getWorker() {
  if (!workerPromise) {
    // Dynamic import, not a static one - tesseract.js is a heavy WASM/JS payload that
    // should only ever load for someone who actually uses OCR, not on every page.
    workerPromise = (async () => {
      const { createWorker, PSM } = await import('tesseract.js');
      const worker = await createWorker('eng');
      // Sparse text: a card photo is scattered blocks of text over artwork, not a
      // uniform printed page - Tesseract's default "fully automatic" layout mode
      // often misreads or skips text sitting close to graphics.
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      return worker;
    })().catch((e) => {
      workerPromise = null; // let the next call retry instead of caching a failure
      throw e;
    });
  }
  return workerPromise;
}

// Runs OCR on a card photo and returns cleaned, deduplicated candidate lines - shared
// by the manual "Extract Text" tool (OcrAssist.jsx) and the Scan page's automatic card
// identification, so both benefit from the same preprocessing and Tesseract tuning.
export async function extractCardText(imageUrl) {
  const canvas = await preprocess(imageUrl);
  const worker = await getWorker();
  const { data } = await worker.recognize(canvas);
  const seen = new Set();
  const lines = [];
  for (const raw of data.text.split('\n')) {
    const line = raw.trim();
    if (line.length > 1 && !seen.has(line)) {
      seen.add(line);
      lines.push(line);
    }
  }
  return lines;
}
