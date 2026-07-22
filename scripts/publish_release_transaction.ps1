<#
Runs the operational half of a Background release as one transaction:
push existing release-candidate commit -> annotated tag -> bilingual GitHub
Release -> Pages -> extracted C-drive copy.

The release candidate itself must already be committed and clean. This script
does not guess which source files belong to a release.
#>
param(
    [Parameter(Mandatory = $true)][string]$Version,
    [Parameter(Mandatory = $true)][string]$NotesPath,
    [Parameter(Mandatory = $true)][string]$ReleaseTitle
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$workspace = Split-Path -Parent $root
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$receiptPath = Join-Path $workspace "backups\background_release_transaction_$stamp.json"
$receipt = [ordered]@{ version = "v$Version"; started = (Get-Date -Format o); stages = [ordered]@{} }
function Complete-Stage([string]$Name, [hashtable]$Evidence) { $receipt.stages[$Name] = $Evidence; $receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $receiptPath -Encoding utf8 }
function Invoke-Required([string]$Name, [scriptblock]$Action) { & $Action; if ($LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE." } }

if ((Get-Content -Raw (Join-Path $root 'package.json') | ConvertFrom-Json).version -ne $Version) { throw "package.json is not v$Version." }
if (-not (Test-Path -LiteralPath $NotesPath)) { throw "Release notes are missing: $NotesPath" }
if (git -C $root status --porcelain) { throw 'Release candidate is not clean; commit the intended source before starting the transaction.' }

Invoke-Required 'release preflight' { node (Join-Path $root 'scripts\release_preflight.mjs') --notes $NotesPath }
Invoke-Required 'regression tests' { node --test (Join-Path $root 'tests\provider-session.test.mjs') (Join-Path $root 'tests\fallback-chain-viewer.test.mjs') (Join-Path $root 'tests\processing-timeout.test.mjs') (Join-Path $root 'tests\api-key.test.mjs') (Join-Path $root 'tests\spatial-ledger.test.mjs') (Join-Path $root 'tests\release-preflight.test.mjs') }
Invoke-Required 'production build' { npm.cmd run build }
Complete-Stage 'candidate' @{ head = (git -C $root rev-parse HEAD); preflight = 'passed'; tests = 'passed'; build = 'passed' }

Invoke-Required 'push source' { git -C $root push origin HEAD:master }
Invoke-Required 'create annotated tag' { git -C $root tag -a "v$Version" -m "Background v$Version" }
Invoke-Required 'push tag' { git -C $root push origin "v$Version" }
Invoke-Required 'create bilingual GitHub Release' { gh release create "v$Version" --repo FURUYAN1234/panoforge --title $ReleaseTitle --notes-file $NotesPath }
Complete-Stage 'github_release' @{ tag = "v$Version"; url = "https://github.com/FURUYAN1234/panoforge/releases/tag/v$Version" }

Invoke-Required 'deploy Pages' { npm.cmd run deploy }
$deadline = (Get-Date).AddMinutes(10)
do {
  $pages = gh api repos/FURUYAN1234/panoforge/pages/builds/latest | ConvertFrom-Json
  if ($pages.status -eq 'built') { break }
  Start-Sleep -Seconds 15
} while ((Get-Date) -lt $deadline)
if ($pages.status -ne 'built') { throw "Pages did not reach built state: $($pages.status)" }
Complete-Stage 'pages' @{ commit = $pages.commit; status = $pages.status }

$download = Join-Path $env:TEMP "background-release-$stamp"
New-Item -ItemType Directory -Path $download -Force | Out-Null
Invoke-Required 'download release archive' { gh release download "v$Version" --repo FURUYAN1234/panoforge --pattern 'Source code (zip)' --dir $download }
$archive = Get-ChildItem -LiteralPath $download -Filter '*.zip' | Select-Object -First 1
if (-not $archive) { throw 'GitHub Release source archive was not downloaded.' }
Expand-Archive -LiteralPath $archive.FullName -DestinationPath $download -Force
$extracted = Get-ChildItem -LiteralPath $download -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'package.json') } | Select-Object -First 1
if (-not $extracted -or [string]((Get-Content -Raw (Join-Path $extracted.FullName 'package.json') | ConvertFrom-Json).version) -ne $Version) { throw 'Downloaded release archive version is wrong.' }
$copy = 'C:\background-main'
if (Test-Path -LiteralPath $copy) {
  $oldVersion = [string]((Get-Content -Raw (Join-Path $copy 'package.json') | ConvertFrom-Json).version)
  Move-Item -LiteralPath $copy -Destination "C:\background-main-v$oldVersion-preserved-$stamp"
}
Move-Item -LiteralPath $extracted.FullName -Destination $copy
& (Join-Path $root 'scripts\verify_release_ready.ps1') -ExpectedVersion $Version
if ($LASTEXITCODE -ne 0) { throw 'Published-release verification failed.' }
Complete-Stage 'release_copy' @{ path = $copy; version = "v$Version" }
$receipt.completed = (Get-Date -Format o)
$receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $receiptPath -Encoding utf8
Write-Output "BACKGROUND_RELEASE_TRANSACTION_COMPLETE receipt=$receiptPath"
