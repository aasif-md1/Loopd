# Google Play Data Safety Declaration — Loopd

This document specifies the accurate, honest Data Safety disclosures for Loopd to be entered into Google Play Console.

## 1. Data Collection & Sharing Overview

- **Does the app collect or share user data?** Yes.
- **Is all user data encrypted in transit?** Yes (HTTPS / TLS 1.3).
- **Can users request their data to be deleted?** Yes (via in-app Settings > Account > Delete Account and via web at `/delete-account`).

---

## 2. Data Types Declared

### A. Personal Info
- **Email address**
  - Collected? Yes (if user signs in with email/Google).
  - Shared? No.
  - Optional or Required? Optional (Guest mode requires no email).
  - Purpose: Account management, multi-device synchronization.
- **Name / Display Name**
  - Collected? Yes.
  - Shared? No.
  - Optional or Required? Optional.
  - Purpose: App personalization, playlist ownership.

### B. App Activity
- **App Interactions (Songs played, search queries, favorites)**
  - Collected? Yes.
  - Shared? No.
  - Purpose: Music recommendations ("Because you picked", "Recently Played"), library sync.
  - Ephemeral / persistent: Stored locally in encrypted local storage and optionally Firestore if logged in.
  - User can clear history in Settings > Privacy.

### C. App Info and Performance
- **Crash logs and diagnostics**
  - Collected? Yes (Firebase Crashlytics).
  - Shared? Shared with Google/Firebase for crash monitoring.
  - Optional: Yes (User can disable in Settings > Privacy & Consent > Crash & Diagnostics Reporting).
  - Purpose: Analytics, diagnostics, improving app stability.

### D. Device or Other IDs
- **Device identifier / Push token**
  - Purpose: Media playback foreground service notification and diagnostics.

---

## 3. Advertising & Tracking Disclosures
- **Does Loopd show ads?** NO.
- **Does Loopd use advertising IDs or third-party ad SDKs?** NO.
- **Does Loopd sell user data?** NO.
