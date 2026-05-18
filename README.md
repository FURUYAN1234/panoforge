# 360° AI Panorama Generator

**v1.2.1** — AI-driven 360° panoramic background generation and expansion tool using Gemini & OpenAI API / Gemini API と OpenAI API を使用したAI駆動の360度パノラマ背景生成・拡張ツール (Dual-API)

> **[[Nano Banana 2 and ChatGPT Images 2.0 Powered Super AI 4-koma System](https://github.com/FURUYAN1234/nano-banana-pro)](https://github.com/FURUYAN1234/nano-banana-pro) Integration / 連携対応**
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

### 🧠 Dual-API Architecture (デュアルAPIアーキテクチャ)
本システムは、Gemini API と OpenAI API の両方をサポートし、用途に応じて切り替えて使用できるデュアルエンジン構造を採用しています。

- **Gemini API (Google)**: High-speed, natively multimodal panorama generation using `gemini-2.0-flash-preview-image-generation`. Perfect for expanding existing 1-shot images while retaining original pixel details. Generation takes only 10-20 seconds. / Geminiの高速かつネイティブなマルチモーダル生成によるパノラマ拡張。手持ちの画像のディテールを維持したままのアウトペインティングに最適。**生成時間は約10〜20秒と高速です。**
- **OpenAI API (DALL-E 3 & GPT-4o)**: Unmatched prompt adherence and ultra-high-quality image generation. Generates stunning panoramas from text, and utilizes GPT-4o's vision capabilities to intelligently "re-create" an existing image as a seamless 360° environment. **Note: Generation takes 2-4 minutes and is billed on a pay-as-you-go basis.** / 圧倒的なプロンプト忠実度と超高画質。テキストからの生成や、GPT-4oの画像解析による「既存画像の360度化（近似再構築）」に威力を発揮。**※生成には約2〜4分かかり、従量課金となります。**

#### ⚠️ OpenAI API Limitations / OpenAI APIモードの限界と注意事項
- **Time Required (処理時間)**: OpenAI API does not support native panorama outpainting. It requires a multi-step pipeline (Vision Analysis -> Prompt Generation -> DALL-E 3 Generation), taking **2 to 4 minutes** per image. / OpenAI APIはネイティブなパノラマ拡張をサポートしていないため、GPT-4oでの画像解析からDALL-E 3での再生成まで複数ステップを踏みます。そのため**完了までに約2〜4分かかります**。
- **Re-creation vs Outpainting (近似再構築)**: When expanding an existing image with OpenAI API, the original image is NOT directly stitched or outpainted. Instead, GPT-4o describes the image in text, and DALL-E 3 generates a completely new 360° image matching that description. / 画像ドロップによる360度拡張をOpenAI APIで行う場合、元の絵を直接拡張（切り貼り）するわけではありません。AIが画像をテキスト化し、その情報をもとに**そっくりな360度画像を新規生成（近似再構築）**するため、「それっぽくなる」挙動となります。
- **Pay-As-You-Go Cost (従量課金)**: Using the OpenAI API incurs usage-based costs. Frequent panorama generation may consume significant API credits. / OpenAI APIは従量課金です。パノラマ生成を頻繁に行うとAPI残高を大きく消費する可能性があります。

### 🖼️ 2-Stage Generation (2段階生成)
- **Text-to-Image / テキストから画像生成**: Generates a high-quality 2:1 aspect ratio base image from any scene description and style. / 任意のシーン説明とスタイルから、高品質な2:1比率のベース画像を生成。
- **Image-to-360° Panorama / 画像から360°パノラマへ拡張**: Expands the generated image, or a user-dropped image, into a seamless 360-degree panorama using AI outpainting. / 生成した画像、またはユーザーがドロップした手持ちの画像を、AIアウトペインティングによってシームレスな360度パノラマに拡張。

### 🎬 Massive Scene Presets (大規模シーンプリセット)
- Over **65 pre-built scene descriptions** across 7 categories, allowing one-click scene selection without manual typing. / 7カテゴリ計**65以上のシーンプリセット**を搭載し、手入力なしでワンクリックで選択可能。
- **Categories / カテゴリ**: 🏙️ City/都市・街, 🌿 Nature/自然・風景, 🔮 Fantasy & SF/ファンタジー・SF, 🏠 Interior/室内・建築, ⏳ Historical/時代・歴史, 🌤️ Weather/天候・時間帯
- Scrollable category-organized chip UI with free-text input fallback. / カテゴリ別スクロール式チップUIと自由入力の併用。

### 🎨 Rich Style Presets (豊富なスタイルプリセット)
- **24 art style presets** covering anime, photorealistic, watercolor, oil painting, cyberpunk, Ghibli-style, Shinkai-style, ukiyo-e, vaporwave, and more. / アニメ、フォトリアル、水彩画、油絵、サイバーパンク、ジブリ風、新海誠風、浮世絵、ヴェイパーウェイブ等、**24種のスタイルプリセット**を搭載。
- One-click selection with free-text override. / ワンクリック選択と自由入力の切り替え。

### ✨ Dual AI Suggestions (ダブルAI提案)
- **Scene AI Suggestion / シーンAI提案**: AI proposes creative scene descriptions from diverse categories (city, nature, fantasy, historical, etc.). / AIが都市・自然・ファンタジー・歴史等の多様なカテゴリからクリエイティブなシーン説明を提案。
- **Style AI Suggestion / スタイルAI提案**: AI recommends the optimal art style based on the current scene description. / AIが現在のシーン説明に基づいて最適な画風を推薦。

### 🌐 Interactive 360° Viewer (インタラクティブ・ビューワー)
- Built-in lightweight and fast viewer powered by **Three.js**. / **Three.js** を搭載した軽量で高速な内蔵ビューワー。
- Supports full omnidirectional view rotation via drag and Field of View (FOV) zoom via mouse wheel. / ドラッグによる全方位の視点移動、マウスホイールによる視野角（FOV）ズーム。
- Supports **Auto-Rotate Mode / 自動回転モード** and **Fullscreen Mode / 全画面モード**.

### 📸 HD Capture & Export (高解像度キャプチャ)
- Instantly capture any viewpoint in Full HD (1920x1080) resolution and save as PNG. / 任意の視点をフルHD (1920x1080) 解像度でキャプチャし、一瞬でPNG保存。
- Direct download of the original 360-degree image (equirectangular format). / 360度元画像（エクイレクタングラー形式）の直接ダウンロード。

### 🌐 GPano XMP Metadata (Google Photos対応)
- Saved 360° images embed **GPano XMP metadata** (equirectangular projection tags) directly into the JPEG binary. / 保存される360°画像には**GPano XMPメタデータ**（正距円筒図法タグ）がJPEGバイナリに直接埋め込まれます。
- Google Photos, Facebook, and other platforms automatically open the image in 360° viewer mode. / Google Photos、Facebook等のプラットフォームで自動的に360°ビューワーモードで開かれます。

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
2. **Run / 実行**: Double-click `start_panorama_generator.bat` in the folder. *(Requires Node.js to be installed previously)* / フォルダ内の `start_panorama_generator.bat` をダブルクリックします。*(事前にNode.jsのインストールが必要です)*
3. **Start / 開始**: Required libraries will be installed automatically, and the browser will launch. / 必要なライブラリが自動インストールされ、ブラウザが立ち上がります。

### 🔑 About API Keys / 各種APIキーについて
- A **Gemini API Key** (from Google AI Studio) or an **OpenAI API Key** (starts with `sk-`) is required. / Google AI Studioで取得した **Gemini APIキー**、または **OpenAI APIキー** (`sk-` から始まるもの) が必要です。
- Enter the API key in the settings screen shown immediately after launch. The system will automatically detect which engine to use based on the API key format (`sk-` triggers OpenAI API). / 起動直後に表示される設定画面でAPIキーを入力します。キーの形式からシステムが自動でエンジン（Gemini API または OpenAI API）を判別します。
- The API key is **session-limited** (kept in memory only) and is NOT saved in the browser's local storage. / 入力したAPIキーは**セッション限定**（メモリ内のみ保持）であり、ブラウザのローカルストレージ等には一切保存されません。

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
A system specialized in creating 4-panel manga with AI. / AIを活用した4コマ漫画制作に特化したシステムです。
- [Explanation / 解説](https://note.com/happy_duck780/n/ndf063558c1f5)
- [Demo / デモ](https://furuyan1234.github.io/nano-banana-pro/)
- [Code / コード](https://github.com/FURUYAN1234/nano-banana-pro)

#### 2. AI Story Maker
A tool for generating creative stories and plots using AI. / AIを用いてクリエイティブなストーリーやプロットを生成するツールです。
- [Explanation / 解説](https://note.com/happy_duck780/n/nd3d972922868)
- [Demo / デモ](https://furuyan1234.github.io/story-maker/)
- [Code / コード](https://github.com/FURUYAN1234/story-maker)

#### 3. AI Character Sheet Maker
An assistant for designing detailed character sheets and settings. / 詳細なキャラクターシートや設定をデザインするための支援ツールです。
- [Explanation / 解説](https://note.com/happy_duck780/n/neccbebd7d957)
- [Demo / デモ](https://furuyan1234.github.io/character-sheet-maker/)
- [Code / コード](https://github.com/FURUYAN1234/character-sheet-maker)

#### 4. AI Comic Translation Tool
A tool for translating manga into 10 languages using AI. / AIを使って漫画を10言語に翻訳するツールです。
- [Explanation / 解説](https://note.com/happy_duck780/n/nbdf826604ce7)
- [Demo / デモ](https://furuyan1234.github.io/comic-translation/)
- [Code / コード](https://github.com/FURUYAN1234/comic-translation)

#### 5. 360° AI Panorama Generator
A tool that generates seamless 360-degree spatial backgrounds to provide background assets for manga and video. / シームレスな360度空間の背景を生成し、漫画や動画の背景素材として提供するツールです。
- [Explanation / 解説](https://note.com/happy_duck780/n/nb53b121fef88)
- [Demo / デモ](https://furuyan1234.github.io/panoforge/)
- [Code / コード](https://github.com/FURUYAN1234/panoforge)

#### 6. AI Voice Comic Maker
A tool to automatically convert static 4-koma manga into fully voiced animated videos. / 静止画の4コマ漫画をフルボイスの動画に自動変換するツールです。
- [Explanation / 解説](https://note.com/happy_duck780/n/ndc6533c1512f)
- [Code / コード](https://github.com/FURUYAN1234/ai-voice-comic-maker)
---

Developed by **FURU**

---

## 📋 ChangeLog

### v1.2.1 (2026-05-18)
- **[Feature]** OpenAIモード（DALL-E 3）での画像生成・拡張時に、2〜4分の待機時間を示すタイマーと明確な案内を表示するようUIを改善。 / Added a processing timer and clear wait-time annotations (2-4 minutes) for OpenAI mode generation and expansion.
- **[Improve]** メイン画面右上の「API設定」ボタンを改修し、現在のエンジン（Gemini/OpenAI）を表示するバッジと、設定を開くボタンを完全に分離して視認性を向上。 / Separated the API engine status badge and the settings button in the top right header for better visibility.
- **[Document]** READMEを大幅に加筆・修正。Dual-APIアーキテクチャの解説を強化し、OpenAI API利用時の「従量課金」および「パノラマ拡張における再構築（近似生成）仕様」の注意事項を明記。 / Major README rewrite to highlight Dual-API architecture, clearly documenting OpenAI API pay-as-you-go costs and the "re-creation" limitations of DALL-E 3 panorama expansion.

### v1.2.0 (2026-05-18)
- **[Feature]** Dual-API アーキテクチャを実装。Gemini APIに加えて **OpenAI API (DALL-E 3 & GPT-4o)** を公式サポート。APIキーの形式 (`sk-`) を自動判別し、UIとバックエンドロジックをシームレスに切り替えます。 / Implemented Dual-API Architecture, officially supporting OpenAI API (DALL-E 3 & GPT-4o) alongside Gemini. Automatically detects key format and switches UI/backend logic.
- **[Improve]** OpenAIモード時の画像拡張について、DALL-E 3の仕様上「アウトペイントではなくGPT-4oによる再構築」となる旨の注釈UIを追加。左右のシームレス化は強力なプロンプトで制御されます。 / Added UI annotations for OpenAI mode image expansion, clarifying the "re-creation" process via GPT-4o.
- **[Improve]** APIキー入力モーダルのUIを刷新。他アプリと共通のスマートゲート仕様（状態インジケータ色変更、従量課金警告）を導入。 / Revamped API Key Modal UI with Smart Gate design (status indicator color change, usage-based billing warning).

### v1.1.5 (2026-05-18)
- **[Bugfix]** 起動バッチファイル名を修正 (start_panorama_generator.bat) / Fixed startup batch file name.

### v1.1.4 (2026-05-15)
- **[Improve]** 処理中の進行状況（ステップ）表示を動的生成方式に変更し、通常画像生成時と360°パノラマ拡張時の表示を適正化しました。 / Optimized processing step display to dynamically switch between normal image generation and 360° panorama expansion.
- **[Improve]** 360°プレビュー画像の表示制限を撤廃し、2:1比率のワイドストリップとして自然に表示されるように修正。 / Removed height constraint on 360° preview to display the full equirectangular panoramic strip correctly.
- **[Improve]** メニュー画面の「ダウンロード」ボタンからも、GPano XMPメタデータ付きのJPEG形式で360°パノラマ画像を保存できるように統一（タイムスタンプ付きファイル名）。 / Unified 360° image download from the main menu to save as JPEG with GPano XMP metadata and timestamped filenames.
- **[Bugfix]** テキストからの初回画像生成（Step 1）で誤って360°風の歪んだ画像が生成されてしまう問題を防ぐため、プロンプトからパノラマ関連の指示を削除し、通常の構図で出力されるように修正。 / Removed panorama-related instructions from the Step 1 prompt to ensure the initial generated image uses a standard, non-distorted composition.

### v1.1.3 (2026-05-14)
- **[Bugfix]** AI提案機能（シーン/スタイル）において、一部のAIモデル（Gemini 2.0/2.5等）が思考プロセス（Chain of Thought）を出力してしまい入力窓に混入する問題を修正。プロンプトの厳格化と後処理ロジックの追加により、最終的な提案内容のみを抽出するように改善しました。 / Fixed an issue where the AI suggestion feature would leak the AI's internal thought process into the input field by tightening the prompt and adding post-processing logic to extract only the final output.

### v1.1.2 (2026-05-14)
- **[Improve]** ユーザーの混乱を防ぐため、安全フィルタによるブロック時のエラーダイアログで「そのままリトライで成功する可能性がある」旨を明記するように修正。 / Improved content policy error messages to clarify that retrying might succeed due to safety filter false positives.

### v1.1.1 (2026-05-14)
- **[Feature]** アプリタイトルの横とAPI設定モーダルのヘッダーに現在のバージョンを示すバッジ（vX.Y.Z）を表示。UIの利便性と管理性を向上。 / Added version badges to the main header and API settings modal for better visibility.

### v1.1.0 (2026-05-14)
- **[Major]** 360°パノラマ拡張プロンプトを大幅強化。左右端のシームレス接続を「最優先事項」として明示し、equirectangular投影の数学的制約（360°ラップ、極点歪み、バレル歪曲）を技術的に詳述。つなぎ目の見えるパノラマ生成を大幅に改善。 / Major prompt engineering overhaul for 360° panorama expansion. Seamless left-right edge connection is now enforced as the absolute top priority with detailed technical constraints for equirectangular projection.
- **[Improve]** テキスト→画像生成プロンプトも360°変換を前提とした広角構図に最適化。 / Text-to-image generation prompt now optimized for wide-angle composition suitable for 360° conversion.

### v1.0.9 (2026-05-14)
- **[Feature]** 360°画像保存時にGPano XMPメタデータをJPEGバイナリに埋め込む機能を実装。Google Photos、Facebook等で自動的に360°ビューワーが起動する形式で出力。 / Added GPano XMP metadata injection into JPEG binary on 360° image save. Images now auto-open in 360° viewer on Google Photos, Facebook, etc.
- **[Change]** 保存形式をPNGからJPEG (95%品質) に変更。XMPメタデータ埋め込みのため。 / Changed output format from PNG to JPEG (95% quality) to support XMP metadata embedding.

### v1.0.8 (2026-05-14)
- **[Fix]** スタイルプリセットから固有名詞（「ジブリ風」「新海誠風」）を削除し、一般的な表現（「手描きアニメ風」「光彩写実アニメ」）に置換。商標・著作権のコンプライアンス対応。 / Replaced proprietary style names (Ghibli, Shinkai) with generic descriptions for compliance.

### v1.0.7 (2026-05-14)
- **[Feature]** 既存の360°画像をビューワーで開いた際、「360°画像を保存」ボタンを非表示にするリードオンリーモードを実装。元画像の劣化コピー保存を防止し、キャプチャ保存のみ有効に。 / Added read-only viewer mode for pre-existing 360° images. Hides the save button to prevent quality-degraded re-saves; capture function remains available.

### v1.0.6 (2026-05-14)
- **[Feature]** シーンプリセットを7カテゴリ計65個以上に大幅拡充（都市・街、自然・風景、ファンタジー・SF、室内・建築、時代・歴史、天候・時間帯）。ポチポチ選ぶだけで生成可能に。 / Massively expanded scene presets to 65+ across 7 categories for one-click generation.
- **[Feature]** スタイルプリセットを24種に倍増（ジブリ風、新海誠風、ヴェイパーウェイブ、水墨画、アールヌーヴォー等を追加）。 / Doubled style presets to 24 (added Ghibli, Shinkai, vaporwave, ink wash, Art Nouveau, etc.).
- **[Feature]** シーンAI提案ボタンを追加。AIがランダムなシーン説明を提案。 / Added Scene AI suggestion button for creative scene proposal.
- **[Cleanup]** 不要な一時スクリプトおよびViteテンプレート残骸を削除。 / Removed temporary scripts and Vite template leftovers.

### v1.0.5 (2026-05-14)
- **[Feature]** シーンの説明にプリセットチップ＋自由入力窓＋AI提案ボタンのUIを追加。 / Added scene preset chips, free input textarea, and AI suggestion button.
- **[Feature]** スタイルAI提案機能を実装。シーンに基づいて最適なスタイルをAIが推薦。 / Implemented style AI suggestion based on scene description.

### v1.0.4 (2026-05-14)
- **[Docs]** AI Manga Creative Suite / AIまんが制作エコシステムの項目にNoteの解説リンクを追加し、一覧を最新化しました。 / Updated the Ecosystem list and added the Note explanation link.
- **[Docs]** リポジトリのAbout欄にトピックタグを付与し、説明文を更新しました。 / Updated repository description and topic tags.

### v1.0.3 (2026-05-14)
- **[Docs]** ドキュメントフォーマットの修正と更新を行いました。 / Fixed documentation formatting.

### v1.0.0 - v1.0.2 (2026-05-13)
- **[Feature]** 360° AI Panorama Generator の初版およびバグフィックス版をリリース。Gemini 2.0 Flash APIを利用したシームレスな360度パノラマ背景の生成と、Three.jsによるインタラクティブビューワー、Zenith Protocolによるフォールバック機構を搭載。 / Initial releases of 360° AI Panorama Generator.
