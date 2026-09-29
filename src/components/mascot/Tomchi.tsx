// Tomchi — UGE HRM maskoti (kaskali suv tomchisi). Statik manba:
// assets/mascot/tomchi.svg. Bu komponent o'sha rasmni react-native-svg bilan
// chizadi va `mood` o'zgarganda qismlarni (qorachiq, qovoq, qo'llar, og'iz,
// tana) reanimated orqali silliq yangi holatga o'tkazadi. Holatlar mantig'i
// sof funksiyada: ./tomchiPose.ts (testlangan).
import React, { useEffect, useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { canBlink, EYE_LEFT, EYE_RIGHT, LOADING_CYCLE_MS, tomchiPose, type TomchiMood } from './tomchiPose';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

const BODY = '#1CB0F6';
const BODY_SHADE = '#0E8FD6';
const GLOVE = '#FFD23F';
const GLOVE_LINE = '#E0A400';
const INK = '#1F2A30';
const UGE_BLUE = '#0283DE';

// Qovoq to'rtburchagi ko'z ellipsining yuqorisidan pastga "tushadi".
const EYE_RX = 8.5;
const EYE_RY = 9.5;
const LID_TOP = EYE_LEFT.y - EYE_RY;
const LID_FULL = EYE_RY * 2;

// Qo'lqop ustidagi uchta barmoq chizig'i (qo'l markaziga nisbatan)
function fingers(x: number, y: number): string {
  'worklet';
  return `M${x - 4} ${y - 5.5} v3.5 M${x} ${y - 6.5} v4 M${x + 4} ${y - 5.5} v3.5`;
}

const SPRING = { damping: 18, stiffness: 220, mass: 0.8 };
const LID_MS = 140;

export type TomchiProps = {
  mood?: TomchiMood;
  /** 'watching' / 'peek' da kursorning nisbiy o'rni: 0 (chap) … 1 (o'ng) */
  lookX?: number;
  /** Kenglik (px); balandlik proporsional */
  size?: number;
};

export function Tomchi({ mood = 'idle', lookX = 0.5, size = 120 }: TomchiProps) {
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const pose = tomchiPose(mood, lookX);

  const pdx = useSharedValue(pose.pupilDX);
  const pdy = useSharedValue(pose.pupilDY);
  const lidL = useSharedValue(pose.lidLeft);
  const lidR = useSharedValue(pose.lidRight);
  const blink = useSharedValue(0);
  const hlx = useSharedValue(pose.handLeft.x);
  const hly = useSharedValue(pose.handLeft.y);
  const hrx = useSharedValue(pose.handRight.x);
  const hry = useSharedValue(pose.handRight.y);
  const m0 = useSharedValue(pose.mouth[0]);
  const m1 = useSharedValue(pose.mouth[1]);
  const m2 = useSharedValue(pose.mouth[2]);
  const m3 = useSharedValue(pose.mouth[3]);
  const m4 = useSharedValue(pose.mouth[4]);
  const m5 = useSharedValue(pose.mouth[5]);
  const bodyY = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const ripple = useSharedValue(0); // 0..1 — suv halqasining tarqalishi (faqat 'loading')

  // Holat o'zgarganda barcha qismlarni yangi pozaga o'tkazish
  useEffect(() => {
    const move = (v: typeof pdx, to: number) => {
      v.value = reduceMotion ? to : withSpring(to, SPRING);
    };
    const fade = (v: typeof pdx, to: number) => {
      v.value = reduceMotion ? to : withTiming(to, { duration: LID_MS, easing: Easing.out(Easing.quad) });
    };
    move(pdx, pose.pupilDX);
    move(pdy, pose.pupilDY);
    fade(lidL, pose.lidLeft);
    fade(lidR, pose.lidRight);
    move(hlx, pose.handLeft.x);
    move(hly, pose.handLeft.y);
    move(hrx, pose.handRight.x);
    move(hry, pose.handRight.y);
    [m0, m1, m2, m3, m4, m5].forEach((v, i) => fade(v, pose.mouth[i]));

    ripple.value = 0;
    if (reduceMotion) {
      bodyY.value = 0;
      return;
    }
    if (mood === 'loading') {
      const half = LOADING_CYCLE_MS / 2;
      const sine = Easing.inOut(Easing.sin);
      // suv ustida sekin tebranish
      bodyY.value = withRepeat(
        withSequence(withTiming(-4, { duration: half, easing: sine }), withTiming(0, { duration: half, easing: sine })),
        -1,
      );
      // atrofga qarash: chap → o'ng → markaz (jami bitta sikl)
      pdx.value = withRepeat(
        withSequence(
          withDelay(300, withTiming(-3, { duration: 300, easing: sine })),
          withDelay(600, withTiming(3, { duration: 450, easing: sine })),
          withDelay(450, withTiming(0, { duration: 300, easing: sine })),
        ),
        -1,
      );
      // ostidan tarqaladigan suv halqasi
      ripple.value = withRepeat(withTiming(1, { duration: LOADING_CYCLE_MS, easing: Easing.out(Easing.quad) }), -1, false);
      return;
    }
    if (mood !== 'happy') bodyY.value = withTiming(0, { duration: 200 });
    if (mood === 'happy') {
      // ikki marta sakraydi
      bodyY.value = withSequence(
        withTiming(pose.bodyY, { duration: 160, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 180, easing: Easing.in(Easing.quad) }),
        withTiming(pose.bodyY * 0.6, { duration: 140, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 160, easing: Easing.in(Easing.quad) }),
      );
    } else if (mood === 'sad') {
      // "yo'q" ma'nosida bosh chayqash — qisqa, faqat bir marta
      shakeX.value = withSequence(
        withTiming(-5, { duration: 60 }),
        withTiming(5, { duration: 80 }),
        withTiming(-3, { duration: 70 }),
        withTiming(0, { duration: 60 }),
      );
    }
    // pose butunlay mood + lookX dan hosil bo'ladi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, lookX, reduceMotion]);

  // Tasodifiy oraliqda ko'z pirpiratish (faqat ko'z ochiq holatlarda)
  useEffect(() => {
    if (reduceMotion || !canBlink(mood)) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        blink.value = withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 120 }));
        schedule();
      }, 2600 + Math.random() * 2600);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [mood, reduceMotion, blink]);

  const pupilL = useAnimatedProps(() => ({ cx: EYE_LEFT.x + 1 + pdx.value, cy: EYE_LEFT.y + 1 + pdy.value }));
  const glintL = useAnimatedProps(() => ({ cx: EYE_LEFT.x + 2.4 + pdx.value, cy: EYE_LEFT.y - 0.6 + pdy.value }));
  const pupilR = useAnimatedProps(() => ({ cx: EYE_RIGHT.x + 1 + pdx.value, cy: EYE_RIGHT.y + 1 + pdy.value }));
  const glintR = useAnimatedProps(() => ({ cx: EYE_RIGHT.x + 2.4 + pdx.value, cy: EYE_RIGHT.y - 0.6 + pdy.value }));

  const lidPropsL = useAnimatedProps(() => ({ height: LID_FULL * Math.max(lidL.value, blink.value) }));
  const lidPropsR = useAnimatedProps(() => ({ height: LID_FULL * Math.max(lidR.value, blink.value) }));
  const lashL = useAnimatedProps(() => {
    const k = Math.max(lidL.value, blink.value);
    return { y: LID_TOP + LID_FULL * k - 1, opacity: k > 0.08 ? 1 : 0 };
  });
  const lashR = useAnimatedProps(() => {
    const k = Math.max(lidR.value, blink.value);
    return { y: LID_TOP + LID_FULL * k - 1, opacity: k > 0.08 ? 1 : 0 };
  });

  const handL = useAnimatedProps(() => ({ cx: hlx.value, cy: hly.value }));
  const fingersL = useAnimatedProps(() => ({ d: fingers(hlx.value, hly.value) }));
  const handR = useAnimatedProps(() => ({ cx: hrx.value, cy: hry.value }));
  const fingersR = useAnimatedProps(() => ({ d: fingers(hrx.value, hry.value) }));

  const rippleProps = useAnimatedProps(() => ({
    rx: 22 + 24 * ripple.value,
    ry: 3.5 + 3.5 * ripple.value,
    opacity: ripple.value > 0 ? 0.5 * (1 - ripple.value) : 0,
  }));
  // tana ko'tarilganda yerdagi soya kichrayadi
  const shadowProps = useAnimatedProps(() => ({ rx: 28 + bodyY.value * 0.9 }));

  const mouth = useAnimatedProps(() => ({
    d: `M${m0.value} ${m1.value} Q${m2.value} ${m3.value} ${m4.value} ${m5.value}`,
  }));

  const scale = size / 120;
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bodyY.value * scale }, { translateX: shakeX.value * scale }],
  }));

  const clipL = `tomchiEyeL${uid}`;
  const clipR = `tomchiEyeR${uid}`;

  return (
    <View
      style={{ width: size, height: (size * 130) / 120 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <Svg
        width={size}
        height={(size * 130) / 120}
        viewBox="0 0 120 130"
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        <AnimatedEllipse animatedProps={shadowProps} cx={60} cy={124} ry={4} fill="#0B2A40" opacity={0.12} />
        <AnimatedEllipse animatedProps={rippleProps} cx={60} cy={124} fill="none" stroke={BODY} strokeWidth={1.5} />
      </Svg>
      <Animated.View style={bodyStyle}>
        <Svg width={size} height={(size * 130) / 120} viewBox="0 0 120 130">
          <Defs>
            <ClipPath id={clipL}>
              <Ellipse cx={EYE_LEFT.x} cy={EYE_LEFT.y} rx={EYE_RX} ry={EYE_RY} />
            </ClipPath>
            <ClipPath id={clipR}>
              <Ellipse cx={EYE_RIGHT.x} cy={EYE_RIGHT.y} rx={EYE_RX} ry={EYE_RY} />
            </ClipPath>
          </Defs>

          

          {/* tana */}
          <Path d="M60 27 C60 27 25 56 25 80 A35 35 0 0 0 95 80 C95 56 60 27 60 27 Z" fill={BODY} />
          <Path d="M60 27 C60 27 25 56 25 80 A35 35 0 0 0 60 115 A35 35 0 0 1 40 80 C40 60 60 27 60 27 Z" fill={BODY_SHADE} />
          {/* Gloss: ellipse rx3.5 ry7.5 at (36,66) turned 18°, drawn as arcs so no transform (web turns one into an invalid transform-origin attribute). */}
          <Path d="M38.32 58.87 A3.5 7.5 18 1 1 33.68 73.13 A3.5 7.5 18 1 1 38.32 58.87 Z" fill="#FFFFFF" opacity={0.4} />

          {/* kaska */}
          <G>
            <Path d="M31 53 C31 31 44 20 60 20 C76 20 89 31 89 53 Z" fill="#FFC800" />
            <Path d="M54.5 21.5 C58 20.3 62 20.3 65.5 21.5 L64.5 53 L55.5 53 Z" fill="#F2B700" />
            <Path d="M38 45 C38 34 44 27 52 24.5 C46 30 43 37 42.5 45 Z" fill="#FFFFFF" opacity={0.45} />
            <Path
              d="M22 53.5 C40 49 80 49 98 53.5 C99.5 54.2 99.5 57.6 97.5 58 C80 55.2 40 55.2 22.5 58 C20.5 57.6 20.5 54.2 22 53.5 Z"
              fill="#E5A800"
            />
            {/* UGE nishoni */}
            <Path d="M47.5 35 h2.6 v5.2 a1.7 1.7 0 0 0 3.4 0 v-5.2 h2.6 v5.2 a4.3 4.3 0 0 1 -8.6 0 Z" fill={UGE_BLUE} />
            <Path d="M65 36.6 A4.4 4.4 0 1 0 65 42.4 L62.9 41.1 A2 2 0 1 1 62.9 37.9 Z" fill={UGE_BLUE} />
            <Path d="M66.4 35 h6.1 v2.3 h-6.1 Z M66.4 41.7 h6.1 v2.3 h-6.1 Z" fill={UGE_BLUE} />
            <Path
              d="M60.2 39.7 L70 37.2 L68.5 38.9 L74.2 39.3 L64 42.1 L65.6 40.3 Z"
              fill="#0AC341"
              stroke="#FFFFFF"
              strokeWidth={0.6}
              strokeLinejoin="round"
            />
          </G>

          {/* ko'zlar: oq qism, qorachiq, qovoq (ellips bilan kesilgan) */}
          <G clipPath={`url(#${clipL})`}>
            <Ellipse cx={EYE_LEFT.x} cy={EYE_LEFT.y} rx={EYE_RX} ry={EYE_RY} fill="#FFFFFF" />
            <AnimatedCircle animatedProps={pupilL} r={4.3} fill={INK} />
            <AnimatedCircle animatedProps={glintL} r={1.4} fill="#FFFFFF" />
            <AnimatedRect animatedProps={lidPropsL} x={EYE_LEFT.x - 10} y={LID_TOP} width={20} fill={BODY} />
            <AnimatedRect animatedProps={lashL} x={EYE_LEFT.x - 10} width={20} height={2} fill={INK} />
          </G>
          <G clipPath={`url(#${clipR})`}>
            <Ellipse cx={EYE_RIGHT.x} cy={EYE_RIGHT.y} rx={EYE_RX} ry={EYE_RY} fill="#FFFFFF" />
            <AnimatedCircle animatedProps={pupilR} r={4.3} fill={INK} />
            <AnimatedCircle animatedProps={glintR} r={1.4} fill="#FFFFFF" />
            <AnimatedRect animatedProps={lidPropsR} x={EYE_RIGHT.x - 10} y={LID_TOP} width={20} fill={BODY} />
            <AnimatedRect animatedProps={lashR} x={EYE_RIGHT.x - 10} width={20} height={2} fill={INK} />
          </G>

          {/* yuz */}
          <Ellipse cx={38} cy={89} rx={4.5} ry={2.8} fill="#FF9DB8" opacity={0.9} />
          <Ellipse cx={82} cy={89} rx={4.5} ry={2.8} fill="#FF9DB8" opacity={0.9} />
          <AnimatedPath animatedProps={mouth} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />

          {/* qo'llar: sariq ish qo'lqoplari — eng oldingi qatlam, ko'zni yopa oladi */}
          <AnimatedCircle animatedProps={handL} r={9.5} fill={GLOVE} stroke={GLOVE_LINE} strokeWidth={1} />
          <AnimatedPath animatedProps={fingersL} fill="none" stroke={GLOVE_LINE} strokeWidth={1.3} strokeLinecap="round" />
          <AnimatedCircle animatedProps={handR} r={9.5} fill={GLOVE} stroke={GLOVE_LINE} strokeWidth={1} />
          <AnimatedPath animatedProps={fingersR} fill="none" stroke={GLOVE_LINE} strokeWidth={1.3} strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

export default Tomchi;
