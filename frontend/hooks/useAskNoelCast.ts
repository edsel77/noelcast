import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/api';
import { Station } from '@/constants/types';

export type AskModel = 'groq' | 'gemini';

export interface AskResult {
  answer: string;
  stations: Station[];
  ready: boolean;
  model?: AskModel;
}

const RESULT_STORAGE_KEY = 'noelcast_ask_result';

export function useAskNoelCast() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResult | null>(null);

  // Load persisted result on mount
  useEffect(() => {
    AsyncStorage.getItem(RESULT_STORAGE_KEY).then((saved) => {
      if (saved) {
        try {
          setResult(JSON.parse(saved));
        } catch (e) {
          // Ignore invalid JSON
        }
      }
    });
  }, []);

  const saveResult = (data: AskResult | null) => {
    setResult(data);
    if (data) {
      AsyncStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(data));
    } else {
      AsyncStorage.removeItem(RESULT_STORAGE_KEY);
    }
  };

  const ask = async (query: string, model: AskModel = 'groq'): Promise<AskResult | null> => {
    if (!query.trim()) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), k: 5, model }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail ?? `Request failed (${response.status})`);
      }

      const data: AskResult = await response.json();
      saveResult(data);
      return data;
    } catch (err: any) {
      const message = err?.message ?? 'Something went wrong. Please try again.';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    saveResult(null);
    setError(null);
  };

  return { ask, loading, error, result, reset };
}
