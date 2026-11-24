import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ensureFreshToken } from '@/api/client';
import { API_BASE_URL } from '@/constants';
import { openLiveSocket, type LiveMessage, type LiveStatus } from './liveSocket';

/**
 * The live stream while a screen is open AND the app is in front: a phone in a pocket keeps
 * no socket. Every (re)connection after the first calls `onResync` — what happened meanwhile
 * was not delivered.
 */
export function useLiveSocket(enabled: boolean, on: { message: (m: LiveMessage) => void; resync: () => void }): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const [front, setFront] = useState(AppState.currentState !== 'background');
  const handlers = useRef(on);
  useEffect(() => {
    handlers.current = on;
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setFront(s !== 'background'));
    return () => sub.remove();
  }, []);

  const wasLive = useRef(false);
  const active = enabled && front;
  useEffect(() => {
    if (!active) return;
    const live = openLiveSocket({
      url: `${API_BASE_URL.replace(/^http/, 'ws')}/ws/attendance`,
      getToken: ensureFreshToken,
      onMessage: (m) => handlers.current.message(m),
      onStatus: (s) => {
        setStatus(s);
        if (s !== 'live') return;
        if (wasLive.current) handlers.current.resync();
        wasLive.current = true;
      },
    });
    return () => live.close();
  }, [active]);

  return active ? status : 'connecting';
}
