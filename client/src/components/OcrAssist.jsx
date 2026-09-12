import React, { useState } from 'react';
import { api } from '../api.js';
import { extractCardText } from '../ocr.js';

const GAMES = [
  { key: 'pokemon', label: 'Pokemon', lookup: (q) => api.lookupPokemon(q) },
  { key: 'yugioh', label: 'Yu-Gi-Oh', lookup: (q) => api.lookupYugioh(q) },
  { key: 'magic', label: 'Magic', lookup: (q) => api.lookupMagic(q) },
];

// On-device OCR (tesseract.js) reads raw text off a card photo, then cross-references
// the most likely candidate lines against the same live card databases the 🔍 Look Up
// buttons use (TCGdex/YGOPRODeck/Scryfall) - a real, working "what card is this"
// pipeline built from OCR + name search, rather than true image-based visual
// recognition (which would need a licensed card-image dataset or a trained model).
export default function OcrAssist({ imageUrl, onPick }) {
  const [lines, setLines] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [matching, setMatching] = useState(null); // { line, game } while searching
  const [matches, setMatches] = useState(null); // { line, game, results }

  async function runOcr() {
    setRunning(true);
    setError(null);
    setLines(null);
    setMatches(null);
    try {
      const found = await extractCardText(imageUrl);
      setLines(found.length ? found : ['(no text detected)']);
    } catch (e) {
      setError(e.message || 'OCR failed');
    } finally {
      setRunning(false);
    }
  }

  async function copy(line) {
    try {
      await navigator.clipboard.writeText(line);
      setCopied(line);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* clipboard unavailable */ }
  }

  async function searchAs(line, game) {
    setMatching({ line, game: game.key });
    setMatches(null);
    setError(null);
    try {
      const results = await game.lookup(line);
      setMatches({ line, game: game.key, results });
    } catch (e) {
      setError(e.message);
    } finally {
      setMatching(null);
    }
  }

  async function pick(row, gameKey) {
    if (gameKey === 'pokemon' && row.source === 'tcgdex') {
      const detail = await api.lookupPokemonCard(row.id).catch((e) => { setError(e.message); return null; });
      if (detail) onPick(detail, gameKey);
      return;
    }
    onPick(row, gameKey);
  }

  return (
    <div className="ocr-assist">
      <button className="btn" onClick={runOcr} disabled={running}>{running ? 'Reading card...' : '🔎 Extract Text (OCR)'}</button>
      {error && <p className="error-text">{error}</p>}
      {lines && (
        <ul className="ocr-lines">
          {lines.map((l, i) => (
            <li key={i} className="ocr-line-row">
              <span>{l}</span>
              <span className="ocr-line-actions">
                <button className="btn small" onClick={() => copy(l)}>{copied === l ? 'Copied!' : 'Copy'}</button>
                {GAMES.map((g) => (
                  <button key={g.key} className="btn small" disabled={matching?.line === l && matching?.game === g.key} onClick={() => searchAs(l, g)}>
                    {matching?.line === l && matching?.game === g.key ? '...' : `🔍 ${g.label}`}
                  </button>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
      {matches && (
        <div className="lookup-results" style={{ marginTop: '0.5rem' }}>
          {matches.results.map((r) => (
            <button className="lookup-result" key={r.id} onClick={() => pick(r, matches.game)}>
              {r.image && <img src={r.image} alt={r.name} />}
              <span>{r.name}{r.setName ? ` — ${r.setName}` : ''}{r.number ? ` #${r.number}` : ''}</span>
            </button>
          ))}
          {matches.results.length === 0 && <p className="hint-text">No matches found for "{matches.line}".</p>}
        </div>
      )}
    </div>
  );
}
