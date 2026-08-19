import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ClassSession } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { FormModal, Field, ChipRow } from '../components/FormModal';
import { colors, radius, spacing, typography, card, shadow } from '../theme';
import { showAlert } from '../utils/alert';
import { useAndroidBack } from '../utils/useAndroidBack';
import { loadJson, saveJson, STORAGE_KEYS } from '../utils/storage';
import {
  DAY_NAMES,
  DAY_SHORT,
  formatTime,
  isValidTime,
  minutesNow,
  minutesOfTime,
  todayDayIndex,
} from '../utils/datetime';

interface ScheduleScreenProps {
  onBack: () => void;
}

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({ onBack }) => {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [selectedDay, setSelectedDay] = useState(todayDayIndex());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClassSession | null>(null);

  const [subject, setSubject] = useState('');
  const [day, setDay] = useState(todayDayIndex());
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('09:00');
  const [room, setRoom] = useState('');
  const [teacher, setTeacher] = useState('');

  useEffect(() => {
    loadJson<ClassSession[]>(STORAGE_KEYS.schedule, []).then(setSessions);
  }, []);

  const persist = useCallback((next: ClassSession[]) => {
    setSessions(next);
    saveJson(STORAGE_KEYS.schedule, next);
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

  const dayClasses = useMemo(
    () =>
      sessions
        .filter((session) => session.day === selectedDay)
        .sort((a, b) => minutesOfTime(a.start) - minutesOfTime(b.start)),
    [sessions, selectedDay]
  );

  /** The next class still to start today, used for the banner. */
  const upNext = useMemo(() => {
    if (selectedDay !== todayDayIndex()) return null;
    const now = minutesNow();
    return dayClasses.find((session) => minutesOfTime(session.start) > now) ?? null;
  }, [dayClasses, selectedDay]);

  const perDayCounts = useMemo(() => {
    const counts = new Array(7).fill(0);
    for (const session of sessions) {
      if (session.day >= 0 && session.day < 7) counts[session.day] += 1;
    }
    return counts;
  }, [sessions]);

  const openNew = () => {
    setEditing(null);
    setSubject('');
    setDay(selectedDay);
    setStart('08:00');
    setEnd('09:00');
    setRoom('');
    setTeacher('');
    setFormOpen(true);
  };

  const openEdit = (session: ClassSession) => {
    setEditing(session);
    setSubject(session.subject);
    setDay(session.day);
    setStart(session.start);
    setEnd(session.end);
    setRoom(session.room ?? '');
    setTeacher(session.teacher ?? '');
    setFormOpen(true);
  };

  const startError = isValidTime(start) ? undefined : 'Use 24-hour time, e.g. 08:30';
  const endError = !isValidTime(end)
    ? 'Use 24-hour time, e.g. 09:30'
    : minutesOfTime(end) <= minutesOfTime(start)
      ? 'End time must be after the start time'
      : undefined;
  const canSave = subject.trim().length > 0 && !startError && !endError;

  const submit = () => {
    if (!canSave) return;

    const values = {
      subject: subject.trim(),
      day,
      start,
      end,
      room: room.trim() || undefined,
      teacher: teacher.trim() || undefined,
    };

    if (editing) {
      persist(sessions.map((s) => (s.id === editing.id ? { ...s, ...values } : s)));
    } else {
      persist([...sessions, { id: `${Date.now()}`, ...values }]);
    }
    // Follow the class to whichever day it was filed under.
    setSelectedDay(day);
    closeForm();
  };

  const remove = (session: ClassSession) => {
    showAlert('Remove class', `Remove ${session.subject} from ${DAY_NAMES[session.day]}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => persist(sessions.filter((s) => s.id !== session.id)),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Class Schedule"
        subtitle="Your weekly timetable"
        onBack={onBack}
        accent={colors.accentMap}
      />

      <View style={styles.dayBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayBarContent}>
          {DAY_SHORT.map((label, index) => {
            const active = index === selectedDay;
            const isToday = index === todayDayIndex();
            return (
              <TouchableOpacity
                key={label}
                style={[styles.dayTab, active && styles.dayTabActive]}
                onPress={() => setSelectedDay(index)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayTabText, active && styles.dayTabTextActive]}>{label}</Text>
                <View style={styles.dayTabMeta}>
                  {isToday ? <View style={[styles.todayDot, active && styles.todayDotActive]} /> : null}
                  <Text style={[styles.dayTabCount, active && styles.dayTabCountActive]}>
                    {perDayCounts[index]}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {upNext ? (
          <View style={styles.nextCard}>
            <Text style={styles.nextLabel}>UP NEXT TODAY</Text>
            <Text style={styles.nextSubject}>{upNext.subject}</Text>
            <Text style={styles.nextTime}>
              {formatTime(upNext.start)} – {formatTime(upNext.end)}
              {upNext.room ? ` · ${upNext.room}` : ''}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.addButton} onPress={openNew} activeOpacity={0.85}>
          <Text style={styles.addButtonText}>+ Add class</Text>
        </TouchableOpacity>

        {dayClasses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>No classes on {DAY_NAMES[selectedDay]}</Text>
            <Text style={styles.emptyText}>
              Add your classes once and they repeat every week. Tap a class to edit it.
            </Text>
          </View>
        ) : (
          dayClasses.map((session) => (
            <View key={session.id} style={styles.classRow}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeStart}>{formatTime(session.start)}</Text>
                <View style={styles.timeLine} />
                <Text style={styles.timeEnd}>{formatTime(session.end)}</Text>
              </View>

              <TouchableOpacity
                style={styles.classBody}
                onPress={() => openEdit(session)}
                activeOpacity={0.8}
              >
                <Text style={styles.classSubject} numberOfLines={2}>
                  {session.subject}
                </Text>
                {session.room || session.teacher ? (
                  <Text style={styles.classMeta} numberOfLines={1}>
                    {[session.room, session.teacher].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => remove(session)} style={styles.deleteButton}>
                <Text style={styles.deleteText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <FormModal
        visible={formOpen}
        title={editing ? 'Edit class' : 'New class'}
        submitLabel={editing ? 'Save changes' : 'Add'}
        submitDisabled={!canSave}
        onSubmit={submit}
        onClose={closeForm}
      >
        <Field
          label="SUBJECT"
          value={subject}
          onChangeText={setSubject}
          placeholder="e.g. General Mathematics"
        />
        <ChipRow
          label="DAY"
          options={DAY_SHORT}
          selected={DAY_SHORT[day]}
          onSelect={(label) => setDay(DAY_SHORT.indexOf(label))}
        />
        <Field
          label="STARTS"
          value={start}
          onChangeText={setStart}
          placeholder="08:00"
          autoCapitalize="none"
          error={startError}
        />
        <Field
          label="ENDS"
          value={end}
          onChangeText={setEnd}
          placeholder="09:00"
          autoCapitalize="none"
          error={endError}
        />
        <Field label="ROOM (OPTIONAL)" value={room} onChangeText={setRoom} placeholder="e.g. Rm 204" />
        <Field
          label="TEACHER (OPTIONAL)"
          value={teacher}
          onChangeText={setTeacher}
          placeholder="e.g. Ms. Santos"
          autoCapitalize="words"
        />
      </FormModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  dayBar: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  dayBarContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm },
  dayTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minWidth: 58,
  },
  dayTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayTabText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  dayTabTextActive: { color: colors.onPrimary },
  dayTabMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
  todayDotActive: { backgroundColor: colors.onPrimary },
  dayTabCount: { ...typography.micro, color: colors.textMuted, fontWeight: '500' },
  dayTabCountActive: { color: colors.onPrimaryMuted },

  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  nextCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow(2),
  },
  nextLabel: { ...typography.micro, color: colors.onPrimaryMuted, letterSpacing: 1 },
  nextSubject: { ...typography.heading, color: colors.onPrimary, marginTop: 4 },
  nextTime: { ...typography.caption, color: colors.onPrimaryMuted, marginTop: 2 },

  addButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow(2),
  },
  addButtonText: { ...typography.bodyStrong, color: colors.onPrimary, fontSize: 16 },

  classRow: { ...card(1), flexDirection: 'row', padding: spacing.md, marginBottom: spacing.md },
  timeColumn: { alignItems: 'center', width: 74, paddingTop: 2 },
  timeStart: { ...typography.micro, color: colors.primary, fontWeight: '800' },
  timeLine: { width: 1, flex: 1, minHeight: 12, backgroundColor: colors.border, marginVertical: 4 },
  timeEnd: { ...typography.micro, color: colors.textMuted, fontWeight: '500' },
  classBody: { flex: 1, paddingLeft: spacing.md, borderLeftWidth: 1, borderLeftColor: colors.border },
  classSubject: { ...typography.bodyStrong, color: colors.textPrimary },
  classMeta: { ...typography.micro, color: colors.textMuted, fontWeight: '400', marginTop: 3 },
  deleteButton: { paddingLeft: spacing.sm, paddingVertical: spacing.xs },
  deleteText: { fontSize: 13 },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: spacing.lg },
  emptyIcon: { fontSize: 46, marginBottom: spacing.md, opacity: 0.5 },
  emptyTitle: { ...typography.subheading, color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' },
  emptyText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
