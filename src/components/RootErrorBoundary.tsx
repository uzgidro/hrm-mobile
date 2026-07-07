// Catches uncaught render/runtime errors anywhere below it and shows a recovery
// screen instead of a white/crashed app. This is for JS exceptions (a bug in a
// screen), NOT network errors — those are surfaced as toasts via the
// QueryCache/MutationCache onError. Mounted just under the theme provider in the
// root layout so it can read colors.
import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/palettes';
import { Icon } from './Icon';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

// The visible fallback is a function component so it can use theme hooks; the
// boundary itself must be a class (only class components have getDerivedState /
// componentDidCatch).
function Fallback({ error, onReset }: { error: Error; onReset: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Icon name="close" size={30} color={colors.error} />
        </View>
        <Text style={styles.title}>Nimadir noto&apos;g&apos;ri ketdi</Text>
        <Text style={styles.text}>Ilovada kutilmagan xatolik yuz berdi.</Text>
        {__DEV__ && !!error?.message && (
          <Text style={styles.devText} numberOfLines={4}>
            {error.message}
          </Text>
        )}
        <Pressable onPress={onReset} style={styles.retry} hitSlop={8}>
          <Text style={styles.retryText}>Qayta urinish</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Surface in dev; a real crash-reporting hook (Sentry) would go here.
    if (__DEV__) console.error('RootErrorBoundary caught:', error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return <Fallback error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 28 },
    iconWrap: {
      width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor: c.errorSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    title: { fontSize: 18, fontWeight: '700', color: c.text, textAlign: 'center' },
    text: { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
    devText: {
      fontSize: 12,
      color: c.error,
      textAlign: 'center',
      marginTop: 8,
      fontFamily: 'monospace' as never,
    },
    retry: {
      marginTop: 16,
      paddingVertical: 11,
      paddingHorizontal: 26,
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    retryText: { color: c.onPrimary, fontWeight: '700', fontSize: 15 },
  });
