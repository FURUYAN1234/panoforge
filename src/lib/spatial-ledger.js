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

This is a partial camera view, not an inventory of the entire surrounding world. Put ordinary repeating structural elements and lamps under architecture or lighting. Do not infer global totals from their visible counts. Reserve majorObjects for distinctive objects whose accidental copies would change the scene.
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

export function buildSpatialQaPrompt(ledger, hasSeamView = false, hasReferenceView = false) {
  const seamInstructions = hasSeamView ? `
The first image is the final panorama. The second image shows the same panorama rotated so that the left-right wrap seam is centered. The third image is a 90-degree perspective view facing directly at that seam, rendered from the same sphere as the interactive viewer. Inspect the third image carefully: trace each structural line across its center rather than judging only whether colors blend. Reject a partial view presented as a full sphere, or a structural line or surface that stops, shifts, forks without a physical junction, or doubles at the seam. A foreground pillar or tree does not excuse inconsistent structures behind it. Blended colors do not establish physical continuity.
Classify the LOCATION of the defects for the repair operation. The available editing mask covers x=34% through x=66% of the second image, across its entire height (115.2 degrees around the rear). The entire 90-degree third image falls inside that editable angular range. The editor may reconstruct, remove or move any surface or object INSIDE this range, including track routes, walls, planting and a pillar hiding a bad junction, while preserving pixels outside it.
Add "seamOnly": true when all observed material defects can be corrected within that range. A local layout conflict requiring reconstruction inside the range is still seamOnly, not a reason to regenerate the whole panorama. Set false only when a defect also requires changing pixels OUTSIDE that range, such as a displaced front reference object, widespread wrong projection, or a broken connection elsewhere. Do not change the pass/retry threshold based on repairability.
` : '';
  return `Inspect this generated equirectangular panorama against the reference spatial inventory below.

${formatSpatialLedger(ledger)}

${hasReferenceView ? 'The last image is the original partial reference, NOT another generated panorama. Compare its visible objects and spatial relationships with the corresponding front region of the full sphere. Reference counts are not global object counts: ordinary repeated architecture, lamps, doors and seating may continue plausibly into previously unseen directions. Still reject an actual duplicate of a distinctive object, a copied fragment of the reference, a displaced reference object, or an impossible structural connection.' : ''}

Check only: duplicate or missing major objects, inconsistent doors/windows/openings, impossible wall-floor-ceiling continuity, contradictory light direction, unwanted filling of a sparse space, and a semantic break at the left-right wrap seam.
${seamInstructions}
Return JSON only: {"verdict":"pass"|"retry","issues":["specific issue"]}.
Use "retry" only for a visible, material defect. Use "pass" with an empty issues array when none is visible.`;
}

export function parseSpatialQa(value) {
  const parsed = parseJsonObject(value, 'Spatial QA response');
  if (parsed.verdict !== 'pass' && parsed.verdict !== 'retry') {
    throw new Error('Spatial QA response must contain a pass or retry verdict.');
  }
  return {
    verdict: parsed.verdict,
    issues: uniqueStrings(parsed.issues).slice(0, 6),
    ...(parsed.seamOnly === true && parsed.verdict === 'retry' ? { seamOnly: true } : {}),
  };
}
