import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync, requestNotificationPermissionsAsync } from 'expo-audio';
import { Asset } from 'expo-asset';

// Resolve the bundled app icon to a URI usable by the OS for media notification artwork
const APP_ICON = Asset.fromModule(require('@/assets/images/icon.png'));
import { Station } from '@/constants/types';

interface PlayerState {
  currentStation: Station | null;
  isPlaying: boolean;
  isLoading: boolean;
  isPlayerVisible: boolean;
  error: string | null;
  queue: Station[];
}

interface PlayerContextValue extends PlayerState {
  playStation: (station: Station, queue?: Station[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  stopPlayer: () => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  openPlayer: () => void;
  closePlayer: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

// Inner provider that calls expo-audio hooks — only mounted on the client
function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const player = useAudioPlayer(null, {
    keepAudioSessionActive: true,
  });
  const playerStatus = useAudioPlayerStatus(player);
  const [artworkUri, setArtworkUri] = useState<string | undefined>(undefined);

  useEffect(() => {
    APP_ICON.downloadAsync()
      .then(() => setArtworkUri(APP_ICON.localUri ?? APP_ICON.uri))
      .catch(() => setArtworkUri(APP_ICON.uri));
  }, []);

  const [state, setState] = useState<PlayerState>({
    currentStation: null,
    isPlaying: false,
    isLoading: false,
    isPlayerVisible: false,
    error: null,
    queue: [],
  });

  // Sync player status with our state
  useEffect(() => {
    setState(prev => {
      const newIsPlaying = playerStatus.playing;
      // We consider it loading if it's buffering, or if a station is selected but not loaded yet
      const newIsLoading = playerStatus.isBuffering || (!playerStatus.isLoaded && prev.currentStation !== null);
      const newError = playerStatus.error || null;

      if (prev.isPlaying === newIsPlaying && prev.isLoading === newIsLoading && prev.error === newError) {
        return prev;
      }
      return {
        ...prev,
        isPlaying: newIsPlaying,
        isLoading: newIsLoading,
        error: newError,
      };
    });
  }, [playerStatus.playing, playerStatus.isBuffering, playerStatus.isLoaded, playerStatus.error]);

  // Set up audio session on mount
  useEffect(() => {
    setAudioModeAsync({
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      allowsRecording: false,
      // doNotMix is required for lock screen / media notification controls to work
      interruptionMode: 'doNotMix',
      shouldRouteThroughEarpiece: false,
    });

    // Android 13+ requires POST_NOTIFICATIONS permission to show the media notification
    if (Platform.OS === 'android') {
      requestNotificationPermissionsAsync().catch(() => {});
    }
  }, []);

  // Keep lock screen / media notification metadata in sync with current station.
  // Delay the call so the Android MediaBrowserService has time to bind first;
  // calling it synchronously on mount races the service startup.
  useEffect(() => {
    if (!state.currentStation) return;
    const metadata = {
      title: state.currentStation.name,
      artist: state.currentStation.country || 'Christmas Radio',
      artworkUrl: artworkUri,
    };
    const timer = setTimeout(() => {
      try {
        player.updateLockScreenMetadata(metadata);
      } catch (_) {
        // Service not yet bound — metadata will be updated on next station change
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [player, state.currentStation, artworkUri]);

  // On web, browsers suspend AudioContext when the tab is hidden.
  // Resume playback when the tab becomes visible again.
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // Tab is being hidden — track if we were playing
        wasPlayingRef.current = playerStatus.playing;
      } else if (nextState === 'active') {
        // Tab is visible again — resume if we were playing
        if (wasPlayingRef.current) {
          player.play();
        }
      }
    });

    return () => subscription.remove();
  }, [player, playerStatus.playing]);

  const stopPlayer = useCallback(async () => {
    player.clearLockScreenControls();
    player.pause();
    player.replace(null);
    setState(prev => ({ ...prev, isPlaying: false, isLoading: false, currentStation: null }));
  }, [player]);

  const playStation = useCallback(async (station: Station, queue?: Station[]) => {
    setState(prev => ({
      ...prev,
      currentStation: station,
      queue: queue || prev.queue,
      isLoading: true,
      error: null,
      isPlayerVisible: true,
    }));

    try {
      player.replace(station.stream_url);
      player.play();

      // Delay setActiveForLockScreen so the Android MediaBrowserService has time
      // to bind before we attempt to register the media session.
      setTimeout(() => {
        try {
          player.setActiveForLockScreen(
            true,
            {
              title: station.name,
              artist: station.country || 'Christmas Radio',
              artworkUrl: artworkUri,
            },
            { isLiveStream: true },
          );
        } catch (_) {
          // Service not yet ready — retrying after additional delay
          setTimeout(() => {
            try {
              player.setActiveForLockScreen(
                true,
                {
                  title: station.name,
                  artist: station.country || 'Christmas Radio',
                  artworkUrl: artworkUri,
                },
                { isLiveStream: true },
              );
            } catch (_2) {
              // Give up — lock screen controls unavailable for this session
            }
          }, 2000);
        }
      }, 1500);
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isPlaying: false,
        error: 'Failed to load stream. Please try another station.',
      }));
    }
  }, [player, artworkUri]);

  const togglePlayPause = useCallback(async () => {
    if (playerStatus.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player, playerStatus.playing]);

  const openPlayer = useCallback(() => {
    setState(prev => ({ ...prev, isPlayerVisible: true }));
  }, []);

  const closePlayer = useCallback(() => {
    setState(prev => ({ ...prev, isPlayerVisible: false }));
  }, []);

  const playNext = useCallback(async () => {
    setState(prev => {
      if (!prev.currentStation || prev.queue.length === 0) return prev;
      const currentIndex = prev.queue.findIndex(s => s.stationuuid === prev.currentStation?.stationuuid);
      if (currentIndex === -1) return prev;
      const nextIndex = (currentIndex + 1) % prev.queue.length;
      const nextStation = prev.queue[nextIndex];
      setTimeout(() => playStation(nextStation, prev.queue), 0);
      return prev;
    });
  }, [playStation]);

  const playPrevious = useCallback(async () => {
    setState(prev => {
      if (!prev.currentStation || prev.queue.length === 0) return prev;
      const currentIndex = prev.queue.findIndex(s => s.stationuuid === prev.currentStation?.stationuuid);
      if (currentIndex === -1) return prev;
      const prevIndex = (currentIndex - 1 + prev.queue.length) % prev.queue.length;
      const prevStation = prev.queue[prevIndex];
      setTimeout(() => playStation(prevStation, prev.queue), 0);
      return prev;
    });
  }, [playStation]);

  return (
    <PlayerContext.Provider
      value={{ ...state, playStation, togglePlayPause, stopPlayer, playNext, playPrevious, openPlayer, closePlayer }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

// Outer shell: on web, wait until the component is mounted (client-side) before
// rendering AudioPlayerProvider, so expo-audio hooks never run during SSR.
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(Platform.OS !== 'web');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a null-context shell during SSR / before hydration
    return (
      <PlayerContext.Provider value={null}>
        {children}
      </PlayerContext.Provider>
    );
  }

  return <AudioPlayerProvider>{children}</AudioPlayerProvider>;
}

export function usePlayer(): PlayerContextValue | null {
  return useContext(PlayerContext);
}
