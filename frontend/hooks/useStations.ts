import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/api';
import { Station, StationsResponse } from '@/constants/types';

const CACHE_KEY = 'STATIONS_CACHE';
const CACHE_TIME_KEY = 'STATIONS_CACHE_TIME';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface UseStationsResult {
  stations: Station[];
  filtered: Station[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCountry: string | null;
  setSelectedCountry: (country: string | null) => void;
  availableCountries: string[];
  refresh: () => void;
}

// Module-level cache to prevent Strict Mode double-fetching
let initialFetchPromise: Promise<StationsResponse> | null = null;

export function useStations(): UseStationsResult {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const fetchStations = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!forceRefresh) {
        // Try to load from cache first
        const cachedDataStr = await AsyncStorage.getItem(CACHE_KEY);
        const cachedTimeStr = await AsyncStorage.getItem(CACHE_TIME_KEY);
        
        if (cachedDataStr && cachedTimeStr) {
          const cachedTime = parseInt(cachedTimeStr, 10);
          const now = Date.now();
          
          if (now - cachedTime < CACHE_EXPIRY_MS) {
            // Cache is valid
            const parsedData = JSON.parse(cachedDataStr) as StationsResponse;
            setStations(parsedData.stations);
            setIsLoading(false);
            return;
          }
        }
      }

      let promise = initialFetchPromise;
      
      // If forcing refresh or no existing promise, create a new one
      if (forceRefresh || !promise) {
        promise = fetch(`${API_BASE_URL}/stations?limit=200`).then(async res => {
          if (!res.ok) throw new Error(`Server error: ${res.status}`);
          const data = await res.json();
          // Save to cache
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
          await AsyncStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
          return data;
        });
        initialFetchPromise = promise;
      }

      const data = await promise;
      setStations(data.stations);
    } catch (err: any) {
      setError('Could not load stations. Please check your connection.');
      initialFetchPromise = null; // Clear cache on error so next try fetches again
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStations(false);
  }, [fetchStations]);

  const availableCountries = Array.from(
    new Set(stations.map(s => s.countrycode).filter((c): c is string => !!c))
  ).sort();

  const filtered = stations.filter(s => {
    // Search query filter
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = q === '' || (
      (s.name ?? '').toLowerCase().includes(q) ||
      (s.country ?? '').toLowerCase().includes(q) ||
      (s.tags ?? '').toLowerCase().includes(q)
    );

    // Country filter
    const matchesCountry = !selectedCountry || s.countrycode === selectedCountry;

    return matchesSearch && matchesCountry;
  });

  return {
    stations,
    filtered,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    selectedCountry,
    setSelectedCountry,
    availableCountries,
    refresh: () => fetchStations(true),
  };
}
