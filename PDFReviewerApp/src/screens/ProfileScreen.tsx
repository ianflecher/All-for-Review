import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Assignment, ClassSession, FileItem, Transaction } from '../types';
import { FormModal, Field } from '../components/FormModal';
import { colors, radius, spacing, typography, card, shadow } from '../theme';
import { useAndroidBack } from '../utils/useAndroidBack';
import { loadJson, saveJson, STORAGE_KEYS } from '../utils/storage';

interface ProfileScreenProps {
  onBack: () => void;
}

interface Profile {
  name: string;
  tagline: string;
  about: string;
}

const DEFAULT_PROFILE: Profile = {
  name: 'Student',
  tagline: 'Learning every day',
  about: '',
};

interface Badge {
  key: string;
  icon: string;
  label: string;
  accent: string;
  earned: boolean;
  hint: string;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack }) => {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(DEFAULT_PROFILE.name);
  const [tagline, setTagline] = useState(DEFAULT_PROFILE.tagline);
  const [about, setAbout] = useState('');

  useEffect(() => {
    loadJson<Profile>(STORAGE_KEYS.profile, DEFAULT_PROFILE).then(setProfile);
    loadJson<FileItem[]>(STORAGE_KEYS.files, []).then(setFiles);
    loadJson<Assignment[]>(STORAGE_KEYS.assignments, []).then(setAssignments);
    loadJson<Transaction[]>(STORAGE_KEYS.transactions, []).then(setTransactions);
    loadJson<ClassSession[]>(STORAGE_KEYS.schedule, []).then(setSessions);
  }, []);

  const closeEdit = useCallback(() => setEditing(false), []);

  useAndroidBack(
    useCallback(() => {
      if (editing) {
        closeEdit();
        return true;
      }
      onBack();
      return true;
    }, [editing, closeEdit, onBack])
  );

  const tasksDone = useMemo(() => assignments.filter((a) => a.done).length, [assignments]);

  /**
   * Badges are unlocked from what is actually stored, so the row reflects real
   * use rather than a made-up score.
   */
  const badges = useMemo<Badge[]>(
    () => [
      {
        key: 'first-file',
        icon: '📚',
        label: 'First upload',
        accent: colors.accentReviewer,
        earned: files.length >= 1,
        hint: 'Add a document',
      },
      {
        key: 'library',
        icon: '🔥',
        label: 'Library of 5',
        accent: colors.accentFlashcards,
        earned: files.length >= 5,
        hint: 'Add 5 documents',
      },
      {
        key: 'first-task',
        icon: '✅',
        label: 'First task done',
        accent: colors.accentQuiz,
        earned: tasksDone >= 1,
        hint: 'Finish an assignment',
      },
      {
        key: 'ten-tasks',
        icon: '🏆',
        label: '10 tasks done',
        accent: colors.accentMap,
        earned: tasksDone >= 10,
        hint: 'Finish 10 assignments',
      },
      {
        key: 'budget',
        icon: '💰',
        label: 'Budgeter',
        accent: colors.accentWallet,
        earned: transactions.length >= 1,
        hint: 'Log an allowance entry',
      },
      {
        key: 'timetable',
        icon: '⏰',
        label: 'Timetabled',
        accent: colors.accentSchedule,
        earned: sessions.length >= 1,
        hint: 'Add a class',
      },
    ],
    [files.length, tasksDone, transactions.length, sessions.length]
  );

  const earnedCount = badges.filter((badge) => badge.earned).length;

  const openEdit = () => {
    setName(profile.name);
    setTagline(profile.tagline);
    setAbout(profile.about);
    setEditing(true);
  };

  const submit = () => {
    const next: Profile = {
      name: name.trim() || DEFAULT_PROFILE.name,
      tagline: tagline.trim() || DEFAULT_PROFILE.tagline,
      about: about.trim(),
    };
    setProfile(next);
    saveJson(STORAGE_KEYS.profile, next);
    closeEdit();
  };

  const initial = profile.name.trim().charAt(0).toUpperCase() || 'S';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onBack} style={styles.iconButton} activeOpacity={0.7}>
            <Text style={styles.iconButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={openEdit} style={styles.iconButton} activeOpacity={0.7}>
            <Text style={styles.iconButtonText}>✎</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {profile.name}
        </Text>
        <Text style={styles.tagline} numberOfLines={1}>
          {profile.tagline}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.statsCard}>
          <Stat icon="📚" value={String(files.length)} label="Documents" />
          <View style={styles.statDivider} />
          <Stat icon="✅" value={String(tasksDone)} label="Tasks done" />
          <View style={styles.statDivider} />
          <Stat icon="🎖️" value={`${earnedCount}/${badges.length}`} label="Badges" />
        </View>

        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={styles.badgeRow}>
          {badges.map((badge) => (
            <View key={badge.key} style={styles.badgeItem}>
              <View
                style={[
                  styles.badge,
                  badge.earned
                    ? { backgroundColor: `${badge.accent}1f`, borderColor: badge.accent }
                    : styles.badgeLocked,
                ]}
              >
                <Text style={[styles.badgeIcon, !badge.earned && styles.badgeIconLocked]}>
                  {badge.earned ? badge.icon : '🔒'}
                </Text>
              </View>
              <Text
                style={[styles.badgeLabel, !badge.earned && styles.badgeLabelLocked]}
                numberOfLines={2}
              >
                {badge.earned ? badge.label : badge.hint}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>About me</Text>
        <View style={styles.aboutCard}>
          {profile.about.length > 0 ? (
            <Text style={styles.aboutText}>{profile.about}</Text>
          ) : (
            <TouchableOpacity onPress={openEdit} activeOpacity={0.7}>
              <Text style={styles.aboutPlaceholder}>
                Tap the pencil to add your name, year level or anything you want to remember here.
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Your data</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutText}>
            Everything in this app — documents, summaries, assignments, allowance and your
            timetable — is stored only on this phone. There is no account and nothing is uploaded.
          </Text>
          <Text style={styles.dataNote}>
            {files.length} document{files.length === 1 ? '' : 's'} · {assignments.length} assignment
            {assignments.length === 1 ? '' : 's'} · {transactions.length} money entr
            {transactions.length === 1 ? 'y' : 'ies'} · {sessions.length} class
            {sessions.length === 1 ? '' : 'es'}
          </Text>
        </View>
      </ScrollView>

      <FormModal
        visible={editing}
        title="Edit profile"
        submitLabel="Save"
        onSubmit={submit}
        onClose={closeEdit}
      >
        <Field label="NAME" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
        <Field
          label="TAGLINE"
          value={tagline}
          onChangeText={setTagline}
          placeholder="e.g. Grade 12 · STEM"
        />
        <Field
          label="ABOUT ME"
          value={about}
          onChangeText={setAbout}
          placeholder="Anything you want to keep here…"
          multiline
        />
      </FormModal>
    </View>
  );
};

const Stat = ({ icon, value, label }: { icon: string; value: string; label: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.primary,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.lg,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: { color: colors.onPrimary, fontSize: 17, fontWeight: '700' },
  headerTitle: { ...typography.heading, color: colors.onPrimary },

  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(2),
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 34, fontWeight: '800', color: colors.primary },
  name: { ...typography.title, fontSize: 22, color: colors.onPrimary, marginTop: spacing.md },
  tagline: { ...typography.caption, color: colors.onPrimaryMuted, marginTop: 2 },

  body: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  statsCard: {
    ...card(1),
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center' },
  statIcon: { fontSize: 16, marginBottom: 3 },
  statValue: { ...typography.subheading, fontSize: 19, color: colors.primary },
  statLabel: { ...typography.micro, color: colors.textMuted, marginTop: 1, fontWeight: '500' },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },

  sectionTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  badgeItem: { width: '29%', flexGrow: 1, alignItems: 'center' },
  badge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeLocked: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  badgeIcon: { fontSize: 24 },
  badgeIconLocked: { fontSize: 18, opacity: 0.45 },
  badgeLabel: {
    ...typography.micro,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 14,
  },
  badgeLabelLocked: { color: colors.textMuted, fontWeight: '400' },

  aboutCard: { ...card(1), padding: spacing.lg },
  aboutText: { ...typography.caption, color: colors.textSecondary, lineHeight: 20 },
  aboutPlaceholder: { ...typography.caption, color: colors.textMuted, lineHeight: 20 },
  dataNote: { ...typography.micro, color: colors.textMuted, marginTop: spacing.md, fontWeight: '500' },
});
