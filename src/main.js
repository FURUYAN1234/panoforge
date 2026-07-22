// ============================================
// 360° AI Panorama Generator - メインエントリーポイント
// API起動時モーダル + 2段階生成 + インラインビューワー
// ============================================

import './style.css';
import { PanoramaEngine } from './panorama.js';
import { PanoramaViewer } from './viewer.js';
import { FallbackChainViewer } from './components/FallbackChainViewer.js';
import { OPENAI_IMAGE_TIMEOUT_SECONDS } from './lib/processing-timeout.js';

const engine = new PanoramaEngine();
let viewer = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  apiSettingsBtn: $('#api-settings-btn'),
  apiStatusText: $('#api-status-text'),
  apiKeyStatus: $('#api-key-status'),
  apiModalOverlay: $('#api-modal-overlay'),
  apiModalClose: $('#api-modal-close'),
  apiKeyForm: $('#api-key-form'),
  apiKeyInput: $('#api-key-input'),
  apiKeyToggle: $('#api-key-toggle'),
  iconEyeOff: $('#icon-eye-off'),
  iconEyeOn: $('#icon-eye-on'),
  apiKeyFeedback: $('#api-key-feedback'),
  apiKeyWarning: $('#api-key-warning'),
  apiModalApply: $('#api-modal-apply'),
  openaiVisionNote: $('#openai-vision-note'),
  processingTimer: $('#processing-timer'),

  inputCard: $('#input-card'),
  tabs: $$('.tab'),
  tabDrop: $('#drop-zone'),
  tabGenerate: $('#generate-zone'),
  dropArea: $('#drop-area'),
  fileInput: $('#file-input'),
  scenePrompt: $('#scene-prompt'),
  sceneChips: $$('.scene-chip'),
  sceneAiBtn: $('#scene-ai-btn'),
  styleChips: $$('.chip'),
  styleInput: $('#style-input'),
  styleAiBtn: $('#style-ai-btn'),
  generateImageBtn: $('#generate-image-btn'),
  // Step 1 プレビュー: 生成画像
  previewSection: $('#preview-section'),
  previewImage: $('#preview-image'),
  previewLabel: $('#preview-label'),
  clearPreview: $('#clear-preview'),
  dlGenerated: $('#dl-generated'),
  // 360°拡張ボタン
  generateBtn: $('#generate-btn'),
  // Step 2 プレビュー: 360°パノラマ
  panoPreviewSection: $('#pano-preview-section'),
  panoPreviewImage: $('#pano-preview-image'),
  dlPanorama: $('#dl-panorama'),
  openViewerBtn: $('#open-viewer-btn'),
  // 処理中 / エラー
  processingOverlay: $('#processing-overlay'),
  processingTitle: $('#processing-title'),
  processingSub: $('#processing-sub'),
  progressSteps: $('#progress-steps'),
  errorOverlay: $('#error-overlay'),
  errorTitle: $('#error-title'),
  errorMessage: $('#error-message'),
  errorRetry: $('#error-retry'),
  errorDismiss: $('#error-dismiss'),
  // ビューワー
  viewerSection: $('#viewer-section'),
  btnBack: $('#btn-back'),
  btnAutoRotate: $('#btn-auto-rotate'),
  btnFullscreen: $('#btn-fullscreen'),
  btnCapture: $('#btn-capture'),
  btnSaveOriginal: $('#btn-save-original'),
  resolutionInfo: $('#resolution-info'),
  zoomInfo: $('#zoom-info'),
  compass: $('#compass'),
  panoDetectOverlay: $('#pano-detect-overlay'),
  panoDetectImage: $('#pano-detect-image'),
  panoOpenViewer: $('#pano-open-viewer'),
  panoUseSource: $('#pano-use-source'),
};

const state = {
  activeTab: 'drop',
  inputImageBase64: null,
  inputImageMime: null,
  // 360°パノラマデータ（生成画像とは分離して保持）
  panoBase64: null,
  panoMime: null,
  panoDataUrl: null,
  // その他
  lastAction: null,
  appLocked: false,
  pendingPanoDataUrl: null,
  pendingPanoFile: null,
  isDirectView: false, // 既存360°画像を直接表示中（保存ボタン非表示）
  generatedDataUrl: null, // 生成画像のDataURL保持
};

// ============================
// Fallback Chain Viewer 初期化
// ============================
const viewerBtn = document.createElement('a');
viewerBtn.href = '#';
viewerBtn.textContent = '⚙ Model Chain';
viewerBtn.className = 'model-chain-btn';
viewerBtn.style.fontSize = '0.75rem';
viewerBtn.style.color = 'var(--text-dim)';
viewerBtn.style.textDecoration = 'none';
viewerBtn.style.marginLeft = '12px';

viewerBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const chainViewer = new FallbackChainViewer();
  chainViewer.open();
});

const headerLeft = document.querySelector('.header-left');
if (headerLeft) {
  headerLeft.appendChild(viewerBtn);
}

// ============================
// 起動時: APIモーダル自動表示 + autocomplete汚染クリア
// ============================
// ブラウザautocompleteを即時+遅延で強制排除
dom.styleInput.value = '';
setTimeout(() => { dom.styleInput.value = ''; }, 100);
setTimeout(() => { dom.styleInput.value = ''; }, 500);
setTimeout(() => { dom.styleInput.value = ''; }, 1500);
dom.apiModalOverlay.classList.remove('hidden');
dom.apiKeyInput.focus();
setAppLocked(true);

function setAppLocked(locked) {
  state.appLocked = locked;
  dom.inputCard.classList.toggle('locked', locked);
}

// ============================
// APIキー管理
// ============================
dom.apiSettingsBtn.addEventListener('click', () => {
  dom.apiModalOverlay.classList.remove('hidden');
  dom.apiKeyInput.focus();
});

dom.apiModalClose.addEventListener('click', () => {
  if (!engine.isReady()) return;
  dom.apiModalOverlay.classList.add('hidden');
});

dom.apiModalOverlay.addEventListener('click', (e) => {
  if (e.target !== dom.apiModalOverlay) return;
  if (!engine.isReady()) return;
  dom.apiModalOverlay.classList.add('hidden');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !dom.apiModalOverlay.classList.contains('hidden')) {
    if (!engine.isReady()) return;
    dom.apiModalOverlay.classList.add('hidden');
  }
});

dom.apiKeyInput.addEventListener('input', () => {
  const val = dom.apiKeyInput.value.trim();
  dom.apiModalApply.disabled = val.length === 0;
  dom.apiKeyFeedback.textContent = '';
  dom.apiKeyFeedback.className = 'api-feedback';
  dom.apiKeyWarning.classList.toggle('hidden', !val.startsWith('sk-'));
});

dom.apiKeyToggle.addEventListener('click', () => {
  const isPassword = dom.apiKeyInput.type === 'password';
  dom.apiKeyInput.type = isPassword ? 'text' : 'password';
  dom.iconEyeOff.classList.toggle('hidden', isPassword);
  dom.iconEyeOn.classList.toggle('hidden', !isPassword);
});

dom.apiKeyForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!dom.apiModalApply.disabled) {
    dom.apiModalApply.click();
  }
});

dom.apiModalApply.addEventListener('click', () => {
  const key = dom.apiKeyInput.value.trim();
  if (!key) return;
  const engineType = engine.setApiKey(key);
  if (engineType) {
    dom.apiKeyStatus.classList.add('connected');
    dom.apiSettingsBtn.classList.add('connected');
    
    // エンジンごとのスタイル変更
    if (engineType === 'openai') {
      dom.apiKeyStatus.classList.add('openai');
      dom.apiKeyFeedback.textContent = '✓ OpenAI API に接続しました';
      dom.apiStatusText.textContent = 'Engine: OpenAI';
      dom.apiKeyStatus.title = 'OpenAI API 接続済み';
      dom.apiKeyStatus.setAttribute('aria-label', 'OpenAI API 接続済み');
      state.appLocked = false;
      dom.openaiVisionNote.classList.remove('hidden');
    } else {
      dom.apiKeyStatus.classList.remove('openai');
      dom.apiKeyFeedback.textContent = '✓ Gemini API に接続しました';
      dom.apiStatusText.textContent = 'Engine: Gemini';
      dom.apiKeyStatus.title = 'Gemini API 接続済み';
      dom.apiKeyStatus.setAttribute('aria-label', 'Gemini API 接続済み');
      state.appLocked = false;
      dom.openaiVisionNote.classList.add('hidden');
    }
    
    dom.apiKeyFeedback.className = 'api-feedback success';
    setAppLocked(false);
    setTimeout(() => {
      dom.apiModalOverlay.classList.add('hidden');
      dom.apiKeyInput.value = '';
      dom.apiKeyInput.type = 'password';
      dom.iconEyeOff.classList.remove('hidden');
      dom.iconEyeOn.classList.add('hidden');
      dom.apiKeyWarning.classList.add('hidden');
    }, 800);
  } else {
    dom.apiKeyStatus.classList.remove('connected', 'openai');
    dom.apiSettingsBtn.classList.remove('connected');
    dom.apiStatusText.textContent = '未接続';
    dom.apiKeyStatus.title = '未接続';
    dom.apiKeyStatus.setAttribute('aria-label', '未接続');
    dom.apiKeyFeedback.textContent = '✕ APIキーの初期化に失敗しました';
    dom.apiKeyFeedback.className = 'api-feedback error';
  }
  updateButtons();
});


// ============================
// タブ切り替え
// ============================
dom.tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    if (state.appLocked) return;
    const target = tab.dataset.tab;
    state.activeTab = target;
    dom.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === target));
    dom.tabDrop.classList.toggle('active', target === 'drop');
    dom.tabGenerate.classList.toggle('active', target === 'generate');
    updateButtons();
  });
});

// ============================
// シーンチップ → テキストエリアに反映
// ============================
dom.sceneChips.forEach(chip => {
  chip.addEventListener('click', () => {
    dom.sceneChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    dom.scenePrompt.value = chip.dataset.scene;
    updateButtons();
  });
});

// シーン入力窓の変更時にチップの選択を解除
dom.scenePrompt.addEventListener('input', () => {
  const val = dom.scenePrompt.value.trim();
  dom.sceneChips.forEach(c => {
    c.classList.toggle('active', c.dataset.scene === val);
  });
  updateButtons();
});

// AIシーン提案ボタン
dom.sceneAiBtn.addEventListener('click', async () => {
  if (!engine.isReady()) return;
  dom.sceneAiBtn.disabled = true;
  dom.sceneAiBtn.textContent = '⏳ 考え中...';
  try {
    const suggestion = await engine.suggestScene();
    dom.scenePrompt.value = suggestion;
    dom.sceneChips.forEach(c => c.classList.remove('active'));
    updateButtons();
  } catch (e) {
    console.error('シーン提案エラー:', e);
  } finally {
    dom.sceneAiBtn.disabled = false;
    dom.sceneAiBtn.textContent = '✨ AI提案';
  }
});

// ============================
// スタイルチップ → 入力窓に反映
// ============================
dom.styleChips.forEach(chip => {
  chip.addEventListener('click', () => {
    dom.styleChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    dom.styleInput.value = chip.dataset.style;
    updateButtons();
  });
});

// スタイル入力窓の変更時にチップの選択を解除
dom.styleInput.addEventListener('input', () => {
  const val = dom.styleInput.value.trim();
  dom.styleChips.forEach(c => {
    c.classList.toggle('active', c.dataset.style === val);
  });
  updateButtons();
});

// AIスタイル提案ボタン
dom.styleAiBtn.addEventListener('click', async () => {
  const scene = dom.scenePrompt.value.trim();
  if (!scene || !engine.isReady()) return;
  dom.styleAiBtn.disabled = true;
  dom.styleAiBtn.textContent = '⏳ 考え中...';
  try {
    const suggestion = await engine.suggestStyle(scene);
    dom.styleInput.value = suggestion;
    dom.styleChips.forEach(c => c.classList.remove('active'));
    updateButtons();
  } catch (e) {
    console.error('スタイル提案エラー:', e);
  } finally {
    dom.styleAiBtn.disabled = false;
    dom.styleAiBtn.textContent = '✨ AI提案';
  }
});

// ============================
// ドラッグ＆ドロップ
// ============================
['dragenter', 'dragover'].forEach(evt => {
  dom.dropArea.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); dom.dropArea.classList.add('drag-over'); });
});
['dragleave', 'drop'].forEach(evt => {
  dom.dropArea.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); dom.dropArea.classList.remove('drag-over'); });
});
dom.dropArea.addEventListener('drop', (e) => {
  if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
});
dom.dropArea.addEventListener('click', () => dom.fileInput.click());
dom.fileInput.addEventListener('change', () => {
  if (dom.fileInput.files.length > 0) handleFile(dom.fileInput.files[0]);
});

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    showError('無効なファイル', '画像ファイル（PNG, JPG, WebP）を選択してください。');
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    showError('ファイルサイズ超過', '20MB以下の画像を使用してください。');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      // 2:1比率 + 十分な解像度 → 360°画像と判断して直接ビューワーで開く
      if (ratio >= 1.9 && ratio <= 2.1 && img.width >= 1024) {
        openDirectViewer(dataUrl);
      } else {
        setInputImage(dataUrl, file, '入力画像');
      }
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

function setInputImage(dataUrl, file, label) {
  state.inputImageMime = file ? file.type : 'image/png';
  state.inputImageBase64 = dataUrl.split(',')[1];
  state.generatedDataUrl = dataUrl; // ダウンロード用に保持
  dom.previewImage.src = dataUrl;
  dom.previewLabel.textContent = label || '📁 入力画像';
  dom.previewSection.classList.remove('hidden');
  updateButtons();
}

// プレビュークリア（生成画像 + 360°パノラマ両方をクリア）
dom.clearPreview.addEventListener('click', () => {
  state.inputImageBase64 = null;
  state.inputImageMime = null;
  state.generatedDataUrl = null;
  state.panoBase64 = null;
  state.panoMime = null;
  state.panoDataUrl = null;
  dom.previewImage.src = '';
  dom.previewSection.classList.add('hidden');
  dom.panoPreviewImage.src = '';
  dom.panoPreviewSection.classList.add('hidden');
  dom.fileInput.value = '';
  if (engine.activeEngine === 'openai') {
    dom.openaiVisionNote.classList.remove('hidden');
  }
  updateButtons();
});

// タイムスタンプ生成（YYYYMMDDHHmmss 14桁）
function getTimestamp() {
  const now = new Date();
  const pad = (n, d = 2) => String(n).padStart(d, '0');
  return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

// 生成画像ダウンロード（PNG）
dom.dlGenerated.addEventListener('click', () => {
  if (!state.generatedDataUrl) return;
  const filename = `AI_Panorama_normal_generated_image_${getTimestamp()}.png`;
  downloadDataUrl(state.generatedDataUrl, filename);
});

// 360°パノラマダウンロード（XMPメタデータ付きJPEG）
dom.dlPanorama.addEventListener('click', () => {
  if (!state.panoDataUrl) return;
  download360AsJpegWithXMP(state.panoDataUrl);
});

// パノラマプレビューからビューワーを開く
dom.openViewerBtn.addEventListener('click', () => {
  if (!state.panoDataUrl) return;
  openPanoInViewer(state.panoDataUrl, false);
});

// 通常ダウンロードユーティリティ
function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// 360°画像: GPano XMPメタデータ付きJPEGとしてダウンロード
function download360AsJpegWithXMP(dataUrl) {
  const img = new Image();
  img.onload = () => {
    const w = img.width;
    const h = img.height;

    // Canvas経由でJPEG化
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onload = () => {
        const jpegData = new Uint8Array(reader.result);
        const xmpPacket = buildGPanoXMP(w, h);
        const output = injectXMPIntoJPEG(jpegData, xmpPacket);

        const outputBlob = new Blob([output], { type: 'image/jpeg' });
        const url = URL.createObjectURL(outputBlob);
        const link = document.createElement('a');
        link.download = `AI_Panorama_360_generated_image_${getTimestamp()}.jpg`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };
      reader.readAsArrayBuffer(blob);
    }, 'image/jpeg', 0.95);
  };
  img.src = dataUrl;
}

// GPano XMPメタデータパケットを構築
function buildGPanoXMP(width, height) {
  return [
    '<?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>',
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">',
    '  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
    '    <rdf:Description rdf:about=""',
    '      xmlns:GPano="http://ns.google.com/photos/1.0/panorama/"',
    `      GPano:ProjectionType="equirectangular"`,
    `      GPano:UsePanoramaViewer="True"`,
    `      GPano:FullPanoWidthPixels="${width}"`,
    `      GPano:FullPanoHeightPixels="${height}"`,
    `      GPano:CroppedAreaImageWidthPixels="${width}"`,
    `      GPano:CroppedAreaImageHeightPixels="${height}"`,
    `      GPano:CroppedAreaLeftPixels="0"`,
    `      GPano:CroppedAreaTopPixels="0" />`,
    '  </rdf:RDF>',
    '</x:xmpmeta>',
    '<?xpacket end="w"?>',
  ].join('\n');
}

// JPEG バイナリの APP1 セグメントに XMP データを注入
function injectXMPIntoJPEG(jpegData, xmpString) {
  const nsStr = 'http://ns.adobe.com/xap/1.0/';
  const nsEncoded = new TextEncoder().encode(nsStr);
  const nsBytes = new Uint8Array(nsEncoded.length + 1); // +1 for null terminator
  nsBytes.set(nsEncoded);

  const xmpBytes = new TextEncoder().encode(xmpString);
  const segmentDataLen = 2 + nsBytes.length + xmpBytes.length;

  const app1 = new Uint8Array(2 + 2 + nsBytes.length + xmpBytes.length);
  app1[0] = 0xFF;
  app1[1] = 0xE1;
  app1[2] = (segmentDataLen >> 8) & 0xFF;
  app1[3] = segmentDataLen & 0xFF;
  app1.set(nsBytes, 4);
  app1.set(xmpBytes, 4 + nsBytes.length);

  // SOI (先頭2バイト: FF D8) の直後に APP1 を挿入
  const output = new Uint8Array(jpegData.length + app1.length);
  output.set(jpegData.subarray(0, 2));
  output.set(app1, 2);
  output.set(jpegData.subarray(2), 2 + app1.length);

  return output;
}

// テキスト/スタイル入力変更時
// scenePrompt inputは上のシーンチップ連動ハンドラで既に処理済み

// ============================
// 360°画像: 直接ビューワーで開く（ダイアログ不要）
// ============================
// 旧ダイアログは廃止。2:1画像は自動的にビューワーモードで開く。

// レガシーイベント（HTMLに要素が残っている場合のセーフガード）
dom.panoOpenViewer?.addEventListener('click', () => {
  dom.panoDetectOverlay?.classList.add('hidden');
  if (state.pendingPanoDataUrl) openDirectViewer(state.pendingPanoDataUrl);
});

dom.panoUseSource?.addEventListener('click', () => {
  dom.panoDetectOverlay.classList.add('hidden');
  setInputImage(state.pendingPanoDataUrl, state.pendingPanoFile, '入力画像（360°）');
});

function openDirectViewer(dataUrl) {
  if (!viewer) {
    viewer = new PanoramaViewer('viewer-container');
    viewer.init();
    viewer.onRotationChange = updateCompass;
    viewer.onZoomChange = updateZoomInfo;
    viewer.onResolutionLoad = updateResInfo;
  }
  viewer.loadPanorama(dataUrl);
  // 既存360°画像は保存ボタンを非表示（元画像は手元にあるため再保存不要）
  state.isDirectView = true;
  dom.btnSaveOriginal.classList.add('hidden');
  dom.inputCard.classList.add('hidden');
  dom.viewerSection.classList.remove('hidden');
  setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
}

// パノラマプレビューからビューワーを開く汎用関数
function openPanoInViewer(dataUrl, isDirect) {
  if (!viewer) {
    viewer = new PanoramaViewer('viewer-container');
    viewer.init();
    viewer.onRotationChange = updateCompass;
    viewer.onZoomChange = updateZoomInfo;
    viewer.onResolutionLoad = updateResInfo;
  }
  viewer.loadPanorama(dataUrl);
  state.isDirectView = isDirect;
  dom.btnSaveOriginal.classList.toggle('hidden', isDirect);
  dom.inputCard.classList.add('hidden');
  dom.viewerSection.classList.remove('hidden');
  setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
}

// ============================
// ボタン状態更新
// ============================
function updateButtons() {
  const hasApi = engine.isReady();
  // テキスト生成タブ：画像生成ボタン
  const hasPrompt = dom.scenePrompt.value.trim().length > 0;
  const hasStyle = dom.styleInput.value.trim().length > 0;
  dom.generateImageBtn.disabled = !(hasApi && hasPrompt && hasStyle);
  dom.styleAiBtn.disabled = !(hasApi && hasPrompt);
  dom.sceneAiBtn.disabled = !hasApi;

  // 360°拡張ボタン
  const hasInput = state.inputImageBase64 !== null;
  dom.generateBtn.disabled = !(hasApi && hasInput);
}

// ============================
// Step 1: テキスト→画像生成
// ============================
dom.generateImageBtn.addEventListener('click', () => executeImageGeneration());

async function executeImageGeneration() {
  const prompt = dom.scenePrompt.value.trim();
  const style = dom.styleInput.value.trim();
  if (!prompt || !style) return;

  const isOpenAI = engine.activeEngine === 'openai';
  const subText = isOpenAI ? '画像を生成しています...\n（※OpenAIモードでは最大10分かかることがあります）' : 'AIがシーンを描画しています...';

  state.lastAction = () => executeImageGeneration();
  // 画像生成は1ステップのみ
  showProcessing('画像生成中...', subText, [
    { id: 'gen', label: '🎨 画像生成' }
  ], isOpenAI);
  setStepState('gen', 'active');

  try {
    const onProgress = (step, detail) => {
      if (step === 'generate') {
        dom.processingSub.textContent = subText;
      } else if (step === 'fallback') {
        dom.processingSub.textContent = `モデル切替中: ${detail || '再試行'}...`;
      }
    };

    const result = await engine.generateImage(prompt, style, onProgress);
    setStepState('gen', 'done');
    await sleep(300);
    hideProcessing();

    // 生成画像をStep 1プレビューにセット（Step 2とは分離）
    const dataUrl = `data:${result.mimeType};base64,${result.base64}`;
    state.inputImageMime = result.mimeType;
    state.inputImageBase64 = result.base64;
    state.generatedDataUrl = dataUrl;
    dom.previewImage.src = dataUrl;
    dom.previewLabel.textContent = '🎨 生成された画像';
    dom.previewSection.classList.remove('hidden');
    updateButtons();

  } catch (error) {
    console.error('画像生成エラー:', error);
    hideProcessing();
    if (error.isContentPolicy || (error.message && error.message.includes('content_policy'))) {
      showError(
        '⛔ コンテンツポリシー制限',
        'AIの安全フィルタにより画像生成がブロックされました。\n※誤検知の場合もあります。そのままリトライすると成功することがあります。'
      );
    } else {
      const msg = error.message ? error.message : 'サーバーが混雑しているか、一時的な問題が発生しています。\n少し時間をおいてリトライしてください。';
      showError('画像生成に失敗しました', msg);
    }
  }
}

// ============================
// Step 2: 画像→360°パノラマ拡張
// ============================
dom.generateBtn.addEventListener('click', () => executePanoramaExpansion());

async function executePanoramaExpansion() {
  if (!state.inputImageBase64) return;
  state.lastAction = () => executePanoramaExpansion();
  const isOpenAI = engine.activeEngine === 'openai';
  const subText = isOpenAI ? '入力画像を分析しています...\n（※OpenAIモードでは最大10分かかることがあります）' : '入力画像を分析しています...';

  // パノラマは5ステップ（4段階パイプライン + ビューワー準備）
  showProcessing('パノラマ拡張中...', subText, [
    { id: 'analyze', label: '🔍 画像分析' },
    { id: 'generate', label: '🌐 360°拡張生成' },
    { id: 'seamfix', label: '🔧 シーム修復（Split-Swap-Inpaint）' },
    { id: 'render', label: '💻 ビューワー準備' },
  ], isOpenAI);

  try {
    const onProgress = (step, detail) => {
      if (step === 'analyze') {
        setStepState('analyze', 'active');
      } else if (step === 'generate') {
        setStepState('analyze', 'done');
        setStepState('generate', 'active');
        dom.processingSub.innerHTML = isOpenAI 
          ? 'AIが360°背景を生成しています...<br>（※OpenAIモードでは最大10分かかることがあります）'
          : 'AIが360°背景を生成しています...';
      } else if (step === 'splitswap') {
        setStepState('generate', 'done');
        setStepState('seamfix', 'active');
        dom.processingSub.textContent = 'シームを検出・移動中（Split-Swap）...';
      } else if (step === 'inpaint') {
        dom.processingSub.innerHTML = isOpenAI
          ? 'AIがシームを修復しています...<br>（※OpenAIモードでは最大10分かかることがあります）'
          : 'AIがシームを修復しています（Inpaint）...';
      } else if (step === 'restore') {
        dom.processingSub.textContent = '画像を復元中...';
      } else if (step === 'fallback') {
        dom.processingSub.textContent = `モデル切替中: ${detail || '再試行'}...`;
      }
    };

    const result = await engine.expandToPanorama(
      state.inputImageBase64, state.inputImageMime, onProgress
    );

    setStepState('seamfix', 'done');
    setStepState('render', 'active');
    dom.processingSub.textContent = '360°ビューワーを構築中...';

    const dataUrl = `data:${result.mimeType};base64,${result.base64}`;

    // 360°パノラマデータを状態に保存（生成画像とは分離）
    state.panoBase64 = result.base64;
    state.panoMime = result.mimeType;
    state.panoDataUrl = dataUrl;

    // Step 2 プレビューにパノラマ画像をセット
    dom.panoPreviewImage.src = dataUrl;
    dom.panoPreviewSection.classList.remove('hidden');

    // ビューワーも準備
    if (!viewer) {
      viewer = new PanoramaViewer('viewer-container');
      viewer.init();
      viewer.onRotationChange = updateCompass;
      viewer.onZoomChange = updateZoomInfo;
      viewer.onResolutionLoad = updateResInfo;
    }
    viewer.loadPanorama(dataUrl);

    await sleep(500);
    setStepState('render', 'done');
    await sleep(300);
    hideProcessing();
    // ビューワーには自動遷移せず、メニュー画面に留まる（ユーザーがビューワーボタンで開く）

  } catch (error) {
    console.error('パノラマ拡張エラー:', error);
    hideProcessing();
    if (error.isContentPolicy || (error.message && error.message.includes('content_policy'))) {
      showError(
        '⛔ コンテンツポリシー制限',
        'AIの安全フィルタによりパノラマ生成がブロックされました。\n※誤検知の場合もあります。そのままリトライすると成功することがあります。'
      );
    } else {
      const msg = error.message ? error.message : 'サーバーが混雑しているか、一時的な問題が発生しています。\n少し時間をおいてリトライしてください。';
      showError('パノラマ生成に失敗しました', msg);
    }
  }
}

// ============================
// ビューワーコントロール
// ============================
dom.btnBack.addEventListener('click', hideViewer);
dom.btnAutoRotate.addEventListener('click', () => {
  if (!viewer) return;
  const isOn = viewer.toggleAutoRotate();
  dom.btnAutoRotate.classList.toggle('active', isOn);
});
dom.btnFullscreen.addEventListener('click', () => viewer?.toggleFullscreen());
dom.btnCapture.addEventListener('click', () => viewer?.captureView(1920, 1080));
dom.btnSaveOriginal.addEventListener('click', () => viewer?.downloadOriginal());

function updateCompass(degrees) {
  if (dom.compass) dom.compass.style.transform = `rotate(${-degrees}deg)`;
}
function updateZoomInfo(percent) {
  if (dom.zoomInfo) dom.zoomInfo.textContent = `${percent}%`;
}
function updateResInfo(w, h) {
  if (dom.resolutionInfo) dom.resolutionInfo.textContent = `${w}×${h}`;
}

// ============================
// ビューワー表示/非表示
// ============================
function showViewer() {
  // AI生成経由 → 保存ボタンを表示
  state.isDirectView = false;
  dom.btnSaveOriginal.classList.remove('hidden');
  dom.inputCard.classList.add('hidden');
  dom.viewerSection.classList.remove('hidden');
  setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
}

function hideViewer() {
  dom.viewerSection.classList.add('hidden');
  dom.inputCard.classList.remove('hidden');
  if (viewer) {
    viewer.destroy();
    viewer = null;
  }
}

// ============================
// 処理中 / エラー表示
// ============================
// 処理中オーバーレイ: ステップを動的に生成
let currentSteps = {};
let processingTimerInterval = null;
let processingStartTime = 0;

function showProcessing(title, sub, steps, showTimer = false) {
  // ステップDOMを動的に構築
  dom.progressSteps.innerHTML = '';
  currentSteps = {};
  if (steps && steps.length > 0) {
    steps.forEach(s => {
      const div = document.createElement('div');
      div.className = 'step';
      div.id = `step-${s.id}`;
      div.innerHTML = `<span class="step-icon">⏳</span>${s.label}`;
      dom.progressSteps.appendChild(div);
      currentSteps[s.id] = div;
    });
  }
  dom.processingTitle.textContent = title || '処理中...';
  // 改行をサポート
  dom.processingSub.innerHTML = (sub || '').replace(/\n/g, '<br>');
  dom.processingOverlay.classList.remove('hidden');

  if (showTimer) {
    dom.processingTimer.classList.remove('hidden');
    dom.processingTimer.textContent = '00:00';
    processingStartTime = Date.now();
    processingTimerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - processingStartTime) / 1000);
      if (elapsed >= OPENAI_IMAGE_TIMEOUT_SECONDS) {
        clearInterval(processingTimerInterval);
        processingTimerInterval = null;
        hideProcessing();
        showError('⏳ タイムアウトエラー', '生成処理が制限時間の10分を超過しました。しばらく時間をおいてから再度お試しください。');
        return;
      }
      const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      dom.processingTimer.textContent = `${m}:${s}`;
    }, 1000);
  } else {
    dom.processingTimer.classList.add('hidden');
  }
}

function hideProcessing() { 
  dom.processingOverlay.classList.add('hidden'); 
  if (processingTimerInterval) {
    clearInterval(processingTimerInterval);
    processingTimerInterval = null;
  }
}

function setStepState(stepId, s) {
  const el = currentSteps[stepId];
  if (!el) return;
  el.classList.remove('active', 'done');
  if (s === 'active') { el.classList.add('active'); el.querySelector('.step-icon').textContent = '⏳'; }
  else if (s === 'done') { el.classList.add('done'); el.querySelector('.step-icon').textContent = '✅'; }
}

function showError(title, message) {
  dom.errorTitle.textContent = title;
  // 改行と箇条書きをHTMLに変換（安全にエスケープ後）
  const escaped = (message || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const html = escaped
    .replace(/\n/g, '<br>')
    .replace(/• /g, '<span style="margin-left:8px">• </span>');
  dom.errorMessage.innerHTML = html;
  dom.errorOverlay.classList.remove('hidden');
}
dom.errorRetry.addEventListener('click', () => {
  dom.errorOverlay.classList.add('hidden');
  if (state.lastAction) state.lastAction();
});
dom.errorDismiss.addEventListener('click', () => { dom.errorOverlay.classList.add('hidden'); });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  console.log('🌐 360° AI Panorama Generator initialized');
