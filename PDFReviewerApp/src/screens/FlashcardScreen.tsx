import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Flashcard } from '../types';

interface FlashcardScreenProps {
  fileName: string;
  flashcards: Flashcard[];
  onBack: () => void;
}

export const FlashcardScreen: React.FC<FlashcardScreenProps> = ({
  fileName,
  flashcards,
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

  const nextCard = () => goTo(currentIndex + 1);
  const prevCard = () => goTo(currentIndex - 1);

  const markKnown = (isKnown: boolean) => {
    setKnown((prev) => {
      const next = new Set(prev);
      if (isKnown) next.add(currentIndex);
      else next.delete(currentIndex);
      return next;
    });
    nextCard();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Flashcards</Text>
        <View style={styles.placeholderButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.fileName} numberOfLines={1}>
          {fileName}
        </Text>

        {!hasCards ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎴</Text>
            <Text style={styles.emptyTitle}>No Flashcards Generated</Text>
            <Text style={styles.emptyText}>
              We couldn't find enough content in this PDF to build flashcards.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                Card {currentIndex + 1} of {flashcards.length}
              </Text>
              <Text style={styles.progressText}>Known: {known.size}</Text>
            </View>

            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => setShowBack(!showBack)}
            >
              <Text style={styles.cardLabel}>{showBack ? 'ANSWER' : 'QUESTION'}</Text>
              <Text style={styles.cardText}>
                {showBack ? currentCard!.answer : currentCard!.question}
              </Text>
              <Text style={styles.tapHint}>Tap card to flip</Text>
            </TouchableOpacity>

            <View style={styles.navRow}>
              <TouchableOpacity style={styles.navButton} onPress={prevCard}>
                <Text style={styles.navButtonText}>← Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navButton} onPress={nextCard}>
                <Text style={styles.navButtonText}>Next →</Text>
              </TouchableOpacity>
            </View>

            {showBack && (
              <View style={styles.knowRow}>
                <TouchableOpacity
                  style={[styles.knowButton, styles.dontKnowButton]}
                  onPress={() => markKnown(false)}
                >
                  <Text style={styles.knowButtonText}>Still Learning</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.knowButton, styles.knowButtonGreen]}
                  onPress={() => markKnown(true)}
                >
                  <Text style={styles.knowButtonText}>I Know This ✓</Text>
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
  container: { flex: 1, backgroundColor: '#f8f4ff' },
  header: {
    backgroundColor: '#6b4e9e',
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  backText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  placeholderButton: { width: 50 },
  content: { padding: 20, alignItems: 'center' },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  progressText: { fontSize: 13, color: '#6b4e9e', fontWeight: '600' },
  card: {
    width: '100%',
    minHeight: 220,
    backgroundColor: '#6b4e9e',
    padding: 30,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 5,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  cardText: { color: '#fff', fontSize: 20, textAlign: 'center', lineHeight: 28 },
  tapHint: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 16 },
  navRow: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 12 },
  navButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#6b4e9e',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  navButtonText: { color: '#6b4e9e', fontSize: 15, fontWeight: '600' },
  knowRow: { flexDirection: 'row', gap: 12, width: '100%' },
  knowButton: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  dontKnowButton: { backgroundColor: '#ef4444' },
  knowButtonGreen: { backgroundColor: '#22c55e' },
  knowButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 64, marginBottom: 16, opacity: 0.5 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#2d3748', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#718096', textAlign: 'center', paddingHorizontal: 20 },
});
