import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { DocumentAnalysis, FileItem } from '../types';

interface ReviewerProps {
  file: FileItem;
  analysis: DocumentAnalysis;
  onBack: () => void;
}

export const ReviewerScreen = ({ file, analysis, onBack }: ReviewerProps) => {
  const { summary, keywords, wordCount, flashcards, quiz } = analysis;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviewer</Text>
        <View style={styles.placeholderButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.fileInfoCard}>
          <Text style={styles.fileName}>{file.name}</Text>
          <Text style={styles.statsText}>
            {wordCount.toLocaleString()} words • {summary.length} key points • {flashcards.length}{' '}
            flashcards • {quiz.length} quiz questions
          </Text>
        </View>

        {keywords.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🏷️ Key Topics</Text>
            <View style={styles.keywordsRow}>
              {keywords.map((kw) => (
                <View key={kw} style={styles.keywordChip}>
                  <Text style={styles.keywordText}>{kw}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📝 Summary</Text>
          {summary.length === 0 ? (
            <Text style={styles.emptyText}>
              Not enough text was found in this PDF to build a summary.
            </Text>
          ) : (
            summary.map((sentence, idx) => (
              <View key={idx} style={styles.summaryItem}>
                <Text style={styles.summaryBullet}>{idx + 1}</Text>
                <Text style={styles.summaryText}>{sentence}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f4ff',
  },
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
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  backText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  placeholderButton: {
    width: 50,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  fileInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  fileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 8,
  },
  statsText: {
    fontSize: 13,
    color: '#6b4e9e',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 12,
  },
  keywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordChip: {
    backgroundColor: 'rgba(107, 78, 158, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  keywordText: {
    color: '#6b4e9e',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryItem: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  summaryBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6b4e9e',
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
    overflow: 'hidden',
  },
  summaryText: {
    flex: 1,
    fontSize: 15,
    color: '#4a5568',
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 14,
    color: '#718096',
  },
});
