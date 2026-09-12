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

// Pokemon, Magic, and Yu-Gi-Oh all put the card name in a band across the very top of
// the card (roughly the top fifth) - sports cards vary too much layout-to-layout for
// this to hold universally, but for the three TCGs this holds reliably enough to crop
// straight to it, giving Tesseract a small, artwork-free strip to read instead of
// having the name buried among dozens of noisier lines pulled off the full card.
const NAME_BAND_HEIGHT_FRACTION = 0.2;

function cropTop(canvas, heightFraction) {
  const cropped = document.createElement('canvas');
  cropped.width = canvas.width;
  cropped.height = Math.round(canvas.height * heightFraction);
  cropped.getContext('2d').drawImage(canvas, 0, 0, canvas.width, cropped.height, 0, 0, canvas.width, cropped.height);
  return cropped;
}

async function recognizeLines(worker, canvas) {
  const { data } = await worker.recognize(canvas);
  return data.text.split('\n').map((l) => l.trim()).filter((l) => l.length > 1);
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
// Reads the top name-band first so the card's actual name (not artwork noise) is the
// first, most likely candidate line, then falls back to the full image for anything
// else (set info, rules text) or for layouts the name-band guess doesn't fit.
export async function extractCardText(imageUrl) {
  const canvas = await preprocess(imageUrl);
  const worker = await getWorker();
  const bandLines = await recognizeLines(worker, cropTop(canvas, NAME_BAND_HEIGHT_FRACTION));
  const fullLines = await recognizeLines(worker, canvas);

  const seen = new Set();
  const lines = [];
  for (const line of [...bandLines, ...fullLines]) {
    if (!seen.has(line)) {
      seen.add(line);
      lines.push(line);
    }
  }
  return lines;
}
