import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Listings() {
  const [listings, setListings] = useState([]);
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({ card_id: '', platform: '', list_price: '', status: 'draft', external_url: '', notes: '' });
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);

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

  async function handlePushEbay(id) {
    setBusyId(id);
    setMsg(null);
    try {
      await api.pushEbayListing(id);
      setMsg({ ok: true, text: 'Pushed to eBay.' });
      load();
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusyId(null);
    }
  }

  async function handleSyncEbay(id) {
    setBusyId(id);
    setMsg(null);
    try {
      await api.syncEbayListing(id);
      setMsg({ ok: true, text: 'Synced status from eBay.' });
      load();
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1>Marketplace Listings</h1>
      <p className="hint-text">
        Draft and track listings across platforms (eBay, WhatNot, COMC, Facebook, etc). eBay listings can be pushed
        live and synced back via the eBay Sell API (Settings → API Keys) — implemented per eBay's docs but
        <strong> unverified against a live seller account</strong>; test with one listing before relying on it.
        Other platforms remain tracking-only — use Reports → Export for a spreadsheet you can adapt to a bulk-upload template.
      </p>
      {msg && <p className={msg.ok ? 'hint-text' : 'error-text'}>{msg.text}</p>}

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
              <td style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {l.platform.toLowerCase() === 'ebay' && !l.ebay_offer_id && (
                  <button className="btn small" disabled={busyId === l.id} onClick={() => handlePushEbay(l.id)}>
                    {busyId === l.id ? '...' : 'Push to eBay'}
                  </button>
                )}
                {l.ebay_offer_id && (
                  <button className="btn small" disabled={busyId === l.id} onClick={() => handleSyncEbay(l.id)}>
                    {busyId === l.id ? '...' : '↻ Sync'}
                  </button>
                )}
                <button className="btn small danger" onClick={() => handleDelete(l.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {listings.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No listings yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
