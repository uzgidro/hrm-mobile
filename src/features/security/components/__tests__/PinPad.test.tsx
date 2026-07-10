import React from 'react';
import { renderWithProviders, fireEvent } from '@/test/renderWithProviders';
import { PinPad } from '../PinPad';

const baseProps = {
  value: '',
  onChange: jest.fn(),
  title: 'PIN kodni kiriting',
};

describe('PinPad', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, subtitle and maxLength dots', async () => {
    const { getByText, getByTestId, queryByTestId } = await renderWithProviders(
      <PinPad {...baseProps} subtitle="Yordamchi matn" maxLength={6} />
    );

    expect(getByText('PIN kodni kiriting')).toBeTruthy();
    expect(getByText('Yordamchi matn')).toBeTruthy();
    for (let i = 0; i < 6; i++) {
      expect(getByTestId(`pin-dot-${i}`)).toBeTruthy();
    }
    expect(queryByTestId('pin-dot-6')).toBeNull();
  });

  it('defaults to 4 dots when maxLength is omitted', async () => {
    const { getByTestId, queryByTestId } = await renderWithProviders(<PinPad {...baseProps} />);
    expect(getByTestId('pin-dot-3')).toBeTruthy();
    expect(queryByTestId('pin-dot-4')).toBeNull();
  });

  it('pressing a digit calls onChange with value + digit', async () => {
    const onChange = jest.fn();
    const { getByTestId } = await renderWithProviders(
      <PinPad {...baseProps} value="12" onChange={onChange} />
    );

    fireEvent.press(getByTestId('pin-key-5'));
    expect(onChange).toHaveBeenCalledWith('125');
  });

  it('does not call onChange when value is already full (respects maxLength)', async () => {
    const onChange = jest.fn();
    const { getByTestId } = await renderWithProviders(
      <PinPad {...baseProps} value="1234" onChange={onChange} maxLength={4} />
    );

    fireEvent.press(getByTestId('pin-key-9'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('backspace calls onChange with value minus last char', async () => {
    const onChange = jest.fn();
    const { getByTestId } = await renderWithProviders(
      <PinPad {...baseProps} value="123" onChange={onChange} />
    );

    fireEvent.press(getByTestId('pin-key-backspace'));
    expect(onChange).toHaveBeenCalledWith('12');
  });

  it('shows the biometric key only when onBiometric is provided and presses it', async () => {
    const onBiometric = jest.fn();
    const { getByTestId } = await renderWithProviders(
      <PinPad {...baseProps} onBiometric={onBiometric} />
    );

    fireEvent.press(getByTestId('pin-key-biometric'));
    expect(onBiometric).toHaveBeenCalledTimes(1);
  });

  it('does not render the biometric key when onBiometric is absent', async () => {
    const { queryByTestId } = await renderWithProviders(<PinPad {...baseProps} />);
    expect(queryByTestId('pin-key-biometric')).toBeNull();
  });

  it('ignores digit presses while disabled', async () => {
    const onChange = jest.fn();
    const { getByTestId } = await renderWithProviders(
      <PinPad {...baseProps} value="1" onChange={onChange} disabled />
    );

    fireEvent.press(getByTestId('pin-key-7'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders the error string in the pin-error node', async () => {
    const { getByTestId } = await renderWithProviders(
      <PinPad {...baseProps} error="Noto'g'ri PIN" />
    );

    expect(getByTestId('pin-error')).toHaveTextContent("Noto'g'ri PIN");
  });
});
