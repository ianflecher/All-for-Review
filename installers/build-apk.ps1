<#
  IDF Reviewer - build the Android APK on this PC.

  Finds an installed JDK 17-21 and uses it for this build only, by setting
  JAVA_HOME inside this process. The system default Java is never touched.
#>

$ErrorActionPreference = 'Stop'

function Write-Step($text) { Write-Host "`n  $text" -ForegroundColor Cyan }
function Write-Ok($text)   { Write-Host "  $text" -ForegroundColor Green }
function Write-Warn2($text) { Write-Host "  $text" -ForegroundColor Yellow }

Write-Host ""
Write-Host "  IDF Reviewer - local APK build" -ForegroundColor White
Write-Host "  =============================="

# ---------- Locate a JDK 17-21 -------------------------------------------
$roots = @(
  "$env:ProgramFiles\Eclipse Adoptium",
  "$env:ProgramFiles\Java",
  "$env:ProgramFiles\Microsoft",
  "$env:ProgramFiles\Amazon Corretto",
  "$env:ProgramFiles\Zulu",
  "${env:ProgramFiles(x86)}\Eclipse Adoptium"
)

$candidates = foreach ($root in $roots) {
  if (-not (Test-Path $root)) { continue }
  foreach ($dir in Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue) {
    $releaseFile = Join-Path $dir.FullName 'release'
    $javac       = Join-Path $dir.FullName 'bin\javac.exe'
    if (-not (Test-Path $releaseFile) -or -not (Test-Path $javac)) { continue }

    # Every JDK ships a "release" file with JAVA_VERSION="21.0.12".
    $line = Select-String -Path $releaseFile -Pattern '^JAVA_VERSION=' -ErrorAction SilentlyContinue |
            Select-Object -First 1
    if (-not $line) { continue }

    $raw = ($line.Line -split '=', 2)[1].Trim('"', ' ')
    $major = ($raw -split '\.')[0]
    $majorInt = 0
    if (-not [int]::TryParse($major, [ref]$majorInt)) { continue }

    if ($majorInt -ge 17 -and $majorInt -le 21) {
      [pscustomobject]@{ Path = $dir.FullName; Version = $raw; Major = $majorInt }
    }
  }
}

# Prefer the newest suitable JDK (21 over 17).
$jdk = $candidates | Sort-Object Major -Descending | Select-Object -First 1

if (-not $jdk) {
  Write-Warn2 "No JDK 17-21 found on this PC."
  Write-Host ""
  Write-Host "  Your Java 26 is too new - the Android build tools reject it."
  Write-Host "  Installing JDK 21 will NOT remove or downgrade Java 26."
  Write-Host ""
  Write-Host "    https://adoptium.net/temurin/releases/?version=21" -ForegroundColor Cyan
  Write-Host "    Pick: JDK | 21 - LTS | Windows | x64 | .msi"
  Write-Host ""
  Write-Host "  Or run Build-Android-APK.bat to build in Expo's cloud instead."
  exit 1
}

Write-Ok "Using JDK $($jdk.Version)"
Write-Host "    $($jdk.Path)"
Write-Host "    (your system default Java is left unchanged)"

# Scoped to this process only.
$env:JAVA_HOME = $jdk.Path
$env:PATH      = (Join-Path $jdk.Path 'bin') + ';' + $env:PATH

# ---------- Locate the Android SDK ---------------------------------------
# Gradle needs ANDROID_HOME (or local.properties) to find the SDK, and it is
# commonly unset even when Android Studio installed one.
if (-not $env:ANDROID_HOME -or -not (Test-Path $env:ANDROID_HOME)) {
  $sdkCandidates = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:ProgramFiles\Android\android-sdk",
    "${env:ProgramFiles(x86)}\Android\android-sdk"
  )
  $sdk = $sdkCandidates | Where-Object { Test-Path (Join-Path $_ 'platform-tools') } | Select-Object -First 1
  if ($sdk) { $env:ANDROID_HOME = $sdk }
}

if (-not $env:ANDROID_HOME) {
  Write-Warn2 "No Android SDK found on this PC."
  Write-Host ""
  Write-Host "  Gradle needs the Android SDK to compile an APK. Either install"
  Write-Host "  Android Studio, or use the cloud build instead:"
  Write-Host "    Build-Android-APK.bat"
  exit 1
}

$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
Write-Ok "Using Android SDK: $env:ANDROID_HOME"

# ---------- Locate the project -------------------------------------------
$projectDir = Join-Path (Split-Path -Parent $PSScriptRoot) 'PDFReviewerApp'
if (-not (Test-Path $projectDir)) {
  Write-Warn2 "Could not find PDFReviewerApp next to this script."
  exit 1
}
Set-Location $projectDir

# ---------- Build ---------------------------------------------------------
Write-Step "[1/3] Generating the native Android project..."
& npx expo prebuild -p android
if ($LASTEXITCODE -ne 0) { Write-Warn2 "prebuild failed."; exit 1 }

# ---------- Pin Kotlin to a Gradle-9-compatible version -------------------
# Expo falls back to Kotlin 2.0.21 when it cannot read the version catalog,
# and that Kotlin plugin references JvmVendorSpec.IBM_SEMERU, which Gradle 9
# removed -> "does not have member field IBM_SEMERU". 2.1.20 is what React
# Native itself uses and is in Expo's supported KSP list.
$gradleProps = Join-Path $projectDir 'android\gradle.properties'
if (Test-Path $gradleProps) {
  $props = Get-Content $gradleProps -Raw
  if ($props -notmatch '(?m)^android\.kotlinVersion=') {
    Add-Content -Path $gradleProps -Value "`r`nandroid.kotlinVersion=2.1.20"
    Write-Ok "Pinned Kotlin 2.1.20 (Gradle 9 compatibility)"
  }
}

Write-Step "[2/3] Compiling the APK with Gradle (first run downloads a lot)..."
Push-Location (Join-Path $projectDir 'android')

# Belt and braces: some Gradle versions only read local.properties.
$localProps = Join-Path (Get-Location) 'local.properties'
$sdkEscaped = $env:ANDROID_HOME -replace '\\', '\\\\'
Set-Content -Path $localProps -Value "sdk.dir=$sdkEscaped" -Encoding ascii

& .\gradlew.bat assembleRelease
if ($LASTEXITCODE -ne 0) {
  Write-Warn2 "Release build failed - trying a debug APK instead..."
  & .\gradlew.bat assembleDebug
  if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Warn2 "Gradle build failed."; exit 1 }
}
Pop-Location

Write-Step "[3/3] Collecting the APK..."
$apkRoot = Join-Path $projectDir 'android\app\build\outputs\apk'
$apk = Get-ChildItem -Path $apkRoot -Filter *.apk -Recurse -ErrorAction SilentlyContinue |
       Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $apk) {
  Write-Warn2 "Build finished but no .apk was produced."
  exit 1
}

$dest = Join-Path $PSScriptRoot 'IDF-Reviewer.apk'
Copy-Item $apk.FullName $dest -Force

$sizeMb = [math]::Round((Get-Item $dest).Length / 1MB, 1)
Write-Host ""
Write-Ok "DONE - your APK is ready ($sizeMb MB):"
Write-Host "    $dest"
Write-Host ""
Write-Host "  Copy it to your phone and tap it to install."
Write-Host "  You may need to allow 'Install unknown apps' first."
exit 0
