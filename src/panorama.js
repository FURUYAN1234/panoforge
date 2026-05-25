// ============================================
// 360° AI Panorama Generator - パノラマ生成エンジン (Dual-API)
// Zenith-Style フォールバック + 2段階生成
// ============================================

import { GoogleGenAI } from '@google/genai';

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
  { id: 'gemini-3.1-flash-image-preview', label: 'Tier1: Gemini 3.1 Flash Image Preview' },
  { id: 'gemini-2.5-flash-image', label: 'Tier2: Gemini 2.5 Flash Image' },
  { id: 'imagen-3.0-generate-002', label: 'Tier3: Imagen 3.0 Generate' },
];

// テキスト専用モデル（スタイル提案等）
const TEXT_MODELS = [
  { id: 'gemini-3.5-flash', label: 'Tier1: Gemini 3.5 Flash' },
  { id: 'gemini-flash-latest', label: 'Tier2: Gemini Flash Latest' },
  { id: 'gemini-1.5-pro', label: 'Tier3: Gemini 1.5 Pro' },
  { id: 'gemini-1.5-flash', label: 'Tier4: Gemini 1.5 Flash' },
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
  { id: 'gpt-4o', label: 'OpenAI Vision Fallback 1: gpt-4o' },
  { id: 'gpt-4o-mini', label: 'OpenAI Vision Fallback 2: gpt-4o-mini' },
];

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
    const key = apiKey.trim();
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
  async _callOpenAIChat(messages, model = "gpt-4o-mini", responseFormat = "text") {
    const payload = { model, messages, temperature: 0.7 };
    if (responseFormat === "json_object") payload.response_format = { type: "json_object" };
    
    const res = await callWithTimeout(
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${this.openAIKey}` },
        body: JSON.stringify(payload)
      }),
      25000
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
    const prompt = `Analyze this image in extreme detail. Describe the environment, setting, time of day, lighting, architectural style, specific objects, colors, and overall atmosphere. Do NOT mention that it is an image or photo. Just describe the scene inside it as if writing a prompt for an image generator. Keep it concise but highly descriptive.`;
    
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
        
        const text = await this._callOpenAIChat(messages, tier.id);
        
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
    // ユーザー環境のAPIプロキシ仕様に合わせて、dall-e-3のエイリアスとして gpt-image-2 を使用
    // quality も 'hd' ではなく 'high' 等を指定する仕様のため変換
    const mappedQuality = quality === "hd" ? "high" : quality === "standard" ? "medium" : quality;
    const payload = { model: "gpt-image-2", prompt, n: 1, size, quality: mappedQuality };
    // 一部のAPIプロキシでは response_format が非対応のため送信しない
    const res = await callWithTimeout(
      fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${this.openAIKey}` },
        body: JSON.stringify(payload)
      }),
      60000
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
      return await this._callOpenAIImage(prompt, "1792x1024", "hd");
    } else {
      const response = await this._callWithFallback(
        IMAGE_MODELS, 'image',
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseModalities: ['IMAGE', 'TEXT'] },
        },
        60000,
        (tierLabel) => onProgress?.('fallback', tierLabel)
      );
      return this._extractImage(response);
    }
  }

  /**
   * 既存の画像を360°パノラマに拡張（Step 2 / ドロップ画像）
   */
  async expandToPanorama(imageBase64, mimeType, onProgress) {
    if (!this.isReady()) throw new Error('APIキーが設定されていません');
    
    if (this.activeEngine === 'openai') {
      onProgress?.('analyze');
      const analyzedScene = await this._analyzeImageWithVision(imageBase64, mimeType);
      
      onProgress?.('generate');
      const panoPrompt = `Create a COMPLETE 360-degree equirectangular panorama image based exactly on this scene description:

${analyzedScene}

=== EQUIRECTANGULAR FORMAT REQUIREMENTS ===
1. The output MUST be a strict equirectangular panorama projection.
2. The left and right edges MUST connect PERFECTLY and SEAMLESSLY when wrapped into a sphere.
3. Natural vertical distortion at the top (zenith) and bottom (nadir).
4. Maintain the described art style, color palette, lighting, and atmosphere.

=== QUALITY ===
1. Highest possible resolution and rich detail.
2. NO text, NO watermarks, NO UI elements, NO borders.

Generate the equirectangular panorama image now.`;
      
      return await this._callOpenAIImage(panoPrompt, "1792x1024", "hd");
    } else {
      onProgress?.('analyze');
      
      const prompt = `You are a world-class equirectangular panorama specialist. I am providing you with a reference background image.

Your task: Generate a COMPLETE 360-degree equirectangular panorama image based on this scene.

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
1. Maintain the EXACT same art style, color palette, lighting direction, and atmosphere
2. The scene must feel like a SINGLE CONTINUOUS SPACE, not stitched panels
3. Extend the environment naturally in all directions (imagine standing in the center looking around)
4. Include consistent sky/ceiling above and ground/floor below across the entire image
5. Architectural elements (walls, floors, ceilings) must follow correct perspective for 360° projection

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
        60000,
        (tierLabel) => onProgress?.('fallback', tierLabel)
      );
      return this._extractImage(response);
    }
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
