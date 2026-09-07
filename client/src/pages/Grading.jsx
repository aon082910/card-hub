import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import GradingCalculator from '../components/GradingCalculator.jsx';

export default function Grading() {
  const [submissions, setSubmissions] = useState([]);
  const [cards, setCards] = useState([]);
  const [form, setForm] = useState({ card_id: '', company: 'PSA', service_level: '', cost: '', tracking_number: '', submitted_at: '', expected_return_date: '', notes: '' });
  const [showCalculator, setShowCalculator] = useState(false);

  function load() {
    api.listGrading().then(setSubmissions);
    api.listCards({ limit: 1000 }).then((r) => setCards(r.rows));
  }
  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.card_id || !form.company) return;
    await api.createGrading({ ...form, card_id: Number(form.card_id) });
    setForm({ card_id: '', company: 'PSA', service_level: '', cost: '', tracking_number: '', submitted_at: '', expected_return_date: '', notes: '' });
    load();
  }

  async function updateStatus(sub, status) {
    let resulting_grade = sub.resulting_grade;
    if (status === 'returned' && !resulting_grade) {
      resulting_grade = prompt('What grade did it come back?') || '';
    }
    await api.updateGrading(sub.id, { status, resulting_grade, returned_at: status === 'returned' ? new Date().toISOString().slice(0, 10) : sub.returned_at });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this grading submission record?')) return;
    await api.deleteGrading(id);
    load();
  }

  return (
    <div>
      <h1>Grading</h1>

      <section className="panel">
        <div className="panel-header-row">
          <h2>Grading ROI Calculator</h2>
          <button className="btn small" onClick={() => setShowCalculator(!showCalculator)}>{showCalculator ? 'Hide' : 'Show'}</button>
        </div>
        {showCalculator && <GradingCalculator />}
      </section>

      <section className="panel">
        <h2>Submit a Card for Grading</h2>
        <form className="card-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>Card
              <select value={form.card_id} onChange={(e) => setForm({ ...form, card_id: e.target.value })} required>
                <option value="">Select a card...</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.player_or_character || c.set_name} ({c.year})</option>
                ))}
              </select>
            </label>
            <label>Company
              <select value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}>
                <option value="PSA">PSA</option>
                <option value="BGS">BGS</option>
                <option value="CGC">CGC</option>
                <option value="SGC">SGC</option>
              </select>
            </label>
            <label>Service Level
              <input value={form.service_level} onChange={(e) => setForm({ ...form, service_level: e.target.value })} placeholder="Bulk, Regular, Express..." />
            </label>
            <label>Cost ($)
              <input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </label>
            <label>Tracking Number
              <input value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} />
            </label>
            <label>Submitted Date
              <input type="date" value={form.submitted_at} onChange={(e) => setForm({ ...form, submitted_at: e.target.value })} />
            </label>
            <label>Expected Return Date
              <input type="date" value={form.expected_return_date} onChange={(e) => setForm({ ...form, expected_return_date: e.target.value })} />
            </label>
          </div>
          <button className="btn primary" type="submit">Log Submission</button>
        </form>
      </section>

      <table className="data-table">
        <thead>
          <tr><th>Card</th><th>Company</th><th>Cost</th><th>Tracking #</th><th>Status</th><th>Grade</th><th></th></tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr key={s.id}>
              <td>{s.player_or_character || s.set_name}</td>
              <td>{s.company}</td>
              <td>{s.cost != null ? `$${Number(s.cost).toFixed(2)}` : ''}</td>
              <td>{s.tracking_number}</td>
              <td>
                <select value={s.status} onChange={(e) => updateStatus(s, e.target.value)}>
                  <option value="submitted">Submitted</option>
                  <option value="in_progress">In Progress</option>
                  <option value="returned">Returned</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </td>
              <td>{s.resulting_grade}</td>
              <td><button className="btn small danger" onClick={() => handleDelete(s.id)}>Delete</button></td>
            </tr>
          ))}
          {submissions.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No grading submissions logged</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
