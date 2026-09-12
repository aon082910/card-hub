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
  const [showLookup, setShowLookup] = useState(null); // 'pokemon' | 'yugioh' | 'magic' | null

  async function handleSubmit(form) {
    const card = await api.createCard(form);
    if (pendingImage) {
      await api.importImage(card.id, pendingImage, 'front').catch(() => {});
    }
    navigate(`/collection/${card.id}`);
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

      <CardForm key={formKey} initial={prefill} onSubmit={handleSubmit} submitLabel={t('btn_create_card')} />
    </div>
  );
}
