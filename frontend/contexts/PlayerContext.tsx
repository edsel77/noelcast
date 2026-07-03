import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
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
  const soundRef = useRef<Audio.Sound | null>(null);
  const [state, setState] = useState<PlayerState>({
    currentStation: null,
    isPlaying: false,
    isLoading: false,
    isPlayerVisible: false,
    error: null,
    queue: [],
  });

  // Set up audio session on mount
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const stopPlayer = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setState(prev => ({ ...prev, isPlaying: false, isLoading: false }));
  }, []);

  const playStation = useCallback(async (station: Station, queue?: Station[]) => {
    setState(prev => ({
      ...prev,
      currentStation: station,
      queue: queue || prev.queue,
      isLoading: true,
      isPlaying: false,
      error: null,
      isPlayerVisible: true,
    }));

    try {
      // Unload previous sound
      if (soundRef.current) {
        soundRef.current.setOnPlaybackStatusUpdate(null);
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: station.stream_url },
        { shouldPlay: true, isLooping: false, volume: 1.0 },
        (status: AVPlaybackStatus) => {
          if (status.isLoaded) {
            setState(prev => {
              const newIsPlaying = status.isPlaying;
              const newIsLoading = status.isBuffering || (status.shouldPlay && !status.isPlaying);
              
              if (prev.isPlaying === newIsPlaying && prev.isLoading === newIsLoading) {
                return prev;
              }
              
              return {
                ...prev,
                isPlaying: newIsPlaying,
                isLoading: newIsLoading,
              };
            });
          } else if (status.error) {
            setState(prev => ({
              ...prev,
              error: `Playback error: ${status.error}`,
              isPlaying: false,
              isLoading: false,
            }));
          }
        }
      );

      soundRef.current = sound;
      // We rely on the onPlaybackStatusUpdate callback for subsequent updates,
      // but we shouldn't forcefully set isPlaying=true here to avoid flickering.
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isPlaying: false,
        error: 'Failed to load stream. Please try another station.',
      }));
    }
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) return;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return;
      
      if (state.isPlaying) {
        await soundRef.current.pauseAsync();
        setState(prev => ({ ...prev, isPlaying: false }));
      } else {
        await soundRef.current.playAsync();
        setState(prev => ({ ...prev, isPlaying: true }));
      }
    } catch (e) {
      console.warn('Could not toggle play/pause:', e);
    }
  }, [state.isPlaying]);

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
      // Trigger playStation asynchronously without relying on state callback
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
