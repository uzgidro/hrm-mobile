// Is the screen live? Green — the socket is open; amber — it is being reconnected and the
// screen is polled meanwhile. Nothing while it connects for the first time.
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { LiveStatus } from '@/lib/liveSocket';
import { Badge } from '@/ui/Badge';

export function LiveBadge({ status }: { status: LiveStatus }) {
  const { t } = useTranslation();
  if (status === 'connecting') return null;
  return <Badge testID={`live-${status}`} label={t(status === 'live' ? 'common.live' : 'common.reconnecting')} tone={status === 'live' ? 'success' : 'warning'} />;
}
