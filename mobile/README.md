# MyWatchedLists Android Mobile Application 📱

A genuine, installable Android mobile application built with **React Native**, **Expo (SDK 58)**, **TypeScript**, and **Expo Router**, featuring a dark cinematic design aesthetic. It connects directly to your existing Express backend and MongoDB database, preserving your authentication, watch history, ratings, episode tracking, and AI filters.

---

## 🏗️ Architecture & Technology Stack

- **Framework**: React Native with Expo SDK 58 & Expo Router
- **Language**: TypeScript (Strict typing, zero errors)
- **Design System**: Dark Cinematic Theme (`#0B0E14` near-black, crimson `#E50914` accents, gold `#F5C518` stars, smooth micro-animations)
- **Navigation**: Expo Router (5-tab bottom navigation + stack navigation for Media, Person, AI Filter, and Shared Lists)
- **Authentication**: JWT token management with `expo-secure-store` and `AsyncStorage` fallback
- **Networking**: Centralized Axios API client with dynamic server URL resolution, 401 interceptors, and request timeouts
- **Icons**: Lucide React Native
- **Metadata**: The Movie Database (TMDB) v3 API with client-side image optimization

---

## 📂 Project Directory Structure

```text
mobile/
├── .env                  # Active environment configuration (API URL & TMDB key)
├── .env.example          # Environment variables template with placeholders
├── app.json              # Expo application configuration & Android package (com.mywatchedlists.app)
├── eas.json              # EAS Build profiles for installable APK generation
├── package.json          # Mobile dependencies & NPM scripts
├── tsconfig.json         # TypeScript configuration
├── android/              # Native Android project with Gradle build scripts
│   ├── app/
│   ├── gradle/
│   ├── gradlew.bat
│   └── local.properties
├── assets/               # App icons, splash screens, and adaptive launcher graphics
└── src/
    ├── app/              # Expo Router screens & file-based routes
    │   ├── _layout.tsx           # Root navigation stack with Context Providers
    │   ├── (auth)/               # Authentication route group
    │   │   ├── _layout.tsx
    │   │   ├── login.tsx         # Sign in screen with inline server IP configuration
    │   │   └── register.tsx      # Sign up screen with validation
    │   ├── (tabs)/               # Bottom-tab primary destinations
    │   │   ├── _layout.tsx       # Bottom tabs navigation bar
    │   │   ├── index.tsx         # Home dashboard (stats, continue watching, carousels)
    │   │   ├── discover.tsx      # Search & Discover movies & TV series
    │   │   ├── library.tsx       # Full watch history with category filters & view toggle
    │   │   ├── lists.tsx         # Custom recommendation lists management & sharing
    │   │   └── profile.tsx       # Profile, analytics, password change, and IP config
    │   ├── media/
    │   │   └── [id].tsx          # Unified Movie & TV Series details, tracking & seasons
    │   ├── person/
    │   │   └── [id].tsx          # Cast & Crew biography, Known For, & filmography
    │   ├── aifilter/
    │   │   └── index.tsx         # Gemini AI natural language filter with chips & cards
    │   └── shared-list/
    │       └── [shareId].tsx     # Public shared custom list viewer
    ├── components/
    │   ├── common/               # Reusable UI components (Button, Badge, StarRating, etc.)
    │   ├── media/                # MediaCard, MediaPosterRow, EpisodeTracker, Add/Edit Modals
    │   └── lists/                # CustomListCard, CreateListModal
    ├── config/
    │   └── env.ts                # Dynamic IP resolution, TMDB endpoints, storage keys
    ├── constants/
    │   └── theme.ts              # Dark cinematic color palette, radiuses, typography
    ├── context/
    │   ├── AuthContext.tsx       # User session state & persistent login
    │   ├── ToastContext.tsx      # In-app toast alerts
    │   └── WatchHistoryContext.tsx # Watch history store & aggregate statistics
    ├── services/
    │   ├── api.ts                # Central Axios client with dynamic base URL
    │   ├── authService.ts        # Register, login, change password, profile
    │   ├── customListService.ts  # CRUD for custom lists & public share
    │   ├── storage.ts            # Secure token storage
    │   ├── tmdbService.ts        # TMDB metadata, seasons, credits, recommendations
    │   └── watchService.ts       # Watch history CRUD & Gemini AI filter
    └── types/
        ├── auth.ts
        ├── customList.ts
        └── media.ts
```

---

## ⚙️ Environment Configuration & Server IP Setup

The mobile app communicates with the existing Express backend (`http://...:5000`).

### 1. Connecting to Deployed Production Backend (Live on Render)
- The mobile app is pre-configured to communicate directly with your live cloud backend:
  `EXPO_PUBLIC_API_URL=https://mywatchedlist-backend.onrender.com`
- This allows the app to work seamlessly on any phone, anywhere in the world (over Wi-Fi or 4G/5G mobile data), without needing a computer running locally.

### 2. Optional: Local Development (Same Wi-Fi)
1. If you wish to run the backend locally instead of Render:
   Set `EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:5000` in `mobile/.env`.
2. **Tip**: You can also switch between Render and Local Wi-Fi directly inside the app on the Login screen or in the Profile tab under "Server Connection"!

---

## 🚀 Running the App Locally

### Step 1: Start the Backend Server
From the root project directory:
```bash
npm run dev:backend
```
The backend starts on `http://localhost:5000` and connects to MongoDB.

### Step 2: Start the Mobile App
In another terminal, run:
```bash
npm run mobile
```
This starts the Expo development server.
- **On Physical Device**: Install the **Expo Go** app from Google Play Store. Scan the QR code shown in the terminal.
- **On Android Emulator**: Press `a` in the terminal to open the app on your connected Android emulator.

---

## 📦 Generating an Installable Android APK

### Option A: Local Android Gradle Build (Produces Standalone APK)
A standalone APK can be built directly using Gradle on your machine:
```bash
cd mobile/android
.\gradlew.bat assembleDebug
```
The resulting installable APK is created at:
```text
mobile/android/app/build/outputs/apk/debug/app-debug.apk
```
This `.apk` file can be installed on any physical Android phone immediately without requiring signing keys.

#### How to Install on a Physical Android Phone:
1. **Via USB (ADB)**:
   ```bash
   adb install mobile/android/app/build/outputs/apk/debug/app-debug.apk
   ```
2. **Via Direct File Transfer**:
   Copy `app-debug.apk` to your phone via USB cable, Google Drive, WhatsApp, or email, open the file on your phone, and tap **Install** (allow "Install from Unknown Sources" if prompted).

### Option B: EAS Cloud Build (EAS CLI)
1. Ensure `eas-cli` is installed (`npm install -g eas-cli`).
2. Log in with your Expo account:
   ```bash
   eas login
   ```
3. Run the APK build profile:
   ```bash
   cd mobile
   eas build --platform android --profile preview
   ```
EAS Build compiles the APK in the cloud and provides a direct download link and QR code to install the APK directly on your phone.

---

## 🎯 Completed Features

| Feature Area | Details |
|---|---|
| **Authentication** | Registration, Login, Logout, JWT storage in SecureStore, Session restoration, Change Password |
| **Home Dashboard** | Personalized greeting, Watch time statistics, Continue Watching carousel, Recently Watched, Trending titles |
| **Discover & Search** | Live debounced TMDB multi-search, type filters (Movies/TV), ratings, quick-add modal |
| **Media Details** | Hero backdrop with gradient overlay, Poster, Runtime, Genres, Plot overview, Streaming watch providers, Cast carousel, Crew details, Similar recommendations |
| **Episode Tracking** | Expandable season accordions, episode checkboxes, runtime calculations, tracked progress |
| **My Library** | Full watch collection, filter tabs (All, Movies, Series, Anime, Animation, Documentaries, Favorites), sort orders, Grid/List view toggle |
| **Custom Lists** | Create, view, edit, share, and delete custom recommendation lists, poster preview collages |
| **AI Smart Filter** | Natural language queries via Gemini AI (`/api/watch-history/ai-filter`), suggested prompt chips, AI & Basic fallback modes |
| **Cast / Crew Details** | Actor profiles, biographies, Known For top works, complete chronological filmography |
| **Profile & Settings** | Detailed watch stats (hours watched, average rating, favorite count, top genre progress bars), Server IP configuration, Clear history modal |
| **Android Integration** | Safe area insets, hardware back button support, keyboard handling, offline cache |
