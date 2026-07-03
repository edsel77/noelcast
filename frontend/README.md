# 🎄 NoelCast Frontend

Expo (React Native) app for [NoelCast](../README.md) — a Christmas radio streaming app that runs on **Android**, **iOS**, and **Web**.

---

## Tech Stack

- **[Expo](https://expo.dev/) ~57** (Managed workflow)
- **[Expo Router](https://expo.github.io/router/)** — file-based navigation
- **[expo-av](https://docs.expo.dev/versions/v57.0.0/sdk/av/)** — audio streaming
- **[expo-linear-gradient](https://docs.expo.dev/versions/v57.0.0/sdk/linear-gradient/)** — UI gradients
- **[react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/)** — animations
- **[AsyncStorage](https://react-native-async-storage.github.io/async-storage/)** — persistent favorites
- **TypeScript** throughout

---

## Project Structure

```
frontend/
├── app/
│   ├── _layout.tsx        # Root layout — providers + global player overlay
│   └── index.tsx          # Home screen (station list, search, tabs)
│
├── components/
│   ├── FullScreenPlayer.tsx   # Expanded player modal
│   ├── MiniPlayer.tsx         # Persistent mini player bar
│   ├── StationCard.tsx        # Station list item
│   ├── EqualizerBars.tsx      # Animated equalizer indicator
│   └── SnowParticles.tsx      # Decorative snow animation
│
├── contexts/
│   ├── PlayerContext.tsx      # Audio playback state (expo-av)
│   └── FavoritesContext.tsx   # Favorites stored in AsyncStorage
│
├── hooks/
│   └── useStations.ts         # Fetch, search, filter, and paginate stations
│
├── constants/
│   ├── api.ts                 # API base URL (dev vs prod)
│   ├── types.ts               # Station + API response types
│   └── Colors.ts              # Design system colour tokens
│
└── assets/                    # Icons, images, splash screen
```

---

## Local Development

### Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/more/expo-cli/) (`npm install -g expo-cli`)
- The **NoelCast backend** running locally (see [`../backend/README.md`](../backend/README.md))
- For mobile: [Expo Go](https://expo.dev/go) app on your device, or an Android/iOS emulator

### Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Copy the example env file
cp .env.example .env
# Edit .env if you have a deployed backend URL; otherwise localhost:8000 is used automatically

# 4. Start the dev server
npx expo start
```

Then press:
- `w` — open in browser
- `a` — open in Android emulator
- `i` — open in iOS simulator
- Scan the QR code with **Expo Go** on your phone

---

## Environment Variables

Copy `.env.example` to `.env`:

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | No | URL of your deployed backend. Defaults to `http://localhost:8000` in dev |

> **Note:** Expo only exposes variables prefixed with `EXPO_PUBLIC_` to client-side code.

---

## How It Works

### Audio Playback
`PlayerContext` manages a single `Audio.Sound` instance via `useRef`. When a station is selected:
1. Any existing sound is stopped and unloaded
2. A new `Audio.Sound` is created from the station's `stream_url`
3. Playback status updates flow back through a callback to update UI state

The audio session is configured to **play in background** and **stay active in silent mode** (iOS).

### Station Data
`useStations` fetches from the backend, deduplicates, and exposes:
- Client-side **search** across name, country, and tags
- Client-side **country filter** via `countrycode`
- An `AbortController` to cancel in-flight requests on unmount

### Favorites
`FavoritesContext` persists favorite station UUIDs to `AsyncStorage`, surviving app restarts. The context exposes `toggleFavorite` and `isFavorite` helpers used in `StationCard` and `FullScreenPlayer`.

---

## Deployment (Netlify Web)

A `netlify.toml` is included for easy deployment of the **web** build to [Netlify](https://netlify.com/).

1. Push your repo to GitHub
2. Import it in Netlify
3. Set `EXPO_PUBLIC_API_URL` in the Netlify **Environment Variables** tab
4. Netlify will use `netlify.toml` to export and serve the `dist/` folder

> The SPA rewrite in `netlify.toml` ensures all routes resolve to `index.html` for client-side navigation.

---

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start Expo dev server (all platforms) |
| `npm run web` | Start Expo dev server (web only) |
| `npm run android` | Build and run on connected Android device/emulator |
| `npm run lint` | Run Expo lint checks |
