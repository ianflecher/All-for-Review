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
import { StatusBar } from 'expo-status-bar';
import { HomeScreen } from './src/screens/HomeScreen';
import { PlannerScreen } from './src/screens/PlannerScreen';
import { WalletScreen } from './src/screens/WalletScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { FileOrganizerScreen } from './src/screens/FileOrganizerScreen';
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

/**
 * Tools that stand on their own, rather than being generated from a document.
 * They keep their own data in local storage and never need a file to open.
 */
const tools: { name: string; icon: string; accent: string; blurb: string; screen: AppScreen }[] = [
  {
    name: 'Planner',
    icon: '🗓️',
    accent: colors.accentReviewer,
    blurb: 'Assignments sorted by deadline, with overdue work pushed to the top.',
    screen: 'planner',
  },
  {
    name: 'Allowance',
    icon: '💰',
    accent: colors.accentQuiz,
    blurb: 'Track what you receive and what you spend, and where it goes.',
    screen: 'wallet',
  },
  {
    name: 'Schedule',
    icon: '⏰',
    accent: colors.accentMap,
    blurb: 'Your weekly timetable, with the next class up front.',
    screen: 'schedule',
  },
  {
    name: 'File Organizer',
    icon: '🗂️',
    accent: colors.accentFlashcards,
    blurb: 'Sort your uploaded documents into subject folders.',
    screen: 'files',
  },
];

type AppScreen = 'landing' | 'documents' | 'planner' | 'wallet' | 'schedule' | 'files';

const App = () => {
  const [screen, setScreen] = useState<AppScreen>('landing');
  const goLanding = () => setScreen('landing');

  if (screen !== 'landing') {
    return (
      <SafeAreaProvider>
        {/* Status bar sits over the light background inset, so it needs dark icons. */}
        <StatusBar style="dark" />
        {/* Hidden WebView that runs pdf.js offline on iOS/Android. Only the
            documents screen extracts PDFs, so it is not mounted elsewhere. */}
        {Platform.OS !== 'web' && screen === 'documents' && <PdfExtractorHost />}
        {/* Android 15 forces edge-to-edge, so the bottom edge is inset too —
            otherwise buttons end up underneath the gesture bar. */}
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          {screen === 'documents' && <HomeScreen onNavigateToLanding={goLanding} />}
          {screen === 'planner' && <PlannerScreen onBack={goLanding} />}
          {screen === 'wallet' && <WalletScreen onBack={goLanding} />}
          {screen === 'schedule' && <ScheduleScreen onBack={goLanding} />}
          {screen === 'files' && <FileOrganizerScreen onBack={goLanding} />}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
              onPress={() => setScreen('documents')}
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
                onPress={() => setScreen('documents')}
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Student tools</Text>
            <Text style={styles.sectionSubtitle}>
              Everyday things that work on their own, with no document needed
            </Text>
          </View>

          <View style={styles.toolGrid}>
            {tools.map((tool) => (
              <TouchableOpacity
                key={tool.name}
                style={styles.toolCard}
                onPress={() => setScreen(tool.screen)}
                activeOpacity={0.9}
              >
                <View style={[styles.toolIcon, { backgroundColor: `${tool.accent}1f` }]}>
                  <Text style={styles.toolIconText}>{tool.icon}</Text>
                </View>
                <Text style={styles.toolTitle}>{tool.name}</Text>
                <Text style={styles.toolBlurb}>{tool.blurb}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ready when you are</Text>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={() => setScreen('documents')}
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

  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  toolCard: {
    ...card(1),
    // Two per row, with the gap taken out of each half.
    width: '48%',
    flexGrow: 1,
    padding: spacing.lg,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  toolIconText: { fontSize: 20 },
  toolTitle: { ...typography.subheading, color: colors.textPrimary, marginBottom: spacing.xs },
  toolBlurb: { ...typography.micro, color: colors.textSecondary, fontWeight: '400', lineHeight: 16 },

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
