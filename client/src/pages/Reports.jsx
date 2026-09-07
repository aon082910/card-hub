import React, { useState } from 'react';
import { api } from '../api.js';

const FIELD_LABELS = {
  category: 'Category', sport_or_game: 'Sport/Game', player_or_character: 'Player/Character',
  team_or_set: 'Team/Set', set_name: 'Set Name', year: 'Year', manufacturer: 'Manufacturer',
  card_number: 'Card Number', parallel_variant: 'Parallel/Variant', rarity: 'Rarity',
  grading_company: 'Grading Company', grade: 'Grade', cert_number: 'Cert Number',
  raw_condition: 'Condition', serial_number: 'Serial Number', quantity: 'Quantity',
  storage_location: 'Storage Location', tags: 'Tags', notes: 'Notes', cost_basis: 'Cost Basis',
  purchase_date: 'Purchase Date', purchase_source: 'Purchase Source', current_value: 'Current Value', status: 'Status',
};

export default function Reports() {
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [preset, setPreset] = useState('full');
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  const [customFile, setCustomFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [customBusy, setCustomBusy] = useState(false);
  const [customResult, setCustomResult] = useState(null);

  function buildQuery(extra = {}) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (status) params.set('status', status);
    if (preset !== 'full') params.set('preset', preset);
    for (const [k, v] of Object.entries(extra)) params.set(k, v);
    return params.toString();
  }

  function exportUrl(format, extra) {
    const q = buildQuery(extra);
    return `/api/export/${format}${q ? '?' + q : ''}`;
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/import/excel', { method: 'POST', body: form });
      const json = await res.json();
      setImportResult(json);
    } catch (err) {
      setImportResult({ error: err.message });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  async function handleCustomFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setCustomFile(file);
    setCustomResult(null);
    setPreview(null);
    setCustomBusy(true);
    try {
      const p = await api.previewImport(file);
      setPreview(p);
      // Best-effort auto-guess based on header text matching a known field label.
      const guess = {};
      p.headers.forEach((h, i) => {
        const match = Object.entries(FIELD_LABELS).find(([, label]) => label.toLowerCase() === String(h).toLowerCase().trim());
        if (match) guess[i] = match[0];
      });
      setMapping(guess);
    } catch (err) {
      setCustomResult({ error: err.message });
    } finally {
      setCustomBusy(false);
    }
  }

  async function runCustomImport() {
    setCustomBusy(true);
    setCustomResult(null);
    try {
      const res = await api.customImport(customFile, mapping);
      setCustomResult(res);
      setPreview(null);
      setCustomFile(null);
    } catch (err) {
      setCustomResult({ error: err.message });
    } finally {
      setCustomBusy(false);
    }
  }

  return (
    <div>
      <h1>Reports & Export</h1>

      <section className="panel">
        <h2>Export Collection</h2>
        <div className="filter-bar">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            <option value="sports">Sports</option>
            <option value="tcg">TCG</option>
            <option value="other">Other</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="owned">Owned</option>
            <option value="wanted">Wanted</option>
            <option value="listed">Listed</option>
            <option value="sold">Sold</option>
            <option value="archived">Archived</option>
          </select>
          <select value={preset} onChange={(e) => setPreset(e.target.value)}>
            <option value="full">All columns</option>
            <option value="insurance">Insurance report (grading, location, value)</option>
            <option value="tax">Tax / cost-basis report</option>
          </select>
        </div>
        <div className="cta-row">
          <a className="btn primary" href={exportUrl('excel')}>⬇ Export Excel (.xlsx)</a>
          <a className="btn" href={exportUrl('pdf')}>⬇ Export PDF (table)</a>
          <a className="btn" href={exportUrl('csv')}>⬇ Export CSV</a>
        </div>
        <p className="hint-text">Excel/CSV exports use column headers designed to round-trip back into Card-Hub, and also open cleanly in other spreadsheet or inventory tools.</p>
      </section>

      <section className="panel">
        <h2>Photo Catalog</h2>
        <p className="hint-text">A PDF report showing each card's front photo next to its details — good for insurance documentation or a printed catalog.</p>
        <div className="cta-row">
          <a className="btn" href={exportUrl('pdf-photos')}>⬇ Export Photo Catalog PDF</a>
        </div>
      </section>

      <section className="panel">
        <h2>Printable Labels</h2>
        <p className="hint-text">A sheet of small labels (QR code linking back to each card + name/set/number) for storage bins, binders, or boxes. Uses the same category/status filters above; to label a specific selection instead, use the checkboxes in Collection.</p>
        <div className="cta-row">
          <a className="btn" href={exportUrl('labels')}>🏷 Export Label Sheet PDF</a>
        </div>
      </section>

      <section className="panel">
        <h2>Import Collection (Card-Hub format)</h2>
        <label className="btn file-upload-btn">
          {importing ? 'Importing...' : 'Choose Excel File (.xlsx)'}
          <input type="file" accept=".xlsx" hidden onChange={handleImport} disabled={importing} />
        </label>
        {importResult && (
          <p className="hint-text">
            {importResult.error ? `Error: ${importResult.error}` : `Imported ${importResult.inserted} of ${importResult.totalRows} rows.`}
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Import From Another App</h2>
        <p className="hint-text">
          TCDB, CollX, Slabfy, ManaBox, and Eyevo don't publish a public API, so there's no automatic sync for
          them — but if the app can export your collection to CSV or Excel, upload it here and map its columns
          to Card-Hub fields yourself.
        </p>
        <label className="btn file-upload-btn">
          {customBusy ? 'Working...' : 'Choose CSV or Excel File'}
          <input type="file" accept=".csv,.xlsx" hidden onChange={handleCustomFile} disabled={customBusy} />
        </label>

        {preview && (
          <div style={{ marginTop: '1rem' }}>
            <p className="hint-text">{preview.totalRows} row(s) found. Map each column below (columns left as "Skip" are ignored):</p>
            <div className="table-scroll">
              <table className="simple-table">
                <thead>
                  <tr>
                    {preview.headers.map((h, i) => <th key={i}>{h || `Column ${i + 1}`}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {preview.headers.map((h, i) => (
                      <td key={i}>
                        <select value={mapping[i] || ''} onChange={(e) => setMapping({ ...mapping, [i]: e.target.value })}>
                          <option value="">Skip</option>
                          {preview.targetFields.map((f) => (
                            <option key={f} value={f}>{FIELD_LABELS[f] || f}</option>
                          ))}
                        </select>
                      </td>
                    ))}
                  </tr>
                  {preview.sampleRows.map((row, ri) => (
                    <tr key={ri}>
                      {preview.headers.map((h, i) => <td key={i}>{row[i]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="cta-row">
              <button className="btn primary" onClick={runCustomImport} disabled={customBusy}>Import {preview.totalRows} Row(s)</button>
            </div>
          </div>
        )}

        {customResult && (
          <p className={customResult.error ? 'error-text' : 'hint-text'}>
            {customResult.error ? `Error: ${customResult.error}` : `Imported ${customResult.inserted} of ${customResult.totalRows} rows.`}
          </p>
        )}
      </section>
    </div>
  );
}
