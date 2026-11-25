// Quote calculator (registrar): dates, adults, children's ages, optional room / package / guest
// type / paid services -> itemized accommodation, package, child discount, services and total.
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { Badge, Button, Card, ListRow, Text } from '@/ui';
import { packagesQuery, servicesQuery, useQuote, type QuoteResult } from '../../api/sections2';
import { roomsQuery } from '../../api/queries';
import { ChoiceField, DateField, ErrorLine } from '../../components/forms';
import { ChipWrap, FieldLabel, SectionScreen, useContentLang } from '../../components/sections2/kit';
import { useSanReadOnly } from '../../components/common';
import { GUEST_TYPES } from '../../types';
import { parseAges, pickText, quoteBody, type QuoteDraft } from '../../utils/sections2';
import { useSanFeatures } from '../../utils/features';
import { fmtDate, fmtMoney, sanErrorMessage, todayIso } from '../../utils/sanatorium';

export default function QuoteScreen() {
  const { t } = useTranslation();
  const lang = useContentLang();
  const f = useSanFeatures();
  const rooms = useQuery(roomsQuery());
  const packages = useQuery(packagesQuery(false, f.on('packages')));
  const services = useQuery(servicesQuery(false, f.on('paid_services')));
  const quote = useQuote();
  // The calculator is a POST: the server refuses it for the view-only chairman.
  const readOnly = useSanReadOnly();
  const [d, setD] = useState<QuoteDraft>(() => ({ start: todayIso(), end: dayjs().add(7, 'day').format('YYYY-MM-DD'), adults: '1', children: [], roomId: null, packageId: null, guestType: null, services: [] }));
  const [ages, setAges] = useState('');
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<QuoteDraft>) => setD((x) => ({ ...x, ...p }));

  const submit = async () => {
    const draft = { ...d, children: parseAges(ages) };
    const r = quoteBody(draft);
    if (!r.ok) return setError(t(r.error));
    setError(null);
    try {
      setResult(await quote.mutateAsync(r.body));
    } catch (e) {
      setResult(null);
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  const toggleService = (id: number) =>
    set({ services: d.services.some((s) => s.serviceId === id) ? d.services.filter((s) => s.serviceId !== id) : [...d.services, { serviceId: id, quantity: 1 }] });
  const setQty = (id: number, delta: number) => set({ services: d.services.map((s) => (s.serviceId === id ? { ...s, quantity: Math.max(1, Math.min(1000, s.quantity + delta)) } : s)) });

  return (
    <SectionScreen title={t('sanatorium.s2.quote')} feature={null} roles={['registrar']} testID="san-quote-screen">
      <Card>
        <DateField label={t('sanatorium.dateFrom')} value={d.start} onChange={(v) => set({ start: v })} testID="qt-start" />
        <DateField label={t('sanatorium.dateTo')} value={d.end} onChange={(v) => set({ end: v })} testID="qt-end" />
        <FormInput label={t('sanatorium.adults')} value={d.adults} onChangeText={(v) => set({ adults: v })} keyboardType="number-pad" testID="qt-adults" />
        <FormInput label={t('sanatorium.s2.childrenAges')} value={ages} onChangeText={setAges} placeholder="3, 7" keyboardType="numbers-and-punctuation" testID="qt-ages" />
        <ChoiceField label={t('sanatorium.room')} value={d.roomId} noneLabel={t('sanatorium.noRoom')} options={(rooms.data ?? []).filter((r) => r.is_active).map((r) => ({ value: r.id, label: [r.number, r.building].filter(Boolean).join(' · ') }))} onChange={(v) => set({ roomId: v })} loading={rooms.isPending} testID="qt-room" />
        {f.on('packages') && (
          <ChoiceField label={t('sanatorium.s2.package')} value={d.packageId} noneLabel={t('sanatorium.none')} options={(packages.data ?? []).map((p) => ({ value: p.id, label: pickText(p as never, 'name', lang), sub: `${p.nights} ${t('sanatorium.s2.nightsShort')}` }))} onChange={(v) => set({ packageId: v })} loading={packages.isPending} testID="qt-package" />
        )}
        <ChoiceField label={t('sanatorium.guestTypeLabel')} value={d.guestType} noneLabel={t('sanatorium.none')} options={GUEST_TYPES.map((g) => ({ value: g as string, label: t(`sanatorium.guestType.${g}`) }))} onChange={(v) => set({ guestType: v })} testID="qt-type" />
        {f.on('paid_services') && (services.data ?? []).length > 0 && (
          <>
            <FieldLabel>{t('sanatorium.s2.services')}</FieldLabel>
            <ChipWrap options={(services.data ?? []).map((s) => ({ value: s.id, label: `${pickText(s as never, 'name', lang)} · ${fmtMoney(s.price)} / ${t(`sanatorium.s2.unit.${s.unit}`)}` }))} isOn={(v) => d.services.some((s) => s.serviceId === v)} onToggle={toggleService} testID="qt-services" />
            {d.services.map((s) => (
              <View key={s.serviceId} style={styles.qty}>
                <Text variant="body" style={styles.flex} numberOfLines={1}>{pickText((services.data ?? []).find((x) => x.id === s.serviceId) as never, 'name', lang)}</Text>
                <Button label="−" size="sm" variant="soft" onPress={() => setQty(s.serviceId, -1)} />
                <Text variant="heading">{s.quantity}</Text>
                <Button label="+" size="sm" variant="soft" onPress={() => setQty(s.serviceId, 1)} />
              </View>
            ))}
          </>
        )}
        <ErrorLine message={error} testID="qt-error" />
        {!readOnly && <Button testID="qt-calc" label={t('sanatorium.s2.calculate')} full loading={quote.isPending} onPress={() => void submit()} />}
      </Card>
      {result && <QuoteResultView r={result} />}
    </SectionScreen>
  );
}

function QuoteResultView({ r }: { r: QuoteResult }) {
  const { t } = useTranslation();
  const lang = useContentLang();
  return (
    <Card title={t('sanatorium.s2.quoteResult')} icon="wallet" tint="green" testID="quote-result">
      <Text variant="caption" tone="muted">{fmtDate(r.start)} → {fmtDate(r.end)} · {r.nights} {t('sanatorium.s2.nightsShort')} · {r.adults} + {r.children}</Text>
      {r.room && <View style={styles.badges}><Badge label={`${t('sanatorium.room')} ${r.room.number}`} tone="info" testID="quote-room" /></View>}
      {r.package && <ListRow title={`${t('sanatorium.s2.package')}: ${pickText(r.package as never, 'name', lang)}`} subtitle={`${r.package.nights} ${t('sanatorium.s2.nightsShort')}`} right={<Text variant="heading">{fmtMoney(r.package.amount)}</Text>} />}
      {r.night_lines.map((l) => (
        <ListRow key={l.date} title={fmtDate(l.date)} subtitle={`${fmtMoney(l.unit_price)} × ${l.persons_charged}${l.season ? ` · ${typeof l.season === 'string' ? l.season : l.season.name}` : ''}`} right={<Text variant="body">{fmtMoney(l.amount)}</Text>} />
      ))}
      {Number(r.child_discount?.amount) !== 0 && r.child_discount && (
        <ListRow testID="quote-child-discount" title={`${t('sanatorium.childDiscount')} (${r.child_discount.percent}%${r.children_discounted != null ? ` · ${t('sanCatalog.quote.children', { n: r.children_discounted })}` : ''})`} right={<Text variant="body">{fmtMoney(r.child_discount.amount)}</Text>} />
      )}
      {r.services.map((s) => (
        <ListRow key={s.service_id} title={pickText(s as never, 'name', lang)} subtitle={`${s.quantity} × ${fmtMoney(s.unit_price)} / ${t(`sanatorium.s2.unit.${s.unit}`, { defaultValue: s.unit })}`} right={<Text variant="body">{fmtMoney(s.amount)}</Text>} />
      ))}
      <ListRow title={t('sanatorium.s2.accommodationTotal')} right={<Text variant="body">{fmtMoney(r.accommodation_total)}</Text>} />
      <ListRow title={t('sanatorium.s2.servicesTotal')} right={<Text variant="body">{fmtMoney(r.services_total)}</Text>} />
      <ListRow title={t('sanatorium.total')} right={<Text variant="title" testID="quote-total">{fmtMoney(r.total)}</Text>} />
    </Card>
  );
}

const styles = StyleSheet.create({ badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, flex: { flex: 1 }, qty: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 } });
