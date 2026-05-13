# PanoForge (360° Background Generator)

**v1.0.0-alpha** — Gemini API を使用したAI駆動の360度パノラマ背景生成・拡張ツール

> **[[Nano Banana 2 and ChatGPT Images 2.0 Powered Super AI 4-koma System](https://github.com/FURUYAN1234/nano-banana-pro/blob/main/README.md)](https://github.com/FURUYAN1234/nano-banana-pro) 連携対応**
> 生成された360度空間画像は、漫画の背景や動画素材として圧倒的な没入感を提供します。

---

## 🚀 Overview / 概要

PanoForgeは、テキストや1枚の画像から「360度エクイレクタングラー（正距円筒図法）パノラマ画像」を生成し、内蔵の3Dビューワーでインタラクティブに確認・キャプチャできる実験的ツールです。

Nano Banana 2 and ChatGPT Images 2.0 Powered Super AI 4-koma System などの漫画・動画制作ツールにおいて、背景素材としてシームレスな360度空間を提供し、没入感のある表現をサポートします。

---

## 🌍 Demo Site / デモサイト

> **Demo Link / デモサイト:** [https://furuyan1234.github.io/panoforge/](https://furuyan1234.github.io/panoforge/)

---

## ✨ Features / 機能

### 🖼️ 2-Stage Generation (2段階生成)
- **テキストから画像生成**: 任意のシーン説明とスタイルから、高品質な2:1比率のベース画像を生成。
- **画像から360°パノラマへ拡張**: 生成した画像、またはユーザーがドロップした手持ちの画像を、AIアウトペインティングによってシームレスな360度パノラマに拡張。

### 🎨 AI Style Suggestion (スタイルAI提案)
- 「夕暮れのサイバーパンク都市」などのシーン説明から、AIが自動的に最適な「画風（スタイル）」を提案。

### 🌐 Interactive 360° Viewer (インタラクティブ・ビューワー)
- **Three.js** を搭載した軽量で高速な内蔵ビューワー。
- ドラッグによる全方位の視点移動、マウスホイールによる視野角（FOV）ズーム。
- **自動回転モード**、**全画面モード**をサポート。

### 📸 HD Capture & Export (高解像度キャプチャ)
- 任意の視点をフルHD (1920x1080) 解像度でキャプチャし、一瞬でPNG保存。
- 360度元画像（エクイレクタングラー形式）の直接ダウンロード。

---

## 🏗️ Unique Architecture Highlights / 固有アーキテクチャの要点

本システムは単なる画像生成ツールではありません。空間の歪みを補正し、シームレスな360度環境をリアルタイムで構築・提供するための**空間レンダリングエンジン**です。

* **2-Stage Image Expansion Pipeline (2段階拡張パイプライン)**:
  テキストから直接パノラマを生成するのではなく、まず高解像度のシード画像を生成し、そのシード画像を中心としてAIのアウトペインティング（外側拡張）機能を用いて左右の端がシームレスに繋がる正距円筒図法に拡張します。これにより、破綻の少ないパノラマを生成します。
* **Strict Autocomplete Contamination Prevention (自動入力汚染の完全排除)**:
  ブラウザの自動補完によって予期せぬ文字列がプロンプトに混入する問題（UI汚染）を防ぐため、`readonly`属性の動的解除、ランダムな`name`属性、および遅延評価によるDOM強制クリアの多段防御壁を実装しています。
* **Robust Content Policy Handling (コンテンツポリシーのスマート検知)**:
  AIモデル特有の「データ欠落を伴う200 OKレスポンス（安全フィルタブロック）」をキャッチし、単なるAPIエラーではなく「ポリシーエラー」としてユーザーに具体的な修正ガイダンスを提供します。

---

## 🧠 Zenith Protocol（AIモデル自動切替 / Auto AI Model Fallback）

Nano Banana 2 and ChatGPT Images 2.0 Powered Super AI 4-koma System の思想を踏襲し、APIエラー時や制限到達時、あるいは安全フィルタでのブロック時に自動的に最適な別モデルへフォールバックする仕組み（Zenith Protocol）を搭載しています。

**画像生成 / Image Generation Fallback Pipeline**:
1. `gemini-2.0-flash-preview-image-generation` (Primary: 安定)
2. `gemini-3.1-flash-image-preview` (Backup 1: 次世代モデル)
3. `gemini-2.0-flash-exp` (Fallback 1: 試験モデル)

**テキスト生成・スタイル提案 / Text Generation Fallback Pipeline**:
1. `gemini-2.5-flash` (Primary: 高速・高精度)
2. `gemini-2.0-flash` (Backup 1: 安定)
3. `gemini-1.5-flash` (Fallback 1: 保険)

---

## 📝 Setup & Launch / セットアップと起動

### 💻 Local Launch (Windows) / ローカルでの起動

1. **Download**: リポジトリからソースコードをダウンロード（ZIP解凍）またはクローンします。
2. **Run**: フォルダ内の `start_panoforge.bat` をダブルクリックします。
   *(事前にNode.jsのインストールが必要です)*
3. **Start**: 必要なライブラリが自動インストールされ、ブラウザが立ち上がります。

### 🔑 APIキーについて
- Google AI Studioで取得した **Gemini APIキー** が必要です。
- 起動直後に表示される設定画面で入力します。
- APIキーは**セッション限定**（メモリ内のみ保持）であり、ブラウザのローカルストレージには保存されません。

---

## 💻 Tech Stack / 技術スタック

- **Frontend**: Vanilla JS / HTML / CSS (Dark Theme)
- **Bundler**: Vite
- **3D Graphics**: Three.js
- **AI**: Google GenAI SDK (Gemini API)

---

## AI Manga Creative Suite / AIまんが制作エコシステム

This project is part of an integrated ecosystem designed to support AI-powered manga and story creation.
本プロジェクトは、AIを活用した漫画・ストーリー制作を支援する統合エコシステムの一部です。

### Ecosystem Components / 構成システム

#### 1. Nano Banana 2 and ChatGPT Images 2.0 Powered Super AI 4-koma System
AIを活用した4コマ漫画制作に特化したシステムです。
- [Demo / デモ](https://furuyan1234.github.io/nano-banana-pro/)
- [Code / コード](https://github.com/FURUYAN1234/nano-banana-pro)

#### 2. AI Story Maker
AIを用いてクリエイティブなストーリーやプロットを生成するツールです。
- [Demo / デモ](https://furuyan1234.github.io/story-maker/)
- [Code / コード](https://github.com/FURUYAN1234/story-maker)

#### 3. AI Character Sheet Maker
詳細なキャラクターシートや設定をデザインするための支援ツールです。
- [Demo / デモ](https://furuyan1234.github.io/character-sheet-maker/)
- [Code / コード](https://github.com/FURUYAN1234/character-sheet-maker)

#### 4. AI Comic Translation Tool
AIを使って漫画を10言語に翻訳するツールです。
- [Demo / デモ](https://furuyan1234.github.io/comic-translation/)
- [Code / コード](https://github.com/FURUYAN1234/comic-translation)

#### 5. PanoForge (360° Background Generator)
シームレスな360度空間の背景を生成し、漫画や動画の背景素材として提供するツールです。
- [Demo / デモ](https://furuyan1234.github.io/panoforge/)
- [Code / コード](https://github.com/FURUYAN1234/panoforge)

---

## ⚖️ License / ライセンス

本プロジェクトは技術検証および情報解析目的にて開発されています。
- **Source Code**: [MIT License](https://opensource.org/licenses/MIT)

Developed by **FURU**
