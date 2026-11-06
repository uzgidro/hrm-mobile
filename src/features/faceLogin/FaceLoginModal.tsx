// Face login camera sheet: front camera, a burst of frames during every
// server-chosen pose, then one verify call with the whole clip. See ./api.ts for the protocol.
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTranslation } from "react-i18next";
import { useTheme, useThemedStyles } from "@/theme/ThemeProvider";
import type { ThemeColors } from "@/theme/palettes";
import { ff } from "@/theme/typography";
import { radii, space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import type { User } from "@/types";
import {
  faceErrorKey,
  startFaceChallenge,
  verifyFace,
  type FaceFlash,
  type FaceFrame,
  type FaceStep,
  type FaceTokens,
} from "./api";

/** Seconds shown before filming starts, so the person can settle in front of the camera. */
const LEAD_IN_SECONDS = 2;
/** A step that collected too few frames is extended by at most this long, ms. */
const MAX_STEP_EXTENSION_MS = 1500;
/** The server needs at least this many frames per step. */
const MIN_FRAMES_PER_STEP = 4;
/** Server rule: frames must be at least this far apart, ms. */
const MIN_FRAME_GAP_MS = 100;
/** Server limit for one base64 image. */
const MAX_IMAGE_CHARS = 700_000;
/** Give up when the camera keeps failing to produce pictures. */
const MAX_CAPTURE_FAILURES = 6;
/** Smaller pictures capture faster on slow Android phones; the face still needs this width. */
const MIN_PICTURE_WIDTH = 480;

/** Smallest available picture size ("WxH") whose width is at least MIN_PICTURE_WIDTH. */
export function pickPictureSize(sizes: string[]): string | undefined {
  const parsed = sizes
    .map((s) => {
      const m = /^(\d+)\s*x\s*(\d+)$/i.exec(s.trim());
      return m ? { s, w: Number(m[1]), h: Number(m[2]) } : null;
    })
    .filter((x): x is { s: string; w: number; h: number } => x !== null && x.w >= MIN_PICTURE_WIDTH);
  parsed.sort((x, y) => x.w * x.h - y.w * y.h);
  return parsed[0]?.s;
}

const STEP_KEY: Record<FaceStep, string> = {
  front: "auth.faceStepFront",
  left: "auth.faceStepLeft",
  right: "auth.faceStepRight",
};
// The preview is mirrored like a selfie, so the person's left is the screen left.
const STEP_ARROW: Record<FaceStep, string> = {
  front: "",
  left: "←  ",
  right: "",
};
const STEP_ARROW_AFTER: Record<FaceStep, string> = {
  front: "",
  left: "",
  right: "  →",
};

const FLASH_HEX = { red: "#FF0000", green: "#00FF00", blue: "#0000FF" } as const;

/** Colour of the flash slot active `elapsed` ms after t0, or null outside every slot. */
export function flashColorAt(flash: FaceFlash, elapsed: number): string | null {
  if (elapsed < flash.start_ms) return null;
  const k = Math.floor((elapsed - flash.start_ms) / flash.slot_ms);
  const c = flash.colors[k];
  return c ? FLASH_HEX[c] ?? null : null;
}

type Phase = "ready" | "step" | "verifying" | "error";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (tokens: FaceTokens, user: User) => Promise<void> | void;
};

/** The body mounts on open and unmounts on close: camera and state start fresh each time. */
export function FaceLoginModal({ visible, onClose, onSuccess }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={busy ? () => undefined : onClose}
    >
      {visible && (
        <FaceLoginBody
          onClose={onClose}
          onSuccess={onSuccess}
          onBusy={setBusy}
        />
      )}
    </Modal>
  );
}

function FaceLoginBody({
  onClose,
  onSuccess,
  onBusy,
}: Omit<Props, "visible"> & { onBusy: (busy: boolean) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const aliveRef = useRef(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [pictureSize, setPictureSize] = useState<string | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>("ready");
  const [step, setStep] = useState<FaceStep | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopFlash = useCallback(() => {
    if (flashTimerRef.current) clearInterval(flashTimerRef.current);
    flashTimerRef.current = null;
    setFlashColor(null);
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (flashTimerRef.current) clearInterval(flashTimerRef.current);
    };
  }, []);

  // Pick a small picture size once the camera is up; silently keep the default on any failure.
  const onCameraReady = useCallback(() => {
    setCameraReady(true);
    const cam = cameraRef.current;
    if (!cam?.getAvailablePictureSizesAsync) return;
    cam
      .getAvailablePictureSizesAsync()
      .then((sizes) => {
        const best = pickPictureSize(sizes);
        if (best && aliveRef.current) setPictureSize(best);
      })
      .catch(() => undefined);
  }, []);

  const run = useCallback(async () => {
    setError(null);
    try {
      const ch = await startFaceChallenge();
      const frames: FaceFrame[] = [];
      const interval = Math.max(ch.frame_interval_ms, MIN_FRAME_GAP_MS);
      const flash = ch.flash;
      const flashInterval = flash ? Math.max(flash.frame_interval_ms, MIN_FRAME_GAP_MS) : interval;
      // Cumulative step boundaries (ms from t0); falls back to equal `step_ms` steps.
      const ends: number[] = [];
      let acc = 0;
      for (let k = 0; k < ch.steps.length; k++) {
        acc += ch.step_durations_ms?.[k] ?? ch.step_ms;
        ends.push(acc);
      }
      let quality = 0.4;
      let failures = 0;

      // Lead-in countdown on the first pose; nothing is filmed yet.
      setStep(ch.steps[0] ?? null);
      setPhase("step");
      for (let sec = LEAD_IN_SECONDS; sec > 0; sec--) {
        if (!aliveRef.current) return;
        setCountdown(sec);
        await sleep(1000);
      }

      const t0 = Date.now();
      let lastT = -MIN_FRAME_GAP_MS;
      let lastShot = 0;
      // The flash colour follows the wall clock on its own fast timer, independent of capture speed.
      if (flash) {
        let shown: string | null = null;
        flashTimerRef.current = setInterval(() => {
          const c = flashColorAt(flash, Date.now() - t0);
          if (c !== shown) {
            shown = c;
            setFlashColor(c);
          }
        }, 16);
      }
      for (let idx = 0; idx < ch.steps.length; idx++) {
        const s = ch.steps[idx];
        if (!aliveRef.current) return;
        setStep(s);
        const stepEnd = t0 + ends[idx];
        const stepInterval = flash && idx === flash.step ? flashInterval : interval;
        let count = 0;
        // Shoot back-to-back for the whole step; if frames are scarce, extend a little.
        for (;;) {
          const now = Date.now();
          const extended = count < MIN_FRAMES_PER_STEP && now < stepEnd + MAX_STEP_EXTENSION_MS;
          if (now >= stepEnd && !extended) break;
          if (frames.length >= ch.max_frames) break;
          if (!aliveRef.current) return;
          setCountdown(Math.max(1, Math.ceil((stepEnd - now) / 1000)));
          const wait = lastShot + stepInterval - now;
          if (wait > 0) await sleep(wait);
          lastShot = Date.now();
          let pic;
          try {
            pic = await cameraRef.current?.takePictureAsync({
              quality,
              base64: true,
              skipProcessing: true,
              shutterSound: false,
            });
          } catch {
            pic = undefined;
          }
          if (!pic?.base64) {
            if (++failures >= MAX_CAPTURE_FAILURES) throw new Error("capture");
            continue;
          }
          if (pic.base64.length > MAX_IMAGE_CHARS) {
            // Too big for the server: drop this frame and shoot smaller from now on.
            quality = Math.max(0.15, quality * 0.7);
            continue;
          }
          const tMs = Math.round(Date.now() - t0);
          if (tMs - lastT < MIN_FRAME_GAP_MS) continue;
          lastT = tMs;
          frames.push({ i: idx, t: tMs, image: pic.base64 });
          count++;
        }
      }
      stopFlash();
      if (!aliveRef.current) return;
      setStep(null);
      setPhase("verifying");
      const { tokens, user } = await verifyFace(ch.challenge_id, frames, false);
      await onSuccess(tokens, user);
    } catch (e) {
      stopFlash();
      if (!aliveRef.current) return;
      setStep(null);
      setPhase("error");
      setError(t(faceErrorKey(e) as never));
    }
  }, [onSuccess, stopFlash, t]);

  const busy = phase === "step" || phase === "verifying";
  useEffect(() => onBusy(busy), [busy, onBusy]);

  return (
    <>
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <Text style={styles.title}>{t("auth.faceButton")}</Text>

      <View style={styles.frame}>
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="front"
            pictureSize={pictureSize}
            onCameraReady={onCameraReady}
          />
        ) : (
          <View style={styles.permission}>
            <Text style={styles.permissionText}>
              {t("auth.facePermission")}
            </Text>
            <Button
              label={t("auth.facePermissionButton")}
              onPress={() => void requestPermission()}
              variant="white"
              testID="face-permission"
            />
          </View>
        )}
        {permission?.granted && (
          <View pointerEvents="none" style={styles.guideWrap}>
            <View
              style={[
                styles.guide,
                phase === "step" && { borderColor: colors.brand },
              ]}
            />
          </View>
        )}
        {phase === "step" && step && (
          <View style={styles.prompt}>
            <Text style={styles.promptText}>
              {STEP_ARROW[step]}
              {t(STEP_KEY[step] as never)}
              {STEP_ARROW_AFTER[step]}
              {`  ·  ${countdown}`}
            </Text>
          </View>
        )}
        {phase === "verifying" && (
          <View style={styles.overlay}>
            <ActivityIndicator color="white" />
            <Text style={styles.overlayText}>{t("auth.faceVerifying")}</Text>
          </View>
        )}
      </View>

      {phase === "ready" && (
        <Text style={styles.hint}>{t("auth.faceIntro")}</Text>
      )}
      {phase === "ready" && (
        <Text style={styles.hint}>{t("auth.faceBrightnessHint")}</Text>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        {(phase === "ready" || phase === "error") && permission?.granted && (
          <Button
            label={
              phase === "ready" ? t("auth.faceStart") : t("auth.faceRetry")
            }
            onPress={() => void run()}
            disabled={!cameraReady}
            icon={phase === "error" ? "refresh" : "camera"}
            size="lg"
            full
            testID="face-start"
          />
        )}
        <Button
          label={t("auth.faceClose")}
          onPress={onClose}
          disabled={busy}
          variant="ghost"
          size="lg"
          full
          testID="face-close"
        />
        <Text style={styles.privacy}>{t("auth.facePrivacy")}</Text>
      </View>
    </SafeAreaView>
    {flashColor && (
      <View pointerEvents="none" style={[FILL, styles.flash, { backgroundColor: flashColor }]}>
        <Text style={styles.flashText}>{t("auth.faceFlashPrompt")}</Text>
      </View>
    )}
    </>
  );
}

const FILL = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
} as const;

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg, paddingHorizontal: space[4] },
    title: {
      marginTop: space[3],
      marginBottom: space[3],
      fontSize: 20,
      color: c.fg,
      textAlign: "center",
      ...ff("800", "display"),
    },
    frame: {
      width: "100%",
      aspectRatio: 3 / 4,
      maxHeight: "62%",
      alignSelf: "center",
      borderRadius: radii.xl,
      overflow: "hidden",
      backgroundColor: "black",
    },
    guideWrap: { ...FILL, alignItems: "center", justifyContent: "center" },
    guide: {
      width: "62%",
      height: "70%",
      borderRadius: 999,
      borderWidth: 3,
      borderColor: "rgba(255,255,255,0.75)",
    },
    prompt: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingVertical: space[3],
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    promptText: {
      color: "white",
      fontSize: 17,
      textAlign: "center",
      ...ff("700", "text"),
    },
    flash: { alignItems: "center", justifyContent: "center", zIndex: 100, elevation: 100 },
    flashText: {
      color: "white",
      fontSize: 22,
      textAlign: "center",
      textShadowColor: "rgba(0,0,0,0.6)",
      textShadowRadius: 4,
      ...ff("800", "display"),
    },
    overlay: {
      ...FILL,
      backgroundColor: "rgba(0,0,0,0.4)",
      alignItems: "center",
      justifyContent: "center",
      gap: space[2],
    },
    overlayText: { color: "white", fontSize: 15, ...ff("600", "text") },
    permission: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: space[5],
      gap: space[4],
    },
    permissionText: {
      color: "white",
      fontSize: 15,
      textAlign: "center",
      ...ff("500", "text"),
    },
    hint: {
      marginTop: space[3],
      color: c.fgMuted,
      fontSize: 14,
      textAlign: "center",
      ...ff("500", "text"),
    },
    error: {
      marginTop: space[3],
      color: c.danger,
      fontSize: 14,
      textAlign: "center",
      ...ff("600", "text"),
    },
    actions: { marginTop: "auto", gap: space[2], paddingBottom: space[2] },
    privacy: {
      color: c.fgSubtle,
      fontSize: 12,
      textAlign: "center",
      ...ff("400", "text"),
    },
  });
