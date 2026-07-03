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

export function useStations(): UseStationsResult {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchStations = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/stations?limit=200`, {
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data: StationsResponse = await res.json();
      setStations(data.stations);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Could not load stations. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStations();
    return () => abortRef.current?.abort();
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
