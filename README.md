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

## Chickdoku

Choose **Chickdoku** on the main menu, then choose difficulty 1–10 before starting. Place exactly one chick in each row, column, and coloured region. Chicks may not touch, including diagonally. Move with the D-pad; One Select toggles a large cross immediately; two Select presses on the same cell within 380 ms place a chick (or remove an existing chick). Moving cancels double-Select placement. For fast notes, press Select once, then double-press the same arrow: the starting cell through the board edge is crossed out in that direction, preserving all chicks and existing crosses. Press the first arrow within 650 ms of Select and the second within 380 ms. The cursor moves to the edge; Undo reverses the entire line including the initial Select. Opening a menu cancels any pending gesture. Starter chicks cannot be changed. A wrong chick attempt is checked against the unique solution, adds one failure, and leaves a red-highlighted cross. Cross notes have no penalty. Back opens Resume, Undo, Clear board, Choose difficulty, Game menu, and Sound. Home/return opens that same break screen and retains the current puzzle in memory. A chronometer measures active solving time and adds exactly 60 seconds per failure. It pauses in puzzle menus and while the app is backgrounded, resumes when play resumes, and freezes on completion. Undo and Clear board preserve elapsed time and all penalties; starting a new puzzle starts a fresh attempt. The sidebar shows the current time, failures, and best completed time for the selected difficulty. Faster completed totals (including penalties) are stored locally per difficulty and survive app restarts. The results announce new records. Regions use distinct saturated colours and raised dark boundaries. Action menus follow the visible two-column layout with the D-pad. Completion counts and the last selected difficulty are saved locally; unfinished puzzles are not retained after the app process exits.

Difficulty tiers use board size and starter count: 1–2 are 4×4 (2/1 starters), 3–4 are 5×5 (1/0), 5–6 are 6×6 (1/0), 7–8 are 7×7 (1/0), 9 is 8×8 (0), and 10 is 9×9 (0). These are relative tiers, not a calibrated human-solving rating. Each tier includes five original connected-region boards, with random rotations and reflections for variety. Each board has exactly one solution. The board generator is an offline development tool; TV gameplay never runs a generation search.

`web/src/chick.js` contains the rules and solution checker; `chick-view.js` contains the three.js chicks, board and remote UI; `chick-boards.json` contains the bundled puzzles. Run `node scripts/generate-chick-boards.mjs` to reproducibly regenerate the bank. Rule tests check connectivity and unique solutions in all eight orientations, locked starters, undo, conflicts and completion.

After forwarding the debug WebView as described above, `node scripts/chick-device-smoke.mjs` checks difficulty selection, remote cursor movement, undo, Home/return and solving a puzzle at all ten difficulties. It restores completion counters and difficulty preferences after testing.

## Banana Rooftops

A local two-player rooftop banana duel inspired by QBasic Gorillas. Choose two different characters from Jordi, Anna and Guim. The photo-inspired cartoon avatars are bundled offline; see `docs/avatar-assets.md` for their provenance and generation prompts. Players share the TV remote and take alternating turns. Up/Down adjusts angle, Left/Right adjusts power, and Select throws. Hold an arrow for faster adjustment. A short dotted arc shows the initial trajectory, without revealing the landing point. Wind changes between turns, stays fixed during each throw, and bends the trajectory. An animated direction arrow and strength meter sit beside angle and power in the bottom control panel, leaving the sky clear. Drifting sky streaks also show the wind. The previous shot leaves a trail. The camera eases outward for high shots.

Two tall interior towers and raised neighbouring roofs block the old easy arc, requiring higher and more carefully powered throws. Bananas chip blocks out of the 3D skyline. Three moving gulls can intercept and steal a banana, ending that throw without awarding a point. They flap, carry the stolen banana briefly, and keep moving while players aim. A direct hit wins the round; a self-hit gives the opponent the round. First to three round wins takes the match. Each new round has a fresh skyline and alternates the starting player. Misses open a handoff prompt, so the next player can take the remote before their turn begins. Back pauses, and Home/return also opens the pause menu without advancing a flying banana. Pause offers Resume, Restart match, Choose players, Game menu, Sound and a separate Music toggle. A quiet recording of Grieg’s *Morning Mood*, performed by the Czech National Symphony Orchestra / Musopen Symphony Orchestra, plays in Banana Rooftops; global mute silences both music and effects. Music pauses on pause, Home and exit and resumes from the same position. The complete public-domain orchestral recording is bundled for offline playback; recording details and source licensing are in `web/public/music/CREDITS.md`. Cartoon noise-burst explosions, bass drops, shockwaves, flying debris, smoke and a brief camera shake accompany impacts. The global mute setting applies to all sounds. No networking or additional controllers are needed.

`web/src/banana.js` contains the simulation and match rules, independent of three.js. Physics uses a fixed 1/120-second step for consistent trajectories and hit detection. `banana-view.js` contains the character picker, 3D city, aiming UI, effects and turn handoff. The original game was researched via the [original GORILLA.BAS source](https://github.com/pmachapman/basic-samples/blob/master/QBASIC/GORILLA.BAS); this game is a new implementation, not a port of its code or art.

For the Banana Rooftops device smoke check, forward the debug WebView as above and run `node scripts/banana-device-smoke.mjs`. It uses the read-only `window.miniGames.inspectBanana()` diagnostic snapshot to calculate reachable test throws, then drives the normal input handler and real ADB keys. It verifies all three character pairings, a complete first-to-three match, collision results, controls, handoff, paused flight, Home/return and menu exit. It does not write to Snake scores or Chickdoku records.

`node scripts/music-device-smoke.mjs` verifies that the bundled orchestral file decodes on the TV, playback advances, pause/Home freezes the playhead, resume keeps the position, and mute controls silence the recording. It restores the music and mute preferences used before the test.

### Sports sound mix

Banana Rooftops keeps the Grieg recording at 8% media volume (down from 24%) and ducks it further during effects and crowd reactions. Big impacts use a recording of an authentic explosion; smaller impacts use a shorter, quieter version. Rounds open with clapping, human "woo!" shouts and a referee whistle. Building impacts also trigger cheers and applause, with louder, longer celebrations for round and match victories, and crowd gasps react to bird interceptions or wasted throws. The five CC0 sample files and sources are documented in `web/public/sfx/CREDITS.md`. They are bundled offline, decoded once and mixed through a compressor; pause, mute, Home and exit cancel current and scheduled effects.

### Barcelona Jump!

Choose Jordi, Anna or Guim for an original, single-player 2.5D platform adventure through a Barcelona-inspired promenade. Eixample balconies, mosaic platforms, palm trees, a Sagrada Familia skyline and an Arc de Triomf finish frame the route. Tap Left/Right to start running continuously. Tap the opposite arrow to stop; tap it again to run the other way. Releasing the arrow or jumping keeps the current running direction. Press Select (or Up) to jump, and Back to pause. Collect coins, jump on patrolling pigeons, clear gaps and reach the finish with three lives. A halfway checkpoint saves progress within the run. All three characters have the same abilities. Pause/Home stops movement; restarting keeps the selected character. Artwork and level geometry are original; the character picker reuses the existing family portraits.

Barcelona scenery uses bundled procedural stone, brick and flower-pattern panot textures, detailed balcony railings and shutters, planted flower boxes, palm fronds, benches and street lamps. Filmic tone mapping and directional shadows add depth. Static geometry is batched by material and location for culling, and the platformer uses a lower 3D rendering resolution while keeping the HTML interface sharp. Rendering settings are restored when returning to the other games. Run `ADB=/path/to/adb node scripts/barcelona-device-smoke.mjs` with the WebView inspector forwarded on port 9222 to check all heroes, native tap-to-run/opposite-to-stop, jumping, restart, pause/Home and the complete course.
