import React, { useState } from 'react';
import { api } from '../api.js';

const PLACEHOLDERS = {
  pokemon: 'Search Pokemon card name...',
  yugioh: 'Search Yu-Gi-Oh card name...',
  magic: 'Search Magic: The Gathering card name...',
};

// Free, keyless live lookups: TCGdex (Pokemon), YGOPRODeck (Yu-Gi-Oh), Scryfall (Magic).
// Autofills the form and pulls the card's official image in directly.
export default function CardLookup({ game, onPick }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function search() {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      let rows;
      if (game === 'yugioh') rows = await api.lookupYugioh(q);
      else if (game === 'magic') rows = await api.lookupMagic(q);
      else rows = await api.lookupPokemon(q);
      setResults(rows);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function pick(row) {
    if (game === 'pokemon' && row.source === 'tcgdex') {
      try {
        const detail = await api.lookupPokemonCard(row.id);
        onPick(detail);
        return;
      } catch (e) {
        setError(e.message);
        return;
      }
    }
    onPick(row);
  }

  return (
    <div className="card-lookup">
      <div className="filter-bar">
        <input
          placeholder={PLACEHOLDERS[game] || 'Search card name...'}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <button className="btn" onClick={search} disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
      </div>
      {error && <p className="error-text">{error}</p>}
      {results && (
        <div className="lookup-results">
          {results.map((r) => (
            <button className="lookup-result" key={r.id} onClick={() => pick(r)}>
              {r.image && <img src={r.image} alt={r.name} />}
              <span>{r.name}{r.setName ? ` — ${r.setName}` : ''}{r.number ? ` #${r.number}` : ''}</span>
            </button>
          ))}
          {results.length === 0 && <p className="hint-text">No matches found.</p>}
        </div>
      )}
    </div>
  );
}
