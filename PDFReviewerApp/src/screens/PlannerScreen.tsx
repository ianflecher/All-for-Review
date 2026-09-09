import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Assignment } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { FormModal, Field, ChipRow } from '../components/FormModal';
import { colors, radius, spacing, typography, card, shadow } from '../theme';
import { showAlert } from '../utils/alert';
import { useAndroidBack } from '../utils/useAndroidBack';
import { loadJson, saveJson, STORAGE_KEYS } from '../utils/storage';
import { ensureRemindersReady, refreshReminders } from '../services/reminders';
import { addDays, daysUntil, formatDateLabel, isValidDate, todayISO } from '../utils/datetime';

interface PlannerScreenProps {
  onBack: () => void;
}

const DEFAULT_SUBJECTS = ['Math', 'Science', 'English', 'Filipino', 'History', 'PE', 'Other'];

type Bucket = { key: string; label: string; items: Assignment[]; tone?: 'danger' | 'warning' };

export const PlannerScreen: React.FC<PlannerScreenProps> = ({ onBack }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(DEFAULT_SUBJECTS[0]);
  const [dueDate, setDueDate] = useState(todayISO());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadJson<Assignment[]>(STORAGE_KEYS.assignments, []).then(setAssignments);
  }, []);

  const persist = useCallback((next: Assignment[]) => {
    setAssignments(next);
    saveJson(STORAGE_KEYS.assignments, next).then(refreshReminders);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
  }, []);

  useAndroidBack(
    useCallback(() => {
      if (formOpen) {
        closeForm();
        return true;
      }
      onBack();
      return true;
    }, [formOpen, closeForm, onBack])
  );

  // Subjects already in use come first, so the picker reflects real workload.
  const subjectOptions = useMemo(() => {
    const used = assignments.map((a) => a.subject).filter(Boolean);
    return Array.from(new Set([...used, ...DEFAULT_SUBJECTS]));
  }, [assignments]);

  const openNew = () => {
    setEditing(null);
    setTitle('');
    setSubject(subjectOptions[0] ?? 'Other');
    setDueDate(todayISO());
    setNotes('');
    setFormOpen(true);
  };

  const openEdit = (item: Assignment) => {
    setEditing(item);
    setTitle(item.title);
    setSubject(item.subject);
    setDueDate(item.dueDate);
    setNotes(item.notes ?? '');
    setFormOpen(true);
  };

  const dateError = isValidDate(dueDate) ? undefined : 'Use the format YYYY-MM-DD, e.g. 2026-09-15';
  const canSave = title.trim().length > 0 && !dateError;

  const submit = () => {
    if (!canSave) return;

    // Asked here rather than on first launch: the request makes sense right
    // after someone sets a deadline they want to be reminded about.
    ensureRemindersReady();

    if (editing) {
      persist(
        assignments.map((a) =>
          a.id === editing.id
            ? { ...a, title: title.trim(), subject, dueDate, notes: notes.trim() || undefined }
            : a
        )
      );
    } else {
      const created: Assignment = {
        id: `${Date.now()}`,
        title: title.trim(),
        subject,
        dueDate,
        notes: notes.trim() || undefined,
        done: false,
        createdAt: new Date().toISOString(),
      };
      persist([created, ...assignments]);
    }
    closeForm();
  };

  const toggleDone = (id: string) => {
    persist(assignments.map((a) => (a.id === id ? { ...a, done: !a.done } : a)));
  };

  const remove = (item: Assignment) => {
    showAlert('Delete assignment', `Remove "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => persist(assignments.filter((a) => a.id !== item.id)),
      },
    ]);
  };

  const buckets = useMemo<Bucket[]>(() => {
    const pending = assignments
      .filter((a) => !a.done)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const overdue: Assignment[] = [];
    const today: Assignment[] = [];
    const soon: Assignment[] = [];
    const later: Assignment[] = [];

    for (const item of pending) {
      const days = daysUntil(item.dueDate);
      if (days === null) later.push(item);
      else if (days < 0) overdue.push(item);
      else if (days === 0) today.push(item);
      else if (days <= 7) soon.push(item);
      else later.push(item);
    }

    return [
      { key: 'overdue', label: 'Overdue', items: overdue, tone: 'danger' },
      { key: 'today', label: 'Due today', items: today, tone: 'warning' },
      { key: 'soon', label: 'This week', items: soon },
      { key: 'later', label: 'Later', items: later },
    ].filter((bucket) => bucket.items.length > 0) as Bucket[];
  }, [assignments]);

  const done = useMemo(
    () => assignments.filter((a) => a.done).sort((a, b) => b.dueDate.localeCompare(a.dueDate)),
    [assignments]
  );

  const pendingCount = assignments.length - done.length;
  const overdueCount = buckets.find((b) => b.key === 'overdue')?.items.length ?? 0;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Planner"
        subtitle="Assignments & deadlines"
        onBack={onBack}
        accent={colors.accentReviewer}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <Stat value={String(pendingCount)} label="To do" />
          <View style={styles.statDivider} />
          <Stat value={String(overdueCount)} label="Overdue" tone={overdueCount > 0 ? 'danger' : undefined} />
          <View style={styles.statDivider} />
          <Stat value={String(done.length)} label="Done" />
        </View>

        <TouchableOpacity style={styles.addButton} onPress={openNew} activeOpacity={0.85}>
          <Text style={styles.addButtonText}>+ Add assignment</Text>
        </TouchableOpacity>

        {assignments.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🗓️</Text>
            <Text style={styles.emptyTitle}>Nothing due yet</Text>
            <Text style={styles.emptyText}>
              Add your assignments and they will be sorted by deadline, with anything overdue
              pushed to the top.
            </Text>
          </View>
        )}

        {buckets.map((bucket) => (
          <View key={bucket.key} style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                bucket.tone === 'danger' && styles.sectionDanger,
                bucket.tone === 'warning' && styles.sectionWarning,
              ]}
            >
              {bucket.label} · {bucket.items.length}
            </Text>
            {bucket.items.map((item) => (
              <AssignmentRow
                key={item.id}
                item={item}
                onToggle={() => toggleDone(item.id)}
                onEdit={() => openEdit(item)}
                onDelete={() => remove(item)}
              />
            ))}
          </View>
        ))}

        {done.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity onPress={() => setShowDone(!showDone)} activeOpacity={0.7}>
              <Text style={styles.sectionToggle}>
                {showDone ? 'Hide' : 'Show'} completed ({done.length})
              </Text>
            </TouchableOpacity>
            {showDone &&
              done.map((item) => (
                <AssignmentRow
                  key={item.id}
                  item={item}
                  onToggle={() => toggleDone(item.id)}
                  onEdit={() => openEdit(item)}
                  onDelete={() => remove(item)}
                />
              ))}
          </View>
        )}
      </ScrollView>

      <FormModal
        visible={formOpen}
        title={editing ? 'Edit assignment' : 'New assignment'}
        submitLabel={editing ? 'Save changes' : 'Add'}
        submitDisabled={!canSave}
        onSubmit={submit}
        onClose={closeForm}
      >
        <Field
          label="WHAT IS IT"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Chapter 4 problem set"
        />
        <ChipRow label="SUBJECT" options={subjectOptions} selected={subject} onSelect={setSubject} />
        <Field
          label="DUE DATE"
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          error={dateError}
        />
        <View style={styles.quickRow}>
          {[
            { label: 'Today', value: todayISO() },
            { label: 'Tomorrow', value: addDays(todayISO(), 1) },
            { label: 'In 3 days', value: addDays(todayISO(), 3) },
            { label: 'Next week', value: addDays(todayISO(), 7) },
          ].map((quick) => (
            <TouchableOpacity
              key={quick.label}
              style={styles.quickChip}
              onPress={() => setDueDate(quick.value)}
            >
              <Text style={styles.quickChipText}>{quick.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Field
          label="NOTES (OPTIONAL)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Pages, requirements, reminders…"
          multiline
        />
      </FormModal>
    </View>
  );
};

const AssignmentRow = ({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: Assignment;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const days = daysUntil(item.dueDate);
  const overdue = !item.done && days !== null && days < 0;

  return (
    <View style={[styles.row, item.done && styles.rowDone]}>
      <TouchableOpacity style={styles.checkbox} onPress={onToggle} activeOpacity={0.7}>
        <View style={[styles.checkboxBox, item.done && styles.checkboxChecked]}>
          {item.done ? <Text style={styles.checkboxTick}>✓</Text> : null}
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.rowBody} onPress={onEdit} activeOpacity={0.7}>
        <Text style={[styles.rowTitle, item.done && styles.rowTitleDone]} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.rowMeta}>
          <View style={styles.subjectTag}>
            <Text style={styles.subjectTagText}>{item.subject}</Text>
          </View>
          <Text style={[styles.rowDate, overdue && styles.rowDateOverdue]}>
            {formatDateLabel(item.dueDate)}
            {overdue && days !== null ? ` · ${Math.abs(days)}d late` : ''}
          </Text>
        </View>
        {item.notes ? (
          <Text style={styles.rowNotes} numberOfLines={2}>
            {item.notes}
          </Text>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity onPress={onDelete} style={styles.deleteButton} activeOpacity={0.7}>
        <Text style={styles.deleteText}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );
};

const Stat = ({ value, label, tone }: { value: string; label: string; tone?: 'danger' }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, tone === 'danger' && styles.statValueDanger]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  statsRow: { ...card(1), flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.subheading, fontSize: 22, color: colors.primary },
  statValueDanger: { color: colors.danger },
  statLabel: { ...typography.micro, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },

  addButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadow(2),
  },
  addButtonText: { ...typography.bodyStrong, color: colors.onPrimary, fontSize: 16 },

  section: { marginTop: spacing.xxl },
  sectionTitle: {
    ...typography.micro,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    letterSpacing: 0.4,
  },
  sectionDanger: { color: colors.danger },
  sectionWarning: { color: colors.warning },
  sectionToggle: { ...typography.caption, color: colors.primary, fontWeight: '700' },

  row: {
    ...card(1),
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rowDone: { opacity: 0.6 },
  checkbox: { padding: spacing.xs },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primarySoftBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxTick: { color: colors.onPrimary, fontSize: 13, fontWeight: '800' },

  rowBody: { flex: 1, marginLeft: spacing.sm },
  rowTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  rowTitleDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  rowMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: spacing.sm },
  subjectTag: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  subjectTagText: { ...typography.micro, color: colors.primary },
  rowDate: { ...typography.micro, color: colors.textMuted, fontWeight: '500' },
  rowDateOverdue: { color: colors.danger, fontWeight: '700' },
  rowNotes: { ...typography.micro, color: colors.textSecondary, marginTop: 5, fontWeight: '400' },

  deleteButton: { padding: spacing.sm },
  deleteText: { fontSize: 14 },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: -spacing.sm, marginBottom: spacing.lg },
  quickChip: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  quickChipText: { ...typography.micro, color: colors.primary },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: spacing.lg },
  emptyIcon: { fontSize: 46, marginBottom: spacing.md, opacity: 0.5 },
  emptyTitle: { ...typography.subheading, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
