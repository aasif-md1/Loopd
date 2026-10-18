# LOOPD V2: AUDIT, FIX, REDESIGN AND SELF-TEST PROMPT

## 0. HOW TO WORK

You are a senior React Native engineer, product designer and QA engineer. The Loopd app already exists in this repository but it has serious defects found during real-device testing. Your job is not to add features on top of a broken base. Your job is, in this order:

1. AUDIT the current code against Section 1 and report what is wrong and why (root cause, not guesses).
2. FIX every defect in Section 1.
3. REDESIGN the UI as specified in Sections 3 to 6.
4. ADD the features in Section 7.
5. TEST everything yourself using the protocol in Section 9, store the evidence, and only then report.

### Rules that apply to every step:
- If docs/LOOPD_MASTER_SPEC.md exists, it is still in force (legal, privacy, licensing, Play Store requirements, folder layout) except where this document overrides it. If it does not exist, ask me for it before continuing.
- No emojis anywhere (UI, copy, logs, docs). Icons come only from Phosphor (phosphor-react-native). Forbidden icons anywhere in the app: Sparkle, Sparkles, Star, MagicWand, Robot, Lightning used as decoration. Add a Jest test that scans /src and fails if any of these icon names appear.
- No fake or placeholder data. Every list comes from real providers.
- Never mark a task complete without evidence (command output, screenshot or test result) stored under docs/test-evidence/.
- If a requirement cannot be met because of a platform or API limit, stop, explain, and propose the closest working alternative. Never fake it.
- Do not ask me questions that you can answer by reading the code or running a command.

---

## 1. DEFECT LIST FROM REAL TESTING (every item must be fixed and tested)

| ID | What I saw on the device | Required behavior |
|---|---|---|
| D1 | Language screen is a boring full-width list of cards | Redesign as in Section 4 (visual grid, native-script names, glass tiles) |
| D2 | Artist picker opens with 3 artists already selected | Initial selection is always empty (0). Find why it was preselected (store default, persisted state, seed data, test data left in code) and remove it. |
| D3 | Artist grid shows only 2 per row with a large empty gap on the right | 3 columns with exact equal spacing, no empty gap (grid math in 5.2) |
| D4 | Several artist images are blank gray circles | Image fallback chain (5.3). A blank gray circle must never be rendered. |
| D5 | Selecting an artist paints a flat green overlay that hides the photo | Selected state is a ring plus a check badge; the photo stays fully visible (5.4) |
| D6 | The Done button has a sparkle/star icon that looks AI generated | Remove it. Button label only, optionally a Phosphor ArrowRight. |
| D7 | First time a song was played it started and then paused by itself | Fix the playback state machine (Section 2.1). |
| D8 | No media notification in the shade, no controls on the lock screen | Diagnose and fix with the protocol in Section 2.2. |
| D9 | Search "Browse all" tiles show only flat colors, no images | Every tile shows real artwork (Section 6.2) |
| D10 | Overall the app feels flat and boring | Apply the glass design language (Section 3) and the features in Section 7 |
| D11 | Mainstream songs (for example Hindi film songs) are playing, but the providers named in the master spec (Jamendo, Audius) do not carry that catalog | Run the source audit in Section 8 before doing anything else. |

---

## 2. PLAYBACK FIXES

### 2.1 State machine (fixes D7)
Likely causes to check first: TrackPlayer.play() called twice (once from a list tap and once from the Now Playing screen mount effect), add() followed by play() while the player is still buffering, setupPlayer() running more than once or not awaited, a useEffect that toggles on state change, or UI buttons calling pause() when state is buffering or loading.

Required design:
- All player commands go through one serialized command queue (a promise chain) in playerService.ts. Two commands never run concurrently.
- setupPlayer() is guarded by a module-level promise so it runs exactly once.
- The UI never decides the state. The single source of truth is the player's own playback state events. The play/pause button shows: loading spinner for loading or buffering, pause icon for playing, play icon for paused, ready or ended. A tap while buffering is ignored, not treated as pause.
- playFromContext does: reset queue, add tracks, skip to start index, play, in that order, awaited, once.
- No component other than playerService may call play, pause or skip.
- Log every state transition with a timestamp under a debug flag (PLAYER_DEBUG=1). Acceptance: from a cold start, play a song and sample the player state every 500 ms for 60 seconds. The only allowed sequence is loading, buffering (optional), playing. Any transition to paused without a user action fails the test.

### 2.2 Notification and lock screen diagnosis (fixes D8)
Do not guess. Run these steps and save every output under docs/test-evidence/notification/:
- Confirm the app is running as a development build or release build, not Expo Go (adb shell pm list packages | grep loopd). Native audio controls do not work in Expo Go.
- Report which audio library the code actually uses (RNTP, expo-av, expo-audio, other), its exact version, and its license. Important: react-native-track-player v4 and the newer v5 (@rntp/player) are different packages; v5 requires React Native 0.74 or later with the New Architecture enabled and states it is free only for non-commercial use. Choose the version that matches the installed Expo SDK and React Native versions, confirm the license fits a free, ad-free app, and tell me which you chose and why. If neither can work with the installed versions, stop and propose an alternative.
- Verify registration: registerPlaybackService is called at the root entry file, setupPlayer finished before other calls, and updateOptions includes capabilities (Play, Pause, SkipToNext, SkipToPrevious, SeekTo, Stop) and compact capabilities (Play, Pause, SkipToNext). Android option appKilledPlaybackBehavior = continue playback.
- Verify the generated Android manifest has: FOREGROUND_SERVICE, FOREGROUND_SERVICE_MEDIA_PLAYBACK, WAKE_LOCK, POST_NOTIFICATIONS, and the player service declared with the media playback foreground service type. Save the merged manifest.
- Verify every track given to the player has title, artist, album, an https artwork URL, and duration. Missing artwork or metadata can make the notification look empty or fail.
- With a song playing, run and save: adb shell dumpsys media_session (expect an active session owned by the app with state PLAYING) and adb shell dumpsys notification --noredact filtered for the app package (expect a media-style notification with transport actions). Run adb logcat filtered for errors from the app and the player service while starting playback and save it.
- Request the notification permission in context right after the first successful play (with a one-line rationale sheet first). Never on first launch. Playback must still work if the user denies it.
- Lock screen test on emulator or device: lock the screen (adb shell input keyevent 26), wake (adb shell input keyevent 224), take a screenshot (adb exec-out screencap -p) and confirm media controls are visible. Also expand the shade (adb shell cmd statusbar expand-notifications), dump the UI (adb shell uiautomator dump) and confirm the notification title and the play/pause and next buttons exist. Note that some phone brands kill background apps aggressively; do not request the battery-optimization exemption permission (store policy). Add a Settings > Help item "Music stops in the background?" that explains how to allow background activity in the phone's system settings.
- Tapping the notification opens Now Playing. Notification buttons (play, pause, next, previous, seek) change playback and the in-app UI stays in sync. Report the root cause of D8 in one paragraph with evidence. If after these steps the notification still does not appear, report exactly which check fails.

### 2.3 Behavior of tapping a song (carried over, must be re-verified)
Tapping any track starts playback and opens full-screen Now Playing with a slide-up transition. Swipe down collapses to the mini player. Setting "Open player when a song starts" defaults to ON.

### 2.4 Corrections to the master spec
- Remove the crossfade slider and any "crossfade" claim: the chosen player does not provide it. Keep "gapless-like" only if the player preloads the next track; do not advertise gapless unless you verified it.
- Playback speed (0.75x, 1x, 1.25x, 1.5x): enable only if the player API supports setting rate; verify before building the control.
- Blur on Android: the correct expo-blur API is the blurMethod prop (dimezisBlurViewSdk31Plus) together with a BlurTargetView and the blurTarget prop. Check the installed expo-blur version's docs before coding.

---

## 3. DESIGN LANGUAGE V2: DARK GLASS

Keep the existing palette (background #121212, surface #181818, card #1F1F1F, accent #1ED760, text #FFFFFF, secondary #B3B3B3). Add glass tokens in /src/theme/glass.ts:
- glassSurface: rgba(255,255,255,0.07)
- glassSurfaceStrong: rgba(255,255,255,0.12)
- glassBorder: rgba(255,255,255,0.14) at 1 px
- glassTopEdge: a 1 px linear highlight from rgba(255,255,255,0.28) to transparent along the top edge
- blur intensities: tab bar 55, mini player 65, bottom sheets 75, dialogs 80
- solid fallback: rgba(24,24,24,0.94) used when blur is unavailable, when the user enables "Reduce transparency" (read the OS accessibility setting), or on Android below API 31.

Platform rules:
- Android (primary test platform): expo-blur BlurView with blurMethod="dimezisBlurViewSdk31Plus". Wrap the screen content that should be blurred behind glass in a BlurTargetView and pass its ref to each BlurView. Render the BlurView after dynamic lists. Round corners with overflow: 'hidden', not borderRadius on the blur itself.
- iOS 26 and above: use expo-glass-effect GlassView (guard with isLiquidGlassAvailable()), and fall back to BlurView otherwise. On Android GlassView only renders a plain view, so do not rely on it there.
- Performance guardrails: no blur inside scrolling list rows; at most 3 BlurViews on screen at once; verify scroll stays smooth on a mid-range phone and drop to the solid fallback if frames drop.
- Where glass is used: bottom tab bar (floating, inset 12 px from the sides and bottom, radius 28), mini player (radius 20), Now Playing control panel, bottom sheets, search bar, filter chips, top app bars when scrolled, dialogs, toasts. Content cards remain solid (#1F1F1F) for readability. Text on glass must keep AA contrast; test it against bright artwork.
- Ambient color: every content page and Now Playing use the dominant color of the current artwork, darkened until white text passes AA, as a soft top gradient. On Now Playing also use the artwork itself, scaled to 1.4x, heavily blurred and darkened to 55 percent, as the background, and cross-fade it when the track changes (400 ms). Respect "Reduce motion".
- Motion: shared transitions for artwork between mini player and Now Playing (or a slide-up if shared transitions are unreliable), spring press feedback (scale 0.97), animated tab icon fill, staggered fade-in of list rows on first load (max 8 rows, 40 ms stagger), skeleton shimmer for loading. Haptics on like, selection and play.
- Layout: use safe-area insets on every screen (top and bottom), never place controls under the status bar or gesture bar. 8 pt grid, 16 px side padding.

---

## 4. ONBOARDING STEP 1: LANGUAGE SCREEN (redesign, fixes D1)

- Goal: feel like picking a vibe, not filling a form.
- Top: small Loopd mark on the left, a 2-dot progress indicator on the right (replace the "Step 1 of 2" pill). Title "Pick your languages" (title style 28/800). Subtitle "We will tune your Home to them. Change anytime in Settings." (14, secondary).
- Body: 2-column grid of glass tiles, 12 px gap, each tile height 112, radius 20, glassSurface with a unique diagonal tint gradient per language at 35 percent opacity (use a fixed curated palette of rich, dark-friendly hues so tiles feel colorful but not neon). Inside each tile: the language name in its own script, large (26/800), and the English name beneath (12, secondary). Languages and scripts: Hindi (हिन्दी), Punjabi (ਪੰਜਾਬੀ), English (English), Bhojpuri (भोजपुरी), Haryanvi (हरियाणवी), Rajasthani (राजस्थानी), Tamil (தமிழ்), Telugu (తెలుగు), Malayalam (മലയാളം), Kannada (ಕನ್ನಡ), Bengali (বাংলা), Marathi (मराठी), Gujarati (ગુજરાતી), Urdu (اردو), Spanish (Español), Korean (한국어), Instrumental (no vocals). Make sure the chosen font renders every script (use Noto Sans families for the Indic scripts and Urdu; bundle them).
- Selected state: 2 px white border, tile brightens, a 24 px circular check badge (accent green, black Phosphor Check) at the top-right, spring scale to 1.03 then back, light haptic. Unselected has no empty radio circle.
- Allow 1 to 5 selections. When 5 are selected the others dim with a toast "You can pick up to 5".
- Sticky bottom glass bar: left text "N selected" (or "Pick at least 1"), right primary pill button "Continue" (disabled until 1 is selected; no sparkle or star icon). Below it a "Skip for now" text button.
- Language names must be tied to something real: if the providers return nothing for a language, keep the tile but record it and later show the limited-catalog note on Home instead of an empty feed.
- Entry animation: tiles fade and rise in with a 30 ms stagger.

---

## 5. ONBOARDING STEP 2: ARTIST PICKER (fixes D2 to D6)

### 5.1 Layout
- Header same as Step 1. Title "Pick artists you like". Subtitle "Choose 3 or more. We will build your Home around them."
- Glass search field (height 48, radius 24) with MagnifyingGlass icon, placeholder "Search artists", 300 ms debounce, searches all providers, shows an inline spinner.
- Artist grid below the search field.

### 5.2 Grid math (fixes D3)
- Use FlashList or FlatList with numColumns={3}. Side padding 16, column gap 12. Item width = floor((screenWidth - 32 - 24) / 3). Avatar is a circle with diameter equal to the item width. Name under the avatar: 12/600, centered, max 2 lines, 6 px below the avatar. Row gap 20. The last row must left-align with the grid columns, not stretch. Verify at widths 360, 393, 412 and tablet widths (use 4 columns from 600 px and 5 from 840 px). There must be no horizontal overflow and no unexplained empty column.

### 5.3 Images (fixes D4)
- Fallback chain per artist: provider image, then the same artist's image from another provider matched by normalized name, then the cover art of the artist's most popular album or track, then a generated avatar (a gradient circle in the artist's hash-derived color with initials, Figtree 800). Show a soft shimmer placeholder while loading, retry once on failure, and never leave a blank gray circle. Preload the first 18 images. Test: in the loaded grid, 100 percent of items must show either an image or the generated avatar.

### 5.4 Selection (fixes D2 and D5)
- Initial selection is empty. The persisted onboarding state is reset on fresh install and the selection is only written when the user taps Continue.
- Selected state: a 3 px accent ring around the avatar (with a 3 px gap between the photo and the ring), a 24 px accent circle with a black Check at the bottom-right of the avatar, spring scale 1.04, light haptic. The photo stays fully visible; do not tint it green.
- Bottom glass tray (sticky): a horizontal stack of up to 5 small selected avatars (overlapping), text "N selected", and the primary "Continue" button. Under 3 selected the button reads "Pick N more" and is disabled; at 3 or more it reads "Continue" (no sparkle, star or magic icon). "Skip for now" is always available.
- Artist list source: popular artists for the languages chosen in Step 1, from real provider data, with infinite scroll. Search results replace the list while the query is not empty.
- After Continue, Home visibly shows "Because you picked [Artist]" and Daily Mix cards built from the selection (Section 7).

---

## 6. SEARCH AND OTHER SCREEN FIXES

### 6.1 Search screen
- Glass search bar (not white), safe-area aware, placeholder "What do you want to play?". Chips (All, Songs, Artists, Albums, Playlists) are glass pills.
- Recent searches as a vertical list with an X per item and "Clear all".

### 6.2 Browse tiles with real artwork (fixes D9)
- 2 columns, tile height 104, radius 16, solid curated color per tile, title at the top-left (18/800), and a real artwork thumbnail (72 by 72, radius 8, rotated 24 degrees) overflowing the bottom-right corner with a soft shadow.
- Artwork source: the cover of the most popular track returned by the provider for that tile's genre or mood tag. Cache it. If no artwork is available the tile shows a Phosphor icon related to the category instead of an empty color block.
- Only show a tile if its query returns at least 10 playable tracks. Tile titles must describe what is really in the catalog (for example "Chill", "Lo-fi", "Acoustic", "Electronic", "Rock", "Hip-hop", "Jazz", "Classical", "Ambient", "Pop", "World", "Focus"). Do not label a tile with a category the catalog cannot fill.
- Tapping a tile opens the Genre page with a hero, a Play button and a track list.

### 6.3 Mini player and tab bar
- Glass floating tab bar and glass mini player per Section 3. Mini player shows the artwork, scrolling title, artist, like, play/pause with a thin progress line. Tapping opens Now Playing, swiping horizontally changes track, and swiping down on it does nothing. The mini player hides when Now Playing is open.

### 6.4 Now Playing redesign
- Blurred artwork background (Section 3). Large artwork (screen width minus 48, radius 24, soft shadow). Below it a glass panel (radius 28) containing: title (marquee), artist, like button, seek bar with time labels, and the control row (shuffle, previous, 64 px white circular play/pause, next, repeat). Under the panel a row of glass icon buttons: Queue, Lyrics, Sleep timer, Speed (only if verified), Share, Track info. Swipe artwork left or right to change track. Swipe down to collapse.

---

## 7. FEATURES TO ADD (all must be real and working; skip any you cannot verify)

- Jump back in card on Home (glass, large artwork) that resumes the last track at its saved position.
- Mood row on Home (Chill, Focus, Workout, Party, Romantic, Sad) mapped to real provider tags. Tapping plays a mix and opens Now Playing.
- Daily Mix 1, 2, 3: generated on device from liked songs, recent plays and chosen artists and languages (group by artist, genre or tag, then fill with similar tracks from the provider). Cards use a 2 by 2 artwork collage on a tinted gradient with the mix name.
- Synced lyrics: use a free public synced-lyrics service only after you read and report its terms. Show the current line highlighted, auto-scroll, tap a line to seek. If lyrics are not found, hide the card. Never invent or generate lyrics, and never store full lyrics permanently.
- Sleep timer (5, 10, 15, 30, 45, 60 minutes, end of track) with a visible countdown chip on Now Playing and a gentle 10-second fade-out of volume before stopping.
- Smart autoplay: when the queue ends, append similar tracks (same tags or artists), with a "Autoplay is on" label in the queue.
- Swipe gestures on track rows: swipe right adds to queue, swipe left likes, both with haptics and a short toast.
- Driving mode: a simplified full-screen mode with three oversized buttons (previous, play/pause, next), the title and artist in large text, and a lock to prevent accidental exit. Entry from Settings and from the Now Playing menu.
- Loopd Recap (on device only): listening time, top 5 artists, top 5 tracks and top genre for the last 30 days computed from local history, shown as a clean glass card, with a share action that exports the card as an image using the system share sheet. No server upload.
- Listening streak counter in Profile (days in a row with at least 1 completed track).
- Share a track or playlist: share the provider's public page link via the system share sheet.
- Queue improvements: drag to reorder, swipe to remove, "Clear queue" with an undo toast.
- No downloads or offline features (licensing; see the master spec).

---

## 8. SOURCE AUDIT (MUST DO FIRST, fixes D11)

I saw mainstream songs playing in the current build. The providers allowed by the master spec do not carry those catalogs, so find out where the audio comes from.
- List every network host the app uses for metadata, artwork and audio streams (inspect the code and capture traffic from the emulator or run the app and log request hosts). Save as docs/source-audit.md with: provider name, host, what it is used for, whether it is an official API with published terms, and the link to the terms.
- Mark any source that is unofficial, scraped, reverse-engineered, or that streams copyrighted music without a license from the rights holders.
- Do not continue using unofficial or unlicensed sources in the release build. Google Play does not allow apps that stream copyrighted music without authorization, and the app can be removed. Do not hide, rename or proxy such a source to work around this.
- If a source is removed, tell me what catalog remains and what the app will honestly look like with it (for example more independent and Creative Commons music, fewer mainstream artists). Update onboarding and Home to only reference what the remaining providers return.
- Metadata and artwork providers must also have terms that allow this use. If you cannot confirm that, do not ship it. Stop after writing the audit and show me the file before changing the catalog.

---

## 9. SELF-TEST PROTOCOL (you must run all of this yourself)

### 9.1 Environment
- Start an Android emulator with a recent system image (API 34 or newer, ideally API 36) or use the connected device over adb. Use a development build installed on it. Create three emulator profiles or screen sizes to check layouts: 360 by 800 dp, 412 by 915 dp and a tablet. Confirm the installed target SDK is 36.

### 9.2 Layers of tests
- Static: TypeScript strict (tsc --noEmit), ESLint, Prettier, and the banned-icon scan. Zero errors.
- Unit (Jest): player command queue (no concurrent commands, setup runs once), state machine transitions, playFromContext ordering, onboarding store (initial selection is exactly 0, selection persists only on Continue), grid math (item widths at 360, 393, 412, 600, 840), image fallback chain, language list and script rendering data, provider merge and dedupe, sleep timer, recap calculations, Daily Mix generation.
- Component (React Native Testing Library): language tile selection and the 5-item limit, artist tile rendering (never an empty gray circle), Continue button label logic ("Pick 2 more" and "Continue"), mini player visibility, Now Playing controls.
- End-to-end (Maestro on the emulator, flows saved in .maestro/):
  - onboarding_fresh_install.yaml
  - onboarding_skip.yaml
  - play_opens_fullscreen.yaml
  - play_state_stable.yaml
  - search_tiles_images.yaml
  - like_and_library.yaml
  - queue_actions.yaml
  - sleep_timer.yaml, lyrics.yaml (if enabled), driving_mode.yaml.
- System-level (adb, since Maestro does not reliably reach the notification shade): notification and lock screen checks from Section 2.2 plus: swipe the app away from recents while playing and confirm playback continues (media session still active); toggle airplane mode and confirm the offline banner and no crash; rotate and change font size to the largest and confirm no clipped text.
- Visual review: take screenshots with adb exec-out screencap -p of every screen in every state (loading, content, empty, error, offline) at each screen size. Check for: elements under the status bar or gesture bar, clipped or overlapping text, empty gray circles, flat placeholder tiles, inconsistent spacing, low-contrast text on glass or bright artwork. Fix and recapture until clean. Save to docs/test-evidence/screens/.
- Performance: measure cold start time, and record frame stats while scrolling Home and Search (adb shell dumpsys gfxinfo for the app). Targets: cold start under 3 seconds on the emulator profile used, and fewer than 5 percent janky frames. If blur hurts it, switch affected surfaces to the solid fallback.
- Release check: build the release AAB and a release APK, install the APK, and re-run the E2E flows and the notification checks on the release build (minification can break the player).

### 9.3 Reporting
- Write docs/test-report.md with a table: test id, what it checks, result (pass or fail), evidence file, date. Fix and re-run until everything passes.
- If a test cannot be automated, mark it MANUAL and add exact steps: real Bluetooth headset and car controls, phone brands that kill background apps, a phone call interrupting playback, and the first install from the Play internal testing track.

### 9.4 Definition of done
- Done means: all defects D1 to D11 are fixed with evidence, the source audit exists and was reviewed by me, the full test report is green, and a short summary lists what changed, what was not done and any limitation found.
- Do not start any new feature work before the audit file (Section 8) has been shown to me.
