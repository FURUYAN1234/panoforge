export const FALLBACK_CHAINS = [
  {
    id: 'suggest-scene-gemini',
    step: 'AI Suggestion',
    label: 'Scene Suggestion / シーン提案',
    description: 'ランダムなシーン説明を提案する。※注記: 現在のアプリのAPIは、最新APIの対応状況や安定稼働を考慮し、あえて古い世代のモデルをPrimaryに設定している場合があります。',
    provider: 'Gemini',
    sourceFile: 'src/panorama.js',
    models: [
      { id: 'gemini-3.5-flash', label: 'Tier1: Gemini 3.5 Flash' },
      { id: 'gemini-2.5-flash', label: 'Tier2: Gemini 2.5 Flash' },
      { id: 'gemini-2.5-pro', label: 'Tier3: Gemini 2.5 Pro' },
      { id: 'gemini-flash-latest', label: 'Tier4: Gemini Flash Latest' },
      { id: 'gemini-pro-latest', label: 'Tier5: Gemini Pro Latest' }
    ]
  },
  {
    id: 'suggest-scene-openai',
    step: 'AI Suggestion',
    label: 'Scene Suggestion / シーン提案',
    description: 'ランダムなシーン説明を提案する。※注記: 現在のアプリのAPIは、最新APIの対応状況や安定稼働を考慮し、あえて古い世代のモデルをPrimaryに設定している場合があります。',
    provider: 'OpenAI',
    sourceFile: 'src/panorama.js',
    models: [
      { id: 'gpt-4o', label: 'OpenAI Primary: gpt-4o' },
      { id: 'gpt-4o-mini', label: 'OpenAI Backup 1: gpt-4o-mini' }
    ]
  },
  {
    id: 'suggest-style-gemini',
    step: 'AI Suggestion',
    label: 'Style Suggestion / スタイル提案',
    description: 'シーン説明に合う画像スタイルをAIが提案する。※注記: 現在のアプリのAPIは、最新APIの対応状況や安定稼働を考慮し、あえて古い世代のモデルをPrimaryに設定している場合があります。',
    provider: 'Gemini',
    sourceFile: 'src/panorama.js',
    models: [
      { id: 'gemini-3.5-flash', label: 'Tier1: Gemini 3.5 Flash' },
      { id: 'gemini-2.5-flash', label: 'Tier2: Gemini 2.5 Flash' },
      { id: 'gemini-2.5-pro', label: 'Tier3: Gemini 2.5 Pro' },
      { id: 'gemini-flash-latest', label: 'Tier4: Gemini Flash Latest' },
      { id: 'gemini-pro-latest', label: 'Tier5: Gemini Pro Latest' }
    ]
  },
  {
    id: 'suggest-style-openai',
    step: 'AI Suggestion',
    label: 'Style Suggestion / スタイル提案',
    description: 'シーン説明に合う画像スタイルをAIが提案する。※注記: 現在のアプリのAPIは、最新APIの対応状況や安定稼働を考慮し、あえて古い世代のモデルをPrimaryに設定している場合があります。',
    provider: 'OpenAI',
    sourceFile: 'src/panorama.js',
    models: [
      { id: 'gpt-4o', label: 'OpenAI Primary: gpt-4o' },
      { id: 'gpt-4o-mini', label: 'OpenAI Backup 1: gpt-4o-mini' }
    ]
  },
  {
    id: 'step1-gemini',
    step: 'STEP 1',
    label: 'Image Generation / 画像生成',
    description: 'テキストプロンプトから背景イラスト画像を生成する。※注記: 現在のアプリのAPIは、最新APIの対応状況や安定稼働を考慮し、あえて古い世代のモデルをPrimaryに設定している場合があります。',
    provider: 'Gemini',
    sourceFile: 'src/panorama.js',
    models: [
      { id: 'gemini-3.1-flash-image-preview', label: 'Tier1: Gemini 3.1 Flash Image' },
      { id: 'gemini-2.5-flash-image', label: 'Tier2: Gemini 2.5 Flash Image' }
    ]
  },
  {
    id: 'step1-openai',
    step: 'STEP 1',
    label: 'Image Generation / 画像生成',
    description: 'テキストプロンプトから背景イラスト画像を生成する。※注記: 現在のアプリのAPIは、最新APIの対応状況や安定稼働を考慮し、あえて古い世代のモデルをPrimaryに設定している場合があります。',
    provider: 'OpenAI',
    sourceFile: 'src/panorama.js',
    models: [
      { id: 'gpt-image-2', label: 'OpenAI Primary: gpt-image-2' }
    ]
  },
  {
    id: 'step2-analyze-openai',
    step: 'STEP 2',
    label: 'Image Analysis / 画像解析',
    description: '入力画像を解析し、360度パノラマ生成のためのプロンプトを作成する。※注記: 現在のアプリのAPIは、最新APIの対応状況や安定稼働を考慮し、あえて古い世代のモデルをPrimaryに設定している場合があります。',
    provider: 'OpenAI',
    sourceFile: 'src/panorama.js',
    models: [
      { id: 'gpt-4o', label: 'OpenAI Vision Primary: gpt-4o' },
      { id: 'gpt-4o-mini', label: 'OpenAI Vision Backup 1: gpt-4o-mini' }
    ]
  },
  {
    id: 'step2-gemini',
    step: 'STEP 2',
    label: 'Panorama Expansion / パノラマ拡張',
    description: '既存の画像を360度パノラマ画像に拡張する。※注記: 現在のアプリのAPIは、最新APIの対応状況や安定稼働を考慮し、あえて古い世代のモデルをPrimaryに設定している場合があります。',
    provider: 'Gemini',
    sourceFile: 'src/panorama.js',
    models: [
      { id: 'gemini-3.1-flash-image-preview', label: 'Tier1: Gemini 3.1 Flash Image' },
      { id: 'gemini-2.5-flash-image', label: 'Tier2: Gemini 2.5 Flash Image' }
    ]
  },
  {
    id: 'step2-openai',
    step: 'STEP 2',
    label: 'Panorama Expansion / パノラマ拡張',
    description: '既存の画像を360度パノラマ画像に拡張する。※注記: 現在のアプリのAPIは、最新APIの対応状況や安定稼働を考慮し、あえて古い世代のモデルをPrimaryに設定している場合があります。',
    provider: 'OpenAI',
    sourceFile: 'src/panorama.js',
    models: [
      { id: 'gpt-image-2', label: 'OpenAI Primary: gpt-image-2' }
    ]
  }
];

export const FALLBACK_CHAIN_HISTORY = [
  {
    version: '1.3.5',
    date: '2026-05-30 14:02 JST',
    note: '初期スナップショット（フォールバックチェーン ビューア導入時点の構成）',
    changes: [
      { step: 'AI Suggestion (Gemini)', detail: 'gemini-3.5-flash -> 2.5-flash -> 2.5-pro -> flash-latest -> pro-latest' },
      { step: 'AI Suggestion (OpenAI)', detail: 'gpt-4o -> 4o-mini' },
      { step: 'STEP 1 (Gemini)', detail: 'gemini-3.1-flash-image-preview -> 2.5-flash-image' },
      { step: 'STEP 1 (OpenAI)', detail: 'gpt-image-2（単一）' },
      { step: 'STEP 2 (Gemini)', detail: 'gemini-3.1-flash-image-preview -> 2.5-flash-image' },
      { step: 'STEP 2 (OpenAI)', detail: 'gpt-4o -> 4o-mini (Vision) / gpt-image-2 (単一)' }
    ]
  }
];
