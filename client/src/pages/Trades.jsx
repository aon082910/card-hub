import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLanguage } from '../i18n.jsx';

export default function Trades() {
  const { t } = useLanguage();
  const [trades, setTrades] = useState([]);
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({ card_id: '', direction: 'out', counterparty: '', quantity: 1, value_estimate: '', trade_date: '', notes: '' });

  function load() {
    api.listTrades().then(setTrades);
    api.listCards({ limit: 1000 }).then((r) => setCards(r.rows));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.card_id) return;
    await api.createTrade({ ...form, card_id: Number(form.card_id) });
    setForm({ card_id: '', direction: 'out', counterparty: '', quantity: 1, value_estimate: '', trade_date: '', notes: '' });
    load();
  }

  async function handleDelete(id) {
    if (!confirm(t('trades_confirm_delete'))) return;
    await api.deleteTrade(id);
    load();
  }

  return (
    <div>
      <h1>{t('trades_title')}</h1>
      <p className="hint-text">{t('trades_hint')}</p>

      <section className="panel">
        <h2>{t('trades_log_a_trade')}</h2>
        <form className="card-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>{t('col_card')}
              <select value={form.card_id} onChange={(e) => setForm({ ...form, card_id: e.target.value })} required>
                <option value="">{t('select_a_card')}</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.player_or_character || c.set_name} ({c.year}) x{c.quantity}</option>
                ))}
              </select>
            </label>
            <label>{t('trades_direction')}
              <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
                <option value="out">{t('trades_traded_away')}</option>
                <option value="in">{t('trades_received')}</option>
              </select>
            </label>
            <label>{t('col_counterparty')}
              <input value={form.counterparty} onChange={(e) => setForm({ ...form, counterparty: e.target.value })} placeholder={t('trades_counterparty_ph')} />
            </label>
            <label>{t('field_quantity')}
              <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </label>
            <label>{t('trades_est_value')}
              <input type="number" step="0.01" value={form.value_estimate} onChange={(e) => setForm({ ...form, value_estimate: e.target.value })} />
            </label>
            <label>{t('trades_date')}
              <input type="date" value={form.trade_date} onChange={(e) => setForm({ ...form, trade_date: e.target.value })} />
            </label>
          </div>
          <button className="btn primary" type="submit">{t('trades_log')}</button>
        </form>
      </section>

      <table className="data-table">
        <thead><tr><th>{t('col_card')}</th><th>{t('col_direction')}</th><th>{t('col_counterparty')}</th><th>{t('collection_col_qty')}</th><th>{t('col_est_value')}</th><th>{t('col_date')}</th><th></th></tr></thead>
        <tbody>
          {trades.map((tr) => (
            <tr key={tr.id}>
              <td>{tr.player_or_character || tr.set_name}</td>
              <td>{tr.direction === 'out' ? t('trades_traded_away') : t('trades_received')}</td>
              <td>{tr.counterparty}</td>
              <td>{tr.quantity}</td>
              <td>{tr.value_estimate != null ? `$${Number(tr.value_estimate).toFixed(2)}` : ''}</td>
              <td>{tr.trade_date}</td>
              <td><button className="btn small danger" onClick={() => handleDelete(tr.id)}>{t('btn_delete')}</button></td>
            </tr>
          ))}
          {trades.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>{t('trades_none')}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
