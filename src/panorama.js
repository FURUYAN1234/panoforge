import { abortable } from './lib/aiOperation.js';
// ============================================
// 360° AI Panorama Generator - パノラマ生成エンジン (Dual-API)
// Zenith-Style フォールバック + 2段階生成
// ============================================

import { GoogleGenAI } from '@google/genai';
import { GEMINI_IMAGE_MODELS as IMAGE_MODELS } from './lib/gemini-image-models.js';
import { GEMINI_TEXT_MODELS as TEXT_MODELS } from './lib/fallback-chain-data.js';
import {
  buildSpatialLedgerPrompt,
  buildSpatialQaPrompt,
  formatSpatialLedger,
  parseSpatialLedger,
  parseSpatialQa,
} from './lib/spatial-ledger.js';
import { normalizeApiKey } from './lib/api-key.js';
import { DEFAULT_OPENAI_MODEL_ID, getOpenAIModel, getOpenAIModelRoute } from './lib/openai-models.js';
import { getOpenAIImageFallbackChain } from './lib/openai-image-fallback.js';
import { projectPerspectiveReference, projectPanoramaView } from './lib/panorama-reference.js';

// タイムアウト付きでPromiseを実行するヘルパー関数
async function callWithTimeout(promise, ms) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`APIリクエストがタイムアウトしました（${ms / 1000}秒）`));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

const OPENAI_TEXT_TIMEOUT_MS = 25000;
const OPENAI_VISION_TIMEOUT_MS = 60000;
const OPENAI_PANORAMA_SIZE = '2048x1024';
const GEMINI_IMAGE_TIMEOUT_MS = 120000;
const EQUIRECTANGULAR_GEOMETRY = `Render one full spherical view from one fixed camera position. The center column faces the reference direction, the quarter columns face the two sides, and both outer edges meet in the direction behind the camera. These are continuous angles through one space. The equator is at mid-height, with the zenith at the top and nadir at the bottom. Reconstruct unseen directions with plausible continuations of the same surfaces. Place the wrap boundary on a simple continuous surface if possible. Any structure crossing it must align on both edges in position and direction.`;
const OPENAI_SCENE_PROMPT = `Analyze this image in extreme detail. Describe the scene as if writing a comprehensive prompt for an image generator.

Include ALL of the following in your description:
- The art style (anime, photorealistic, watercolor, etc.), line quality, color palette, and rendering technique
- Any characters or figures present: their appearance, hair, clothing, what they are doing, and where they are in the scene
- The environment, setting, architectural style, and specific objects
- Time of day, lighting direction, shadows, contrast, saturation, and color temperature
- Overall atmosphere and mood

Do NOT mention that this is an image or photo. Describe the scene directly.
Do NOT omit characters or figures if they are present — they are part of the scene.
Keep it highly descriptive but concise.`;

function loadPanoramaImage({ base64, mimeType }) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('パノラマ画像の読み込みに失敗しました。'));
    image.src = `data:${mimeType};base64,${base64}`;
  });
}

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function canvasPngBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error('360°編集用のPNGを作成できませんでした。'));
  }, 'image/png'));
}

export class PanoramaEngine {
  constructor() {
    this.geminiClient = null;
    this.openAIKey = null;
    this.activeEngine = null; // 'gemini' | 'openai'
    this.lastSuccessImageModel = null;
    this.lastSuccessTextModel = null;
    this.selectedOpenAIModelId = DEFAULT_OPENAI_MODEL_ID;
    this.openAIRouteCount = 0;
    this.onOpenAIModelRoute = null;
  }

  setApiKey(apiKey) {
    if (!apiKey || apiKey.trim() === '') {
      this.geminiClient = null;
      this.openAIKey = null;
      this.activeEngine = null;
      return null;
    }
    const key = normalizeApiKey(apiKey);
    if (key.startsWith('sk-')) {
      this.openAIKey = key;
      this.geminiClient = null;
      this.activeEngine = 'openai';
      return 'openai';
    } else {
      try {
        this.geminiClient = new GoogleGenAI({ apiKey: key });
        this.openAIKey = null;
        this.activeEngine = 'gemini';
        return 'gemini';
      } catch (e) {
        console.error('Gemini APIクライアント初期化失敗:', e);
        return null;
      }
    }
  }

  isReady() { return this.activeEngine !== null; }

  setOpenAIModel(modelId) {
    if (this.openAIRouteCount > 0) throw new Error('OpenAI処理中はモデルを変更できません。');
    this.selectedOpenAIModelId = getOpenAIModel(modelId).id;
    return this.selectedOpenAIModelId;
  }

  _notifyOpenAIModelRoute(workflow, phase, modelId, route = {}) {
    this.onOpenAIModelRoute?.({ workflow, phase, modelId, ...route });
  }

  // ============================================
  // OpenAI Utilities
  // ============================================
  forOperation(operation) {
    const context = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    context.requestSignal = operation.signal;
    const pendingRoutes = new Map();
    context.onOpenAIModelRoute = event => {
      operation.check();
      if (event.phase === 'trying') pendingRoutes.set(event.workflow, event);
      else if (event.phase !== 'idle') pendingRoutes.delete(event.workflow);
      this.onOpenAIModelRoute?.(event);
    };
    operation.signal.addEventListener('abort', () => {
      if (!operation.isCurrent()) return;
      for (const event of pendingRoutes.values()) {
        this.onOpenAIModelRoute?.({ ...event, phase: 'cancelled' });
      }
      pendingRoutes.clear();
    }, { once: true });
    return context;
  }

  _fetch(url, options = {}) {
    this.requestSignal?.throwIfAborted();
    return abortable(fetch(url, { ...options, ...(this.requestSignal ? { signal: this.requestSignal } : {}) }), this.requestSignal);
  }

  async _callOpenAIChat(messages, model = this.selectedOpenAIModelId, responseFormat = "text", timeoutMs = OPENAI_TEXT_TIMEOUT_MS) {
    const reasoningModel = /^gpt-(?:6(?:\.|-)|5\.6-)/.test(model);
    const payload = { model, messages, ...(reasoningModel
      ? { max_completion_tokens: 32768 }
      : { temperature: 0.7 }) };
    if (responseFormat === "json_object") payload.response_format = { type: "json_object" };
    
    const res = await callWithTimeout(
      this._fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${this.openAIKey}` },
        body: JSON.stringify(payload)
      }),
      reasoningModel ? Math.max(timeoutMs, 120000) : timeoutMs
    );
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      const error = new Error(`OpenAI Chat Error: HTTP ${res.status} ${err.error?.message || ''}`);
      error.terminal = [401, 403, 429].includes(res.status) || /quota|content_policy|safety|refusal/i.test(err.error?.code || '');
      throw error;
    }
    const data = await res.json();
    const choice = data.choices?.[0];
    if (choice?.finish_reason === 'length' || choice?.finish_reason === 'content_filter' || choice?.message?.refusal) {
      const error = new Error(`OpenAI response incomplete or refused: ${choice?.finish_reason}`);
      error.terminal = true;
      throw error;
    }
    const text = choice?.message?.content;
    if (choice?.finish_reason !== 'stop' || typeof text !== 'string' || !text.trim()) throw new Error('Empty or incomplete OpenAI response');
    return text;
  }

  async _callOpenAIChatWithFallback(messages, responseFormat = "text") {
    const ordered = getOpenAIModelRoute(this.selectedOpenAIModelId);
    const attemptedModels = [];
    const route = () => ({ selectedModelId: ordered[0].id, attemptedModels: [...attemptedModels] });
    this.openAIRouteCount += 1;
    try {
      const errors = [];
    
      for (let i = 0; i < ordered.length; i++) {
        const tier = ordered[i];
        try {
          if (i > 0) {
            console.warn(`⚠️ OpenAI Text ${ordered[i-1].label} 失敗 → ${tier.label} にフォールバック`);
          } else {
            console.log(`🎯 OpenAI Text ${tier.label} で処理開始`);
          }
        
          attemptedModels.push(tier.id);
          this._notifyOpenAIModelRoute('text', 'trying', tier.id, route());
          const text = await this._callOpenAIChat(messages, tier.id, responseFormat);
        
          this._notifyOpenAIModelRoute('text', 'adopted', tier.id, route());
          console.log(`✅ OpenAI Text ${tier.label} で処理成功`);
          return text;
        } catch (err) {
          this.requestSignal?.throwIfAborted();
        this.requestSignal?.throwIfAborted();
          const msg = err?.message || String(err);
          this._notifyOpenAIModelRoute('text', 'failed', tier.id, route());
          console.error(`❌ OpenAI Text ${tier.label} エラー:`, msg);
          errors.push({ label: tier.label, msg });
          if (err.terminal) throw err;
        }
      }
    
      console.error('OpenAI全テキストモデル失敗詳細:', errors.map(e => `[${e.label}] ${e.msg}`).join(' | '));
      throw new Error('OpenAIテキスト生成のすべてのモデル呼び出しに失敗しました。');
    } finally {
      this.openAIRouteCount -= 1;
      this._notifyOpenAIModelRoute('text', 'idle', this.selectedOpenAIModelId);
    }
  }

  async _callOpenAIVisionWithFallback(base64Image, mimeType, {
    prompt = OPENAI_SCENE_PROMPT, responseFormat = 'text', seamView, seamPerspective, referenceView,
  } = {}) {
    const images = [{ base64: base64Image, mimeType }];
    if (seamView) images.push(seamView);
    if (seamPerspective) images.push(seamPerspective);
    if (referenceView) images.push(referenceView);
    const messages = [{
      role: 'user',
      content: [{ type: 'text', text: prompt }, ...images.map(image => ({
        type: 'image_url',
        image_url: { url: `data:${image.mimeType};base64,${image.base64}`, detail: 'high' },
      }))],
    }];
    
    const ordered = getOpenAIModelRoute(this.selectedOpenAIModelId);
    const attemptedModels = [];
    const route = () => ({ selectedModelId: ordered[0].id, attemptedModels: [...attemptedModels] });
    this.openAIRouteCount += 1;
    try {
      const errors = [];
    
      for (let i = 0; i < ordered.length; i++) {
        const tier = ordered[i];
        try {
          if (i > 0) {
            console.warn(`⚠️ OpenAI Vision ${ordered[i-1].label} 失敗 → ${tier.label} にフォールバック`);
          } else {
            console.log(`🎯 OpenAI Vision ${tier.label} で処理開始`);
          }
        
          attemptedModels.push(tier.id);
          this._notifyOpenAIModelRoute('vision', 'trying', tier.id, route());
          const text = await this._callOpenAIChat(messages, tier.id, responseFormat, OPENAI_VISION_TIMEOUT_MS);
        
          this._notifyOpenAIModelRoute('vision', 'adopted', tier.id, route());
          console.log(`✅ OpenAI Vision ${tier.label} で処理成功`);
          return text;
        } catch (err) {
          this.requestSignal?.throwIfAborted();
        this.requestSignal?.throwIfAborted();
          const msg = err?.message || String(err);
          this._notifyOpenAIModelRoute('vision', 'failed', tier.id, route());
          console.error(`❌ OpenAI Vision ${tier.label} エラー:`, msg);
          errors.push({ label: tier.label, msg });
          if (err.terminal) throw err;
        }
      }
    
      console.error('OpenAI全ビジョンモデル失敗詳細:', errors.map(e => `[${e.label}] ${e.msg}`).join(' | '));
      throw new Error('OpenAI画像解析のすべてのモデル呼び出しに失敗しました。');
    } finally {
      this.openAIRouteCount -= 1;
      this._notifyOpenAIModelRoute('vision', 'idle', this.selectedOpenAIModelId);
    }
  }

  async _callOpenAIImage(prompt, size = "1024x1024", { panorama = false, edit = null } = {}) {
    const deadline = Date.now() + 600000;
    const imageModels = getOpenAIImageFallbackChain();
    let lastError;

    for (let index = 0; index < imageModels.length; index++) {
      const imageModel = imageModels[index];
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) throw new Error('OpenAI Image Error: 600秒の生成上限に達しました。');

      try {
        const payload = {
          model: imageModel.id,
          prompt,
          n: 1,
          size,
          quality: imageModel.quality,
          output_format: "png",
        };
        const headers = { Authorization: `Bearer ${this.openAIKey}` };
        let body;
        if (edit) {
          body = new FormData();
          for (const [key, value] of Object.entries(payload)) body.append(key, String(value));
          body.append('image', edit.image, 'panorama.png');
          body.append('mask', edit.mask, 'seam-mask.png');
        } else {
          headers['Content-Type'] = 'application/json';
          body = JSON.stringify(payload);
        }
        const action = edit ? 'edits' : 'generations';
        const res = await callWithTimeout(
          this._fetch(`https://api.openai.com/v1/images/${action}`, {
            method: "POST",
            headers,
            body,
          }),
          remainingMs,
        );
        if (!res.ok) {
          const err = await res.json().catch(()=>({}));
          if (err.error?.code === "content_policy_violation") {
            const customErr = new Error('コンテンツポリシーにより生成がブロックされました。');
            customErr.code = 'content_policy_violation';
            throw customErr;
          }
          const requestError = new Error(`OpenAI Image Error: ${err.error?.message || res.status}`);
          requestError.status = res.status;
          requestError.code = err.error?.code;
          throw requestError;
        }

        const data = await res.json();
        const imgData = data.data?.[0];
        let base64 = "";
        if (imgData?.b64_json) {
          base64 = imgData.b64_json;
        } else if (imgData?.url) {
          const downloadRemainingMs = deadline - Date.now();
          if (downloadRemainingMs <= 0) throw new Error('OpenAI Image Error: 600秒の生成上限に達しました。');
          const imgRes = await callWithTimeout(this._fetch(imgData.url), Math.min(downloadRemainingMs, 30000));
          if (!imgRes.ok) throw new Error("画像URLのダウンロードに失敗しました");
          const blob = await imgRes.blob();
          base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const resStr = reader.result;
              resolve(resStr.substring(resStr.indexOf(",") + 1));
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          throw new Error("画像データが見つかりませんでした");
        }

        console.info(`OpenAI Images ${action}: ${imageModel.id} / ${imageModel.quality} / ${size}`);
        return { base64, mimeType: "image/png", usedModel: imageModel.id };
      } catch (err) {
        this.requestSignal?.throwIfAborted();
        lastError = err;
        throw err;
      }
    }

    throw lastError || new Error('OpenAI Image Error: 画像生成に失敗しました。');
  }

  async _analyzeImageWithVision(base64Image, mimeType) {
    return await this._callOpenAIVisionWithFallback(base64Image, mimeType);
  }

  async _createSpatialLedger(imageBase64, mimeType) {
    const prompt = buildSpatialLedgerPrompt();
    let responseText;
    if (this.activeEngine === 'openai') {
      responseText = await this._callOpenAIVisionWithFallback(imageBase64, mimeType, {
        prompt, responseFormat: 'json_object',
      });
    } else {
      const response = await this._callWithFallback(TEXT_MODELS, 'text', {
        contents: [{ role: 'user', parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: prompt },
        ] }],
        config: { responseModalities: ['TEXT'] },
      }, OPENAI_VISION_TIMEOUT_MS);
      responseText = response.candidates?.[0]?.content?.parts?.find(part => part.text)?.text || '';
    }
    return parseSpatialLedger(responseText);
  }

  async _runSpatialQa(panorama, ledger, seamView, referenceView) {
    const prompt = buildSpatialQaPrompt(ledger, Boolean(seamView), Boolean(referenceView));
    let responseText;
    if (this.activeEngine === 'openai') {
      const seamPerspective = seamView ? await this._createPanoramaSeamView(panorama) : undefined;
      responseText = await this._callOpenAIVisionWithFallback(panorama.base64, panorama.mimeType, {
        prompt, responseFormat: 'json_object', seamView, seamPerspective, referenceView,
      });
    } else {
      const response = await this._callWithFallback(TEXT_MODELS, 'text', {
        contents: [{ role: 'user', parts: [
          { inlineData: { mimeType: panorama.mimeType, data: panorama.base64 } },
          { text: prompt },
        ] }],
        config: { responseModalities: ['TEXT'] },
      }, OPENAI_VISION_TIMEOUT_MS);
      responseText = response.candidates?.[0]?.content?.parts?.find(part => part.text)?.text || '';
    }
    const assessment = parseSpatialQa(responseText);
    console.info(`Spatial QA assessment: ${assessment.verdict}; repair=${assessment.seamOnly ? 'seam' : 'whole'}; ${assessment.issues.join('; ')}`);
    return assessment;
  }

  async _createPanoramaSeamView(panorama) {
    const image = await loadPanoramaImage(panorama);
    const source = makeCanvas(image.naturalWidth, image.naturalHeight);
    const context = source.getContext('2d');
    context.drawImage(image, 0, 0);
    const view = projectPanoramaView(context.getImageData(0, 0, source.width, source.height));
    const canvas = makeCanvas(view.width, view.height);
    canvas.getContext('2d').putImageData(new ImageData(view.data, view.width, view.height), 0, 0);
    return { base64: canvas.toDataURL('image/png').split(',')[1], mimeType: 'image/png' };
  }

  async _regenerateForSpatialIssues(imageBase64, mimeType, ledger, issues, onProgress, reference) {
    if (this.activeEngine === 'openai') {
      return this._outpaintOpenAIReference(reference, ledger, issues, onProgress);
    }
    const correction = `Regenerate the complete 360-degree equirectangular panorama from the reference image.

SPATIAL INVENTORY:
${formatSpatialLedger(ledger)}

CORRECT THESE MATERIAL DEFECTS:
${issues.map(issue => `- ${issue}`).join('\n')}

Keep one continuous, physically coherent space. Do not add furniture, openings, or decorations beyond the reference inventory. The left and right edges must join seamlessly when wrapped into a sphere. Output a strict 2:1 equirectangular panorama with no text, watermark, UI, or borders.`;
    onProgress?.('generate');
    const response = await this._callWithFallback(IMAGE_MODELS, 'image', {
      contents: [{ role: 'user', parts: [
        { inlineData: { mimeType, data: imageBase64 } },
        { text: correction },
      ] }],
      config: { responseModalities: ['IMAGE', 'TEXT'] },
    }, GEMINI_IMAGE_TIMEOUT_MS, tierLabel => onProgress?.('fallback', tierLabel));
    return this._extractImage(response);
  }

  async _prepareOpenAIPanoramaReference(base64, mimeType) {
    const original = await loadPanoramaImage({ base64, mimeType });
    const source = makeCanvas(original.naturalWidth, original.naturalHeight);
    const context = source.getContext('2d');
    context.drawImage(original, 0, 0);
    const projection = projectPerspectiveReference(context.getImageData(0, 0, source.width, source.height));
    const canvases = {};
    for (const name of ['image', 'mask', 'anchor']) {
      const canvas = makeCanvas(projection.width, projection.height);
      canvas.getContext('2d').putImageData(new ImageData(projection[name], projection.width, projection.height), 0, 0);
      canvases[name] = canvas;
    }
    return {
      image: await canvasPngBlob(canvases.image), mask: await canvasPngBlob(canvases.mask),
      anchor: canvases.anchor,
    };
  }

  async _preservePanoramaReference(candidate, reference) {
    const image = await loadPanoramaImage(candidate);
    const { width, height } = reference.anchor;
    if (image.naturalWidth !== width || image.naturalHeight !== height) {
      throw new Error(`360°画像は2:1の${width}×${height}が必要です（実寸: ${image.naturalWidth}×${image.naturalHeight}）。`);
    }
    const canvas = makeCanvas(width, height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    // Mask guidance alone does not guarantee preservation. Restore the known pixels.
    context.drawImage(reference.anchor, 0, 0);
    return { ...candidate, base64: canvas.toDataURL('image/png').split(',')[1], mimeType: 'image/png' };
  }

  async _outpaintOpenAIReference(reference, ledger, issues = [], onProgress) {
    const prompt = `Complete the missing directions in this 2:1 equirectangular panorama.
The visible central patch is an actual perspective photograph mathematically projected onto a sphere (90-degree horizontal field of view, camera level). Its geometry and pixels are fixed. The gray area outside it is unknown space to be filled, NOT a wall, frame, fog, or an object. The transparent mask marks the area to generate.
Continue the existing surfaces naturally out of the fixed patch in every direction. Infer the unseen sides and rear from the SAME camera position. Do not copy the front view into the rear. Do not duplicate distinctive objects or move them. Add only the plausible unseen continuation of this environment; maintain its style, lighting and density.
${EQUIRECTANGULAR_GEOMETRY}
The output must cover the entire sphere including above and below, with no gray unfilled area, frames, panels, text or watermarks.

VISIBLE REFERENCE INVENTORY:
${formatSpatialLedger(ledger)}
${issues.length ? `\nCORRECT THESE OBSERVED DEFECTS IN THE GENERATED AREA:\n${issues.map(issue => `- ${issue}`).join('\n')}` : ''}`;
    onProgress?.('generate');
    return this._callOpenAIImage(prompt, OPENAI_PANORAMA_SIZE, { panorama: true, edit: reference });
  }

  async _repairOpenAISeam(shifted, issues, onProgress) {
    const original = await loadPanoramaImage(shifted);
    const { naturalWidth: width, naturalHeight: height } = original;
    const left = Math.round(width * 0.34);
    const stripWidth = width - 2 * left;
    const maskCanvas = makeCanvas(width, height);
    const maskContext = maskCanvas.getContext('2d');
    maskContext.fillRect(0, 0, width, height);
    maskContext.clearRect(left, 0, stripWidth, height);
    const mask = await new Promise((resolve, reject) => maskCanvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('つなぎ目の編集マスクを作成できませんでした。'));
    }, 'image/png'));
    const image = new Blob([Uint8Array.from(atob(shifted.base64), value => value.charCodeAt(0))], {
      type: shifted.mimeType,
    });
    const prompt = `Repair the seam in the transparent central strip of this horizontally rotated equirectangular panorama.
The two sides of the central cut depict adjacent directions from one camera. Bridge interrupted structures so they follow a single path at consistent heights and angles. Align the new strip to the unmasked structures on both sides. Preserve the lighting, polar projection and scene outside the strip. The left and right edges of this rotated image are already continuous.
Visible problems:
${issues.map(issue => `- ${issue}`).join('\n')}`;
    onProgress?.('repair');
    const response = await this._callOpenAIImage(prompt, `${width}x${height}`, { panorama: true, edit: { image, mask } });
    const edited = await loadPanoramaImage(response);
    if (edited.naturalWidth !== width || edited.naturalHeight !== height) {
      throw new Error(`編集後の360°画像が元と同じ寸法ではありません（実寸: ${edited.naturalWidth}×${edited.naturalHeight}）。`);
    }

    // The edit mask guides the model. Composite only the strip to preserve the surrounding pixels.
    const patch = makeCanvas(stripWidth, height);
    const patchContext = patch.getContext('2d');
    patchContext.drawImage(edited, left, 0, stripWidth, height, 0, 0, stripWidth, height);
    const gradient = patchContext.createLinearGradient(0, 0, stripWidth, 0);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.03, 'black');
    gradient.addColorStop(0.97, 'black');
    gradient.addColorStop(1, 'transparent');
    patchContext.globalCompositeOperation = 'destination-in';
    patchContext.fillStyle = gradient;
    patchContext.fillRect(0, 0, stripWidth, height);

    const repaired = makeCanvas(width, height);
    const context = repaired.getContext('2d');
    context.drawImage(original, 0, 0);
    context.drawImage(patch, left, 0);
    const base64 = repaired.toDataURL('image/png').split(',')[1];
    return this._splitSwapImage(base64, 'image/png', true);
  }

  // ============================================
  // Gemini Utilities
  // ============================================
  _getModelOrder(models, lastSuccess) {
    if (lastSuccess) {
      const preferred = models.find(m => m.id === lastSuccess);
      const rest = models.filter(m => m.id !== lastSuccess);
      return preferred ? [preferred, ...rest] : [...models];
    }
    return [...models];
  }

  async _callWithFallback(models, lastSuccessKey, requestConfig, timeoutMs = 25000, onModelSwitch) {
    const lastSuccess = lastSuccessKey === 'image' ? this.lastSuccessImageModel : this.lastSuccessTextModel;
    const ordered = this._getModelOrder(models, lastSuccess);
    const errors = [];
    for (let i = 0; i < ordered.length; i++) {
      const tier = ordered[i];
      try {
        if (i > 0) {
          console.warn(`⚠️ ${ordered[i-1].label} 失敗 → ${tier.label} にフォールバック`);
          onModelSwitch?.(tier.label);
        } else {
          console.log(`🎯 ${tier.label} で生成開始`);
        }
        const needsImage = requestConfig.config?.responseModalities?.includes('IMAGE');
        this.requestSignal?.throwIfAborted();
        let response = await abortable(callWithTimeout(
          needsImage ? this.geminiClient.interactions.create({
            model: tier.id,
            input: requestConfig.contents.flatMap(content => content.parts).map(part => part.inlineData
              ? { type: 'image', mime_type: part.inlineData.mimeType, data: part.inlineData.data }
              : { type: 'text', text: part.text }),
            response_format: { type: 'image', mime_type: 'image/jpeg' },
          }, {
            // The public browser endpoint rejects this SDK default during CORS preflight.
            headers: { 'Api-Revision': null },
            timeout: timeoutMs,
            maxRetries: 0,
            signal: this.requestSignal,
          }) : this.geminiClient.models.generateContent({
            model: tier.id, ...requestConfig,
            config: { ...requestConfig.config, abortSignal: this.requestSignal },
          }),
          timeoutMs
        ), this.requestSignal);
        this.requestSignal?.throwIfAborted();

        if (needsImage) {
          const parts = (response.steps || []).flatMap(step => step.content || []).map(part =>
            part.type === 'image' ? { inlineData: { data: part.data, mimeType: part.mime_type } } : { text: part.text });
          response = { candidates: [{ content: { parts } }] };
        }

        if (!response.candidates || response.candidates.length === 0) {
          throw new Error('空のレスポンス（安全フィルタの可能性）');
        }

        const candidate = response.candidates[0];
        const finishReason = candidate.finishReason;
        if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
          throw new Error(`コンテンツブロック (finishReason: ${finishReason})`);
        }

        if (needsImage) {
          const parts = candidate.content?.parts;
          const hasImage = parts?.some(p => p.inlineData?.data);
          if (!hasImage) {
            const textReason = parts?.find(p => p.text)?.text || '';
            throw new Error(`画像データなし${textReason ? ': ' + textReason.substring(0, 100) : ''}`);
          }
        }

        if (lastSuccessKey === 'image') this.lastSuccessImageModel = tier.id;
        else this.lastSuccessTextModel = tier.id;
        console.log(`✅ ${tier.label} で生成成功`);
        return response;
      } catch (err) {
        this.requestSignal?.throwIfAborted();
        const msg = err?.message || String(err);
        console.error(`❌ ${tier.label} エラー:`, msg);
        const isContentBlock = /SAFETY|RECITATION|コンテンツブロック|画像データなし|安全フィルタ|blocked/i.test(msg);
        errors.push({ label: tier.label, msg, isContentBlock });
      }
    }
    const hasContentBlock = errors.some(e => e.isContentBlock);
    console.error('全モデル失敗詳細:', errors.map(e => `[${e.label}] ${e.msg}`).join(' | '));
    const err = new Error(
      hasContentBlock
        ? 'コンテンツポリシーにより生成がブロックされました。'
        : '画像の生成に失敗しました。サーバーが混雑しているか、一時的な問題が発生しています。'
    );
    err.isContentPolicy = hasContentBlock;
    throw err;
  }

  _extractImage(response) {
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('AIからの応答がありませんでした。プロンプトを変えて再試行してください。');
    }
    const parts = response.candidates[0].content?.parts;
    if (!parts) throw new Error('レスポンスの解析に失敗しました。');

    for (const part of parts) {
      if (part.inlineData?.data) {
        return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/png' };
      }
    }
    const textPart = parts.find(p => p.text);
    const reason = textPart?.text || '不明な理由';
    throw new Error(`画像の生成に失敗しました。理由: ${reason.substring(0, 200)}`);
  }

  // ============================================
  // Core Functions
  // ============================================

  /**
   * Canvas上で画像を中央から左右分割し、位置を入れ替える（Split-Swap）
   * equirectangular画像の左右エッジのシーム（切れ目）を画像中央に移動させるために使用
   * @param {string} base64 - 画像のbase64データ
   * @param {string} mimeType - 画像のMIMEタイプ
   * @returns {Promise<{base64: string, mimeType: string}>} swap後の画像
   */
  async _splitSwapImage(base64, mimeType, requireTwoToOne = false) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (requireTwoToOne && (w < 1024 || w !== h * 2)) {
          reject(new Error(`OpenAIの360°画像が2:1ではありません（実寸: ${w}×${h}）。`));
          return;
        }
        const mid = Math.floor(w / 2);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        // 右半分を左側に描画
        ctx.drawImage(img, mid, 0, w - mid, h, 0, 0, w - mid, h);
        // 左半分を右側に描画
        ctx.drawImage(img, 0, 0, mid, h, w - mid, 0, mid, h);

        // Canvas → base64
        const outputMime = 'image/png';
        const dataUrl = canvas.toDataURL(outputMime, 1.0);
        const outputBase64 = dataUrl.split(',')[1];
        resolve({ base64: outputBase64, mimeType: outputMime });
      };
      img.onerror = () => reject(new Error('Split-Swap: 画像の読み込みに失敗しました'));
      img.src = `data:${mimeType};base64,${base64}`;
    });
  }

  /**
   * AI Inpainting: Split-Swap後の画像の中央シームを修復する
   * @param {string} base64 - swap済み画像のbase64データ
   * @param {string} mimeType - 画像のMIMEタイプ
   * @param {Function} onProgress - 進捗通知コールバック（互換性のため残す）
   * @returns {Promise<{base64: string, mimeType: string}>} 修復後の画像
   */
  async _blendCenterSeam(base64, mimeType) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        // 元画像をそのまま描画
        ctx.drawImage(img, 0, 0);

        // ブレンド幅: 画像幅の8%（片側4%ずつ）
        const blendWidth = Math.max(20, Math.floor(w * 0.08));
        const halfBlend = Math.floor(blendWidth / 2);
        const centerX = Math.floor(w / 2);

        // 中央のシーム周辺のピクセルデータを取得
        const seamRegion = ctx.getImageData(centerX - halfBlend, 0, blendWidth, h);
        const data = seamRegion.data;

        const originalData = new Uint8ClampedArray(data);

        // フェザーブレンド: 中央の継ぎ目をグラデーション補間
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < blendWidth; x++) {
            const idx = (y * blendWidth + x) * 4;
            const mirrorX = blendWidth - 1 - x;
            const mirrorIdx = (y * blendWidth + mirrorX) * 4;

            const blendStrength = 1.0 - Math.abs(x - halfBlend) / halfBlend;
            const strength = blendStrength * blendStrength;

            if (strength > 0.01) {
              const r = originalData[idx] * (1 - strength * 0.5) + originalData[mirrorIdx] * strength * 0.5;
              const g = originalData[idx + 1] * (1 - strength * 0.5) + originalData[mirrorIdx + 1] * strength * 0.5;
              const b = originalData[idx + 2] * (1 - strength * 0.5) + originalData[mirrorIdx + 2] * strength * 0.5;

              data[idx] = Math.round(r);
              data[idx + 1] = Math.round(g);
              data[idx + 2] = Math.round(b);
            }
          }
        }

        ctx.putImageData(seamRegion, centerX - Math.floor(blendWidth / 2), 0);

        // Canvas → base64
        const outputMime = 'image/png';
        const dataUrl = canvas.toDataURL(outputMime, 1.0);
        const outputBase64 = dataUrl.split(',')[1];
        resolve({ base64: outputBase64, mimeType: outputMime });
      };
      img.onerror = () => reject(new Error('シームブレンド: 画像の読み込みに失敗しました'));
      img.src = `data:${mimeType};base64,${base64}`;
    });
  }

  /**
   * テキストから画像を生成（Step 1）
   */
  async generateImage(sceneDescription, styleText, onProgress) {
    if (!this.isReady()) throw new Error('APIキーが設定されていません');
    onProgress?.('generate');

    const prompt = `Generate a single high-quality background illustration image.

Scene: ${sceneDescription}
Style: ${styleText || 'anime illustration style with vibrant colors'}

Requirements:
1. Create a beautiful, detailed background scene with STANDARD composition and perspective
2. Use a normal camera angle (NOT wide-angle, NOT fisheye, NOT panoramic)
3. The image should look like a single photograph or painting with natural framing
4. High resolution, rich in detail, with beautiful lighting and atmosphere
5. NO text, NO watermarks, NO UI elements, NO people or characters
6. Focus on the ENVIRONMENT and SCENERY described in the scene
7. The image should have a natural aspect ratio
8. Do NOT create a 360-degree or equirectangular image - just a normal scene

Generate the image now.`;

    if (this.activeEngine === 'openai') {
      return await this._callOpenAIImage(prompt, "1536x1024");
    } else {
      const response = await this._callWithFallback(
        IMAGE_MODELS, 'image',
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseModalities: ['IMAGE', 'TEXT'] },
        },
        GEMINI_IMAGE_TIMEOUT_MS,
        (tierLabel) => onProgress?.('fallback', tierLabel)
      );
      return this._extractImage(response);
    }
  }

  /**
   * 既存の画像を360°パノラマに拡張（Step 2 / ドロップ画像）
   * 4段階パイプライン: 生成 → Split-Swap → Inpaint → 復元
   */
  async expandToPanorama(imageBase64, mimeType, onProgress) {
    if (!this.isReady()) throw new Error('API key is not configured.');
    onProgress?.('analyze');
    const spatialLedger = await this._createSpatialLedger(imageBase64, mimeType);
    const spatialInventory = formatSpatialLedger(spatialLedger);

    // ========================================
    // Phase 1: AIによる初回360°画像生成
    // ========================================
    let rawPano, reference;
    if (this.activeEngine === 'openai') {
      reference = await this._prepareOpenAIPanoramaReference(imageBase64, mimeType);
      rawPano = await this._outpaintOpenAIReference(reference, spatialLedger, [], onProgress);
    } else {
      onProgress?.('analyze');

      const prompt = `You are a world-class equirectangular panorama specialist. I am providing you with a reference background image.

Your task: Generate a COMPLETE 360-degree equirectangular panorama image based on this scene.

=== SPATIAL INVENTORY ===
${spatialInventory}

=== ABSOLUTE TOP PRIORITY: SEAMLESS LEFT-RIGHT EDGE CONNECTION ===
The LEFT EDGE and RIGHT EDGE of the output image represent the SAME POINT in 3D space.
They MUST connect PERFECTLY and SEAMLESSLY when the image is wrapped into a sphere.
- The pixel colors, lines, shapes, and perspective at x=0 must EXACTLY continue from x=max
- Imagine cutting a cylinder and unrolling it: the cut edges must rejoin perfectly
- ANY visible seam, discontinuity, or mismatched element at the left-right boundary is a CRITICAL FAILURE

=== EQUIRECTANGULAR FORMAT REQUIREMENTS ===
1. Output MUST be exactly 2:1 aspect ratio (e.g. 2048x1024, 4096x2048)
2. Horizontal axis = full 360° of longitude (left-to-right wraps around)
3. Vertical axis = 180° of latitude (top=zenith/sky, bottom=nadir/ground)
4. Objects near top and bottom edges should show natural polar stretching/distortion
5. Straight horizontal lines in 3D become curved lines in equirectangular (barrel distortion)

=== SCENE CONTINUITY ===
1. Maintain the EXACT same art style, color palette, lighting direction, and atmosphere as the reference image
2. The scene must feel like a SINGLE CONTINUOUS SPACE, not stitched panels
3. Extend the environment naturally in all directions (imagine standing in the center looking around)
4. Include consistent sky/ceiling above and ground/floor below across the entire image
5. Architectural elements (walls, floors, ceilings) must follow correct perspective for 360° projection
6. Do NOT add objects, furniture, or decorations that are not present in the reference image
7. If the reference shows a sparse or minimal space, preserve that sparseness

=== VISUAL CONSISTENCY (match the reference image on ALL of these) ===
1. Art style — same line quality, rendering technique, detail density, texture treatment
2. Lighting — same direction, intensity, diffusion, and shadow characteristics
3. Contrast — same highlight-to-shadow ratio and tonal range
4. Saturation — same color vibrancy or muted quality
5. Color temperature — same warm/cool/neutral bias

=== QUALITY ===
1. Highest possible resolution
2. NO text, NO watermarks, NO UI elements
3. Rich detail and consistent quality across the entire panorama

REMINDER: The single most important requirement is that the LEFT and RIGHT edges connect SEAMLESSLY. This is a 360° wrap-around image.

Generate the equirectangular panorama image now.`;

      onProgress?.('generate');
      const response = await this._callWithFallback(
        IMAGE_MODELS, 'image',
        {
          contents: [{
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: imageBase64 } },
              { text: prompt }
            ]
          }],
          config: { responseModalities: ['IMAGE', 'TEXT'] },
        },
        GEMINI_IMAGE_TIMEOUT_MS,
        (tierLabel) => onProgress?.('fallback', tierLabel)
      );
      rawPano = this._extractImage(response);
    }

    console.log('✅ Phase 1 完了: 初回360°画像生成');
    const checkCandidate = async candidate => {
      if (this.activeEngine !== 'openai') {
        return { spatialQa: await this._runSpatialQa(candidate, spatialLedger) };
      }
      candidate = await this._preservePanoramaReference(candidate, reference);
      onProgress?.('splitswap');
      const seamView = await this._splitSwapImage(candidate.base64, candidate.mimeType, true);
      onProgress?.('qa');
      return { final: candidate, seamView, spatialQa: await this._runSpatialQa(candidate, spatialLedger, seamView, {
        base64: imageBase64, mimeType,
      }) };
    };
    let { final, seamView, spatialQa } = await checkCandidate(rawPano);
    if (spatialQa.verdict === 'retry') {
      console.warn(`Spatial QA requested one correction: ${spatialQa.issues.join('; ')}`);
      rawPano = this.activeEngine === 'openai' && spatialQa.seamOnly
        ? await this._repairOpenAISeam(seamView, spatialQa.issues, onProgress)
        : await this._regenerateForSpatialIssues(imageBase64, mimeType, spatialLedger, spatialQa.issues, onProgress, reference);
      ({ final, seamView, spatialQa } = await checkCandidate(rawPano));
      if (spatialQa.verdict !== 'pass') {
        const error = new Error(spatialQa.issues.join('\n') || '画像のつながりに問題が残っています。');
        error.code = 'panorama_quality_rejected';
        error.panorama = final ?? rawPano;
        error.seamView = seamView;
        throw error;
      }
    }
    console.info('Spatial QA passed');
    return final ?? await this._finishPanorama(rawPano, onProgress);
  }

  async _finishPanorama(rawPano, onProgress) {
    // ========================================
    // Phase 2: Split-Swap（左右入れ替え → シームを中央に移動）
    // ========================================
    onProgress?.('splitswap');
    const swapped = await this._splitSwapImage(rawPano.base64, rawPano.mimeType);
    console.log('✅ Phase 2 完了: Split-Swap（シームを中央に移動）');

    // ========================================
    // Phase 3: Canvas ブレンド（中央シーム修復 — API不要）
    // ========================================
    onProgress?.('inpaint');
    const blended = await this._blendCenterSeam(swapped.base64, swapped.mimeType);
    console.log('✅ Phase 3 完了: Canvas ブレンド（中央シーム修復）');

    // ========================================
    // Phase 4: 最終Split-Swap（元の位置に戻す）
    // ========================================
    onProgress?.('restore');
    const final = await this._splitSwapImage(blended.base64, blended.mimeType);
    console.log('✅ Phase 4 完了: 最終Split-Swap（復元）');

    return final;
  }

  /**
   * AIにスタイルを提案させる（テキスト専用モデル使用）
   */
  async suggestStyle(sceneDescription) {
    if (!this.isReady()) throw new Error('APIキーが設定されていません');

    const prompt = `シーン「${sceneDescription}」に最も合う画像スタイルを1つだけ提案してください。
20文字以内の日本語で、「〜風」「〜調」の形式で回答してください。
例: 「夕暮れの水彩画風」「レトロポップ調」「幻想的なファンタジーアート風」
【絶対厳守】思考プロセス、理由、前置きなどは一切書かず、スタイル名のみを直接出力してください。`;

    if (this.activeEngine === 'openai') {
      const text = await this._callOpenAIChatWithFallback([{ role: "user", content: prompt }]);
      return text.replace(/^.*[:：]\s*/, '').replace(/\*+/g, '').replace(/[「」]/g, '').trim() || 'アニメイラスト風';
    } else {
      const response = await this._callWithFallback(
        TEXT_MODELS, 'text',
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseModalities: ['TEXT'] },
        },
        25000,
        null
      );
      let text = response.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
      if (text) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const decisionLine = lines.find(l => l.includes('最終決定') || l.includes('提案:'));
        text = decisionLine ? decisionLine : (lines.length > 0 ? lines[lines.length - 1] : text);
        text = text.replace(/^.*[:：]\s*/, '').replace(/\*+/g, '').trim();
      }
      return text?.replace(/[「」]/g, '') || 'アニメイラスト風';
    }
  }

  /**
   * AIにランダムなシーンを提案させる（テキスト専用モデル使用）
   */
  async suggestScene() {
    if (!this.isReady()) throw new Error('APIキーが設定されていません');

    const prompt = `360度パノラマ背景画像にふさわしい、創造的で美しいシーンの説明を1つだけ提案してください。
以下のカテゴリからランダムに選んで提案してください：
- 都市・街（東京、パリ、未来都市など）
- 自然・風景（森、海、山、草原など）
- ファンタジー・SF（魔法の世界、宇宙、異世界など）
- 室内・建築（城、神殿、カフェ、書斎など）
- 時代もの（中世ヨーロッパ、江戸時代、古代文明など）

30〜60文字程度の日本語で、具体的な情景描写を含めてください。
例: 「オーロラが輝く北極圏の氷原、星空と凍った湖が反射する」
【絶対厳守】思考プロセス、理由、前置きなどは一切書かず、シーン説明のみを直接出力してください。`;

    if (this.activeEngine === 'openai') {
      const text = await this._callOpenAIChatWithFallback([{ role: "user", content: prompt }]);
      return text.replace(/^.*[:：]\s*/, '').replace(/\*+/g, '').replace(/[「」]/g, '').trim() || '夕暮れの東京の街並み、ネオンが輝く繁華街';
    } else {
      const response = await this._callWithFallback(
        TEXT_MODELS, 'text',
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseModalities: ['TEXT'] },
        },
        25000,
        null
      );

      let text = response.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
      if (text) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const decisionLine = lines.find(l => l.includes('最終決定') || l.includes('提案:'));
        text = decisionLine ? decisionLine : (lines.length > 0 ? lines[lines.length - 1] : text);
        text = text.replace(/^.*[:：]\s*/, '').replace(/\*+/g, '').trim();
      }
      return text?.replace(/[「」]/g, '') || '夕暮れの東京の街並み、ネオンが輝く繁華街';
    }
  }
}
