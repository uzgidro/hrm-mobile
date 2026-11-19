// Pick a point on OUR OWN map (the MapLibre viewer of the tile server, shown in a WebView as the
// attendance screens do). The viewer keeps its position in the URL fragment `#zoom/lat/lng`; the
// injected script reports it, and a fixed pin in the middle marks the chosen point — pan the map
// until the pin sits on the place. No external map provider is used.
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/Icon';
import { guardWebViewNavigation } from '@/lib/trustedUrl';
import { mapViewerUrl } from '@/utils/attendanceEvent';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Button, Text } from '@/ui';
import { parseMapHash } from '../../utils/sections1';

/** Where the map opens when no point is set yet: the middle of Uzbekistan. */
const DEFAULT_VIEW = { lat: 41.3, lng: 64.6, zoom: 5 };
const REPORT_JS = `(function(){var last='';setInterval(function(){var h=location.hash;if(h&&h!==last){last=h;window.ReactNativeWebView.postMessage(h);}},600);})();true;`;

export function MapPicker({
  lat,
  lng,
  zoom,
  onPick,
}: {
  lat: number | null;
  lng: number | null;
  zoom: number;
  onPick: (p: { lat: number; lng: number; zoom: number }) => void;
}) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  // The viewer URL is fixed per «key»; panning must not reload the page, so it only changes on re-center.
  const [seed, setSeed] = useState({ lat, lng, zoom, key: 0 });
  const url = useMemo(() => {
    const v = seed.lat != null && seed.lng != null ? { lat: seed.lat, lng: seed.lng, zoom: seed.zoom } : DEFAULT_VIEW;
    return mapViewerUrl({ name: null, address: null, latitude: v.lat, longitude: v.lng }, v.zoom);
  }, [seed]);

  if (Platform.OS === 'web' || !url) return <Text variant="caption" tone="muted">{t('san1.location.mapWebHint')}</Text>;

  const onMessage = (e: WebViewMessageEvent) => {
    const p = parseMapHash(e.nativeEvent.data);
    if (p) onPick({ lat: Math.round(p.lat * 1e6) / 1e6, lng: Math.round(p.lng * 1e6) / 1e6, zoom: Math.round(p.zoom) });
  };
  return (
    <View style={styles.wrap} testID="map-picker">
      <View style={[styles.map, { borderColor: c.border }]}>
        <WebView
          key={seed.key}
          source={{ uri: url }}
          style={styles.web}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['https://*']}
          injectedJavaScript={REPORT_JS}
          onMessage={onMessage}
          onShouldStartLoadWithRequest={guardWebViewNavigation}
          nestedScrollEnabled
        />
        <View style={styles.pin} pointerEvents="none">
          <Icon name="mapPin" size={32} color={c.danger} />
        </View>
      </View>
      <Text variant="caption" tone="muted">{t('san1.location.mapHint')}</Text>
      <Button
        testID="map-recenter"
        label={t('san1.location.recenter')}
        variant="soft"
        size="sm"
        onPress={() => setSeed((s) => ({ lat, lng, zoom, key: s.key + 1 }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  map: { height: 300, borderRadius: radii.md, overflow: 'hidden', borderWidth: 1 },
  web: { flex: 1 },
  // The pin's tip (not its middle) sits on the map centre, hence the half-height lift.
  pin: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 32 },
});
