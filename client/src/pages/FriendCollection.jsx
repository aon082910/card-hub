import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function FriendCollection() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [myCards, setMyCards] = useState([]);
  const [requestedIds, setRequestedIds] = useState(new Set());
  const [offeredIds, setOfferedIds] = useState(new Set());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.friendCollection(userId).then(setData).catch((e) => setError(e.message));
    api.listCards({ status: 'owned', limit: 1000 }).then((r) => setMyCards(r.rows));
  }, [userId]);

  function toggle(set, setSet, id) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSet(next);
  }

  async function proposeTrade() {
    setError(null);
    setSending(true);
    try {
      await api.createTradeRequest({
        recipientId: Number(userId),
        offered_card_ids: [...offeredIds],
        requested_card_ids: [...requestedIds],
        notes,
      });
      navigate(`/messages/${userId}`);
    } catch (e) {
      let text = e.message;
      try { text = JSON.parse(e.message.split(': ').slice(1).join(': ')).error || text; } catch { /* ignore */ }
      setError(text);
    } finally {
      setSending(false);
    }
  }

  if (error && !data) return <p className="error-text">{error}</p>;
  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <p><Link to="/friends">&larr; Friends</Link></p>
      <div className="page-header">
        <h1>{data.friend.username}'s Collection</h1>
        <Link className="btn" to={`/messages/${userId}`}>Message</Link>
      </div>
      <p className="hint-text">Check cards of theirs you'd want, and cards of yours to offer, then propose a trade below.</p>

      <div className="scan-gallery">
        {data.cards.map((c) => (
          <label key={c.id} className={`scan-pair-card ${requestedIds.has(c.id) ? 'row-selected' : ''}`} style={{ display: 'block', cursor: 'pointer' }}>
            <input type="checkbox" checked={requestedIds.has(c.id)} onChange={() => toggle(requestedIds, setRequestedIds, c.id)} style={{ marginRight: '0.5rem' }} />
            <strong>{c.player_or_character || c.set_name || '(unnamed)'}</strong>
            <p className="hint-text" style={{ margin: '0.2rem 0' }}>
              {[c.set_name, c.year, c.card_number ? `#${c.card_number}` : null].filter(Boolean).join(' · ')}
            </p>
            {!!c.for_trade && <span className="badge">for trade</span>}
          </label>
        ))}
        {data.cards.length === 0 && <p className="hint-text">Nothing in their collection yet.</p>}
      </div>

      <section className="panel" style={{ marginTop: '1.5rem' }}>
        <h2>Propose a Trade</h2>
        <p className="hint-text">{requestedIds.size} of theirs selected. Now pick what you're offering:</p>
        <div className="scan-gallery">
          {myCards.map((c) => (
            <label key={c.id} className={`scan-pair-card ${offeredIds.has(c.id) ? 'row-selected' : ''}`} style={{ display: 'block', cursor: 'pointer' }}>
              <input type="checkbox" checked={offeredIds.has(c.id)} onChange={() => toggle(offeredIds, setOfferedIds, c.id)} style={{ marginRight: '0.5rem' }} />
              <strong>{c.player_or_character || c.set_name || '(unnamed)'}</strong>
              <p className="hint-text" style={{ margin: '0.2rem 0' }}>
                {[c.set_name, c.year, c.card_number ? `#${c.card_number}` : null].filter(Boolean).join(' · ')}
              </p>
            </label>
          ))}
        </div>
        <label className="full-width" style={{ display: 'block', marginTop: '1rem' }}>Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </label>
        {error && <p className="error-text">{error}</p>}
        <div className="cta-row" style={{ marginTop: '0.75rem' }}>
          <button className="btn primary" disabled={sending || (offeredIds.size === 0 && requestedIds.size === 0)} onClick={proposeTrade}>
            {sending ? 'Sending...' : 'Send Trade Proposal'}
          </button>
        </div>
      </section>
    </div>
  );
}
