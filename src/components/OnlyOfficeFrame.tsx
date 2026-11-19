// OnlyOffice muharriri/ko'ruvchisi — buyruq, xat va hujjat ekranlari uchun umumiy.
//
// Nativeda react-native-webview (avvalgidek): muharrir HTML'i `source.html` ga beriladi.
//
// Vebda WebView ishlamaydi, `<iframe srcDoc>` ham yaramadi (QA 2026-10-05): srcdoc
// hujjatining kelib chiqishi shaffof emas (`about:srcdoc`, `parentOrigin=null`) —
// muharrir yuklanadi, lekin hujjatni hech qachon ochmaydi (socket / `Editor.bin` yo'q).
// Shuning uchun vebda api.js asosiy hujjatga bir marta yuklanadi va
// `DocsAPI.DocEditor` shu sahifadagi `<div>` ichida, native bilan bir xil konfig
// (`buildOnlyOfficeEditorConfig`) bilan yaratiladi; chiqishda `destroyEditor()`.
import { createElement, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { ONLYOFFICE_SERVER_URL } from '@/api/urls';
import { guardWebViewNavigation } from '@/lib/trustedUrl';
import { useTheme } from '@/theme/ThemeProvider';
import { ErrorState } from '@/ui/StateViews';
import {
  buildOnlyOfficeEditorConfig,
  buildOnlyOfficeHtml,
  getDocsApi,
  loadOnlyOfficeApi,
  onlyOfficeEditorType,
  onlyOfficeFrameKind,
  type OnlyOfficeEditorType,
} from '@/utils/onlyOffice';

type FrameProps = {
  config: Record<string, unknown>;
  /** Muharrir yuklanmasa ko'rsatiladigan matn (tarjima qilingan). */
  errorLabel: string;
  /** Vebdagi muharrir konteynerining ekran o'quvchi nomi. */
  title?: string;
};

export function OnlyOfficeFrame({ config, errorLabel, title }: FrameProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const editorType = onlyOfficeEditorType(Platform.OS, width);
  const isDom = onlyOfficeFrameKind(Platform.OS) === 'dom';
  const html = useMemo(
    () => (isDom ? '' : buildOnlyOfficeHtml({ config, serverUrl: ONLYOFFICE_SERVER_URL, errorLabel, editorType })),
    [isDom, config, errorLabel, editorType],
  );

  if (isDom) {
    return <OnlyOfficeDomEditor config={config} errorLabel={errorLabel} title={title} editorType={editorType} />;
  }

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html, baseUrl: ONLYOFFICE_SERVER_URL }}
      // Hujjat ichidagi havola muharrir o'rnini begona sayt bilan almashtirmasin.
      onShouldStartLoadWithRequest={guardWebViewNavigation}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      allowsInlineMediaPlayback
      renderLoading={() => (
        <View style={[styles.center, { backgroundColor: colors.bg }]}>
          <ActivityIndicator color={colors.primaryLight} size="large" />
        </View>
      )}
      style={styles.fill}
    />
  );
}

type DomNode = {
  id: string;
  style: { cssText: string };
  appendChild(node: unknown): unknown;
  replaceChildren?: () => void;
  textContent: string | null;
};
type DomDocument = {
  getElementById(id: string): DomNode | null;
  createElement(tag: 'div'): DomNode;
};

let hostSeq = 0;

/** Faqat veb: api.js + `new DocsAPI.DocEditor` shu sahifaning o'zida. */
function OnlyOfficeDomEditor({
  config,
  errorLabel,
  title,
  editorType,
}: FrameProps & { editorType: OnlyOfficeEditorType }) {
  const { colors } = useTheme();
  const [hostId] = useState(() => `onlyoffice-host-${++hostSeq}`);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const doc = (globalThis as { document?: DomDocument }).document;
    const host = doc?.getElementById(hostId);
    if (!doc || !host) return;
    let cancelled = false;
    let editor: { destroyEditor?: () => void } | null = null;

    // api.js joy egallovchini o'z iframe'i bilan almashtiradi — shuning uchun u
    // React boshqaradigan tugun emas, host ichida qo'lda yaratiladi.
    const placeholderId = `${hostId}-editor-${attempt}`;
    const placeholder = doc.createElement('div');
    placeholder.id = placeholderId;
    placeholder.style.cssText = 'width:100%;height:100%';
    host.appendChild(placeholder);

    const fail = () => {
      if (!cancelled) setStatus('error');
    };
    loadOnlyOfficeApi(ONLYOFFICE_SERVER_URL)
      .then(() => {
        if (cancelled) return;
        const api = getDocsApi();
        if (!api) throw new Error('DocsAPI is not defined');
        editor = new api.DocEditor(placeholderId, {
          ...buildOnlyOfficeEditorConfig(config, editorType),
          events: {
            onAppReady: () => {
              if (!cancelled) setStatus('ready');
            },
            onError: fail,
          },
        });
      })
      .catch(fail);

    return () => {
      cancelled = true;
      try {
        editor?.destroyEditor?.();
      } catch {
        // muharrir allaqachon yo'q — tozalash baribir davom etadi
      }
      if (host.replaceChildren) host.replaceChildren();
      else host.textContent = '';
    };
  }, [config, editorType, hostId, attempt]);

  if (status === 'error') {
    return (
      <View style={[styles.fill, { backgroundColor: colors.bg }]} testID="onlyoffice-error">
        <ErrorState
          title={errorLabel}
          onRetry={() => {
            setStatus('loading');
            setAttempt((n) => n + 1);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.fill} testID="onlyoffice-dom-host">
      {createElement('div', {
        id: hostId,
        role: 'document',
        'aria-label': title ?? 'OnlyOffice',
        style: { width: '100%', height: '100%', flex: 1, display: 'flex', flexDirection: 'column' },
      })}
      {status === 'loading' && (
        <View style={[StyleSheet.absoluteFill, styles.center, styles.passThrough, { backgroundColor: colors.bg }]}>
          <ActivityIndicator color={colors.primaryLight} size="large" accessibilityLabel={title} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'white' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  passThrough: { pointerEvents: 'none' },
});
