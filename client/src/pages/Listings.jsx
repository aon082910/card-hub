import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Listings() {
  const [listings, setListings] = useState([]);
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({ card_id: '', platform: '', list_price: '', status: 'draft', external_url: '', notes: '' });

  function load() {
    api.listListings().then(setListings);
    api.listCards({ limit: 1000 }).then((r) => setCards(r.rows));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.card_id || !form.platform) return;
    await api.createListing({ ...form, card_id: Number(form.card_id) });
    setForm({ card_id: '', platform: '', list_price: '', status: 'draft', external_url: '', notes: '' });
    load();
  }

  async function updateStatus(id, status) {
    await api.updateListing(id, { status });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this listing?')) return;
    await api.deleteListing(id);
    load();
  }

  return (
    <div>
      <h1>Marketplace Listings</h1>
      <p className="hint-text">
        Draft and track listings across platforms (eBay, WhatNot, COMC, Facebook, etc). Direct API sync/OAuth per
        marketplace isn't built in yet — each platform requires its own developer keys registered by you. Use
        Reports → Export to generate a spreadsheet you can adapt for a platform's bulk-upload template.
      </p>

      <section className="panel">
        <h2>New Listing</h2>
        <form className="card-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>Card
              <select value={form.card_id} onChange={(e) => setForm({ ...form, card_id: e.target.value })} required>
                <option value="">Select a card...</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.player_or_character || c.set_name} ({c.year})</option>
                ))}
              </select>
            </label>
            <label>Platform
              <input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="eBay, WhatNot..." required />
            </label>
            <label>List Price ($)
              <input type="number" step="0.01" value={form.list_price} onChange={(e) => setForm({ ...form, list_price: e.target.value })} />
            </label>
            <label>External URL
              <input value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} placeholder="Link to live listing" />
            </label>
          </div>
          <button className="btn primary" type="submit">Add Listing</button>
        </form>
      </section>

      <table className="data-table">
        <thead>
          <tr><th>Card</th><th>Platform</th><th>Price</th><th>Status</th><th>Link</th><th></th></tr>
        </thead>
        <tbody>
          {listings.map((l) => (
            <tr key={l.id}>
              <td>{l.player_or_character || l.set_name}</td>
              <td>{l.platform}</td>
              <td>{l.list_price != null ? `$${Number(l.list_price).toFixed(2)}` : ''}</td>
              <td>
                <select value={l.status} onChange={(e) => updateStatus(l.id, e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="ended">Ended</option>
                  <option value="sold">Sold</option>
                </select>
              </td>
              <td>{l.external_url ? <a href={l.external_url} target="_blank" rel="noreferrer">Open</a> : ''}</td>
              <td><button className="btn small danger" onClick={() => handleDelete(l.id)}>Delete</button></td>
            </tr>
          ))}
          {listings.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No listings yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
