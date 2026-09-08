import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useLanguage } from '../i18n.jsx';

export default function DeckDetail() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [deck, setDeck] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [addCardId, setAddCardId] = useState('');

  function load() {
    api.getDeck(id).then(setDeck);
    api.listCards({ limit: 1000 }).then((r) => setAllCards(r.rows));
  }
  useEffect(load, [id]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!addCardId) return;
    await api.addCardToDeck(id, Number(addCardId), 1);
    setAddCardId('');
    load();
  }

  async function handleRemove(deckCardId) {
    await api.removeCardFromDeck(id, deckCardId);
    load();
  }

  if (!deck) return <p>{t('loading')}</p>;

  const totalCards = deck.cards.reduce((sum, c) => sum + (c.deck_quantity || 0), 0);
  const totalValue = deck.cards.reduce((sum, c) => sum + (Number(c.current_value) || 0) * (c.deck_quantity || 0), 0);
  const byCategory = {};
  for (const c of deck.cards) {
    byCategory[c.category] = (byCategory[c.category] || 0) + (c.deck_quantity || 0);
  }

  return (
    <div>
      <div className="page-header">
        <h1>{deck.name}</h1>
        <Link className="btn" to="/decks">{t('decks_all')}</Link>
      </div>
      <p className="hint-text">{deck.category} {deck.sport_or_game ? `· ${deck.sport_or_game}` : ''}</p>

      <section className="panel">
        <h2>{t('deck_summary_title')}</h2>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">{t('deck_summary_total_cards')}</div>
            <div className="stat-value">{totalCards}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t('deck_summary_total_value')}</div>
            <div className="stat-value">${totalValue.toFixed(2)}</div>
          </div>
        </div>
        {Object.keys(byCategory).length > 0 && (
          <p className="hint-text" style={{ marginTop: '0.5rem' }}>
            {t('deck_summary_by_category')}: {Object.entries(byCategory).map(([cat, n]) => `${cat} (${n})`).join(', ')}
          </p>
        )}
      </section>

      <section className="panel">
        <h2>{t('decks_add_a_card')}</h2>
        <form className="filter-bar" onSubmit={handleAdd}>
          <select value={addCardId} onChange={(e) => setAddCardId(e.target.value)}>
            <option value="">{t('decks_select_from_collection')}</option>
            {allCards.map((c) => (
              <option key={c.id} value={c.id}>{c.player_or_character || c.set_name} ({c.year}) x{c.quantity}</option>
            ))}
          </select>
          <button className="btn primary" type="submit">{t('btn_add')}</button>
        </form>
      </section>

      <table className="data-table">
        <thead><tr><th>{t('collection_col_player')}</th><th>{t('collection_col_set')}</th><th>{t('collection_col_year')}</th><th>{t('decks_qty_in_deck')}</th><th>{t('collection_col_value')}</th><th></th></tr></thead>
        <tbody>
          {deck.cards.map((c) => (
            <tr key={c.deck_card_id}>
              <td><Link to={`/collection/${c.id}`}>{c.player_or_character || c.set_name}</Link></td>
              <td>{c.set_name}</td>
              <td>{c.year}</td>
              <td>{c.deck_quantity}</td>
              <td>{c.current_value != null ? `$${Number(c.current_value).toFixed(2)}` : ''}</td>
              <td><button className="btn small danger" onClick={() => handleRemove(c.deck_card_id)}>{t('btn_remove')}</button></td>
            </tr>
          ))}
          {deck.cards.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>{t('decks_none_in_deck')}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
