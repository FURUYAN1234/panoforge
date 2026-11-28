export function normalizeApiKey(value) {
  const key = String(value || '').trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
  if (key && !/^[\x21-\x7E]+$/.test(key)) {
    throw new Error('API key must contain ASCII characters only. Re-enter it without full-width or invisible characters.');
  }
  return key;
}

const keyCheckEndpoints = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
  openai: 'https://api.openai.com/v1/models',
};

export function classifyApiAccessError(provider, httpStatus, error) {
  const name = provider === 'openai' ? 'OpenAI' : 'Gemini';
  const status = Number(httpStatus) || Number(error?.code);
  const reasons = Array.isArray(error?.details) ? error.details.map(detail => detail?.reason) : [];
  const missingPermission = status === 403 || error?.status === 'PERMISSION_DENIED'
    || error?.code === 'insufficient_permissions' || /\bmissing scopes?\b/i.test(error?.message || '');
  const rejected = error?.code === 'invalid_api_key' || reasons.includes('API_KEY_INVALID')
    || reasons.includes('API_KEY_EXPIRED') || /^API key not valid\b/i.test(error?.message || '')
    || (!missingPermission && (status === 401 || error?.status === 'UNAUTHENTICATED'));
  if (rejected) {
    return Object.assign(new Error(`${name}がAPIキーを受け付けませんでした。${name}の有効なAPIキーを入力してください。`),
      { code: 'API_KEY_REJECTED', status, terminal: true });
  }
  if (missingPermission && error?.code !== 'content_policy_violation') {
    return Object.assign(new Error(`${name} APIのアクセス権限がありません。プロジェクト、キーの制限、モデルの権限を確認してください。`),
      { code: 'PERMISSION_DENIED', status, terminal: true });
  }
  if (status === 429 || error?.status === 'RESOURCE_EXHAUSTED'
    || error?.code === 'insufficient_quota' || error?.code === 'billing_hard_limit_reached') {
    return Object.assign(new Error(`${name} APIの利用上限に達したか、利用枠がありません。課金設定、残高、レート制限を確認してください。${error?.message ? ` ${error.message}` : ''}`),
      { code: 'RESOURCE_EXHAUSTED', status, terminal: true });
  }
  return null;
}

export function classifyGeminiSdkAccessError(error) {
  let providerError = error;
  try {
    providerError = JSON.parse(error.message).error || error;
  } catch {
    // SDK errors without a JSON response can still include an HTTP status.
  }
  return classifyApiAccessError('gemini', error?.status, providerError);
}

export async function verifyApiKey(provider, key) {
  const name = provider === 'openai' ? 'OpenAI' : 'Gemini';
  const headers = provider === 'openai' ? { Authorization: `Bearer ${key}` } : { 'x-goog-api-key': key };
  const signal = AbortSignal.timeout(10000);
  let response;
  let body;
  try {
    response = await fetch(keyCheckEndpoints[provider], { headers, signal });
    body = await response.json().catch(error => {
      if (signal.aborted) throw error;
      return null;
    });
  } catch (error) {
    throw new Error(`${name} APIに接続できませんでした。通信環境を確認して再試行してください。`, { cause: error });
  }

  const accessError = classifyApiAccessError(provider, response.status, body?.error);
  if (accessError?.code === 'PERMISSION_DENIED') return false;
  if (accessError) throw accessError;
  if (!response.ok) throw new Error(`${name} APIの確認に失敗しました（HTTP ${response.status}）。`);
  if (!Array.isArray(provider === 'openai' ? body?.data : body?.models)) {
    throw new Error(`${name} APIの確認で予期しない応答を受け取りました。`);
  }
  return true;
}
