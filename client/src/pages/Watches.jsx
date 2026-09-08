import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLanguage } from '../i18n.jsx';

export default function Watches() {
  const { t } = useLanguage();
  const [watches, setWatches] = useState([]);
  const [form, setForm] = useState({ query: '', target_price: '', notes: '' });
  const [checking, setChecking] = useState(null);
  const [results, setResults] = useState({}); // watchId -> matches[]
  const [error, setError] = useState(null);

  function load() {
    api.listWatches().then(setWatches);
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.query) return;
    await api.createWatch(form);
    setForm({ query: '', target_price: '', notes: '' });
    load();
  }

  async function handleDelete(id) {
    if (!confirm(t('watches_confirm_delete'))) return;
    await api.deleteWatch(id);
    load();
  }

  async function handleCheck(id) {
    setChecking(id);
    setError(null);
    try {
      const res = await api.checkWatch(id);
      setResults((r) => ({ ...r, [id]: res.matches }));
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setChecking(null);
    }
  }

  return (
    <div>
      <h1>{t('watches_title')}</h1>
      <p className="hint-text">{t('watches_hint')}</p>
      {error && <p className="error-text">{error}</p>}

      <section className="panel">
        <h2>{t('watches_new')}</h2>
        <form className="card-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>{t('watches_query')}
              <input value={form.query} onChange={(e) => setForm({ ...form, query: e.target.value })} placeholder="1986 Fleer Michael Jordan PSA 9" required />
            </label>
            <label>{t('watches_target_price')}
              <input type="number" step="0.01" value={form.target_price} onChange={(e) => setForm({ ...form, target_price: e.target.value })} />
            </label>
          </div>
          <button className="btn primary" type="submit">{t('watches_add')}</button>
        </form>
      </section>

      {watches.map((w) => (
        <section className="panel" key={w.id}>
          <div className="panel-header-row">
            <h2>{w.query}</h2>
            <div className="cta-row">
              <button className="btn small" disabled={checking === w.id} onClick={() => handleCheck(w.id)}>
                {checking === w.id ? '...' : t('watches_check_now')}
              </button>
              <button className="btn small danger" onClick={() => handleDelete(w.id)}>{t('btn_delete')}</button>
            </div>
          </div>
          <p className="hint-text">
            {w.target_price != null && `Target: $${Number(w.target_price).toFixed(2)} · `}
            {w.last_checked_at ? `${t('watches_last_checked')}: ${w.last_checked_at}` : ''}
          </p>
          {results[w.id] && (
            <div>
              <p className="hint-text">{t('watches_matches')}: {results[w.id].length}</p>
              {results[w.id].length === 0 && <p className="hint-text">{t('watches_no_matches')}</p>}
              <ul className="similar-list">
                {results[w.id].map((m, i) => (
                  <li key={i}>
                    <a href={m.url} target="_blank" rel="noreferrer">{m.title}</a> — ${Number(m.price).toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ))}
      {watches.length === 0 && <p className="hint-text">{t('watches_none')}</p>}
    </div>
  );
}
