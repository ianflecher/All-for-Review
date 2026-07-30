import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PDFService } from '../services/pdfService';
import {
  processSource,
  detectSourceKind,
  sourceKindLabel,
  extractTextFromUrl,
  PICKER_MIME_TYPES,
} from '../services/sourceService';
import { analyzeDocument } from '../utils/textAnalysis';
import { DocumentAnalysis, FileItem, SourceKind } from '../types';
import { ReviewerScreen } from './Reviewer';
import { FlashcardScreen } from './FlashcardScreen';
import { QuizScreen } from './QuizScreen';
import { LearningMapScreen } from './LearningMapScreen';
import { showAlert } from '../utils/alert';
import { LoadingOverlay, LoadingStep } from '../components/LoadingOverlay';
import { colors, radius, spacing, typography, card, shadow } from '../theme';

const ONLINE_STEPS: LoadingStep[] = [
  { label: 'Connecting to the website', online: true },
  { label: 'Downloading the page', online: true },
  { label: 'Reading the article text' },
  { label: 'Building summary, cards & quiz' },
];

const OFFLINE_STEPS: LoadingStep[] = [
  { label: 'Opening your file' },
  { label: 'Extracting the text' },
  { label: 'Building summary, cards & quiz' },
];

const SOURCE_ICONS: Record<SourceKind, string> = {
  pdf: '📄',
  word: '📝',
  slides: '📊',
  text: '📃',
  captions: '🎬',
  link: '🔗',
};

const { width } = Dimensions.get('window');

type ServiceView = 'list' | 'reviewer' | 'flashcards' | 'quiz' | 'map';

interface HomeScreenProps {
  onNavigateToLanding?: () => void;
}

export const HomeScreen = ({ onNavigateToLanding }: HomeScreenProps) => {
  const [uploadedFiles, setUploadedFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // Active generated-content view (reviewer / flashcards / quiz)
  const [view, setView] = useState<ServiceView>('list');
  const [activeFile, setActiveFile] = useState<FileItem | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<DocumentAnalysis | null>(null);
  const [activeText, setActiveText] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>(OFFLINE_STEPS);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingTitle, setLoadingTitle] = useState('Processing');
  const [loadingDetail, setLoadingDetail] = useState<string | undefined>(undefined);

  // "Add from web link" input
  const [linkUrl, setLinkUrl] = useState('');
  const [addingLink, setAddingLink] = useState(false);

  useEffect(() => {
    loadSavedFiles();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadSavedFiles = async () => {
    try {
      const saved = await AsyncStorage.getItem('uploadedFiles');
      if (saved) {
        setUploadedFiles(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const saveFilesToStorage = async (files: FileItem[]) => {
    try {
      await AsyncStorage.setItem('uploadedFiles', JSON.stringify(files));
    } catch (error) {
      console.error('Error saving files:', error);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const pickDocument = async () => {
    try {
      setLoading(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: PICKER_MIME_TYPES,
        copyToCacheDirectory: true,
      });

      if (res.assets && res.assets[0]) {
        const file = res.assets[0];
        const name = file.name || 'Untitled';
        const kind = detectSourceKind(name);

        if (!kind) {
          const ext = name.split('.').pop()?.toLowerCase() ?? '';
          showAlert(
            'Unsupported file',
            ext === 'doc'
              ? 'Old .doc files are not supported. Please open it in Word and save it as .docx, then try again.'
              : `"${ext}" files are not supported yet.\n\nSupported: PDF, Word (.docx), PowerPoint (.pptx), text (.txt, .md, .csv) and captions (.srt, .vtt).`
          );
          return;
        }

        const newFile: FileItem = {
          id: Date.now().toString(),
          name,
          uri: file.uri,
          size: file.size,
          uploadedAt: new Date().toLocaleString(),
          type: kind,
          kind,
        };

        const updatedFiles = [newFile, ...uploadedFiles];
        setUploadedFiles(updatedFiles);
        await saveFilesToStorage(updatedFiles);

        showAlert(
          'Added!',
          `"${name}" is ready.\n\nTap Reviewer, Flashcards or Quiz to generate study material from it.`,
          [{ text: 'OK', style: 'default' }]
        );
      } else if (res.canceled) {
        console.log('User canceled document picker');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error', 'Failed to open that file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addLink = async () => {
    const url = linkUrl.trim();
    if (url.length === 0) return;

    setAddingLink(true);
    setLoadingTitle('Reading web page');
    setLoadingSteps(ONLINE_STEPS);
    setLoadingDetail(url);
    setLoadingStep(0);
    setProcessing(true);

    try {
      // Fetch now so a bad link fails immediately with a clear reason, and so
      // the saved entry can carry the real page title.
      setLoadingStep(1);
      const { text, title } = await extractTextFromUrl(url);

      setLoadingStep(2);
      // Yield a frame so the step change paints before the heavy analysis.
      await new Promise((r) => setTimeout(r, 60));

      setLoadingStep(3);
      const analysis = analyzeDocument(text);

      const newFile: FileItem = {
        id: Date.now().toString(),
        name: title || url.replace(/^https?:\/\//, '').slice(0, 60),
        uri: url,
        uploadedAt: new Date().toLocaleString(),
        type: 'link',
        kind: 'link',
      };

      const updatedFiles = [newFile, ...uploadedFiles];
      setUploadedFiles(updatedFiles);
      await saveFilesToStorage(updatedFiles);
      await PDFService.cacheAnalysis(newFile.id, { text, analysis });

      setLinkUrl('');
      showAlert('Page added!', `"${newFile.name}" is ready to study.`);
    } catch (error) {
      console.error('Error adding link:', error);
      showAlert(
        'Could not read that link',
        error instanceof Error ? error.message : 'Something went wrong.'
      );
    } finally {
      setAddingLink(false);
      setProcessing(false);
      setLoadingDetail(undefined);
    }
  };

  const deleteFile = (fileId: string) => {
    showAlert(
      'Delete File',
      'Are you sure you want to delete this file?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedFiles = uploadedFiles.filter(f => f.id !== fileId);
            setUploadedFiles(updatedFiles);
            await saveFilesToStorage(updatedFiles);
            showAlert('Deleted', 'File has been removed successfully.');
          },
        },
      ]
    );
  };

  const handleServiceSelect = (service: string, file: FileItem) => {
    setSelectedService(service);
    setSelectedFile(file);
    setModalVisible(true);
  };

  const openService = async (service: ServiceView, file: FileItem) => {
    setModalVisible(false);

    const isLink = (file.kind ?? detectSourceKind(file.name)) === 'link';
    setLoadingTitle(isLink ? 'Reading web page' : 'Preparing your material');
    setLoadingSteps(isLink ? ONLINE_STEPS : OFFLINE_STEPS);
    setLoadingDetail(isLink ? file.uri : file.name);
    setLoadingStep(0);
    setProcessing(true);

    try {
      let cached = await PDFService.getCachedAnalysis(file.id);

      if (!cached) {
        setLoadingStep(1);
        cached = await processSource({
          uri: file.uri,
          name: file.name,
          // Older saved items predate `kind`; fall back to the file extension.
          kind: file.kind ?? detectSourceKind(file.name) ?? 'pdf',
        });
        setLoadingStep(loadingSteps.length - 1);
        await PDFService.cacheAnalysis(file.id, cached);
      }

      setActiveFile(file);
      setActiveAnalysis(cached.analysis);
      setActiveText(cached.text);
      setView(service);
    } catch (error) {
      console.error('Error processing source:', error);
      showAlert(
        'Could not open this material',
        error instanceof Error ? error.message : 'Something went wrong while reading it.'
      );
    } finally {
      setProcessing(false);
      setLoadingDetail(undefined);
    }
  };

  const handleGenerateReviewer = () => {
    if (selectedFile) openService('reviewer', selectedFile);
  };

  const handleCreateFlashcards = () => {
    if (selectedFile) openService('flashcards', selectedFile);
  };

  const handleCreateQuiz = () => {
    if (selectedFile) openService('quiz', selectedFile);
  };

  const handleCreateMap = () => {
    if (selectedFile) openService('map', selectedFile);
  };

  const renderFile = ({ item, index }: { item: FileItem; index: number }) => {
    const kind: SourceKind = item.kind ?? detectSourceKind(item.name) ?? 'pdf';
    return (
    <Animated.View
      style={[
        styles.fileCard,
        {
          transform: [{ scale: fadeAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.fileInfo}>
        <View style={styles.fileIconContainer}>
          <Text style={styles.fileIcon}>{SOURCE_ICONS[kind]}</Text>
        </View>
        <View style={styles.fileDetails}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.fileMeta}>
            <Text style={styles.fileMetaText}>
              {sourceKindLabel(kind)}
              {kind === 'link' ? '' : ` • ${formatFileSize(item.size)}`} • {item.uploadedAt}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.fileActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleServiceSelect('reviewer', item)}
        >
          <Text style={styles.actionButtonText}>Reviewer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleServiceSelect('flashcards', item)}
        >
          <Text style={styles.actionButtonText}>Flashcards</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleServiceSelect('quiz', item)}
        >
          <Text style={styles.actionButtonText}>Quiz</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleServiceSelect('map', item)}
        >
          <Text style={styles.actionButtonText}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteFile(item.id)}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
    );
  };

  const filteredFiles = uploadedFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ServiceModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedService === 'reviewer' ? 'Reviewer Maker' :
               selectedService === 'flashcards' ? 'Flashcards' :
               selectedService === 'quiz' ? 'Quiz' :
               selectedService === 'map' ? 'Learning Map' : 'Selected Service'}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <View style={styles.selectedFileInfo}>
              <Text style={styles.selectedFileLabel}>Selected File:</Text>
              <Text style={styles.selectedFileName}>{selectedFile?.name}</Text>
            </View>
            
            {selectedService === 'reviewer' && (
              <View>
                <Text style={styles.serviceDescription}>
                  Create a comprehensive reviewer from your PDF. We'll extract key concepts, 
                  create summaries, and organize content into study-ready format.
                </Text>
                <TouchableOpacity 
                  style={styles.modalActionButton}
                  onPress={handleGenerateReviewer}
                >
                  <Text style={styles.modalActionButtonText}>Generate Reviewer →</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {selectedService === 'flashcards' && (
              <View>
                <Text style={styles.serviceDescription}>
                  Convert your PDF into interactive flashcards. Our AI will identify key terms 
                  and create questions to help you memorize effectively.
                </Text>
                <TouchableOpacity
                  style={styles.modalActionButton}
                  onPress={handleCreateFlashcards}
                >
                  <Text style={styles.modalActionButtonText}>Create Flashcards →</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedService === 'quiz' && (
              <View>
                <Text style={styles.serviceDescription}>
                  Test yourself with an auto-generated multiple-choice quiz built from the
                  most important facts in your PDF.
                </Text>
                <TouchableOpacity
                  style={styles.modalActionButton}
                  onPress={handleCreateQuiz}
                >
                  <Text style={styles.modalActionButtonText}>Start Quiz →</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedService === 'map' && (
              <View>
                <Text style={styles.serviceDescription}>
                  See how the main ideas in your material connect to each other, and spot
                  the topics that stand alone and may need extra reading.
                </Text>
                <TouchableOpacity
                  style={styles.modalActionButton}
                  onPress={handleCreateMap}
                >
                  <Text style={styles.modalActionButtonText}>Build Learning Map →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  if (view === 'reviewer' && activeFile && activeAnalysis) {
    return (
      <ReviewerScreen
        file={activeFile}
        analysis={activeAnalysis}
        text={activeText}
        onBack={() => setView('list')}
      />
    );
  }

  if (view === 'flashcards' && activeFile && activeAnalysis) {
    return (
      <FlashcardScreen
        fileName={activeFile.name}
        flashcards={activeAnalysis.flashcards}
        fallbackText={activeText}
        onBack={() => setView('list')}
      />
    );
  }

  if (view === 'quiz' && activeFile && activeAnalysis) {
    return (
      <QuizScreen
        fileName={activeFile.name}
        questions={activeAnalysis.quiz}
        fallbackText={activeText}
        onBack={() => setView('list')}
      />
    );
  }

  if (view === 'map' && activeFile) {
    return (
      <LearningMapScreen
        fileName={activeFile.name}
        text={activeText}
        onBack={() => setView('list')}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Clickable Website Name */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerContent}
          onPress={onNavigateToLanding}
          activeOpacity={0.7}
        >
          <Text style={styles.headerTitle}>IDF Reviewer</Text>
          <Text style={styles.headerSubtitle}>← Tap to go back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats Card */}
        {uploadedFiles.length > 0 && (
          <Animated.View style={[styles.statsCard, { opacity: fadeAnim }]}>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxNumber}>{uploadedFiles.length}</Text>
                <Text style={styles.statBoxLabel}>Documents</Text>
              </View>
              <View style={styles.statDividerVertical} />
              <View style={styles.statBox}>
                <Text style={styles.statBoxNumber}>100%</Text>
                <Text style={styles.statBoxLabel}>Free</Text>
              </View>
              <View style={styles.statDividerVertical} />
              <View style={styles.statBox}>
                <Text style={styles.statBoxNumber}>4</Text>
                <Text style={styles.statBoxLabel}>Services</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Search Bar */}
        {uploadedFiles.length > 0 && (
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search files..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearSearch}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Upload Section */}
        <View style={styles.uploadSection}>
          <Text style={styles.sectionTitle}>📤 Add Your Material</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickDocument}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.uploadButtonText}>Upload a Document</Text>
                <Text style={styles.uploadSubtext}>
                  PDF • Word (.docx) • PowerPoint (.pptx) • .txt • .srt/.vtt captions
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or paste a web link</Text>
            <View style={styles.orLine} />
          </View>

          <View style={styles.linkRow}>
            <TextInput
              style={styles.linkInput}
              placeholder="https://example.com/article"
              placeholderTextColor="#999"
              value={linkUrl}
              onChangeText={setLinkUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              onSubmitEditing={addLink}
              returnKeyType="go"
              editable={!addingLink}
            />
            <TouchableOpacity
              style={[styles.linkButton, (addingLink || linkUrl.trim().length === 0) && styles.linkButtonDisabled]}
              onPress={addLink}
              disabled={addingLink || linkUrl.trim().length === 0}
            >
              {addingLink ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.linkButtonText}>Add</Text>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.linkHint}>
            Reads articles and stories from a web page. Video sites (YouTube, Facebook) block
            transcript access — download the captions and upload the .srt/.vtt file instead.
          </Text>
        </View>

        {/* Previously Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <View style={styles.filesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📚 Your Documents</Text>
              <Text style={styles.fileCount}>{uploadedFiles.length} files</Text>
            </View>
            
            {filteredFiles.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🔍</Text>
                <Text style={styles.emptyText}>No files match your search</Text>
              </View>
            ) : (
              <FlatList
                data={filteredFiles}
                keyExtractor={(item) => item.id}
                renderItem={renderFile}
                scrollEnabled={false}
                contentContainerStyle={styles.fileList}
              />
            )}
          </View>
        )}

        {uploadedFiles.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📭</Text>
            <Text style={styles.emptyStateTitle}>Nothing Added Yet</Text>
            <Text style={styles.emptyStateText}>
              Upload a document or paste a web link to get started with our study tools!
            </Text>
            <TouchableOpacity style={styles.getStartedButton} onPress={pickDocument}>
              <Text style={styles.getStartedButtonText}>Get Started →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <ServiceModal />
      <LoadingOverlay
        visible={processing}
        title={loadingTitle}
        steps={loadingSteps}
        activeStep={loadingStep}
        detail={loadingDetail}
      />
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    backgroundColor: colors.primary,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    ...shadow(2),
  },
  headerContent: { alignItems: 'center', paddingHorizontal: spacing.xl },
  headerTitle: { ...typography.title, color: colors.onPrimary },
  headerSubtitle: { ...typography.micro, color: colors.onPrimaryMuted, marginTop: 3, fontWeight: '500' },

  // Stats
  statsCard: {
    ...card(1),
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statBox: { alignItems: 'center', flex: 1 },
  statBoxNumber: { ...typography.subheading, fontSize: 20, color: colors.primary },
  statBoxLabel: { ...typography.micro, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
  statDividerVertical: { width: 1, height: 30, backgroundColor: colors.border },

  // Search
  searchContainer: {
    ...card(1),
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  searchIcon: { fontSize: 15, marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
  },
  clearSearch: { fontSize: 15, color: colors.textMuted, padding: spacing.xs },

  // Upload / link section
  uploadSection: { marginHorizontal: spacing.lg, marginTop: spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.subheading, color: colors.textPrimary, marginBottom: spacing.md },
  fileCount: { ...typography.micro, color: colors.primary },

  uploadButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
    ...shadow(2),
  },
  uploadButtonText: { ...typography.subheading, color: colors.onPrimary, fontSize: 17 },
  uploadSubtext: {
    ...typography.micro,
    color: colors.onPrimaryMuted,
    marginTop: 5,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },

  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { ...typography.micro, color: colors.textMuted, fontWeight: '500' },

  linkRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  linkInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.caption,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
    minWidth: 72,
    alignItems: 'center',
  },
  linkButtonDisabled: { backgroundColor: '#c2b4d9' },
  linkButtonText: { ...typography.bodyStrong, color: colors.onPrimary },
  linkHint: {
    ...typography.micro,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 16,
    fontWeight: '400',
  },

  // File list
  filesSection: { marginHorizontal: spacing.lg, marginTop: spacing.xxl, marginBottom: spacing.xl },
  fileList: { paddingBottom: spacing.lg },
  fileCard: { ...card(1), padding: spacing.lg, marginBottom: spacing.md },
  fileInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  fileIconContainer: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  fileIcon: { fontSize: 20 },
  fileDetails: { flex: 1 },
  fileName: { ...typography.bodyStrong, color: colors.textPrimary, marginBottom: 3 },
  fileMeta: { flexDirection: 'row', alignItems: 'center' },
  fileMetaText: { ...typography.micro, color: colors.textMuted, fontWeight: '400' },

  fileActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionButton: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  actionButtonText: { ...typography.micro, color: colors.primary },
  deleteButton: { backgroundColor: colors.dangerSoft, borderColor: 'rgba(217,74,74,0.25)' },
  deleteButtonText: { fontSize: 13 },

  // Empty states
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    marginHorizontal: spacing.lg,
  },
  emptyStateIcon: { fontSize: 54, marginBottom: spacing.lg, opacity: 0.45 },
  emptyStateTitle: { ...typography.subheading, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyStateText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  getStartedButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    ...shadow(2),
  },
  getStartedButtonText: { ...typography.bodyStrong, color: colors.onPrimary },
  emptyText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },

  // Service modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 36, 55, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    minHeight: 280,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.title, fontSize: 21, color: colors.textPrimary },
  closeButton: { fontSize: 20, color: colors.textMuted, fontWeight: '600', padding: spacing.xs },
  modalBody: { flex: 1 },
  selectedFileInfo: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
  },
  selectedFileLabel: { ...typography.micro, color: colors.textMuted, marginBottom: 3, fontWeight: '500' },
  selectedFileName: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
  serviceDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
  modalActionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    ...shadow(2),
  },
  modalActionButtonText: { ...typography.bodyStrong, color: colors.onPrimary, fontSize: 16 },
});
