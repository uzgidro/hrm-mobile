// Face login camera sheet: front camera, one frame per server-chosen pose,
// then one verify call. See ./api.ts for the protocol.
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
  type FaceStep,
  type FaceTokens,
} from "./api";

/**
 * Seconds to settle into each pose before the frame is taken, shown as a
 * countdown. 1.7 s without one was too fast in the first test (2026-11-06).
 */
const STEP_SECONDS = 3;

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
  const [phase, setPhase] = useState<Phase>("ready");
  const [step, setStep] = useState<FaceStep | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    setError(null);
    try {
      const ch = await startFaceChallenge();
      const frames: { step: FaceStep; image: string }[] = [];
      for (const s of ch.steps) {
        if (!aliveRef.current) return;
        setStep(s);
        setPhase("step");
        for (let sec = STEP_SECONDS; sec > 0; sec--) {
          if (!aliveRef.current) return;
          setCountdown(sec);
          await sleep(1000);
        }
        const pic = await cameraRef.current?.takePictureAsync({
          quality: 0.5,
          base64: true,
          shutterSound: false,
        });
        if (!pic?.base64) throw new Error("capture");
        frames.push({ step: s, image: pic.base64 });
      }
      if (!aliveRef.current) return;
      setStep(null);
      setPhase("verifying");
      const { tokens, user } = await verifyFace(ch.challenge_id, frames, false);
      await onSuccess(tokens, user);
    } catch (e) {
      if (!aliveRef.current) return;
      setStep(null);
      setPhase("error");
      setError(t(faceErrorKey(e) as never));
    }
  }, [onSuccess, t]);

  const busy = phase === "step" || phase === "verifying";
  useEffect(() => onBusy(busy), [busy, onBusy]);

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <Text style={styles.title}>{t("auth.faceButton")}</Text>

      <View style={styles.frame}>
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="front"
            onCameraReady={() => setCameraReady(true)}
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
