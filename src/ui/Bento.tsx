// Responsive bento: bolalar `bentoColumns` (compact 1 / medium 2 / expanded 3)
// bo'yicha qatorlarga joylanadi. Joylash mantig'i sof `bentoLayout` da.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useBreakpoint } from '@/utils/responsive';

/** Elementlarni qatorlarga joylaydi; span > columns bo'lsa columns ga qisqaradi. */
export function bentoLayout(spans: number[], columns: number): number[][] {
  const rows: number[][] = [];
  let row: number[] = [];
  let used = 0;
  spans.forEach((raw, i) => {
    const span = Math.min(Math.max(1, raw), columns);
    if (used + span > columns) {
      rows.push(row);
      row = [];
      used = 0;
    }
    row.push(i);
    used += span;
    if (used === columns) {
      rows.push(row);
      row = [];
      used = 0;
    }
  });
  if (row.length) rows.push(row);
  return rows;
}

type ItemProps = { span?: number; children: React.ReactNode };

function Item({ children }: ItemProps) {
  return <>{children}</>;
}

export function Bento({ children, gap = 12, columns }: { children: React.ReactNode; gap?: number; columns?: number }) {
  const bp = useBreakpoint();
  const cols = columns ?? bp.bentoColumns;
  const items = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<ItemProps>[];
  const spans = items.map((el) => Math.min(el.props.span ?? 1, cols));
  const rows = bentoLayout(spans, cols);
  return (
    <View style={{ gap }}>
      {rows.map((row, r) => (
        <View key={r} style={[styles.row, { gap }]}>
          {row.map((i) => (
            <View key={i} style={{ flex: spans[i], minWidth: 0 }}>
              {items[i]}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

Bento.Item = Item;

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'stretch' } });
