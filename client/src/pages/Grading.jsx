import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import GradingCalculator from '../components/GradingCalculator.jsx';
import { useLanguage } from '../i18n.jsx';

export default function Grading() {
  const { t } = useLanguage();
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
      resulting_grade = prompt(t('grading_prompt_grade')) || '';
    }
    await api.updateGrading(sub.id, { status, resulting_grade, returned_at: status === 'returned' ? new Date().toISOString().slice(0, 10) : sub.returned_at });
    load();
  }

  async function handleDelete(id) {
    if (!confirm(t('grading_confirm_delete'))) return;
    await api.deleteGrading(id);
    load();
  }

  return (
    <div>
      <h1>{t('grading_title')}</h1>

      <section className="panel">
        <div className="panel-header-row">
          <h2>{t('grading_roi_calc')}</h2>
          <button className="btn small" onClick={() => setShowCalculator(!showCalculator)}>{showCalculator ? t('btn_hide') : t('btn_show')}</button>
        </div>
        {showCalculator && <GradingCalculator />}
      </section>

      <section className="panel">
        <h2>{t('grading_submit_card')}</h2>
        <form className="card-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>{t('col_card')}
              <select value={form.card_id} onChange={(e) => setForm({ ...form, card_id: e.target.value })} required>
                <option value="">{t('select_a_card')}</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.player_or_character || c.set_name} ({c.year})</option>
                ))}
              </select>
            </label>
            <label>{t('grading_company')}
              <select value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}>
                <option value="PSA">PSA</option>
                <option value="BGS">BGS</option>
                <option value="CGC">CGC</option>
                <option value="SGC">SGC</option>
              </select>
            </label>
            <label>{t('grading_service_level')}
              <input value={form.service_level} onChange={(e) => setForm({ ...form, service_level: e.target.value })} placeholder="Bulk, Regular, Express..." />
            </label>
            <label>{t('grading_cost')}
              <input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </label>
            <label>{t('grading_tracking')}
              <input value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} />
            </label>
            <label>{t('grading_submitted_date')}
              <input type="date" value={form.submitted_at} onChange={(e) => setForm({ ...form, submitted_at: e.target.value })} />
            </label>
            <label>{t('grading_expected_return')}
              <input type="date" value={form.expected_return_date} onChange={(e) => setForm({ ...form, expected_return_date: e.target.value })} />
            </label>
          </div>
          <button className="btn primary" type="submit">{t('grading_log_submission')}</button>
        </form>
      </section>

      <table className="data-table">
        <thead>
          <tr><th>{t('col_card')}</th><th>{t('col_company')}</th><th>{t('grading_cost')}</th><th>{t('col_tracking')}</th><th>{t('field_status')}</th><th>{t('field_grade')}</th><th></th></tr>
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
                  <option value="submitted">{t('grading_status_submitted')}</option>
                  <option value="in_progress">{t('grading_status_in_progress')}</option>
                  <option value="returned">{t('grading_status_returned')}</option>
                  <option value="cancelled">{t('grading_status_cancelled')}</option>
                </select>
              </td>
              <td>{s.resulting_grade}</td>
              <td><button className="btn small danger" onClick={() => handleDelete(s.id)}>{t('btn_delete')}</button></td>
            </tr>
          ))}
          {submissions.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>{t('grading_none')}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
