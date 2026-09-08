import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useLanguage } from '../i18n.jsx';

export default function ForTrade() {
  const { t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [shareUrl, setShareUrl] = useState(null);

  function load() {
    api.listCards({ limit: 1000 }).then((r) => setRows(r.rows.filter((c) => c.for_trade)));
  }
  useEffect(load, []);

  async function shareForTrade() {
    const link = await api.createShareLink({ label: 'My For Trade List', kind: 'for_trade' });
    setShareUrl(`${window.location.origin}/share/${link.token}`);
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t('for_trade_title')} ({rows.length})</h1>
        <div className="cta-row">
          <button className="btn" onClick={shareForTrade}>{t('for_trade_share')}</button>
        </div>
      </div>
      {shareUrl && (
        <p className="hint-text">
          {t('want_list_public_link')} <a href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a>
        </p>
      )}
      <p className="hint-text">{t('for_trade_hint')}</p>

      <table className="data-table">
        <thead>
          <tr><th>{t('collection_col_player')}</th><th>{t('collection_col_set')}</th><th>{t('collection_col_year')}</th><th>{t('card_number_col')}</th><th>{t('collection_col_qty')}</th><th>{t('col_est_value')}</th></tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td><Link to={`/collection/${c.id}`}>{c.player_or_character || '(unnamed)'}</Link></td>
              <td>{c.set_name || c.team_or_set}</td>
              <td>{c.year}</td>
              <td>{c.card_number}</td>
              <td>{c.quantity}</td>
              <td>{c.current_value != null ? `$${Number(c.current_value).toFixed(2)}` : ''}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>{t('for_trade_none')}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
