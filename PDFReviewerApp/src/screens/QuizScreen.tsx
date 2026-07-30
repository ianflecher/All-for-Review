import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { QuizQuestion } from '../types';

interface QuizScreenProps {
  fileName: string;
  questions: QuizQuestion[];
  onBack: () => void;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({ fileName, questions, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [finished, setFinished] = useState(false);

  const hasQuestions = questions.length > 0;
  const question = hasQuestions ? questions[currentIndex] : null;

  const selectOption = (optionIndex: number) => {
    if (selected !== null) return;
    setSelected(optionIndex);
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = optionIndex;
      return next;
    });
  };

  const nextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSelected(answers[currentIndex + 1] ?? null);
  };

  const restart = () => {
    setCurrentIndex(0);
    setSelected(null);
    setAnswers(questions.map(() => null));
    setFinished(false);
  };

  const score = answers.reduce<number>(
    (total, ans, idx) => total + (ans !== null && ans === questions[idx]?.correctAnswer ? 1 : 0),
    0
  );

  if (!hasQuestions) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quiz</Text>
          <View style={styles.placeholderButton} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No Quiz Available</Text>
          <Text style={styles.emptyText}>
            We couldn't find enough content in this PDF to build a quiz.
          </Text>
        </View>
      </View>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quiz Results</Text>
          <View style={styles.placeholderButton} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.fileName} numberOfLines={1}>
            {fileName}
          </Text>
          <View style={styles.resultCard}>
            <Text style={styles.resultScore}>
              {score} / {questions.length}
            </Text>
            <Text style={styles.resultPct}>{pct}% correct</Text>
          </View>

          {questions.map((q, idx) => {
            const userAnswer = answers[idx];
            const isCorrect = userAnswer === q.correctAnswer;
            return (
              <View key={q.id} style={styles.reviewCard}>
                <Text style={styles.reviewQuestion}>{idx + 1}. {q.text}</Text>
                <Text style={isCorrect ? styles.reviewCorrect : styles.reviewIncorrect}>
                  {isCorrect ? '✓ Correct' : `✗ Your answer: ${userAnswer !== null ? q.options[userAnswer] : '(skipped)'}`}
                </Text>
                {!isCorrect && (
                  <Text style={styles.reviewAnswer}>Correct answer: {q.options[q.correctAnswer]}</Text>
                )}
              </View>
            );
          })}

          <TouchableOpacity style={styles.restartButton} onPress={restart}>
            <Text style={styles.restartButtonText}>Retake Quiz</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quiz</Text>
        <View style={styles.placeholderButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.fileName} numberOfLines={1}>
          {fileName}
        </Text>
        <Text style={styles.progressText}>
          Question {currentIndex + 1} of {questions.length}
        </Text>

        <Text style={styles.question}>{question!.text}</Text>

        {question!.options.map((opt, idx) => {
          const isSelected = selected === idx;
          const isCorrectOption = idx === question!.correctAnswer;
          const showState = selected !== null;

          let optionStyle = styles.option;
          if (showState && isCorrectOption) optionStyle = { ...styles.option, ...styles.correctOption };
          else if (showState && isSelected && !isCorrectOption)
            optionStyle = { ...styles.option, ...styles.wrongOption };

          return (
            <TouchableOpacity key={idx} style={optionStyle} onPress={() => selectOption(idx)}>
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          );
        })}

        {selected !== null && (
          <TouchableOpacity style={styles.nextButton} onPress={nextQuestion}>
            <Text style={styles.nextButtonText}>
              {currentIndex + 1 >= questions.length ? 'See Results →' : 'Next Question →'}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.scoreText}>Score so far: {score}</Text>
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
  content: { padding: 20 },
  fileName: { fontSize: 14, fontWeight: '600', color: '#718096', marginBottom: 4 },
  progressText: { fontSize: 13, color: '#6b4e9e', fontWeight: '600', marginBottom: 16 },
  question: { fontSize: 20, fontWeight: '700', color: '#2d3748', marginBottom: 20, lineHeight: 27 },
  option: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  correctOption: { backgroundColor: '#dcfce7', borderColor: '#22c55e' },
  wrongOption: { backgroundColor: '#fee2e2', borderColor: '#ef4444' },
  optionText: { color: '#2d3748', fontSize: 15, fontWeight: '500' },
  nextButton: {
    backgroundColor: '#6b4e9e',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  scoreText: { fontSize: 13, color: '#718096', marginTop: 20, textAlign: 'center' },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  resultScore: { fontSize: 36, fontWeight: '800', color: '#6b4e9e' },
  resultPct: { fontSize: 14, color: '#718096', marginTop: 6 },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  reviewQuestion: { fontSize: 14, fontWeight: '600', color: '#2d3748', marginBottom: 6 },
  reviewCorrect: { fontSize: 13, color: '#22c55e', fontWeight: '600' },
  reviewIncorrect: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  reviewAnswer: { fontSize: 13, color: '#718096', marginTop: 4 },
  restartButton: {
    backgroundColor: '#6b4e9e',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  restartButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 64, marginBottom: 16, opacity: 0.5 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#2d3748', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#718096', textAlign: 'center', paddingHorizontal: 20 },
});
