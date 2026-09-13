const express = require('express');
const multer = require('multer');
const { getSetting } = require('../db');
const { runSuryaOcr } = require('../lib/suryaOcr');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'image required' });
  const provider = getSetting('ocr_provider', 'tesseract');
  if (provider !== 'surya') return res.status(400).json({ error: 'Surya OCR is not enabled (Settings -> OCR Provider).' });
  try {
    const lines = await runSuryaOcr(req.file.buffer, req.file.originalname, {
      endpointUrl: getSetting('surya_endpoint_url'),
      apiKey: getSetting('surya_api_key'),
    });
    res.json({ lines });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

module.exports = router;
