import React, { useState } from 'react';

const DEFAULT_TIERS = [
  { grade: '10 / Gem Mint', value: '' },
  { grade: '9.5', value: '' },
  { grade: '9', value: '' },
  { grade: '8', value: '' },
];

// Standalone profit-potential calculator, mirroring the "grade ladder" idea from
// hobby apps like Slabfy: enter what a card sells for at each grade tier, and see
// the net profit/ROI of submitting it for grading versus selling it raw.
export default function GradingCalculator({ initialRawValue = '' }) {
  const [rawValue, setRawValue] = useState(initialRawValue);
  const [gradingCost, setGradingCost] = useState('');
  const [tiers, setTiers] = useState(DEFAULT_TIERS);

  function updateTier(i, field, value) {
    setTiers((t) => t.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }

  function addTier() {
    setTiers((t) => [...t, { grade: '', value: '' }]);
  }

  function removeTier(i) {
    setTiers((t) => t.filter((_, idx) => idx !== i));
  }

  const raw = parseFloat(rawValue) || 0;
  const cost = parseFloat(gradingCost) || 0;

  return (
    <div>
      <div className="form-grid">
        <label>Current Raw (Ungraded) Value ($)
          <input type="number" step="0.01" value={rawValue} onChange={(e) => setRawValue(e.target.value)} />
        </label>
        <label>Grading Cost ($)
          <input type="number" step="0.01" value={gradingCost} onChange={(e) => setGradingCost(e.target.value)} placeholder="service fee + shipping" />
        </label>
      </div>

      <table className="simple-table">
        <thead><tr><th>Grade</th><th>Est. Value if Graded ($)</th><th>Net Profit</th><th>ROI</th><th></th></tr></thead>
        <tbody>
          {tiers.map((t, i) => {
            const val = parseFloat(t.value) || 0;
            const profit = val > 0 ? val - raw - cost : null;
            const roi = profit != null && (raw + cost) > 0 ? (profit / (raw + cost)) * 100 : null;
            return (
              <tr key={i}>
                <td><input value={t.grade} onChange={(e) => updateTier(i, 'grade', e.target.value)} placeholder="e.g. PSA 10" /></td>
                <td><input type="number" step="0.01" value={t.value} onChange={(e) => updateTier(i, 'value', e.target.value)} /></td>
                <td className={profit != null && profit >= 0 ? 'positive' : profit != null ? 'negative' : ''}>
                  {profit != null ? `$${profit.toFixed(2)}` : '—'}
                </td>
                <td className={roi != null && roi >= 0 ? 'positive' : roi != null ? 'negative' : ''}>
                  {roi != null ? `${roi.toFixed(0)}%` : '—'}
                </td>
                <td><button className="btn small danger" onClick={() => removeTier(i)}>x</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button className="btn small" onClick={addTier} style={{ marginTop: '0.5rem' }}>+ Add Grade Tier</button>
    </div>
  );
}
