import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.dashboard().then(setData).catch(console.error);
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Cards</div>
          <div className="stat-value">{data.totals.total_quantity}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Collection Value</div>
          <div className="stat-value">{money(data.totals.total_value)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Cost Basis</div>
          <div className="stat-value">{money(data.totals.total_cost)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Realized Profit</div>
          <div className={`stat-value ${data.profit >= 0 ? 'positive' : 'negative'}`}>{money(data.profit)}</div>
        </div>
      </div>

      <div className="panel-row">
        <section className="panel">
          <h2>By Category</h2>
          <table className="simple-table">
            <thead><tr><th>Category</th><th>Count</th><th>Value</th></tr></thead>
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
          <h2>Recent Sales</h2>
          <table className="simple-table">
            <thead><tr><th>Card</th><th>Price</th><th>Date</th></tr></thead>
            <tbody>
              {data.recentSales.map((s) => (
                <tr key={s.id}>
                  <td>{s.player_or_character || s.set_name}</td>
                  <td>{money(s.sale_price)}</td>
                  <td>{s.sale_date}</td>
                </tr>
              ))}
              {data.recentSales.length === 0 && <tr><td colSpan={3}>No sales yet</td></tr>}
            </tbody>
          </table>
        </section>
      </div>

      <div className="cta-row">
        <Link className="btn primary" to="/collection/new">+ Add Card</Link>
        <Link className="btn" to="/collection">View Collection</Link>
      </div>
    </div>
  );
}
