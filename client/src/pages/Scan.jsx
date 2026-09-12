import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n.jsx';
import { api } from '../api.js';

const SAMPLE_W = 48;
const SAMPLE_H = 32;
const SETTLE_TICKS = 3; // consecutive still (low frame-to-frame diff) samples required before we snap
const FOCUS_DELAY_MS = 350; // extra wait after the card stops moving, before the actual snapshot, so autofocus/exposure can catch up
const REFRACTORY_MS = 600; // ignore new motion right after a capture (card settling/bouncing in the tray)
const FLASH_MS = 450;
const TICK_MS = 90;
const NOTICE_MS = 2000;
const DUPLICATE_THRESHOLD = 2.5; // mean grayscale diff below which two auto-captures count as the same shot
const MIN_CROP_AREA_RATIO = 0.15; // bounding-box area (of the zone) below which we don't trust the auto-crop
const CROP_MARGIN_RATIO = 0.08; // padding added around the detected card edges

function sensitivityToThreshold(sensitivity) {
  // sensitivity 0-100 -> threshold ~32 (insensitive) down to ~4 (very sensitive)
  return 32 - (sensitivity / 100) * 28;
}

const GAME_LABELS = { pokemon: 'Pokemon', yugioh: 'Yu-Gi-Oh', magic: 'Magic: The Gathering' };
const LOOKUP_GAMES = [
  { key: 'pokemon', lookup: (q) => api.lookupPokemon(q) },
  { key: 'yugioh', lookup: (q) => api.lookupYugioh(q) },
  { key: 'magic', lookup: (q) => api.lookupMagic(q) },
];

// Runs the same OCR-then-search pipeline as the manual "Extract Text" flow (see
// OcrAssist.jsx), but automatically: tries the first few text lines detected on the
// card against all three card databases and takes the first hit, so a batch-scanned
// card can land on its detail page already filled in instead of blank.
async function identifyCard(imageUrl) {
  const Tesseract = await import('tesseract.js');
  const { data } = await Tesseract.recognize(imageUrl, 'eng');
  const lines = data.text.split('\n').map((l) => l.trim()).filter((l) => l.length > 1).slice(0, 5);
  for (const line of lines) {
    for (const game of LOOKUP_GAMES) {
      let rows;
      try {
        rows = await game.lookup(line);
      } catch {
        continue;
      }
      if (!rows || !rows.length) continue;
      let row = rows[0];
      if (game.key === 'pokemon' && row.source === 'tcgdex') {
        row = await api.lookupPokemonCard(row.id).catch(() => row);
      }
      return {
        category: 'tcg',
        sport_or_game: GAME_LABELS[game.key],
        player_or_character: row.name,
        set_name: row.setName || '',
        card_number: row.number || '',
        rarity: row.rarity || '',
        current_value: row.marketPriceUsd ?? '',
      };
    }
  }
  return null;
}

const SETTINGS_KEY = 'card-hub-scan-settings';
const DEFAULT_SETTINGS = {
  autoCapture: true, sensitivity: 65, zoneTop: 20, zoneHeight: 60, zoneLeft: 20, zoneWidth: 60,
  mirror: false, autoAlternate: true, deviceId: null,
};
function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function Scan() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const sampleCanvasRef = useRef(null);
  const intervalRef = useRef(null);

  const prevSampleRef = useRef(null);
  const backgroundSampleRef = useRef(null); // sample from just before motion started - used to isolate the card for auto-crop
  const lastCapturedSampleRef = useRef(null); // sample at the last auto-capture - used for the duplicate-shot guard
  const machineRef = useRef('settled'); // settled (watching) | moving (card in transit) | focusing (still, waiting for autofocus)
  const stillStreakRef = useRef(0);
  const focusStartTimeRef = useRef(0);
  const lastCaptureTimeRef = useRef(0);
  const sideRef = useRef('front');
  const autoAlternateRef = useRef(true);

  const initialSettings = useRef(loadSettings()).current;

  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(initialSettings.deviceId);
  const [error, setError] = useState(null);

  const [autoCapture, setAutoCapture] = useState(initialSettings.autoCapture);
  const [sensitivity, setSensitivity] = useState(initialSettings.sensitivity);
  const [zoneTop, setZoneTop] = useState(initialSettings.zoneTop);
  const [zoneHeight, setZoneHeight] = useState(initialSettings.zoneHeight);
  const [zoneLeft, setZoneLeft] = useState(initialSettings.zoneLeft);
  const [zoneWidth, setZoneWidth] = useState(initialSettings.zoneWidth);
  const [mirror, setMirror] = useState(initialSettings.mirror);
  const [side, setSide] = useState('front');
  const [autoAlternate, setAutoAlternate] = useState(initialSettings.autoAlternate);
  const [scanState, setScanState] = useState('empty'); // empty | entering | captured | cooldown
  const [liveDiff, setLiveDiff] = useState(0);
  const [liveThreshold, setLiveThreshold] = useState(0);

  const [pairs, setPairs] = useState([]);
  const [creatingId, setCreatingId] = useState(null);
  const [creatingPhase, setCreatingPhase] = useState(null); // 'identify' | 'create' | null
  const [preview, setPreview] = useState(null); // { url, label } | null
  const [sessionCount, setSessionCount] = useState(0);
  const [notice, setNotice] = useState(null);
  const [lastAction, setLastAction] = useState(null); // { pairId, side } of the most recent capture, for Undo

  function showNotice(text) {
    setNotice(text);
    setTimeout(() => setNotice((cur) => (cur === text ? null : cur)), NOTICE_MS);
  }

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

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        autoCapture, sensitivity, zoneTop, zoneHeight, zoneLeft, zoneWidth, mirror, autoAlternate, deviceId,
      }));
    } catch { /* ignore */ }
  }, [autoCapture, sensitivity, zoneTop, zoneHeight, zoneLeft, zoneWidth, mirror, autoAlternate, deviceId]);

  async function startStream() {
    stopStream();
    setError(null);
    try {
      // Ask for the sharpest feed the camera offers - without an explicit resolution,
      // some USB webcams default to a low-res mode that looks blurry once cropped in on.
      const resolution = { width: { ideal: 1920 }, height: { ideal: 1080 } };
      const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId }, ...resolution } : { facingMode: { ideal: 'environment' }, ...resolution },
        audio: false,
      };
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        if (!deviceId) throw err;
        // A saved camera from a previous visit is no longer plugged in - fall back to the default.
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, ...resolution }, audio: false });
        setDeviceId(null);
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((d) => d.kind === 'videoinput'));
      prevSampleRef.current = null;
      machineRef.current = 'settled';
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
    prevSampleRef.current = null;
    machineRef.current = 'settled';
    stillStreakRef.current = 0;
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

    if (!prevSampleRef.current) {
      prevSampleRef.current = sample;
      return;
    }

    const priorSample = prevSampleRef.current;
    let diffSum = 0;
    for (let i = 0; i < sample.length; i++) diffSum += Math.abs(sample[i] - priorSample[i]);
    const frameDiff = diffSum / sample.length;
    prevSampleRef.current = sample;
    setLiveDiff(frameDiff);
    setLiveThreshold(threshold);
    const moving = frameDiff > threshold;

    const state = machineRef.current;
    if (state === 'settled') {
      const inRefractory = performance.now() - lastCaptureTimeRef.current < REFRACTORY_MS;
      if (moving && !inRefractory) {
        machineRef.current = 'moving';
        stillStreakRef.current = 0;
        backgroundSampleRef.current = priorSample;
        setScanState('entering');
      } else {
        setScanState('empty');
      }
    } else if (state === 'moving') {
      if (moving) {
        stillStreakRef.current = 0;
      } else {
        stillStreakRef.current += 1;
        if (stillStreakRef.current >= SETTLE_TICKS) {
          // Motion has stopped, but the camera's autofocus/exposure may still be
          // catching up right after the card lands - wait a beat before actually
          // snapping, rather than capturing the exact instant it stops moving.
          machineRef.current = 'focusing';
          focusStartTimeRef.current = performance.now();
        }
      }
    } else if (state === 'focusing') {
      if (moving) {
        // Something's still shifting (or a new card arrived) - go back to waiting it out.
        machineRef.current = 'moving';
        stillStreakRef.current = 0;
      } else if (performance.now() - focusStartTimeRef.current >= FOCUS_DELAY_MS) {
        // Motion stopped - the card has landed in the tray. Snap the top card and go
        // back to watching; no "wait for the tray to go empty" step, since it won't.
        doCapture(true);
        lastCaptureTimeRef.current = performance.now();
        machineRef.current = 'settled';
        stillStreakRef.current = 0;
        setScanState('captured');
        setTimeout(() => {
          if (machineRef.current === 'settled') setScanState('empty');
        }, FLASH_MS);
      }
    }
  }

  function getZoneRectFull(video) {
    return {
      sx: (zoneLeft / 100) * video.videoWidth,
      sy: (zoneTop / 100) * video.videoHeight,
      sw: (zoneWidth / 100) * video.videoWidth,
      sh: (zoneHeight / 100) * video.videoHeight,
    };
  }

  // Narrows the full capture-zone rect down to just the card, using the diff between
  // the zone right before motion started (backgroundSample) and right after it settled
  // (currentSample) to find the card's bounding box. Falls back to the full zone if the
  // signal is too weak/small to trust (e.g. lighting change, no real background sample yet).
  function computeCropRect(currentSample, backgroundSample, zoneRect) {
    if (!backgroundSample) return zoneRect;
    const threshold = Math.max(6, sensitivityToThreshold(sensitivity) * 0.6);
    let minX = SAMPLE_W;
    let maxX = -1;
    let minY = SAMPLE_H;
    let maxY = -1;
    for (let y = 0; y < SAMPLE_H; y++) {
      for (let x = 0; x < SAMPLE_W; x++) {
        const idx = y * SAMPLE_W + x;
        if (Math.abs(currentSample[idx] - backgroundSample[idx]) > threshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return zoneRect;
    const boxW = maxX - minX + 1;
    const boxH = maxY - minY + 1;
    if ((boxW * boxH) / (SAMPLE_W * SAMPLE_H) < MIN_CROP_AREA_RATIO) return zoneRect;
    const marginX = Math.max(1, Math.round(boxW * CROP_MARGIN_RATIO));
    const marginY = Math.max(1, Math.round(boxH * CROP_MARGIN_RATIO));
    const gx0 = Math.max(0, minX - marginX);
    const gx1 = Math.min(SAMPLE_W, maxX + 1 + marginX);
    const gy0 = Math.max(0, minY - marginY);
    const gy1 = Math.min(SAMPLE_H, maxY + 1 + marginY);
    const scaleX = zoneRect.sw / SAMPLE_W;
    const scaleY = zoneRect.sh / SAMPLE_H;
    return {
      sx: zoneRect.sx + gx0 * scaleX,
      sy: zoneRect.sy + gy0 * scaleY,
      sw: (gx1 - gx0) * scaleX,
      sh: (gy1 - gy0) * scaleY,
    };
  }

  function doCapture(isAuto = false) {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const zoneRect = getZoneRectFull(video);
    const rect = isAuto ? computeCropRect(prevSampleRef.current, backgroundSampleRef.current, zoneRect) : zoneRect;
    if (rect.sw <= 0 || rect.sh <= 0) return;

    if (isAuto && prevSampleRef.current && lastCapturedSampleRef.current) {
      let diffSum = 0;
      for (let i = 0; i < prevSampleRef.current.length; i++) {
        diffSum += Math.abs(prevSampleRef.current[i] - lastCapturedSampleRef.current[i]);
      }
      if (diffSum / prevSampleRef.current.length < DUPLICATE_THRESHOLD) {
        showNotice(t('scan_duplicate_skipped'));
        return;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = rect.sw;
    canvas.height = rect.sh;
    canvas.getContext('2d').drawImage(video, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, rect.sw, rect.sh);
    canvas.toBlob((blob) => {
      if (!blob) return;
      if (isAuto && prevSampleRef.current) lastCapturedSampleRef.current = prevSampleRef.current;
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
      let targetId;
      if (shotSide === 'front') {
        if (last && !last.front) {
          targetId = last.id;
          next[lastIdx] = { ...last, front: { blob, url } };
        } else {
          targetId = `${Date.now()}-${Math.random()}`;
          next.push({ id: targetId, front: { blob, url }, back: null });
        }
      } else if (last && last.front && !last.back) {
        targetId = last.id;
        next[lastIdx] = { ...last, back: { blob, url } };
      } else {
        targetId = `${Date.now()}-${Math.random()}`;
        next.push({ id: targetId, front: null, back: { blob, url } });
      }
      setLastAction({ pairId: targetId, side: shotSide });
      return next;
    });
    setSessionCount((c) => c + 1);
  }

  function undoLastCapture() {
    if (!lastAction) return;
    removeShot(lastAction.pairId, lastAction.side);
    setLastAction(null);
    setSessionCount((c) => Math.max(0, c - 1));
  }

  function removeShot(pairId, shotSide) {
    setLastAction((cur) => (cur && cur.pairId === pairId && cur.side === shotSide ? null : cur));
    setPairs((prev) => prev.map((p) => {
      if (p.id !== pairId) return p;
      if (p[shotSide]) {
        URL.revokeObjectURL(p[shotSide].url);
        setPreview((cur) => (cur && cur.url === p[shotSide].url ? null : cur));
      }
      return { ...p, [shotSide]: null };
    }).filter((p) => p.front || p.back));
  }

  function deletePair(pairId) {
    setLastAction((cur) => (cur && cur.pairId === pairId ? null : cur));
    setPairs((prev) => prev.filter((p) => {
      if (p.id !== pairId) return true;
      if (p.front) {
        URL.revokeObjectURL(p.front.url);
        setPreview((cur) => (cur && cur.url === p.front.url ? null : cur));
      }
      if (p.back) {
        URL.revokeObjectURL(p.back.url);
        setPreview((cur) => (cur && cur.url === p.back.url ? null : cur));
      }
      return false;
    }));
  }

  async function createCardFromPair(pair) {
    setCreatingId(pair.id);
    try {
      let fields = { category: 'tcg' };
      if (pair.front) {
        setCreatingPhase('identify');
        const identified = await identifyCard(pair.front.url).catch(() => null);
        if (identified) fields = identified;
      }
      setCreatingPhase('create');
      const card = await api.createCard(fields);
      if (pair.front) await api.uploadImage(card.id, pair.front.blob, 'front');
      if (pair.back) await api.uploadImage(card.id, pair.back.blob, 'back');
      deletePair(pair.id);
      navigate(`/collection/${card.id}`);
    } catch (e) {
      alert(e.message || 'Failed to create card');
    } finally {
      setCreatingId(null);
      setCreatingPhase(null);
    }
  }

  const stateLabel = {
    empty: t('scan_state_empty'),
    entering: t('scan_state_detecting'),
    captured: t('scan_state_captured'),
  }[scanState];

  const zoneColor = { empty: '#3fa34d', entering: '#d9a62b', captured: '#e0453c' }[scanState];

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
          <div className="scan-status-row">
            <div className={`scan-status-pill state-${scanState}`}>{stateLabel}</div>
            <span className="scan-session-count">{t('scan_session_count_label')} {sessionCount}</span>
          </div>
          {notice && <p className="hint-text scan-notice">{notice}</p>}
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
            <button className="btn primary" onClick={() => doCapture(false)}>📸 {t('scan_capture_now')}</button>
            <button className="btn" disabled={!lastAction} onClick={undoLastCapture}>↩ {t('scan_undo')}</button>
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
                    {p.front
                      ? <img src={p.front.url} alt="front" className="scan-thumb-clickable" onClick={() => setPreview({ url: p.front.url, label: t('scan_side_front') })} />
                      : <div className="scan-thumb-missing">{t('scan_pair_incomplete')}</div>}
                    <span className="scan-thumb-label">{t('scan_side_front')}</span>
                    {p.front && <button className="btn small" onClick={() => removeShot(p.id, 'front')}>{t('scan_delete')}</button>}
                  </div>
                  <div className="scan-thumb-slot">
                    {p.back
                      ? <img src={p.back.url} alt="back" className="scan-thumb-clickable" onClick={() => setPreview({ url: p.back.url, label: t('scan_side_back') })} />
                      : <div className="scan-thumb-missing">{t('scan_pair_incomplete')}</div>}
                    <span className="scan-thumb-label">{t('scan_side_back')}</span>
                    {p.back && <button className="btn small" onClick={() => removeShot(p.id, 'back')}>{t('scan_delete')}</button>}
                  </div>
                </div>
                <div className="scan-pair-actions">
                  <button className="btn primary small" disabled={creatingId === p.id} onClick={() => createCardFromPair(p)}>
                    {creatingId === p.id ? (creatingPhase === 'identify' ? t('scan_identifying') : t('scan_creating')) : t('scan_create_card')}
                  </button>
                  <button className="btn small danger" onClick={() => deletePair(p.id)}>{t('scan_delete')}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {preview && (
        <div className="camera-modal" onClick={() => setPreview(null)}>
          <div className="camera-panel scan-preview-panel" onClick={(e) => e.stopPropagation()}>
            <h3>{preview.label}</h3>
            <img src={preview.url} alt={preview.label} className="scan-preview-img" />
            <div className="camera-controls">
              <button className="btn primary" onClick={() => setPreview(null)}>{t('btn_close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
