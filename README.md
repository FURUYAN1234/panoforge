# PanoForge (360° Background Generator)

**v1.0.0-alpha** — Gemini API を使用したAI駆動の360度パノラマ背景生成・拡張ツール

---

## 🚀 Overview / 概要

PanoForgeは、テキストや1枚の画像から「360度エクイレクタングラー（正距円筒図法）パノラマ画像」を生成し、内蔵の3Dビューワーでインタラクティブに確認・キャプチャできる実験的ツールです。

Nano Banana Proなどの漫画・動画制作ツールにおいて、背景素材としてシームレスな360度空間を提供し、没入感のある表現をサポートします。

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

## 🏗️ Architecture / アーキテクチャ

* **Zenith Protocol (フォールバックエンジン)**
  APIエラーやコンテンツ安全フィルタによるブロックが発生した際、自動で別のAIモデルに切り替える堅牢なフォールバック機構を搭載しています。
  * **画像生成モデル**: `gemini-2.0-flash-preview-image-generation` → `gemini-3.1-flash-image-preview` → `gemini-2.0-flash-exp`
  * **スタイル提案モデル**: `gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-1.5-flash`

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

## ⚖️ License / ライセンス

本プロジェクトは技術検証および情報解析目的にて開発されています。
- **Source Code**: [MIT License](https://opensource.org/licenses/MIT)

Developed by **FURU**
