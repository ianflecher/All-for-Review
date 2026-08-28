import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Assignment, ClassSession, FileItem } from '../types';
import { AppScreen, TOOL_TILES } from '../navigation';
import { colors, radius, spacing, typography, card, shadow } from '../theme';
import { loadJson, STORAGE_KEYS } from '../utils/storage';
import { daysUntil, formatTime, minutesNow, minutesOfTime, todayDayIndex } from '../utils/datetime';

interface DashboardScreenProps {
  onOpen: (screen: AppScreen) => void;
  onUpload: () => void;
  /** Bumped by the shell whenever the tab is re-entered, to refresh counts. */
  refreshKey: number;
}

/**
 * The app's front door: a blue header carrying the search field, then a grid
 * of tiles. Laid out for a thumb — everything is reachable without reading a
 * paragraph first.
 */
export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onOpen,
  onUpload,
  refreshKey,
}) => {
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);

  // Counts are read fresh on every visit, so they cannot drift from whatever
  // the other tabs have changed.
  useEffect(() => {
    loadJson<FileItem[]>(STORAGE_KEYS.files, []).then(setFiles);
    loadJson<Assignment[]>(STORAGE_KEYS.assignments, []).then(setAssignments);
    loadJson<ClassSession[]>(STORAGE_KEYS.schedule, []).then(setSessions);
  }, [refreshKey]);

  const dueSoon = useMemo(
    () =>
      assignments.filter((item) => {
        if (item.done) return false;
        const days = daysUntil(item.dueDate);
        return days !== null && days <= 1;
      }).length,
    [assignments]
  );

  const todayClasses = useMemo(
    () =>
      sessions
        .filter((session) => session.day === todayDayIndex())
        .sort((a, b) => minutesOfTime(a.start) - minutesOfTime(b.start)),
    [sessions]
  );

  const nextClass = useMemo(() => {
    const now = minutesNow();
    return todayClasses.find((session) => minutesOfTime(session.start) > now) ?? null;
  }, [todayClasses]);

  const tiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return TOOL_TILES;
    return TOOL_TILES.filter(
      (tile) =>
        tile.label.toLowerCase().includes(query) || tile.blurb.toLowerCase().includes(query)
    );
  }, [search]);

  const openTile = useCallback(
    (screen: AppScreen) => {
      onOpen(screen);
    },
    [onOpen]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.greeting}>Ready to study?</Text>
            <Text style={styles.appName}>IDF Reviewer</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => onOpen('profile')}
            activeOpacity={0.8}
            accessibilityLabel="Open profile"
          >
            <Text style={styles.avatarText}>🎓</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="What do you want to do?"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          keyboardShouldPersistTaps="handled"
        >
          {TOOL_TILES.map((tile) => (
            <TouchableOpacity
              key={tile.key}
              style={styles.chip}
              onPress={() => openTile(tile.screen)}
              activeOpacity={0.75}
            >
              <Text style={styles.chipText}>{tile.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.statsCard}>
          <Stat value={String(files.length)} label="Documents" icon="📚" />
          <View style={styles.statDivider} />
          <Stat value={String(dueSoon)} label="Due soon" icon="⏳" tone={dueSoon > 0 ? 'warn' : undefined} />
          <View style={styles.statDivider} />
          <Stat value={String(todayClasses.length)} label="Classes today" icon="🏫" />
        </View>

        {nextClass ? (
          <TouchableOpacity
            style={styles.nextCard}
            onPress={() => onOpen('schedule')}
            activeOpacity={0.9}
          >
            <View style={styles.nextIcon}>
              <Text style={styles.nextIconText}>⏰</Text>
            </View>
            <View style={styles.nextBody}>
              <Text style={styles.nextLabel}>NEXT CLASS</Text>
              <Text style={styles.nextSubject} numberOfLines={1}>
                {nextClass.subject}
              </Text>
            </View>
            <Text style={styles.nextTime}>{formatTime(nextClass.start)}</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>
            {search.trim() ? 'Matching tools' : 'Everything you need'}
          </Text>
          {files.length === 0 ? (
            <TouchableOpacity onPress={onUpload}>
              <Text style={styles.sectionAction}>Add a file</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {tiles.length === 0 ? (
          <Text style={styles.noMatch}>Nothing matches “{search.trim()}”.</Text>
        ) : (
          <View style={styles.grid}>
            {tiles.map((tile) => (
              <TouchableOpacity
                key={tile.key}
                style={styles.tile}
                onPress={() => openTile(tile.screen)}
                activeOpacity={0.88}
              >
                <View style={[styles.tileAccent, { backgroundColor: tile.accent }]} />
                <View style={[styles.tileIcon, { backgroundColor: `${tile.accent}22` }]}>
                  <Text style={styles.tileIconText}>{tile.icon}</Text>
                </View>
                <Text style={styles.tileLabel} numberOfLines={1}>
                  {tile.label}
                </Text>
                <Text style={styles.tileBlurb} numberOfLines={2}>
                  {tile.blurb}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {files.length === 0 ? (
          <TouchableOpacity style={styles.emptyCta} onPress={onUpload} activeOpacity={0.9}>
            <Text style={styles.emptyCtaIcon}>📤</Text>
            <View style={styles.emptyCtaBody}>
              <Text style={styles.emptyCtaTitle}>Add your first document</Text>
              <Text style={styles.emptyCtaText}>
                PDF, Word, PowerPoint, text or captions — the summary, cards and quiz are built
                from it on your phone.
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
};

const Stat = ({
  value,
  label,
  icon,
  tone,
}: {
  value: string;
  label: string;
  icon: string;
  tone?: 'warn';
}) => (
  <View style={styles.stat}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, tone === 'warn' && styles.statValueWarn]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTextBlock: { flex: 1 },
  greeting: { ...typography.micro, color: colors.onPrimaryMuted, fontWeight: '500' },
  appName: { ...typography.title, color: colors.onPrimary, marginTop: 1 },
  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: { fontSize: 20 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    ...shadow(1),
  },
  searchIcon: { fontSize: 14, marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    ...typography.caption,
    color: colors.textPrimary,
  },
  searchClear: { fontSize: 14, color: colors.textMuted, paddingLeft: spacing.sm },

  chipRow: { gap: spacing.sm, paddingTop: spacing.md, paddingRight: spacing.lg },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  chipText: { ...typography.micro, color: colors.onPrimary },

  body: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  statsCard: { ...card(1), flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg },
  stat: { flex: 1, alignItems: 'center' },
  statIcon: { fontSize: 15, marginBottom: 2 },
  statValue: { ...typography.subheading, fontSize: 20, color: colors.primary },
  statValueWarn: { color: colors.warning },
  statLabel: { ...typography.micro, color: colors.textMuted, marginTop: 1, fontWeight: '500' },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },

  nextCard: {
    ...card(1),
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginTop: spacing.md,
  },
  nextIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  nextIconText: { fontSize: 17 },
  nextBody: { flex: 1 },
  nextLabel: { ...typography.micro, color: colors.textMuted, letterSpacing: 0.6 },
  nextSubject: { ...typography.bodyStrong, color: colors.textPrimary, marginTop: 1 },
  nextTime: { ...typography.bodyStrong, color: colors.primary },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.subheading, color: colors.textPrimary },
  sectionAction: { ...typography.micro, color: colors.primary, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    ...card(1),
    width: '48%',
    flexGrow: 1,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  tileAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    marginTop: 2,
  },
  tileIconText: { fontSize: 21 },
  tileLabel: { ...typography.bodyStrong, color: colors.textPrimary },
  tileBlurb: {
    ...typography.micro,
    color: colors.textMuted,
    fontWeight: '400',
    marginTop: 3,
    lineHeight: 15,
  },

  noMatch: { ...typography.caption, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xxl },

  emptyCta: {
    ...card(1),
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    marginTop: spacing.xl,
    borderStyle: 'dashed',
    borderColor: colors.primarySoftBorder,
  },
  emptyCtaIcon: { fontSize: 22, marginRight: spacing.md },
  emptyCtaBody: { flex: 1 },
  emptyCtaTitle: { ...typography.bodyStrong, color: colors.textPrimary, marginBottom: 3 },
  emptyCtaText: { ...typography.micro, color: colors.textSecondary, fontWeight: '400', lineHeight: 16 },
});
