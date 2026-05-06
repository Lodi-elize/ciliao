param(
    [string]$AvdName = "NfcChat_Pixel_API35",
    [string]$PackageName = "com.prototype.nfcchat",
    [string]$ApkPath = "",
    [switch]$NoInstall,
    [switch]$KillExisting
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-AndroidSdk {
    if ($env:ANDROID_HOME -and (Test-Path -LiteralPath $env:ANDROID_HOME)) {
        return $env:ANDROID_HOME
    }

    if ($env:ANDROID_SDK_ROOT -and (Test-Path -LiteralPath $env:ANDROID_SDK_ROOT)) {
        return $env:ANDROID_SDK_ROOT
    }

    $defaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    if (Test-Path -LiteralPath $defaultSdk) {
        return $defaultSdk
    }

    throw "Android SDK not found. Install Android Studio or set ANDROID_HOME."
}

function Update-KeyValueFile {
    param(
        [string]$Path,
        [hashtable]$Updates
    )

    $lines = [System.Collections.Generic.List[string]]::new()
    if (Test-Path -LiteralPath $Path) {
        Get-Content -LiteralPath $Path | ForEach-Object { [void]$lines.Add($_) }
    }

    foreach ($key in $Updates.Keys) {
        $value = $Updates[$key]
        $found = $false
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $trimmed = $lines[$i].TrimStart()
            if ($trimmed.StartsWith("$key =") -or $trimmed.StartsWith("$key=")) {
                $lines[$i] = "$key = $value"
                $found = $true
            }
        }
        if (-not $found) {
            [void]$lines.Add("$key = $value")
        }
    }

    Set-Content -LiteralPath $Path -Value $lines -Encoding ASCII
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$sdk = Get-AndroidSdk
$adb = Join-Path $sdk "platform-tools\adb.exe"
$emulator = Join-Path $sdk "emulator\emulator.exe"

if (-not (Test-Path -LiteralPath $adb)) {
    throw "adb.exe not found: $adb"
}
if (-not (Test-Path -LiteralPath $emulator)) {
    throw "emulator.exe not found: $emulator"
}

if (-not $ApkPath) {
    $ApkPath = Join-Path $repoRoot "apps\mobile\build-output\次聊-emulator-x86_64.apk"
}

$backupPlatformTools = Join-Path $sdk "platform-tools.backup"
if (Test-Path -LiteralPath $backupPlatformTools) {
    Write-Step "Move duplicate platform-tools.backup outside Android SDK"
    $destRoot = Split-Path -Parent $sdk
    $dest = Join-Path $destRoot "platform-tools.backup-outside-sdk"
    if (Test-Path -LiteralPath $dest) {
        $dest = Join-Path $destRoot ("platform-tools.backup-outside-sdk-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
    }
    Move-Item -LiteralPath $backupPlatformTools -Destination $dest
    Write-Host "Moved to $dest"
}

$avdDir = Join-Path $env:USERPROFILE ".android\avd\$AvdName.avd"
$avdConfig = Join-Path $avdDir "config.ini"
if (-not (Test-Path -LiteralPath $avdConfig)) {
    throw "AVD config not found: $avdConfig"
}

Write-Step "Patch AVD for stable Windows rendering"
$backup = "$avdConfig.codex-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -LiteralPath $avdConfig -Destination $backup
Update-KeyValueFile -Path $avdConfig -Updates @{
    "hw.gpu.enabled" = "yes"
    "hw.gpu.mode" = "swiftshader_indirect"
    "fastboot.forceColdBoot" = "yes"
    "fastboot.forceFastBoot" = "no"
    "fastboot.forceChosenSnapshotBoot" = "no"
    "firstboot.bootFromDownloadableSnapshot" = "no"
    "firstboot.bootFromLocalSnapshot" = "no"
    "firstboot.saveToLocalSnapshot" = "no"
}
Write-Host "Config backup: $backup"

if ($KillExisting) {
    Write-Step "Stop stuck emulator processes"
    try { & $adb emu kill | Out-Null } catch { }
    Start-Sleep -Seconds 2
    Get-Process | Where-Object { $_.ProcessName -match "^(emulator|qemu-system-x86_64)$" } | Stop-Process -Force -ErrorAction SilentlyContinue
    & $adb kill-server | Out-Null
}

Write-Step "Start emulator with software GPU and no snapshot"
$devices = (& $adb devices) -join "`n"
if ($devices -notmatch "emulator-\d+\s+device") {
    Start-Process -FilePath $emulator -ArgumentList @(
        "-avd", $AvdName,
        "-no-snapshot-load",
        "-no-boot-anim",
        "-gpu", "swiftshader_indirect"
    )
} else {
    Write-Host "An emulator is already connected."
}

Write-Step "Wait for Android boot"
$deadline = (Get-Date).AddSeconds(240)
while ((Get-Date) -lt $deadline) {
    $devices = (& $adb devices) -join "`n"
    if ($devices -match "emulator-\d+\s+device") {
        $boot = (& $adb shell getprop sys.boot_completed 2>$null).Trim()
        if ($boot -eq "1") {
            Write-Host "Android boot completed."
            break
        }
    }
    Start-Sleep -Seconds 5
}

if ((& $adb shell getprop sys.boot_completed 2>$null).Trim() -ne "1") {
    throw "Emulator did not finish booting within 240 seconds."
}

if ($NoInstall) {
    Write-Step "Skip APK install"
    exit 0
}

if (-not (Test-Path -LiteralPath $ApkPath)) {
    Write-Step "APK not found, emulator is ready"
    Write-Host "Missing APK: $ApkPath" -ForegroundColor Yellow
    Write-Host "Build the emulator APK first, then run this script again."
    exit 0
}

Write-Step "Install APK"
& $adb install -r -d $ApkPath

Write-Step "Forward local development ports"
try { & $adb reverse tcp:8081 tcp:8081 | Out-Null } catch { Write-Host "Port 8081 reverse failed: $_" -ForegroundColor Yellow }
try { & $adb reverse tcp:4000 tcp:4000 | Out-Null } catch { Write-Host "Port 4000 reverse failed: $_" -ForegroundColor Yellow }

Write-Step "Launch app"
& $adb shell monkey -p $PackageName -c android.intent.category.LAUNCHER 1

Write-Step "Done"
& $adb devices -l
& $adb shell dumpsys window | Select-String -Pattern "mCurrentFocus|mFocusedApp"
