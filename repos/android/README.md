# Ground Truth Circle — Android Native App

Native Android application container for ACAPS Ground Truth Circle, built with Kotlin, Gradle 8.9, and Android SDK 35 (minSdk 26, targetSdk 35).

## 📱 Pre-built APK

The ready-to-install debug APK is located at:
- `GroundTruthCircle.apk` (Root of repository)
- `android/GroundTruthCircle.apk`

## 🚀 Key Features

1. **Hardware-Accelerated Web Engine**:
   - High-performance web rendering with DOM storage, HTML5 canvas, and local caching enabled.
2. **Persistent Persona & Profile Sessions**:
   - Dual-layer cookie synchronization via Android `CookieManager` (`setAcceptCookie` and `setAcceptThirdPartyCookies`).
   - Ensures HMAC-signed session cookies (`gt_expert`, `gt_owned`, `gt_lang`) persist across app restarts and backgrounding.
3. **Smart Network Switcher & Server Configuration**:
   - Auto-detects environment: defaults to Android Emulator loopback (`http://10.0.2.2:3000`) or Mac LAN Wi-Fi (`http://145.94.89.206:3000`).
   - Floating settings button (`⚙️`) and error recovery screen allow switching to any custom domain, ngrok tunnel, or cloud URL on the fly.
4. **Native Pull-to-Refresh & Back Navigation**:
   - `SwipeRefreshLayout` styled in ACAPS brand colors (`#d97706` amber, `#2563eb` blue).
   - Integrated Android back gesture navigation (`OnBackPressedDispatcher`).
5. **Cleartext Traffic Security Profile**:
   - Configured with `network_security_config.xml` to allow seamless local network HTTP development and HTTPS production traffic.

## 📥 Installation on Android Device

### Option 1: Via ADB (Command Line)
Connect your Android phone via USB (with Developer Options & USB Debugging enabled) or start an Android Emulator:
```bash
adb install -r GroundTruthCircle.apk
```

### Option 2: Direct Phone Download / Sideload
1. Copy `GroundTruthCircle.apk` to your phone via USB, Google Drive, or transfer tool.
2. Tap the APK in your phone's File Manager and tap **Install**.
3. If prompted, allow "Install unknown apps" for your file manager.

## 🛠 Rebuilding from Source

Requirements:
- OpenJDK 17
- Android SDK (build-tools 35.0.0, platforms android-35)

```bash
cd android
./gradlew assembleDebug
```
The output APK will be placed in `android/app/build/outputs/apk/debug/app-debug.apk`.
