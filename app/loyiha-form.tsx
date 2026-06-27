import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../src/api/client';
import { WORKSPACES_LIST, WORKSPACE_DETAIL } from '../src/api/urls';
import { useTheme, useThemedStyles } from '../src/theme/ThemeProvider';
import type { ThemeColors } from '../src/theme/palettes';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { FormInput } from '../src/components/FormInput';
import { Icon } from '../src/components/Icon';
import type { Workspace } from '../src/types';

export default function LoyihaFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const wsId = Number(id);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await apiClient.get<Workspace>(WORKSPACE_DETAIL(wsId));
        setName(data.name ?? '');
        setDescription(data.description ?? '');
      } catch {} finally {
        setHydrating(false);
      }
    })();
  }, [isEdit, wsId]);

  const save = async () => {
    if (!name.trim()) { setError('Loyiha nomi kiritilishi shart'); return; }
    setLoading(true);
    const payload = { name: name.trim(), description: description.trim() };
    try {
      if (isEdit) await apiClient.patch(WORKSPACE_DETAIL(wsId), payload);
      else await apiClient.post(WORKSPACES_LIST, payload);
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      if (isEdit) qc.invalidateQueries({ queryKey: ['workspace', wsId] });
      router.back();
    } catch (e: any) {
      Alert.alert('Xatolik', e?.response?.data?.detail || 'Saqlashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={isEdit ? 'Loyihani tahrirlash' : 'Yangi loyiha'} />
      {hydrating ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FormInput label="Loyiha nomi" value={name} onChangeText={(t) => { setName(t); setError(''); }} placeholder="Masalan: 2026 rejasi" required error={error} />
          <FormInput label="Tavsif" value={description} onChangeText={setDescription} placeholder="Loyiha haqida qisqacha..." multiline />

          <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.6 }]} onPress={save} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={colors.onPrimary} /> : (
              <>
                <Icon name="check" size={18} color={colors.onPrimary} />
                <Text style={styles.saveText}>Saqlash</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
    saveBtn: { flexDirection: 'row', gap: 8, backgroundColor: c.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    saveText: { color: c.onPrimary, fontSize: 16, fontWeight: '700' },
  });
