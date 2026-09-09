import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Flashcard } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { LongText } from '../components/LongText';
import { loadJson, saveJson } from '../utils/storage';
import {
  CardProgressMap,
  dueCount,
  masteredCount,
  orderByDue,
  recordAnswer,
} from '../utils/spacedRepetition';
import { colors, radius, spacing, typography, card, shadow } from '../theme';

interface FlashcardScreenProps {
  /** Progress is kept per document. */
  fileId: string;
  fileName: string;
  flashcards: Flashcard[];
  /** Shown when no cards could be generated. */
  fallbackText?: string;
  onBack: () => void;
  /** Hand the whole deck to a classmate. */
  onShare?: () => void;
  /** Write the deck out as a CSV Anki can import. */
  onExportAnki?: () => void;
}

export const FlashcardScreen: React.FC<FlashcardScreenProps> = ({
  fileId,
  fileName,
  flashcards,
  fallbackText,
  onBack,
  onShare,
  onExportAnki,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [progressMap, setProgressMap] = useState<CardProgressMap>({});
  const [deck, setDeck] = useState<Flashcard[]>(flashcards);

  const storageKey = `flashcardProgress_${fileId}`;

  useEffect(() => {
    loadJson<CardProgressMap>(storageKey, {}).then((saved) => {
      setProgressMap(saved);
      // Ordered once, when the session starts. Re-sorting after every answer
      // would move the deck under the user's thumb mid-review.
      setDeck(orderByDue(flashcards, saved));
      setCurrentIndex(0);
    });
  }, [storageKey, flashcards]);

  const hasCards = deck.length > 0;
  const currentCard = hasCards ? deck[currentIndex] : null;

  const due = useMemo(() => dueCount(deck, progressMap), [deck, progressMap]);
  const mastered = useMemo(() => masteredCount(deck, progressMap), [deck, progressMap]);

  const goTo = (index: number) => {
    setShowBack(false);
    setCurrentIndex(((index % deck.length) + deck.length) % deck.length);
  };

  const markKnown = (isKnown: boolean) => {
    const card = deck[currentIndex];
    if (card) {
      const next = recordAnswer(progressMap, card.id, isKnown);
      setProgressMap(next);
      saveJson(storageKey, next);
    }
    goTo(currentIndex + 1);
  };

  const progress = hasCards ? (currentIndex + 1) / deck.length : 0;

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
                <LongText text={fallbackText} style={styles.fullText} />
              </View>
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                Card {currentIndex + 1} of {deck.length}
              </Text>
              <Text style={styles.knownLabel}>
                {due} due · {mastered} learned
              </Text>
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
              <Text style={styles.tapHint}>
                {showBack ? 'Tap to flip back' : 'Tap to flip'}
              </Text>
            </TouchableOpacity>

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.navButton} onPress={() => goTo(currentIndex - 1)}>
                <Text style={styles.navButtonText}>← Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navButton} onPress={() => goTo(currentIndex + 1)}>
                <Text style={styles.navButtonText}>Next →</Text>
              </TouchableOpacity>
            </View>

            {(onShare || onExportAnki) && (
              <View style={styles.shareRow}>
                {onShare && (
                  <TouchableOpacity style={styles.shareButton} onPress={onShare} activeOpacity={0.8}>
                    <Text style={styles.shareText}>Send deck</Text>
                  </TouchableOpacity>
                )}
                {onExportAnki && (
                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={onExportAnki}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.shareText}>Export for Anki</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

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

  shareRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  shareButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareText: { ...typography.micro, color: colors.primary, fontWeight: '700' },

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
