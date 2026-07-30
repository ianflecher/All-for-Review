import { Platform } from 'react-native';
import { analyzeDocument } from '../utils/textAnalysis';
import { extractDocxText, extractPptxText } from '../utils/ooxml';
import { parseSubtitles } from '../utils/subtitles';
import { htmlToArticleText, extractPageTitle } from '../utils/htmlToText';
import { DocumentAnalysis } from '../types';
import { PDFService } from './pdfService';

export type SourceKind = 'pdf' | 'word' | 'slides' | 'text' | 'captions' | 'link';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/** File extensions the picker and drag/drop accept, mapped to how we parse them. */
export const SUPPORTED_EXTENSIONS: Record<string, SourceKind> = {
  pdf: 'pdf',
  docx: 'word',
  pptx: 'slides',
  txt: 'text',
  md: 'text',
  csv: 'text',
  srt: 'captions',
  vtt: 'captions',
};

export const PICKER_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/vtt',
  'application/x-subrip',
  '.srt',
  '.vtt',
  '.md',
];

export function detectSourceKind(fileName: string): SourceKind | null {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  return SUPPORTED_EXTENSIONS[ext] ?? null;
}

export function sourceKindLabel(kind: SourceKind): string {
  switch (kind) {
    case 'pdf':
      return 'PDF';
    case 'word':
      return 'Word';
    case 'slides':
      return 'Slides';
    case 'text':
      return 'Text';
    case 'captions':
      return 'Captions';
    case 'link':
      return 'Web page';
  }
}

/** Reads any local file (picked document) into raw bytes, per platform. */
async function readFileBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Could not read the selected file (HTTP ${response.status}).`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  const FileSystem = await import('expo-file-system/legacy');
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes);
}

const VIDEO_HOSTS = /(?:youtube\.com|youtu\.be|facebook\.com|fb\.watch|tiktok\.com|instagram\.com)/i;

function assertNotVideoHost(url: string) {
  if (VIDEO_HOSTS.test(url)) {
    throw new Error(
      'Video links (YouTube, Facebook, TikTok, Instagram) cannot be read directly — these sites ' +
        'block automated access to their transcripts.\n\n' +
        'Instead: open the video, download or copy its captions/transcript, save it as a .srt, ' +
        '.vtt or .txt file, then upload that file here.'
    );
  }
}

/** Fetches a web page and extracts its readable article text. Requires internet. */
export async function extractTextFromUrl(
  rawUrl: string
): Promise<{ text: string; title: string | null }> {
  const url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('Please enter a full web address starting with http:// or https://');
  }

  assertNotVideoHost(url);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en;q=0.9' },
    });
  } catch (e) {
    throw new Error(
      Platform.OS === 'web'
        ? 'Could not load that page. Browsers block reading other websites directly (CORS) — ' +
          'web links work in the mobile and desktop versions of this app.'
        : `Could not reach that page. Check your internet connection.\n\n${
            e instanceof Error ? e.message : ''
          }`
    );
  }

  if (!response.ok) {
    throw new Error(`That page returned an error (HTTP ${response.status}).`);
  }

  const html = await response.text();
  const text = htmlToArticleText(html);

  if (text.trim().length < 200) {
    throw new Error(
      'Not enough readable text was found on that page. It may require signing in, or load its ' +
        'content with JavaScript.'
    );
  }

  return { text, title: extractPageTitle(html) };
}

/** Extracts text from a picked local file, dispatching on its extension. */
export async function extractTextFromFile(uri: string, fileName: string): Promise<string> {
  const kind = detectSourceKind(fileName);

  if (!kind) {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'doc') {
      throw new Error(
        'Old .doc files are not supported. Please open it in Word and save as .docx, then try again.'
      );
    }
    throw new Error(
      `"${ext}" files are not supported yet.\n\nSupported: PDF, Word (.docx), PowerPoint (.pptx), ` +
        'text (.txt, .md, .csv) and captions (.srt, .vtt).'
    );
  }

  if (kind === 'pdf') {
    return PDFService.extractTextFromPDF(uri);
  }

  const bytes = await readFileBytes(uri);

  switch (kind) {
    case 'word':
      return extractDocxText(bytes);
    case 'slides':
      return extractPptxText(bytes);
    case 'captions':
      return parseSubtitles(bytesToString(bytes));
    case 'text': {
      const text = bytesToString(bytes);
      if (text.trim().length === 0) throw new Error('That file is empty.');
      return text;
    }
    default:
      throw new Error('Unsupported file type.');
  }
}

// TEMP-DEBUG-EXPOSE: remove before shipping
if (typeof window !== 'undefined') {
  (window as any).__sourceService = { extractTextFromFile, extractTextFromUrl, detectSourceKind };
}

/** Extract + analyse in one step, for any supported source. */
export async function processSource(source: {
  uri: string;
  name: string;
  kind: SourceKind;
}): Promise<{ text: string; analysis: DocumentAnalysis }> {
  const text =
    source.kind === 'link'
      ? (await extractTextFromUrl(source.uri)).text
      : await extractTextFromFile(source.uri, source.name);

  return { text, analysis: analyzeDocument(text) };
}
