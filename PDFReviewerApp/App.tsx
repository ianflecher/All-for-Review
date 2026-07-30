import React, { useState } from 'react';
import { StyleSheet, StatusBar, Text, TouchableOpacity, View, ScrollView, Dimensions, Platform } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { PdfExtractorHost } from './src/services/nativePdfExtractor';

const { width } = Dimensions.get('window');

const services = [
  { 
    name: 'Reviewer Maker', 
    icon: '📝',
    description: 'Create comprehensive academic reviewers with our intuitive tool. Customize layouts, add images, format text, and organize content into chapters. Perfect for studying complex topics and creating study guides that actually work for you.',
    features: ['Custom templates', 'Rich text editing', 'Image support', 'Export options']
  },
  { 
    name: 'Flashcards', 
    icon: '🎴',
    description: 'Master any subject with our smart flashcard system. Create digital flashcards with text, images, and audio. Use spaced repetition algorithms to optimize your learning and retain information longer. Track your progress and focus on what you need to learn most.',
    features: ['Spaced repetition', 'Progress tracking', 'Audio support', 'Mobile sync']
  },
  { 
    name: 'Quizzes', 
    icon: '📊',
    description: 'Test your knowledge with customizable quizzes. Choose from multiple choice, true/false, fill-in-the-blank, or essay questions. Track your scores, review incorrect answers, and see detailed analytics on your strengths and weaknesses.',
    features: ['Multiple question types', 'Detailed analytics', 'Timed mode', 'Practice tests']
  },
  { 
    name: 'Learning Map', 
    icon: '🗺️',
    description: 'Visualize your learning journey with interactive concept maps. Connect related topics, identify knowledge gaps, and see how different subjects relate to each other. Perfect for understanding complex systems and preparing for comprehensive exams.',
    features: ['Interactive diagrams', 'Concept connections', 'Progress visualization', 'Custom paths']
  },
];

const App = () => {
  const [showHome, setShowHome] = useState(false);

  if (showHome) {
    // Pass the navigation function to go back to landing page
    return (
      <>
        {Platform.OS !== 'web' && <PdfExtractorHost />}
        <HomeScreen onNavigateToLanding={() => setShowHome(false)} />
      </>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>IDF Reviewer</Text>
            <Text style={styles.heroSubtitle}>
              Your All-in-One Academic Companion
            </Text>
            <View style={styles.heroBadge}>
              <Text style={styles.badgeText}>100% FREE • No Ads • Forever Free</Text>
            </View>
          </View>

          {/* Description Section */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.mainDescription}>
              Transform the way you study with our comprehensive suite of learning tools. 
              Every reviewer you need for your academic success, completely free and always 
              will be. Join thousands of students who have revolutionized their study habits 
              with IDF Reviewer.
            </Text>
          </View>

          {/* Services Section */}
          <View style={styles.servicesHeader}>
            <Text style={styles.sectionTitle}>Our Services</Text>
            <Text style={styles.sectionSubtitle}>
              Choose the tool that fits your learning style
            </Text>
          </View>

          <View style={styles.cardsContainer}>
            {services.map((service, index) => (
              <TouchableOpacity
                key={index}
                style={styles.card}
                onPress={() => setShowHome(true)}
                activeOpacity={0.9}
              >
                <View style={styles.cardIconContainer}>
                  <Text style={styles.cardIcon}>{service.icon}</Text>
                </View>
                <Text style={styles.cardTitle}>{service.name}</Text>
                <Text style={styles.cardDescription}>{service.description}</Text>
                <View style={styles.featuresContainer}>
                  {service.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureTag}>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.tryNowText}>Try Now →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Footer Section */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Start your journey to academic excellence today
            </Text>
            <TouchableOpacity 
              style={styles.footerButton}
              onPress={() => setShowHome(true)}
            >
              <Text style={styles.footerButtonText}>Get Started Free</Text>
              <Text style={styles.footerButtonArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f4ff',
  },
  scrollContainer: {
    paddingBottom: 30,
  },
  heroSection: {
    backgroundColor: '#6b4e9e',
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  heroBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    marginTop: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 3,
  },
  mainDescription: {
    fontSize: 16,
    color: '#4a5568',
    lineHeight: 24,
    textAlign: 'center',
  },
  servicesHeader: {
    marginTop: 30,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2d3748',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  cardsContainer: {
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(107, 78, 158, 0.1)',
  },
  cardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(107, 78, 158, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardIcon: {
    fontSize: 32,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 15,
    color: '#4a5568',
    lineHeight: 22,
    marginBottom: 15,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    gap: 8,
  },
  featureTag: {
    backgroundColor: 'rgba(107, 78, 158, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featureText: {
    fontSize: 12,
    color: '#6b4e9e',
    fontWeight: '500',
  },
  cardFooter: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 15,
  },
  tryNowText: {
    fontSize: 15,
    color: '#6b4e9e',
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#6b4e9e',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  footerButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    gap: 10,
  },
  footerButtonText: {
    fontSize: 16,
    color: '#6b4e9e',
    fontWeight: '600',
  },
  footerButtonArrow: {
    fontSize: 18,
    color: '#6b4e9e',
    fontWeight: '600',
  },
});

export default App;