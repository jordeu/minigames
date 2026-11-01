# Mini Games

Offline Android TV mini games, starting with single-player Snake. Kotlin hosts a bundled three.js game in an Android WebView. Package: `net.jordeu.minigames`.

## Requirements

Linux, Node.js 22+ with npm, Android Studio (or SDK command-line tools), Android SDK platform 36, build-tools 36.0.0, and Java 25 for Gradle 9.6.1. Android 9+ TV with WebGL 2 enabled in Android System WebView. No server, accounts, ads, analytics, or runtime downloads.

On the development machine, the installed toolchain environment is available with:

```bash
source ~/.local/share/minigames-toolchain/env.sh
```

For another machine, set `JAVA_HOME` and `ANDROID_HOME`, and create `local.properties` containing `sdk.dir=/absolute/path/to/Android/Sdk`. Android Studio can open the repository root.

## Build and test

```bash
npm --prefix web ci
npm --prefix web test
./gradlew :app:assembleDebug :app:lintDebug
```

Gradle builds the frontend automatically. The APK is `app/build/outputs/apk/debug/app-debug.apk`. Frontend iteration in a desktop browser:

```bash
npm --prefix web run dev
```

Arrow keys steer and navigate, Enter or Space selects, Escape acts as Back.

## Install on Google TV

Enable Developer options and Wireless debugging on the Streamer. Keep the computer and TV on the same local network. Select **Pair device with pairing code**, then:

```bash
adb pair DEVICE_IP:PAIRING_PORT
# Enter the temporary pairing code when prompted.
adb connect DEVICE_IP:DEBUGGING_PORT
adb devices -l
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n net.jordeu.minigames/.MainActivity
```

The pairing port and debugging port differ. The debugging address appears on the main Wireless debugging screen and can change. If several devices are attached, add `-s DEVICE_SERIAL` after `adb`. Pairing codes are temporary and are not project configuration.

## Play

Select Snake from the menu. D-pad steers; Select starts or pauses; Back pauses during play. The pause dialog offers Resume, Game menu, and Sound. Back from the pause dialog resumes. Home or switching apps pauses the game; returning requires an explicit resume. Wall and self collisions end the round. Food adds one segment and 10 points. Speed increases every 30 points, capped at one move every 75 ms. Filling the board wins. Highest score and mute preference persist locally.

## Layout

- `app/`: Kotlin Activity, remote input, lifecycle, Android TV manifest and launcher assets.
- `web/src/snake.js`: deterministic game rules, independent of rendering.
- `web/src/main.js`: three.js scene, game loop, menu, sound and saved preferences.
- `web/src/snake.test.js`: rule tests.

The WebView serves only bundled assets through `WebViewAssetLoader` and rejects other requests. The app declares no Internet permission. WebView debugging is enabled only for debug builds.

## Device acceptance checks

Launch from the TV home screen. Navigate with the remote; start, steer, eat, crash, and restart. Check pause/resume, menu return, mute, saved best score after reopening, and Home/return behavior. Verify airplane/offline play with networking disconnected after installation. Physical remote feel, sound volume, and TV overscan should also be checked by the player.

## Automated device smoke test

With a debug build open and ADB connected, get the process ID with `adb shell pidof net.jordeu.minigames`, then forward its debug WebView socket (replace `APP_PID`):

```bash
adb forward tcp:9222 localabstract:webview_devtools_remote_APP_PID
node scripts/device-smoke.mjs
```

Set `ADB=/absolute/path/to/adb` if ADB is not on PATH. The test drives the device remote input, checks start/pause, Home and resume, wall collision, restart, menu return, and mute persistence after page reload. It leaves the game menu open and restores the original mute preference. It requires the debug build; production WebView inspection is disabled.

## Sound and round-end effects

Eating plays a synthesized gulp and chirp with alternating pitches, accompanied by a short body bounce. Collisions trigger a 1.8-second wobble with circling stars and an original comic musical sting before showing the results. Back skips the sequence. Filling the board uses a celebratory tune instead. All audio is synthesized locally with Web Audio; mute stops scheduled notes immediately, and leaving the app stops the music. `web/src/sound.js` contains the effects.
