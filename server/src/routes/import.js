const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const { db } = require('../db');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// Maps the exported column headers back to card fields, so a file exported from
// Card-Hub (or edited in Excel and re-saved) can be re-imported.
const HEADER_TO_FIELD = {
  'Category': 'category', 'Sport/Game': 'sport_or_game', 'Player/Character': 'player_or_character',
  'Team/Set': 'team_or_set', 'Set Name': 'set_name', 'Year': 'year', 'Manufacturer': 'manufacturer',
  'Card #': 'card_number', 'Parallel/Variant': 'parallel_variant', 'Rarity': 'rarity',
  'Graded': 'is_graded', 'Grading Co.': 'grading_company', 'Grade': 'grade', 'Cert #': 'cert_number',
  'Condition': 'raw_condition', 'Serial #': 'serial_number', 'Qty': 'quantity',
  'Location': 'storage_location', 'Tags': 'tags', 'Cost Basis': 'cost_basis',
  'Purchase Date': 'purchase_date', 'Purchase Source': 'purchase_source',
  'Current Value': 'current_value', 'Status': 'status', 'Notes': 'notes',
};

const NUMERIC_FIELDS = new Set(['quantity', 'cost_basis', 'current_value', 'print_run']);

function coerceRow(row) {
  const out = {};
  for (const [key, val] of Object.entries(row)) {
    if (val === undefined || val === null || val === '') continue;
    if (key === 'is_graded') out[key] = /^(1|true|yes|y)$/i.test(String(val)) ? 1 : 0;
    else if (NUMERIC_FIELDS.has(key)) out[key] = Number(val);
    else out[key] = String(val).trim();
  }
  return out;
}

router.post('/excel', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(req.file.buffer);
  const ws = wb.worksheets[0];
  const headerRow = ws.getRow(1).values.slice(1).map(h => String(h).trim());

  let inserted = 0;
  const insertStmt = db.prepare(`
    INSERT INTO cards (${Object.values(HEADER_TO_FIELD).filter((v, i, a) => a.indexOf(v) === i).join(',')})
    VALUES (${Object.values(HEADER_TO_FIELD).filter((v, i, a) => a.indexOf(v) === i).map(f => '@' + f).join(',')})
  `);

  const tx = db.transaction((rows) => {
    for (const row of rows) {
      const data = coerceRow(row);
      const fields = {};
      for (const f of Object.values(HEADER_TO_FIELD).filter((v, i, a) => a.indexOf(v) === i)) {
        fields[f] = f in data ? data[f] : null;
      }
      if (!fields.player_or_character && !fields.set_name) continue;
      insertStmt.run(fields);
      inserted++;
    }
  });

  const rows = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values.slice(1);
    const obj = {};
    headerRow.forEach((h, i) => {
      const field = HEADER_TO_FIELD[h];
      if (field) obj[field] = values[i];
    });
    rows.push(obj);
  });

  tx(rows);
  res.json({ inserted, totalRows: rows.length });
});

router.post('/csv', express.text({ type: '*/*', limit: '10mb' }), (req, res) => {
  const text = req.body;
  if (!text) return res.status(400).json({ error: 'no csv body' });
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  const fieldNames = Object.values(HEADER_TO_FIELD).filter((v, i, a) => a.indexOf(v) === i);
  const insertStmt = db.prepare(`
    INSERT INTO cards (${fieldNames.join(',')}) VALUES (${fieldNames.map(f => '@' + f).join(',')})
  `);

  let inserted = 0;
  const tx = db.transaction(() => {
    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i]);
      const raw = {};
      headers.forEach((h, idx) => {
        const field = HEADER_TO_FIELD[h.trim()];
        if (field) raw[field] = values[idx];
      });
      const data = coerceRow(raw);
      const fields = {};
      for (const f of fieldNames) fields[f] = f in data ? data[f] : null;
      if (!fields.player_or_character && !fields.set_name) continue;
      insertStmt.run(fields);
      inserted++;
    }
  });
  tx();
  res.json({ inserted, totalRows: lines.length - 1 });
});

const CARD_FIELD_OPTIONS = [
  'category', 'sport_or_game', 'player_or_character', 'team_or_set', 'set_name',
  'year', 'manufacturer', 'card_number', 'parallel_variant', 'rarity',
  'grading_company', 'grade', 'cert_number', 'raw_condition', 'serial_number',
  'quantity', 'storage_location', 'tags', 'notes', 'cost_basis', 'purchase_date',
  'purchase_source', 'current_value', 'status',
];

async function parseAnySpreadsheet(file) {
  const isCsv = /\.csv$/i.test(file.originalname) || file.mimetype === 'text/csv';
  if (isCsv) {
    const lines = file.buffer.toString('utf8').split(/\r?\n/).filter(Boolean);
    const headers = parseCsvLine(lines[0]);
    const rows = lines.slice(1).map((l) => parseCsvLine(l));
    return { headers, rows };
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(file.buffer);
  const ws = wb.worksheets[0];
  const headers = ws.getRow(1).values.slice(1).map((h) => String(h ?? '').trim());
  const rows = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    rows.push(row.values.slice(1).map((v) => (v == null ? '' : String(v))));
  });
  return { headers, rows };
}

// Generic importer for files exported from other apps (TCDB, CollX, Slabfy, ManaBox,
// Eyevo, etc.) that don't publish an API - the user maps their own column headers to
// Card-Hub fields instead of us guessing a fixed format. Two-step: preview, then import.
router.post('/preview', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  try {
    const { headers, rows } = await parseAnySpreadsheet(req.file);
    res.json({ headers, sampleRows: rows.slice(0, 5), totalRows: rows.length, targetFields: CARD_FIELD_OPTIONS });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/custom', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  let mapping;
  try { mapping = JSON.parse(req.body.mapping || '{}'); } catch { return res.status(400).json({ error: 'invalid mapping' }); }
  const columnToField = mapping; // { columnIndex: fieldName }

  try {
    const { headers, rows } = await parseAnySpreadsheet(req.file);
    const usedFields = [...new Set(Object.values(columnToField).filter(Boolean))];
    if (!usedFields.length) return res.status(400).json({ error: 'map at least one column' });
    const insertStmt = db.prepare(`INSERT INTO cards (${usedFields.join(',')}) VALUES (${usedFields.map((f) => '@' + f).join(',')})`);

    let inserted = 0;
    const tx = db.transaction(() => {
      for (const row of rows) {
        const raw = {};
        for (const [colIndex, field] of Object.entries(columnToField)) {
          if (!field) continue;
          raw[field] = row[Number(colIndex)];
        }
        const data = coerceRow(raw);
        const fields = {};
        for (const f of usedFields) fields[f] = f in data ? data[f] : null;
        if (!fields.player_or_character && !fields.set_name) continue;
        insertStmt.run(fields);
        inserted++;
      }
    });
    tx();
    res.json({ inserted, totalRows: rows.length, headers });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

module.exports = router;
