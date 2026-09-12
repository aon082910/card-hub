import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [msg, setMsg] = useState(null);

  function load() {
    api.listFriends().then(setFriends);
    api.listFriendRequests().then(setRequests);
  }
  useEffect(load, []);

  async function search(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setResults(await api.searchUsers(q.trim()));
  }

  async function sendRequest(username) {
    try {
      await api.sendFriendRequest(username);
      setMsg({ ok: true, text: `Friend request sent to ${username}.` });
      setResults((r) => r.filter((u) => u.username !== username));
      load();
    } catch (err) {
      let text = err.message;
      try { text = JSON.parse(err.message.split(': ').slice(1).join(': ')).error || text; } catch { /* ignore */ }
      setMsg({ ok: false, text });
    } finally {
      setTimeout(() => setMsg(null), 3000);
    }
  }

  async function accept(id) { await api.acceptFriendRequest(id); load(); }
  async function decline(id) { await api.declineFriendRequest(id); load(); }
  async function remove(id) {
    if (!confirm('Remove this friend?')) return;
    await api.removeFriend(id);
    load();
  }

  return (
    <div>
      <h1>Friends</h1>

      <section className="panel">
        <h2>Find People</h2>
        <form className="filter-bar" onSubmit={search}>
          <input placeholder="Search by username..." value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn" type="submit">Search</button>
        </form>
        {msg && <p className={msg.ok ? 'hint-text' : 'error-text'}>{msg.text}</p>}
        {results.length > 0 && (
          <ul className="simple-table" style={{ marginTop: '0.5rem' }}>
            {results.map((u) => (
              <li key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0' }}>
                <span>{u.username}</span>
                <button className="btn small" onClick={() => sendRequest(u.username)}>Add Friend</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {requests.incoming.length > 0 && (
        <section className="panel">
          <h2>Friend Requests</h2>
          <ul className="simple-table">
            {requests.incoming.map((r) => (
              <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0' }}>
                <span>{r.requester_username} wants to be friends</span>
                <span className="cta-row">
                  <button className="btn small primary" onClick={() => accept(r.id)}>Accept</button>
                  <button className="btn small" onClick={() => decline(r.id)}>Decline</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {requests.outgoing.length > 0 && (
        <section className="panel">
          <h2>Sent Requests</h2>
          <ul className="simple-table">
            {requests.outgoing.map((r) => (
              <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0' }}>
                <span>Waiting on {r.addressee_username}</span>
                <button className="btn small danger" onClick={() => remove(r.id)}>Cancel</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <h2>Your Friends</h2>
        {friends.length === 0 && <p className="hint-text">No friends yet — search above to send a request.</p>}
        {friends.length > 0 && (
          <ul className="simple-table">
            {friends.map((f) => (
              <li key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0' }}>
                <span>{f.friend_username}</span>
                <span className="cta-row">
                  <Link className="btn small" to={`/friends/${f.friend_id}`}>View Collection</Link>
                  <Link className="btn small" to={`/messages/${f.friend_id}`}>Message</Link>
                  <button className="btn small danger" onClick={() => remove(f.id)}>Remove</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
