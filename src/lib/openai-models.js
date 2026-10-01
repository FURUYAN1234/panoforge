import catalog from '../config/openai-models.json' with { type: 'json' };

export const DEFAULT_OPENAI_MODEL_ID = 'gpt-6.1-sol';
export const OPENAI_MODELS = Object.freeze(catalog.models.map((model) => Object.freeze(model)));
export const OPENAI_PRICE_SNAPSHOT_DATE = catalog.priceSnapshotDate;

export function getOpenAIModel(modelId = DEFAULT_OPENAI_MODEL_ID) {
  const model = OPENAI_MODELS.find((candidate) => candidate.id === modelId);
  if (!model) throw new Error('Unknown OpenAI text/vision model.');
  return model;
}

export function getOpenAIModelRoute(modelId = DEFAULT_OPENAI_MODEL_ID) {
  getOpenAIModel(modelId);
  return OPENAI_MODELS.slice(OPENAI_MODELS.findIndex((candidate) => candidate.id === modelId));
}

export function formatOpenAIModelPrice(modelId = DEFAULT_OPENAI_MODEL_ID) {
  const model = getOpenAIModel(modelId);
  return `入力 $${model.inputPriceUsdPerM} / 出力 $${model.outputPriceUsdPerM} USD / 100万トークン（通常料金・${model.priceSnapshotDate || OPENAI_PRICE_SNAPSHOT_DATE}時点）`;
}

export function formatOpenAIModelRouteStatus(event) {
  const path = event.workflow === 'vision' ? '画像解析' : 'テキスト提案・構成確認';
  const phase = { trying: '試行中', adopted: '採用', failed: '失敗' }[event.phase];
  if (!phase) return '';
  const attempted = event.attemptedModels?.join(' → ') || event.modelId;
  return `${path}：選択 ${event.selectedModelId || event.modelId} / 試行 ${attempted} / ${phase} ${event.modelId}`;
}
