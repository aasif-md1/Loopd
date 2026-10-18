<div align="center">

<img src="./assets/images/logo-transparent.png" alt="Loopd Music" width="160" height="160" />

# Loopd Music 🎵
### *High-Fidelity, Ad-Free Music Streaming for Android & Windows*

[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Windows%20%7C%20Web-1ED760?style=for-the-badge&logo=android&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](#)
[![React Native](https://img.shields.io/badge/React_Native-Expo_v54-61DAFB?style=for-the-badge&logo=react&logoColor=black)](#)
[![Electron](https://img.shields.io/badge/Electron-Desktop-47848F?style=for-the-badge&logo=electron&logoColor=white)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](#)

<p align="center">
  <b>Loopd</b> is a modern, lightweight, ad-free music streaming application designed with an ultra-premium OLED aesthetic, synchronized lyrics, lossless 320kbps audio playback, and seamless cross-platform support.
</p>

---

## 📥 Download Loopd (Latest Releases)

Get the latest production build directly for your device:

| Platform | Download Link | Requirements |
| :--- | :--- | :--- |
| 📱 **Android** | [**Download Loopd.apk (v1.0.0)**](https://github.com/aasif-md1/Loopd/releases/latest/download/Loopd-Music.apk) | Android 8.0+ (ARM64 & Universal) |
| 💻 **Windows** | [**Download Loopd Setup.exe (v1.0.0)**](https://github.com/aasif-md1/Loopd/releases/latest/download/Loopd-Music-Setup.exe) | Windows 10 / 11 (64-bit) |

> 💡 *To install on Android:* Download the `.apk` file, tap **Install**, and allow "Install from Unknown Sources" if prompted by your browser or file manager.  
> 💡 *To install on Windows:* Run `Loopd-Music-Setup.exe`. It automatically creates a clean desktop shortcut and start menu entry.

---

</div>

## ✨ Key Features

- **🎧 High-Fidelity Audio:** Stream up to 320kbps AAC/MP3 and lossless FLAC quality with zero ads or interruptions.
- **🎤 Synchronized Lyrics:** Real-time karaoke-style word-by-word synced lyrics for thousands of regional and international songs.
- **🏝️ Dynamic Island & Mini Player:** Smooth expandable mini player with gesture controls, fluid scrubbers, and responsive haptics.
- **🎙️ Voice Search & Acoustic Studio:** Integrated intelligent voice search with real-time sinusoidal frequency waves.
- **🌐 Multilingual Regional Music:** Curated music catalog across Hindi, Punjabi, English, Bhojpuri, Haryanvi, Tamil, Telugu, and more.
- **🖤 True OLED Dark Aesthetic:** Sleek glassmorphism, Spotify-inspired emerald green accents (`#1ED760`), and seamless navigation.
- **💻 Full Windows Desktop Integration:** Dedicated Electron native software build with persistent storage, media keys, and hardware acceleration.
- **📂 Offline & Local Library:** Download songs for offline listening, create custom playlists, and manage your favorites.

---

## 🛠️ Tech Stack

- **Framework:** [Expo](https://expo.dev/) & [React Native](https://reactnative.dev/) (New Architecture)
- **Routing:** [Expo Router v4](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Desktop Runtime:** [Electron](https://www.electronjs.org/) + NSIS Windows Installer
- **Audio Core:** Android Media3 / ExoPlayer Native Bridge & Web Audio API
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) with permanent persistence
- **Icons & Visuals:** Phosphor Icons & Custom Sinusoidal Acoustic Wave Visualizer
- **Styling:** Vanilla Flexbox design system tailored for 60fps+ fluidity

---

## 🚀 Getting Started (Development Setup)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- Android Studio & JDK 17 (for Android native builds)

### 1. Clone the Repository
```bash
git clone https://github.com/aasif-md1/Loopd.git
cd Loopd
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Locally

#### 📱 Android (Development)
```bash
npx expo run:android
```

#### 💻 Windows Desktop (Electron Dev Server)
```bash
npm run electron:dev
```

#### 🌐 Web Preview
```bash
npm run web
```

---

## 📦 Building Releases

### Build Android Release APK
```bash
cd android
./gradlew assembleRelease
# The APK will be generated at android/app/build/outputs/apk/release/
```

### Build Windows Installer (.exe)
```bash
npx expo export --platform web
npm run dist:win
# The NSIS installer will be generated in release-windows/
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <b>Built with ❤️ by <a href="https://github.com/aasif-md1">Aasif</a></b>
</div>
