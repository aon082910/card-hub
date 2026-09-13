// Calls out to Surya OCR - a vision-language OCR model far better than classic engines
// (like Tesseract) at reading stylized text over busy artwork, since it isn't doing
// separate segmentation-then-recognition passes. Two ways to reach it, matching how the
// user runs it:
//
// 1. Self-hosted: point at your own HTTP endpoint (e.g. a small wrapper you run around
//    the `surya-ocr` Python package on your own machine/GPU). Contract this server
//    expects: POST multipart/form-data with a "file" field, JSON response back shaped
//    either { "text": "..." } (newline-separated) or { "lines": ["...", "..."] }.
// 2. Datalab's hosted API (the company behind Surya) - an async job: POST to /convert,
//    then poll the returned check URL until the job completes.
const DATALAB_BASE_URL = 'https://www.datalab.to/api/v1';
const DATALAB_POLL_INTERVAL_MS = 2000;
const DATALAB_POLL_TIMEOUT_MS = 90000;

function linesFromText(text) {
  return String(text || '').split('\n').map((l) => l.replace(/^#+\s*/, '').trim()).filter(Boolean);
}

async function ocrViaSelfHosted(buffer, filename, endpointUrl) {
  const form = new FormData();
  form.append('file', new Blob([buffer]), filename);
  const resp = await fetch(endpointUrl, { method: 'POST', body: form });
  if (!resp.ok) throw new Error(`Self-hosted OCR endpoint returned ${resp.status}`);
  const data = await resp.json();
  if (Array.isArray(data.lines)) return data.lines.map((l) => String(l).trim()).filter(Boolean);
  if (typeof data.text === 'string') return linesFromText(data.text);
  throw new Error('Self-hosted OCR endpoint response did not include "text" or "lines"');
}

async function ocrViaDatalab(buffer, filename, apiKey) {
  const form = new FormData();
  form.append('file', new Blob([buffer]), filename);
  form.append('output_format', 'markdown');
  form.append('mode', 'balanced');

  const submitResp = await fetch(`${DATALAB_BASE_URL}/convert`, {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey },
    body: form,
  });
  if (!submitResp.ok) throw new Error(`Datalab API returned ${submitResp.status}: ${await submitResp.text().catch(() => '')}`);
  const submitData = await submitResp.json();
  const checkUrl = submitData.request_check_url || `${DATALAB_BASE_URL}/convert/${submitData.request_id}`;
  if (!checkUrl) throw new Error('Datalab API did not return a request_check_url');

  const deadline = Date.now() + DATALAB_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, DATALAB_POLL_INTERVAL_MS));
    const pollResp = await fetch(checkUrl, { headers: { 'X-Api-Key': apiKey } });
    if (!pollResp.ok) throw new Error(`Datalab API poll returned ${pollResp.status}`);
    const pollData = await pollResp.json();
    if (pollData.status === 'complete') return linesFromText(pollData.markdown);
    if (pollData.status === 'failed' || pollData.status === 'error') {
      throw new Error(pollData.error || 'Datalab OCR job failed');
    }
  }
  throw new Error('Datalab OCR job timed out waiting for a result');
}

async function runSuryaOcr(buffer, filename, { endpointUrl, apiKey }) {
  if (apiKey) return ocrViaDatalab(buffer, filename, apiKey);
  if (endpointUrl) return ocrViaSelfHosted(buffer, filename, endpointUrl);
  throw new Error('Surya OCR is not configured - set a self-hosted endpoint URL or a Datalab API key in Settings.');
}

module.exports = { runSuryaOcr };
