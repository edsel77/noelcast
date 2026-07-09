import { useState } from 'react';
import { API_BASE_URL } from '@/constants/api';
import { Station } from '@/constants/types';

export interface AskResult {
  answer: string;
  stations: Station[];
  ready: boolean;
}

export function useAskNoelCast() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskResult | null>(null);

  const ask = async (query: string): Promise<AskResult | null> => {
    if (!query.trim()) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), k: 5 }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail ?? `Request failed (${response.status})`);
      }

      const data: AskResult = await response.json();
      setResult(data);
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
    setResult(null);
    setError(null);
  };

  return { ask, loading, error, result, reset };
}
