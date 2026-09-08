import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLanguage } from '../i18n.jsx';

export default function Sales() {
  const { t } = useLanguage();
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
    if (!confirm(t('sales_confirm_delete'))) return;
    await api.deleteSale(id);
    load();
  }

  return (
    <div>
      <h1>{t('sales_title')}</h1>

      <section className="panel">
        <h2>{t('sales_record_a_sale')}</h2>
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
            <label>{t('sales_qty_sold')}
              <input type="number" min="1" value={form.quantity_sold} onChange={(e) => setForm({ ...form, quantity_sold: e.target.value })} />
            </label>
            <label>{t('sales_sale_price')}
              <input type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} required />
            </label>
            <label>{t('col_fees')} ($)
              <input type="number" step="0.01" value={form.fees} onChange={(e) => setForm({ ...form, fees: e.target.value })} />
            </label>
            <label>{t('col_shipping')} ($)
              <input type="number" step="0.01" value={form.shipping_cost} onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })} />
            </label>
            <label>{t('col_platform')}
              <input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="eBay, WhatNot..." />
            </label>
            <label>{t('sales_buyer')}
              <input value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })} />
            </label>
            <label>{t('sales_sale_date')}
              <input type="date" value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })} />
            </label>
          </div>
          <button className="btn primary" type="submit">{t('sales_record')}</button>
        </form>
      </section>

      <table className="data-table">
        <thead>
          <tr><th>{t('col_card')}</th><th>{t('collection_col_qty')}</th><th>{t('col_price')}</th><th>{t('col_fees')}</th><th>{t('col_shipping')}</th><th>{t('col_platform')}</th><th>{t('col_date')}</th><th></th></tr>
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
              <td><button className="btn small danger" onClick={() => handleDelete(s.id)}>{t('btn_delete')}</button></td>
            </tr>
          ))}
          {sales.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>{t('sales_none')}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
