import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
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

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const player = useAudioPlayer(null, {
    keepAudioSessionActive: true,
  });
  const playerStatus = useAudioPlayerStatus(player);

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
        error: newError
      };
    });
  }, [playerStatus.playing, playerStatus.isBuffering, playerStatus.isLoaded, playerStatus.error]);

  // Set up audio session on mount
  useEffect(() => {
    setAudioModeAsync({
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: 'mixWithOthers',
      shouldRouteThroughEarpiece: false,
    });
  }, []);

  const stopPlayer = useCallback(async () => {
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
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isPlaying: false,
        error: 'Failed to load stream. Please try another station.',
      }));
    }
  }, [player]);

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

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
