// Sanatorium location (registrar): latitude / longitude picked on our own map or typed, address,
// zoom and «how to get here» notes in uz / ru / en. Guests see it in the bot and the cabinet.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSingleFlight } from '../../simple/useSingleFlight';
import { FormInput } from '@/components/FormInput';
import { toast } from '@/lib/toast';
import { Button, Card, PageHeader, Screen } from '@/ui';
import { locationQuery, useSaveLocation } from '../../api/sections1';
import { QueryBlock, useSanReadOnly } from '../../components/common';
import { ErrorLine } from '../../components/forms';
import { MapPicker } from '../../components/sections1/MapPicker';
import { LangFields, SectionGate } from '../../components/sections1/shared';
import type { SanLocation } from '../../types1';
import { locationBody, parseCoord } from '../../utils/sections1';
import { sanErrorMessage } from '../../utils/sanatorium';

export default function LocationScreen() {
  const { t } = useTranslation();
  const q = useQuery(locationQuery());
  return (
    <SectionGate feature="location_map" roles={['registrar']}>
      <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="sanatorium-location-screen">
        <PageHeader title={t('san1.location.title')} />
        <QueryBlock query={q}>{(loc) => <LocationForm key={JSON.stringify(loc)} loc={loc} />}</QueryBlock>
      </Screen>
    </SectionGate>
  );
}

function LocationForm({ loc }: { loc: SanLocation }) {
  const { t } = useTranslation();
  const save = useSaveLocation();
  const readOnly = useSanReadOnly();
  const [lat, setLat] = useState(loc.latitude != null ? String(loc.latitude) : '');
  const [lng, setLng] = useState(loc.longitude != null ? String(loc.longitude) : '');
  const [zoom, setZoom] = useState(String(loc.zoom ?? 15));
  const [address, setAddress] = useState(loc.address ?? '');
  const [notes, setNotes] = useState({ uz: loc.directions_note_uz ?? '', ru: loc.directions_note_ru ?? '', en: loc.directions_note_en ?? '' });
  const [error, setError] = useState<string | null>(null);

  const flight = useSingleFlight();
  const submit = async () => {
    const r = locationBody({ lat, lng, zoom, address, uz: notes.uz, ru: notes.ru, en: notes.en });
    if (!r.ok) return setError(t(`san1.location.err.${r.error}`));
    try {
      await save.mutateAsync(r.body);
      setError(null);
      toast.success(t('sanatorium.saved'));
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };

  return (
    <View style={styles.stack} testID="location-form">
      <Card title={t('san1.location.point')} icon="mapPin" tint="cyan">
        <MapPicker
          lat={parseCoord(lat)}
          lng={parseCoord(lng)}
          zoom={Number.parseInt(zoom, 10) || 15}
          readOnly={readOnly}
          onPick={(p) => {
            if (readOnly) return;
            setLat(String(p.lat));
            setLng(String(p.lng));
            setZoom(String(p.zoom));
            setError(null);
          }}
          onZoom={(z) => !readOnly && setZoom(String(z))}
        />
        <View style={styles.pair}>
          <View style={styles.flex}><FormInput label={t('san1.location.lat')} value={lat} onChangeText={readOnly ? () => {} : setLat} keyboardType="numbers-and-punctuation" testID="loc-lat" /></View>
          <View style={styles.flex}><FormInput label={t('san1.location.lng')} value={lng} onChangeText={readOnly ? () => {} : setLng} keyboardType="numbers-and-punctuation" testID="loc-lng" /></View>
        </View>
        <FormInput label={t('san1.location.zoom')} value={zoom} onChangeText={readOnly ? () => {} : setZoom} keyboardType="number-pad" testID="loc-zoom" />
        {!readOnly && <Button testID="loc-clear" label={t('san1.location.clear')} variant="ghost" size="sm" onPress={() => { setLat(''); setLng(''); }} />}
      </Card>
      <Card>
        <FormInput label={t('san1.location.address')} value={address} onChangeText={readOnly ? () => {} : setAddress} multiline maxLength={300} testID="loc-address" />
        <LangFields label={t('san1.location.notes')} values={notes} onChange={readOnly ? () => {} : setNotes} multiline maxLength={1000} testID="loc-note" />
      </Card>
      <ErrorLine message={error} testID="loc-error" />
      {!readOnly && <Button testID="loc-save" label={t('common.save')} full loading={save.isPending} onPress={() => void flight.run(submit)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  pair: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
