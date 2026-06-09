import { useState, useCallback } from 'react';
import { apiClient } from '../api/client';

export function useGet<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (params?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<T>(url, { params });
      setData(res.data);
      return { data: res.data, success: true };
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Xatolik yuz berdi';
      setError(msg);
      return { data: null, success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [url]);

  return { data, loading, error, fetch };
}

export function usePost<T>(url: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = useCallback(async (body: unknown) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post<T>(url, body);
      return { data: res.data, success: true };
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string | Array<{msg: string}> } } };
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail[0]?.msg : (detail || 'Xatolik yuz berdi');
      setError(msg ?? 'Xatolik yuz berdi');
      return { data: null, success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [url]);

  return { post, loading, error };
}
