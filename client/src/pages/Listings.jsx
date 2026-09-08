import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLanguage } from '../i18n.jsx';

export default function Listings() {
  const { t } = useLanguage();
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
    if (!confirm(t('listings_confirm_delete'))) return;
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
      <h1>{t('listings_title')}</h1>
      <p className="hint-text">
        Draft and track listings across platforms (eBay, WhatNot, COMC, Facebook, etc). eBay listings can be pushed
        live and synced back via the eBay Sell API (Settings → API Keys) — implemented per eBay's docs but
        <strong> unverified against a live seller account</strong>; test with one listing before relying on it.
        Other platforms remain tracking-only — use Reports → Export for a spreadsheet you can adapt to a bulk-upload template.
      </p>
      {msg && <p className={msg.ok ? 'hint-text' : 'error-text'}>{msg.text}</p>}

      <section className="panel">
        <h2>{t('listings_new')}</h2>
        <form className="card-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>{t('col_card')}
              <select value={form.card_id} onChange={(e) => setForm({ ...form, card_id: e.target.value })} required>
                <option value="">{t('select_a_card')}</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.player_or_character || c.set_name} ({c.year})</option>
                ))}
              </select>
            </label>
            <label>{t('col_platform')}
              <input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="eBay, WhatNot..." required />
            </label>
            <label>{t('listings_list_price')}
              <input type="number" step="0.01" value={form.list_price} onChange={(e) => setForm({ ...form, list_price: e.target.value })} />
            </label>
            <label>{t('listings_external_url')}
              <input value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} placeholder="Link to live listing" />
            </label>
          </div>
          <button className="btn primary" type="submit">{t('listings_add')}</button>
        </form>
      </section>

      <table className="data-table">
        <thead>
          <tr><th>{t('col_card')}</th><th>{t('col_platform')}</th><th>{t('col_price')}</th><th>{t('field_status')}</th><th>{t('col_link')}</th><th></th></tr>
        </thead>
        <tbody>
          {listings.map((l) => (
            <tr key={l.id}>
              <td>{l.player_or_character || l.set_name}</td>
              <td>{l.platform}</td>
              <td>{l.list_price != null ? `$${Number(l.list_price).toFixed(2)}` : ''}</td>
              <td>
                <select value={l.status} onChange={(e) => updateStatus(l.id, e.target.value)}>
                  <option value="draft">{t('listings_status_draft')}</option>
                  <option value="active">{t('listings_status_active')}</option>
                  <option value="ended">{t('listings_status_ended')}</option>
                  <option value="sold">{t('listings_status_sold')}</option>
                </select>
              </td>
              <td>{l.external_url ? <a href={l.external_url} target="_blank" rel="noreferrer">{t('listings_open')}</a> : ''}</td>
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
                <button className="btn small danger" onClick={() => handleDelete(l.id)}>{t('btn_delete')}</button>
              </td>
            </tr>
          ))}
          {listings.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>{t('listings_none')}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
