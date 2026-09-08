import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useLanguage } from '../i18n.jsx';

export default function Decks() {
  const { t } = useLanguage();
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
    if (!confirm(t('decks_confirm_delete'))) return;
    await api.deleteDeck(id);
    load();
  }

  return (
    <div>
      <h1>{t('decks_title')}</h1>
      <p className="hint-text">{t('decks_hint')}</p>

      <section className="panel">
        <h2>{t('decks_new')}</h2>
        <form className="card-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>{t('decks_name')}
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>{t('field_category')}
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="tcg">{t('category_tcg')}</option>
                <option value="sports">{t('category_sports')}</option>
                <option value="other">{t('category_other')}</option>
              </select>
            </label>
            <label>{t('field_sport_or_game')}
              <input value={form.sport_or_game} onChange={(e) => setForm({ ...form, sport_or_game: e.target.value })} placeholder="Magic, Pokemon..." />
            </label>
          </div>
          <button className="btn primary" type="submit">{t('decks_create')}</button>
        </form>
      </section>

      <div className="set-grid">
        {decks.map((d) => (
          <div className="panel set-card" key={d.id}>
            <div className="panel-header-row">
              <h2><Link to={`/decks/${d.id}`}>{d.name}</Link></h2>
              <button className="btn small danger" onClick={() => handleDelete(d.id)}>{t('btn_delete')}</button>
            </div>
            <p className="hint-text">{d.category} {d.sport_or_game ? `· ${d.sport_or_game}` : ''}</p>
            <p>{d.card_count} {t('decks_card_count')}</p>
          </div>
        ))}
        {decks.length === 0 && <p>{t('decks_none')}</p>}
      </div>
    </div>
  );
}
