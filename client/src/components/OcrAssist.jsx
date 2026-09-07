import React, { useState } from 'react';

// Best-effort text extraction from a card photo using on-device OCR (tesseract.js).
// There's no card-recognition database wired in (that would need a licensed card
// catalog/API) - this just surfaces raw text found on the card (player name, set
// text, card number) so you can copy the relevant bits into the form fields.
export default function OcrAssist({ imageUrl }) {
  const [lines, setLines] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);

  async function runOcr() {
    setRunning(true);
    setError(null);
    setLines(null);
    try {
      const Tesseract = await import('tesseract.js');
      const { data } = await Tesseract.recognize(imageUrl, 'eng');
      const found = data.text.split('\n').map((l) => l.trim()).filter(Boolean);
      setLines(found.length ? found : ['(no text detected)']);
    } catch (e) {
      setError(e.message || 'OCR failed');
    } finally {
      setRunning(false);
    }
  }

  async function copy(line) {
    try {
      await navigator.clipboard.writeText(line);
      setCopied(line);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="ocr-assist">
      <button className="btn" onClick={runOcr} disabled={running}>{running ? 'Reading card...' : '🔎 Extract Text (OCR)'}</button>
      {error && <p className="error-text">{error}</p>}
      {lines && (
        <ul className="ocr-lines">
          {lines.map((l, i) => (
            <li key={i}>
              <span>{l}</span>
              <button className="btn small" onClick={() => copy(l)}>{copied === l ? 'Copied!' : 'Copy'}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
