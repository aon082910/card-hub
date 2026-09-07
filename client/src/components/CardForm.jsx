import React, { useState } from 'react';
import { useLanguage } from '../i18n.jsx';

const empty = {
  category: 'sports', sport_or_game: '', player_or_character: '', team_or_set: '',
  set_name: '', year: '', manufacturer: '', card_number: '', parallel_variant: '',
  rarity: '', is_graded: 0, grading_company: '', grade: '', cert_number: '',
  raw_condition: '', serial_number: '', print_run: '', quantity: 1, storage_location: '',
  tags: '', notes: '', cost_basis: '', purchase_date: '', purchase_source: '',
  current_value: '', status: 'owned',
  raw_value: '', graded_value_estimate: '', last_sold_value: '',
  is_consigned: 0, consignor_name: '', consignment_payout_pct: '',
};

export default function CardForm({ initial, onSubmit, submitLabel }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ ...empty, ...(initial || {}) });

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form className="card-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>{t('field_category')}
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            <option value="sports">{t('category_sports')}</option>
            <option value="tcg">{t('category_tcg')}</option>
            <option value="other">{t('category_other')}</option>
          </select>
        </label>
        <label>{t('field_sport_or_game')}
          <input value={form.sport_or_game} onChange={(e) => set('sport_or_game', e.target.value)} placeholder="Basketball, Pokemon..." />
        </label>
        <label>{t('field_player_or_character')}
          <input value={form.player_or_character} onChange={(e) => set('player_or_character', e.target.value)} />
        </label>
        <label>{t('field_team_or_set')}
          <input value={form.team_or_set} onChange={(e) => set('team_or_set', e.target.value)} />
        </label>
        <label>{t('field_set_name')}
          <input value={form.set_name} onChange={(e) => set('set_name', e.target.value)} />
        </label>
        <label>{t('field_year')}
          <input value={form.year} onChange={(e) => set('year', e.target.value)} />
        </label>
        <label>{t('field_manufacturer')}
          <input value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} placeholder="Panini, Topps..." />
        </label>
        <label>{t('field_card_number')}
          <input value={form.card_number} onChange={(e) => set('card_number', e.target.value)} />
        </label>
        <label>{t('field_parallel_variant')}
          <input value={form.parallel_variant} onChange={(e) => set('parallel_variant', e.target.value)} />
        </label>
        <label>{t('field_rarity')}
          <input value={form.rarity} onChange={(e) => set('rarity', e.target.value)} />
        </label>
        <label>{t('field_serial_number')}
          <input value={form.serial_number} onChange={(e) => set('serial_number', e.target.value)} placeholder="12/99" />
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={!!form.is_graded} onChange={(e) => set('is_graded', e.target.checked ? 1 : 0)} />
          {t('field_graded')}
        </label>
        {form.is_graded ? (
          <>
            <label>{t('field_grading_company')}
              <input value={form.grading_company} onChange={(e) => set('grading_company', e.target.value)} placeholder="PSA, BGS, CGC..." />
            </label>
            <label>{t('field_grade')}
              <input value={form.grade} onChange={(e) => set('grade', e.target.value)} placeholder="10, 9.5..." />
            </label>
            <label>{t('field_cert_number')}
              <input value={form.cert_number} onChange={(e) => set('cert_number', e.target.value)} />
            </label>
          </>
        ) : (
          <label>{t('field_condition')}
            <input value={form.raw_condition} onChange={(e) => set('raw_condition', e.target.value)} placeholder="Near Mint..." />
          </label>
        )}
        <label>{t('field_quantity')}
          <input type="number" min="0" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
        </label>
        <label>{t('field_storage_location')}
          <input value={form.storage_location} onChange={(e) => set('storage_location', e.target.value)} placeholder="Binder 3, Box A..." />
        </label>
        <label>{t('field_tags')}
          <input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="comma, separated" />
        </label>
        <label>{t('field_cost_basis')}
          <input type="number" step="0.01" value={form.cost_basis} onChange={(e) => set('cost_basis', e.target.value)} />
        </label>
        <label>{t('field_purchase_date')}
          <input type="date" value={form.purchase_date} onChange={(e) => set('purchase_date', e.target.value)} />
        </label>
        <label>{t('field_purchase_source')}
          <input value={form.purchase_source} onChange={(e) => set('purchase_source', e.target.value)} />
        </label>
        <label>{t('field_current_value')}
          <input type="number" step="0.01" value={form.current_value} onChange={(e) => set('current_value', e.target.value)} />
        </label>
        <label>{t('field_raw_value')}
          <input type="number" step="0.01" value={form.raw_value} onChange={(e) => set('raw_value', e.target.value)} />
        </label>
        <label>{t('field_graded_value_estimate')}
          <input type="number" step="0.01" value={form.graded_value_estimate} onChange={(e) => set('graded_value_estimate', e.target.value)} />
        </label>
        <label>{t('field_last_sold_value')}
          <input type="number" step="0.01" value={form.last_sold_value} onChange={(e) => set('last_sold_value', e.target.value)} />
        </label>
        <label className="checkbox-label">
          <input type="checkbox" checked={!!form.is_consigned} onChange={(e) => set('is_consigned', e.target.checked ? 1 : 0)} />
          {t('field_consigned')}
        </label>
        {!!form.is_consigned && (
          <>
            <label>{t('field_consignor_name')}
              <input value={form.consignor_name} onChange={(e) => set('consignor_name', e.target.value)} />
            </label>
            <label>{t('field_consignor_payout')}
              <input type="number" step="0.1" min="0" max="100" value={form.consignment_payout_pct} onChange={(e) => set('consignment_payout_pct', e.target.value)} placeholder="e.g. 70" />
            </label>
          </>
        )}
        <label>{t('field_status')}
          <select value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="owned">{t('status_owned')}</option>
            <option value="wanted">{t('status_wanted')}</option>
            <option value="listed">{t('status_listed')}</option>
            <option value="sold">{t('status_sold')}</option>
            <option value="archived">{t('status_archived')}</option>
          </select>
        </label>
      </div>
      <label className="full-width">{t('field_notes')}
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} />
      </label>
      <button className="btn primary" type="submit">{submitLabel || t('btn_save')}</button>
    </form>
  );
}
