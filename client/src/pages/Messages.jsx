import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Messages() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [thread, setThread] = useState([]);
  const [tradeRequests, setTradeRequests] = useState([]);
  const [body, setBody] = useState('');
  const [friends, setFriends] = useState([]);

  function loadConversations() {
    api.listConversations().then(setConversations);
    api.listFriends().then(setFriends);
  }
  useEffect(loadConversations, []);

  function loadThread() {
    if (!userId) return;
    api.messagesWith(userId).then(setThread);
    api.listTradeRequests().then(setTradeRequests);
  }
  useEffect(loadThread, [userId]);

  async function handleSend(e) {
    e.preventDefault();
    if (!body.trim()) return;
    await api.sendMessage(userId, body.trim());
    setBody('');
    loadThread();
  }

  async function respondTrade(id, action) {
    if (action === 'accept') await api.acceptTradeRequest(id);
    else if (action === 'decline') await api.declineTradeRequest(id);
    else if (action === 'complete') {
      if (!confirm('Mark this trade completed? This transfers the agreed cards between collections right now.')) return;
      await api.completeTradeRequest(id);
    }
    loadThread();
  }

  const friendName = friends.find((f) => String(f.friend_id) === String(userId))?.friend_username;
  const tradeById = new Map(tradeRequests.map((t) => [t.id, t]));

  if (!userId) {
    return (
      <div>
        <h1>Messages</h1>
        {conversations.length === 0 && <p className="hint-text">No conversations yet — message a friend from the Friends page.</p>}
        {conversations.length > 0 && (
          <ul className="simple-table">
            {conversations.map((c) => (
              <li key={c.user.id} style={{ padding: '0.4rem 0' }}>
                <Link to={`/messages/${c.user.id}`} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{c.user.username} {c.unreadCount > 0 && <span className="badge status-listed">{c.unreadCount}</span>}</span>
                  <span className="hint-text">{c.lastMessage?.body?.slice(0, 60)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div>
      <p><Link to="/messages">&larr; All Conversations</Link></p>
      <h1>{friendName || 'Conversation'}</h1>
      <section className="panel">
        <div className="ocr-lines" style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {thread.map((m) => {
            const tr = m.trade_request_id ? tradeById.get(m.trade_request_id) : null;
            return (
              <div key={m.id} className="panel" style={{ marginBottom: 0, padding: '0.5rem 0.75rem' }}>
                <p style={{ margin: 0 }}>{m.body}</p>
                <p className="hint-text" style={{ margin: '0.2rem 0 0' }}>{new Date(m.created_at).toLocaleString()}</p>
                {tr && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <p className="hint-text" style={{ margin: 0 }}>
                      Trade proposal — offering {tr.offered_cards.length} card(s), requesting {tr.requested_cards.length} card(s). Status: <strong>{tr.status}</strong>
                    </p>
                    {tr.status === 'pending' && tr.recipient_id === user?.id && (
                      <span className="cta-row" style={{ marginTop: '0.3rem' }}>
                        <button className="btn small primary" onClick={() => respondTrade(tr.id, 'accept')}>Accept</button>
                        <button className="btn small" onClick={() => respondTrade(tr.id, 'decline')}>Decline</button>
                      </span>
                    )}
                    {tr.status === 'accepted' && (
                      <span className="cta-row" style={{ marginTop: '0.3rem' }}>
                        <button className="btn small primary" onClick={() => respondTrade(tr.id, 'complete')}>Mark Completed</button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {thread.length === 0 && <p className="hint-text">No messages yet.</p>}
        </div>
        <form className="filter-bar" onSubmit={handleSend} style={{ marginTop: '0.75rem' }}>
          <input placeholder="Write a message..." value={body} onChange={(e) => setBody(e.target.value)} />
          <button className="btn primary" type="submit">Send</button>
        </form>
      </section>
    </div>
  );
}
