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

// tesseract.js is a heavy WASM/JS payload - dynamic import, not a static one, so it
// only ever loads for someone who actually uses OCR, not on every page. Cached so
// repeated OCR calls (and the two passes within one call) reuse the same module/worker.
let tesseractModPromise = null;
function getTesseract() {
  if (!tesseractModPromise) tesseractModPromise = import('tesseract.js');
  return tesseractModPromise;
}

let workerPromise = null;
async function getWorker() {
  if (!workerPromise) {
    workerPromise = getTesseract().then(({ createWorker }) => createWorker('eng')).catch((e) => {
      workerPromise = null; // let the next call retry instead of caching a failure
      throw e;
    });
  }
  return workerPromise;
}

async function recognizeLines(worker, canvas, psm) {
  await worker.setParameters({ tessedit_pageseg_mode: psm });
  const { data } = await worker.recognize(canvas);
  return data.text.split('\n').map((l) => l.trim()).filter((l) => l.length > 1);
}

// Runs OCR on a card photo and returns cleaned, deduplicated candidate lines - shared
// by the manual "Extract Text" tool (OcrAssist.jsx) and the Scan page's automatic card
// identification, so both benefit from the same preprocessing and Tesseract tuning.
// Two passes, each with a page-segmentation mode suited to what's actually there:
export async function extractCardText(imageUrl) {
  const [canvas, { PSM }, worker] = await Promise.all([preprocess(imageUrl), getTesseract(), getWorker()]);

  // The name band is a single line of large text once cropped - SINGLE_LINE reads it
  // as one continuous line. SPARSE_TEXT (used here previously) assumes scattered,
  // unrelated words with no order and was fragmenting the name into separate pieces.
  const bandLines = await recognizeLines(worker, cropTop(canvas, NAME_BAND_HEIGHT_FRACTION), PSM.SINGLE_LINE);
  // The full card genuinely has scattered, unrelated text blocks in different areas
  // (name, type line, rules text, set info) - sparse text mode fits that instead.
  const fullLines = await recognizeLines(worker, canvas, PSM.SPARSE_TEXT);

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
