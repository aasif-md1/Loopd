# LOOPD NETWORK SOURCE & CATALOG AUDIT

**Date:** 2026-10-17  
**Auditor:** Loopd Core Engineering & QA  
**Document Status:** Complete (Awaiting User Review before catalog changes)

---

## 1. Network Hosts Inventory

| Provider Name | Network Host / Endpoint | Usage in App | Official API with Published Terms? | Link to Official Terms / Developer Portal | Licensing / Legal Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **JioSaavn (Unofficial)** | `https://www.jiosaavn.com/api.php` | Search, charts, top trending songs, song/album/artist metadata | **NO**. Unofficial internal endpoint | No public developer API. Consumer terms: [JioSaavn Terms of Service](https://www.jiosaavn.com/corporate/terms) | **UNOFFICIAL / REVERSE-ENGINEERED**. Uses internal web endpoint without API agreement. |
| **JioSaavn CDN (Streams)** | `https://*.saavncdn.com`, `https://aac.saavncdn.com` | Full-length 320 kbps / 160 kbps MP4/AAC copyrighted audio streams | **NO**. Decrypted via client-side DES-ECB with embedded static key `38346591` | None | **UNAUTHORIZED STREAMING OF COPYRIGHTED MUSIC**. Streams commercial Bollywood, Punjabi, and international records without distribution license. |
| **JioSaavn CDN (Artwork)** | `https://c.saavncdn.com` | Artist portraits, album art, playlist covers | **NO** (CDN direct scraping) | None | **UNAUTHORIZED USE OF COPYRIGHTED ARTWORK**. |
| **Jamendo** | `https://api.jamendo.com/v3.0` | Independent & Creative Commons music tracks, albums, artist info, full-length audio streams | **YES**. Official Developer API | [Jamendo API Terms & License](https://developer.jamendo.com/v3.0/terms) | **LEGAL & AUTHORIZED**. Free API for non-commercial streaming of CC and Jamendo-licensed independent music. |
| **Audius** | `https://api.audius.co`, `https://discoveryprovider.audius.co` | Decentralized music streaming, indie/electronic artists, trending tracks | **YES**. Official Open API | [Audius Developer Documentation & Terms](https://docs.audius.org/) | **LEGAL & AUTHORIZED**. Open protocol for artists who publish directly under open licenses. |
| **Deezer** | `https://api.deezer.com` | Metadata lookup, artist profiles, track info, 30-second audio previews | **YES**. Official Developer API | [Deezer API Terms of Use](https://developers.deezer.com/api/terms) | **AUTHORIZED FOR 30s PREVIEWS ONLY**. Deezer explicitly forbids playing full audio or streaming beyond 30s clips without their SDK. |
| **Unsplash** | `https://images.unsplash.com` | Fallback cover art placeholders for user-created playlists | **YES**. Official public CDN | [Unsplash License](https://unsplash.com/license) | **LEGAL & AUTHORIZED** for free use. |

---

## 2. Risk Assessment & Google Play Compliance

### 2.1 Critical Violation: JioSaavn Reverse-Engineered Streams
- **Mechanism in Code (`src/api/providers/jiosaavn.ts`)**:
  - Sends requests to `https://www.jiosaavn.com/api.php?__call=...` imitating browser user agents.
  - Receives encrypted media URLs in DES format (`encrypted_media_url`).
  - Decrypts URLs using a hard-coded static DES key (`38346591` in `decryptMediaUrl()`).
  - Plays full commercial recordings from JioSaavn CDNs directly.
- **Google Play Developer Program Policy**:
  - Violates **Intellectual Property & Copyright Policy**: Apps that stream commercial copyrighted music without express authorization from record labels or rights owners are subject to immediate suspension, Play Store removal, and developer account termination.
  - Violates **Circumvention of Access Controls**: Decrypting private CDN streams using reverse-engineered cryptographic keys is classified as unauthorized access.

---

## 3. Honest Catalog Reality & User Experience Impact

If JioSaavn is removed to strictly comply with Google Play Store policies and Section 8:

### 3.1 Remaining Legal Catalog (Jamendo + Audius)
- **What is in this catalog**:
  - **Jamendo**: Over 600,000 independent and Creative Commons tracks across Rock, Pop, Electronic, Hip-Hop, Acoustic, Lo-Fi, Jazz, Classical, and Ambient.
  - **Audius**: Independent EDM, hip-hop, beats, lo-fi, and emerging global artists.
- **What is NOT in this catalog**:
  - Zero mainstream Bollywood film songs (e.g., Arijit Singh, Pritam, Shreya Ghoshal, Badshah).
  - Zero mainstream Punjabi commercial tracks (e.g., Diljit Dosanjh, AP Dhillon, Karan Aujla).
  - Zero mainstream US/UK top-40 label tracks (e.g., The Weeknd, Taylor Swift, Drake).

### 3.2 Impact on App Features
- **Onboarding Step 1 (Languages)**:
  - Language categories like English, Instrumental, Spanish, Chill, and Electronic will have abundant music from Jamendo and Audius.
  - Indian regional languages (Bhojpuri, Haryanvi, Rajasthani, Telugu, Tamil, Malayalam) will have near-zero or extremely sparse catalog under Jamendo/Audius.
- **Onboarding Step 2 (Artists)**:
  - The curated list of Bollywood/Punjabi superstars must be replaced with popular featured artists from Jamendo & Audius (or genre/vibe-based discovery).
- **Search & Browse**:
  - "Browse All" tiles must be curated around real independent music moods and genres (Lo-Fi, Synthwave, Chill, Indie Rock, Ambient, Cinematic, Hip-Hop Beats).

---

## 4. Proposed Recommendation & Path Forward

Per Section 8 rules:
> *"Stop after writing the audit and show me the file before changing the catalog."*

We await the user's explicit decision on:
1. **Option A (Strict Play Store Compliance)**: Fully remove JioSaavn provider; pivot catalog entirely to Jamendo + Audius (independent / Creative Commons music) with honest genre-first onboarding.
2. **Option B (Personal/Sideloaded / Unofficial Streaming App)**: Keep JioSaavn for personal APK use, but note that it cannot be published on Google Play Store without suspension risk.
