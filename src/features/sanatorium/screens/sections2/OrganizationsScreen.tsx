// Organizations (customers billed for stays): registrar CRUD, search, and the invoice for a period
// (summary + PDF / DOCX download).
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { SANATORIUM_ORG_INVOICE_FILE } from '@/api/urls';
import { toast } from '@/lib/toast';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { Badge, Button, Card, EmptyState, ListRow, SearchField, Sheet, Text } from '@/ui';
import { invoiceQuery, orgsQuery, useDeleteOrganization, useSaveOrganization, type Organization } from '../../api/sections2';
import { QueryBlock } from '../../components/common';
import { DateField, ErrorLine, SwitchRow } from '../../components/forms';
import { DownloadButton, RowTools, SectionScreen, useConfirmDelete } from '../../components/sections2/kit';
import { docFileName, emptyOrgDraft, orgBody, type OrgDraft } from '../../utils/sections2';
import { fmtDate, fmtMoney, sanErrorMessage, todayIso } from '../../utils/sanatorium';

export default function OrganizationsScreen() {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');
  const q = useQuery(orgsQuery(useDebouncedValue(term), true));
  const del = useDeleteOrganization();
  const confirmDelete = useConfirmDelete();
  const [edit, setEdit] = useState<Organization | 'new' | null>(null);
  const [invoice, setInvoice] = useState<Organization | null>(null);
  return (
    <SectionScreen title={t('sanatorium.s2.organizations')} feature="documents" roles={['registrar']} testID="san-orgs-screen" refreshing={q.isRefetching} onRefresh={() => void q.refetch()} onAdd={() => setEdit('new')} addLabel={t('sanatorium.s2.addOrg')}>
      <SearchField testID="org-search" value={term} onChangeText={setTerm} placeholder={t('sanatorium.s2.searchOrg')} />
      <QueryBlock query={q}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState title={t('sanatorium.s2.noOrgs')} />
          ) : (
            <View style={styles.stack}>
              {list.map((o) => (
                <Card key={o.id} testID={`org-${o.id}`}>
                  <View style={styles.head}>
                    <Text variant="heading" style={styles.flex}>{o.name}</Text>
                    {!o.is_active && <Badge label={t('sanatorium.s2.inactive')} tone="warning" />}
                  </View>
                  <Text variant="caption" tone="muted">{[o.tin ? `${t('sanatorium.s2.tin')}: ${o.tin}` : null, o.contract_no ? `${t('sanatorium.s2.contractNo')}: ${o.contract_no}` : null, o.contact_person].filter(Boolean).join(' · ')}</Text>
                  <View style={styles.actions}>
                    <Button testID={`org-invoice-${o.id}`} label={t('sanatorium.s2.invoice')} size="sm" variant="soft" icon="doc" onPress={() => setInvoice(o)} />
                    <RowTools testID={`org-tools-${o.id}`} onEdit={() => setEdit(o)} onDelete={() => void confirmDelete(t('sanatorium.s2.deleteOrg'), () => del.mutateAsync(o.id))} />
                  </View>
                </Card>
              ))}
            </View>
          )
        }
      </QueryBlock>
      <Sheet visible={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? t('sanatorium.s2.addOrg') : t('sanatorium.s2.editOrg')} scroll>
        {edit && <OrgForm key={edit === 'new' ? 'new' : edit.id} org={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      </Sheet>
      <Sheet visible={!!invoice} onClose={() => setInvoice(null)} title={t('sanatorium.s2.invoice')} scroll>
        {invoice && <InvoiceView org={invoice} />}
      </Sheet>
    </SectionScreen>
  );
}

function OrgForm({ org, onClose }: { org: Organization | null; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useSaveOrganization();
  const [d, setD] = useState<OrgDraft>(() =>
    org
      ? { name: org.name, tin: org.tin ?? '', address: org.address ?? '', bankName: org.bank_name ?? '', bankAccount: org.bank_account ?? '', bankMfo: org.bank_mfo ?? '', contactPerson: org.contact_person ?? '', contactPhone: org.contact_phone ?? '', contractNo: org.contract_no ?? '', contractDate: org.contract_date, note: org.note ?? '', active: org.is_active }
      : emptyOrgDraft(),
  );
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<OrgDraft>) => setD((x) => ({ ...x, ...p }));
  const submit = async () => {
    const r = orgBody(d);
    if (!r.ok) return setError(t(r.error));
    try {
      await save.mutateAsync({ id: org?.id, body: r.body });
      toast.success(t('sanatorium.saved'));
      onClose();
    } catch (e) {
      setError(sanErrorMessage(e, t('errors.generic')));
    }
  };
  return (
    <View testID="org-form">
      <FormInput label={t('sanatorium.s2.orgName')} value={d.name} onChangeText={(v) => set({ name: v })} required testID="og-name" />
      <FormInput label={t('sanatorium.s2.tin')} value={d.tin} onChangeText={(v) => set({ tin: v })} keyboardType="number-pad" testID="og-tin" />
      <FormInput label={t('sanatorium.address')} value={d.address} onChangeText={(v) => set({ address: v })} multiline />
      <FormInput label={t('sanatorium.s2.bankName')} value={d.bankName} onChangeText={(v) => set({ bankName: v })} />
      <FormInput label={t('sanatorium.s2.bankAccount')} value={d.bankAccount} onChangeText={(v) => set({ bankAccount: v })} keyboardType="number-pad" />
      <FormInput label={t('sanatorium.s2.bankMfo')} value={d.bankMfo} onChangeText={(v) => set({ bankMfo: v })} keyboardType="number-pad" />
      <FormInput label={t('sanatorium.s2.contactPerson')} value={d.contactPerson} onChangeText={(v) => set({ contactPerson: v })} />
      <FormInput label={t('sanatorium.s2.contactPhone')} value={d.contactPhone} onChangeText={(v) => set({ contactPhone: v })} keyboardType="phone-pad" />
      <FormInput label={t('sanatorium.s2.contractNo')} value={d.contractNo} onChangeText={(v) => set({ contractNo: v })} />
      <DateField label={t('sanatorium.s2.contractDate')} value={d.contractDate} onChange={(v) => set({ contractDate: v })} />
      <FormInput label={t('sanatorium.notes')} value={d.note} onChangeText={(v) => set({ note: v })} multiline />
      <SwitchRow label={t('sanatorium.s2.active')} value={d.active} onChange={(v) => set({ active: v })} testID="og-active" />
      <ErrorLine message={error} testID="og-error" />
      <Button testID="og-save" label={t('common.save')} full loading={save.isPending} onPress={() => void submit()} />
    </View>
  );
}

function InvoiceView({ org }: { org: Organization }) {
  const { t } = useTranslation();
  const [from, setFrom] = useState<string>(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState<string>(todayIso());
  const q = useQuery(invoiceQuery(org.id, from, to));
  return (
    <View testID="org-invoice-sheet">
      <Text variant="heading">{org.name}</Text>
      <DateField label={t('sanatorium.dateFrom')} value={from} onChange={setFrom} testID="inv-from" />
      <DateField label={t('sanatorium.dateTo')} value={to} onChange={setTo} testID="inv-to" />
      {to < from ? <ErrorLine message={t('sanatorium.errors.invalid_period')} /> : (
        <QueryBlock query={q}>
          {(inv) => (
            <View>
              {inv.rows.length === 0 && <Text variant="body" tone="muted">{t('sanatorium.s2.noInvoiceRows')}</Text>}
              {inv.rows.map((r) => (
                <ListRow key={r.stay_id} title={`${r.no}. ${r.guest}`} subtitle={`${r.room ? `${t('sanatorium.room')} ${r.room} · ` : ''}${fmtDate(r.planned_from)} → ${fmtDate(r.planned_to)} (${r.nights})`} right={<Text variant="body">{fmtMoney(r.total)}</Text>} />
              ))}
              <ListRow title={t('sanatorium.s2.accommodationTotal')} right={<Text variant="body">{fmtMoney(inv.accommodation_total)}</Text>} />
              <ListRow title={t('sanatorium.s2.servicesTotal')} right={<Text variant="body">{fmtMoney(inv.services_total)}</Text>} />
              <ListRow title={t('sanatorium.total')} right={<Text variant="heading" testID="inv-total">{fmtMoney(inv.grand_total)}</Text>} />
              <ListRow title={t('sanatorium.paidAmount')} right={<Text variant="body">{fmtMoney(inv.paid_amount)}</Text>} />
              <ListRow title={t('sanatorium.debt')} right={<Text variant="heading">{fmtMoney(inv.debt)}</Text>} />
              <View style={styles.actions}>
                <DownloadButton testID="inv-pdf" label="PDF" format="pdf" url={SANATORIUM_ORG_INVOICE_FILE(org.id)} params={{ start: from, end: to, format: 'pdf' }} filename={docFileName('org-invoice', org.id, 'pdf')} />
                <DownloadButton testID="inv-docx" label="DOCX" format="docx" url={SANATORIUM_ORG_INVOICE_FILE(org.id)} params={{ start: from, end: to, format: 'docx' }} filename={docFileName('org-invoice', org.id, 'docx')} />
              </View>
            </View>
          )}
        </QueryBlock>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' },
});
