param(
  [switch]$CleanGenerated
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$androidDir = Join-Path $repoRoot 'apps\mobile\android'
$outputDir = Join-Path $repoRoot 'apps\mobile\build-output'
$javaHome = 'D:\java\java17'

$gradleVersion = '8.14.3'
$gradleZipSize = 137393837
$gradleCacheDir = Join-Path $repoRoot '.gradle-local'
$gradleZip = Join-Path $gradleCacheDir "gradle-$gradleVersion-bin.zip"
$gradleDir = Join-Path $gradleCacheDir "gradle-$gradleVersion"
$gradleBat = Join-Path $gradleDir 'bin\gradle.bat'
$gradleUrl = "https://mirrors.cloud.tencent.com/gradle/gradle-$gradleVersion-bin.zip"

if (-not (Test-Path -LiteralPath $javaHome)) {
  throw "JDK 17 not found at $javaHome"
}

New-Item -ItemType Directory -Force -Path $gradleCacheDir | Out-Null

if (-not (Test-Path -LiteralPath $gradleBat)) {
  Write-Host "Gradle $gradleVersion not found in local cache. Downloading..."
  curl.exe -L --retry 8 --retry-delay 3 --connect-timeout 20 --speed-time 60 --speed-limit 10240 `
    --output $gradleZip $gradleUrl

  $actualSize = (Get-Item -LiteralPath $gradleZip).Length
  if ($actualSize -ne $gradleZipSize) {
    throw "Gradle download incomplete. Expected $gradleZipSize bytes, got $actualSize bytes."
  }

  Expand-Archive -LiteralPath $gradleZip -DestinationPath $gradleCacheDir -Force
}

if (-not (Test-Path -LiteralPath $gradleBat)) {
  throw "Gradle executable not found at $gradleBat"
}

$env:JAVA_HOME = $javaHome
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

if ($CleanGenerated) {
  Write-Host "Cleaning generated Android state..."
  Remove-Item (Join-Path $androidDir 'build') -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item (Join-Path $androidDir 'app\build') -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item (Join-Path $androidDir ".gradle\$gradleVersion") -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Using Java:"
& java -version

Push-Location $androidDir
try {
  & $gradleBat assembleDebug assembleRelease --console=plain --stacktrace --no-daemon
  if ($LASTEXITCODE -ne 0) {
    throw "Gradle build failed with exit code $LASTEXITCODE"
  }
}
finally {
  Pop-Location
}

$debugSource = Join-Path $androidDir 'app\build\outputs\apk\debug\app-debug.apk'
$releaseSource = Join-Path $androidDir 'app\build\outputs\apk\release\app-release.apk'
$appName = "$([char]0x6B21)$([char]0x804A)"
$debugDest = Join-Path $outputDir "$appName-debug-stable.apk"
$releaseDest = Join-Path $outputDir "$appName-release.apk"

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Copy-Item -LiteralPath $debugSource -Destination $debugDest -Force
Copy-Item -LiteralPath $releaseSource -Destination $releaseDest -Force

Write-Host ''
Write-Host 'APK build complete:'
foreach ($apk in @($debugDest, $releaseDest)) {
  $item = Get-Item -LiteralPath $apk
  $sizeMb = [Math]::Round($item.Length / 1MB, 2)
  Write-Host " - $($item.FullName) ($sizeMb MB)"
}
