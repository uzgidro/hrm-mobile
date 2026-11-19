import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { ChronoTaskRow } from '../utils/chrono';

/** «12 kun qoldi» / «3 kun kechikmoqda» — the same wording as the web row. */
export function useDueText() {
  const { t } = useTranslation();
  return (row: Pick<ChronoTaskRow, 'completed_at' | 'deadline' | 'delay_days' | 'days_left'>) => {
    if (row.completed_at) {
      const late = Math.max(0, dayjs(row.completed_at).startOf('day').diff(dayjs(row.deadline), 'day'));
      return { text: late > 0 ? t('chrono.closedLate', { count: late }) : t('chrono.closedOnTime'), tone: late > 0 ? 'danger' : 'success' } as const;
    }
    if (row.delay_days > 0) return { text: t('chrono.delayForecast', { count: row.delay_days }), tone: 'danger' } as const;
    const left = row.days_left ?? 0;
    if (left < 0) return { text: t('chrono.daysLate', { count: -left }), tone: 'danger' } as const;
    if (left === 0) return { text: t('chrono.dueToday'), tone: 'danger' } as const;
    return { text: t('chrono.daysLeft', { count: left }), tone: 'subtle' } as const;
  };
}
