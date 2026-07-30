import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radius, spacing, typography, shadow } from '../theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Optional accent stripe colour, used to tint each service. */
  accent?: string;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  onBack,
  accent,
}) => (
  <View style={styles.wrapper}>
    <View style={styles.row}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}

      <View style={styles.titleBlock}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.spacer} />
    </View>

    {accent ? <View style={[styles.accent, { backgroundColor: accent }]} /> : null}
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
    ...shadow(2),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: colors.onPrimary,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  spacer: { width: 38 },
  titleBlock: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.sm },
  title: {
    ...typography.heading,
    color: colors.onPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.micro,
    color: colors.onPrimaryMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  accent: { height: 3, width: '100%' },
});
