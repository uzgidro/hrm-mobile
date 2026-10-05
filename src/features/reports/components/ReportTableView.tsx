// Hisobot jadvali (web v2 `ReportTableView`): sarlavha (ko'p qatorli, cs/rs), bo'lim
// qatorlari, uslubli katakchalar va drill havolalari, jami qatorlari, rang izohi, imzo/QR.
// Faqat RN View'lar: gorizontal ScrollView ichida qat'iy kenglikli ustunlar, tana — virtual
// FlatList (bir necha yuz qator, har biri qat'iy balandlikda — `getItemLayout`).
import React, { memo, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
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
  layoutHeader,
  leafLabels,
  prefixSums,
  rowLayout,
  styleTone,
} from '../utils/table';
import type { DrillRef, ReportTableJson, RowJson, SheetJson } from '../utils/types';

type OnDrill = (ref: DrillRef, label: string) => void;

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
      {sheet ? <SheetView key={`${index}`} sheet={sheet} onDrill={onDrill} /> : null}
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
  const [height, setHeight] = useState(0);
  const widths = useMemo(() => columnWidths(sheet), [sheet]);
  const prefix = useMemo(() => prefixSums(widths), [widths]);
  const total = prefix[prefix.length - 1] ?? 0;
  const header = useMemo(() => layoutHeader(sheet.header, widths), [sheet.header, widths]);
  const leaf = useMemo(
    () => leafLabels(header.cells, sheet.ncols, (cell) => reportLabel(cell.k, cell.v)),
    // Til almashsa yangi massiv — memo qatorlar (jami yorlig'i) ham qayta chiziladi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [header.cells, sheet.ncols, i18n.language],
  );

  return (
    <View style={styles.sheet} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <ScrollView horizontal style={[styles.hscroll, { borderColor: c.border }]} testID="report-sheet-scroll">
        <View style={{ width: total, height: height || undefined }}>
          <View style={{ height: header.height, width: total, backgroundColor: c.bg }}>
            {header.cells.map((pc, i) => (
              <View
                key={i}
                style={[styles.headCell, { left: pc.x, top: pc.y, width: pc.w, height: pc.h, borderColor: c.border }]}
              >
                <Text
                  variant="caption"
                  weight="600"
                  numberOfLines={2 * Math.max(1, pc.cell.rs ?? 1)}
                  style={[styles.headText, { color: pc.cell.s === 'header_danger' ? c.danger : c.fgMuted }]}
                >
                  {reportLabel(pc.cell.k, pc.cell.v)}
                </Text>
              </View>
            ))}
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
              extraData={leaf}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <TableRow row={item} prefix={prefix} total={total} leaf={leaf} footer={false} onDrill={onDrill} c={c} />
              )}
              getItemLayout={(_, i) => ({ length: ROW_H, offset: ROW_H * i, index: i })}
              initialNumToRender={30}
              maxToRenderPerBatch={30}
              windowSize={9}
            />
          )}
          {sheet.footer.map((r, i) => (
            <TableRow key={`f${i}`} row={r} prefix={prefix} total={total} leaf={leaf} footer onDrill={onDrill} c={c} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const TableRow = memo(function TableRow({
  row,
  prefix,
  total,
  leaf,
  footer,
  onDrill,
  c,
}: {
  row: RowJson;
  prefix: number[];
  total: number;
  leaf: string[];
  footer: boolean;
  onDrill?: OnDrill;
  c: ThemeColors;
}) {
  if (row.kind === 'section') {
    const tone = styleTone('section');
    return (
      <View style={[styles.row, { width: total, backgroundColor: c[tone.bg!], borderColor: c.border }]}>
        <Text variant="caption" weight="700" numberOfLines={1} style={[styles.sectionText, { color: c[tone.fg!] }]}>
          {String(row.c[0]?.v ?? '')}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.row, { width: total, borderColor: c.border }]}>
      {rowLayout(row, prefix).map(({ cell, col, w }, i) => {
        const tone = cellTone(cell, row, footer);
        const text = cellText(cell, footer, reportLabel);
        const drill = cell.p && onDrill ? cell.p : null;
        const style: ViewStyle = { width: w, backgroundColor: tone.bg ? c[tone.bg] : c.surface, borderColor: c.border };
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
        return drill ? (
          <Pressable
            key={i}
            testID={`report-drill-${drill.report}`}
            accessibilityRole="link"
            onPress={() => onDrill!(drill, crumbLabel(leaf[col], text))}
            style={[styles.cell, style]}
          >
            {body}
          </Pressable>
        ) : (
          <View key={i} style={[styles.cell, style]}>
            {body}
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, gap: 8 },
  head: { gap: 4 },
  info: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 2 },
  chips: { gap: 6 },
  sheet: { flex: 1, minHeight: 160 },
  hscroll: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10 },
  headCell: {
    position: 'absolute',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headText: { textAlign: 'center', fontSize: 11, lineHeight: 14 },
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
