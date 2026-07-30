import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { DocumentAnalysis, FileItem } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius, spacing, typography, card } from '../theme';

interface ReviewerProps {
  file: FileItem;
  analysis: DocumentAnalysis;
  /** Raw extracted text, shown when there is nothing to summarise. */
  text: string;
  onBack: () => void;
}

export const ReviewerScreen = ({ file, analysis, text, onBack }: ReviewerProps) => {
  const { summary, keywords, wordCount, flashcards, quiz } = analysis;
  const [showFullText, setShowFullText] = useState(false);

  const hasSummary = summary.length > 0;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Reviewer"
        subtitle={file.name}
        onBack={onBack}
        accent={colors.accentReviewer}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <Stat value={wordCount.toLocaleString()} label="Words" />
          <View style={styles.statDivider} />
          <Stat value={String(flashcards.length)} label="Cards" />
          <View style={styles.statDivider} />
          <Stat value={String(quiz.length)} label="Questions" />
        </View>

        {keywords.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Topics</Text>
            <View style={styles.chipRow}>
              {keywords.map((kw) => (
                <View key={kw} style={styles.chip}>
                  <Text style={styles.chipText}>{kw}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {hasSummary ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            {summary.map((sentence, idx) => (
              <View key={idx} style={styles.summaryItem}>
                <View style={styles.summaryBadge}>
                  <Text style={styles.summaryBadgeText}>{idx + 1}</Text>
                </View>
                <Text style={styles.summaryText}>{sentence}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>No summary available</Text>
            <Text style={styles.noticeBody}>
              This material was too short or too unstructured to summarise, so the full text is
              shown below instead.
            </Text>
          </View>
        )}

        {/* Full text: the fallback when nothing could be summarised, and always
            available behind a toggle so the original is never out of reach. */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Full Text</Text>
            {hasSummary && (
              <TouchableOpacity onPress={() => setShowFullText(!showFullText)} activeOpacity={0.7}>
                <Text style={styles.toggleText}>{showFullText ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {(showFullText || !hasSummary) &&
            (text.trim().length > 0 ? (
              <Text style={styles.fullText} selectable>
                {text.trim()}
              </Text>
            ) : (
              <Text style={styles.noticeBody}>No text could be read from this source.</Text>
            ))}
        </View>
      </ScrollView>
    </View>
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  statsRow: {
    ...card(1),
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.subheading, color: colors.primary, fontSize: 20 },
  statLabel: { ...typography.micro, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },

  section: { ...card(1), padding: spacing.lg, marginBottom: spacing.lg },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { ...typography.subheading, color: colors.textPrimary, marginBottom: spacing.md },
  toggleText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  chipText: { ...typography.micro, color: colors.primary },

  summaryItem: { flexDirection: 'row', marginBottom: spacing.md },
  summaryBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 1,
  },
  summaryBadgeText: { color: colors.onPrimary, fontSize: 11, fontWeight: '800' },
  summaryText: { flex: 1, ...typography.body, color: colors.textSecondary, lineHeight: 22 },

  noticeCard: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(224, 160, 18, 0.35)',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  noticeTitle: { ...typography.bodyStrong, color: colors.textPrimary, marginBottom: 4 },
  noticeBody: { ...typography.caption, color: colors.textSecondary, lineHeight: 19 },

  fullText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 23,
  },
});
