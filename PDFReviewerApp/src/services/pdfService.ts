import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as pdfjsLib from 'pdfjs-dist';
import { analyzeDocument } from '../utils/textAnalysis';
import { DocumentAnalysis } from '../types';
import { extractTextNative } from './nativePdfExtractor';

let workerConfigured = false;
function configureWebWorker() {
  if (workerConfigured) return;
  // Served locally from the /public folder -> fully offline, no CDN required.
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  workerConfigured = true;
}

export class PDFService {
  static async pickPDF(): Promise<DocumentPicker.DocumentPickerResult | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        return result;
      }
      return null;
    } catch (error) {
      console.error('Error picking PDF:', error);
      return null;
    }
  }

  static async extractTextFromPDF(uri: string): Promise<string> {
    if (Platform.OS === 'web') {
      // expo-file-system has no real implementation on web (browsers can't
      // read arbitrary local paths), so we read the picked file's blob: URI
      // directly via fetch() instead.
      const bytes = await this.readBytesWeb(uri);
      return this.extractTextWeb(bytes);
    }

    // expo-file-system's modern API dropped readAsStringAsync; it now lives
    // under the /legacy entry point on native platforms.
    const FileSystem = await import('expo-file-system/legacy');
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    });
    return extractTextNative(base64);
  }

  private static async readBytesWeb(uri: string): Promise<Uint8Array> {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Could not read the selected file (HTTP ${response.status}).`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  private static async extractTextWeb(bytes: Uint8Array): Promise<string> {
    configureWebWorker();

    const loadingTask = (pdfjsLib as any).getDocument({ data: bytes });
    const pdf = await loadingTask.promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }

    if (fullText.trim().length === 0) {
      throw new Error(
        'No selectable text was found in this PDF. It may be a scanned/image-based document.'
      );
    }

    return fullText;
  }

  /** Extract text and run the offline summary/flashcard/quiz analysis in one step. */
  static async processPDF(uri: string): Promise<{ text: string; analysis: DocumentAnalysis }> {
    const text = await this.extractTextFromPDF(uri);
    const analysis = analyzeDocument(text);
    return { text, analysis };
  }

  static async cacheAnalysis(fileId: string, data: { text: string; analysis: DocumentAnalysis }) {
    try {
      const key = `analysis_${fileId}`;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(data));
      } else {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        await AsyncStorage.setItem(key, JSON.stringify(data));
      }
    } catch (e) {
      console.warn('Could not cache analysis:', e);
    }
  }

  static async getCachedAnalysis(
    fileId: string
  ): Promise<{ text: string; analysis: DocumentAnalysis } | null> {
    try {
      const key = `analysis_${fileId}`;
      let raw: string | null = null;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        raw = window.localStorage.getItem(key);
      } else {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        raw = await AsyncStorage.getItem(key);
      }
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Could not read cached analysis:', e);
      return null;
    }
  }
}
