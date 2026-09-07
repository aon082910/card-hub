import React, { useEffect, useRef, useState } from 'react';

// Works both for a USB webcam plugged into the machine running the browser,
// and for a phone: open Card-Hub's URL on your phone's browser (same LAN as
// the Unraid server) and this uses the phone's rear camera via getUserMedia.
export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    startStream();
    return stopStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  async function startStream() {
    stopStream();
    setError(null);
    try {
      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: 'environment' } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((d) => d.kind === 'videoinput'));
    } catch (e) {
      setError(e.message || 'Could not access camera');
    }
  }

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) onCapture(blob);
    }, 'image/jpeg', 0.92);
  }

  return (
    <div className="camera-modal">
      <div className="camera-panel">
        <h3>Scan Card</h3>
        {error && <p className="error-text">{error}. Grant camera permission and use HTTPS or localhost.</p>}
        <video ref={videoRef} playsInline muted className="camera-video" />
        <div className="camera-controls">
          {devices.length > 1 && (
            <select value={deviceId || ''} onChange={(e) => setDeviceId(e.target.value || null)}>
              <option value="">Default camera</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>
              ))}
            </select>
          )}
          <button className="btn primary" onClick={capture}>Capture</button>
          <button className="btn" onClick={() => { stopStream(); onClose(); }}>Close</button>
        </div>
      </div>
    </div>
  );
}
