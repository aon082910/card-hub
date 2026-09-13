import React, { useRef, useState } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, cropToImg } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Manual OCR crop: for anyone who'd rather draw a box around the exact text they want
// read than rely on auto-detection. OCR is fundamentally a segmentation problem on
// stylized card text over artwork - the surest way to get a clean read is to just tell
// it exactly where to look.
export default function ImageCropper({ imageUrl, onConfirm, onCancel }) {
  const imgRef = useRef(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);

  function onImageLoad(e) {
    const { width, height } = e.currentTarget;
    const initial = centerCrop(
      makeAspectCrop({ unit: '%', width: 80 }, 3, width, height),
      width, height,
    );
    setCrop(initial);
  }

  async function handleConfirm() {
    if (!completedCrop || !imgRef.current || !completedCrop.width || !completedCrop.height) return;
    const url = await cropToImg(imgRef.current, completedCrop);
    onConfirm(url);
  }

  return (
    <div className="camera-modal" onClick={onCancel}>
      <div className="camera-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <h3>Crop to the text you want read</h3>
        <p className="hint-text">Drag the box over the name (or any text) and confirm - OCR runs on just that region.</p>
        <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}>
          <img ref={imgRef} src={imageUrl} alt="Crop target" onLoad={onImageLoad} style={{ maxWidth: '100%', maxHeight: '60vh' }} />
        </ReactCrop>
        <div className="camera-controls">
          <button className="btn primary" disabled={!completedCrop?.width} onClick={handleConfirm}>Extract Text From Selection</button>
          <button className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
