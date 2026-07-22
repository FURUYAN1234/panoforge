const LEDGER_LIST_FIELDS = ['majorObjects', 'openings', 'architecture'];
const DENSITIES = new Set(['sparse', 'normal', 'dense']);

function parseJsonObject(value, label) {
  let parsed;
  try {
    const text = String(value || '').trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error(`${label} must be a JSON object.`);
  }
  return parsed;
}

function uniqueStrings(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter(item => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean))]
    .slice(0, 12);
}

export function buildSpatialLedgerPrompt() {
  return `Create a compact spatial inventory for this reference image before a 360-degree panorama is generated.

Return JSON only, with exactly these fields:
{
  "majorObjects": ["only the distinctive furniture or fixtures that must not be duplicated"],
  "openings": ["doors, windows, arches, stairs, or paths"],
  "architecture": ["walls, floor, ceiling, structural features"],
  "lighting": "light-source direction, color, and mood",
  "density": "sparse" | "normal" | "dense"
}

Do not invent details. Record only clearly visible, spatially important facts. JSON only.`;
}

export function parseSpatialLedger(value) {
  const parsed = parseJsonObject(value, 'Spatial ledger');
  const ledger = {};
  for (const field of LEDGER_LIST_FIELDS) ledger[field] = uniqueStrings(parsed[field]);
  ledger.lighting = typeof parsed.lighting === 'string' ? parsed.lighting.trim().slice(0, 300) : '';
  ledger.density = DENSITIES.has(parsed.density) ? parsed.density : 'normal';
  return ledger;
}

export function formatSpatialLedger(ledger) {
  const item = (label, values) => `${label}: ${values.length ? values.join('; ') : 'none identified'}`;
  return [
    item('Major objects', ledger.majorObjects),
    item('Openings', ledger.openings),
    item('Architecture', ledger.architecture),
    `Lighting: ${ledger.lighting || 'preserve the reference lighting'}`,
    `Density: ${ledger.density}`,
  ].join('\n');
}

export function buildSpatialQaPrompt(ledger) {
  return `Inspect this generated equirectangular panorama against the reference spatial inventory below.

${formatSpatialLedger(ledger)}

Check only: duplicate or missing major objects, inconsistent doors/windows/openings, impossible wall-floor-ceiling continuity, contradictory light direction, unwanted filling of a sparse space, and a semantic break at the left-right wrap seam.

Return JSON only: {"verdict":"pass"|"retry","issues":["specific issue"]}.
Use "retry" only for a visible, material defect. Use "pass" with an empty issues array when none is visible.`;
}

export function parseSpatialQa(value) {
  const parsed = parseJsonObject(value, 'Spatial QA response');
  if (parsed.verdict !== 'pass' && parsed.verdict !== 'retry') {
    throw new Error('Spatial QA response must contain a pass or retry verdict.');
  }
  return { verdict: parsed.verdict, issues: uniqueStrings(parsed.issues).slice(0, 6) };
}
