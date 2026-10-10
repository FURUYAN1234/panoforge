# 360° AI Panorama Generator / 360度AIパノラマ生成ツール

> **Source code available; free to use.** Ordinary use, free integration and free provision require no application, prior contact or permission from FURU. You may sell and monetize your own works. External API costs and third-party terms are separate. See Terms & Output Rights below. / **ソースコード公開・利用無料。** 通常利用と無料の組み込み・無料提供に、申請・事前連絡・FURUの許可は不要です。自分の作品は販売・収益化できます。外部API料金と第三者の条件は別です。詳しくは「利用条件・作品の権利」をご確認ください。


**v1.4.6** — AI-driven 360° panoramic background generation and expansion tool using Gemini & OpenAI API / Gemini API と OpenAI API を使用したAI駆動の360度パノラマ背景生成・拡張ツール (Dual-API)

[!['ChatGPT Image 2026年6月25日 22_19_30'](https://github.com/user-attachments/assets/d850ac7f-aa1c-40cc-a378-b8c6673c726c)](https://youtu.be/pqYVxUUg0Cs?si=27g1I3tO2EuZkOuxJ)

> **[[Super FURU AI 4-koma System](https://github.com/FURUYAN1234/nano-banana-pro)](https://github.com/FURUYAN1234/nano-banana-pro) Integration / 連携対応**
> The generated 360° spatial images provide overwhelming immersion as manga backgrounds and video assets. / 生成された360度空間画像は、漫画の背景や動画素材として圧倒的な没入感を提供します。

---

## 🚀 Overview / 概要

360° AI Panorama Generator is an experimental tool that generates "360-degree equirectangular panoramic images" from text or a single image, allowing interactive viewing and capturing via an integrated 3D viewer. / 360° AI Panorama Generatorは、テキストや1枚の画像から「360度エクイレクタングラー（正距円筒図法）パノラマ画像」を生成し、内蔵の3Dビューワーでインタラクティブに確認・キャプチャできる実験的ツールです。

It provides seamless 360-degree environments as background assets for manga and video production tools like Super FURU AI 4-koma System, supporting highly immersive expressions. / Super FURU AI 4-koma System などの漫画・動画制作ツールにおいて、背景素材としてシームレスな360度空間を提供し、没入感のある表現をサポートします。

## Current Release Line / 現行仕様

The current public line is **v1.4.6**. The app is now a dual-provider panorama tool rather than a Gemini-only experiment. / 現行公開系統は **v1.4.6** です。現在はGemini専用の実験ではなく、Gemini / OpenAI の両方に対応したパノラマ生成ツールです。

### Spatial-Ledger Panorama Routine / 空間台帳パノラマ・ルーチン

The panorama path is not a blind request to "extend in every direction." Before creating a panorama, the selected provider produces a bounded JSON spatial ledger for the source image: major objects, doors/windows and other openings, architectural structure, lighting, and scene density. The panorama prompt carries that ledger forward, so furniture placement, empty areas, structure, and light have an explicit continuity contract instead of relying only on a style description. / パノラマ拡張は、単に「360度に広げる」と依頼する処理ではありません。拡張前に選択中のプロバイダが、主要物体・ドアや窓などの開口部・建築構造・照明・情報量を限定JSONの空間台帳として抽出します。生成プロンプトにはこの台帳を引き継ぐため、家具の配置、余白、構造、光について明示的な連続性の契約を渡します。

1. **Base image / 元画像** — Create a text-to-image seed or accept a dropped image.
2. **Spatial ledger / 空間台帳** — Extract only the scene facts needed for continuity. Duplicate entries are removed and malformed model JSON fails closed.
3. **Panorama generation / パノラマ生成** — Generate an equirectangular environment using the ledger plus the source-image description and selected style.
4. **Semantic QA / 意味的QA** — Check major-object duplication or loss, opening and architecture continuity, lighting consistency, density, and semantic seam issues. A malformed or rejected QA result is not presented as success.
5. **One bounded correction / 最大1回の補正** — If QA identifies an issue, the app performs one ledger-guided regeneration. A second rejection stops with an error instead of silently shipping an unverified image.
6. **Seam repair and viewer / シーム修復と確認** — Only an accepted result proceeds through the existing Split-Swap-Inpaint/Blend seam stage and the Three.js viewer.

This routine improves scene-level continuity, but it is not a 3D reconstruction or a mathematical guarantee that every object is identical around the entire sphere. The viewer remains the final human inspection surface; rotate it to inspect multiple directions before exporting. / このルーチンはシーン全体の整合性を高めますが、3D復元や、球全周で全物体が完全一致することの数学的保証ではありません。書き出し前にビューワーを回転し、複数方向を人間が確認することが最終確認になります。

For OpenAI, the selected OpenAI vision model (default GPT-6.1 Sol) first describes the source image, the spatial ledger is produced from that analysis, and GPT Image 2.5 Sunburst/xhigh recreates the panorama from the resulting contract. A retry-eligible provider failure falls back to GPT Image 2.0/high within the same **600 seconds (10 minutes)** window. This is deliberately a semantic re-creation path, not pixel-preserving outpainting. / OpenAIでは、まず選択したOpenAIモデル（既定GPT-6.1 Sol）のVisionが元画像を説明し、その解析から空間台帳を作成してGPT Image 2.5 Sunburst/xhighがパノラマを再生成します。リトライ対象のプロバイダ失敗時だけ、同じ **600秒（10分）** 枠内でGPT Image 2.0/highへフォールバックします。これはピクセル保持型のアウトペイントではなく、意味的な再生成経路です。

### Provider Isolation / プロバイダ分離

Gemini and OpenAI are independent execution paths. A Gemini request can retry only Gemini models, and an OpenAI request can retry only OpenAI models; neither provider is ever used as the other provider's fallback. Changing the configured provider clears the source image, generated panorama, viewer, and retry state. To continue after switching, create or upload a new source image under the newly selected provider. / GeminiとOpenAIは完全に独立した実行経路です。Geminiのリトライ先はGeminiモデルだけ、OpenAIのリトライ先はOpenAIモデルだけであり、相互にフォールバックすることはありません。設定プロバイダを切り替えた瞬間、元画像・生成済みパノラマ・ビューワー・再試行状態をすべて消去します。切替後に続ける場合は、新しく選択したプロバイダで元画像を生成またはアップロードしてください。

* **Gemini image path / Gemini画像生成**: Nano Banana 2.1 (`gemini-nano-banana-2.1`) uses the Interactions API for image creation, panorama expansion and spatial repairs. The Model Chain display uses the same model configuration. / 画像生成・360度への拡張・空間の修正は、Nano Banana 2.1 (`gemini-nano-banana-2.1`) のInteractions APIを使用します。Model Chain表示も実行時と同じモデル設定を参照します。
* **OpenAI image path / OpenAI画像生成**: OpenAI uses a text-mediated recreation pipeline: the selected OpenAI vision model (default GPT-6.1 Sol) analysis prepares the prompt, then GPT Image 2.5 Sunburst/xhigh generates PNG output. A retry-eligible provider failure falls back to GPT Image 2.0/high inside the shared timeout. This is high-quality recreation, not pixel-preserving outpainting. / OpenAIはテキスト媒介の再構成パイプラインです。選択したOpenAIモデル（既定GPT-6.1 Sol）のVision解析でプロンプトを作り、GPT Image 2.5 Sunburst/xhighがPNGを生成します。リトライ対象のプロバイダ失敗時だけ、共有タイムアウト内でGPT Image 2.0/highへフォールバックします。これは高品質な再生成であり、元画像ピクセルをそのまま延長するアウトペイントではありません。
* **Viewer and metadata / ビューワーとメタデータ**: The generated equirectangular image can be checked in the built-in Three.js viewer and exported with GPano metadata for 360-degree viewers. / 生成された正距円筒図法画像は内蔵Three.jsビューワーで確認でき、360度ビューア向けにGPanoメタデータ付きで保存できます。

---

## 🌍 Demo Site / デモサイト

> **Demo Link / デモサイト:** [https://furuyan1234.github.io/panoforge/](https://furuyan1234.github.io/panoforge/)

---

## ✨ Features / 機能

### 🧠 Dual-API Architecture / デュアルAPIアーキテクチャ
The system supports both Gemini and OpenAI APIs and lets users select the engine for their task. / 本システムは、Gemini API と OpenAI API の両方をサポートし、用途に応じて切り替えて使用できるデュアルエンジン構造を採用しています。

- **Gemini API (Google)**: Nano Banana 2.1 (`gemini-nano-banana-2.1`) generates images and expands source images through the Interactions API. / Nano Banana 2.1 (`gemini-nano-banana-2.1`) のInteractions APIで、画像生成と参照画像からのパノラマ拡張を行います。
- **OpenAI API (GPT Image 2.5 / 2.0 fallback & selectable text/vision models)**: Generates panoramas from text using GPT Image 2.5 Sunburst/xhigh, falling back to GPT Image 2.0/high only for retry-eligible provider failures, and uses the selected OpenAI vision model (default GPT-6.1 Sol) analysis to re-create an existing image as a seamless 360° environment. **Note: the combined image request window is up to 10 minutes and is billed on a pay-as-you-go basis.** / GPT Image 2.5 Sunburst/xhighによる高画質生成を基本に、リトライ対象のプロバイダ失敗時だけGPT Image 2.0/highへフォールバックし、選択したOpenAIモデル（既定GPT-6.1 Sol）のVision解析で「既存画像の360度化（近似再構築）」に対応します。**※画像リクエスト全体は最大10分で、従量課金となります。**

#### ⚠️ OpenAI API Limitations / OpenAI APIモードの限界と注意事項
- **Time Required (処理時間)**: OpenAI API does not support native panorama outpainting. It requires a multi-step pipeline (Vision Analysis -> Prompt Generation -> GPT Image 2.5, with GPT Image 2.0 fallback when eligible), and the app permits up to **10 minutes total** for the image job. / OpenAI APIはネイティブなパノラマ拡張をサポートしていないため、選択したOpenAIモデルでの画像解析からGPT Image 2.5での再生成（対象時はGPT Image 2.0へのフォールバック）まで複数ステップを踏みます。アプリは画像ジョブ全体に**最大10分**を許容します。
- **Re-creation vs Outpainting (近似再構築)**: When expanding an existing image with OpenAI API, the original image is NOT directly stitched or outpainted. Instead, the selected OpenAI vision model (default GPT-6.1 Sol) describes the image in text, and GPT Image 2.5 (or its eligible GPT Image 2.0 fallback) generates a completely new 360° image matching that description. / 画像ドロップによる360度拡張をOpenAI APIで行う場合、元の絵を直接拡張（切り貼り）するわけではありません。AIが画像をテキスト化し、その情報をもとにGPT Image 2.5（対象時はGPT Image 2.0へのフォールバック）が**そっくりな360度画像を新規生成（近似再構築）**するため、「それっぽくなる」挙動となります。
- **Pay-As-You-Go Cost (従量課金)**: Using the OpenAI API incurs usage-based costs. Frequent panorama generation may consume significant API credits. / OpenAI APIは従量課金です。パノラマ生成を頻繁に行うとAPI残高を大きく消費する可能性があります。

#### 🎯 Engine Selection Guide / エンジン選択ガイド

| Use Case / 用途 | Recommended / 推奨 | Reason / 理由 |
|---|---|---|
| **360° panorama from image / 画像→360°変換** | **Gemini** ★ | Direct outpainting preserves original pixel details, art style, and character integrity with minimal distortion. / 直接アウトペインティングにより元画像のピクセル・画風・キャラクターの整合性を高精度に維持。 |
| **360° with characters / キャラクター入り360°** | **Gemini** ★ | OpenAI's text-mediated re-creation cannot accurately maintain character proportions in equirectangular projection. / OpenAIのテキスト経由再構築ではエクイレクタングラー投影でのキャラクター比率維持が困難。 |
| **Text-to-image (Step 1) / テキスト→一枚絵** | Both OK / 両方可 | Both engines produce high-quality results for single image generation. / 一枚絵生成は両エンジンとも高品質。 |
| **Background-only 360° / 背景のみ360°** | Both OK / 両方可 | Environmental scenes (cafés, streets, landscapes) work well with both engines. / 環境シーン（カフェ、街並み、風景等）は両エンジンとも良好。 |

### 🖼️ 2-Stage Generation / 2段階生成
- **Text-to-Image / テキストから画像生成**: Generates a high-quality 2:1 aspect ratio base image from any scene description and style. / 任意のシーン説明とスタイルから、高品質な2:1比率のベース画像を生成。
- **Image-to-360° Panorama / 画像から360°パノラマへ拡張**: Expands the generated image, or a user-dropped image, into a seamless 360-degree panorama using AI outpainting. / 生成した画像、またはユーザーがドロップした手持ちの画像を、AIアウトペインティングによってシームレスな360度パノラマに拡張。

### 🎬 Massive Scene Presets / 大規模シーンプリセット
- Over **65 pre-built scene descriptions** across 7 categories, allowing one-click scene selection without manual typing. / 7カテゴリ計**65以上のシーンプリセット**を搭載し、手入力なしでワンクリックで選択可能。
- **Categories / カテゴリ**: 🏙️ City/都市・街, 🌿 Nature/自然・風景, 🔮 Fantasy & SF/ファンタジー・SF, 🏠 Interior/室内・建築, ⏳ Historical/時代・歴史, 🌤️ Weather/天候・時間帯
- Scrollable category-organized chip UI with free-text input fallback. / カテゴリ別スクロール式チップUIと自由入力の併用。

### 🎨 Rich Style Presets / 豊富なスタイルプリセット
- **24 art style presets** covering anime, photorealistic, watercolor, oil painting, cyberpunk, Ghibli-style, Shinkai-style, ukiyo-e, vaporwave, and more. / アニメ、フォトリアル、水彩画、油絵、サイバーパンク、ジブリ風、新海誠風、浮世絵、ヴェイパーウェイブ等、**24種のスタイルプリセット**を搭載。
- One-click selection with free-text override. / ワンクリック選択と自由入力の切り替え。

### ✨ Dual AI Suggestions / ダブルAI提案
- **Scene AI Suggestion / シーンAI提案**: AI proposes creative scene descriptions from diverse categories (city, nature, fantasy, historical, etc.). / AIが都市・自然・ファンタジー・歴史等の多様なカテゴリからクリエイティブなシーン説明を提案。
- **Style AI Suggestion / スタイルAI提案**: AI recommends the optimal art style based on the current scene description. / AIが現在のシーン説明に基づいて最適な画風を推薦。

### 🌐 Interactive 360° Viewer / インタラクティブ・ビューワー
- Built-in lightweight and fast viewer powered by **Three.js**. / **Three.js** を搭載した軽量で高速な内蔵ビューワー。
- Supports full omnidirectional view rotation via drag and Field of View (FOV) zoom via mouse wheel. / ドラッグによる全方位の視点移動、マウスホイールによる視野角（FOV）ズーム。
- Supports **Auto-Rotate Mode / 自動回転モード** and **Fullscreen Mode / 全画面モード**.

## Auto AI Model Fallback） / 🧠 Zenith Protocol（AIモデル自動切替

Following the philosophy of Super FURU AI 4-koma System, this system features a robust fallback mechanism (Zenith Protocol) that automatically switches to optimal alternative models upon API errors, rate limits, or safety filter blocks. / APIエラー、利用枠、安全フィルターによる停止時に、同じプロバイダー内の代替モデルへ切り替えるZenith Protocolを備えています。

Image Generation Fallback Pipeline (Gemini)**: / **画像生成
1. `gemini-nano-banana-2.1` (Nano Banana 2.1 / Interactions API)

Text Generation Fallback Pipeline**: / **テキスト生成・スタイル提案
- **Gemini**:
  1. `gemini-3.5-flash` (Tier1 / Next-Gen 最高品質)
  2. `gemini-2.5-flash` (Tier2 / 安定・高速)
  3. `gemini-2.5-pro` (Tier3 / 高品質)
  4. `gemini-flash-latest` (Tier4 / 最新安定版)
  5. `gemini-pro-latest` (Tier5 / 最新Pro版)
- **OpenAI**:
  `gpt-6-astra` → `gpt-6.1-sol` → `gpt-6-sol` → `gpt-5.6-sol` → `gpt-5.6-terra` → `gpt-6-luna` → `gpt-5.6-luna` → `gpt-4.1` → `gpt-4.1-mini` → `gpt-4.1-nano` → `gpt-4o`

**OpenAI model selection / OpenAIモデル選択**: All 11 text/vision models are selectable in this order, with Astra at the top and GPT-6.1 Sol selected by default in development and production. The dropdown appears only while OpenAI is connected, showing the selected model’s description and input/output price per million tokens. Each scene/style suggestion, source-image analysis and spatial check starts from the current selection and falls back only downward; earlier successes never replace that starting model. Separate text and vision statuses show the selected, attempted and adopted models. Image generation uses its existing dedicated image-model chain. / OpenAI接続時だけ11モデルのプルダウンを表示します。Astraを先頭、開発版・公開版ともGPT-6.1 Solを初期選択にし、説明と100万トークン当たりの入力・出力料金を表示します。シーン・スタイル提案、入力画像解析、空間構成確認は毎回選択モデルから開始し、下位にだけ切り替えます。以前の成功モデルが選択を上書きすることはありません。テキストと画像解析それぞれで選択・試行・採用モデルを表示します。画像生成は専用モデルの経路を維持します。

GPT-6 / GPT-5.6 text/vision calls allow up to 120 seconds and use reasoning-compatible completion parameters; legacy GPT-4.1/GPT-4o parameters remain unchanged. Truncated/refused output is rejected and authentication/access/quota failures stop the chain. / GPT-6・GPT-5.6のテキスト・画像解析は推論対応パラメーターと最大120秒に対応します。GPT-4.1・GPT-4oの互換パラメーターを維持し、途中終了・拒否された応答を完成扱いせず、認証・アクセス・利用枠エラーで連続試行を止めます。

---

### 📸 HD Capture & Export / 高解像度キャプチャ
- Instantly capture any viewpoint in Full HD (1920x1080) resolution and save as PNG. / 任意の視点をフルHD (1920x1080) 解像度でキャプチャし、一瞬でPNG保存。
- Direct download of the original 360-degree image (equirectangular format). / 360度元画像（エクイレクタングラー形式）の直接ダウンロード。

### 🌐 GPano XMP Metadata / Google Photos対応
- Saved 360° images embed **GPano XMP metadata** (equirectangular projection tags) directly into the JPEG binary. / 保存される360°画像には**GPano XMPメタデータ**（正距円筒図法タグ）がJPEGバイナリに直接埋め込まれます。
- Google Photos, Facebook, and other platforms automatically open the image in 360° viewer mode. / Google Photos、Facebook等のプラットフォームで自動的に360°ビューワーモードで開かれます。

---

## 🏗️ Unique Architecture Highlights / 固有アーキテクチャの要点

This system is not merely an image generation tool. It is a **spatial rendering engine** designed to correct spatial distortions and build/provide seamless 360-degree environments in real time. / 本システムは単なる画像生成ツールではありません。空間の歪みを補正し、シームレスな360度環境をリアルタイムで構築・提供するための**空間レンダリングエンジン**です。

* **2-Stage Image Expansion Pipeline / 2段階拡張パイプライン**:
  Instead of directly generating a panorama from text, it first generates a high-resolution seed image, then uses AI outpainting to expand the edges so they connect seamlessly in equirectangular projection, minimizing structural collapse. / テキストから直接パノラマを生成するのではなく、まず高解像度のシード画像を生成し、そのシード画像を中心としてAIのアウトペインティング（外側拡張）機能を用いて左右の端がシームレスに繋がる正距円筒図法に拡張します。これにより、破綻の少ないパノラマを生成します。
* **Strict Autocomplete Contamination Prevention / 自動入力汚染の完全排除**:
  Implements multi-layered defenses (dynamic `readonly` removal, randomized `name` attributes, delayed DOM clearing) to prevent unwanted strings from mixing into prompts via browser autocomplete. / ブラウザの自動補完によって予期せぬ文字列がプロンプトに混入する問題（UI汚染）を防ぐため、`readonly`属性の動的解除、ランダムな`name`属性、および遅延評価によるDOM強制クリアの多段防御壁を実装しています。
* **Robust Content Policy Handling / コンテンツポリシーのスマート検知**:
  Catches AI-model specific "200 OK responses with missing image data (safety filter blocks)" and provides users with specific guidance rather than generic API errors. / AIモデル特有の「データ欠落を伴う200 OKレスポンス（安全フィルタブロック）」をキャッチし、単なるAPIエラーではなく「ポリシーエラー」としてユーザーに具体的な修正ガイダンスを提供します。

---

## Auto AI Model Fallback） / 🧠 Zenith Protocol（AIモデル自動切替

Following the philosophy of Super FURU AI 4-koma System, this system features a robust fallback mechanism (Zenith Protocol) that automatically switches to optimal alternative models upon API errors, rate limits, or safety filter blocks. / Super FURU AI 4-koma System の思想を踏襲し、APIエラー時や制限到達時、あるいは安全フィルタでのブロック時に自動的に最適な別モデルへフォールバックする仕組み（Zenith Protocol）を搭載しています。

Image Generation Fallback Pipeline (Gemini)**: / **画像生成
1. `gemini-nano-banana-2.1` (Nano Banana 2.1 / Interactions API)

Text Generation Fallback Pipeline (Gemini)**: / **テキスト生成・スタイル提案
1. `gemini-3.5-flash` (Tier1 / Next-Gen 最高品質)
2. `gemini-2.5-flash` (Tier2 / 安定・高速)
3. `gemini-2.5-pro` (Tier3 / 高品質)
4. `gemini-flash-latest` (Tier4 / 最新安定版)
5. `gemini-pro-latest` (Tier5 / 最新Pro版)

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

- **Frontend**: Vanilla JS / HTML / CSS (Dark Theme) / フロントエンド：Vanilla JS／HTML／CSS、ダークテーマ。
- **Bundler**: Vite / **ビルドツール**：Vite
- **3D Graphics**: Three.js / **3D描画**：Three.js
- **AI**: Google GenAI SDK (Gemini API) / AI：Google GenAI SDK（Gemini API）。 AIの接続ライブラリです。

---

## ⚖️ Compliance & Legal Stance / 法的遵守について

### Japanese Copyright Law (Article 30-4) / 日本の著作権法（第30条の4）

This project is developed in full compliance with **Article 30-4 of the Japanese Copyright Act**, which allows for the exploitation of copyrighted works for information analysis and technological development of AI. / 本プロジェクトは、日本の著作権法第30条の4（情報解析目的の外での利用）に基づき、技術検証および情報解析を目的として開発されており、法的に適正な範囲内で公開されています。

### Official API Usage / 公式APIの利用

All generations are performed through official provider APIs: **Google Gemini API** or **OpenAI API**, depending on the selected key. The system is designed to respect each provider's applicable usage policy, safety behavior, and Terms of Service. / 本システムの生成処理は、入力されたキーに応じて **Google Gemini API** または **OpenAI API** の公式APIを介して行われます。各プロバイダーの利用ポリシー、安全フィルター、利用規約に従う設計です。

### Original Background Generation / 独自の背景生成

This system generates **original 360-degree panoramic background images** based on user-configured parameters and AI-driven generation. / 利用者の設定とAI生成に基づき、独自の360度パノラマ背景画像を作成します。

* It does not aim to replicate specific existing copyrighted backgrounds or artworks. / 特定の既存の背景や著作物を再現することを目的とはしていません。
* It generates original designs based on user prompts and mathematical constraints (equirectangular projection). / 利用者のプロンプトと正距円筒図法の幾何条件から、独自の設計を生成します。
The system does not aim to imitate a particular background artwork or work. It generates original 360-degree environments from user prompts and AI generation. / 本システムは、特定の背景美術や作品の模倣を目的としたものではありません。ユーザーが設定したプロンプトとAIによる生成に基づき、独自の360度空間デザインを生成します。


## Terms & Output Rights / 利用条件・作品の権利

The governing text is the [FURU Application Terms](LICENSE), revised 2026-10-08. / 正本は [FURU アプリ利用条件](LICENSE)（2026-10-08改定）です。

### Scope and applicability / 対象と適用範囲

These terms apply to the program, bundled prompts and accompanying documentation in versions distributed with or explicitly subject to them, only to material FURU has authority to license. These materials are the Covered Software. Third-party code, models, assets, external services, separately bundled projects and separately licensed parts retain their own terms. Merely being introduced in an article does not make something subject to these terms. / 本条件は、本条件を添付し、または配布元で適用対象として明示した版のプログラム、同梱プロンプト、付属文書のうち、FURUが許諾権限を持つ部分に適用します。以下、これらを「対象ソフトウェア」といいます。第三者のコード、モデル、素材、外部サービス、同梱の別プロジェクト、別のライセンスが明示された部分には、それぞれの条件が適用されます。紹介記事に掲載されていることだけを理由に、本条件の対象になることはありません。

This revision dated October 8, 2026 applies to distributions that include or explicitly identify this revision. It does not apply retroactively to existing release ZIPs or earlier versions. Check the LICENSE and applicable scope of the version you obtained. / 2026年10月8日改定の本条件は、この改定条件を添付または明示した配布版から適用します。既存のリリースZIPや過去版へ遡及適用しません。取得した版に添付されたLICENSEと適用範囲を確認してください。

### Use without application or permission / 申請せずにできること

You may run, copy, examine and modify the Covered Software free of charge for personal, business, internal and commissioned work. Integration into internal-only systems and connections to other tools in your own production process are also allowed. Ordinary use requires no application, prior contact or permission from FURU. / 対象ソフトウェアを、個人利用、業務利用、社内利用、受託制作のために無料で実行、複製、調査、改変できます。社内だけで使用するシステムへの組み込みや、自分の制作工程で他のツールと連携させることもできます。通常利用のための申請、事前連絡、FURUの許可は必要ありません。

Free integration into your own or another party's apps or services, and free provision to third parties, require no application, prior contact or permission from FURU outside the paid provision and bundling cases below. Preserve notices, terms and modification disclosures as described under Free sharing and introductions. Advertising revenue or voluntary donations alone do not count as paid provision. Requiring payment, purchase or membership fees to use the Covered Software or its functions does require prior permission. / 「事前に許可が必要なこと」の有料提供・有料商品への同梱等に該当しない、自社・他社のアプリや第三者向けサービスへの無料の組み込み・無料提供も、申請・事前連絡・FURUの許可は不要です。「無料の共有と解説」の表示・条件保持・改変明示の条件を守ってください。広告収益や任意の寄付があることだけでは有料提供としません。ただし、対象ソフトウェアやその機能の利用条件として料金、購入、会員費等の支払いを求める場合は、「事前に許可が必要なこと」の対象です。

You may publish, sell, monetize through advertising and deliver text, images, comics, videos and other works you create using the Covered Software as a tool. No fee, application, individual permission or credit to FURU is required for these works. External API and service fees, and the licensing or credit obligations of assets, voices and dependencies, remain separate. / 対象ソフトウェアを道具として制作した文章、画像、漫画、動画その他の成果物は、公開、販売、広告収益化、納品に利用できます。これらについて、FURUへの利用料、申請、個別許可、FURUのクレジット表記は必要ありません。外部APIや第三者サービスの料金、素材・音声・依存ソフトウェア等のライセンスやクレジット義務は別途確認してください。

### Uses requiring prior permission / 事前に許可が必要なこと

The following uses require prior permission from FURU. / 次の利用には、FURUの事前の許可が必要です。

- Selling, reselling or distributing the Covered Software or modified versions for a fee. / 対象ソフトウェアやその改変版を販売、転売、有料配布すること。

- Integrating code or functions of the Covered Software into your own or another party's paid products, paid apps or paid services for provision to third parties. Internal-only integration and tool connections within your own production process are outside this restriction. / 対象ソフトウェアのコードや機能を、自社・他社の有料商品、有料アプリ、有料サービスに組み込んで第三者へ提供すること。社内だけで使うシステムへの組み込みと、自分の制作工程でのツール連携は、この制限に含みません。

- Allowing third parties to use the Covered Software's functions through a website, API or other mechanism in exchange for payment. / 対象ソフトウェアの機能を、Webサービス、API、その他の仕組みを通じて第三者が利用できるようにし、その利用に対して料金を受け取ること。

- Providing copies or modified versions of the Covered Software as part of, an appendix to or a benefit of paid information products, teaching materials, courses, memberships or sales packages. Downloads restricted to purchasers, students or members, and benefits described as free, are included. / 対象ソフトウェアの複製や改変版を、有料の情報商材、教材、講座、会員サービス、販売パッケージの一部・付録・特典として提供すること。購入者・受講者・会員に限定したダウンロード提供や、無料の付録・特典という名目の場合も含みます。

Renaming, extracting parts, changing format or switching to download distribution does not avoid these conditions. Restrictions apply only to reproduction, adaptation and other uses of material FURU has rights to. General ideas, production techniques, independently developed implementations and uses permitted by law are not restricted. / 名称の変更、一部の抜き出し、形式の変換、ダウンロード提供への変更によって、この条件を回避することはできません。ただし、制限できる範囲は、FURUが権利を持つ部分の複製・翻案その他の利用に限られます。一般的なアイデア、制作手法、独自に開発した実装まで独占するものではなく、法令上認められる利用も制限しません。

Taking a commission, using the Covered Software yourself as a tool, and selling or delivering the completed work do not require this permission. / 利用者が制作の依頼を受け、自分で対象ソフトウェアを使い、完成した作品を販売・納品する行為には、この許可は必要ありません。

### Permission by email / メールでの問い合わせと許可

For a use requiring prior permission, contact FURU with the app concerned, intended use, recipients and whether payment is involved. / 事前許可が必要な利用を希望する場合は、対象のアプリ、利用方法、提供先、料金の有無を添えてFURUへお問い合わせください。

If FURU replies by email or another recorded method explicitly granting permission and stating its scope, you may use the software within that scope. No paper contract or seal is required. / FURUがメール等の記録の残る方法で、利用を許可する旨と対象範囲を返信した場合、その範囲で利用できます。紙の契約書や押印は必要ありません。

Sending an inquiry, receiving an automatic acknowledgment or receiving no reply does not grant permission. Consult FURU again before going beyond the permitted purpose, provision method or scope. Individually agreed terms take precedence. / 問い合わせの送信、受付の自動返信、返答がないことだけでは、許可を得たことにはなりません。許可された用途、提供形態、対象範囲を超えて利用する場合は、改めてご相談ください。個別に合意した条件がある場合は、その合意を優先します。

### Free sharing and introductions / 無料の共有と解説

Free redistribution, free integration and free provision outside the paid cases above are allowed if copyright notices, these terms and third-party licenses are retained and modifications are identified. Services that do not distribute the software must display these notices and conditions on an information page accessible to users. Do not imply that an unofficial version, product or service is official, endorsed or affiliated with FURU. / 「事前に許可が必要なこと」に該当しない無料再配布、無料の組み込み、無料提供は、著作権表示、本条件、第三者ライセンスを保持し、改変した場合は変更した旨を明示することで認めます。ソフトウェアを配布しないサービスでは、利用者が確認できる説明ページ等にこれらを表示してください。FURUの公式版、公認商品、提携サービスであると誤認させる表示はできません。

Independently authored Web articles, paid note articles, explanations, reviews, introductions and courses, whether paid or free, require no permission, prior contact or fee to FURU when copies or modified versions of the Covered Software are not included in the product. App screenshots and operation videos for introduction or explanation may be included insofar as FURU can authorize them. Ordinary links to distribution pages and lawful quotation are allowed. Check third-party rights in works or assets shown in screenshots and videos separately. / 自分で作成したWeb記事、note等の有料記事、解説、レビュー、紹介記事、講座は、有料・無料を問わず、対象ソフトウェアの複製や改変版を商品に含めなければ、FURUへの許可、事前連絡、FURUへの利用料は不要です。紹介・解説のためにFURUが権利を持つアプリの操作画面や操作動画を掲載すること、公式配布ページへの通常のリンク、法令上認められる引用も認めます。画面や動画に含まれる第三者の作品・素材等の権利は別途確認してください。

### Output rights and third-party terms / 作品の権利と第三者の条件

Using the Covered Software does not cause FURU to acquire rights in your outputs or cause these terms to apply to your outputs. / 対象ソフトウェアを利用したことを理由に、FURUが利用者の成果物の権利を取得したり、本条件を成果物に適用したりすることはありません。

If what you provide as an output includes copies or modifications of the Covered Software itself, these terms still apply to those parts. / ただし、成果物として提供するものに対象ソフトウェアそのものの複製・改変が含まれる場合、その部分には本条件が適用されます。

Whether copyright exists in an output and who owns it depend on law, creative contributions, contracts and other circumstances. FURU does not grant or guarantee clearance of third-party rights or AI service terms. / 成果物に著作権が成立するか、誰に権利が帰属するかは、法令、創作への関与、契約その他の事情によって決まります。FURUは、第三者の権利やAIサービスの条件まで許諾・保証するものではありません。

### Earlier versions and existing permissions / 過去版と既存の許諾

These terms do not revoke or narrow valid prior permissions granted under MIT, Creative Commons or other terms. Where earlier permissions remain valid for earlier versions or inherited parts, those parts may still be used under those earlier terms. / 過去にMIT、Creative Commonsその他の条件で有効に付与された許諾を、本条件によって取り消したり狭めたりすることはありません。過去版や引き継がれた部分について、従前の許諾が有効な場合は、その条件に従って利用できます。

Changes to the terms must identify the affected version and scope. An article or README update alone does not change permissions for a version obtained earlier or individually agreed permissions. / 条件を変更する場合は、対象の版と適用範囲を明示します。記事やREADMEの更新だけで、過去に取得した版の許諾や個別に合意した許可を変更することはありません。

See [previous notices and applicable scope](docs/licenses/previous-notices.md). / [以前の表示と適用範囲](docs/licenses/previous-notices.md)もご確認ください。

### Provision conditions / 提供条件

The Covered Software is provided as is. To the extent permitted by law, operation, fitness for a particular purpose, originality of outputs and non-infringement are not guaranteed. FURU is not liable for damage arising from use except where liability cannot be excluded by law. / 対象ソフトウェアは現状のまま提供します。法令で認められる範囲で、動作、特定目的への適合性、成果物の独自性や第三者権利の非侵害を保証しません。法令上免除できない責任を除き、FURUは利用に起因する損害について責任を負いません。

These are custom source-available terms. Restrictions on productization mean that they are not an open-source license under the OSI definition. / 本条件はソースコードを公開する独自の利用条件です。商品化等に制限があるため、OSIの定義によるオープンソースライセンスではありません。

---

## Terms of Use / 利用規約

### 1. Purpose / 目的

This tool is intended for creative assistance and is not designed to reproduce, substitute, or replicate existing copyrighted works, brands, or specific creators. / 本ツールは創作支援を目的としたものであり、既存の著作物、ブランド、または特定の作家・作品の再現や代替を目的とした利用は想定していません。

---

### 2. Prohibited Uses / 生成コンテンツに関する禁止事項

Users must not engage in the following: / ユーザーは、本ツールを使用して以下の行為を行ってはなりません。

#### (1) Intellectual Property Infringement / 著作権・知的財産権侵害
Reproducing or closely imitating existing backgrounds, recognizable styles, or protected elements. / 既存の背景、識別可能な画風、保護された要素の再現・近似模倣。
- Substantially reproducing or imitating the backgrounds or art settings of existing manga, anime, novels, films or games. / 既存の漫画、アニメ、小説、映画、ゲーム等の背景や美術設定を実質的に再現・模倣する行為
- Reproducing a particular creator's recognizable style. / 特定の作家のスタイル・作風を識別可能なレベルで再現する行為
- Unauthorized reuse of design elements. / デザイン要素の無断流用
- Unauthorized use of trademarks, logos or brand elements. / 商標、ロゴ、ブランド要素の無断使用

#### (2) Use of Infringing Content / 権利侵害コンテンツの利用
Generating, distributing, or monetizing infringing or derivative content without permission. / 許可を得ず、権利を侵害する生成物や派生物を生成・配布・収益化する行為。
- Generating, publishing, selling or sharing content that infringes third-party copyright, trademark, publicity or other rights. / 第三者の著作権、商標権、パブリシティ権等を侵害するコンテンツの生成、公開、販売、共有
- Unauthorized commercial use of content resembling existing intellectual property. / 既存IPに類似したコンテンツの無断商用利用

#### (3) Facilitation of Misuse / 不正利用の助長
Creating or sharing tools intended for infringement. / 権利侵害を意図したツールを作成・共有する行為。
- Creating or sharing prompts, templates or workflows intended to infringe rights. / 権利侵害を目的としたプロンプト、テンプレート、ワークフローの作成・共有
- Encouraging others to infringe rights. / 他者に侵害行為を促す行為

#### (4) Illegal Activities / 法令違反・不正行為
Any illegal or harmful use. / 違法または有害な利用。
- Violating applicable law. / 適用される法令に違反する行為
- Use for fraud, misconduct or harmful purposes. / 詐欺、不正行為、または有害な目的での利用

---

### 3. Responsibility & Ownership / 生成物の責任および権利

The user bears full responsibility for generated content. / 生成されたコンテンツの内容および利用に関するすべての責任はユーザーに帰属します。

The developer does not claim ownership of generated content but does not guarantee its legality or usability. / 本ツールの利用によって生成されたコンテンツについて、開発者は著作権その他の権利を主張しませんが、その適法性・利用可能性を保証するものではありません。

---

### 4. Disclaimer / 免責事項

This tool is provided "as is" without any warranties. / 本ツールは「現状有姿（AS IS）」で提供され、明示または黙示を問わず、いかなる保証も行いません。

The developer shall not be liable for any damages arising from use. / 開発者は、本ツールの利用または生成コンテンツに起因するいかなる損害についても責任を負いません。

---

### 5. Infringement & Takedown / 権利侵害への対応

Upon receiving a valid claim, the developer may: / 権利侵害の申し立てがあった場合、開発者は独自の判断により以下の対応を行う場合があります。

Remove content, restrict usage, or take necessary actions. / コンテンツの削除、利用の制限、その他必要な対応。
- Requesting removal of, or removing, the content concerned. / 該当コンテンツの削除要請または削除
- Restricting or prohibiting use. / 利用の制限または禁止
- Taking measures such as stopping public access to the repository. / リポジトリの公開停止等の措置

---

### 6. Changes / 規約の変更

These terms may be updated without notice. / 本規約は予告なく変更される場合があります。

---

### 7. Governing Law / 準拠法

These terms are governed by the laws of Japan. / 本規約は日本法に準拠します。

---

## Browser security / ブラウザーの安全対策

This update further strengthens security while preserving the existing creation workflow. / 今回の更新では、既存の制作フローを保ちながらセキュリティをさらに強化しました。

The app limits script execution and API connections with Content Security Policy, disables embedded frames and form submissions, and sends no referrer. Open the app directly in its own tab. API keys remain sensitive while in memory; these protections do not guarantee the absence of every vulnerability. Every deployment checks dependencies, source safeguards and the built policy. / CSPでスクリプト実行・API接続先を制限し、埋め込み表示とフォーム送信を禁止、参照元情報を送信しません。アプリは直接タブで開いてください。メモリー内のAPIキーも機密情報であり、すべての脆弱性がないことを保証するものではありません。毎回のデプロイで依存ライブラリ・ソースの防御・ビルド後の設定を検査します。

## AI Manga Creative Suite / AIまんが制作エコシステム

This app is one component in a broader AI-assisted manga and story production workflow. / このアプリは、AIを活用した漫画・物語制作ワークフローの一部です。

### Ecosystem Components / 構成システム

#### 1. Super FURU AI 4-koma System / Super FURU AI 4コマシステム
A system specialized in creating 4-panel manga with AI. / AIを活用した4コマ漫画制作に特化したシステムです。
- [Explanation / 解説](https://note.com/happy_duck780/n/ndf063558c1f5)
- [Demo / デモ](https://furuyan1234.github.io/nano-banana-pro/)
- [Code / コード](https://github.com/FURUYAN1234/nano-banana-pro)

#### 2. AI Story Maker
A tool for generating creative stories and plots using AI. / AIを用いてクリエイティブなストーリーやプロットを生成するツールです。
- [Explanation / 解説](https://note.com/happy_duck780/n/nd3d972922868)
- [Demo / デモ](https://furuyan1234.github.io/story-maker/)
- [Code / コード](https://github.com/FURUYAN1234/story-maker)

#### 3. AI Character Sheet Maker / AIキャラクターシートメーカー
An assistant for designing detailed character sheets and settings. / 詳細なキャラクターシートや設定をデザインするための支援ツールです。
- [Explanation / 解説](https://note.com/happy_duck780/n/neccbebd7d957)
- [Demo / デモ](https://furuyan1234.github.io/character-sheet-maker/)
- [Code / コード](https://github.com/FURUYAN1234/character-sheet-maker)

#### 4. AI Comic Translation Tool / AI漫画翻訳ツール
A tool for translating manga into 10 languages using AI. / AIを使って漫画を10言語に翻訳するツールです。
- [Explanation / 解説](https://note.com/happy_duck780/n/ne462dfc55ec8)
- [Demo / デモ](https://furuyan1234.github.io/comic-translation/)
- [Code / コード](https://github.com/FURUYAN1234/comic-translation)

#### 5. 360° AI Panorama Generator / 360度AIパノラマ生成ツール
A tool that generates seamless 360-degree spatial backgrounds to provide background assets for manga and video. / シームレスな360度空間の背景を生成し、漫画や動画の背景素材として提供するツールです。
- [Explanation / 解説](https://note.com/happy_duck780/n/nb53b121fef88)
- [Demo / デモ](https://furuyan1234.github.io/panoforge/)
- [Code / コード](https://github.com/FURUYAN1234/panoforge)

#### 6. AI Voice Comic Maker / AI音声コミックメーカー
A tool to automatically convert static 4-koma manga into fully voiced animated videos. / 静止画の4コマ漫画をフルボイスの動画に自動変換するツールです。
- [Explanation / 解説](https://note.com/happy_duck780/n/ndc6533c1512f)
- [Code / コード](https://github.com/FURUYAN1234/ai-voice-comic-maker)
---

Developed by **FURU** / 開発：**FURU**

| **Tool / ツール** | **Role / 役割** | **Repository / リポジトリ** |
| --- | --- | --- |
| Super FURU AI 4-koma System / Super FURU AI 4コマシステム | AI 4-panel manga generation / AI 4コマ漫画生成 | [nano-banana-pro](https://github.com/FURUYAN1234/nano-banana-pro) |
| Story Maker | Story and plot generation / 物語・プロット生成 | [story-maker](https://github.com/FURUYAN1234/story-maker) |
| AI Character Sheet Maker / AIキャラクターシートメーカー | Character reference generation / キャラクター資料生成 | [character-sheet-maker](https://github.com/FURUYAN1234/character-sheet-maker) |
| AI Comic Translation Tool / AI漫画翻訳ツール | Manga translation and regeneration / 漫画翻訳・再生成 | [comic-translation](https://github.com/FURUYAN1234/comic-translation) |
| 360° AI Panorama Generator / 360度AIパノラマ生成ツール | 360-degree background generation / 360度背景生成 | [panoforge](https://github.com/FURUYAN1234/panoforge) |
| AI Voice Comic Maker / AI音声コミックメーカー | Voice comic video generation / フルボイス動画化 | [ai-voice-comic-maker](https://github.com/FURUYAN1234/ai-voice-comic-maker) |
| Monogatari Buzz Maker / 物語バズメーカー | Trend research and creative planning / トレンド調査・創作企画 | [viral-radar](https://github.com/FURUYAN1234/viral-radar) |
| Narration Video Maker / ナレーション動画メーカー | Video generation with narration, subtitles, and BGM / ナレーション・字幕・BGM付き動画生成 | [gemini-narration-studio](https://github.com/FURUYAN1234/gemini-narration-studio) |

## 📋 ChangeLog / 📋 更新履歴

### v1.4.6 (2026-10-07)

- Security: CSP and frame protection, dependency updates, and mandatory release checks. / CSP・埋め込み防御・依存更新・公開前検査を追加。

### v1.4.5 (2026-10-07)

- Gemini images, panorama expansion and Model Chain now use Nano Banana 2.1 / Interactions. Browser requests omit the unsupported SDK revision header. / Gemini画像生成・パノラマ拡張・Model ChainをNano Banana 2.1へ更新し、ブラウザー通信を妨げるSDKヘッダーを除きました。
- API key entry and dialog changes reset visibility to masked; the reveal button remains available. / APIキーの入力と画面開閉では伏せ字へ戻し、確認用の表示ボタンは保持します。

### v1.4.4 (2026-10-04)

Clarify free personal, business and commissioned use and monetization of users' own outputs. Paid redistribution, paid services based on the app and bundling with paid information products require prior written permission. Valid prior grants and third-party terms remain available. / 個人・業務・受託制作での無料利用と、自分の投稿・作品の収益化を明確化。アプリ本体の有料再配布・有料サービス化・有料商材への同梱は事前許可制です。過去の有効な許諾と第三者の条件は保持します。

### v1.4.3 (2026-10-01)

- **[OpenAI Text / Vision]** All 11 models are selectable with GPT-6.1 Sol as the default. Each text/vision call starts from the selection and moves downward, with selected/attempted/adopted status and prices. / シーン・スタイル提案と画像解析に11モデルの選択を追加しました。GPT-6.1 Solを既定とし、選択モデルから下位への切り替え、試行・採用の表示、説明・料金表示に対応します。
- **[Response Validation / 応答検証]** Reject incomplete/refused output and stop authentication, access and quota retry cascades. / 途中終了・拒否の応答を拒否し、認証・アクセス・利用枠エラーによる連続再試行を止めます。

### v1.4.2 (2026-09-16)

- **[OpenAI image fallback / OpenAI画像フォールバック]** GPT Image 2.5 Sunburst/xhigh is now the primary OpenAI image model. Retry-eligible failures fall back to GPT Image 2.0/high within the existing shared 600-second limit. / OpenAI画像生成の優先モデルをGPT Image 2.5 Sunburst/xhighに変更しました。リトライ対象の失敗時は、従来の共有600秒上限内でGPT Image 2.0/highに切り替えます。

### v1.4.1 (2026-07-22)

- **[Release Guard / リリースガード]** The standard `npm run deploy` path now runs the release preflight first, and the preflight derives the required bilingual notes from the current package version. A Pages deployment therefore stops before publication when the version badge, current README wording, provider-isolation guard, or the corresponding bilingual release notes are missing. / 標準の `npm run deploy` は必ず先にリリース事前検査を実行し、事前検査は現在の package version から必要な英日併記リリースノートを導出します。そのため、版表示・現行READMEの表記・プロバイダ分離ガード・対応する英日リリースノートのいずれかが欠ける場合、Pages公開前に停止します。

### v1.4.0 (2026-07-22)

- **[Fix / Provider Isolation]** A provider change now clears every image, panorama, viewer, and retry reference, so a Gemini-created image cannot be continued through OpenAI or the reverse. Model Chain now labels each fallback as provider-local and states explicitly that Gemini and OpenAI never cross-fallback. / プロバイダ変更時に素材・パノラマ・ビューワー・再試行参照をすべて消去し、Geminiで作成した画像をOpenAIで継続する、またはその逆を防止しました。Model Chainもプロバイダ内フォールバックであることを明示します。

### v1.3.9 (2026-07-22)

- **[Feature / Verified API Flow]** Added the spatial-ledger panorama routine: bounded scene inventory, ledger-guided panorama prompting, semantic continuity QA, one fail-closed regeneration, and the existing seam repair/viewer handoff. Gemini and OpenAI completed real browser/API runs; the OpenAI route completed Vision analysis, `gpt-image-2` panorama generation, seam repair, and a 1536x1024 viewer check. / 空間台帳、意味的QA、最大1回のフェイルクローズ補正、既存シーム修復・ビューワー連携を追加。GeminiとOpenAIの実APIブラウザ実行で確認済みです。
- **[Reliability]** Aligned the OpenAI overlay timeout with the `gpt-image-2` request timeout at 600 seconds (10 minutes), so the UI no longer preempts a still-valid long-running image job. / OpenAI画像ジョブのUI待機上限をリクエスト上限と同じ600秒（10分）に統一しました。
- **[Docs]** Documented the routine, its scene-continuity contract, QA boundary, OpenAI re-creation limitation, and required final viewer inspection. / 連続性の契約、QA境界、OpenAI再生成の制約、最終ビューワー確認をREADMEに明記しました。

### v1.3.8 (2026-06-19)
- Updated Gemini image generation to `gemini-3.1-flash-image` Primary with `gemini-2.5-flash-image` compatibility fallback. Because 360° generation may not always be stable on the newest model alone, the compatibility fallback remains. / **[Fallback Chain]** Gemini画像生成を `gemini-3.1-flash-image` Primary + `gemini-2.5-flash-image` 互換フォールバックに更新しました。360度生成は最新モデルだけでは安定しない可能性があるため、互換フォールバックは維持しています。
- Updated text suggestion and vision analysis to `gpt-4.1` -> `gpt-4.1-mini` -> `gpt-4.1-nano` -> `gpt-4o`, and synced `gpt-image-2` generation with `output_format: png` and a 600-second timeout. / **[OpenAI]** テキスト提案・画像解析を `gpt-4.1` -> `gpt-4.1-mini` -> `gpt-4.1-nano` -> `gpt-4o` に更新し、`gpt-image-2` 生成は `output_format: png` と600秒タイムアウトに同期しました。

### v1.3.7 (2026-05-31)
- Fixed a synchronization bug where the header status dot's title and aria-label remained "Unconnected" after a successful API connection. It now accurately reflects Gemini or OpenAI connection states. / **[Bugfix]** API接続後、ヘッダーのステータスドットの表示（title / aria-label）が「未接続」のまま残る不整合を修正し、Gemini/OpenAIそれぞれの接続状態が正しく反映されるように改善しました。
- Moved the API key input inside a form, added `type="button"` to the toggle button, and added an Enter key submit handler to resolve browser and Playwright DOM warnings. / **[Bugfix]** APIキー入力欄をform内に移動し、表示トグルボタンに `type="button"` を追加。またEnterキー送信時のハンドラーを追加し、ブラウザおよびPlaywrightでのDOM警告を解消しました。

### v1.3.6 (2026-05-30)
- Added AI Model Fallback Chain Viewer. Click "⚙ Model Chain" in the header to view all API model configurations and priorities in plain text, with clipboard copy support and revision history. / **[Feature]** AIモデルフォールバックチェーンビューア機能を追加。ヘッダーの「⚙ Model Chain」ボタンからモーダルを開き、全APIモデルの構成・優先順位をプレーンテキストで表示・クリップボードにコピー可能。更新履歴セクションも搭載。
- Synced Zenith Protocol model names in README to the current panorama.js configuration. / **[Docs]** README内のZenith Protocolセクションのモデル名を現在の panorama.js の構成に同期し、最新化しました。

### v1.3.5 (2026-05-28)
- **[Fix / Deploy]** OpenAIでのつなぎ目修正およびGeminiでのオリジナル画像維持機能の復元を完了し、ゴミファイルや固有名詞等の最終監査に合格した正式版をデプロイしました。 / Finalized fix for panorama seams, restored original image preservation in Gemini mode, and passed all junk file and proper noun audits. Deployed production version.

### v1.3.3 (2026-05-28)
- Completely cleaned up and standardized model list configurations by removing hallucinated model names (e.g. gemini-3.1, gemini-2.5, gpt-4.1) and syncing to stable production models. / **[Model Sanitization]** 過去の自動化・実験の痕跡として残存していた「実在しない架空のプレビューモデル名（gemini-3.1, gemini-2.5, gpt-4.1 等）」をコードおよびドキュメントから完全に排除し、現在実在する安定モデル（gemini-2.0-flash, gpt-4o 等）に正常化。

### v1.3.2 (2026-05-28)
- Implemented the "Split-Swap-Blend" pipeline to automatically repair seam distortions and cuts at the left-right edges of 360° panoramas. Ensures fully seamless spatial backgrounds by pixel-blending the seam on a canvas. / **[Feature]** 360°画像の両端接合部における歪み・切れ目を自動修復する「Split-Swap-Blend（分割・スワップ・ピクセルブレンド）パイプライン」を実装。Geminiで生成されたパノラマ画像のシームをキャンバス上でピクセルフェザー補間することで、完全につなぎ目のない空間背景を実現。

### v1.3.4 (2026-05-28)
- **[Model Sanitization / Deploy]** Completely removed remaining legacy/hallucinated model names from documentation to ensure absolute system stabilization, and executed production deploy. / ドキュメント内に残存していた架空のプレビューモデル名を完全に排除し、正式版デプロイを行いました。

### v1.3.1 (2026-05-26)
- Completed final bug checks, audits, and cleanup of temp files and sensitive information. Stable production release. / **[Feature]** バグチェック、およびゴミファイル・個人情報・他プロジェクト固有名詞の完全な監査とクリーンアップを完了。安定性を向上させたプロダクションリリース。

### v1.3.0 (2026-05-25)
- [Feature] Published the production version with Gemini API compatibility updates, request-specific timeouts for both providers, and Three.js viewer fixes for texture disposal, hidden rendering loops, OrbitControls cleanup and capture flicker. / **[Feature]** プロダクション環境への正式デプロイ。Gemini API非推奨化対応、両APIタイムアウト動的制御、およびThree.jsビューワーのメモリ・リソースリーク（GPUテクスチャ解放漏れ、非表示時の描画ループ継続、OrbitControlsの破棄漏れ、キャプチャ時の画面チラツキ）の修正がすべて適用された安定版を公開。
- Enhanced Gemini panorama expansion with 5-point visual consistency checks and element preservation rules to prevent AI from adding unintended objects or changing art style across the panorama. / **[Improve]** Gemini 360°パノラマ拡張プロンプトに「5点視覚統一チェック」（画風・ライティング・コントラスト・彩度・色温度）と「元画像に存在しない要素の追加禁止」ルールを導入。スパースな空間が勝手に家具で埋められる問題と、パノラマの片側だけ画風が変わる問題を改善。
- Added art style analysis and character description instructions to OpenAI Vision prompt, fixing issues where anime art style was lost and characters were omitted during image-to-360° conversion. / **[Improve]** OpenAI Vision解析プロンプトにアートスタイル分析とキャラクター描写指示を追加。画像ドロップ→360°変換時にアニメ画風がフォトリアルに変わる問題と、人物キャラクターが消失する問題を修正。
- Fixed OpenAI image generation timeout from 60s to 300s (5 minutes) to match gpt-image-2's actual generation time. The 60s value was incorrectly set when timeouts were introduced in v1.2.6. / **[Bugfix]** OpenAI画像生成（gpt-image-2）のタイムアウトが60秒に設定されていたバグを修正。公式の生成時間（2〜5分）に合わせて300秒（5分）に変更。v1.2.6で導入されたタイムアウト制御の設定値ミスが原因。

### v1.2.9 (2026-05-25)
- [Bugfix] Disposed OrbitControls explicitly when destroying the viewer to prevent internal event-listener leaks. / **[Bugfix]** Three.js ビューワーの破棄（`destroy()` 実行）時において、`OrbitControls` が明示的に解放（`dispose()`）されておらず、内部イベントリスナーがメモリリークを引き起こすバグを修正しました。
- [Bugfix] Used renderer.setSize(..., false) to prevent temporary canvas CSS resizing and severe layout flicker during high-resolution capture. / **[Bugfix]** 高解像度キャプチャの実行時に、CanvasのCSSスタイルサイズが一瞬変更されることで画面レイアウトが崩れて激しくチラつく表示バグを、`renderer.setSize(..., false)` の指定により解決しました。

### v1.2.8 (2026-05-25)
- [Bugfix] Released the previous material.map texture on a new load to prevent retained GPU allocations and browser-tab crashes. / **[Bugfix]** Three.js 3Dビューワーにおいて、新規ロード時に古いテクスチャオブジェクト（`material.map`）が明示的に解放されずにGPUメモリ上に残り続け、ブラウザタブクラッシュを招くメモリリークバグを修正しました。
- [Bugfix] Stopped the requestAnimationFrame rendering loop after returning from the viewer to the settings screen, avoiding unnecessary CPU/GPU use. / **[Bugfix]** ビューワーを閉じて元の設定画面に戻った際にも、裏で 3D レンダリングループ（`requestAnimationFrame`）が回り続け、無駄なCPU/GPUリソースを消費し続けるリークバグを修正しました。

### v1.2.7 (2026-05-25)
- [Bugfix] Updated IMAGE_MODELS to the then-current image models, including gemini-2.0-flash, to resolve 404 failures from retired Gemini models. / **[Bugfix]** 廃止された旧Gemini画像生成モデルの404エラーを解消するため、`IMAGE_MODELS` の優先リストを最新モデル（`gemini-2.0-flash` 等）に更新しました。
- [Bugfix] Replaced the uniform 25-second timeout with request-specific limits, allowing 60 seconds for image generation. / **[Bugfix]** 前回の25秒一律タイムアウトにより画像生成がタイムアウト失敗する不整合を解消するため、タイムアウト制御をリクエストタイプに応じて動的化（画像生成時は60秒に自動延長）しました。

### v1.2.6 (2026-05-25)
- [Feature] Added timeouts to all OpenAI requests: 25 seconds for text/vision, 60 seconds for image generation and 30 seconds for downloads. / **[Feature]** OpenAI APIの全リクエストに対してもタイムアウト制御（テキスト・ビジョン: 25秒、画像生成: 60秒、ダウンロード: 30秒）を導入し、両APIにおける網羅的なフリーズ対策を適用しました。

### v1.2.5 (2026-05-25)
- [Feature] Updated scene/style text-generation priorities to gemini-2.0-flash and gemini-flash-latest, with alternatives including gemini-1.5-pro. / **[Feature]** Gemini API非推奨化対応として、テキスト生成（シーン/スタイル提案）の優先モデルを `gemini-2.0-flash` / `gemini-flash-latest` に更新し、フォールバック先に `gemini-1.5-pro` などを配置。
- [Feature] Added a 25-second timeout and automatic alternate-model attempts after timeouts or exceptions to avoid indefinite waiting during API calls. / **[Feature]** API呼び出し中のフリーズを防ぐため、25秒のタイムアウト制御を追加し、タイムアウトや例外発生時には自動でフォールバックモデルへ移行して再試行する仕組みを導入。

### v1.2.4 (2026-05-23)
- Implemented OpenAI model optimization and fallback chains for both text and vision requests. / **[Feature]** OpenAI APIのモデル最適化およびテキスト・ビジョンの双方へのフォールバックチェーンを実装。
  - Text generation fallback: `gpt-4o` -> `gpt-4o-mini`. / テキスト生成（スタイル提案、シーン提案）: `gpt-4o` -> `gpt-4o-mini` のフォールバックチェーンを導入。
  - Vision analysis fallback: `gpt-4o` -> `gpt-4o-mini`. / 画像解析（Vision）: `gpt-4o` -> `gpt-4o-mini` のフォールバックチェーンを導入。
  - Improved resilience against temporary API failures and optimized to prioritize fast, cost-efficient models. / API一時障害時の耐障害性を向上させ、高速・低コストなモデルを優先的に利用するよう最適化しました。
- Updated OpenAI generation expected time to 2-5 minutes and implemented a 5-minute timeout. / **[Improve]** OpenAIモードでの完了予測時間案内を「約2〜4分」から「約2〜5分」に改め、5分タイムアウト処理（内部タイマー）を導入。

### v1.2.3 (2026-05-19)
- Renamed the top-right API settings button to "API Switch" for clarity. / **[Improve]** 右上のAPI設定ボタンの表示名を「API切替」に変更し、役割をより明確にしました。

### v1.2.2 (2026-05-18)
- Added zombie node process cleanup in the startup batch file to prevent port conflict errors on launch. / **[Bugfix]** 起動時のポート競合エラーを防ぐため、バッチファイル（`start_panorama_generator.bat`）にゾンビプロセス（Node.js）のクリーンアップ処理を追加。

### v1.2.1 (2026-05-18)
- Implemented Dual-API Architecture, officially supporting OpenAI API (DALL-E 3 & GPT-4o) alongside Gemini. Automatically detects key format and switches UI/backend logic. / **[Feature]** Dual-API アーキテクチャを実装。Gemini APIに加えて **OpenAI API (DALL-E 3 & GPT-4o)** を公式サポート。APIキーの形式 (`sk-`) を自動判別し、UIとバックエンドロジックをシームレスに切り替えます。
- Added a processing timer and clear wait-time annotations (2-5 minutes) for OpenAI mode generation and expansion. / **[Feature]** OpenAIモード（DALL-E 3）での画像生成・拡張時に、2〜5分の待機時間を示すタイマーと明確な案内を表示するようUIを改善。
- Separated the API engine status badge and the settings button in the top right header for better visibility. / **[Improve]** メイン画面右上の「API設定」ボタンを改修し、現在のエンジン（Gemini/OpenAI）を表示するバッジと、設定を開くボタンを完全に分離して視認性を向上。
- Revamped API Key Modal UI with Smart Gate design (status indicator color change, usage-based billing warning). / **[Improve]** APIキー入力モーダルのUIを刷新。他アプリと共通のスマートゲート仕様（状態インジケータ色変更、従量課金警告）を導入。
- Major README rewrite to highlight Dual-API architecture, clearly documenting OpenAI API pay-as-you-go costs and the "re-creation" limitations of DALL-E 3 panorama expansion. / **[Document]** READMEを大幅に加筆・修正。Dual-APIアーキテクチャの解説を強化し、OpenAI API利用時の「従量課金」および「パノラマ拡張における再構築（近似生成）仕様」の注意事項を明記。

### v1.1.5 (2026-05-18)
- Fixed startup batch file name. / **[Bugfix]** 起動バッチファイル名を修正 (start_panorama_generator.bat)

### v1.1.4 (2026-05-15)
- Optimized processing step display to dynamically switch between normal image generation and 360° panorama expansion. / **[Improve]** 処理中の進行状況（ステップ）表示を動的生成方式に変更し、通常画像生成時と360°パノラマ拡張時の表示を適正化しました。
- Removed height constraint on 360° preview to display the full equirectangular panoramic strip correctly. / **[Improve]** 360°プレビュー画像の表示制限を撤廃し、2:1比率のワイドストリップとして自然に表示されるように修正。
- Unified 360° image download from the main menu to save as JPEG with GPano XMP metadata and timestamped filenames. / **[Improve]** メニュー画面の「ダウンロード」ボタンからも、GPano XMPメタデータ付きのJPEG形式で360°パノラマ画像を保存できるように統一（タイムスタンプ付きファイル名）。
- Removed panorama-related instructions from the Step 1 prompt to ensure the initial generated image uses a standard, non-distorted composition. / **[Bugfix]** テキストからの初回画像生成（Step 1）で誤って360°風の歪んだ画像が生成されてしまう問題を防ぐため、プロンプトからパノラマ関連の指示を削除し、通常の構図で出力されるように修正。

### v1.1.3 (2026-05-14)
- Fixed an issue where the AI suggestion feature would leak the AI's internal thought process into the input field by tightening the prompt and adding post-processing logic to extract only the final output. / **[Bugfix]** AI提案機能（シーン/スタイル）において、一部のAIモデル（Gemini 2.0/2.5等）が思考プロセス（Chain of Thought）を出力してしまい入力窓に混入する問題を修正。プロンプトの厳格化と後処理ロジックの追加により、最終的な提案内容のみを抽出するように改善しました。

### v1.1.2 (2026-05-14)
- Improved content policy error messages to clarify that retrying might succeed due to safety filter false positives. / **[Improve]** ユーザーの混乱を防ぐため、安全フィルタによるブロック時のエラーダイアログで「そのままリトライで成功する可能性がある」旨を明記するように修正。

### v1.1.1 (2026-05-14)
- Added version badges to the main header and API settings modal for better visibility. / **[Feature]** アプリタイトルの横とAPI設定モーダルのヘッダーに現在のバージョンを示すバッジ（vX.Y.Z）を表示。UIの利便性と管理性を向上。

### v1.1.0 (2026-05-14)
- Major prompt engineering overhaul for 360° panorama expansion. Seamless left-right edge connection is now enforced as the absolute top priority with detailed technical constraints for equirectangular projection. / **[Major]** 360°パノラマ拡張プロンプトを大幅強化。左右端のシームレス接続を「最優先事項」として明示し、equirectangular投影の数学的制約（360°ラップ、極点歪み、バレル歪曲）を技術的に詳述。つなぎ目の見えるパノラマ生成を大幅に改善。
- Text-to-image generation prompt now optimized for wide-angle composition suitable for 360° conversion. / **[Improve]** テキスト→画像生成プロンプトも360°変換を前提とした広角構図に最適化。

### v1.0.9 (2026-05-14)
- Added GPano XMP metadata injection into JPEG binary on 360° image save. Images now auto-open in 360° viewer on Google Photos, Facebook, etc. / **[Feature]** 360°画像保存時にGPano XMPメタデータをJPEGバイナリに埋め込む機能を実装。Google Photos、Facebook等で自動的に360°ビューワーが起動する形式で出力。
- Changed output format from PNG to JPEG (95% quality) to support XMP metadata embedding. / **[Change]** 保存形式をPNGからJPEG (95%品質) に変更。XMPメタデータ埋め込みのため。

### v1.0.8 (2026-05-14)
- Replaced proprietary style names (Ghibli, Shinkai) with generic descriptions for compliance. / **[Fix]** スタイルプリセットから固有名詞（「ジブリ風」「新海誠風」）を削除し、一般的な表現（「手描きアニメ風」「光彩写実アニメ」）に置換。商標・著作権のコンプライアンス対応。

### v1.0.7 (2026-05-14)
- Added read-only viewer mode for pre-existing 360° images. Hides the save button to prevent quality-degraded re-saves; capture function remains available. / **[Feature]** 既存の360°画像をビューワーで開いた際、「360°画像を保存」ボタンを非表示にするリードオンリーモードを実装。元画像の劣化コピー保存を防止し、キャプチャ保存のみ有効に。

### v1.0.6 (2026-05-14)
- Massively expanded scene presets to 65+ across 7 categories for one-click generation. / **[Feature]** シーンプリセットを7カテゴリ計65個以上に大幅拡充（都市・街、自然・風景、ファンタジー・SF、室内・建築、時代・歴史、天候・時間帯）。ポチポチ選ぶだけで生成可能に。
- Doubled style presets to 24 (added Ghibli, Shinkai, vaporwave, ink wash, Art Nouveau, etc.). / **[Feature]** スタイルプリセットを24種に倍増（ジブリ風、新海誠風、ヴェイパーウェイブ、水墨画、アールヌーヴォー等を追加）。
- Added Scene AI suggestion button for creative scene proposal. / **[Feature]** シーンAI提案ボタンを追加。AIがランダムなシーン説明を提案。
- Removed temporary scripts and Vite template leftovers. / **[Cleanup]** 不要な一時スクリプトおよびViteテンプレート残骸を削除。

### v1.0.5 (2026-05-14)
- Added scene preset chips, free input textarea, and AI suggestion button. / **[Feature]** シーンの説明にプリセットチップ＋自由入力窓＋AI提案ボタンのUIを追加。
- Implemented style AI suggestion based on scene description. / **[Feature]** スタイルAI提案機能を実装。シーンに基づいて最適なスタイルをAIが推薦。

### v1.0.4 (2026-05-14)
- **[Docs]** AI Manga Creative Suite / AIまんが制作エコシステムの項目にNoteの解説リンクを追加し、一覧を最新化しました。 / Updated the Ecosystem list and added the Note explanation link.
- Updated repository description and topic tags. / **[Docs]** リポジトリのAbout欄にトピックタグを付与し、説明文を更新しました。

### v1.0.3 (2026-05-14)
- Fixed documentation formatting. / **[Docs]** ドキュメントフォーマットの修正と更新を行いました。

### v1.0.0 - v1.0.2 (2026-05-13)
- Initial releases of 360° AI Panorama Generator. / **[Feature]** 360° AI Panorama Generator の初版およびバグフィックス版をリリース。Gemini 2.0 Flash APIを利用したシームレスな360度パノラマ背景の生成と、Three.jsによるインタラクティブビューワー、Zenith Protocolによるフォールバック機構を搭載。
