import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { PdfExtractorHost } from './src/services/nativePdfExtractor';
import { colors, radius, spacing, typography, card, shadow } from './src/theme';

const services = [
  {
    name: 'Reviewer',
    icon: '📝',
    accent: colors.accentReviewer,
    description:
      'Turn any document into a clean study guide: a ranked summary of the key points, the main topics pulled out, and the full text kept a tap away.',
    features: ['Key-point summary', 'Topic extraction', 'Full text'],
  },
  {
    name: 'Flashcards',
    icon: '🎴',
    accent: colors.accentFlashcards,
    description:
      'Automatic question-and-answer cards built from definitions and key facts in your material. Flip through them and mark what you already know.',
    features: ['Auto-generated', 'Flip to reveal', 'Progress tracking'],
  },
  {
    name: 'Quiz',
    icon: '📊',
    accent: colors.accentQuiz,
    description:
      'Multiple-choice questions drawn from your own material, with instant right/wrong feedback, a running score and a full review at the end.',
    features: ['Multiple choice', 'Instant feedback', 'Answer review'],
  },
  {
    name: 'Learning Map',
    icon: '🗺️',
    accent: colors.accentMap,
    description:
      'See how the main ideas connect. Concepts that appear together are linked, and topics that stand alone are flagged as possible gaps.',
    features: ['Concept graph', 'Tap for context', 'Gap detection'],
  },
];

const App = () => {
  const [showHome, setShowHome] = useState(false);

  if (showHome) {
    return (
      <SafeAreaProvider>
        {/* Hidden WebView that runs pdf.js offline on iOS/Android. */}
        {Platform.OS !== 'web' && <PdfExtractorHost />}
        <SafeAreaView style={styles.flex} edges={['top']}>
          <HomeScreen onNavigateToLanding={() => setShowHome(false)} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>IDF Reviewer</Text>
            <Text style={styles.heroSubtitle}>
              Turn any document or web page into study material
            </Text>

            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Free forever</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Works offline</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>No ads</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => setShowHome(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.heroButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formats}>
            <Text style={styles.formatsLabel}>Works with</Text>
            <View style={styles.formatRow}>
              {['PDF', 'Word', 'PowerPoint', 'Text', 'Captions', 'Web links'].map((f) => (
                <View key={f} style={styles.formatChip}>
                  <Text style={styles.formatChipText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What you get</Text>
            <Text style={styles.sectionSubtitle}>
              Every tool below is generated from whatever you upload
            </Text>
          </View>

          <View style={styles.cards}>
            {services.map((service) => (
              <TouchableOpacity
                key={service.name}
                style={styles.card}
                onPress={() => setShowHome(true)}
                activeOpacity={0.9}
              >
                <View style={[styles.cardStripe, { backgroundColor: service.accent }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardHead}>
                    <View
                      style={[styles.cardIcon, { backgroundColor: `${service.accent}1f` }]}
                    >
                      <Text style={styles.cardIconText}>{service.icon}</Text>
                    </View>
                    <Text style={styles.cardTitle}>{service.name}</Text>
                  </View>

                  <Text style={styles.cardDescription}>{service.description}</Text>

                  <View style={styles.featureRow}>
                    {service.features.map((feature) => (
                      <View key={feature} style={styles.featureTag}>
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ready when you are</Text>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={() => setShowHome(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.footerButtonText}>Start studying →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxxl },

  hero: {
    backgroundColor: colors.primary,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    borderBottomLeftRadius: radius.xl + 8,
    borderBottomRightRadius: radius.xl + 8,
    ...shadow(2),
  },
  heroTitle: {
    ...typography.display,
    color: colors.onPrimary,
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.onPrimaryMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 340,
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  badgeText: { ...typography.micro, color: colors.onPrimary },
  heroButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.pill,
    marginTop: spacing.xl,
    ...shadow(2),
  },
  heroButtonText: { ...typography.subheading, color: colors.primary },

  formats: { paddingHorizontal: spacing.xl, marginTop: spacing.xl, alignItems: 'center' },
  formatsLabel: { ...typography.micro, color: colors.textMuted, marginBottom: spacing.md },
  formatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  formatChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  formatChipText: { ...typography.micro, color: colors.textSecondary },

  section: { marginTop: spacing.xxl, paddingHorizontal: spacing.xl },
  sectionTitle: { ...typography.title, color: colors.textPrimary, textAlign: 'center' },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  cards: { paddingHorizontal: spacing.lg, marginTop: spacing.xl, gap: spacing.lg },
  card: {
    ...card(1),
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cardStripe: { width: 5 },
  cardBody: { flex: 1, padding: spacing.xl },
  cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardIconText: { fontSize: 22 },
  cardTitle: { ...typography.heading, color: colors.textPrimary },
  cardDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  featureTag: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  featureText: { ...typography.micro, color: colors.textSecondary, fontWeight: '500' },

  footer: {
    backgroundColor: colors.primaryDark,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    padding: spacing.xxl,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  footerText: { ...typography.subheading, color: colors.onPrimary, marginBottom: spacing.lg },
  footerButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  footerButtonText: { ...typography.bodyStrong, color: colors.primary },
});

export default App;
