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

export type SourceKind = 'pdf' | 'word' | 'slides' | 'text' | 'captions' | 'link' | 'photo';

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
  /** Subject folder assigned in the File Organizer. Unset means "Unsorted". */
  subject?: string;
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
/** An assignment or task tracked by the Student Planner. */
export interface Assignment {
  id: string;
  title: string;
  subject: string;
  /** Due date as "YYYY-MM-DD". */
  dueDate: string;
  notes?: string;
  done: boolean;
  createdAt: string;
}

export type TransactionKind = 'income' | 'expense';

/** A single allowance received or amount spent. */
export interface Transaction {
  id: string;
  kind: TransactionKind;
  /** Always positive; `kind` carries the direction. */
  amount: number;
  category: string;
  note?: string;
  /** Date as "YYYY-MM-DD". */
  date: string;
}

/** One recurring class in the weekly timetable. */
export interface ClassSession {
  id: string;
  subject: string;
  /** 0 = Monday, matching DAY_NAMES in utils/datetime. */
  day: number;
  /** 24-hour "HH:MM". */
  start: string;
  end: string;
  room?: string;
  teacher?: string;
}
