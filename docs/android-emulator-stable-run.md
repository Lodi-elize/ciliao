# Android emulator stable run

Use this when the Android emulator shows a black or gray window, starts from a bad snapshot, or the app needs to be reinstalled.

## One-click

Double-click:

```text
启动模拟器并安装应用.cmd
```

## From terminal

```powershell
npm run android:stable
```

Or run the script directly:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-emulator-stable.ps1 -KillExisting
```

## What the script does

- Moves duplicate `platform-tools.backup` out of the Android SDK folder if it exists.
- Sets the AVD to use `swiftshader_indirect` software GPU rendering.
- Disables emulator snapshot boot and forces cold boot.
- Starts `NfcChat_Pixel_API35`.
- Waits until Android reports boot completed.
- Installs `apps\mobile\build-output\次聊-emulator-x86_64.apk`.
- Forwards local development ports `8081` and `4000`.
- Launches `com.prototype.nfcchat`.

## Useful options

Start and verify the emulator without installing the APK:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-emulator-stable.ps1 -NoInstall
```

Use another AVD:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-emulator-stable.ps1 -AvdName "Your_AVD_Name"
```

Use another APK:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-emulator-stable.ps1 -ApkPath "C:\path\to\app.apk"
```

## Notes

If the emulator window is black or gray but `adb shell screencap` shows the app, Android is running and the Windows host rendering path is broken. Keep using software GPU plus cold boot, and avoid snapshot restore for this AVD.
