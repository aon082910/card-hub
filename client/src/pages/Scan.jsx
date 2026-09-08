import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n.jsx';
import { api } from '../api.js';

const SAMPLE_W = 48;
const SAMPLE_H = 32;
const OCCUPY_TICKS = 2; // consecutive occupied samples required before we snap (~ TICK_MS * this)
const CLEAR_TICKS = 2; // consecutive empty samples required before re-arming
const FLASH_MS = 450;
const TICK_MS = 90;

function sensitivityToThreshold(sensitivity) {
  // sensitivity 0-100 -> threshold ~32 (insensitive) down to ~4 (very sensitive)
  return 32 - (sensitivity / 100) * 28;
}

export default function Scan() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const sampleCanvasRef = useRef(null);
  const intervalRef = useRef(null);

  const baselineRef = useRef(null);
  const machineRef = useRef('empty'); // empty | cooldown
  const occupiedStreakRef = useRef(0);
  const clearStreakRef = useRef(0);
  const sideRef = useRef('front');
  const autoAlternateRef = useRef(true);

  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [error, setError] = useState(null);

  const [autoCapture, setAutoCapture] = useState(true);
  const [sensitivity, setSensitivity] = useState(65);
  const [zoneTop, setZoneTop] = useState(20);
  const [zoneHeight, setZoneHeight] = useState(60);
  const [zoneLeft, setZoneLeft] = useState(20);
  const [zoneWidth, setZoneWidth] = useState(60);
  const [mirror, setMirror] = useState(false);
  const [side, setSide] = useState('front');
  const [autoAlternate, setAutoAlternate] = useState(true);
  const [scanState, setScanState] = useState('empty'); // empty | entering | captured | cooldown
  const [liveDiff, setLiveDiff] = useState(0);
  const [liveThreshold, setLiveThreshold] = useState(0);

  const [pairs, setPairs] = useState([]);
  const [creatingId, setCreatingId] = useState(null);

  useEffect(() => { sideRef.current = side; }, [side]);
  useEffect(() => { autoAlternateRef.current = autoAlternate; }, [autoAlternate]);

  useEffect(() => {
    startStream();
    return stopStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  useEffect(() => {
    stopAnalyzing();
    if (autoCapture) startAnalyzing();
    return stopAnalyzing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCapture, sensitivity, zoneTop, zoneHeight, zoneLeft, zoneWidth]);

  useEffect(() => () => {
    pairs.forEach((p) => {
      if (p.front) URL.revokeObjectURL(p.front.url);
      if (p.back) URL.revokeObjectURL(p.back.url);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startStream() {
    stopStream();
    setError(null);
    try {
      const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } },
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
      baselineRef.current = null;
      machineRef.current = 'empty';
      setScanState('empty');
    } catch (e) {
      setError(e.message || 'Could not access camera');
    }
  }

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
  }

  function startAnalyzing() {
    if (!sampleCanvasRef.current) {
      sampleCanvasRef.current = document.createElement('canvas');
      sampleCanvasRef.current.width = SAMPLE_W;
      sampleCanvasRef.current.height = SAMPLE_H;
    }
    baselineRef.current = null;
    machineRef.current = 'empty';
    occupiedStreakRef.current = 0;
    clearStreakRef.current = 0;
    setScanState('empty');
    intervalRef.current = setInterval(tick, TICK_MS);
  }

  function stopAnalyzing() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function sampleZone() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const sx = (zoneLeft / 100) * video.videoWidth;
    const sy = (zoneTop / 100) * video.videoHeight;
    const sw = (zoneWidth / 100) * video.videoWidth;
    const sh = (zoneHeight / 100) * video.videoHeight;
    if (sw <= 0 || sh <= 0) return null;
    const canvas = sampleCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, SAMPLE_W, SAMPLE_H);
    const data = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
    const gray = new Float32Array(SAMPLE_W * SAMPLE_H);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      gray[p] = (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    return gray;
  }

  function tick() {
    const sample = sampleZone();
    if (!sample) return;
    const threshold = sensitivityToThreshold(sensitivity);

    if (!baselineRef.current) {
      baselineRef.current = sample;
      return;
    }

    let diffSum = 0;
    for (let i = 0; i < sample.length; i++) diffSum += Math.abs(sample[i] - baselineRef.current[i]);
    const diffScore = diffSum / sample.length;
    setLiveDiff(diffScore);
    setLiveThreshold(threshold);
    const occupied = diffScore > threshold;

    const state = machineRef.current;
    if (state === 'empty') {
      if (!occupied) {
        const next = new Float32Array(sample.length);
        for (let i = 0; i < sample.length; i++) next[i] = baselineRef.current[i] * 0.9 + sample[i] * 0.1;
        baselineRef.current = next;
        occupiedStreakRef.current = 0;
        setScanState('empty');
      } else {
        occupiedStreakRef.current += 1;
        setScanState('entering');
        if (occupiedStreakRef.current >= OCCUPY_TICKS) {
          doCapture();
          machineRef.current = 'cooldown';
          clearStreakRef.current = 0;
          setScanState('captured');
          setTimeout(() => {
            if (machineRef.current === 'cooldown') setScanState('cooldown');
          }, FLASH_MS);
        }
      }
    } else if (state === 'cooldown') {
      if (!occupied) {
        clearStreakRef.current += 1;
        if (clearStreakRef.current >= CLEAR_TICKS) {
          machineRef.current = 'empty';
          baselineRef.current = sample;
          occupiedStreakRef.current = 0;
          setScanState('empty');
        }
      } else {
        clearStreakRef.current = 0;
      }
    }
  }

  function doCapture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      addShot(blob, sideRef.current);
      if (autoAlternateRef.current) {
        setSide((s) => (s === 'front' ? 'back' : 'front'));
      }
    }, 'image/jpeg', 0.92);
  }

  function addShot(blob, shotSide) {
    const url = URL.createObjectURL(blob);
    setPairs((prev) => {
      const next = [...prev];
      const lastIdx = next.length - 1;
      const last = next[lastIdx];
      if (shotSide === 'front') {
        if (last && !last.front) next[lastIdx] = { ...last, front: { blob, url } };
        else next.push({ id: `${Date.now()}-${Math.random()}`, front: { blob, url }, back: null });
      } else if (last && last.front && !last.back) {
        next[lastIdx] = { ...last, back: { blob, url } };
      } else {
        next.push({ id: `${Date.now()}-${Math.random()}`, front: null, back: { blob, url } });
      }
      return next;
    });
  }

  function removeShot(pairId, shotSide) {
    setPairs((prev) => prev.map((p) => {
      if (p.id !== pairId) return p;
      if (p[shotSide]) URL.revokeObjectURL(p[shotSide].url);
      return { ...p, [shotSide]: null };
    }).filter((p) => p.front || p.back));
  }

  function deletePair(pairId) {
    setPairs((prev) => prev.filter((p) => {
      if (p.id !== pairId) return true;
      if (p.front) URL.revokeObjectURL(p.front.url);
      if (p.back) URL.revokeObjectURL(p.back.url);
      return false;
    }));
  }

  async function createCardFromPair(pair) {
    setCreatingId(pair.id);
    try {
      const card = await api.createCard({ category: 'tcg' });
      if (pair.front) await api.uploadImage(card.id, pair.front.blob, 'front');
      if (pair.back) await api.uploadImage(card.id, pair.back.blob, 'back');
      deletePair(pair.id);
      navigate(`/collection/${card.id}`);
    } catch (e) {
      alert(e.message || 'Failed to create card');
    } finally {
      setCreatingId(null);
    }
  }

  const stateLabel = {
    empty: t('scan_state_empty'),
    entering: t('scan_state_detecting'),
    captured: t('scan_state_captured'),
    cooldown: t('scan_state_clearing'),
  }[scanState];

  const zoneColor = { empty: '#3fa34d', entering: '#d9a62b', captured: '#e0453c', cooldown: '#d9a62b' }[scanState];

  return (
    <div>
      <div className="page-header">
        <h1>{t('scan_title')}</h1>
      </div>
      <p className="hint-text">
        {t('scan_setup_hint')}
        <a href="https://makerworld.com/en/models/1110574-ultimate-card-scanner-stand-for-pokemon-mtg#profileId-1287136" target="_blank" rel="noreferrer">
          {t('scan_setup_link_text')}
        </a>
        {t('scan_setup_hint2')}
      </p>

      <div className="panel-row">
        <section className="panel">
          {error && <p className="error-text">{error}. Grant camera permission and use HTTPS or localhost.</p>}
          {devices.length === 0 && !error && <p className="hint-text">{t('scan_no_camera')}</p>}

          <div className="scan-stage" style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}>
            <video ref={videoRef} playsInline muted className="camera-video" />
            <div
              className="scan-zone"
              style={{
                top: `${zoneTop}%`, height: `${zoneHeight}%`, left: `${zoneLeft}%`, width: `${zoneWidth}%`,
                borderColor: zoneColor, boxShadow: `0 0 0 2000px rgba(0,0,0,0.35) inset, inset 0 0 20px ${zoneColor}`,
              }}
            />
          </div>
          <div className={`scan-status-pill state-${scanState}`}>{stateLabel}</div>
          {autoCapture && (
            <div className="scan-diff-meter" title="Live motion signal vs. capture threshold — tune Sensitivity so a card passing reliably crosses the line.">
              <div className="scan-diff-meter-fill" style={{ width: `${Math.min(100, (liveDiff / (liveThreshold * 2 || 1)) * 100)}%` }} />
              <div className="scan-diff-meter-threshold" style={{ left: '50%' }} />
            </div>
          )}

          <div className="camera-controls">
            {devices.length > 1 && (
              <select value={deviceId || ''} onChange={(e) => setDeviceId(e.target.value || null)}>
                <option value="">{t('scan_default_camera')}</option>
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || t('scan_camera_label')}</option>
                ))}
              </select>
            )}
            <button className="btn primary" onClick={doCapture}>📸 {t('scan_capture_now')}</button>
          </div>

          <div className="scan-side-row">
            <label className="checkbox-label">
              <input type="radio" name="side" checked={side === 'front'} onChange={() => setSide('front')} /> {t('scan_side_front')}
            </label>
            <label className="checkbox-label">
              <input type="radio" name="side" checked={side === 'back'} onChange={() => setSide('back')} /> {t('scan_side_back')}
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={autoAlternate} onChange={(e) => setAutoAlternate(e.target.checked)} /> {t('scan_auto_alternate')}
            </label>
          </div>
        </section>

        <section className="panel">
          <h2>{t('scan_settings_title')}</h2>
          <label className="checkbox-label" style={{ marginBottom: '0.75rem' }}>
            <input type="checkbox" checked={autoCapture} onChange={(e) => setAutoCapture(e.target.checked)} /> {t('scan_auto_capture')}
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' }}>
            {t('scan_sensitivity')}
            <input type="range" min="0" max="100" value={sensitivity} onChange={(e) => setSensitivity(Number(e.target.value))} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' }}>
            {t('scan_zone_top')}
            <input type="range" min="0" max="80" value={zoneTop} onChange={(e) => setZoneTop(Number(e.target.value))} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' }}>
            {t('scan_zone_height')}
            <input type="range" min="10" max="100" value={zoneHeight} onChange={(e) => setZoneHeight(Number(e.target.value))} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' }}>
            {t('scan_zone_left')}
            <input type="range" min="0" max="90" value={zoneLeft} onChange={(e) => setZoneLeft(Number(e.target.value))} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' }}>
            {t('scan_zone_width')}
            <input type="range" min="10" max="100" value={zoneWidth} onChange={(e) => setZoneWidth(Number(e.target.value))} />
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} /> {t('scan_mirror')}
          </label>
          <p className="hint-text" style={{ marginTop: '0.75rem' }}>{t('scan_tuning_hint')}</p>
        </section>
      </div>

      <section className="panel">
        <h2>{t('scan_queue_title')}</h2>
        {pairs.length === 0 && <p className="hint-text">{t('scan_no_shots')}</p>}
        {pairs.length > 0 && (
          <div className="scan-gallery">
            {pairs.map((p) => (
              <div className="scan-pair-card" key={p.id}>
                <div className="scan-pair-thumbs">
                  <div className="scan-thumb-slot">
                    {p.front ? <img src={p.front.url} alt="front" /> : <div className="scan-thumb-missing">{t('scan_pair_incomplete')}</div>}
                    <span className="scan-thumb-label">{t('scan_side_front')}</span>
                    {p.front && <button className="btn small" onClick={() => removeShot(p.id, 'front')}>{t('scan_delete')}</button>}
                  </div>
                  <div className="scan-thumb-slot">
                    {p.back ? <img src={p.back.url} alt="back" /> : <div className="scan-thumb-missing">{t('scan_pair_incomplete')}</div>}
                    <span className="scan-thumb-label">{t('scan_side_back')}</span>
                    {p.back && <button className="btn small" onClick={() => removeShot(p.id, 'back')}>{t('scan_delete')}</button>}
                  </div>
                </div>
                <div className="scan-pair-actions">
                  <button className="btn primary small" disabled={creatingId === p.id} onClick={() => createCardFromPair(p)}>
                    {creatingId === p.id ? t('scan_creating') : t('scan_create_card')}
                  </button>
                  <button className="btn small danger" onClick={() => deletePair(p.id)}>{t('scan_delete')}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
