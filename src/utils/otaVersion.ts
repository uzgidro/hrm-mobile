// Pure formatter for the running EAS Update (OTA) build shown under the app
// version. expo-updates has no semantic version for an OTA — only a UUID
// (updateId) and a build timestamp (createdAt) — so we display the date plus a
// short id. Takes a plain input object (no expo-updates import) so it is
// trivially unit-testable; the service layer feeds it the real Updates.* values.

export interface OtaLaunchInfo {
  isEmbeddedLaunch: boolean;
  updateId: string | null;
  createdAt: Date | null;
}

export interface OtaBuildDisplay {
  kind: 'embedded' | 'ota';
  date: string | null;
  shortId: string | null;
}

// Two-digit day/month, four-digit year, dot-separated (DD.MM.YYYY) — a stable,
// locale-independent numeric format so the string never depends on device
// locale word forms. `locale` is accepted for future flexibility but the format
// is fixed numeric.
function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
}

export function formatOtaBuild(info: OtaLaunchInfo, _locale?: string): OtaBuildDisplay {
  // Embedded launch (or a non-embedded launch with no updateId — treat as
  // embedded defensively): nothing OTA-specific to show.
  if (info.isEmbeddedLaunch || !info.updateId) {
    return { kind: 'embedded', date: null, shortId: null };
  }
  return {
    kind: 'ota',
    date: info.createdAt ? formatDate(info.createdAt) : null,
    shortId: info.updateId.slice(0, 8),
  };
}
