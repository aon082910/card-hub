import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';

export default function DeckDetail() {
  const { id } = useParams();
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

  if (!deck) return <p>Loading...</p>;

  return (
    <div>
      <div className="page-header">
        <h1>{deck.name}</h1>
        <Link className="btn" to="/decks">← All Decks</Link>
      </div>
      <p className="hint-text">{deck.category} {deck.sport_or_game ? `· ${deck.sport_or_game}` : ''}</p>

      <section className="panel">
        <h2>Add a Card</h2>
        <form className="filter-bar" onSubmit={handleAdd}>
          <select value={addCardId} onChange={(e) => setAddCardId(e.target.value)}>
            <option value="">Select a card from your collection...</option>
            {allCards.map((c) => (
              <option key={c.id} value={c.id}>{c.player_or_character || c.set_name} ({c.year}) x{c.quantity}</option>
            ))}
          </select>
          <button className="btn primary" type="submit">Add</button>
        </form>
      </section>

      <table className="data-table">
        <thead><tr><th>Player/Character</th><th>Set</th><th>Year</th><th>Qty in Deck</th><th></th></tr></thead>
        <tbody>
          {deck.cards.map((c) => (
            <tr key={c.deck_card_id}>
              <td><Link to={`/collection/${c.id}`}>{c.player_or_character || c.set_name}</Link></td>
              <td>{c.set_name}</td>
              <td>{c.year}</td>
              <td>{c.deck_quantity}</td>
              <td><button className="btn small danger" onClick={() => handleRemove(c.deck_card_id)}>Remove</button></td>
            </tr>
          ))}
          {deck.cards.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No cards in this deck yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
