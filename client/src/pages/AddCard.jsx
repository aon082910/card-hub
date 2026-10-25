import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CardForm from '../components/CardForm.jsx';
import CardLookup from '../components/CardLookup.jsx';
import { useLanguage } from '../i18n.jsx';
import { api } from '../api.js';

const GAME_LABELS = { pokemon: 'Pokemon', yugioh: 'Yu-Gi-Oh', magic: 'Magic: The Gathering' };

export default function AddCard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  // A set's checklist grid can deep-link here with a prefilled category/set/number
  // via router state (see Sets.jsx) - e.g. jumping straight to logging card #42 of a set.
  const [prefill, setPrefill] = useState(() => location.state?.prefill || null);
  const [formKey, setFormKey] = useState(0);
  const [pendingImage, setPendingImage] = useState(null);
  const [showLookup, setShowLookup] = useState(() => location.state?.gameType || null); // 'pokemon' | 'yugioh' | 'magic' | null

  // Duplicate resolution state
  const [dupes, setDupes] = useState(null);
  const [pendingForm, setPendingForm] = useState(null);
  const [variantText, setVariantText] = useState('');

  async function finalizeCreate(form) {
    const card = await api.createCard(form);
    if (pendingImage) {
      await api.importImage(card.id, pendingImage, 'front').catch(() => {});
    }
    navigate(`/collection/${card.id}?added=1`);
  }

  async function handleSubmit(form) {
    if (form.set_name || form.player_or_character) {
      const results = await api.checkDuplicate({
        set_name: form.set_name || '', card_number: form.card_number || '',
        year: form.year || '', player_or_character: form.player_or_character || '',
      }).catch(() => []);
      if (results.length > 0) {
        setDupes(results);
        setPendingForm(form);
        return;
      }
    }
    await finalizeCreate(form);
  }

  async function handleIncreaseQty(dupe, increment) {
    const newQty = (dupe.quantity || 0) + (increment || 1);
    await api.updateCard(dupe.id, { quantity: newQty });
    navigate(`/collection/${dupe.id}?added=1`);
  }

  async function handleAddVariant() {
    if (!pendingForm) return;
    const form = { ...pendingForm, parallel_variant: variantText.trim() || '' };
    await finalizeCreate(form);
  }

  async function handleCreateClone() {
    if (!pendingForm) return;
    await finalizeCreate(pendingForm);
  }

  function handleCancelDupes() {
    setDupes(null);
    setPendingForm(null);
    setVariantText('');
  }

  function handlePick(result) {
    setPrefill({
      category: 'tcg',
      sport_or_game: GAME_LABELS[showLookup] || '',
      player_or_character: result.name,
      set_name: result.setName || '',
      card_number: result.number || '',
      rarity: result.rarity || '',
      current_value: result.marketPriceUsd ?? '',
    });
    setPendingImage(result.image || null);
    setFormKey((k) => k + 1);
    setShowLookup(null);
  }

  return (
    <div>
      <h1>Add Card</h1>

      <section className="panel">
        <h2>Look Up a Card (optional)</h2>
        <p className="hint-text">Search a live card database to autofill the form and pull in the official image. Works for Pokemon (via TCGdex), Yu-Gi-Oh (via YGOPRODeck), and Magic: The Gathering (via Scryfall).</p>
        <div className="cta-row">
          <button className="btn" onClick={() => setShowLookup(showLookup === 'pokemon' ? null : 'pokemon')}>🔍 Pokemon</button>
          <button className="btn" onClick={() => setShowLookup(showLookup === 'yugioh' ? null : 'yugioh')}>🔍 Yu-Gi-Oh</button>
          <button className="btn" onClick={() => setShowLookup(showLookup === 'magic' ? null : 'magic')}>🔍 Magic: The Gathering</button>
        </div>
        {showLookup && <CardLookup game={showLookup} onPick={handlePick} />}
        {pendingImage && <p className="hint-text">Image selected — it will attach once you create the card.</p>}
      </section>

      {dupes && (
        <section className="panel dupe-panel">
          <h2>⚠️ Card Already Exists</h2>
          <p className="hint-text">This card may already be in your collection. Choose how to proceed:</p>

          <div className="dupe-options">
            {dupes.map((d) => (
              <div key={d.id} className="dupe-card-row">
                <div className="dupe-info">
                  <strong>#{d.id} — {d.player_or_character || d.set_name}</strong>
                  <span className="dupe-meta">
                    {d.card_number && <># {d.card_number} · </>}
                    {d.year && <>{d.year} · </>}
                    Qty: <strong>{d.quantity}</strong>
                    {d.parallel_variant && <> · Variant: {d.parallel_variant}</>}
                  </span>
                </div>
                <button className="btn primary" onClick={() => handleIncreaseQty(d, pendingForm?.quantity || 1)}>
                  +{(pendingForm?.quantity || 1)} to Qty
                </button>
              </div>
            ))}
          </div>

          <div className="dupe-divider" />

          <div className="dupe-action-row">
            <label className="dupe-variant-input">
              <span>Add as variant:</span>
              <input
                type="text"
                value={variantText}
                onChange={(e) => setVariantText(e.target.value)}
                placeholder="e.g. Reverse Holo, Foil, 1st Edition..."
              />
            </label>
            <button className="btn" onClick={handleAddVariant} disabled={!variantText.trim()}>
              Create with Variant
            </button>
          </div>

          <div className="dupe-divider" />

          <div className="dupe-action-row dupe-final-row">
            <button className="btn" onClick={handleCreateClone}>⧉ Create Clone Anyway</button>
            <button className="btn danger" onClick={handleCancelDupes}>Cancel</button>
          </div>
        </section>
      )}

      {!dupes && <CardForm key={formKey} initial={prefill} onSubmit={handleSubmit} submitLabel={t('btn_create_card')} />}
    </div>
  );
}
