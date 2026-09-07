const express = require('express');
const { db, logAudit } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT g.*, c.player_or_character, c.set_name, c.year, c.category
    FROM grading_submissions g JOIN cards c ON c.id = g.card_id
    ORDER BY g.submitted_at DESC, g.id DESC
  `).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { card_id, company, service_level, cost, tracking_number, status = 'submitted', submitted_at, expected_return_date, notes } = req.body;
  if (!card_id || !company) return res.status(400).json({ error: 'card_id and company required' });
  const info = db.prepare(`
    INSERT INTO grading_submissions (card_id, company, service_level, cost, tracking_number, status, submitted_at, expected_return_date, notes)
    VALUES (@card_id, @company, @service_level, @cost, @tracking_number, @status, COALESCE(@submitted_at, date('now')), @expected_return_date, @notes)
  `).run({ card_id, company, service_level, cost, tracking_number, status, submitted_at, expected_return_date, notes });
  logAudit({ action: 'create', entityType: 'grading_submission', entityId: info.lastInsertRowid, details: `${company} - card #${card_id}` });
  res.status(201).json(db.prepare('SELECT * FROM grading_submissions WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM grading_submissions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const fields = ['company', 'service_level', 'cost', 'tracking_number', 'status', 'submitted_at', 'expected_return_date', 'returned_at', 'resulting_grade', 'notes'];
  const data = {};
  for (const f of fields) if (f in req.body) data[f] = req.body[f];
  const cols = Object.keys(data);
  if (cols.length) {
    db.prepare(`UPDATE grading_submissions SET ${cols.map((c) => `${c} = @${c}`).join(',')}, updated_at = datetime('now') WHERE id = @id`)
      .run({ ...data, id: req.params.id });
  }
  // If a grade result is being recorded, apply it to the card itself too.
  if (data.status === 'returned' && data.resulting_grade) {
    db.prepare(`UPDATE cards SET is_graded = 1, grading_company = ?, grade = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(existing.company, data.resulting_grade, existing.card_id);
  }
  res.json(db.prepare('SELECT * FROM grading_submissions WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM grading_submissions WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
