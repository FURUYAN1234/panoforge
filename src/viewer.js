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
   * 現在のパノラマ画像をGPano XMPメタデータ付きJPEGでダウンロード
   * Google Photos / Facebook 等で自動的に360°ビューワーが起動する形式
   */
  downloadOriginal() {
    if (!this.currentImageDataUrl) return;

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
          const xmpPacket = this._buildGPanoXMP(w, h);
          const output = this._injectXMPIntoJPEG(jpegData, xmpPacket);

          const outputBlob = new Blob([output], { type: 'image/jpeg' });
          const url = URL.createObjectURL(outputBlob);
          const link = document.createElement('a');
          link.download = `panoforge_360_${w}x${h}_${Date.now()}.jpg`;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        };
        reader.readAsArrayBuffer(blob);
      }, 'image/jpeg', 0.95);
    };
    img.src = this.currentImageDataUrl;
  }

  /**
   * GPano XMPメタデータパケットを構築
   * @param {number} width - 画像の幅
   * @param {number} height - 画像の高さ
   * @returns {string} XMPパケット文字列
   */
  _buildGPanoXMP(width, height) {
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

  /**
   * JPEG バイナリの APP1 セグメントに XMP データを注入
   * SOI (FF D8) 直後に APP1 マーカー (FF E1) + XMP名前空間 + パケットを挿入
   * @param {Uint8Array} jpegData - 元のJPEGバイナリ
   * @param {string} xmpString - XMPパケット文字列
   * @returns {Uint8Array} XMP埋め込み済みJPEGバイナリ
   */
  _injectXMPIntoJPEG(jpegData, xmpString) {
    // XMP APP1 の名前空間識別子（null終端）
    const nsStr = 'http://ns.adobe.com/xap/1.0/';
    const nsEncoded = new TextEncoder().encode(nsStr);
    const nsBytes = new Uint8Array(nsEncoded.length + 1); // +1 for null terminator
    nsBytes.set(nsEncoded);
    // nsBytes の最後のバイトは既に 0x00（null終端）

    const xmpBytes = new TextEncoder().encode(xmpString);

    // APP1セグメント長 = 2(長さフィールド自身) + 名前空間 + XMPデータ
    const segmentDataLen = 2 + nsBytes.length + xmpBytes.length;

    // APP1セグメント全体: FF E1 [2byte長さ] [名前空間] [XMPデータ]
    const app1 = new Uint8Array(2 + 2 + nsBytes.length + xmpBytes.length);
    app1[0] = 0xFF;
    app1[1] = 0xE1;
    app1[2] = (segmentDataLen >> 8) & 0xFF;
    app1[3] = segmentDataLen & 0xFF;
    app1.set(nsBytes, 4);
    app1.set(xmpBytes, 4 + nsBytes.length);

    // SOI (先頭2バイト: FF D8) の直後に APP1 を挿入
    const output = new Uint8Array(jpegData.length + app1.length);
    output.set(jpegData.subarray(0, 2));           // SOI
    output.set(app1, 2);                            // APP1 (XMP)
    output.set(jpegData.subarray(2), 2 + app1.length); // 残りのJPEGデータ

    return output;
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
