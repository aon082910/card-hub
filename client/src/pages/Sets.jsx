import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLanguage } from '../i18n.jsx';

const empty = { name: '', category: 'sports', sport_or_game: '', year: '', manufacturer: '', total_cards: '', notes: '' };

export default function Sets() {
  const { t } = useLanguage();
  const [sets, setSets] = useState([]);
  const [form, setForm] = useState(empty);
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);

  function load() {
    api.listSets().then(setSets);
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) return;
    await api.createSet({ ...form, total_cards: Number(form.total_cards) || 0 });
    setForm(empty);
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this set definition? (cards themselves are not affected)')) return;
    await api.deleteSet(id);
    if (expanded === id) setExpanded(null);
    load();
  }

  async function toggleExpand(s) {
    if (expanded === s.id) { setExpanded(null); return; }
    setExpanded(s.id);
    const d = await api.getSet(s.id);
    setDetail(d);
  }

  return (
    <div>
      <h1>{t('sets_title')}</h1>
      <p className="hint-text">
        Define a set (matched by Set Name + Year + Manufacturer on your cards) and track how much of it you own.
        Completion is based on distinct card numbers owned in your collection, not sold.
      </p>

      <section className="panel">
        <h2>Define a Set</h2>
        <form className="card-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>Set Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>Category
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="sports">Sports</option>
                <option value="tcg">TCG</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>Sport / Game
              <input value={form.sport_or_game} onChange={(e) => setForm({ ...form, sport_or_game: e.target.value })} />
            </label>
            <label>Year
              <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </label>
            <label>Manufacturer
              <input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
            </label>
            <label>Total Cards in Set
              <input type="number" value={form.total_cards} onChange={(e) => setForm({ ...form, total_cards: e.target.value })} />
            </label>
          </div>
          <button className="btn primary" type="submit">Add Set</button>
        </form>
      </section>

      <div className="set-grid">
        {sets.map((s) => (
          <div className="panel set-card" key={s.id}>
            <div className="panel-header-row">
              <h2>{s.name} {s.year ? `(${s.year})` : ''}</h2>
              <button className="btn small danger" onClick={() => handleDelete(s.id)}>Delete</button>
            </div>
            <p className="hint-text">{s.manufacturer} {s.sport_or_game ? `· ${s.sport_or_game}` : ''}</p>
            {s.total_cards > 0 ? (
              <>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${Math.min(100, s.percent)}%` }} /></div>
                <p>{s.owned_count} / {s.total_cards} owned ({s.percent}%)</p>
              </>
            ) : (
              <p>{s.owned_count} owned (no total set)</p>
            )}
            <button className="btn small" onClick={() => toggleExpand(s)}>{expanded === s.id ? 'Hide' : 'Show'} owned cards</button>
            {expanded === s.id && detail && (
              <ul className="simple-table" style={{ marginTop: '0.5rem' }}>
                {detail.cards.map((c) => (
                  <li key={c.id}>#{c.card_number || '?'} — {c.player_or_character || '(unnamed)'}</li>
                ))}
                {detail.cards.length === 0 && <li>No cards matched yet.</li>}
              </ul>
            )}
          </div>
        ))}
        {sets.length === 0 && <p>No sets defined yet.</p>}
      </div>
    </div>
  );
}
