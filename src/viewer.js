// ============================================
// 360° AI Panorama Generator - Three.js 360°ビューワー
// FOVズーム + HDキャプチャ機能搭載
// ============================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * 360°パノラマビューワー
 * equirectangular画像をThree.jsで球面上に投影し、インタラクティブに表示
 */
export class PanoramaViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.sphere = null;
    this.animationId = null;
    this.autoRotate = true;

    // FOVベースズーム設定
    this.fov = 75;
    this.fovMin = 30;
    this.fovMax = 120;

    // 現在のパノラマ画像データ
    this.currentImageDataUrl = null;

    // テクスチャの元解像度
    this.textureWidth = 0;
    this.textureHeight = 0;

    // コールバック
    this.onRotationChange = null;
    this.onZoomChange = null;
    this.onResolutionLoad = null;
  }

  /**
   * シーンを初期化
   */
  init() {
    // シーン
    this.scene = new THREE.Scene();

    // カメラ（視野角75°、中心配置）
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(this.fov, aspect, 0.1, 1100);
    this.camera.position.set(0, 0, 0.1);

    // レンダラー（preserveDrawingBuffer: キャプチャ用）
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // コントロール（OrbitControlsのズームは無効化 → FOVベースに）
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = -0.3;
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.autoRotate = this.autoRotate;
    this.controls.autoRotateSpeed = 0.5;

    // ホイールイベントでFOVベースズーム
    this._wheelHandler = (e) => this._onWheel(e);
    this.container.addEventListener('wheel', this._wheelHandler, { passive: false });

    // リサイズ対応
    this._resizeHandler = () => this._onResize();
    window.addEventListener('resize', this._resizeHandler);

    // フルスクリーン変更イベント
    this._fullscreenHandler = () => {
      // フルスクリーン解除時にリサイズ
      setTimeout(() => this._onResize(), 100);
    };
    document.addEventListener('fullscreenchange', this._fullscreenHandler);

    // アニメーションループ開始
    this._animate();
  }

  /**
   * equirectangular画像をロードして表示
   * @param {string} dataUrl - 画像のdata: URL
   */
  loadPanorama(dataUrl) {
    this.currentImageDataUrl = dataUrl;

    // 既存の球体を削除
    if (this.sphere) {
      this.scene.remove(this.sphere);
      this.sphere.geometry.dispose();
      this.sphere.material.dispose();
    }

    // FOVをリセット
    this.fov = 75;
    if (this.camera) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }

    const loader = new THREE.TextureLoader();
    loader.load(dataUrl, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;

      // テクスチャの元解像度を記録
      this.textureWidth = texture.image.width;
      this.textureHeight = texture.image.height;

      // 反転した球体ジオメトリ（内側から見る）
      const geometry = new THREE.SphereGeometry(500, 60, 40);
      geometry.scale(-1, 1, 1);

      const material = new THREE.MeshBasicMaterial({ map: texture });
      this.sphere = new THREE.Mesh(geometry, material);
      this.scene.add(this.sphere);

      // 解像度情報を通知
      this.onResolutionLoad?.(this.textureWidth, this.textureHeight);
    });
  }

  /**
   * ホイールによるFOVズーム
   */
  _onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 3 : -3;
    this.fov = Math.max(this.fovMin, Math.min(this.fovMax, this.fov + delta));
    if (this.camera) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
    // ズームレベルをパーセント表記で通知
    const zoomPercent = Math.round(75 / this.fov * 100);
    this.onZoomChange?.(zoomPercent, this.fov);
  }

  /**
   * 自動回転の切り替え
   */
  toggleAutoRotate() {
    this.autoRotate = !this.autoRotate;
    if (this.controls) {
      this.controls.autoRotate = this.autoRotate;
    }
    return this.autoRotate;
  }

  /**
   * フルスクリーンの切り替え
   */
  async toggleFullscreen() {
    const section = this.container.closest('#viewer-section');
    if (!document.fullscreenElement) {
      await section.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
    // リサイズを遅延実行
    setTimeout(() => this._onResize(), 150);
  }

  /**
   * 現在のパノラマ画像をダウンロード（オリジナル360°画像）
   */
  downloadOriginal() {
    if (!this.currentImageDataUrl) return;

    const link = document.createElement('a');
    link.download = `panoforge_360_original_${Date.now()}.png`;
    link.href = this.currentImageDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * 現在のビューをHD画角でキャプチャ保存
   * @param {number} width - キャプチャ幅（デフォルト1920）
   * @param {number} height - キャプチャ高さ（デフォルト1080）
   */
  captureView(width = 1920, height = 1080) {
    if (!this.renderer || !this.scene || !this.camera) return;

    // 元のサイズを保存
    const origSize = new THREE.Vector2();
    this.renderer.getSize(origSize);
    const origAspect = this.camera.aspect;
    const origPixelRatio = this.renderer.getPixelRatio();

    // キャプチャ用にリサイズ
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // レンダリング
    this.renderer.render(this.scene, this.camera);

    // キャンバスからデータURLを取得
    const dataUrl = this.renderer.domElement.toDataURL('image/png');

    // 元に戻す
    this.renderer.setPixelRatio(origPixelRatio);
    this.renderer.setSize(origSize.x, origSize.y);
    this.camera.aspect = origAspect;
    this.camera.updateProjectionMatrix();

    // ダウンロード
    const link = document.createElement('a');
    link.download = `panoforge_capture_${width}x${height}_${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * テクスチャの解像度情報を取得
   */
  getResolution() {
    return { width: this.textureWidth, height: this.textureHeight };
  }

  /**
   * 現在のカメラ方向の角度（度）を取得
   * @returns {number} Y軸回転角度（0-360）
   */
  getRotationDegrees() {
    if (!this.controls) return 0;
    const azimuth = this.controls.getAzimuthalAngle();
    return ((azimuth * 180 / Math.PI) + 360) % 360;
  }

  /**
   * リサイズ処理
   */
  _onResize() {
    if (!this.camera || !this.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /**
   * アニメーションループ
   */
  _animate() {
    this.animationId = requestAnimationFrame(() => this._animate());
    if (this.controls) {
      this.controls.update();
      // コンパス方向の通知
      this.onRotationChange?.(this.getRotationDegrees());
    }
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * リソース解放
   */
  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this._resizeHandler);
    document.removeEventListener('fullscreenchange', this._fullscreenHandler);
    if (this.container) {
      this.container.removeEventListener('wheel', this._wheelHandler);
    }
    if (this.sphere) {
      this.sphere.geometry.dispose();
      this.sphere.material.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.container.removeChild(this.renderer.domElement);
    }
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
  }
}
