// Hisobot jadvali (web v2 `ReportTableView`): sarlavha (ko'p qatorli, cs/rs), bo'lim
// qatorlari, uslubli katakchalar va drill havolalari, jami qatorlari, rang izohi, imzo/QR.
// Faqat RN View'lar: gorizontal ScrollView ichida qat'iy kenglikli ustunlar, tana — virtual
// FlatList (bir necha yuz qator, har biri qat'iy balandlikda — `getItemLayout`).
// Muzlatilgan ustunlar (`freeze_cols`): gorizontal siljish (RN Animated qiymati) shu kataklarga
// teskari `translateX` bo'lib beriladi — ular ekranning chap chetida turadi, qolgani tagidan
// o'tadi. Bitta FlatList — qator balandligi va vertikal siljish o'z-o'zidan bir xil.
import React, { memo, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ChipScroll } from '@/components/ChipScroll';
import { Chip, Text } from '@/ui';
import { reportLabel } from '../utils/labels';
import {
  HEADER_ROW_H,
  ROW_H,
  bodyCount,
  cellAlign,
  cellText,
  cellTone,
  columnWidths,
  crumbLabel,
  fmtStamp,
  freezeLayout,
  layoutHeader,
  measuredChrome,
  leafLabels,
  prefixSums,
  sheetContentHeight,
  rowLayout,
  splitSpan,
  styleTone,
  tableKey,
} from '../utils/table';
import type { DrillRef, ReportTableJson, RowJson, SheetJson } from '../utils/types';

type OnDrill = (ref: DrillRef, label: string) => void;
type Pin = Animated.WithAnimatedValue<StyleProp<ViewStyle>>;

// Web'da native driver yo'q (RN Web JS orqali yangilaydi).
const NATIVE_DRIVER = Platform.OS !== 'web';
// Gorizontal ScrollView'ning «qobig'i» — chegaralar va (web'da) aylantirish chizig'i —
// kontent balandligidan joy oladi. Web'da haqiqiy chiziq o'lchanadi (Windows'da 17px);
// o'lchangunicha — 17px taxmin.
const BORDERS = 2 * StyleSheet.hairlineWidth;
const WEB_SCROLLBAR_FALLBACK = 17;
const INITIAL_CHROME = BORDERS + (Platform.OS === 'web' ? WEB_SCROLLBAR_FALLBACK : 0);

export function ReportTableView({ table, onDrill }: { table: ReportTableJson; onDrill?: OnDrill }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();
  // Ko'p varaqli hisobot (masalan davomat tahlili) — bir vaqtda bitta varaq; yangi jadvalda 0-varaq.
  const [pick, setPick] = useState<{ table: ReportTableJson; index: number }>({ table, index: 0 });
  const index = pick.table === table ? Math.min(pick.index, Math.max(0, table.sheets.length - 1)) : 0;
  const sheet = table.sheets[index];

  return (
    <View style={styles.root} testID="report-table">
      <View style={styles.head}>
        <Text variant="heading">{reportLabel(table.title_key, table.title)}</Text>
        {table.info.length > 0 && (
          <View style={styles.info}>
            {table.info.map((i, n) => (
              <Text key={`${i.k}${n}`} variant="caption" tone="muted">
                {`${reportLabel(i.k, i.k)}: `}
                <Text variant="caption">{i.v}</Text>
              </Text>
            ))}
          </View>
        )}
      </View>
      {table.sheets.length > 1 && (
        <ChipScroll contentContainerStyle={styles.chips}>
          {table.sheets.map((s, i) => (
            <Chip
              key={`${s.name}${i}`}
              testID={`report-sheet-${i}`}
              label={reportLabel(s.name_key, s.name)}
              count={bodyCount(s)}
              selected={i === index}
              onPress={() => setPick({ table, index: i })}
            />
          ))}
        </ChipScroll>
      )}
      {/* Kalit jadvalga ham bog'liq: drill/orqaga — yangi SheetView (yangi scrollX = 0). Faqat varaq
          indeksi bo'lsa, eski gorizontal siljish muzlatilgan ustunlarni yangi jadvalda surib qo'yardi. */}
      {sheet ? <SheetView key={`${tableKey(table)}:${index}`} sheet={sheet} onDrill={onDrill} /> : null}
      {!!sheet?.legend.length && (
        <View style={styles.legend}>
          {sheet.legend.map((l) => {
            const tone = styleTone(l.s);
            return (
              <View key={l.k} style={styles.legendItem}>
                <View
                  style={[styles.swatch, { backgroundColor: tone.bg ? c[tone.bg] : c.bg, borderColor: c.borderStrong }]}
                />
                <Text variant="caption" tone="muted">
                  {reportLabel(l.k, l.v)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
      {(table.signature || table.qr_png_b64) && (
        <View style={[styles.signature, { backgroundColor: c.bg, borderColor: c.border }]}>
          {table.signature && (
            <View style={styles.flex}>
              <Text variant="caption" tone="subtle">
                {table.signature.label || t('reports.h.signed_by')}
              </Text>
              <Text variant="label" weight="700">
                {table.signature.name ?? ''}
              </Text>
              {!!table.signature.position && (
                <Text variant="caption" tone="muted">
                  {table.signature.position}
                </Text>
              )}
              {!!table.signature.at && (
                <Text variant="caption" tone="subtle">
                  {fmtStamp(table.signature.at)}
                </Text>
              )}
            </View>
          )}
          {!!table.qr_png_b64 && (
            <Image
              source={{ uri: `data:image/png;base64,${table.qr_png_b64}` }}
              style={[styles.qr, { backgroundColor: c.surface }]}
              accessibilityLabel="QR"
            />
          )}
        </View>
      )}
      <Text variant="caption" tone="subtle">
        {`${t('reports.h.generated_at')}: ${fmtStamp(table.generated_at)} · ${t('reports.rowCount', { count: table.body_rows })}`}
      </Text>
    </View>
  );
}

function SheetView({ sheet, onDrill }: { sheet: SheetJson; onDrill?: OnDrill }) {
  const { t, i18n } = useTranslation();
  const { colors: c } = useTheme();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [chrome, setChrome] = useState(INITIAL_CHROME);
  const scrollRef = useRef<ScrollView>(null);
  // Web: chegaralar + aylantirish chizig'ining haqiqiy balandligi (DOM: offsetHeight − clientHeight).
  const measureChrome = () => {
    if (Platform.OS !== 'web') return;
    const ref = scrollRef.current as unknown as { getScrollableNode?: () => unknown } | null;
    const ch = measuredChrome(ref?.getScrollableNode?.() ?? ref);
    if (ch !== null) setChrome((prev) => (prev === ch ? prev : ch));
  };
  const base = useMemo(() => columnWidths(sheet), [sheet]);
  // Muzlatish ekran kengligiga bog'liq (o'lchangach): blok ko'pi bilan ~yarim ekran.
  const frz = useMemo(() => freezeLayout(sheet.freeze_cols ?? 0, base, box.w), [sheet.freeze_cols, base, box.w]);
  const widths = frz.widths;
  const freeze = frz.count;
  const prefix = useMemo(() => prefixSums(widths), [widths]);
  const total = prefix[prefix.length - 1] ?? 0;
  const header = useMemo(() => layoutHeader(sheet.header, widths), [sheet.header, widths]);
  const leaf = useMemo(
    () => leafLabels(header.cells, sheet.ncols, (cell) => reportLabel(cell.k, cell.v)),
    // Til almashsa yangi massiv — memo qatorlar (jami yorlig'i) ham qayta chiziladi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [header.cells, sheet.ncols, i18n.language],
  );
  const [scrollX] = useState(() => new Animated.Value(0));
  const onScroll = useMemo(
    () => Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: NATIVE_DRIVER }),
    [scrollX],
  );
  const pin = useMemo<Pin>(() => ({ transform: [{ translateX: scrollX }] }), [scrollX]);
  const viewW = box.w ? Math.min(box.w, total) : total;
  const extra = useMemo(() => ({ leaf, prefix, freeze, viewW }), [leaf, prefix, freeze, viewW]);
  const rowProps = { prefix, total, leaf, freeze, pin, viewW, onDrill, c };

  // Qisqa jadval o'z balandligida (jami oxirgi qatordan keyin, bo'sh joy ostida emas); uzuni
  // mavjud joyga qisqaradi va tana FlatList'da virtual qoladi.
  // sheetContentHeight chegaralarni o'z ichiga oladi — ustiga faqat aylantirish chizig'i qo'shiladi.
  const contentH = sheetContentHeight(sheet) + Math.max(0, chrome - BORDERS);
  return (
    <View
      style={[styles.sheet, { height: contentH, minHeight: Math.min(contentH, 160) }]}
      testID="report-sheet"
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        setBox((b) => (b.w === w && b.h === h ? b : { w, h }));
      }}
    >
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        onLayout={measureChrome}
        onContentSizeChange={measureChrome}
        style={[styles.hscroll, { borderColor: c.border }]}
        testID="report-sheet-scroll"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Ichki balandlik — ko'rinadigan maydon (qobiqsiz): aks holda «Jami» qatori chiziq ostida qoladi. */}
        <View style={{ width: total, height: box.h ? Math.max(0, box.h - chrome) : undefined }}>
          <View style={{ height: header.height, width: total, backgroundColor: c.bg }}>
            {header.cells.flatMap((pc, i) =>
              splitSpan(pc.col, pc.cell.cs ?? 1, freeze, prefix).map((part, k) => {
                const style: StyleProp<ViewStyle> = [
                  styles.headCell,
                  { left: part.x, top: pc.y, width: part.w, height: pc.h, borderColor: c.border },
                  part.frozen && [styles.frozen, { backgroundColor: c.bg }],
                  part.edge && { borderRightWidth: 1, borderRightColor: c.borderStrong },
                ];
                const label = part.label ? (
                  <Text
                    variant="caption"
                    weight="600"
                    numberOfLines={2 * Math.max(1, pc.cell.rs ?? 1)}
                    style={[styles.headText, { color: pc.cell.s === 'header_danger' ? c.danger : c.fgMuted }]}
                  >
                    {reportLabel(pc.cell.k, pc.cell.v)}
                  </Text>
                ) : null;
                return part.frozen ? (
                  <Animated.View key={`${i}.${k}`} style={[style, pin]} testID={`report-frozen-head-${part.col}`}>
                    {label}
                  </Animated.View>
                ) : (
                  <View key={`${i}.${k}`} style={style}>
                    {label}
                  </View>
                );
              }),
            )}
          </View>
          {sheet.rows.length === 0 ? (
            <View style={[styles.empty, { width: total }]}>
              <Text variant="body" tone="subtle">
                {t('reports.noData')}
              </Text>
            </View>
          ) : (
            <FlatList
              style={styles.flex}
              data={sheet.rows}
              extraData={extra}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => <TableRow row={item} footer={false} {...rowProps} />}
              getItemLayout={(_, i) => ({ length: ROW_H, offset: ROW_H * i, index: i })}
              initialNumToRender={30}
              maxToRenderPerBatch={30}
              windowSize={9}
            />
          )}
          {sheet.footer.map((r, i) => (
            <TableRow key={`f${i}`} row={r} footer {...rowProps} />
          ))}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const TableRow = memo(function TableRow({
  row,
  prefix,
  total,
  leaf,
  footer,
  freeze,
  pin,
  viewW,
  onDrill,
  c,
}: {
  row: RowJson;
  prefix: number[];
  total: number;
  leaf: string[];
  footer: boolean;
  /** Muzlatilgan ustunlar soni (0 — yo'q). */
  freeze: number;
  /** Gorizontal siljishga teskari `translateX` — muzlatilgan kataklar va bo'lim nomi joyida turadi. */
  pin: Pin;
  viewW: number;
  onDrill?: OnDrill;
  c: ThemeColors;
}) {
  if (row.kind === 'section') {
    const tone = styleTone('section');
    return (
      <View style={[styles.row, { width: total, backgroundColor: c[tone.bg!], borderColor: c.border }]}>
        {/* v2 «sticky» ichki element: bo'lim nomi gorizontal siljishda ham ko'rinib turadi. */}
        <Animated.View style={[{ width: viewW }, pin]}>
          <Text variant="caption" weight="700" numberOfLines={1} style={[styles.sectionText, { color: c[tone.fg!] }]}>
            {String(row.c[0]?.v ?? '')}
          </Text>
        </Animated.View>
      </View>
    );
  }
  return (
    <View style={[styles.row, { width: total, borderColor: c.border }]}>
      {rowLayout(row, prefix).flatMap(({ cell, col }, i) => {
        const tone = cellTone(cell, row, footer);
        const text = cellText(cell, footer, reportLabel);
        const drill = cell.p && onDrill ? cell.p : null;
        return splitSpan(col, cell.cs ?? 1, freeze, prefix).map((part, k) => {
          const style: ViewStyle = {
            width: part.w,
            backgroundColor: tone.bg ? c[tone.bg] : c.surface,
            borderColor: c.border,
            ...(part.edge ? { borderRightWidth: 1, borderRightColor: c.borderStrong } : null),
          };
          const key = `${i}.${k}`;
          let el: React.ReactElement;
          if (!part.label) {
            // Chegarani kesib o'tgan katakning o'ng (bo'sh) bo'lagi — o'sha tonda.
            el = <View key={key} style={[styles.cell, style]} />;
          } else {
            const body = (
              <Text
                variant="caption"
                weight={tone.bold ? '700' : undefined}
                numberOfLines={1}
                style={{
                  textAlign: cellAlign(cell),
                  color: drill ? c.drop : tone.fg ? c[tone.fg] : c.fg,
                  textDecorationLine: drill ? 'underline' : 'none',
                }}
              >
                {text}
              </Text>
            );
            el = drill ? (
              <Pressable
                key={key}
                testID={`report-drill-${drill.report}`}
                accessibilityRole="link"
                onPress={() => onDrill!(drill, crumbLabel(leaf[col], text))}
                style={[styles.cell, style]}
              >
                {body}
              </Pressable>
            ) : (
              <View key={key} style={[styles.cell, style]}>
                {body}
              </View>
            );
          }
          return part.frozen ? (
            <Animated.View key={key} style={[styles.frozen, { width: part.w }, pin]}>
              {el}
            </Animated.View>
          ) : (
            el
          );
        });
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, gap: 8 },
  head: { gap: 4 },
  info: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 2 },
  chips: { gap: 6 },
  sheet: { flexGrow: 0, flexShrink: 1 },
  hscroll: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10 },
  headCell: {
    position: 'absolute',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headText: { textAlign: 'center', fontSize: 11, lineHeight: 14 },
  frozen: { zIndex: 1 },
  row: { flexDirection: 'row', height: ROW_H, borderBottomWidth: StyleSheet.hairlineWidth },
  cell: { height: ROW_H, justifyContent: 'center', paddingHorizontal: 6, borderRightWidth: StyleSheet.hairlineWidth },
  sectionText: { paddingHorizontal: 8, lineHeight: ROW_H },
  empty: { padding: 24, alignItems: 'center', minHeight: HEADER_ROW_H },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  signature: { flexDirection: 'row', gap: 16, padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  qr: { width: 96, height: 96, borderRadius: 6 },
  flex: { flex: 1 },
});
