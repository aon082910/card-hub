import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useLanguage } from '../i18n.jsx';

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

export default function Dashboard() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.dashboard().then(setData).catch(console.error);
  }, []);

  if (!data) return <p>{t('loading')}</p>;

  return (
    <div>
      <h1>{t('dashboard_title')}</h1>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">{t('dashboard_total_cards')}</div>
          <div className="stat-value">{data.totals.total_quantity}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dashboard_collection_value')}</div>
          <div className="stat-value">{money(data.totals.total_value)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dashboard_total_cost')}</div>
          <div className="stat-value">{money(data.totals.total_cost)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dashboard_profit')}</div>
          <div className={`stat-value ${data.profit >= 0 ? 'positive' : 'negative'}`}>{money(data.profit)}</div>
        </div>
      </div>

      <div className="panel-row">
        <section className="panel">
          <h2>{t('dashboard_by_category')}</h2>
          <table className="simple-table">
            <thead><tr><th>{t('field_category')}</th><th>{t('collection_col_qty')}</th><th>{t('collection_col_value')}</th></tr></thead>
            <tbody>
              {data.byCategory.map((c) => (
                <tr key={c.category}>
                  <td>{c.category}</td>
                  <td>{c.count}</td>
                  <td>{money(c.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h2>{t('dashboard_recent_sales')}</h2>
          <table className="simple-table">
            <thead><tr><th>{t('collection_col_player')}</th><th>{t('collection_col_value')}</th><th>{t('field_purchase_date')}</th></tr></thead>
            <tbody>
              {data.recentSales.map((s) => (
                <tr key={s.id}>
                  <td>{s.player_or_character || s.set_name}</td>
                  <td>{money(s.sale_price)}</td>
                  <td>{s.sale_date}</td>
                </tr>
              ))}
              {data.recentSales.length === 0 && <tr><td colSpan={3}>{t('dashboard_no_sales')}</td></tr>}
            </tbody>
          </table>
        </section>
      </div>

      <div className="cta-row">
        <Link className="btn primary" to="/collection/new">{t('dashboard_add_card')}</Link>
        <Link className="btn" to="/collection">{t('dashboard_view_collection')}</Link>
      </div>
    </div>
  );
}
