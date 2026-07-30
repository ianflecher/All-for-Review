import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Flashcard } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius, spacing, typography, card, shadow } from '../theme';

interface FlashcardScreenProps {
  fileName: string;
  flashcards: Flashcard[];
  /** Shown when no cards could be generated. */
  fallbackText?: string;
  onBack: () => void;
}

export const FlashcardScreen: React.FC<FlashcardScreenProps> = ({
  fileName,
  flashcards,
  fallbackText,
  onBack,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());

  const hasCards = flashcards.length > 0;
  const currentCard = hasCards ? flashcards[currentIndex] : null;

  const goTo = (index: number) => {
    setShowBack(false);
    setCurrentIndex(((index % flashcards.length) + flashcards.length) % flashcards.length);
  };

  const markKnown = (isKnown: boolean) => {
    setKnown((prev) => {
      const next = new Set(prev);
      if (isKnown) next.add(currentIndex);
      else next.delete(currentIndex);
      return next;
    });
    goTo(currentIndex + 1);
  };

  const progress = hasCards ? (currentIndex + 1) / flashcards.length : 0;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Flashcards"
        subtitle={fileName}
        onBack={onBack}
        accent={colors.accentFlashcards}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!hasCards ? (
          <View style={styles.fallbackWrap}>
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>No flashcards could be made</Text>
              <Text style={styles.noticeBody}>
                There wasn't enough structured content to build question-and-answer cards. The
                original text is shown below so you can still study it.
              </Text>
            </View>
            {fallbackText ? (
              <View style={styles.textCard}>
                <Text style={styles.fullText} selectable>
                  {fallbackText.trim()}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                Card {currentIndex + 1} of {flashcards.length}
              </Text>
              <Text style={styles.knownLabel}>{known.size} known</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress * 100}%` }]} />
            </View>

            <TouchableOpacity
              style={[styles.card, showBack && styles.cardFlipped]}
              activeOpacity={0.92}
              onPress={() => setShowBack(!showBack)}
            >
              <Text style={styles.cardLabel}>{showBack ? 'ANSWER' : 'QUESTION'}</Text>
              <Text style={styles.cardText}>
                {showBack ? currentCard!.answer : currentCard!.question}
              </Text>
              <Text style={styles.tapHint}>Tap to flip</Text>
            </TouchableOpacity>

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.navButton} onPress={() => goTo(currentIndex - 1)}>
                <Text style={styles.navButtonText}>← Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navButton} onPress={() => goTo(currentIndex + 1)}>
                <Text style={styles.navButtonText}>Next →</Text>
              </TouchableOpacity>
            </View>

            {showBack && (
              <View style={styles.knowRow}>
                <TouchableOpacity
                  style={[styles.knowButton, styles.learningButton]}
                  onPress={() => markKnown(false)}
                >
                  <Text style={styles.learningText}>Still learning</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.knowButton, styles.knownButton]}
                  onPress={() => markKnown(true)}
                >
                  <Text style={styles.knownText}>I know this ✓</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  knownLabel: { ...typography.caption, color: colors.success, fontWeight: '700' },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill },

  card: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    minHeight: 230,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadow(3),
  },
  cardFlipped: { backgroundColor: colors.primaryDark },
  cardLabel: {
    ...typography.micro,
    color: colors.onPrimaryMuted,
    letterSpacing: 1.4,
    marginBottom: spacing.md,
  },
  cardText: {
    color: colors.onPrimary,
    fontSize: 19,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 27,
  },
  tapHint: { ...typography.micro, color: 'rgba(255,255,255,0.55)', marginTop: spacing.lg },

  navRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  navButton: {
    flex: 1,
    ...card(1),
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  navButtonText: { ...typography.bodyStrong, color: colors.primary },

  knowRow: { flexDirection: 'row', gap: spacing.md },
  knowButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  learningButton: { backgroundColor: colors.dangerSoft, borderColor: 'rgba(217,74,74,0.3)' },
  learningText: { ...typography.caption, color: colors.danger, fontWeight: '700' },
  knownButton: { backgroundColor: colors.successSoft, borderColor: 'rgba(31,157,107,0.3)' },
  knownText: { ...typography.caption, color: colors.success, fontWeight: '700' },

  fallbackWrap: { gap: spacing.lg },
  noticeCard: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(224, 160, 18, 0.35)',
    padding: spacing.lg,
  },
  noticeTitle: { ...typography.bodyStrong, color: colors.textPrimary, marginBottom: 4 },
  noticeBody: { ...typography.caption, color: colors.textSecondary, lineHeight: 19 },
  textCard: { ...card(1), padding: spacing.lg },
  fullText: { ...typography.body, color: colors.textSecondary, lineHeight: 23 },
});
