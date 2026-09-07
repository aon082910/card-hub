import React, { useEffect, useRef, useState } from 'react';

// Decodes barcodes (PSA/BGS/CGC cert barcodes are usually Code128/QR) and QR codes
// (Card-Hub's own printed labels encode a card detail URL) from the live camera feed.
export default function BarcodeScanner({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          if (result && !cancelled) {
            setLastResult(result.getText());
          }
        });
        if (cancelled) { controls.stop(); return; }
        controlsRef.current = controls;
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not start barcode scanner');
      }
    })();
    return () => {
      cancelled = true;
      if (controlsRef.current) controlsRef.current.stop();
    };
  }, []);

  function accept() {
    if (lastResult) onDetect(lastResult);
  }

  return (
    <div className="camera-modal">
      <div className="camera-panel">
        <h3>Scan Barcode / QR</h3>
        {error && <p className="error-text">{error}. Grant camera permission and use HTTPS or localhost.</p>}
        <video ref={videoRef} playsInline muted className="camera-video" />
        {lastResult && <p className="hint-text">Detected: <strong>{lastResult}</strong></p>}
        <div className="camera-controls">
          <button className="btn primary" disabled={!lastResult} onClick={accept}>Use This Value</button>
          <button className="btn" onClick={() => { if (controlsRef.current) controlsRef.current.stop(); onClose(); }}>Close</button>
        </div>
      </div>
    </div>
  );
}
