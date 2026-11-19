// In-app capture for the phone check-in photo: FRONT camera only (fixed facing, no flip button,
// no gallery). Flow: live preview with a face-oval guide -> shutter -> preview -> retake / confirm.
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';
import { useThemedStyles } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/palettes';
import { ff } from '@/theme/typography';
import { radii, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { prepareCheckinPhoto, type CapturedPhoto } from '../lib/capture';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCaptured: (photo: CapturedPhoto) => void;
};

/** The body mounts on open and unmounts on close, so the camera and state start fresh each time. */
export function CheckinCameraModal({ visible, onClose, onCaptured }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {visible && <Body onClose={onClose} onCaptured={onCaptured} />}
    </Modal>
  );
}

const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

type Shot = { uri: string; width: number; height: number };

function Body({ onClose, onCaptured }: Omit<Props, 'visible'>) {
  const { t } = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState<Shot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const snap = async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    setError(null);
    try {
      // skipProcessing false: expo-camera rotates the pixels to match the device orientation.
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.6, skipProcessing: false });
      if (!pic?.uri) throw new Error('no picture');
      setShot({ uri: pic.uri, width: pic.width, height: pic.height });
    } catch {
      setError(t('checkin.photoFailed'));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!shot || busy) return;
    setBusy(true);
    setError(null);
    try {
      onCaptured(await prepareCheckinPhoto(shot));
    } catch {
      setError(t('checkin.photoFailed'));
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Text style={styles.title}>{t('checkin.stepPhoto')}</Text>
      <View style={styles.frame}>
        {shot ? (
          <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" testID="checkin-camera-preview" />
        ) : permission?.granted ? (
          <>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="front"
              onCameraReady={() => setReady(true)}
            />
            <View pointerEvents="none" style={styles.guideWrap}>
              <View style={styles.guide} />
            </View>
          </>
        ) : (
          <View style={styles.permission}>
            <Text style={styles.permissionText}>{t('checkin.cameraPermission')}</Text>
            <Button
              label={t('checkin.cameraPermissionButton')}
              onPress={() => void requestPermission()}
              variant="white"
              testID="checkin-camera-permission"
            />
          </View>
        )}
        {busy && (
          <View style={styles.overlay}>
            <ActivityIndicator color="white" />
          </View>
        )}
      </View>

      {!shot && permission?.granted && <Text style={styles.hint}>{t('checkin.frontCameraHint')}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        {shot ? (
          <>
            <Button label={t('checkin.confirmPhoto')} icon="check" onPress={() => void confirm()} disabled={busy} testID="checkin-camera-confirm" />
            <Button label={t('checkin.retakePhoto')} variant="soft" icon="refresh" onPress={() => setShot(null)} disabled={busy} testID="checkin-camera-retake" />
          </>
        ) : (
          permission?.granted && (
            <Button label={t('checkin.shutter')} icon="camera" onPress={() => void snap()} disabled={!ready || busy} testID="checkin-camera-shutter" />
          )
        )}
        <Button label={t('checkin.closeCamera')} variant="ghost" onPress={onClose} disabled={busy} testID="checkin-camera-close" />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg, paddingHorizontal: space[4] },
    title: { marginTop: space[3], marginBottom: space[3], fontSize: 20, color: c.fg, textAlign: 'center', ...ff('800', 'display') },
    frame: {
      width: '100%',
      aspectRatio: 3 / 4,
      maxHeight: '66%',
      alignSelf: 'center',
      borderRadius: radii.xl,
      overflow: 'hidden',
      backgroundColor: 'black',
    },
    guideWrap: { ...FILL, alignItems: 'center', justifyContent: 'center' },
    guide: { width: '62%', height: '70%', borderRadius: 999, borderWidth: 3, borderColor: 'rgba(255,255,255,0.75)' },
    overlay: { ...FILL, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[5], gap: space[4] },
    permissionText: { color: 'white', fontSize: 15, textAlign: 'center', ...ff('500', 'text') },
    hint: { marginTop: space[3], color: c.fgMuted, fontSize: 14, textAlign: 'center', ...ff('500', 'text') },
    error: { marginTop: space[3], color: c.danger, fontSize: 14, textAlign: 'center', ...ff('600', 'text') },
    actions: { marginTop: 'auto', gap: space[2], paddingBottom: space[2] },
  });
