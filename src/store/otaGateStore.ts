// Phase of the synchronous OTA launch gate (src/services/otaUpdates.ts), so
// the UI can show a dedicated "updating" overlay instead of letting the login
// screen flash while the gate is still checking/fetching/reloading behind it.
// Pure UI-facing state — otaUpdates.ts is the only writer; components only
// read via the useOtaGateStore hook.
import { create } from 'zustand';

export type OtaGatePhase = 'idle' | 'checking' | 'downloading' | 'reloading';

interface OtaGateState {
  phase: OtaGatePhase;
  setPhase: (phase: OtaGatePhase) => void;
}

export const useOtaGateStore = create<OtaGateState>((set) => ({
  phase: 'idle',
  setPhase: (phase) => set({ phase }),
}));
