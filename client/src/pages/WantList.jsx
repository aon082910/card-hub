import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function WantList() {
  const [rows, setRows] = useState([]);
  const [shareUrl, setShareUrl] = useState(null);

  function load() {
    api.listCards({ status: 'wanted', limit: 1000 }).then((r) => setRows(r.rows));
  }
  useEffect(load, []);

  async function shareWantList() {
    const link = await api.createShareLink({ label: 'My Want List', kind: 'wanted' });
    const url = `${window.location.origin}/share/${link.token}`;
    setShareUrl(url);
  }

  return (
    <div>
      <div className="page-header">
        <h1>Want List ({rows.length})</h1>
        <div className="cta-row">
          <button className="btn" onClick={shareWantList}>🔗 Share Want List</button>
          <Link className="btn primary" to="/collection/new">+ Add Wanted Card</Link>
        </div>
      </div>
      {shareUrl && (
        <p className="hint-text">
          Public link (no login needed): <a href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a>
        </p>
      )}
      <p className="hint-text">Cards marked with status "Wanted" show up here — mark a card Wanted from Add Card or a card's Details form.</p>

      <table className="data-table">
        <thead>
          <tr><th>Player/Character</th><th>Set</th><th>Year</th><th>Card #</th><th>Est. Value</th></tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td><Link to={`/collection/${c.id}`}>{c.player_or_character || '(unnamed)'}</Link></td>
              <td>{c.set_name || c.team_or_set}</td>
              <td>{c.year}</td>
              <td>{c.card_number}</td>
              <td>{c.current_value != null ? `$${Number(c.current_value).toFixed(2)}` : ''}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Nothing on your want list yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
