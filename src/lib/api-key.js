export function normalizeApiKey(value) {
  const key = String(value || '').trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
  if (key && !/^[\x21-\x7E]+$/.test(key)) {
    throw new Error('API key must contain ASCII characters only. Re-enter it without full-width or invisible characters.');
  }
  return key;
}
