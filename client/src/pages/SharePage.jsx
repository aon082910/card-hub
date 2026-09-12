import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function SharePage() {
  const { token } = useParams();
  const [data, setData] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/public/share/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 410 ? 'This share link has expired.' : 'Share link not found.');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);

  return (
    <div className="app-shell">
      <header className="nav">
        <div className="nav-brand">Card-Hub</div>
      </header>
      <main className="main-content">
        {error && <p className="error-text">{error}</p>}
        {!error && data === undefined && <p>Loading...</p>}
        {data && (
          <div>
            <h1>{data.label || (data.kind === 'wanted' ? 'Want List' : data.kind === 'collection' ? 'My Collection' : data.kind === 'for_trade' ? 'For Trade' : 'Shared Cards')}</h1>
            <p className="hint-text">A read-only view shared from someone's Card-Hub collection.</p>
            <div className="image-gallery">
              {data.cards.map((c) => (
                <div className="image-thumb" style={{ width: 180 }} key={c.id}>
                  {c.image && <img src={c.image} alt={c.player_or_character} style={{ height: 140 }} />}
                  <div style={{ padding: '0.5rem' }}>
                    <strong>{c.player_or_character || c.set_name}</strong>
                    <p className="hint-text" style={{ margin: '0.25rem 0' }}>
                      {[c.set_name, c.year, c.card_number ? `#${c.card_number}` : null].filter(Boolean).join(' · ')}
                    </p>
                    {c.is_graded ? (
                      <p className="hint-text">{c.grading_company} {c.grade}</p>
                    ) : c.raw_condition ? <p className="hint-text">{c.raw_condition}</p> : null}
                    {c.current_value != null && <p><strong>${Number(c.current_value).toFixed(2)}</strong></p>}
                  </div>
                </div>
              ))}
              {data.cards.length === 0 && <p>No cards in this share.</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
