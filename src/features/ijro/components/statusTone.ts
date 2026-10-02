import type { Tone } from '@/ui';
import type { IjroStatus } from '../utils/ijro';

/** v2 STATUS_PILL ranglari → v3 semantik tonlar. */
export const STATUS_TONE: Record<IjroStatus, Tone> = {
  open: 'info',
  late: 'danger',
  late_done: 'warning',
  done: 'success',
};
