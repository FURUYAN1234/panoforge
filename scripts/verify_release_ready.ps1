param(
    [Parameter(Mandatory = $true)][string]$ExpectedVersion
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$releaseHashPath = Join-Path $root "docs\releases\v$ExpectedVersion.body.sha256"
$package = Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
if ([string]$package.version -ne $ExpectedVersion) { throw "Background source is v$($package.version), expected v$ExpectedVersion." }

$releaseCopy = 'C:\background-main'
$copyPackage = Join-Path $releaseCopy 'package.json'
if (-not (Test-Path -LiteralPath $copyPackage)) { throw 'Background release copy is missing.' }
$copyVersion = [string]((Get-Content -LiteralPath $copyPackage -Raw | ConvertFrom-Json).version)
if ($copyVersion -ne $ExpectedVersion) { throw "Background release-copy mismatch: source v$ExpectedVersion, copy v$copyVersion." }

$tag = "v$ExpectedVersion"
$tagRef = git -C $root rev-parse --verify "refs/tags/$tag" 2>$null
if ($LASTEXITCODE -ne 0 -or -not $tagRef) { throw "Local tag $tag is missing." }
$releaseRaw = gh release view $tag --repo FURUYAN1234/panoforge --json body,tagName,url 2>$null
if ($LASTEXITCODE -ne 0 -or -not $releaseRaw) { throw "GitHub Release $tag could not be read." }
$release = $releaseRaw | ConvertFrom-Json
if ($release.tagName -ne $tag) { throw "GitHub Release tag mismatch: $($release.tagName)." }
if (-not (Test-Path -LiteralPath $releaseHashPath)) { throw "Canonical release-body hash is missing: $releaseHashPath" }
$expectedReleaseHash = (Get-Content -LiteralPath $releaseHashPath -Raw).Trim().ToLowerInvariant()
$actualReleaseBytes = [System.Text.Encoding]::UTF8.GetBytes([string]$release.body)
$actualReleaseHash = ([System.BitConverter]::ToString([System.Security.Cryptography.SHA256]::Create().ComputeHash($actualReleaseBytes))).Replace('-', '').ToLowerInvariant()
if ($actualReleaseHash -cne $expectedReleaseHash) { throw 'GitHub Release body differs from its canonical UTF-8 hash.' }

$pagesRaw = gh api repos/FURUYAN1234/panoforge/pages/builds/latest 2>$null
if ($LASTEXITCODE -ne 0 -or -not $pagesRaw) { throw 'GitHub Pages build status could not be read.' }
$pages = $pagesRaw | ConvertFrom-Json
if ($pages.status -ne 'built') { throw "GitHub Pages status is $($pages.status), not built." }
try { $public = (Invoke-WebRequest -Uri 'https://furuyan1234.github.io/panoforge/' -UseBasicParsing -ErrorAction Stop).Content }
catch { throw "Public Pages could not be read: $($_.Exception.Message)" }
if ($public -notmatch [regex]::Escape("v$ExpectedVersion")) { throw "Public Pages HTML does not show v$ExpectedVersion." }

Write-Output "BACKGROUND_RELEASE_READY version=v$ExpectedVersion release=$($release.url) pages_commit=$($pages.commit) release_notes=utf8-sha256"
