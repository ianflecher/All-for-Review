import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Easing } from 'react-native';
import { colors, radius, spacing, typography, shadow } from '../theme';

export interface LoadingStep {
  label: string;
  /** Marks steps that need internet, so the copy can say so. */
  online?: boolean;
}

interface LoadingOverlayProps {
  visible: boolean;
  title: string;
  /** Ordered steps; `activeStep` indexes into this list. */
  steps: LoadingStep[];
  activeStep: number;
  /** Shown under the steps — e.g. the URL being fetched. */
  detail?: string;
}

/**
 * Full-screen progress UI. Online flows (fetching a web page) can take several
 * seconds with no local feedback, so the steps make it clear that work is
 * happening and which stage it has reached.
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  title,
  steps,
  activeStep,
  detail,
}) => {
  const spin = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        // The web driver has no native animation module; keep it on JS there.
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [visible, spin]);

  useEffect(() => {
    const target = steps.length <= 1 ? 1 : activeStep / (steps.length - 1);
    Animated.timing(progress, {
      toValue: target,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [activeStep, steps.length, progress]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['8%', '100%'] });

  const needsInternet = steps[activeStep]?.online ?? false;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />

          <Text style={styles.title}>{title}</Text>

          <View style={styles.track}>
            <Animated.View style={[styles.fill, { width }]} />
          </View>

          <View style={styles.steps}>
            {steps.map((step, index) => {
              const done = index < activeStep;
              const active = index === activeStep;
              return (
                <View key={step.label} style={styles.stepRow}>
                  <View
                    style={[
                      styles.bullet,
                      done && styles.bulletDone,
                      active && styles.bulletActive,
                    ]}
                  >
                    {done ? <Text style={styles.tick}>✓</Text> : null}
                  </View>
                  <Text
                    style={[
                      styles.stepText,
                      (done || active) && styles.stepTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {detail ? (
            <Text style={styles.detail} numberOfLines={2}>
              {detail}
            </Text>
          ) : null}

          <Text style={styles.footnote}>
            {needsInternet
              ? 'Downloading from the web — this needs an internet connection.'
              : 'Running entirely on your device — no internet needed.'}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(31, 36, 55, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    ...shadow(3),
  },
  spinner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: colors.primarySoftBorder,
    borderTopColor: colors.primary,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.subheading,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  track: {
    width: '100%',
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
  steps: { width: '100%', gap: spacing.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletActive: { borderColor: colors.primary },
  bulletDone: { borderColor: colors.primary, backgroundColor: colors.primary },
  tick: { color: colors.onPrimary, fontSize: 10, fontWeight: '800', lineHeight: 14 },
  stepText: { ...typography.caption, color: colors.textMuted, flex: 1 },
  stepTextActive: { color: colors.textPrimary, fontWeight: '600' },
  detail: {
    ...typography.micro,
    color: colors.textMuted,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  footnote: {
    ...typography.micro,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
    fontWeight: '400',
  },
});
