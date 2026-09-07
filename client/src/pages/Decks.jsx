import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Decks() {
  const [decks, setDecks] = useState([]);
  const [form, setForm] = useState({ name: '', category: 'tcg', sport_or_game: '', notes: '' });

  function load() {
    api.listDecks().then(setDecks);
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) return;
    await api.createDeck(form);
    setForm({ name: '', category: 'tcg', sport_or_game: '', notes: '' });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this deck? (cards themselves are not affected)')) return;
    await api.deleteDeck(id);
    load();
  }

  return (
    <div>
      <h1>Decks & Binders</h1>
      <p className="hint-text">Group cards from your collection into a named list — a deck you play, or a binder page you're curating.</p>

      <section className="panel">
        <h2>New Deck</h2>
        <form className="card-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>Category
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="tcg">TCG</option>
                <option value="sports">Sports</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>Sport / Game
              <input value={form.sport_or_game} onChange={(e) => setForm({ ...form, sport_or_game: e.target.value })} placeholder="Magic, Pokemon..." />
            </label>
          </div>
          <button className="btn primary" type="submit">Create Deck</button>
        </form>
      </section>

      <div className="set-grid">
        {decks.map((d) => (
          <div className="panel set-card" key={d.id}>
            <div className="panel-header-row">
              <h2><Link to={`/decks/${d.id}`}>{d.name}</Link></h2>
              <button className="btn small danger" onClick={() => handleDelete(d.id)}>Delete</button>
            </div>
            <p className="hint-text">{d.category} {d.sport_or_game ? `· ${d.sport_or_game}` : ''}</p>
            <p>{d.card_count} card(s)</p>
          </div>
        ))}
        {decks.length === 0 && <p>No decks yet.</p>}
      </div>
    </div>
  );
}
