import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/constants/api';
import { Station, StationsResponse } from '@/constants/types';

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
      let promise = initialFetchPromise;
      
      // If forcing refresh or no existing promise, create a new one
      if (forceRefresh || !promise) {
        promise = fetch(`${API_BASE_URL}/stations?limit=200`).then(async res => {
          if (!res.ok) throw new Error(`Server error: ${res.status}`);
          return res.json();
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
    refresh: fetchStations,
  };
}
