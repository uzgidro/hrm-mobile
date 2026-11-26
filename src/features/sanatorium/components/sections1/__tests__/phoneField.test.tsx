import React, { useState } from 'react';
import { fireEvent, renderWithProviders } from '@/test/renderWithProviders';
import { sanErrorMessage } from '../../../utils/sanatorium';
import { PhoneField } from '../shared';

function Host() {
  const [v, setV] = useState('');
  return <PhoneField label="Telefon" value={v} onChange={setV} testID="ph" />;
}

describe('PhoneField', () => {
  it('a number typed digit by digit stays what was typed', async () => {
    const { getByTestId } = await renderWithProviders(<Host />);
    const shown = () => getByTestId('ph').props.value as string;
    expect(shown()).toBe('+998');
    for (const d of '901112233') await fireEvent.changeText(getByTestId('ph'), shown() + d);
    expect(shown()).toBe('+998901112233');
    for (let i = 0; i < 9; i += 1) await fireEvent.changeText(getByTestId('ph'), shown().slice(0, -1));
    expect(shown()).toBe('+998');
  });
});

describe('sanErrorMessage', () => {
  it('names the fields of a validation error in words, never the English sentence of the server', () => {
    const text = sanErrorMessage({ response: { status: 422, data: { detail: [{ loc: ['body', 'members', 0, 'full_name'], msg: 'String should have' }, { loc: ['body', 'phone'], msg: 'x' }] } } });
    expect(text).toContain('F.I.Sh.');
    expect(text).toContain('telefon');
    expect(sanErrorMessage({ response: { status: 422, data: { detail: [{ loc: ['body', 'zzz'], msg: 'bad' }] } } })).not.toContain('bad');
  });
  it('no answer = the connection', () => {
    expect(sanErrorMessage({ isAxiosError: true, code: 'ERR_NETWORK', message: 'Network Error' })).toContain('internet'.slice(1));
  });
});
