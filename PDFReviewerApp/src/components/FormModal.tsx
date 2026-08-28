import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, radius, spacing, typography, shadow } from '../theme';

/**
 * The add/edit sheet shared by the planner, wallet, schedule and organizer.
 *
 * Slides up from the bottom so the fields sit near the keyboard, and caps its
 * own height so a long form scrolls instead of running off the screen.
 */

interface FormModalProps {
  visible: boolean;
  title: string;
  submitLabel?: string;
  /** Disables the confirm button while the form is incomplete. */
  submitDisabled?: boolean;
  onSubmit: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

export const FormModal: React.FC<FormModalProps> = ({
  visible,
  title,
  submitLabel = 'Save',
  submitDisabled = false,
  onSubmit,
  onClose,
  children,
}) => (
  <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submit, submitDisabled && styles.submitDisabled]}
              onPress={onSubmit}
              disabled={submitDisabled}
            >
              <Text style={styles.submitText}>{submitLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  /** Shown in red under the input when the value is unusable. */
  error?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  autoCapitalize = 'sentences',
  error,
}) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.inputMultiline, !!error && styles.inputError]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType={keyboardType}
      multiline={multiline}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
    />
    {error ? <Text style={styles.fieldError}>{error}</Text> : null}
  </View>
);

interface ChipRowProps {
  label?: string;
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
}

/** Horizontal picker used for categories, subjects and weekdays. */
export const ChipRow: React.FC<ChipRowProps> = ({ label, options, selected, onSelect }) => (
  <View style={styles.field}>
    {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
    <View style={styles.chipWrap}>
      {options.map((option) => {
        const active = option === selected;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(option)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(31, 36, 55, 0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    maxHeight: '88%',
    ...shadow(3),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...typography.heading, color: colors.textPrimary },
  close: { fontSize: 19, color: colors.textMuted, fontWeight: '700' },

  body: { flexGrow: 0 },
  bodyContent: { padding: spacing.xl, paddingBottom: spacing.md },

  field: { marginBottom: spacing.lg },
  fieldLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  inputMultiline: { minHeight: 84, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  fieldError: { ...typography.micro, color: colors.danger, marginTop: spacing.xs, fontWeight: '500' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.micro, color: colors.textSecondary },
  chipTextActive: { color: colors.onPrimary },

  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: { flex: 1, paddingVertical: spacing.lg, borderRadius: radius.md, alignItems: 'center' },
  cancel: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  cancelText: { ...typography.bodyStrong, color: colors.textSecondary },
  submit: { backgroundColor: colors.primary, ...shadow(1) },
  submitDisabled: { backgroundColor: colors.disabled },
  submitText: { ...typography.bodyStrong, color: colors.onPrimary },
});
