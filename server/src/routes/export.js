const express = require('express');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { db, IMAGES_DIR } = require('../db');

const router = express.Router();

const PRESETS = {
  full: null, // all columns
  insurance: ['id', 'category', 'player_or_character', 'set_name', 'year', 'manufacturer', 'card_number',
    'grading_company', 'grade', 'serial_number', 'storage_location', 'cost_basis', 'current_value', 'purchase_date', 'purchase_source'],
  tax: ['id', 'player_or_character', 'set_name', 'year', 'quantity', 'cost_basis', 'purchase_date', 'purchase_source', 'current_value', 'status'],
};

const EXPORT_COLUMNS = [
  { key: 'id', header: 'ID', width: 8 },
  { key: 'category', header: 'Category', width: 12 },
  { key: 'sport_or_game', header: 'Sport/Game', width: 16 },
  { key: 'player_or_character', header: 'Player/Character', width: 22 },
  { key: 'team_or_set', header: 'Team/Set', width: 18 },
  { key: 'set_name', header: 'Set Name', width: 18 },
  { key: 'year', header: 'Year', width: 8 },
  { key: 'manufacturer', header: 'Manufacturer', width: 16 },
  { key: 'card_number', header: 'Card #', width: 10 },
  { key: 'parallel_variant', header: 'Parallel/Variant', width: 18 },
  { key: 'rarity', header: 'Rarity', width: 12 },
  { key: 'is_graded', header: 'Graded', width: 8 },
  { key: 'grading_company', header: 'Grading Co.', width: 12 },
  { key: 'grade', header: 'Grade', width: 8 },
  { key: 'cert_number', header: 'Cert #', width: 14 },
  { key: 'raw_condition', header: 'Condition', width: 14 },
  { key: 'serial_number', header: 'Serial #', width: 10 },
  { key: 'quantity', header: 'Qty', width: 6 },
  { key: 'storage_location', header: 'Location', width: 14 },
  { key: 'tags', header: 'Tags', width: 18 },
  { key: 'cost_basis', header: 'Cost Basis', width: 12 },
  { key: 'purchase_date', header: 'Purchase Date', width: 14 },
  { key: 'purchase_source', header: 'Purchase Source', width: 16 },
  { key: 'current_value', header: 'Current Value', width: 14 },
  { key: 'status', header: 'Status', width: 10 },
  { key: 'notes', header: 'Notes', width: 24 },
];

function getFilteredCards(query, userId) {
  const { category, status } = query;
  const where = ['user_id = @userId'];
  const params = { userId };
  if (category) { where.push('category = @category'); params.category = category; }
  if (status) { where.push('status = @status'); params.status = status; }
  const sql = `SELECT * FROM cards WHERE ${where.join(' AND ')} ORDER BY category, player_or_character`;
  return db.prepare(sql).all(params);
}

function columnsForPreset(preset) {
  const keys = PRESETS[preset];
  if (!keys) return EXPORT_COLUMNS;
  return EXPORT_COLUMNS.filter((c) => keys.includes(c.key));
}

router.get('/excel', async (req, res) => {
  const cards = getFilteredCards(req.query, req.session.userId);
  const columns = columnsForPreset(req.query.preset);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Card-Hub';
  const ws = wb.addWorksheet('Collection');
  ws.columns = columns;
  ws.getRow(1).font = { bold: true };
  for (const card of cards) ws.addRow(card);
  ws.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + columns.length)}1` };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="card-hub-collection.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

router.get('/csv', (req, res) => {
  const cards = getFilteredCards(req.query, req.session.userId);
  const columns = columnsForPreset(req.query.preset);
  const headers = columns.map(c => c.header);
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const card of cards) {
    lines.push(columns.map(c => escape(card[c.key])).join(','));
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="card-hub-collection.csv"');
  res.send(lines.join('\n'));
});

router.get('/pdf', (req, res) => {
  const cards = getFilteredCards(req.query, req.session.userId);
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="card-hub-collection.pdf"');
  doc.pipe(res);

  doc.fontSize(18).text('Card-Hub Collection Report', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor('#555').text(`Generated ${new Date().toLocaleString()} — ${cards.length} card(s)`, { align: 'center' });
  doc.moveDown(1);
  doc.fillColor('#000');

  const cols = [
    { key: 'player_or_character', header: 'Player/Character', width: 130 },
    { key: 'team_or_set', header: 'Team/Set', width: 90 },
    { key: 'year', header: 'Year', width: 40 },
    { key: 'manufacturer', header: 'Manufacturer', width: 80 },
    { key: 'card_number', header: 'Card #', width: 45 },
    { key: 'grade', header: 'Grade', width: 60 },
    { key: 'quantity', header: 'Qty', width: 30 },
    { key: 'cost_basis', header: 'Cost', width: 50 },
    { key: 'current_value', header: 'Value', width: 55 },
  ];
  const startX = doc.page.margins.left;
  let y = doc.y;
  const rowHeight = 18;

  function drawHeader() {
    let x = startX;
    doc.fontSize(9).font('Helvetica-Bold');
    for (const c of cols) {
      doc.text(c.header, x, y, { width: c.width, ellipsis: true });
      x += c.width;
    }
    y += rowHeight;
    doc.moveTo(startX, y - 4).lineTo(x, y - 4).strokeColor('#ccc').stroke();
    doc.font('Helvetica');
  }

  drawHeader();
  for (const card of cards) {
    if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeader();
    }
    let x = startX;
    doc.fontSize(8);
    for (const c of cols) {
      let val = card[c.key];
      if (c.key === 'cost_basis' || c.key === 'current_value') {
        val = val !== null && val !== undefined ? `$${Number(val).toFixed(2)}` : '';
      }
      doc.text(val ?? '', x, y, { width: c.width, ellipsis: true });
      x += c.width;
    }
    y += rowHeight;
  }

  doc.end();
});

// Photo catalog: same filters, but shows the front image (when present) next to each card's details.
router.get('/pdf-photos', async (req, res) => {
  const cards = getFilteredCards(req.query, req.session.userId);
  const images = db.prepare('SELECT * FROM card_images WHERE side = ?').all('front');
  const frontByCard = new Map(images.map((i) => [i.card_id, i.filename]));

  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="card-hub-photo-catalog.pdf"');
  doc.pipe(res);

  doc.fontSize(18).text('Card-Hub Photo Catalog', { align: 'center' });
  doc.moveDown(1);

  const rowHeight = 90;
  for (const card of cards) {
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) doc.addPage();
    const top = doc.y;
    const imgFile = frontByCard.get(card.id);
    if (imgFile) {
      const p = path.join(IMAGES_DIR, imgFile);
      if (fs.existsSync(p)) {
        try { doc.image(p, doc.page.margins.left, top, { fit: [70, 80] }); } catch { /* skip unreadable image */ }
      }
    }
    const textX = doc.page.margins.left + 85;
    doc.fontSize(11).text(card.player_or_character || card.set_name || `Card #${card.id}`, textX, top, { width: 420 });
    doc.fontSize(9).fillColor('#555').text(
      [card.set_name, card.year, card.manufacturer, card.card_number ? `#${card.card_number}` : null].filter(Boolean).join(' · '),
      textX, top + 16, { width: 420 }
    );
    doc.text(card.is_graded ? `${card.grading_company} ${card.grade}` : (card.raw_condition || ''), textX, top + 32, { width: 420 });
    doc.text(`Qty: ${card.quantity}   Cost: $${Number(card.cost_basis || 0).toFixed(2)}   Value: $${Number(card.current_value || 0).toFixed(2)}`, textX, top + 48, { width: 420 });
    doc.fillColor('#000');
    doc.y = top + rowHeight;
  }

  doc.end();
});

// Printable label sheet: one QR code (linking to the card's detail page) + short text per card.
// ids can be passed as a comma-separated query param, or the same category/status filters as other exports.
router.get('/labels', async (req, res) => {
  let cards;
  if (req.query.ids) {
    const ids = String(req.query.ids).split(',').map(Number).filter(Boolean);
    const placeholders = ids.map(() => '?').join(',');
    cards = ids.length ? db.prepare(`SELECT * FROM cards WHERE id IN (${placeholders}) AND user_id = ?`).all(...ids, req.session.userId) : [];
  } else {
    cards = getFilteredCards(req.query, req.session.userId);
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const doc = new PDFDocument({ margin: 20, size: 'letter' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="card-hub-labels.pdf"');
  doc.pipe(res);

  const cols = 3;
  const labelW = 170;
  const labelH = 70;
  const gap = 10;
  let col = 0;
  let x = doc.page.margins.left;
  let y = doc.page.margins.top;

  for (const card of cards) {
    if (y + labelH > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      x = doc.page.margins.left;
      y = doc.page.margins.top;
      col = 0;
    }
    const qrDataUrl = await QRCode.toDataURL(`${baseUrl}/collection/${card.id}`, { margin: 0, width: 120 });
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    doc.rect(x, y, labelW, labelH).strokeColor('#ccc').stroke();
    doc.image(qrBuffer, x + 4, y + 4, { fit: [60, 60] });
    const textX = x + 70;
    doc.fontSize(8).fillColor('#000').text((card.player_or_character || card.set_name || `Card #${card.id}`).slice(0, 40), textX, y + 6, { width: labelW - 74 });
    doc.fontSize(7).fillColor('#555').text([card.set_name, card.year].filter(Boolean).join(' '), textX, y + 22, { width: labelW - 74 });
    doc.text(card.card_number ? `#${card.card_number}` : '', textX, y + 34, { width: labelW - 74 });
    doc.fontSize(7).text(`ID ${card.id}`, textX, y + 50, { width: labelW - 74 });
    doc.fillColor('#000');

    col++;
    if (col >= cols) { col = 0; x = doc.page.margins.left; y += labelH + gap; }
    else { x += labelW + gap; }
  }

  doc.end();
});

module.exports = router;
