import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useLanguage } from '../i18n.jsx';

export default function TradeMatch() {
  const { t } = useLanguage();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleCompare(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.tradeMatch(url.trim());
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const directionLabel = result?.direction === 'you_have_what_they_want'
    ? t('trade_match_you_have')
    : t('trade_match_they_have');

  return (
    <div>
      <h1>{t('trade_match_title')}</h1>
      <p className="hint-text">{t('trade_match_hint')}</p>

      <section className="panel">
        <form className="filter-bar" onSubmit={handleCompare}>
          <input
            placeholder={t('trade_match_url_ph')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button className="btn primary" type="submit" disabled={loading}>{loading ? t('trade_match_comparing') : t('trade_match_compare')}</button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </section>

      {result && (
        <section className="panel">
          <h2>{result.theirLabel || t('trade_match_shared_cards')}</h2>
          <p className="hint-text">{directionLabel}</p>
          {result.matches.length === 0 && <p>{t('trade_match_none')}</p>}
          {result.matches.length > 0 && (
            <table className="simple-table">
              <thead>
                <tr><th>{t('collection_col_player')}</th><th>{t('collection_col_set')}</th><th>{t('card_number_col')}</th><th></th></tr>
              </thead>
              <tbody>
                {result.matches.map(({ card }) => (
                  <tr key={card.id}>
                    <td><Link to={`/collection/${card.id}`}>{card.player_or_character || '(unnamed)'}</Link></td>
                    <td>{card.set_name || card.team_or_set}</td>
                    <td>{card.card_number}</td>
                    <td>{card.current_value != null ? `$${Number(card.current_value).toFixed(2)}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
