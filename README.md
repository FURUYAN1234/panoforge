# 360° AI Panorama Generator

**v1.0.2** — AI-driven 360° panoramic background generation and expansion tool using Gemini API / Gemini API を使用したAI駆動の360度パノラマ背景生成・拡張ツール

> **[[Nano Banana 2 and ChatGPT Images 2.0 Powered Super AI 4-koma System](https://github.com/FURUYAN1234/nano-banana-pro/blob/main/README.md)](https://github.com/FURUYAN1234/nano-banana-pro) Integration / 連携対応**
> The generated 360° spatial images provide overwhelming immersion as manga backgrounds and video assets. / 生成された360度空間画像は、漫画の背景や動画素材として圧倒的な没入感を提供します。

---

## 🚀 Overview / 概要

360° AI Panorama Generator is an experimental tool that generates "360-degree equirectangular panoramic images" from text or a single image, allowing interactive viewing and capturing via an integrated 3D viewer.
360° AI Panorama Generatorは、テキストや1枚の画像から「360度エクイレクタングラー（正距円筒図法）パノラマ画像」を生成し、内蔵の3Dビューワーでインタラクティブに確認・キャプチャできる実験的ツールです。

It provides seamless 360-degree environments as background assets for manga and video production tools like Nano Banana 2 and ChatGPT Images 2.0 Powered Super AI 4-koma System, supporting highly immersive expressions.
Nano Banana 2 and ChatGPT Images 2.0 Powered Super AI 4-koma System などの漫画・動画制作ツールにおいて、背景素材としてシームレスな360度空間を提供し、没入感のある表現をサポートします。

---

## 🌍 Demo Site / デモサイト

> **Demo Link / デモサイト:** [https://furuyan1234.github.io/panoforge/](https://furuyan1234.github.io/panoforge/)

---

## ✨ Features / 機能

### 🖼️ 2-Stage Generation (2段階生成)
- **Text-to-Image / テキストから画像生成**: Generates a high-quality 2:1 aspect ratio base image from any scene description and style. / 任意のシーン説明とスタイルから、高品質な2:1比率のベース画像を生成。
- **Image-to-360° Panorama / 画像から360°パノラマへ拡張**: Expands the generated image, or a user-dropped image, into a seamless 360-degree panorama using AI outpainting. / 生成した画像、またはユーザーがドロップした手持ちの画像を、AIアウトペインティングによってシームレスな360度パノラマに拡張。

### 🎨 AI Style Suggestion (スタイルAI提案)
- AI automatically suggests the optimal "art style" based on scene descriptions like "Cyberpunk city at dusk". / 「夕暮れのサイバーパンク都市」などのシーン説明から、AIが自動的に最適な「画風（スタイル）」を提案。

### 🌐 Interactive 360° Viewer (インタラクティブ・ビューワー)
- Built-in lightweight and fast viewer powered by **Three.js**. / **Three.js** を搭載した軽量で高速な内蔵ビューワー。
- Supports full omnidirectional view rotation via drag and Field of View (FOV) zoom via mouse wheel. / ドラッグによる全方位の視点移動、マウスホイールによる視野角（FOV）ズーム。
- Supports **Auto-Rotate Mode / 自動回転モード** and **Fullscreen Mode / 全画面モード**.

### 📸 HD Capture & Export (高解像度キャプチャ)
- Instantly capture any viewpoint in Full HD (1920x1080) resolution and save as PNG. / 任意の視点をフルHD (1920x1080) 解像度でキャプチャし、一瞬でPNG保存。
- Direct download of the original 360-degree image (equirectangular format). / 360度元画像（エクイレクタングラー形式）の直接ダウンロード。

---

## 🏗️ Unique Architecture Highlights / 固有アーキテクチャの要点

This system is not merely an image generation tool. It is a **spatial rendering engine** designed to correct spatial distortions and build/provide seamless 360-degree environments in real time.
本システムは単なる画像生成ツールではありません。空間の歪みを補正し、シームレスな360度環境をリアルタイムで構築・提供するための**空間レンダリングエンジン**です。

* **2-Stage Image Expansion Pipeline (2段階拡張パイプライン)**:
  Instead of directly generating a panorama from text, it first generates a high-resolution seed image, then uses AI outpainting to expand the edges so they connect seamlessly in equirectangular projection, minimizing structural collapse.
  テキストから直接パノラマを生成するのではなく、まず高解像度のシード画像を生成し、そのシード画像を中心としてAIのアウトペインティング（外側拡張）機能を用いて左右の端がシームレスに繋がる正距円筒図法に拡張します。これにより、破綻の少ないパノラマを生成します。
* **Strict Autocomplete Contamination Prevention (自動入力汚染の完全排除)**:
  Implements multi-layered defenses (dynamic `readonly` removal, randomized `name` attributes, delayed DOM clearing) to prevent unwanted strings from mixing into prompts via browser autocomplete.
  ブラウザの自動補完によって予期せぬ文字列がプロンプトに混入する問題（UI汚染）を防ぐため、`readonly`属性の動的解除、ランダムな`name`属性、および遅延評価によるDOM強制クリアの多段防御壁を実装しています。
* **Robust Content Policy Handling (コンテンツポリシーのスマート検知)**:
  Catches AI-model specific "200 OK responses with missing image data (safety filter blocks)" and provides users with specific guidance rather than generic API errors.
  AIモデル特有の「データ欠落を伴う200 OKレスポンス（安全フィルタブロック）」をキャッチし、単なるAPIエラーではなく「ポリシーエラー」としてユーザーに具体的な修正ガイダンスを提供します。

---

## 🧠 Zenith Protocol（AIモデル自動切替 / Auto AI Model Fallback）

Following the philosophy of Nano Banana 2 and ChatGPT Images 2.0 Powered Super AI 4-koma System, this system features a robust fallback mechanism (Zenith Protocol) that automatically switches to optimal alternative models upon API errors, rate limits, or safety filter blocks.
Nano Banana 2 and ChatGPT Images 2.0 Powered Super AI 4-koma System の思想を踏襲し、APIエラー時や制限到達時、あるいは安全フィルタでのブロック時に自動的に最適な別モデルへフォールバックする仕組み（Zenith Protocol）を搭載しています。

**画像生成 / Image Generation Fallback Pipeline**:
1. `gemini-2.0-flash-preview-image-generation` (Primary / 安定)
2. `gemini-3.1-flash-image-preview` (Backup 1 / 次世代モデル)
3. `gemini-2.0-flash-exp` (Fallback 1 / 試験モデル)

**テキスト生成・スタイル提案 / Text Generation Fallback Pipeline**:
1. `gemini-2.5-flash` (Primary / 高速・高精度)
2. `gemini-2.0-flash` (Backup 1 / 安定)
3. `gemini-1.5-flash` (Fallback 1 / 保険)

---

## 📝 Setup & Launch / セットアップと起動

### 💻 Local Launch (Windows) / ローカルでの起動

1. **Download / ダウンロード**: Download (ZIP) or clone the source code from the repository. / リポジトリからソースコードをダウンロード（ZIP解凍）またはクローンします。
2. **Run / 実行**: Double-click `start_panoforge.bat` in the folder. *(Requires Node.js to be installed previously)* / フォルダ内の `start_panoforge.bat` をダブルクリックします。*(事前にNode.jsのインストールが必要です)*
3. **Start / 開始**: Required libraries will be installed automatically, and the browser will launch. / 必要なライブラリが自動インストールされ、ブラウザが立ち上がります。

### 🔑 About API Keys / APIキーについて
- A **Gemini API Key** obtained from Google AI Studio is required. / Google AI Studioで取得した **Gemini APIキー** が必要です。
- Enter the key in the settings screen shown immediately after launch. / 起動直後に表示される設定画面で入力します。
- The API key is **session-limited** (kept in memory only) and is NOT saved in the browser's local storage. / APIキーは**セッション限定**（メモリ内のみ保持）であり、ブラウザのローカルストレージには保存されません。

---

## 💻 Tech Stack / 技術スタック

- **Frontend**: Vanilla JS / HTML / CSS (Dark Theme)
- **Bundler**: Vite
- **3D Graphics**: Three.js
- **AI**: Google GenAI SDK (Gemini API)

---

## ⚖️ Compliance & Legal Stance / 法的遵守について

### Japanese Copyright Law (Article 30-4)

This project is developed in full compliance with **Article 30-4 of the Japanese Copyright Act**, which allows for the exploitation of copyrighted works for information analysis and technological development of AI.
本プロジェクトは、日本の著作権法第30条の4（情報解析目的の外での利用）に基づき、技術検証および情報解析を目的として開発されており、法的に適正な範囲内で公開されています。

### Official API Usage

All generations are performed through the **official Google Gemini API**. This system adheres strictly to Google's "Generative AI Forbidden Use Policy" and Terms of Service.
本システムはGoogle公式のGemini APIを介して動作しており、Googleが定める「生成AI禁止事項」および利用規約を厳格に遵守しています。

### Original Background Generation

This system generates **original 360-degree panoramic background images** based on user-configured parameters and AI-driven generation.

* It does not aim to replicate specific existing copyrighted backgrounds or artworks.
* It generates original designs based on user prompts and mathematical constraints (equirectangular projection).
本システムは、特定の背景美術や作品の模倣を目的としたものではありません。ユーザーが設定したプロンプトとAIによる生成に基づき、独自の360度空間デザインを生成します。

### No-Profit & Research Focus

The core logic (Prompts/Protocols) is released under **CC BY-NC-SA 4.0**. Any commercial misuse by third parties is strictly prohibited. This project exists solely for the advancement of AI agent technology and the democratization of creative tools.
核心的なロジックはCC BY-NC-SA 4.0（非営利）の下で公開されています。第三者による悪質な商用利用はライセンス違反となります。本プロジェクトは、AIエージェント技術の発展と、創作ツールの民主化を目的とした研究成果です。

---

## ⚖️ License & Rights / ライセンス・権利関係

This project uses a hybrid license to balance technology sharing and intellectual property protection.
技術の共有と創作の保護を両立するため、以下のハイブリッドライセンスを採用しています。

* **Source Code**: [MIT License](https://opensource.org/licenses/MIT)
  Applies to software logic and implementation code. / ソフトウェアの動作ロジックや実装コードに適用。
* **Logic & Prompts**: [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ja)
  Applies to original design philosophy and prompt structure. / 設計思想およびプロンプト構造に適用。
* **Output Ownership / 生成物の帰属**:
  The CC SA (ShareAlike) requirement **does not apply** to 360-degree backgrounds generated by this system. Rights belong to the user.
  本システムで生成されたパノラマ背景画像に上記CCライセンスの継承義務は適用されません。権利はユーザーに帰属します。

**Commercial Use and Paid Seminars / 商用利用・有料セミナーについて**
Usage of this system (including prompts and logic) in high-priced information products, paid seminars, or any "get-rich-quick" schemes is strictly prohibited under the CC BY-NC-SA 4.0 license. 本システム（プロンプトおよびロジックを含む）を、高額な情報商材、有料セミナー、または「副業・稼げる」等の謳い文句を伴うビジネスに無断で使用することは、CC BY-NC-SA 4.0ライセンスに基づき、固く禁じます。

Any commercial or educational use involving fees requires explicit prior written consent from the developer (FURU). 有料の教育目的や商用利用を検討される場合は、必ず事前に開発者（FURU）の書面による承諾を得てください。

---

## Terms of Use / 利用規約

### 1. Purpose / 目的

This tool is intended for creative assistance and is not designed to reproduce, substitute, or replicate existing copyrighted works, brands, or specific creators.
本ツールは創作支援を目的としたものであり、既存の著作物、ブランド、または特定の作家・作品の再現や代替を目的とした利用は想定していません。

---

### 2. Prohibited Uses / 生成コンテンツに関する禁止事項

Users must not engage in the following:
ユーザーは、本ツールを使用して以下の行為を行ってはなりません。

#### (1) Intellectual Property Infringement / 著作権・知的財産権侵害
Reproducing or closely imitating existing backgrounds, recognizable styles, or protected elements.
- 既存の漫画、アニメ、小説、映画、ゲーム等の背景や美術設定を実質的に再現・模倣する行為
- 特定の作家のスタイル・作風を識別可能なレベルで再現する行為
- デザイン要素の無断流用
- 商標、ロゴ、ブランド要素の無断使用

#### (2) Use of Infringing Content / 権利侵害コンテンツの利用
Generating, distributing, or monetizing infringing or derivative content without permission.
- 第三者の著作権、商標権、パブリシティ権等を侵害するコンテンツの生成、公開、販売、共有
- 既存IPに類似したコンテンツの無断商用利用

#### (3) Facilitation of Misuse / 不正利用の助長
Creating or sharing tools intended for infringement.
- 権利侵害を目的としたプロンプト、テンプレート、ワークフローの作成・共有
- 他者に侵害行為を促す行為

#### (4) Illegal Activities / 法令違反・不正行為
Any illegal or harmful use.
- 適用される法令に違反する行為
- 詐欺、不正行為、または有害な目的での利用

---

### 3. Responsibility & Ownership / 生成物の責任および権利

The user bears full responsibility for generated content.
生成されたコンテンツの内容および利用に関するすべての責任はユーザーに帰属します。

The developer does not claim ownership of generated content but does not guarantee its legality or usability.
本ツールの利用によって生成されたコンテンツについて、開発者は著作権その他の権利を主張しませんが、その適法性・利用可能性を保証するものではありません。

---

### 4. Disclaimer / 免責事項

This tool is provided "as is" without any warranties.
本ツールは「現状有姿（AS IS）」で提供され、明示または黙示を問わず、いかなる保証も行いません。

The developer shall not be liable for any damages arising from use.
開発者は、本ツールの利用または生成コンテンツに起因するいかなる損害についても責任を負いません。

---

### 5. Infringement & Takedown / 権利侵害への対応

Upon receiving a valid claim, the developer may:
権利侵害の申し立てがあった場合、開発者は独自の判断により以下の対応を行う場合があります。

Remove content, restrict usage, or take necessary actions.
- 該当コンテンツの削除要請または削除
- 利用の制限または禁止
- リポジトリの公開停止等の措置

---

### 6. Changes / 規約の変更

These terms may be updated without notice.
本規約は予告なく変更される場合があります。

---

### 7. Governing Law / 準拠法

These terms are governed by the laws of Japan.
本規約は日本法に準拠します。

---

## AI Manga Creative Suite / AIまんが制作エコシステム

This project is part of an integrated ecosystem designed to support AI-powered manga and story creation.
本プロジェクトは、AIを活用した漫画・ストーリー制作を支援する統合エコシステムの一部です。

### Ecosystem Components / 構成システム

#### 1. Nano Banana 2 and ChatGPT Images 2.0 Powered Super AI 4-koma System
A specialized system for 4-koma manga production using AI. / AIを活用した4コマ漫画制作に特化したシステムです。
- [Demo / デモ](https://furuyan1234.github.io/nano-banana-pro/)
- [Code / コード](https://github.com/FURUYAN1234/nano-banana-pro)
- [Overview / 解説](https://github.com/FURUYAN1234/nano-banana-pro/blob/main/README.md)

#### 2. AI Story Maker
A tool that uses AI to generate creative stories and plots. / AIを用いてクリエイティブなストーリーやプロットを生成するツールです。
- [Demo / デモ](https://furuyan1234.github.io/story-maker/)
- [Code / コード](https://github.com/FURUYAN1234/story-maker)
- [Overview / 解説](https://github.com/FURUYAN1234/story-maker/blob/main/README.md)

#### 3. AI Character Sheet Maker
An assistance tool for designing detailed character sheets and settings. / 詳細なキャラクターシートや設定をデザインするための支援ツールです。
- [Demo / デモ](https://furuyan1234.github.io/character-sheet-maker/)
- [Code / コード](https://github.com/FURUYAN1234/character-sheet-maker)
- [Overview / 解説](https://github.com/FURUYAN1234/character-sheet-maker/blob/main/README.md)

#### 4. AI Comic Translation Tool
A tool that translates manga into 10 languages using AI. / AIを使って漫画を10言語に翻訳するツールです。
- [Demo / デモ](https://furuyan1234.github.io/comic-translation/)
- [Code / コード](https://github.com/FURUYAN1234/comic-translation)
- [Overview / 解説](https://github.com/FURUYAN1234/comic-translation/blob/main/README.md)

#### 5. 360° AI Panorama Generator
A tool that generates seamless 360-degree spatial backgrounds to provide background assets for manga and video. / シームレスな360度空間の背景を生成し、漫画や動画の背景素材として提供するツールです。
- [Demo / デモ](https://furuyan1234.github.io/panoforge/)
- [Code / コード](https://github.com/FURUYAN1234/panoforge)
- [Overview / 解説](https://github.com/FURUYAN1234/panoforge/blob/main/README.md)
