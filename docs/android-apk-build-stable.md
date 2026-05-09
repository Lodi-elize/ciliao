# Android APK 稳定打包方式

以后需要“打包 APK”时，默认使用本记录里的稳定方式，并一次产出两个包：

- Debug APK: `apps/mobile/build-output/次聊-debug-stable.apk`
- Release APK: `apps/mobile/build-output/次聊-release.apk`

## 一键打包

在项目根目录执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-android-apks-stable.ps1
```

如果项目移动过、Android 生成文件里残留了旧绝对路径，使用清理模式重新打包：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build-android-apks-stable.ps1 -CleanGenerated
```

## 固定环境

- 项目根目录：`E:\workPlace\ciliao`
- Android 工程：`apps/mobile/android`
- JDK：`D:\java\java17`
- Gradle：`8.14.3`
- Gradle 本地缓存：`.gradle-local/gradle-8.14.3/bin/gradle.bat`
- Gradle 下载镜像：`https://mirrors.cloud.tencent.com/gradle/gradle-8.14.3-bin.zip`
- Gradle zip 期望大小：`137393837` bytes

不要使用 Java 25 打包本项目。该版本会触发 Gradle/Kotlin 插件兼容问题。稳定方式固定使用 JDK 17。

`.gradle-local/` 是本机缓存目录，已加入 `.gitignore`，不提交到仓库。

## 实际 Gradle 命令

脚本最终会进入 `apps/mobile/android` 并执行：

```powershell
& 'E:\workPlace\ciliao\.gradle-local\gradle-8.14.3\bin\gradle.bat' assembleDebug assembleRelease --console=plain --stacktrace --no-daemon
```

打包成功后，脚本会复制：

- `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` -> `apps/mobile/build-output/次聊-debug-stable.apk`
- `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` -> `apps/mobile/build-output/次聊-release.apk`

## Release 签名说明

当前 `apps/mobile/android/app/build.gradle` 中的 `release` 构建使用 debug keystore 签名：

```gradle
release {
    signingConfig signingConfigs.debug
}
```

因此现在生成的 `次聊-release.apk` 适合本地安装测试和交付预览，但不是应用商店生产签名包。需要上架时，应先配置正式 keystore，再沿用同一脚本打包。

## 手动验证

```powershell
Get-Item .\apps\mobile\build-output\次聊-debug-stable.apk
Get-Item .\apps\mobile\build-output\次聊-release.apk
```

最近一次稳定路径的产物大小约为：

- Debug: `110 MB`
- Release: `57 MB`
