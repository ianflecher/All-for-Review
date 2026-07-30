export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  createdAt: Date;
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  createdAt: Date;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
}

export interface DocumentAnalysis {
  summary: string[];
  keywords: string[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  wordCount: number;
}

export interface PDFDocument {
  id: string;
  name: string;
  text: string;
  flashcards: Flashcard[];
  createdAt: Date;
}

export type SourceKind = 'pdf' | 'word' | 'slides' | 'text' | 'captions' | 'link';

export interface FileItem {
  id: string;
  name: string;
  /** Local file URI for documents, or the page address for `link` sources. */
  uri: string;
  size?: number;
  uploadedAt: string;
  /** Legacy field kept for previously saved items; `kind` is authoritative. */
  type: string;
  kind?: SourceKind;
}

// For JSON serialization/deserialization
export interface PDFDocumentJSON {
  id: string;
  name: string;
  text: string;
  flashcards: FlashcardJSON[];
  createdAt: string;
}

export interface FlashcardJSON {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
}