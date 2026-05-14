// ============================================
// 360° AI Panorama Generator - パノラマ生成エンジン (Gemini API)
// Zenith-Style フォールバック + 2段階生成
// ============================================

import { GoogleGenAI } from '@google/genai';

// 画像生成対応モデル（generateContent + responseModalities IMAGE）
const IMAGE_MODELS = [
  { id: 'gemini-2.0-flash-preview-image-generation', label: 'Tier1: Gemini 2.0 Flash Preview Image' },
  { id: 'gemini-3.1-flash-image-preview', label: 'Tier2: Gemini 3.1 Flash Image Preview' },
  { id: 'gemini-2.0-flash-exp', label: 'Tier3: Gemini 2.0 Flash Exp' },
];

// テキスト専用モデル（スタイル提案等）
const TEXT_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Tier1: Gemini 2.5 Flash' },
  { id: 'gemini-2.0-flash', label: 'Tier2: Gemini 2.0 Flash' },
  { id: 'gemini-1.5-flash', label: 'Tier3: Gemini 1.5 Flash' },
];

export class PanoramaEngine {
  constructor() {
    this.client = null;
    this.lastSuccessImageModel = null;
    this.lastSuccessTextModel = null;
  }

  setApiKey(apiKey) {
    if (!apiKey || apiKey.trim() === '') { this.client = null; return false; }
    try {
      this.client = new GoogleGenAI({ apiKey: apiKey.trim() });
      return true;
    } catch (e) {
      console.error('APIクライアント初期化失敗:', e);
      this.client = null;
      return false;
    }
  }

  isReady() { return this.client !== null; }

  _getModelOrder(models, lastSuccess) {
    if (lastSuccess) {
      const preferred = models.find(m => m.id === lastSuccess);
      const rest = models.filter(m => m.id !== lastSuccess);
      return preferred ? [preferred, ...rest] : [...models];
    }
    return [...models];
  }

  async _callWithFallback(models, lastSuccessKey, requestConfig, onModelSwitch) {
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
        const response = await this.client.models.generateContent({
          model: tier.id, ...requestConfig,
        });

        // === コンテンツ安全チェック（フォールバックトリガー） ===
        if (!response.candidates || response.candidates.length === 0) {
          throw new Error('空のレスポンス（安全フィルタの可能性）');
        }

        const candidate = response.candidates[0];

        // finishReasonチェック: SAFETY / RECITATION / OTHER はブロック扱い
        const finishReason = candidate.finishReason;
        if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
          throw new Error(`コンテンツブロック (finishReason: ${finishReason})`);
        }

        // IMAGE要求時: 画像データが含まれているか確認
        const needsImage = requestConfig.config?.responseModalities?.includes('IMAGE');
        if (needsImage) {
          const parts = candidate.content?.parts;
          const hasImage = parts?.some(p => p.inlineData?.data);
          if (!hasImage) {
            const textReason = parts?.find(p => p.text)?.text || '';
            throw new Error(`画像データなし${textReason ? ': ' + textReason.substring(0, 100) : ''}`);
          }
        }

        // === 全チェック通過: 成功 ===
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
    // コンテンツポリシー系が1つでもあればそれを主因とする
    const hasContentBlock = errors.some(e => e.isContentBlock);
    const err = new Error(
      hasContentBlock
        ? 'コンテンツポリシーにより生成がブロックされました。'
        : `全モデルで生成に失敗しました。\n${errors.map(e => `[${e.label}] ${e.msg}`).join('\n')}`
    );
    err.isContentPolicy = hasContentBlock;
    throw err;
  }

  /**
   * テキストから画像を生成（Step 1）
   */
  async generateImage(sceneDescription, styleText, onProgress) {
    if (!this.client) throw new Error('APIキーが設定されていません');
    onProgress?.('generate');

    const prompt = `Generate a high-quality background illustration image optimized for 360-degree panoramic extension.

Scene: ${sceneDescription}
Style: ${styleText || 'anime illustration style with vibrant colors'}

Requirements:
1. Create a beautiful, detailed WIDE-ANGLE background scene (ultra-wide perspective)
2. The scene should depict an ENVIRONMENT that extends naturally in all directions
3. Include continuous elements (sky, floor/ground, walls) that can wrap around 360 degrees
4. High resolution, rich in detail, consistent lighting and atmosphere throughout
5. NO text, NO watermarks, NO UI elements, NO people or characters
6. Focus on BACKGROUND ENVIRONMENT ONLY - this will become a 360° panorama
7. Use wide-angle or fisheye-like perspective to capture more of the surrounding space
8. Ensure the scene has depth and elements at varying distances

Generate the image now.`;

    const response = await this._callWithFallback(
      IMAGE_MODELS, 'image',
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseModalities: ['IMAGE', 'TEXT'] },
      },
      (tierLabel) => onProgress?.('fallback', tierLabel)
    );
    return this._extractImage(response);
  }

  /**
   * 既存の画像を360°パノラマに拡張（Step 2 / ドロップ画像）
   */
  async expandToPanorama(imageBase64, mimeType, onProgress) {
    if (!this.client) throw new Error('APIキーが設定されていません');
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
      (tierLabel) => onProgress?.('fallback', tierLabel)
    );
    return this._extractImage(response);
  }

  /**
   * AIにスタイルを提案させる（テキスト専用モデル使用）
   */
  async suggestStyle(sceneDescription) {
    if (!this.client) throw new Error('APIキーが設定されていません');

    const prompt = `シーン「${sceneDescription}」に最も合う画像スタイルを1つだけ提案してください。
20文字以内の日本語で、「〜風」「〜調」の形式で回答してください。
例: 「夕暮れの水彩画風」「レトロポップ調」「幻想的なファンタジーアート風」
スタイル名のみ回答し、説明は不要です。`;

    const response = await this._callWithFallback(
      TEXT_MODELS, 'text',
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseModalities: ['TEXT'] },
      },
      null
    );

    const text = response.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
    return text?.trim()?.replace(/[「」\n]/g, '') || 'アニメイラスト風';
  }

  /**
   * AIにランダムなシーンを提案させる（テキスト専用モデル使用）
   */
  async suggestScene() {
    if (!this.client) throw new Error('APIキーが設定されていません');

    const prompt = `360度パノラマ背景画像にふさわしい、創造的で美しいシーンの説明を1つだけ提案してください。
以下のカテゴリからランダムに選んで提案してください：
- 都市・街（東京、パリ、未来都市など）
- 自然・風景（森、海、山、草原など）
- ファンタジー・SF（魔法の世界、宇宙、異世界など）
- 室内・建築（城、神殿、カフェ、書斎など）
- 時代もの（中世ヨーロッパ、江戸時代、古代文明など）

30〜60文字程度の日本語で、具体的な情景描写を含めてください。
例: 「オーロラが輝く北極圏の氷原、星空と凍った湖が反射する」
シーン説明のみ回答し、その他の説明は不要です。`;

    const response = await this._callWithFallback(
      TEXT_MODELS, 'text',
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseModalities: ['TEXT'] },
      },
      null
    );

    const text = response.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
    return text?.trim()?.replace(/[「」\n]/g, '') || '夕暮れの東京の街並み、ネオンが輝く繁華街';
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
}
