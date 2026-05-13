// ============================================
// 360° AI Panorama Generator - メインエントリーポイント
// API起動時モーダル + 2段階生成 + インラインビューワー
// ============================================

import './style.css';
import { PanoramaEngine } from './panorama.js';
import { PanoramaViewer } from './viewer.js';

const engine = new PanoramaEngine();
let viewer = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  apiSettingsBtn: $('#api-settings-btn'),
  apiKeyStatus: $('#api-key-status'),
  apiModalOverlay: $('#api-modal-overlay'),
  apiModalClose: $('#api-modal-close'),
  apiKeyInput: $('#api-key-input'),
  apiKeyToggle: $('#api-key-toggle'),
  iconEyeOff: $('#icon-eye-off'),
  iconEyeOn: $('#icon-eye-on'),
  apiKeyFeedback: $('#api-key-feedback'),
  apiModalApply: $('#api-modal-apply'),

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
  previewSection: $('#preview-section'),
  previewImage: $('#preview-image'),
  previewLabel: $('#preview-label'),
  clearPreview: $('#clear-preview'),
  generateBtn: $('#generate-btn'),
  processingOverlay: $('#processing-overlay'),
  processingTitle: $('#processing-title'),
  processingSub: $('#processing-sub'),
  stepAnalyze: $('#step-analyze'),
  stepGenerate: $('#step-generate'),
  stepRender: $('#step-render'),
  errorOverlay: $('#error-overlay'),
  errorTitle: $('#error-title'),
  errorMessage: $('#error-message'),
  errorRetry: $('#error-retry'),
  errorDismiss: $('#error-dismiss'),
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
  lastAction: null,
  appLocked: false,
  pendingPanoDataUrl: null,
  pendingPanoFile: null,
};

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
  dom.apiModalApply.disabled = dom.apiKeyInput.value.trim().length === 0;
  dom.apiKeyFeedback.textContent = '';
  dom.apiKeyFeedback.className = 'api-feedback';
});

dom.apiKeyToggle.addEventListener('click', () => {
  const isPassword = dom.apiKeyInput.type === 'password';
  dom.apiKeyInput.type = isPassword ? 'text' : 'password';
  dom.iconEyeOff.classList.toggle('hidden', isPassword);
  dom.iconEyeOn.classList.toggle('hidden', !isPassword);
});

dom.apiModalApply.addEventListener('click', () => {
  const key = dom.apiKeyInput.value.trim();
  if (!key) return;
  const ok = engine.setApiKey(key);
  if (ok) {
    dom.apiKeyStatus.classList.add('connected');
    dom.apiSettingsBtn.classList.add('connected');
    dom.apiKeyFeedback.textContent = '✓ APIキーが設定されました';
    dom.apiKeyFeedback.className = 'api-feedback success';
    setAppLocked(false);
    setTimeout(() => {
      dom.apiModalOverlay.classList.add('hidden');
      dom.apiKeyInput.value = '';
      dom.apiKeyInput.type = 'password';
      dom.iconEyeOff.classList.remove('hidden');
      dom.iconEyeOn.classList.add('hidden');
    }, 800);
  } else {
    dom.apiKeyStatus.classList.remove('connected');
    dom.apiSettingsBtn.classList.remove('connected');
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
  dom.previewImage.src = dataUrl;
  dom.previewLabel.textContent = label || '入力画像';
  dom.previewSection.classList.remove('hidden');
  updateButtons();
}

// プレビュークリア
dom.clearPreview.addEventListener('click', () => {
  state.inputImageBase64 = null;
  state.inputImageMime = null;
  dom.previewImage.src = '';
  dom.previewSection.classList.add('hidden');
  dom.fileInput.value = '';
  updateButtons();
});

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

  state.lastAction = () => executeImageGeneration();
  showProcessing('画像生成中...', 'AIがシーンを描画しています...');
  setStepState('analyze', 'active');

  try {
    const onProgress = (step, detail) => {
      if (step === 'generate') {
        setStepState('analyze', 'done');
        setStepState('generate', 'active');
        dom.processingSub.textContent = '画像を生成しています...';
      } else if (step === 'fallback') {
        dom.processingSub.textContent = `モデル切替中: ${detail || '再試行'}...`;
      }
    };

    const result = await engine.generateImage(prompt, style, onProgress);
    setStepState('generate', 'done');
    await sleep(300);
    hideProcessing();

    // 生成画像をプレビューにセット
    const dataUrl = `data:${result.mimeType};base64,${result.base64}`;
    state.inputImageMime = result.mimeType;
    state.inputImageBase64 = result.base64;
    dom.previewImage.src = dataUrl;
    dom.previewLabel.textContent = '生成された画像（→360°に拡張可能）';
    dom.previewSection.classList.remove('hidden');
    updateButtons();

  } catch (error) {
    console.error('画像生成エラー:', error);
    hideProcessing();
    if (error.isContentPolicy) {
      showError(
        '⛔ コンテンツポリシーエラー',
        'AIの安全フィルタにより画像生成がブロックされました。\n\n以下をお試しください：\n• シーンの説明をより具体的・穏やかな表現に変更する\n• スタイルを変えてみる（例：絵本風、水彩画風）\n• 暴力的・性的な表現を含まないようにする'
      );
    } else {
      showError('画像生成エラー', error.message || '不明なエラーが発生しました。');
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
  showProcessing('パノラマ拡張中...', '入力画像を分析しています...');

  try {
    const onProgress = (step, detail) => {
      if (step === 'analyze') {
        setStepState('analyze', 'active');
      } else if (step === 'generate') {
        setStepState('analyze', 'done');
        setStepState('generate', 'active');
        dom.processingSub.textContent = 'AIが360°背景を生成しています...';
      } else if (step === 'fallback') {
        dom.processingSub.textContent = `モデル切替中: ${detail || '再試行'}...`;
      }
    };

    const result = await engine.expandToPanorama(
      state.inputImageBase64, state.inputImageMime, onProgress
    );

    setStepState('generate', 'done');
    setStepState('render', 'active');
    dom.processingSub.textContent = '360°ビューワーを構築中...';

    const dataUrl = `data:${result.mimeType};base64,${result.base64}`;

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
    showViewer();

  } catch (error) {
    console.error('パノラマ拡張エラー:', error);
    hideProcessing();
    if (error.isContentPolicy) {
      showError(
        '⛔ コンテンツポリシーエラー',
        'AIの安全フィルタによりパノラマ生成がブロックされました。\n\n入力画像の内容がポリシーに抵触している可能性があります。\n別の画像を使用するか、テキスト生成で異なるシーンをお試しください。'
      );
    } else {
      showError('生成エラー', error.message || '不明なエラーが発生しました。');
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
  dom.inputCard.classList.add('hidden');
  dom.viewerSection.classList.remove('hidden');
  setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
}

function hideViewer() {
  dom.viewerSection.classList.add('hidden');
  dom.inputCard.classList.remove('hidden');
}

// ============================
// 処理中 / エラー表示
// ============================
function showProcessing(title, sub) {
  resetSteps();
  dom.processingTitle.textContent = title || '処理中...';
  dom.processingSub.textContent = sub || '';
  dom.processingOverlay.classList.remove('hidden');
}
function hideProcessing() { dom.processingOverlay.classList.add('hidden'); }

function setStepState(stepName, s) {
  const map = { analyze: dom.stepAnalyze, generate: dom.stepGenerate, render: dom.stepRender };
  const el = map[stepName]; if (!el) return;
  el.classList.remove('active', 'done');
  if (s === 'active') { el.classList.add('active'); el.querySelector('.step-icon').textContent = '⏳'; }
  else if (s === 'done') { el.classList.add('done'); el.querySelector('.step-icon').textContent = '✅'; }
}
function resetSteps() {
  [dom.stepAnalyze, dom.stepGenerate, dom.stepRender].forEach(el => {
    el.classList.remove('active', 'done');
    el.querySelector('.step-icon').textContent = '⏳';
  });
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
