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
import { showAlert } from '../utils/alert';

const SOURCE_ICONS: Record<SourceKind, string> = {
  pdf: '📄',
  word: '📝',
  slides: '📊',
  text: '📃',
  captions: '🎬',
  link: '🔗',
};

const { width } = Dimensions.get('window');

type ServiceView = 'list' | 'reviewer' | 'flashcards' | 'quiz';

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
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

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
    setProcessing(true);
    setProcessingStatus('Fetching the page...');

    try {
      // Fetch now so a bad link fails immediately with a clear reason, and so
      // the saved entry can carry the real page title.
      const { text, title } = await extractTextFromUrl(url);
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
    setProcessing(true);
    setProcessingStatus('Reading PDF...');

    try {
      let cached = await PDFService.getCachedAnalysis(file.id);

      if (!cached) {
        setProcessingStatus('Extracting text and generating study material...');
        cached = await processSource({
          uri: file.uri,
          name: file.name,
          // Older saved items predate `kind`; fall back to the file extension.
          kind: file.kind ?? detectSourceKind(file.name) ?? 'pdf',
        });
        await PDFService.cacheAnalysis(file.id, cached);
      }

      setActiveFile(file);
      setActiveAnalysis(cached.analysis);
      setView(service);
    } catch (error) {
      console.error('Error processing PDF:', error);
      showAlert(
        'Could not process PDF',
        error instanceof Error ? error.message : 'Something went wrong while reading this PDF.'
      );
    } finally {
      setProcessing(false);
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
               selectedService === 'quiz' ? 'Quiz' : 'Selected Service'}
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
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  const ProcessingOverlay = () => (
    <Modal animationType="fade" transparent visible={processing}>
      <View style={styles.processingOverlay}>
        <View style={styles.processingCard}>
          <ActivityIndicator size="large" color="#6b4e9e" />
          <Text style={styles.processingText}>{processingStatus}</Text>
          <Text style={styles.processingSubtext}>This runs entirely on your device — no internet needed.</Text>
        </View>
      </View>
    </Modal>
  );

  if (view === 'reviewer' && activeFile && activeAnalysis) {
    return (
      <ReviewerScreen
        file={activeFile}
        analysis={activeAnalysis}
        onBack={() => setView('list')}
      />
    );
  }

  if (view === 'flashcards' && activeFile && activeAnalysis) {
    return (
      <FlashcardScreen
        fileName={activeFile.name}
        flashcards={activeAnalysis.flashcards}
        onBack={() => setView('list')}
      />
    );
  }

  if (view === 'quiz' && activeFile && activeAnalysis) {
    return (
      <QuizScreen
        fileName={activeFile.name}
        questions={activeAnalysis.quiz}
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
      <ProcessingOverlay />
    </View>
  );
};

const styles = StyleSheet.create({
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    gap: 10,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  orText: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  linkInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#2d3748',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  linkButton: {
    backgroundColor: '#6b4e9e',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 12,
    minWidth: 68,
    alignItems: 'center',
  },
  linkButtonDisabled: {
    backgroundColor: '#c3b3dd',
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  linkHint: {
    fontSize: 11,
    color: '#718096',
    marginTop: 8,
    lineHeight: 16,
  },
  processingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  processingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  processingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginTop: 16,
    textAlign: 'center',
  },
  processingSubtext: {
    fontSize: 12,
    color: '#718096',
    marginTop: 8,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f4ff',
  },
  header: {
    backgroundColor: '#6b4e9e',
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statBoxNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6b4e9e',
  },
  statBoxLabel: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
  },
  statDividerVertical: {
    width: 1,
    height: 40,
    backgroundColor: '#e2e8f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  clearSearch: {
    fontSize: 16,
    color: '#718096',
    padding: 4,
  },
  uploadSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 12,
  },
  fileCount: {
    fontSize: 14,
    color: '#6b4e9e',
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: '#6b4e9e',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  uploadSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 4,
  },
  filesSection: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 20,
  },
  fileList: {
    paddingBottom: 20,
  },
  fileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(107, 78, 158, 0.1)',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fileIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(107, 78, 158, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileIcon: {
    fontSize: 24,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  fileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileMetaText: {
    fontSize: 12,
    color: '#718096',
  },
  fileActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
  },
  actionButton: {
    backgroundColor: 'rgba(107, 78, 158, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  actionButtonText: {
    color: '#6b4e9e',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteButtonText: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    marginHorizontal: 16,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  getStartedButton: {
    backgroundColor: '#6b4e9e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  getStartedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2d3748',
  },
  closeButton: {
    fontSize: 24,
    color: '#718096',
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
  },
  selectedFileInfo: {
    backgroundColor: '#f7fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  selectedFileLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 4,
  },
  selectedFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalActionButton: {
    backgroundColor: '#6b4e9e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});