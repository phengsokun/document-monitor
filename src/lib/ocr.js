import { createWorker } from 'tesseract.js';
import { BrowserMultiFormatReader } from '@zxing/browser';

let worker = null;
const barcodeReader = new BrowserMultiFormatReader();

async function initOCR() {
  if (worker) return worker;
  worker = await createWorker('eng');
  return worker;
}

export async function scanBarcode(imageData) {
  try {
    const img = new Image();
    img.src = imageData;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    const result = await barcodeReader.decodeFromImageElement(img);
    return result ? result.getText() : null;
  } catch {
    return null;
  }
}

export async function extractTrackingNumber(imageData) {
  try {
    const [barcodeResult, ocrResult] = await Promise.all([
      scanBarcode(imageData).catch(() => null),
      (async () => {
        const w = await initOCR();
        const { data: { text } } = await w.recognize(imageData);
        return findTrackingNumber(text);
      })().catch(() => null),
    ]);

    return barcodeResult || ocrResult || null;
  } catch (err) {
    console.error('Scan error:', err);
    return null;
  }
}

function findTrackingNumber(text) {
  const lines = text.split(/[\n\r]+/).map((l) => l.trim()).filter((l) => l.length > 0);

  // Third row — often the tracking number on some document formats
  const thirdRow = lines.length >= 3 ? lines[2] : null;

  // Try the third row first if it looks like a tracking number
  if (thirdRow) {
    const fromThird = matchPattern(thirdRow);
    if (fromThird) return fromThird;
  }

  // Scan all lines
  const cleaned = text.replace(/\s+/g, ' ').trim();
  for (const line of lines) {
    const result = matchPattern(line);
    if (result) return result;
  }

  // Fallback: scan the raw text
  return matchPattern(cleaned);
}

function matchPattern(str) {
  // Tracking numbers: alphanumeric with digits, 8-30 chars
  const patterns = [
    /\b([A-Z]{2,4}\d{6,12}[A-Z]{0,2})\b/i,
    /\b(\d{10,22})\b/,
    /\b([A-Z]{2}\d{9}[A-Z]{2})\b/i,
    /\b([A-Z0-9]{8,30})\b/i,
  ];

  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match) return match[1].toUpperCase();
  }

  return null;
}

export async function terminateOCR() {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}
