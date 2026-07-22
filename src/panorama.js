// ============================================
// 360° AI Panorama Generator - パノラマ生成エンジン (Dual-API)
// Zenith-Style フォールバック + 2段階生成
// ============================================

import { GoogleGenAI } from '@google/genai';
import {
  buildSpatialLedgerPrompt,
  buildSpatialQaPrompt,
  formatSpatialLedger,
  parseSpatialLedger,
  parseSpatialQa,
} from './lib/spatial-ledger.js';
import { normalizeApiKey } from './lib/api-key.js';

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

// 画像生成対応モデル（generateContent + responseModalities IMAGE）
const IMAGE_MODELS = [
  { id: 'gemini-3.1-flash-image', label: 'Tier1: Gemini 3.1 Flash Image (Nano Banana 2)' },
  { id: 'gemini-2.5-flash-image', label: 'Tier2: Gemini 2.5 Flash Image (Compatibility)' },
];

// テキスト専用モデル（スタイル提案等）
const TEXT_MODELS = [
  { id: 'gemini-3.5-flash', label: 'Tier1: Gemini 3.5 Flash' },
  { id: 'gemini-2.5-flash', label: 'Tier2: Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', label: 'Tier3: Gemini 2.5 Pro' },
  { id: 'gemini-flash-latest', label: 'Tier4: Gemini Flash Latest' },
  { id: 'gemini-pro-latest', label: 'Tier5: Gemini Pro Latest' },
];

// OpenAI テキスト専用モデル
const OPENAI_TEXT_MODELS = [
  { id: 'gpt-4.1', label: 'OpenAI Primary: gpt-4.1' },
  { id: 'gpt-4.1-mini', label: 'OpenAI Backup 1: gpt-4.1-mini' },
  { id: 'gpt-4.1-nano', label: 'OpenAI Backup 2: gpt-4.1-nano' },
  { id: 'gpt-4o', label: 'OpenAI Fallback: gpt-4o' },
];

// OpenAI ビジョン対応モデル
const OPENAI_VISION_MODELS = [
  { id: 'gpt-4.1', label: 'OpenAI Vision Primary: gpt-4.1' },
  { id: 'gpt-4.1-mini', label: 'OpenAI Vision Backup 1: gpt-4.1-mini' },
  { id: 'gpt-4.1-nano', label: 'OpenAI Vision Backup 2: gpt-4.1-nano' },
  { id: 'gpt-4o', label: 'OpenAI Vision Fallback: gpt-4o' },
];

const OPENAI_TEXT_TIMEOUT_MS = 25000;
const OPENAI_VISION_TIMEOUT_MS = 60000;
const GEMINI_IMAGE_TIMEOUT_MS = 120000;

export class PanoramaEngine {
  constructor() {
    this.geminiClient = null;
    this.openAIKey = null;
    this.activeEngine = null; // 'gemini' | 'openai'
    this.lastSuccessImageModel = null;
    this.lastSuccessTextModel = null;
    this.lastSuccessOpenAITextModel = null;
    this.lastSuccessOpenAIVisionModel = null;
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

  // ============================================
  // OpenAI Utilities
  // ============================================
  async _callOpenAIChat(messages, model = "gpt-4.1-mini", responseFormat = "text", timeoutMs = OPENAI_TEXT_TIMEOUT_MS) {
    const payload = { model, messages, temperature: 0.7 };
    if (responseFormat === "json_object") payload.response_format = { type: "json_object" };
    
    const res = await callWithTimeout(
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${this.openAIKey}` },
        body: JSON.stringify(payload)
      }),
      timeoutMs
    );
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(`OpenAI Chat Error: ${err.error?.message || res.status}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
  }

  _getOpenAIModelOrder(models, lastSuccess) {
    if (lastSuccess) {
      const preferred = models.find(m => m.id === lastSuccess);
      const rest = models.filter(m => m.id !== lastSuccess);
      return preferred ? [preferred, ...rest] : [...models];
    }
    return [...models];
  }

  async _callOpenAIChatWithFallback(messages, responseFormat = "text") {
    const lastSuccess = this.lastSuccessOpenAITextModel;
    const ordered = this._getOpenAIModelOrder(OPENAI_TEXT_MODELS, lastSuccess);
    const errors = [];
    
    for (let i = 0; i < ordered.length; i++) {
      const tier = ordered[i];
      try {
        if (i > 0) {
          console.warn(`⚠️ OpenAI Text ${ordered[i-1].label} 失敗 → ${tier.label} にフォールバック`);
        } else {
          console.log(`🎯 OpenAI Text ${tier.label} で処理開始`);
        }
        
        const text = await this._callOpenAIChat(messages, tier.id, responseFormat);
        
        this.lastSuccessOpenAITextModel = tier.id;
        console.log(`✅ OpenAI Text ${tier.label} で処理成功`);
        return text;
      } catch (err) {
        const msg = err?.message || String(err);
        console.error(`❌ OpenAI Text ${tier.label} エラー:`, msg);
        errors.push({ label: tier.label, msg });
      }
    }
    
    console.error('OpenAI全テキストモデル失敗詳細:', errors.map(e => `[${e.label}] ${e.msg}`).join(' | '));
    throw new Error('OpenAIテキスト生成のすべてのモデル呼び出しに失敗しました。');
  }

  async _callOpenAIVisionWithFallback(base64Image, mimeType) {
    const prompt = `Analyze this image in extreme detail. Describe the scene as if writing a comprehensive prompt for an image generator.

Include ALL of the following in your description:
- The art style (anime, photorealistic, watercolor, etc.), line quality, color palette, and rendering technique
- Any characters or figures present: their appearance, hair, clothing, what they are doing, and where they are in the scene
- The environment, setting, architectural style, and specific objects
- Time of day, lighting direction, shadows, contrast, saturation, and color temperature
- Overall atmosphere and mood

Do NOT mention that this is an image or photo. Describe the scene directly.
Do NOT omit characters or figures if they are present — they are part of the scene.
Keep it highly descriptive but concise.`;
    
    const lastSuccess = this.lastSuccessOpenAIVisionModel;
    const ordered = this._getOpenAIModelOrder(OPENAI_VISION_MODELS, lastSuccess);
    const errors = [];
    
    for (let i = 0; i < ordered.length; i++) {
      const tier = ordered[i];
      try {
        if (i > 0) {
          console.warn(`⚠️ OpenAI Vision ${ordered[i-1].label} 失敗 → ${tier.label} にフォールバック`);
        } else {
          console.log(`🎯 OpenAI Vision ${tier.label} で処理開始`);
        }
        
        const messages = [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: "high" } }
          ]
        }];
        
        const text = await this._callOpenAIChat(messages, tier.id, "text", OPENAI_VISION_TIMEOUT_MS);
        
        this.lastSuccessOpenAIVisionModel = tier.id;
        console.log(`✅ OpenAI Vision ${tier.label} で処理成功`);
        return text;
      } catch (err) {
        const msg = err?.message || String(err);
        console.error(`❌ OpenAI Vision ${tier.label} エラー:`, msg);
        errors.push({ label: tier.label, msg });
      }
    }
    
    console.error('OpenAI全ビジョンモデル失敗詳細:', errors.map(e => `[${e.label}] ${e.msg}`).join(' | '));
    throw new Error('OpenAI画像解析のすべてのモデル呼び出しに失敗しました。');
  }

  async _callOpenAIImage(prompt, size = "1024x1024", quality = "high") {
    // gpt-image-2 は quality に 'high' 等を使い、出力形式は output_format で指定する。
    const mappedQuality = quality === "hd" ? "high" : quality === "standard" ? "medium" : quality;
    const payload = { model: "gpt-image-2", prompt, n: 1, size, quality: mappedQuality, output_format: "png" };
    // response_format は送信しない。gpt-image-2 は混雑時に長引くため、タイムアウトを600秒（10分）に設定。
    const res = await callWithTimeout(
      fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${this.openAIKey}` },
        body: JSON.stringify(payload)
      }),
      600000
    );
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      // safety system filter
      if (err.error?.code === "content_policy_violation") {
        const customErr = new Error('コンテンツポリシーにより生成がブロックされました。');
        customErr.isContentPolicy = true;
        throw customErr;
      }
      throw new Error(`OpenAI Image Error: ${err.error?.message || res.status}`);
    }
    const data = await res.json();
    const imgData = data.data[0];
    
    let base64 = "";
    if (imgData.b64_json) {
      base64 = imgData.b64_json;
    } else if (imgData.url) {
      const imgRes = await callWithTimeout(fetch(imgData.url), 30000);
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
    
    return { base64, mimeType: "image/png" };
  }

  async _analyzeImageWithVision(base64Image, mimeType) {
    return await this._callOpenAIVisionWithFallback(base64Image, mimeType);
  }

  async _createSpatialLedger(imageBase64, mimeType) {
    const prompt = buildSpatialLedgerPrompt();
    let responseText;
    if (this.activeEngine === 'openai') {
      const description = await this._analyzeImageWithVision(imageBase64, mimeType);
      responseText = await this._callOpenAIChatWithFallback([{
        role: 'user', content: `${prompt}\n\nREFERENCE DESCRIPTION:\n${description}`,
      }], 'json_object');
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

  async _runSpatialQa(panorama, ledger) {
    const prompt = buildSpatialQaPrompt(ledger);
    let responseText;
    if (this.activeEngine === 'openai') {
      const description = await this._analyzeImageWithVision(panorama.base64, panorama.mimeType);
      responseText = await this._callOpenAIChatWithFallback([{
        role: 'user', content: `${prompt}\n\nPANORAMA DESCRIPTION:\n${description}`,
      }], 'json_object');
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
    return parseSpatialQa(responseText);
  }

  async _regenerateForSpatialIssues(imageBase64, mimeType, ledger, issues, onProgress) {
    const correction = `Regenerate the complete 360-degree equirectangular panorama from the reference image.

SPATIAL INVENTORY:
${formatSpatialLedger(ledger)}

CORRECT THESE MATERIAL DEFECTS:
${issues.map(issue => `- ${issue}`).join('\n')}

Keep one continuous, physically coherent space. Do not add furniture, openings, or decorations beyond the reference inventory. The left and right edges must join seamlessly when wrapped into a sphere. Output a strict 2:1 equirectangular panorama with no text, watermark, UI, or borders.`;
    onProgress?.('generate');
    if (this.activeEngine === 'openai') return await this._callOpenAIImage(correction, '1536x1024', 'hd');
    const response = await this._callWithFallback(IMAGE_MODELS, 'image', {
      contents: [{ role: 'user', parts: [
        { inlineData: { mimeType, data: imageBase64 } },
        { text: correction },
      ] }],
      config: { responseModalities: ['IMAGE', 'TEXT'] },
    }, GEMINI_IMAGE_TIMEOUT_MS, tierLabel => onProgress?.('fallback', tierLabel));
    return this._extractImage(response);
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
        const response = await callWithTimeout(
          this.geminiClient.models.generateContent({
            model: tier.id, ...requestConfig,
          }),
          timeoutMs
        );

        if (!response.candidates || response.candidates.length === 0) {
          throw new Error('空のレスポンス（安全フィルタの可能性）');
        }

        const candidate = response.candidates[0];
        const finishReason = candidate.finishReason;
        if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
          throw new Error(`コンテンツブロック (finishReason: ${finishReason})`);
        }

        const needsImage = requestConfig.config?.responseModalities?.includes('IMAGE');
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
  async _splitSwapImage(base64, mimeType) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;
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
      return await this._callOpenAIImage(prompt, "1536x1024", "hd");
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
    const spatialLedger = await this._createSpatialLedger(imageBase64, mimeType);
    const spatialInventory = formatSpatialLedger(spatialLedger);

    // ========================================
    // Phase 1: AIによる初回360°画像生成
    // ========================================
    let rawPano;
    if (this.activeEngine === 'openai') {
      onProgress?.('analyze');
      const analyzedScene = await this._analyzeImageWithVision(imageBase64, mimeType);

      onProgress?.('generate');
      const panoPrompt = `Create a COMPLETE 360-degree equirectangular panorama image based exactly on this scene description:

${analyzedScene}

=== SPATIAL INVENTORY ===
${spatialInventory}

=== EQUIRECTANGULAR FORMAT ===
1. Output MUST be a strict equirectangular panorama projection (2:1 aspect ratio).
2. The left and right edges MUST connect PERFECTLY and SEAMLESSLY when wrapped into a sphere.
3. Natural vertical distortion at the top (zenith) and bottom (nadir).

=== SCENE FIDELITY ===
1. Reproduce the described scene FAITHFULLY. Do NOT add objects, furniture, or decorations that are not mentioned.
2. If the description indicates a sparse space, keep it sparse.
3. Match the described art style, lighting direction, contrast, saturation, and color temperature uniformly across the entire panorama.

=== QUALITY ===
1. Highest possible resolution and rich detail.
2. NO text, NO watermarks, NO UI elements, NO borders.

Generate the equirectangular panorama image now.`;

      rawPano = await this._callOpenAIImage(panoPrompt, "1536x1024", "hd");
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
    const spatialQa = await this._runSpatialQa(rawPano, spatialLedger);
    if (spatialQa.verdict === 'retry') {
      console.warn('Spatial QA requested one regeneration:', spatialQa.issues);
      rawPano = await this._regenerateForSpatialIssues(
        imageBase64, mimeType, spatialLedger, spatialQa.issues, onProgress,
      );
      const retryQa = await this._runSpatialQa(rawPano, spatialLedger);
      if (retryQa.verdict !== 'pass') {
        throw new Error(`Spatial QA rejected the regenerated panorama: ${retryQa.issues.join('; ') || 'unspecified defect'}`);
      }
    }

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
    console.log('✅ Phase 4 完了: 最終Split-Swap（復元） → シームレス360°画像完成');

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
