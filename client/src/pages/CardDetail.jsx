import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CardForm from '../components/CardForm.jsx';
import CameraCapture from '../components/CameraCapture.jsx';
import BarcodeScanner from '../components/BarcodeScanner.jsx';
import OcrAssist from '../components/OcrAssist.jsx';
import CardLookup from '../components/CardLookup.jsx';
import { useLanguage } from '../i18n.jsx';
import { api } from '../api.js';
import { queueUpload } from '../offlineQueue.js';

export default function CardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [card, setCard] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [captureSide, setCaptureSide] = useState('front');
  const [formKey, setFormKey] = useState(0);
  const [valueMsg, setValueMsg] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showLookup, setShowLookup] = useState(null);
  const [decks, setDecks] = useState([]);
  const [addToDeckId, setAddToDeckId] = useState('');
  const [gradingHistory, setGradingHistory] = useState([]);
  const [shareUrl, setShareUrl] = useState(null);

  function load() {
    api.getCard(id).then((c) => { setCard(c); setFormKey((k) => k + 1); });
    api.similarCards(id).then(setSimilar).catch(() => setSimilar([]));
    api.listDecks().then(setDecks).catch(() => setDecks([]));
    api.listGrading().then((rows) => setGradingHistory(rows.filter((g) => g.card_id === Number(id)))).catch(() => setGradingHistory([]));
  }

  useEffect(load, [id]);

  async function handleSave(form) {
    await api.updateCard(id, form);
    load();
  }

  async function handleDelete() {
    if (!confirm('Delete this card permanently?')) return;
    await api.deleteCard(id);
    navigate('/collection');
  }

  async function handleClone() {
    const clone = await api.cloneCard(id);
    navigate(`/collection/${clone.id}`);
  }

  async function handleRefreshValue() {
    setRefreshing(true);
    setValueMsg(null);
    try {
      const res = await api.refreshValue(id);
      setValueMsg({ ok: true, text: `Updated to $${Number(res.value).toFixed(2)}` });
      load();
    } catch (e) {
      let text = e.message;
      try { text = JSON.parse(e.message.split(': ').slice(1).join(': ')).error || text; } catch { /* ignore */ }
      setValueMsg({ ok: false, text });
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCapture(blob) {
    setShowCamera(false);
    try {
      await api.uploadImage(id, blob, captureSide);
      load();
    } catch (err) {
      await queueUpload(id, blob, captureSide);
      alert('No connection — this photo was queued and will upload automatically once you\'re back online.');
    }
  }

  async function handleFileUpload(e, side) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    try {
      await api.uploadImage(id, file, side);
      load();
    } catch (err) {
      await queueUpload(id, file, side);
      alert('No connection — this photo was queued and will upload automatically once you\'re back online.');
    }
  }

  async function handleDeleteImage(imageId) {
    await api.deleteImage(id, imageId);
    load();
  }

  function handleBarcodeDetected(text) {
    setCard((c) => ({ ...c, is_graded: 1, cert_number: text }));
    setFormKey((k) => k + 1);
    setShowScanner(false);
  }

  async function handleAddToDeck() {
    if (!addToDeckId) return;
    await api.addCardToDeck(addToDeckId, card.id, 1);
    setAddToDeckId('');
    alert('Added to deck.');
  }

  async function handleShareCard() {
    const link = await api.createShareLink({ label: card.player_or_character || card.set_name, kind: 'selection', card_ids: [card.id] });
    setShareUrl(`${window.location.origin}/share/${link.token}`);
  }

  const gameLabels = { pokemon: 'Pokemon', yugioh: 'Yu-Gi-Oh', magic: 'Magic: The Gathering' };

  async function handleCardPick(result, gameKey) {
    setCard((c) => ({
      ...c,
      category: 'tcg',
      sport_or_game: gameLabels[gameKey] || c.sport_or_game,
      player_or_character: result.name,
      set_name: result.setName || c.set_name,
      card_number: result.number || c.card_number,
      rarity: result.rarity || c.rarity,
      current_value: result.marketPriceUsd ?? c.current_value,
    }));
    setFormKey((k) => k + 1);
    setShowLookup(null);
    if (result.image) {
      await api.importImage(id, result.image, 'front').catch(() => {});
      load();
    }
  }

  if (!card) return <p>{t('loading')}</p>;

  const frontImage = card.images.find((i) => i.side === 'front');

  return (
    <div>
      <div className="page-header">
        <h1>{card.player_or_character || card.set_name || `Card #${card.id}`}</h1>
        <div className="cta-row">
          <button className="btn" onClick={handleClone}>⧉ Clone</button>
          <a className="btn" href={`/api/export/labels?ids=${card.id}`}>🏷 Print Label</a>
          <button className="btn danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <section className="panel">
        <div className="panel-header-row">
          <h2>{t('images_title')}</h2>
          <div className="image-actions">
            <select value={captureSide} onChange={(e) => setCaptureSide(e.target.value)}>
              <option value="front">{t('side_front')}</option>
              <option value="back">{t('side_back')}</option>
              <option value="other">{t('side_other')}</option>
            </select>
            <button className="btn primary" onClick={() => setShowCamera(true)}>📷 Scan with Camera</button>
            <button className="btn" onClick={() => setShowScanner(true)}>▦ Scan Cert Barcode</button>
            <label className="btn file-upload-btn">
              Upload File
              <input type="file" accept="image/*" hidden onChange={(e) => handleFileUpload(e, captureSide)} />
            </label>
            <button className="btn" onClick={() => setShowLookup(showLookup === 'pokemon' ? null : 'pokemon')}>🔍 Pokemon</button>
            <button className="btn" onClick={() => setShowLookup(showLookup === 'yugioh' ? null : 'yugioh')}>🔍 Yu-Gi-Oh</button>
            <button className="btn" onClick={() => setShowLookup(showLookup === 'magic' ? null : 'magic')}>🔍 Magic</button>
          </div>
        </div>
        {showLookup && <CardLookup game={showLookup} onPick={(r) => handleCardPick(r, showLookup)} />}
        <div className="image-gallery">
          {card.images.map((img) => (
            <div className="image-thumb" key={img.id}>
              <img src={`/images/${img.filename}`} alt={img.side} />
              <div className="image-thumb-meta">
                <span>{img.side}</span>
                <button className="btn small danger" onClick={() => handleDeleteImage(img.id)}>x</button>
              </div>
            </div>
          ))}
          {card.images.length === 0 && <p>{t('no_images_hint')}</p>}
        </div>
        {frontImage && <OcrAssist imageUrl={`/images/${frontImage.filename}`} onPick={handleCardPick} />}
      </section>

      {showCamera && <CameraCapture onCapture={handleCapture} onClose={() => setShowCamera(false)} />}
      {showScanner && <BarcodeScanner onDetect={handleBarcodeDetected} onClose={() => setShowScanner(false)} />}

      <section className="panel">
        <h2>{t('quick_actions_title')}</h2>
        <div className="cta-row">
          <Link className="btn" to="/grading">📮 Submit for Grading</Link>
          <select value={addToDeckId} onChange={(e) => setAddToDeckId(e.target.value)} style={{ width: 'auto' }}>
            <option value="">{t('add_to_deck_ph')}</option>
            {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button className="btn" onClick={handleAddToDeck} disabled={!addToDeckId}>{t('btn_add')}</button>
          <button className="btn" onClick={handleShareCard}>🔗 Share This Card</button>
        </div>
        {shareUrl && <p className="hint-text">Public link: <a href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a></p>}
        {gradingHistory.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <p className="hint-text">Grading submissions for this card:</p>
            <table className="simple-table">
              <thead><tr><th>{t('col_company')}</th><th>{t('field_status')}</th><th>{t('field_grade')}</th><th>{t('col_submitted')}</th></tr></thead>
              <tbody>
                {gradingHistory.map((g) => (
                  <tr key={g.id}><td>{g.company}</td><td>{g.status}</td><td>{g.resulting_grade}</td><td>{g.submitted_at}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header-row">
          <h2>{t('details_title')}</h2>
          <div className="cta-row">
            <button className="btn" onClick={handleRefreshValue} disabled={refreshing}>{refreshing ? 'Checking...' : '↻ Refresh Value'}</button>
          </div>
        </div>
        {valueMsg && <p className={valueMsg.ok ? 'hint-text' : 'error-text'}>{valueMsg.text}</p>}
        <CardForm key={formKey} initial={card} onSubmit={handleSave} submitLabel={t('btn_save_changes')} />
      </section>

      {card.values.length > 0 && (
        <section className="panel">
          <h2>{t('value_history_title')}</h2>
          <table className="simple-table">
            <thead><tr><th>{t('col_date')}</th><th>{t('collection_col_value')}</th><th>{t('col_source')}</th></tr></thead>
            <tbody>
              {card.values.map((v) => (
                <tr key={v.id}><td>{v.recorded_at}</td><td>${Number(v.value).toFixed(2)}</td><td>{v.source}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {card.sales.length > 0 && (
        <section className="panel">
          <h2>{t('sales_title')}</h2>
          <table className="simple-table">
            <thead><tr><th>{t('col_date')}</th><th>{t('col_price')}</th><th>{t('col_platform')}</th></tr></thead>
            <tbody>
              {card.sales.map((s) => (
                <tr key={s.id}><td>{s.sale_date}</td><td>${Number(s.sale_price).toFixed(2)}</td><td>{s.platform}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {similar.length > 0 && (
        <section className="panel">
          <h2>{t('similar_cards_title')}</h2>
          <ul className="similar-list">
            {similar.map((s) => (
              <li key={s.id}>
                <Link to={`/collection/${s.id}`}>
                  {s.player_or_character || s.set_name} — {[s.set_name, s.year, s.card_number ? `#${s.card_number}` : null].filter(Boolean).join(' · ')}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
