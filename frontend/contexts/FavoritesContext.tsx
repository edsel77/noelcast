import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Station } from '@/constants/types';

const FAVORITES_KEY = '@noelcast_favorites';

interface FavoritesContextValue {
  favorites: Station[];
  isFavorite: (stationuuid: string) => boolean;
  toggleFavorite: (station: Station) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Station[]>([]);

  // Load from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(FAVORITES_KEY);
        if (stored) setFavorites(JSON.parse(stored));
      } catch {
        // ignore
      }
    })();
  }, []);

  const save = useCallback(async (updated: Station[]) => {
    setFavorites(updated);
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, []);

  const isFavorite = useCallback(
    (stationuuid: string) => favorites.some(s => s.stationuuid === stationuuid),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (station: Station) => {
      const exists = favorites.some(s => s.stationuuid === station.stationuuid);
      if (exists) {
        await save(favorites.filter(s => s.stationuuid !== station.stationuuid));
      } else {
        await save([station, ...favorites]);
      }
    },
    [favorites, save]
  );

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
