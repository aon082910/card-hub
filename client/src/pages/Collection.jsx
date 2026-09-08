import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useLanguage } from '../i18n.jsx';

function loadSavedViews() {
  try { return JSON.parse(localStorage.getItem('card-hub-views') || '[]'); } catch { return []; }
}
function persistSavedViews(views) {
  try { localStorage.setItem('card-hub-views', JSON.stringify(views)); } catch { /* ignore */ }
}

export default function Collection() {
  const { t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('updated_at');
  const [dir, setDir] = useState('desc');
  const [selected, setSelected] = useState(new Set());
  const [views, setViews] = useState(loadSavedViews);
  const [bulkTag, setBulkTag] = useState('');
  const [shareUrl, setShareUrl] = useState(null);

  function load() {
    const params = { sort, dir };
    if (q) params.q = q;
    if (category) params.category = category;
    if (status) params.status = status;
    api.listCards(params).then((res) => {
      setRows(res.rows);
      setTotal(res.total);
      setSelected(new Set());
    });
  }

  useEffect(load, [q, category, status, sort, dir]);

  function toggleSort(col) {
    if (sort === col) setDir(dir === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setDir('asc'); }
  }

  function toggleSelect(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  function toggleSelectAll() {
    setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)));
  }

  async function runBulk(action, value) {
    if (selected.size === 0) return;
    if (action === 'delete' && !confirm(`Delete ${selected.size} card(s) permanently?`)) return;
    await api.bulkAction([...selected], action, value);
    load();
  }

  function saveCurrentView() {
    const name = prompt('Name this view:');
    if (!name) return;
    const next = [...views.filter((v) => v.name !== name), { name, q, category, status, sort, dir }];
    setViews(next);
    persistSavedViews(next);
  }

  function applyView(v) {
    setQ(v.q || ''); setCategory(v.category || ''); setStatus(v.status || ''); setSort(v.sort || 'updated_at'); setDir(v.dir || 'desc');
  }

  function deleteView(name) {
    const next = views.filter((v) => v.name !== name);
    setViews(next);
    persistSavedViews(next);
  }

  async function shareSelected() {
    if (selected.size === 0) return;
    const link = await api.createShareLink({ label: `${selected.size} shared card(s)`, kind: 'selection', card_ids: [...selected] });
    setShareUrl(`${window.location.origin}/share/${link.token}`);
  }

  const sortIndicator = (col) => (sort === col ? (dir === 'asc' ? ' ▲' : ' ▼') : '');

  return (
    <div>
      <div className="page-header">
        <h1>{t('collection_title')} ({total})</h1>
        <Link className="btn primary" to="/collection/new">{t('dashboard_add_card')}</Link>
      </div>

      <div className="filter-bar">
        <input placeholder={t('collection_search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">{t('collection_all_categories')}</option>
          <option value="sports">{t('category_sports')}</option>
          <option value="tcg">{t('category_tcg')}</option>
          <option value="other">{t('category_other')}</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('collection_all_statuses')}</option>
          <option value="owned">{t('status_owned')}</option>
          <option value="wanted">{t('status_wanted')}</option>
          <option value="listed">{t('status_listed')}</option>
          <option value="sold">{t('status_sold')}</option>
          <option value="archived">{t('status_archived')}</option>
        </select>
        <button className="btn" onClick={saveCurrentView}>💾 {t('collection_save_view')}</button>
      </div>

      {views.length > 0 && (
        <div className="saved-views">
          {views.map((v) => (
            <span className="saved-view-chip" key={v.name}>
              <button className="btn small" onClick={() => applyView(v)}>{v.name}</button>
              <button className="btn small danger" onClick={() => deleteView(v.name)}>x</button>
            </span>
          ))}
        </div>
      )}

      {selected.size > 0 && (
        <div className="bulk-bar">
          <span>{selected.size} {t('collection_selected')}</span>
          <select onChange={(e) => { if (e.target.value) { runBulk('set_status', e.target.value); e.target.value = ''; } }} defaultValue="">
            <option value="" disabled>Set status...</option>
            <option value="owned">{t('status_owned')}</option>
            <option value="wanted">{t('status_wanted')}</option>
            <option value="listed">{t('status_listed')}</option>
            <option value="sold">{t('status_sold')}</option>
            <option value="archived">{t('status_archived')}</option>
          </select>
          <input placeholder="Add tag..." value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} style={{ width: 140 }} />
          <button className="btn small" onClick={() => { runBulk('add_tag', bulkTag); setBulkTag(''); }}>Add Tag</button>
          <a className="btn small" href={`/api/export/labels?ids=${[...selected].join(',')}`}>🏷 Print Labels</a>
          <button className="btn small" onClick={shareSelected}>🔗 Share Selected</button>
          <button className="btn small danger" onClick={() => runBulk('delete')}>Delete</button>
        </div>
      )}
      {shareUrl && (
        <p className="hint-text">
          Public link (no login needed): <a href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a>
        </p>
      )}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleSelectAll} /></th>
              <th className="sortable" onClick={() => toggleSort('player_or_character')}>{t('collection_col_player')}{sortIndicator('player_or_character')}</th>
              <th>{t('collection_col_set')}</th>
              <th className="sortable" onClick={() => toggleSort('year')}>{t('collection_col_year')}{sortIndicator('year')}</th>
              <th>{t('collection_col_grade')}</th>
              <th>{t('collection_col_qty')}</th>
              <th className="sortable" onClick={() => toggleSort('cost_basis')}>{t('collection_col_cost')}{sortIndicator('cost_basis')}</th>
              <th className="sortable" onClick={() => toggleSort('current_value')}>{t('collection_col_value')}{sortIndicator('current_value')}</th>
              <th>{t('collection_col_status')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className={selected.has(c.id) ? 'row-selected' : ''}>
                <td><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                <td><Link to={`/collection/${c.id}`}>{c.player_or_character || '(unnamed)'}</Link></td>
                <td>{c.set_name || c.team_or_set}</td>
                <td>{c.year}</td>
                <td>{c.is_graded ? `${c.grading_company} ${c.grade}` : c.raw_condition}</td>
                <td>{c.quantity}</td>
                <td>{c.cost_basis != null ? `$${Number(c.cost_basis).toFixed(2)}` : ''}</td>
                <td>{c.current_value != null ? `$${Number(c.current_value).toFixed(2)}` : ''}</td>
                <td>
                  <span className={`badge status-${c.status}`}>{t(`status_${c.status}`)}</span>
                  {!!c.is_consigned && <span className="badge" style={{ marginLeft: 4 }}>consigned</span>}
                  {!!c.for_trade && <span className="badge" style={{ marginLeft: 4 }}>trade</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>{t('collection_no_cards')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
