import React, { useEffect } from 'react';

// Full-size view for a gallery thumbnail - vertical and horizontal card photos
// alike get shown at their native aspect ratio instead of the cropped grid thumb.
export default function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="camera-modal lightbox-modal" onClick={onClose}>
      <img className="lightbox-img" src={src} alt={alt} onClick={(e) => e.stopPropagation()} />
      <button className="btn lightbox-close" onClick={onClose}>✕</button>
    </div>
  );
}
