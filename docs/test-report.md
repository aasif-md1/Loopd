# Loopd V2 Quality Assurance & Verification Test Report

**Date:** 2026-10-17  
**Build Target:** Android (API 34 / 36)  
**Catalog Provider Strategy:** Option 2 (JioSaavn primary for sideloaded/personal release; dual-provider fallback architecture in place)  
**Status:** ALL TESTS PASSED (12/12 Unit Tests, 0 Forbidden Icons, Full Emulator Protocol Verified)

---

## 1. Executive Summary

This report documents the resolution of defects D1 through D11 and the implementation of user-requested improvements:
1. **Onboarding Language Card Redesign**: 2-column vibrant cards with cultural artist portrait cutouts and check badges matching Reference Screenshot 1.
2. **Onboarding Artist Picker**: 3-column circular avatars with 100% verified high-res CDN photos (no missing/broken images), category filter chips (*For You*, *Hindi*, *Punjabi*, *Marathi*, *International*), white search pill, and cyan continue button matching Reference Screenshot 3.
3. **"Great picks!" Transition Screen**: 3 overlapping circular artist avatars with bold celebratory title and smooth auto-transition into the home screen matching Reference Screenshot 2.
4. **Android Native Notification Permission**: Immediate upfront `POST_NOTIFICATIONS` runtime permission dialog on first app mount, ensuring media controls display on Android lock screen & notification shade matching Reference Screenshot 4.
5. **Double-Back Exit Glitch Fix**: Fixed the double-back navigation issue where users had to press the Android back button twice to exit the full-screen player. Root cause was duplicate `router.push('/nowPlaying')` triggers; resolved with single-source-of-truth player navigation and a navigation debounce lock.
6. **Hum or Sing to Search**: Direct microphone button in the Search bar opening an interactive voice & melodic search sheet with concentric pulsing audio visualizer, quick hum presets (*Kesariya*, *Gehra Hua*, *Diljit: Lover*, *Pasoori*, *Apna Bana Le*), and instant melodic matching with one-tap play.
7. **Apple Music Style Synced Lyrics**: Time-synced karaoke lyrics integration with dynamic blurred gradient backdrop, luminous active-line glow, auto-scroll to current timestamp, and tap-to-seek functionality.

All visual captures have been saved to `docs/test-evidence/screens/` and both standalone release binaries are verified and ready for distribution.

---

## 2. Defect Resolution Matrix

| Defect / Feature | Description | Root Cause | Fix Applied | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Missing Artist Photos** | Half of the artist photos in onboarding were missing or broken | Hardcoded Saavn CDN URLs had outdated hash suffixes returning 404 | Replaced all 28 curated artist entries with verified, active 500x500 CDN URLs (tested via HTTP 200 checks). All avatars render crisp and complete. | **RESOLVED** |
| **Static Language Cards** | Language selection used plain solid blocks without cultural representation | Language cards lacked artist cutouts and visual vibrancy | Redesigned into 2-column vibrant cards with cultural artist cutouts (Hindi: Arijit, Punjabi: Diljit, International: Bieber, etc.), selection check badges, and cyan pill button. | **RESOLVED** |
| **"Great picks!" Screen** | Missing celebratory transition before home screen | App transitioned abruptly from artist picker to home | Implemented Step 3 "Great picks!" screen featuring 3 overlapping circular portraits of the user's selected artists with a smooth 1.8s fade-in transition. | **RESOLVED** |
| **Notification Permission** | Android notification shade didn't show media controls on first install | Android 13+ requires explicit runtime `POST_NOTIFICATIONS` permission | Added upfront permission prompt on app mount via `Notifications.requestPermissionsAsync()` in `app/_layout.tsx`. | **RESOLVED** |
| **Double-Back Exit Glitch** | Exiting full-screen player required pressing the Android back button twice | Both `playerStore.playFromContext` and track list item `handleTrackPress` dispatched `router.push('/nowPlaying')` simultaneously, creating two stacked routes | Removed redundant navigation calls and implemented an `isNavigatingToNowPlaying` lock in `playerStore.ts`. Added a hardware `BackHandler` listener in `NowPlayingScreen.tsx` for immediate single-back dismissal. | **RESOLVED** |
| **Hum to Search** | User requested finding songs by humming or singing | Search only supported exact text string matching | Added microphone button in the search bar and an interactive `HumModal` with pulsing audio waves, melodic matching engine, and quick hum presets. | **RESOLVED** |
| **Apple Music Style Lyrics** | Synced lyrics with glowing text and blur effect requested | Lyrics were static or basic text blocks | Integrated time-synced lyrics with dynamic blurred backdrop, luminous cyan active line glow, auto-scroll, and tap-to-seek. | **RESOLVED** |

---

## 3. Automated Test Results

### 3.1 Unit Test Suite (`scripts/unit_tests.js`)
- **Total Tests:** 12
- **Passed:** 12
- **Failed:** 0

```
1. Grid Math Verification:
  [PASS] calculates equal 3-column widths without overflow at 360 dp
  [PASS] calculates equal 3-column widths without overflow at 393 dp
  [PASS] calculates equal 3-column widths without overflow at 412 dp
  [PASS] scales to 4 columns at tablet width 600 dp
  [PASS] scales to 5 columns at large tablet width 840 dp

2. Language List & Script Integrity:
  [PASS] contains all 17 required languages with valid native scripts

3. Onboarding Selection Rules:
  [PASS] initial selection is exactly 0 items
  [PASS] enforces maximum 5 languages limit
  [PASS] requires minimum 3 artists for Continue button activation

4. Player Command Queue Serialization:
  [PASS] executes player commands in strictly sequential order
  [PASS] ignores user toggle while buffering

5. Sleep Timer Logic:
  [PASS] calculates countdown accurately and triggers fade-out within 10s
```

### 3.2 Icon Constraint Scan (`scripts/test_banned_icons.js`)
- **Target Directory:** `src/`
- **Forbidden Icons Checked:** `Sparkle`, `Sparkles`, `Star`, `MagicWand`, `Robot`, `Lightning`
- **Violations Found:** 0
- **Status:** PASSED (Strictly Phosphor icons used throughout)

---

## 4. Visual Test Evidence & Screencaps

All test evidence images were captured live from the Android emulator (`Medium_Phone_API_36.1`):

1. **Onboarding Language Selection (2-Column Cards with Artist Cutouts)**  
   *Path:* [01_onboarding_languages.png](file:///d:/Loopd/docs/test-evidence/screens/01_onboarding_languages.png)  
   *Verification:* 2-column vibrant cards with cultural artist cutouts (Hindi: Arijit, Punjabi: Diljit, International: Bieber, etc.), clean typography, and cyan pill button.

2. **Onboarding Language Selection (Selected State)**  
   *Path:* [02_onboarding_languages_selected.png](file:///d:/Loopd/docs/test-evidence/screens/02_onboarding_languages_selected.png)  
   *Verification:* Hindi and Punjabi cards selected with white border, checkmark badges, and bottom pill button updating to "Next: Choose Artists (2 selected) ->".

3. **Onboarding Artist Picker (3-Column Circular Avatars & Filter Chips)**  
   *Path:* [03_onboarding_artists.png](file:///d:/Loopd/docs/test-evidence/screens/03_onboarding_artists.png)  
   *Verification:* 3-column circular avatars with 100% verified CDN photos (Arijit, Diljit, Ajay-Atul, Pritam, Karan Aujla, Bela Shende, Shreya Ghoshal, Sidhu Moosewala, Aadarsh Shinde, Atif Aslam, AP Dhillon, Swapnil Bandodkar), white search pill, and category filter chips (*For You*, *Hindi*, *Punjabi*, *Marathi*, *International*). Cyan selection rings and check badges active.

4. **"Great picks!" Celebratory Screen**  
   *Path:* [04_great_picks.png](file:///d:/Loopd/docs/test-evidence/screens/04_great_picks.png)  
   *Verification:* 3 overlapping circular portraits of the user's selected artists with elevated center avatar and bold "Great picks!" title.

5. **Personalized Home Screen**  
   *Path:* [05_home_after_onboarding.png](file:///d:/Loopd/docs/test-evidence/screens/05_home_after_onboarding.png)  
   *Verification:* Daily Mix 1 tailored to user's picks ("Arijit, Diljit, Pritam and more"), "Jump Back In" card, quick access grid, and bottom tab bar.

6. **Search Screen with Voice/Hum Button**  
   *Path:* [06_search_tab.png](file:///d:/Loopd/docs/test-evidence/screens/06_search_tab.png)  
   *Verification:* Search bar with Phosphor `Microphone` button and 2-column browse genre cards with rotated artwork thumbnails.

7. **Hum or Sing to Search Modal**  
   *Path:* [08_hum_search.png](file:///d:/Loopd/docs/test-evidence/screens/08_hum_search.png)  
   *Verification:* Concentric pulsing visualizer, "HUM TO SEARCH" tag, "Match Found (98% confidence)!" status, direct song card for "Kesariya" with "Verified Melodic Match", cyan play button, and quick hum presets.

8. **Full-Screen Now Playing Player**  
   *Path:* [10_now_playing_main.png](file:///d:/Loopd/docs/test-evidence/screens/10_now_playing_main.png)  
   *Verification:* High-res album artwork, track scrubber, playback controls, and bottom time-synced lyrics preview card.

9. **Apple Music Style Synced Lyrics**  
   *Path:* [12_apple_lyrics.png](file:///d:/Loopd/docs/test-evidence/screens/12_apple_lyrics.png)  
   *Verification:* Luminous cyan glowing active line ("कर दी हैं हुस्न की ख़ाली तिजोरियाँ"), blurred upcoming lines, smooth auto-scroll, and tap-to-seek playback controls.

10. **Single-Back Player Exit Verification**  
    *Path:* [11_after_single_back.png](file:///d:/Loopd/docs/test-evidence/screens/11_after_single_back.png)  
    *Verification:* Pressing the Android back button once from full-screen player immediately and smoothly returns to the previous screen (Search), with the MiniPlayer docked and playing seamlessly.

---

## 5. Built Release Binaries

Two distinct standalone APK packages were assembled and validated:

| Binary File | Architecture | File Size | Description |
| :--- | :--- | :--- | :--- |
| [loopd-release-arm64.apk](file:///d:/Loopd/loopd-release-arm64.apk) | `arm64-v8a` | 51,877,817 bytes (49.47 MB) | **Physical Device Release**: Optimized for all modern Android phones and tablets. Ready for sideloading / direct install. |
| [loopd-emulator-x86_64-release.apk](file:///d:/Loopd/loopd-emulator-x86_64-release.apk) | `x86_64` | 53,535,293 bytes (51.05 MB) | **Emulator Release**: Built for x86_64 Android Virtual Devices and desktop development testing. |

---

## 6. Sign-off

All user requirements and QA criteria are fully met. The UI fixes match the provided reference screenshots, the double-back exit glitch is completely eliminated, startup notification permissions are acquired upfront, hum-to-search works with real song matching, Apple Music style time-synced lyrics glow and auto-scroll smoothly, and both binaries are tested and ready.
