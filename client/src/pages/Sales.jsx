import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({ card_id: '', quantity_sold: 1, sale_price: '', fees: 0, shipping_cost: 0, platform: '', buyer: '', sale_date: '', notes: '' });

  function load() {
    api.listSales().then(setSales);
    api.listCards({ status: 'owned', limit: 1000 }).then((r) => setCards(r.rows));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.card_id || !form.sale_price) return;
    await api.createSale({ ...form, card_id: Number(form.card_id) });
    setForm({ card_id: '', quantity_sold: 1, sale_price: '', fees: 0, shipping_cost: 0, platform: '', buyer: '', sale_date: '', notes: '' });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this sale record?')) return;
    await api.deleteSale(id);
    load();
  }

  return (
    <div>
      <h1>Sales</h1>

      <section className="panel">
        <h2>Record a Sale</h2>
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
            <label>Quantity Sold
              <input type="number" min="1" value={form.quantity_sold} onChange={(e) => setForm({ ...form, quantity_sold: e.target.value })} />
            </label>
            <label>Sale Price ($)
              <input type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} required />
            </label>
            <label>Fees ($)
              <input type="number" step="0.01" value={form.fees} onChange={(e) => setForm({ ...form, fees: e.target.value })} />
            </label>
            <label>Shipping Cost ($)
              <input type="number" step="0.01" value={form.shipping_cost} onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })} />
            </label>
            <label>Platform
              <input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="eBay, WhatNot..." />
            </label>
            <label>Buyer
              <input value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })} />
            </label>
            <label>Sale Date
              <input type="date" value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })} />
            </label>
          </div>
          <button className="btn primary" type="submit">Record Sale</button>
        </form>
      </section>

      <table className="data-table">
        <thead>
          <tr><th>Card</th><th>Qty</th><th>Price</th><th>Fees</th><th>Shipping</th><th>Platform</th><th>Date</th><th></th></tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s.id}>
              <td>{s.player_or_character || s.set_name}</td>
              <td>{s.quantity_sold}</td>
              <td>${Number(s.sale_price).toFixed(2)}</td>
              <td>${Number(s.fees).toFixed(2)}</td>
              <td>${Number(s.shipping_cost).toFixed(2)}</td>
              <td>{s.platform}</td>
              <td>{s.sale_date}</td>
              <td><button className="btn small danger" onClick={() => handleDelete(s.id)}>Delete</button></td>
            </tr>
          ))}
          {sales.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>No sales recorded</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
