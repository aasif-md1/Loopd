LOOPD: MASTER BUILD PROMPT (React Native, Play Store ready)

Paste everything below this line into Antigravity.

0. ROLE AND NON-NEGOTIABLE RULES

You are a senior React Native engineer and a senior product designer. Build "Loopd", a free music streaming app for Android (primary) and iOS, using React Native with Expo (development build, not Expo Go) and TypeScript. It must behave like a professional, store-ready streaming app, with UI patterns and interaction quality comparable to the leading streaming apps.

Hard rules:

No emojis anywhere: not in the UI, copy, logs, commit messages or documentation.

Icons: use one premium icon family only, Phosphor Icons (phosphor-react-native) with weights "regular" for inactive and "fill" for active or selected states. No mixed icon sets. Icon sizes: 24 default, 20 inside chips and rows, 28 in the tab bar, 32 and 36 for player controls.

No generated or stock-looking UI. Follow the tokens and specs in this document exactly. Do not invent a different layout.

Do not use real data placeholders such as lorem ipsum or fake songs. Every list is fetched from the real music providers. Skeleton loaders are shown while loading.

Do not copy any third-party name, logo, icon or artwork. App name is Loopd. The app icon and splash image are supplied by me as files at assets/icon.png, assets/adaptive-icon.png, assets/splash-icon.png. Do not generate or redraw a logo; use these paths and a neutral dark placeholder until I replace them.

No ads. No in-app purchases. No tracking for advertising (see Section 12 for why).

Work in phases (Section 16). Finish a phase, run the acceptance tests for it, report results, then wait for me to say "next".

If any requirement is blocked by an API or platform limitation, stop and tell me the limitation and the closest working alternative. Never fake a feature.

1. KNOWN PROBLEMS IN THE PREVIOUS BUILD (MUST BE FIXED, THESE ARE ACCEPTANCE TESTS)

These came from real testing of an earlier version. Each one has a pass condition.

#ProblemPass conditionP1Tapping a song starts it only in a small bottom bar; the user must tap again to open full screenTapping any track row, card or play button starts playback AND immediately opens the full-screen Now Playing screen with a slide-up transition (Section 6). Swiping it down or tapping the chevron collapses it to the mini player.P2No media notification appears while a song playsA media notification with artwork, title, artist, previous, play/pause, next and a seek bar appears within 2 seconds of playback starting, on the lock screen and in the notification shade, and keeps working when the app is swiped away (Section 7).P3First-launch preference screens (favorite language, favorite singers) are poorReplace with the onboarding flow in Section 5: clear, skippable, fast, with visible effect on Home.P4UI generally unpolished and inconsistentUse only the design system in Section 3 through shared components. No inline hard-coded colors, sizes or fonts in screens. 

Do not report a phase as complete until P1 to P4 relevant to that phase pass on a real Android device (not only an emulator).

2. TECH STACK

Expo SDK (latest stable), TypeScript strict mode, Expo Router for navigation, EAS Build for release builds. Use a development build (expo prebuild or eas build --profile development). Native audio will not work in Expo Go, so do not rely on Expo Go.

State: Zustand (player, library, auth, settings, onboarding). Server cache: TanStack Query.

Audio: react-native-track-player (RNTP). Register the playback service in the root index.js right after the main app component using TrackPlayer.registerPlaybackService. Call TrackPlayer.setupPlayer() and await it before any other player call.

Lists: @shopify/flash-list. Images: expo-image with disk cache. Animation: react-native-reanimated v3 and react-native-gesture-handler. Bottom sheets: @gorhom/bottom-sheet. Gradients: expo-linear-gradient. Dominant color: react-native-image-colors. Haptics: expo-haptics.

Storage: react-native-mmkv for settings, recents and queue persistence.

Auth and sync: Firebase Auth (email and password, Google sign-in) and Firestore (likes, playlists, followed artists, preferences). Guest mode works fully offline from the cloud with local storage only.

Crash reporting: Firebase Crashlytics (must be declared in the store privacy disclosures, see Section 12).

Target Android API level 36 (compileSdk and targetSdk). Google Play requires new apps and updates to target Android 16 (API 36) from August 31, 2026 (an extension to November 1, 2026 may exist; verify in Play Console). Build an Android App Bundle (.aab), 64-bit.

Folder layout: /src/{api,providers,components,screens,navigation,store,hooks,services,theme,utils,types,i18n}. ESLint, Prettier, Jest for the player store and provider adapters.

3. DESIGN SYSTEM (single source of truth in /src/theme)

3.1 Color tokens

bg: #121212

bgElevated: #181818

card: #1F1F1F

cardPressed: #282828

highlight: #2A2A2A

accent: #1ED760 (pressed #1FDF64, disabled 40% opacity)

textPrimary: #FFFFFF

textSecondary: #B3B3B3

textMuted: #6A6A6A

divider: rgba(255,255,255,0.10)

error: #E91429

info: #509BF5

onAccent (text/icon on green): #000000

Header gradient on content pages: dominant artwork color at 55 to 65 percent opacity at top, fading to bg over the first 320 px.

Dominant colors must be darkened so white text always meets WCAG AA contrast (4.5:1 for body text). If the extracted color is too light, darken it before use.

3.2 Typography

Font: Figtree (Google Fonts, load with expo-font before first render, show native splash until loaded). Weights 400, 600, 700, 800.

displayLarge 32/38 weight 800 (screen titles on Now Playing artist hero, page headers)

title 24/30 weight 700

sectionHeader 22/28 weight 700

trackTitle 16/22 weight 600

body 14/20 weight 400

bodyStrong 14/20 weight 600

caption 12/16 weight 400 (secondary color)

micro 11/14 weight 600 (tab labels) Support dynamic type: scale fonts with the OS setting up to 130 percent and never clip text.

3.3 Spacing, shape, elevation

8-point grid (4, 8, 12, 16, 24, 32, 48). Screen horizontal padding 16.

Radius: album art 4 (small), 8 (large, Now Playing), cards 8, chips and buttons fully rounded (999), bottom sheets 16 top corners, artist images circular.

Press feedback: scale to 0.97 with a 100 ms spring, background to cardPressed for rows, light haptic on play, like and tab press. Respect "reduce motion": disable scale and parallax.

Minimum touch target 44 by 44 dp.

3.4 Shared components (build once, reuse everywhere)

Button (primary green pill, secondary outlined pill, tertiary text), IconButton, Chip (selected = white background with black text, unselected = highlight background), TrackRow, TrackRowCompact, AlbumCard, ArtistCard (circular), PlaylistCard, SectionHeader (title and optional "Show all"), SkeletonBlock (shimmer), EmptyState (icon, title, body, action), ErrorState (retry), Toast, Slider, EqualizerBars (3 animated bars shown on the currently playing row), Avatar, ListItem (settings row), SwitchRow, SheetHeader, ScreenHeader (with scroll-driven fade).

3.5 Tab bar and mini player geometry

Tab bar: 3 tabs (Home, Search, Your Library). Height 56 plus bottom safe area. Background: solid bg at 96 percent opacity with a 1 px divider on top. Active tab: filled icon and white label. Inactive: regular icon and textSecondary label. Icons: House, MagnifyingGlass, Books (Phosphor).

Mini player: sits 8 px above the tab bar, margin 8 px each side, height 56, radius 8, background = darkened dominant color of current artwork, artwork 40 by 40 radius 4, title (14, 600) and artist (12, textSecondary) with marquee when truncated, a like button, a play/pause button, and a 2 px progress line on the bottom edge. It is hidden when nothing is loaded and hidden on the Now Playing screen.

4. NAVIGATION MAP

Root stack:

(auth): Welcome, Login, Signup, ForgotPassword

(onboarding): Language, Artists (only after first signup or first guest launch; can be skipped)

(tabs): Home, Search, Library

Modal routes (presented over tabs): NowPlaying (full screen, slide up), Queue, Lyrics, TrackOptionsSheet, AddToPlaylistSheet, SleepTimerSheet, CreatePlaylist

Stack routes inside tabs: Album, Artist, Playlist, Genre, LikedSongs, RecentlyPlayed, SearchResults, Settings and its sub-screens, Profile, EditProfile

Legal and compliance routes: PrivacyPolicy, TermsOfService, DeleteAccount, Licenses (music credits and open source), About, Support

The mini player is rendered once in the tabs layout above the tab bar and also above stack routes pushed from tabs.

5. ONBOARDING AND AUTH (replaces the old language and singer screens)

Principles: few steps, always skippable, explain why each question is asked, and show the effect immediately. Do not ask for date of birth to decide recommendations. Age is handled with a single required checkbox at signup (see 5.2).

5.1 Welcome screen

Full-bleed bg, centered Loopd logo from assets, headline "Music for every mood." (displayLarge), subline "Free. No ads." (body, secondary). Buttons stacked, 12 px gap, each 48 high pill:

"Continue with Google" (white background, black text, Google "G" mark in monochrome allowed by the Google brand rules)

"Sign up with email" (outlined)

"Log in" (tertiary text button)

"Continue as guest" (tertiary text button, secondary color) Links under buttons: "Terms of Service" and "Privacy Policy" (open in-app screens). Text: "By continuing you agree to our Terms and acknowledge our Privacy Policy."

5.2 Signup

Fields: email, password (visibility toggle, strength hint), display name. Required checkbox: "I confirm I am 13 years or older." with a "Why we ask" info link (legal minimum age). Inline validation after blur, never on first keystroke. Primary button disabled until valid. Errors are specific ("This email is already registered. Log in instead?"). Keyboard-aware layout, "Next" and "Done" keyboard actions wired.

5.3 Language preference screen (step 1 of 2, shown once)

Title: "Which languages do you listen to?" Subtitle: "We use this to pick songs for your Home. You can change it anytime in Settings."

Multi-select chips in a wrapping layout, pill 44 high, minimum 1 and maximum 5 selections: English, Hindi, Punjabi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Urdu, Spanish, French, Portuguese, Korean, Japanese, Instrumental (no vocals).

Selected chip: white fill, black text, Phosphor "Check" icon. Unselected: highlight fill, white text.

Bottom bar (sticky): primary "Continue" (disabled until 1 selected) and "Skip for now" text button. Progress indicator "1 of 2" at top.

Implementation: use the provider's language or vocal-language filter if the API supports it. Verify against the provider docs before relying on it. If a language has no results from any provider, show it as available but display a small note afterward on Home: "Limited catalog for Hindi right now", never an empty broken Home.

5.4 Artist picker (step 2 of 2)

Title: "Pick artists you like". Subtitle: "Choose 3 or more. We will build your Home around them."

Search field at the top (debounced 300 ms) that searches artists across providers. Below it, a 3-column grid of circular artist avatars (96 px, 12 px gap), name under each (caption, 2-line clamp, centered). Initial list: popular artists fetched for the languages chosen in 5.3 (real API data), infinite scroll.

Selected state: 3 px accent ring and a small green circle with a black check at the bottom-right of the avatar; light haptic.

Sticky bottom bar: "N selected" label, primary "Done" (enabled at 3 or more) and "Skip for now" (always enabled). Because the real catalog may not contain the user's favorite mainstream artists, include a small helper line under the search: "Cannot find an artist? You can follow them later from Search."

After "Done": navigate to Home. Home must visibly show a section "Because you picked [Artist]" and a "Made for you" mix built from chosen languages and artists. Preferences are saved to Firestore when logged in and to MMKV otherwise.

If the user skips, Home shows trending in their chosen languages (or globally) and a gentle one-time card: "Pick a few artists for better picks" with a button back to this screen.

6. CORE PLAYBACK BEHAVIOR (fixes P1)

6.1 Single entry point

Create one function playFromContext(tracks, startIndex, source) in the player store. Every play action in the app (track row tap, card tap, big green play button, shuffle button, search result tap, quick tile tap) calls only this function. It must:

Replace the queue with tracks starting at startIndex (store source for "Playing from ...").

Start playback.

Call openNowPlaying(), which presents the NowPlaying modal full screen with a slide-up transition if it is not already open. If it is already open, only the content changes (no second push). Settings has a switch "Open player when a song starts" defaulting to ON.

6.2 Now Playing screen layout (top to bottom, 24 px side padding)

Header row: chevron-down IconButton (collapse), centered two-line label ("PLAYING FROM" in micro/secondary, source name in bodyStrong), three-dots IconButton.

Artwork: width = screen width minus 48, square, radius 8, shadow. Scale 0.88 when paused and 1.0 when playing (200 ms spring). Horizontal swipe on artwork changes track with a slide animation.

Title row: title (title style, marquee if truncated) and artist (16, secondary, tappable to open artist). Right side: like button (Heart outline, filled green when liked, with a pop animation).

Seek bar: 4 px track, thumb appears (12 px) while dragging, elapsed time left and remaining time right (caption). While seeking, show the scrubbed time. Buffered range in a lighter shade.

Controls row: shuffle (24), previous (36), play/pause (64 circular white button, black icon), next (36), repeat (24; three states off, repeat-all, repeat-one, active ones green with a dot below).

Bottom row: queue icon (opens Queue), share icon, and a "Track info" icon (opens credits and license sheet, Section 11).

Below the fold (vertical scroll): Lyrics card (synced if available from the public lyrics service, otherwise "Lyrics not available"), "About the artist" card, "Credits" card. Background: vertical gradient from darkened dominant color to bg. Swipe down anywhere on the header or artwork area to dismiss with interactive drag.

6.3 Queue behavior

Queue screen shows "Now playing", "Next in queue" (user-added items, drag handle to reorder, swipe to remove) and "Next from [source]".

"Add to queue" and "Play next" actions from the track options sheet.

Shuffle shuffles the remaining items without changing the current track. Repeat-one repeats the current track. When the queue ends and autoplay is enabled, append similar tracks (same genre, tag or artist) automatically.

6.4 Persistence and errors

Remember the last queue, track and position across app restarts. Restore into the mini player (paused) on launch.

If a stream URL fails, try the same track from the next provider, then skip to the next track and show a toast "Couldn't play that one. Skipped." Never leave the player stuck in a buffering state: add a 15 second timeout.

Offline: show a persistent slim banner "You're offline" on lists that need network. Playback of the already buffered item can finish; do not pretend downloads exist.

Audio focus: pause on phone calls, duck for navigation prompts, pause when headphones are unplugged, resume only if it was paused by transient focus loss.

7. NOTIFICATIONS, LOCK SCREEN AND BACKGROUND PLAYBACK (fixes P2)

Configure all of the following; each item is a checklist entry for acceptance.

Playback service: service.js registered at root via registerPlaybackService. Handle events: RemotePlay, RemotePause, RemoteNext, RemotePrevious, RemoteSeek, RemoteStop, RemoteDuck (pause and resume per ducking info).

In TrackPlayer.updateOptions set capabilities to Play, Pause, SkipToNext, SkipToPrevious, SeekTo, Stop, and compactCapabilities to Play, Pause, SkipToNext. Set android.appKilledPlaybackBehavior to ContinuePlayback so playback and the notification survive the app being swiped away. Set a progress update interval of 1 second.

Every track added to the player must carry: id, url, title, artist, album, artwork (https URL, at least 512 by 512), duration. Update now-playing metadata whenever the active track changes.

Android manifest permissions and service config: FOREGROUND_SERVICE, FOREGROUND_SERVICE_MEDIA_PLAYBACK, WAKE_LOCK, POST_NOTIFICATIONS, plus the foreground service type for media playback on the player service. Verify the generated manifest after prebuild.

Notification permission (Android 13 and above): media session notifications are exempt from the runtime notification permission, but the foreground service notification is not. Therefore request POST_NOTIFICATIONS in context, right after the user starts playback for the first time, with a one-line rationale sheet first ("Allow notifications so you can control music from the lock screen"). Never ask on first launch. If denied, playback still works and the in-app UI shows a one-time hint in Settings to enable it.

Small notification icon: a monochrome white vector icon at assets/notification-icon.png (96 by 96 transparent PNG). Accent color #1ED760.

iOS: enable the Audio background mode in app config (UIBackgroundModes: audio). Provide Now Playing info and remote command center actions. Lock-screen controls cannot be tested in the iOS Simulator; test on a real iPhone.

Tapping the notification opens the app directly on the NowPlaying screen (handle the notification-click deep link in the Linking handler and route to NowPlaying).

Bluetooth, headset buttons, Android Auto-style steering controls (play, pause, next, previous) must work through the same remote events.

Test on real hardware: Android 12, 13, 14 and 15 or 16 devices if available. Test the app killed from recents while playing.

Acceptance: start a song, press Home, pull the shade: notification with artwork and buttons is visible; swipe the app away from recents: music keeps playing and the notification stays; tap next on the notification: the next track plays and the notification updates.

8. SCREEN SPECIFICATIONS

For every screen implement four states: loading (skeleton), content, empty (EmptyState with an icon, one line and an action) and error (ErrorState with retry).

8.1 Home

Greeting header "Good morning/afternoon/evening" (title style), top-right icons: Bell (notifications inbox, can be a simple empty state), ClockCounterClockwise (Recently played), GearSix (Settings).

Filter chips row: All, Music (extra chips only for sections that really exist).

Quick-access grid: 2 columns, 6 tiles, tile height 56, background highlight, radius 4, 56 px square art on left, title on right (14, 600, 2 lines). Content: recently played items, falling back to picks from the user's languages. Tap plays via playFromContext and opens Now Playing.

Vertical stack of horizontal carousels, each with SectionHeader: "Because you picked [Artist]", "Made for you", "Recently played", "Trending now", "New releases", "Popular artists" (circular), "Popular albums", "Browse by mood and genre". Card width 148, art radius 4 (artists circular), title 14/600 1 line, subtitle 12 secondary 2 lines.

Pull to refresh, pagination inside carousels, deduplicated results across providers.

8.2 Search

Sticky search field: height 48, radius 8, background highlight (#2A2A2A), white text, MagnifyingGlass icon on the left, X icon to clear on the right, placeholder "What do you want to play?".

Before typing: "Start browsing" title and a 2-column grid of genre/mood tiles, each with its own flat color from a fixed curated palette of 12 dark-friendly colors, title top-left (bold), and artwork rotated 25 degrees at bottom-right (real image from the top track of that genre, overflowing the tile corner). Recent searches list with a clear-all action.

Typing: debounced 300 ms live results, chips All, Songs, Artists, Albums, Playlists; a "Top result" card first; results across providers merged and deduplicated.

Empty results: EmptyState "No results for [query]" with a hint to check spelling.

8.3 Your Library

Header: avatar (opens Profile), title "Your Library", icons MagnifyingGlass and Plus (opens create playlist sheet: "Playlist").

Chips: Playlists, Artists, Albums. Sort row ("Recents", "Recently added", "Alphabetical") and a grid/list toggle.

Pinned first item: "Liked Songs" with a purple-to-blue gradient tile and a white Heart icon, showing the song count.

Long-press on an item opens a context sheet (Pin, Rename, Delete for playlists; Unfollow for artists).

Guest users see a banner "Log in to keep your library on all devices" (dismissible).

8.4 Playlist and Album pages

Centered cover 232 by 232 with shadow on dominant-color gradient, title (title style), owner or artist line, meta line (year, track count, total duration).

Action row: Heart (save), DotsThree (options), Shuffle toggle, and a 56 px green circular Play button on the right. Track rows: index or artwork, title, artist, explicit tag if provided, DotsThree. Currently playing row shows EqualizerBars and green title.

Sticky header fades in the title as the cover scrolls away. Album page footer shows the release date and rights holder text provided by the API.

Playlist owner can rename, edit description, reorder (drag handles in edit mode), remove tracks and delete.

8.5 Artist page

Parallax hero image, name overlay (displayLarge), monthly listeners only if the provider returns real data (otherwise do not show a number).

Follow/Following pill, Shuffle and a green Play button. "Popular" (top 5 tracks, "See more"), "Discography" with chips Albums and Singles, "Fans also like" (related artists if available), "About" card (bio from API).

8.6 Track options sheet

Rows with 24 px icons: Heart (Like), PlusCircle (Add to playlist), ListPlus (Add to queue), SkipForward (Play next), Disc (Go to album), User (Go to artist), ShareNetwork (Share), Moon (Sleep timer), Info (Track info and license). Header shows artwork, title and artist.

8.7 Settings

Sections: Account (email, display name, change password, Log out, Delete account), Playback (Open player when a song starts, Crossfade 0 to 12 s, Gapless, Normalize volume, Autoplay similar songs), Audio quality (Low, Normal, High; applies to providers that offer multiple bitrates), Data saver (use lower quality on mobile data), Language (music languages from onboarding, app language), Notifications (link to system settings), Privacy (Privacy Policy, Terms of Service, Data and privacy controls), About (version, Licenses and credits, Support email), Clear cache. Do not include a theme switch (dark only) and do not include a Downloads section.

8.8 Profile and Edit Profile

Avatar upload (from gallery with a cropper), display name, public playlists list. No follower counts unless backed by real data.

9. MUSIC DATA AND PROVIDERS

Define a MusicProvider interface: search, getTrack, getAlbum, getArtist, getPlaylist, getCharts, getGenres, getRelated, getStreamUrl. Adapters: Jamendo (primary), Audius (secondary). Merge and dedupe results by normalized title plus artist plus duration.

Deezer: its public API only gives 30-second previews. Use it only for metadata if its terms allow it for this use; if you cannot confirm the terms, do not ship a Deezer adapter.

API keys come from .env (never hardcoded) and are excluded from git. Provide .env.example.

Add retry with backoff, request timeout, in-memory plus MMKV cache, and rate limit awareness. Infinite scroll pagination everywhere.

Catalog honesty: these providers carry independent artists and Creative Commons music, not most mainstream label catalogs. The artist picker, search and Home must therefore use only what the APIs return. If a requested artist or language has few results, say so in the UI. Do not substitute fake data.

Lyrics: use a public synced-lyrics service only if its terms permit it. Show plain text if timestamps are missing. Lyrics are optional; if you cannot confirm terms, ship without them and keep the card hidden.

10. LIBRARY AND SYNC

Like and unlike (optimistic UI with rollback), follow artists, save albums, create, rename and delete playlists, add, remove and reorder tracks, recently played history (last 50), search history (last 20).

Firestore structure under users/{uid}: preferences (languages, artists), likes, playlists, follows. Security rules: a user can read and write only their own documents. Provide the rules file.

Guest data lives in MMKV. When a guest logs in, offer to merge guest data into the account.

11. MUSIC LICENSING AND ATTRIBUTION (REQUIRED FOR COMPLIANCE)

Findings that shape the product:

The Jamendo API is free only for non-commercial use. Advertising, affiliate revenue or any monetary gain counts as commercial and needs a separate license agreement with the provider. Therefore Loopd stays free with no ads and no purchases unless I obtain that license.

The Jamendo terms say apps must not be designed to cache content or provide offline access. Google Play policy also does not allow streaming apps to let users keep a local copy of copyrighted content without authorization. Therefore there is no download or offline-music feature. Use the player's normal streaming buffer only.

Jamendo requires crediting the artist, crediting Jamendo as the provider, linking each track to its page on the provider, using the provider's official unmodified logo and buttons where used, and following each track's Creative Commons license.

Apps must not look confusingly similar to the provider or imply endorsement.

Implementation:

Track info sheet (opened from Now Playing and the track options sheet) shows: title, artist (linked to the provider's artist page), album, license name (for example CC BY-NC-SA) with a link to the license text, a "Music provided by Jamendo" line with the provider's official logo and a button that opens the track page in the browser.

A short credit line "via Jamendo" or "via Audius" beneath the artist on Now Playing.

Settings > About > Licenses and credits lists the providers, the Creative Commons notice, and the open-source licenses of all dependencies (generate with a license-collection tool).

Before launch, read the current Audius terms and the Jamendo terms again and report to me any requirement not covered here.

12. PRIVACY, LEGAL AND ACCOUNT SCREENS (PLAY STORE REQUIREMENTS)

Build these as real screens and as hosted public web pages (static HTML in /web, deployable to Firebase Hosting or GitHub Pages) because Play Console requires public URLs.

Privacy Policy screen and web page. Must state, in plain language: who we are and a contact email; what we collect (email, display name, profile photo if provided, listening history, likes, playlists, language and artist preferences, crash logs and basic device info for Crashlytics); why (to run the service, sync across devices, fix crashes, personalize the Home); what we do not do (no ads, no selling data, no advertising profiles); third parties (Firebase/Google for auth, database and crash reporting, and the music providers for streaming); retention and deletion; user rights; children (the app is not directed to children under 13); security; changes to the policy; effective date. Provide a template with clearly marked placeholders for company name, email and address. State in the response that a qualified lawyer should review it before publishing. Cover India's Digital Personal Data Protection Act and GDPR style rights (access, correction, deletion, withdrawal of consent) in general terms.

Terms of Service screen and web page: acceptable use, music is provided by third-party artists under their licenses, no warranty, termination, governing law placeholder.

Account deletion (mandatory for apps that allow account creation): (a) in-app path Settings > Account > Delete account that is easy to find, asks for re-authentication, explains exactly what gets deleted, requires a confirmation tap, then deletes the Firebase Auth user and all Firestore data and clears local data; (b) a public web page /delete-account showing the app name exactly as on the Play listing, clear steps, and a request form or email flow that deletes the account and data without needing the app installed. Mention any data retained (for example security logs for a stated period) in the privacy policy.

Data safety mapping file docs/data-safety.md listing every data type collected, whether it is shared, whether collection is optional, encryption in transit, and the deletion method, ready to copy into Play Console. Declare Crashlytics and Firebase usage honestly.

Consent and controls: Settings > Privacy > Data and privacy controls with a switch for crash and diagnostics reporting (default on, can be turned off), and a "Clear listening history" action.

Sign-up age confirmation (Section 5.2). Content rating: music app with user-generated playlist names; prepare answers for the Play content rating questionnaire in docs/store-listing.md.

In-app Support screen with a contact email and a "Report a problem" form that opens the email app with the device and app version prefilled (no extra personal data).

13. QUALITY, PERFORMANCE AND ACCESSIBILITY

60 fps scrolling (FlashList, memoized rows, images sized to the display size). Cold start under 3 seconds on a mid-range Android device. Keep JS bundle small (Hermes on, remove unused dependencies, enable R8 and resource shrinking in release).

Screen reader labels on every control (accessibilityLabel, role, state). Do not rely on color alone for meaning. Text contrast AA. Touch targets 44 dp. Support font scaling and RTL layout mirroring where the OS asks.

Haptics are subtle and optional. Animations use Reanimated worklets; the player slider and mini player progress must not re-render the whole tree.

Errors never show raw exception text; use friendly messages with a retry.

All user-facing strings go through i18n (English first, structure ready for Hindi).

14. RELEASE READINESS (PLAY STORE)

Deliver these artifacts and report their status:

app.config.ts with name "Loopd", package com.loopd.app (confirm it is available), versionCode and versionName strategy, adaptive icon, splash, permissions list reviewed for the minimum needed, target API 36.

EAS profiles: development, preview (APK for testers), production (AAB). Release signing with Play App Signing. ProGuard/R8 enabled and verified that RNTP and Firebase still work in the release build.

docs/store-listing.md: short description (80 characters max), full description, feature list, 8 screenshot captions, feature graphic spec (1024 by 500), content rating answers, Data safety answers, target audience (13 and over), privacy policy URL, account deletion URL, contact email.

Pre-launch checklist in README: test on at least 3 real devices, run the Play pre-launch report, fix crashes, check the current closed-testing requirement for new developer accounts in Play Console before planning the production release date.

Store listing must not use any third-party brand name, logo or imagery, and must not imply affiliation with any other music service.

15. FULL ACCEPTANCE TEST LIST (RUN AND REPORT)

Fresh install, tap Continue with Google or email: reaches language screen, then artist picker, then Home with a "Because you picked" row. Skip on both screens also works and Home is not empty.

From Home, tap any song: Now Playing opens full screen immediately with the song playing (P1). Swipe down: mini player appears. Tap mini player: Now Playing opens again.

Tap a different song while the mini player is showing: playback switches and Now Playing opens full screen again (setting ON). With the setting OFF, only the mini player updates.

Start a song, press Home: notification with artwork, title, artist and buttons exists; lock the phone: lock-screen controls work; swipe app away: playback continues (P2).

Headphone button and Bluetooth next and previous work.

Kill network mid-song: friendly banner, no crash, playback behaves sensibly; restore network: lists refresh.

Like a song: heart pops, appears in Liked Songs, persists after restart and syncs after login on a second device.

Create a playlist, add tracks, reorder, delete.

Sleep timer stops playback at the chosen time.

Settings > Account > Delete account removes data, and the public deletion page loads.

Privacy Policy, Terms and Licenses open without network errors (bundled copy plus link to the hosted copy).

Rotate and font scale tests do not break layouts. Screen reader reads Now Playing controls correctly.

Release AAB installs and behaves the same as the debug build.

16. PHASES (stop after each one and wait for "next")

Phase 1: project setup, design system and shared components, navigation skeleton, provider layer with real data, Home and Search, skeletons and error states. Phase 2: player engine, playFromContext, Now Playing, mini player, queue, notification and lock-screen controls, persistence (this phase must satisfy P1 and P2 on a real device before continuing). Phase 3: welcome, auth, onboarding (language and artist picker), library, likes, playlists, Firestore sync and security rules. Phase 4: album, artist, genre pages, track info and license sheet, settings, sleep timer, lyrics (if terms confirmed). Phase 5: privacy, terms, account deletion (in-app and web), data safety docs, store listing docs, accessibility pass, performance pass, release build and pre-launch checklist.

At the end of each phase output: what works, what was tested on which device, what is not done, and any limitation found.


</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-17T11:31:41+05:30.

The user's current state is as follows:
Other open documents:
- d:\Loopd\node_modules\react-native-worklets\android\CMakeLists.txt (LANGUAGE_CMAKE)
- d:\Loopd\android\app\build.gradle (LANGUAGE_GRADLE)
- d:\Loopd\android\build.gradle (LANGUAGE_GRADLE)
- d:\Loopd\android\local.properties (LANGUAGE_INI)
- d:\Loopd\src\types\music.ts (LANGUAGE_TYPESCRIPT)
No browser pages are currently open.
</ADDITIONAL_METADATA>