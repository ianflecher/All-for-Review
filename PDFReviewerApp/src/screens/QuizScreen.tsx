import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { QuizQuestion } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius, spacing, typography, card, shadow } from '../theme';

interface QuizScreenProps {
  fileName: string;
  questions: QuizQuestion[];
  /** Shown when no questions could be generated. */
  fallbackText?: string;
  onBack: () => void;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({
  fileName,
  questions,
  fallbackText,
  onBack,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [finished, setFinished] = useState(false);

  const hasQuestions = questions.length > 0;
  const question = hasQuestions ? questions[currentIndex] : null;

  const score = answers.reduce<number>(
    (total, ans, idx) => total + (ans !== null && ans === questions[idx]?.correctAnswer ? 1 : 0),
    0
  );

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

  if (!hasQuestions) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Quiz" subtitle={fileName} onBack={onBack} accent={colors.accentQuiz} />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>No quiz could be made</Text>
            <Text style={styles.noticeBody}>
              There wasn't enough structured content to build multiple-choice questions. The
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
        </ScrollView>
      </View>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Results"
          subtitle={fileName}
          onBack={onBack}
          accent={colors.accentQuiz}
        />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.resultCard}>
            <Text style={styles.resultScore}>
              {score}/{questions.length}
            </Text>
            <Text style={styles.resultPct}>{pct}% correct</Text>
          </View>

          {questions.map((q, idx) => {
            const userAnswer = answers[idx];
            const isCorrect = userAnswer === q.correctAnswer;
            return (
              <View key={q.id} style={styles.reviewCard}>
                <Text style={styles.reviewQuestion}>
                  {idx + 1}. {q.text}
                </Text>
                <Text style={isCorrect ? styles.reviewCorrect : styles.reviewIncorrect}>
                  {isCorrect
                    ? '✓ Correct'
                    : `✗ You chose: ${userAnswer !== null ? q.options[userAnswer] : '(skipped)'}`}
                </Text>
                {!isCorrect && (
                  <Text style={styles.reviewAnswer}>Answer: {q.options[q.correctAnswer]}</Text>
                )}
              </View>
            );
          })}

          <TouchableOpacity style={styles.primaryButton} onPress={restart}>
            <Text style={styles.primaryButtonText}>Retake Quiz</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Quiz" subtitle={fileName} onBack={onBack} accent={colors.accentQuiz} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            Question {currentIndex + 1} of {questions.length}
          </Text>
          <Text style={styles.scoreLabel}>Score {score}</Text>
        </View>
        <View style={styles.track}>
          <View
            style={[styles.fill, { width: `${((currentIndex + 1) / questions.length) * 100}%` }]}
          />
        </View>

        <Text style={styles.question}>{question!.text}</Text>

        {question!.options.map((opt, idx) => {
          const isSelected = selected === idx;
          const isCorrectOption = idx === question!.correctAnswer;
          const revealed = selected !== null;

          const optionStyle: StyleProp<ViewStyle>[] = [styles.option];
          const textStyle: StyleProp<TextStyle>[] = [styles.optionText];
          if (revealed && isCorrectOption) {
            optionStyle.push(styles.optionCorrect);
            textStyle.push(styles.optionTextCorrect);
          } else if (revealed && isSelected) {
            optionStyle.push(styles.optionWrong);
            textStyle.push(styles.optionTextWrong);
          }

          return (
            <TouchableOpacity
              key={idx}
              style={optionStyle}
              onPress={() => selectOption(idx)}
              activeOpacity={revealed ? 1 : 0.7}
            >
              <Text style={textStyle}>{opt}</Text>
            </TouchableOpacity>
          );
        })}

        {selected !== null && (
          <TouchableOpacity style={styles.primaryButton} onPress={nextQuestion}>
            <Text style={styles.primaryButtonText}>
              {currentIndex + 1 >= questions.length ? 'See Results →' : 'Next Question →'}
            </Text>
          </TouchableOpacity>
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
    marginBottom: spacing.sm,
  },
  progressLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  scoreLabel: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill },

  question: {
    ...typography.title,
    fontSize: 21,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
    lineHeight: 29,
  },
  option: {
    ...card(1),
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  optionCorrect: { backgroundColor: colors.successSoft, borderColor: colors.success },
  optionWrong: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  optionText: { ...typography.body, color: colors.textPrimary, fontWeight: '500' },
  optionTextCorrect: { color: '#14684a', fontWeight: '700' },
  optionTextWrong: { color: '#a5322f', fontWeight: '700' },

  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadow(2),
  },
  primaryButtonText: { ...typography.bodyStrong, color: colors.onPrimary, fontSize: 16 },

  resultCard: {
    ...card(2),
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  resultScore: { fontSize: 40, fontWeight: '800', color: colors.primary },
  resultPct: { ...typography.caption, color: colors.textMuted, marginTop: 4 },

  reviewCard: { ...card(1), padding: spacing.lg, marginBottom: spacing.md },
  reviewQuestion: { ...typography.bodyStrong, color: colors.textPrimary, marginBottom: 6 },
  reviewCorrect: { ...typography.caption, color: colors.success, fontWeight: '700' },
  reviewIncorrect: { ...typography.caption, color: colors.danger, fontWeight: '700' },
  reviewAnswer: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },

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
  textCard: { ...card(1), padding: spacing.lg },
  fullText: { ...typography.body, color: colors.textSecondary, lineHeight: 23 },
});
