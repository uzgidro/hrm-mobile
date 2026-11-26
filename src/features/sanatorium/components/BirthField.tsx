// Birth date as text: a calendar would need hundreds of taps to reach the year.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormInput } from '@/components/FormInput';
import { formatDdMmYyyy } from '@/lib/dateText';
import { parseDmy } from '../utils/sanatorium';

/** `14.03.1985` typed with automatic dots; the parent hears a real ISO date or ''. */
export function BirthField({ value, onChange, required, label, error, testID }: { value: string; onChange: (iso: string, complete: boolean) => void; required?: boolean; label?: string; error?: string; testID?: string }) {
  const { t } = useTranslation();
  const [text, setText] = useState(() => formatDdMmYyyy(value));
  return (
    <FormInput
      label={label ?? t('sanatorium.birthDate')} required={required} value={text} placeholder="14.03.1985" keyboardType="number-pad" maxLength={10} error={error} testID={testID}
      onChangeText={(raw) => {
        const next = maskDmy(raw, text);
        setText(next);
        // `complete` = empty or a whole date: an unfinished one must not be saved as «no date».
        onChange(parseDmy(next) ?? '', next === '' || parseDmy(next) !== null);
      }}
    />
  );
}

/** Dots appear by themselves while typing and disappear while deleting. */
export function maskDmy(raw: string, before = ''): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  const out = [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('.');
  const deleting = raw.length < before.length;
  return !deleting && (d.length === 2 || d.length === 4) ? `${out}.` : out;
}
