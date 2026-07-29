import React from 'react';
import { renderWithProviders, fireEvent } from '@/test/renderWithProviders';
import { PickerModal, type PickerOption } from '../PickerModal';

const OPTIONS: PickerOption[] = [
  { value: 1, label: 'Alice' },
  { value: 2, label: 'Bob' },
];

describe('PickerModal', () => {
  it('renders options and fires onSelect for single-select', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByText } = await renderWithProviders(
      <PickerModal
        visible
        title="Pick one"
        options={OPTIONS}
        selected={null}
        onClose={onClose}
        onSelect={onSelect}
      />
    );

    expect(getByText('Alice')).toBeTruthy();
    fireEvent.press(getByText('Bob'));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('fires onToggle (not onSelect) and stays open for multi-select', async () => {
    const onSelect = jest.fn();
    const onToggle = jest.fn();
    const { getByText } = await renderWithProviders(
      <PickerModal
        visible
        multiple
        title="Pick many"
        options={OPTIONS}
        selected={[1]}
        onClose={jest.fn()}
        onSelect={onSelect}
        onToggle={onToggle}
      />
    );

    fireEvent.press(getByText('Bob'));
    expect(onToggle).toHaveBeenCalledWith(2);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders nothing when not visible', async () => {
    const { queryByText } = await renderWithProviders(
      <PickerModal
        visible={false}
        title="Pick one"
        options={OPTIONS}
        selected={null}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );
    expect(queryByText('Pick one')).toBeNull();
  });
});
