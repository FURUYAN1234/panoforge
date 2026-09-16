# Deploy Rules: background

共通手順の正本は `C:\Users\sx717\Antigravity\docs\unified_release_completion.md`、契約は `scripts\release-apps.json` の `background`、実行入口は `scripts\publish_app_release.ps1` である。旧Background専用transactionは廃止済み。

- GitHub Pages、GitHub Release、GitHub source ZIP由来の `C:\background-main`、最終公開検証を共通レシートで完遂する。
- Hugging Faceは対象外。
- 全Node testsと `npm run release:app-preflight` は共通transactionのapp validationとして必須。
- フルバックアップは別の明示操作であり、自動開始しない。

```powershell
powershell -ExecutionPolicy Bypass -File ..\scripts\publish_app_release.ps1 -App background -NotesPath <absolute-vX.Y.Z.md> -ReleaseTitle "360 AI Panorama Generator vX.Y.Z"
```
