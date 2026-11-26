// Pick a point on OUR OWN map: tap puts the pin, the pin can be dragged. The page is ours (utils/mapPickerHtml)
// and loads MapLibre from the tile server; no external map provider. Native shows it in a WebView, the web
// build in a sandboxed iframe. Typed coordinates stay the fallback when the map cannot open.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { guardWebViewNavigation } from '@/lib/trustedUrl';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Button, Text } from '@/ui';
import { mapPickerBaseUrl, mapPickerHtml, parseMapMessage, setPointScript } from '../../utils/mapPickerHtml';

type Props = {
  lat: number | null;
  lng: number | null;
  zoom: number;
  readOnly?: boolean;
  onPick: (p: { lat: number; lng: number; zoom: number }) => void;
  onZoom?: (zoom: number) => void;
};

export function MapPicker({ lat, lng, zoom, readOnly = false, onPick, onZoom }: Props) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  const [run, setRun] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  // The page is built once per run; later changes of the point are sent to it, so it never reloads under the finger.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => mapPickerHtml({ lat, lng, zoom, readOnly, pin: c.danger }), [run, readOnly]);
  const cb = useRef({ onPick, onZoom });
  const shown = useRef({ lat, lng });
  const sendRef = useRef<(lat: number | null, lng: number | null) => void>(() => {});
  useEffect(() => {
    cb.current = { onPick, onZoom };
  });
  useEffect(() => {
    if (shown.current.lat === lat && shown.current.lng === lng) return;
    shown.current = { lat, lng };
    sendRef.current(lat, lng);
  }, [lat, lng]);
  useEffect(() => {
    if (state !== 'loading') return;
    const id = setTimeout(() => setState((s) => (s === 'loading' ? 'failed' : s)), 20_000);
    return () => clearTimeout(id);
  }, [state, run]);

  const onRaw = (raw: unknown) => {
    const m = parseMapMessage(raw);
    if (!m) return;
    if (m.type === 'ready') setState('ready');
    else if (m.type === 'error') setState('failed');
    else if (m.type === 'zoom') cb.current.onZoom?.(m.zoom);
    else if (!readOnly) {
      shown.current = { lat: m.lat, lng: m.lng };
      cb.current.onPick({ lat: m.lat, lng: m.lng, zoom: m.zoom });
    }
  };
  const retry = () => {
    setState('loading');
    setRun((n) => n + 1);
  };

  return (
    <View style={styles.wrap} testID="map-picker">
      <View style={[styles.map, { borderColor: c.border, backgroundColor: c.surface2 }]}>
        {Platform.OS === 'web' ? <WebFrame key={run} html={html} onRaw={onRaw} sendRef={sendRef} /> : <NativeFrame key={run} html={html} onRaw={onRaw} sendRef={sendRef} onFail={() => setState('failed')} />}
      </View>
      <Text variant="caption" tone={state === 'failed' ? 'danger' : 'muted'} testID="map-state">
        {t(state === 'failed' ? 'sanFlow.map.failed' : state === 'loading' ? 'sanFlow.map.loading' : 'sanFlow.map.hint')}
      </Text>
      {state === 'failed' && <Button testID="map-retry" label={t('sanFlow.map.retry')} variant="soft" size="sm" onPress={retry} />}
    </View>
  );
}

type FrameProps = { html: string; onRaw: (raw: unknown) => void; sendRef: React.MutableRefObject<(lat: number | null, lng: number | null) => void> };

function NativeFrame({ html, onRaw, sendRef, onFail }: FrameProps & { onFail: () => void }) {
  const ref = useRef<WebView>(null);
  useEffect(() => {
    sendRef.current = (lat, lng) => ref.current?.injectJavaScript(setPointScript(lat, lng));
  }, [sendRef]);
  return (
    <WebView
      ref={ref}
      source={{ html, baseUrl: mapPickerBaseUrl() }}
      style={styles.frame}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['https://*']}
      onMessage={(e: WebViewMessageEvent) => onRaw(e.nativeEvent.data)}
      onError={onFail}
      onShouldStartLoadWithRequest={guardWebViewNavigation}
      nestedScrollEnabled
      setSupportMultipleWindows={false}
    />
  );
}

/** The same page in an iframe without any access to the app's origin (no allow-same-origin). */
function WebFrame({ html, onRaw, sendRef }: FrameProps) {
  const ref = useRef<{ contentWindow?: { postMessage: (m: string, o: string) => void } | null } | null>(null);
  useEffect(() => {
    const w = globalThis as unknown as Window;
    const listen = (e: MessageEvent) => {
      if (e.source && e.source === (ref.current?.contentWindow as unknown)) onRaw(e.data);
    };
    w.addEventListener('message', listen);
    sendRef.current = (lat, lng) => ref.current?.contentWindow?.postMessage(JSON.stringify({ cmd: 'set', lat, lng }), '*');
    return () => w.removeEventListener('message', listen);
  });
  return React.createElement('iframe', { ref, srcDoc: html, sandbox: 'allow-scripts', title: 'map', style: { border: 0, width: '100%', height: '100%' }, 'data-testid': 'map-frame' });
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  map: { height: 320, borderRadius: radii.md, overflow: 'hidden', borderWidth: 1 },
  frame: { flex: 1 },
});
