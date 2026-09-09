import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, radius, spacing, typography } from '../theme';
import { formatDateLabel, parseISODate, toISODate, todayISO, addDays } from '../utils/datetime';

interface DateFieldProps {
  label: string;
  /** ISO "YYYY-MM-DD". */
  value: string;
  onChange: (iso: string) => void;
}

const QUICK_PICKS = [
  { label: 'Today', offset: 0 },
  { label: 'Tomorrow', offset: 1 },
  { label: 'In 3 days', offset: 3 },
  { label: 'Next week', offset: 7 },
];

/**
 * A tappable date, backed by the platform calendar.
 *
 * Typing "2026-09-15" on a phone keyboard is slow and easy to get wrong, and a
 * mistyped date silently files an assignment under the wrong day. The quick
 * picks stay because most deadlines are within the week and one tap beats
 * navigating a calendar.
 */
export const DateField: React.FC<DateFieldProps> = ({ label, value, onChange }) => {
  const [picking, setPicking] = useState(false);
  const parsed = parseISODate(value) ?? new Date();

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <TouchableOpacity
        style={styles.input}
        onPress={() => setPicking(true)}
        activeOpacity={0.7}
        accessibilityLabel={`${label}: ${formatDateLabel(value)}`}
      >
        <Text style={styles.inputText}>{formatDateLabel(value)}</Text>
        <Text style={styles.inputIcon}>📅</Text>
      </TouchableOpacity>

      <View style={styles.quickRow}>
        {QUICK_PICKS.map((pick) => {
          const iso = addDays(todayISO(), pick.offset);
          const active = iso === value;
          return (
            <TouchableOpacity
              key={pick.label}
              style={[styles.quickChip, active && styles.quickChipActive]}
              onPress={() => onChange(iso)}
              activeOpacity={0.7}
            >
              <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>
                {pick.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {picking && (
        <DateTimePicker
          value={parsed}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, selected) => {
            // Android fires once and dismisses itself; iOS keeps the inline
            // picker open until it is closed explicitly.
            if (Platform.OS === 'android') setPicking(false);
            if (event.type === 'dismissed') return;
            if (selected) onChange(toISODate(selected));
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  field: { marginBottom: spacing.lg },
  fieldLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  inputText: { ...typography.body, color: colors.textPrimary },
  inputIcon: { fontSize: 15 },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  quickChip: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  quickChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  quickChipText: { ...typography.micro, color: colors.primary },
  quickChipTextActive: { color: colors.onPrimary },
});
