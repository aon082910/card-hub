import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Trades() {
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
    if (!confirm('Delete this trade record?')) return;
    await api.deleteTrade(id);
    load();
  }

  return (
    <div>
      <h1>Trades</h1>
      <p className="hint-text">A simple ledger for cards traded with other collectors (no money changing hands). Trading a card away reduces its quantity in your collection, same as a sale.</p>

      <section className="panel">
        <h2>Log a Trade</h2>
        <form className="card-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>Card
              <select value={form.card_id} onChange={(e) => setForm({ ...form, card_id: e.target.value })} required>
                <option value="">Select a card...</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.player_or_character || c.set_name} ({c.year}) x{c.quantity}</option>
                ))}
              </select>
            </label>
            <label>Direction
              <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
                <option value="out">Traded Away</option>
                <option value="in">Received</option>
              </select>
            </label>
            <label>Counterparty
              <input value={form.counterparty} onChange={(e) => setForm({ ...form, counterparty: e.target.value })} placeholder="Who'd you trade with?" />
            </label>
            <label>Quantity
              <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </label>
            <label>Estimated Value ($)
              <input type="number" step="0.01" value={form.value_estimate} onChange={(e) => setForm({ ...form, value_estimate: e.target.value })} />
            </label>
            <label>Trade Date
              <input type="date" value={form.trade_date} onChange={(e) => setForm({ ...form, trade_date: e.target.value })} />
            </label>
          </div>
          <button className="btn primary" type="submit">Log Trade</button>
        </form>
      </section>

      <table className="data-table">
        <thead><tr><th>Card</th><th>Direction</th><th>Counterparty</th><th>Qty</th><th>Est. Value</th><th>Date</th><th></th></tr></thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.id}>
              <td>{t.player_or_character || t.set_name}</td>
              <td>{t.direction === 'out' ? 'Traded Away' : 'Received'}</td>
              <td>{t.counterparty}</td>
              <td>{t.quantity}</td>
              <td>{t.value_estimate != null ? `$${Number(t.value_estimate).toFixed(2)}` : ''}</td>
              <td>{t.trade_date}</td>
              <td><button className="btn small danger" onClick={() => handleDelete(t.id)}>Delete</button></td>
            </tr>
          ))}
          {trades.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No trades logged</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
