// Drop-in replacement for react-native's <Modal> used by every sheet / dialog.
// A native Modal lives in its own window ABOVE the app tree, so an open sheet
// would stay drawn (and tappable) over the PIN gate after the app locks. While
// the lock is up this wrapper forces `visible` to false and, once, calls
// `onRequestClose` so the owner clears its own open state (the sheet must not
// pop back up after unlock with a half-finished action).
import React, { useEffect } from 'react';
import { Modal, type ModalProps } from 'react-native';
import { useIsLocked } from '@/store/useIsLocked';

export function LockAwareModal({ visible, onRequestClose, ...rest }: ModalProps) {
  const locked = useIsLocked();
  useEffect(() => {
    if (locked && visible) onRequestClose?.({} as never);
    // Only the lock edge / visibility matter; onRequestClose is often an inline closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, visible]);
  return <Modal {...rest} visible={!!visible && !locked} onRequestClose={onRequestClose} />;
}
