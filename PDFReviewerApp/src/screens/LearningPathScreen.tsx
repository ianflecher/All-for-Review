import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { buildLearningPath, levelLabel, PathLevel, PathStep } from '../utils/learningPath';
import { colors, radius, spacing, typography, card, shadow } from '../theme';
import { useAndroidBack } from '../utils/useAndroidBack';
import { loadJson, saveJson } from '../utils/storage';

interface LearningPathScreenProps {
  /** Progress is stored per document. */
  fileId: string;
  fileName: string;
  text: string;
  onBack: () => void;
}

const LEVEL_COLOURS: Record<PathLevel, string> = {
  foundation: colors.success,
  building: colors.primary,
  advanced: colors.accentSchedule,
};

const progressKey = (fileId: string) => `learningPath_${fileId}`;

/**
 * The document's main ideas as an ordered route, groundwork first.
 *
 * Replaces the concept web that used to live here: a ring of linked bubbles
 * showed that ideas were related but gave no answer to "what do I read first",
 * which is the actual question when you sit down with a document.
 */
export const LearningPathScreen: React.FC<LearningPathScreenProps> = ({
  fileId,
  fileName,
  text,
  onBack,
}) => {
  const steps = useMemo(() => buildLearningPath(text, 12), [text]);

  const [done, setDone] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    loadJson<string[]>(progressKey(fileId), []).then(setDone);
  }, [fileId]);

  useAndroidBack(
    useCallback(() => {
      onBack();
      return true;
    }, [onBack])
  );

  const doneSet = useMemo(() => new Set(done), [done]);

  const toggleDone = (id: string) => {
    const next = doneSet.has(id) ? done.filter((item) => item !== id) : [...done, id];
    setDone(next);
    saveJson(progressKey(fileId), next);
  };

  const completed = steps.filter((step) => doneSet.has(step.id)).length;
  const percent = steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0;

  if (steps.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Learning Path"
          subtitle={fileName}
          onBack={onBack}
          accent={colors.accentMap}
        />
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🧭</Text>
          <Text style={styles.emptyTitle}>Not enough to work with</Text>
          <Text style={styles.emptyText}>
            This material is too short to pick out topics and put them in order. Try a longer
            document.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Learning Path"
        subtitle={fileName}
        onBack={onBack}
        accent={colors.accentMap}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progressCard}>
          <View style={styles.progressHead}>
            <Text style={styles.progressTitle}>
              Step {Math.min(completed + 1, steps.length)} of {steps.length}
            </Text>
            <Text style={styles.progressPercent}>{percent}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.progressHint}>
            Ordered by how this document builds up — the groundwork it introduces first, then what
            leans on it. Tap a circle when you have got one down.
          </Text>
        </View>

        {steps.map((step, index) => (
          <StepRow
            key={step.id}
            step={step}
            isLast={index === steps.length - 1}
            done={doneSet.has(step.id)}
            expanded={expanded === step.id}
            onToggleDone={() => toggleDone(step.id)}
            onToggleExpand={() => setExpanded(expanded === step.id ? null : step.id)}
          />
        ))}

        <Text style={styles.footnote}>
          The order comes from where each idea first appears, how often it recurs, whether the text
          defines it, and how many earlier ideas it is explained with. It reflects this document's
          own build-up, not a syllabus.
        </Text>
      </ScrollView>
    </View>
  );
};

const StepRow = ({
  step,
  isLast,
  done,
  expanded,
  onToggleDone,
  onToggleExpand,
}: {
  step: PathStep;
  isLast: boolean;
  done: boolean;
  expanded: boolean;
  onToggleDone: () => void;
  onToggleExpand: () => void;
}) => {
  const accent = LEVEL_COLOURS[step.level];

  return (
    <View style={styles.row}>
      {/* Timeline rail: the numbered marker, and the line running to the next. */}
      <View style={styles.rail}>
        <TouchableOpacity
          style={[
            styles.marker,
            { borderColor: accent },
            done && { backgroundColor: accent },
          ]}
          onPress={onToggleDone}
          activeOpacity={0.7}
          accessibilityLabel={done ? `Mark ${step.label} not done` : `Mark ${step.label} done`}
        >
          <Text style={[styles.markerText, done ? styles.markerTextDone : { color: accent }]}>
            {done ? '✓' : step.order}
          </Text>
        </TouchableOpacity>
        {!isLast && <View style={[styles.connector, done && { backgroundColor: accent }]} />}
      </View>

      <TouchableOpacity
        style={[styles.stepCard, done && styles.stepCardDone]}
        onPress={onToggleExpand}
        activeOpacity={0.85}
      >
        <View style={styles.stepHead}>
          <Text style={[styles.stepTitle, done && styles.stepTitleDone]} numberOfLines={2}>
            {step.label}
          </Text>
          <View style={[styles.levelPill, { backgroundColor: `${accent}1f`, borderColor: accent }]}>
            <Text style={[styles.levelText, { color: accent }]}>{levelLabel(step.level)}</Text>
          </View>
        </View>

        <Text style={styles.reasons} numberOfLines={expanded ? undefined : 2}>
          {step.reasons.join(' · ')}
        </Text>

        {step.buildsOn.length > 0 && (
          <View style={styles.chipRow}>
            <Text style={styles.chipLabel}>Builds on</Text>
            {step.buildsOn.map((label) => (
              <View key={label} style={styles.chip}>
                <Text style={styles.chipText}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {expanded && (
          <View style={styles.detail}>
            {step.isolated && (
              <Text style={styles.warning}>
                This one barely connects to anything else here — the document may not explain it
                fully.
              </Text>
            )}
            {step.contexts.length > 0 ? (
              <>
                <Text style={styles.detailLabel}>WHERE IT APPEARS</Text>
                {step.contexts.map((sentence, index) => (
                  <Text key={index} style={styles.quote}>
                    “{sentence}”
                  </Text>
                ))}
              </>
            ) : (
              <Text style={styles.detailLabel}>No example sentence found.</Text>
            )}
          </View>
        )}

        <Text style={styles.expandHint}>{expanded ? 'Tap to collapse' : 'Tap for context'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const MARKER = 34;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  progressCard: { ...card(1), padding: spacing.lg, marginBottom: spacing.xl },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { ...typography.subheading, color: colors.textPrimary },
  progressPercent: { ...typography.subheading, color: colors.primary },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill },
  progressHint: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '400',
    lineHeight: 16,
    marginTop: spacing.md,
  },

  row: { flexDirection: 'row', alignItems: 'stretch' },
  rail: { width: MARKER + spacing.md, alignItems: 'center' },
  marker: {
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    borderWidth: 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow(1),
  },
  markerText: { ...typography.caption, fontWeight: '800' },
  markerTextDone: { color: colors.onPrimary },
  connector: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 2 },

  stepCard: { ...card(1), flex: 1, padding: spacing.lg, marginBottom: spacing.md },
  stepCardDone: { backgroundColor: colors.surfaceAlt },
  stepHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  stepTitle: { ...typography.subheading, color: colors.textPrimary, flex: 1 },
  stepTitleDone: { color: colors.textMuted },
  levelPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  levelText: { ...typography.micro, fontWeight: '700' },

  reasons: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '400',
    lineHeight: 16,
    marginTop: spacing.sm,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  chipLabel: { ...typography.micro, color: colors.textMuted, marginRight: 2 },
  chip: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  chipText: { ...typography.micro, color: colors.primary },

  detail: { marginTop: spacing.md, gap: spacing.sm },
  detailLabel: { ...typography.micro, color: colors.textMuted, letterSpacing: 0.4 },
  quote: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '400',
    lineHeight: 18,
    borderLeftWidth: 2,
    borderLeftColor: colors.primarySoftBorder,
    paddingLeft: spacing.md,
  },
  warning: {
    ...typography.micro,
    color: colors.warning,
    fontWeight: '500',
    lineHeight: 16,
  },

  expandHint: { ...typography.micro, color: colors.textMuted, marginTop: spacing.md, fontWeight: '400' },

  footnote: {
    ...typography.micro,
    color: colors.textMuted,
    fontWeight: '400',
    lineHeight: 16,
    marginTop: spacing.xl,
    textAlign: 'center',
  },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyIcon: { fontSize: 46, marginBottom: spacing.md, opacity: 0.5 },
  emptyTitle: { ...typography.subheading, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
