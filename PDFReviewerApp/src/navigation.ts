import { colors } from './theme';

/** Every destination the tab shell can show. */
export type AppScreen =
  | 'home'
  | 'documents'
  | 'planner'
  | 'wallet'
  | 'schedule'
  | 'files'
  | 'profile';

export interface ToolTile {
  key: string;
  label: string;
  icon: string;
  accent: string;
  blurb: string;
  screen: AppScreen;
  /** Generated from an uploaded document, so it opens the documents list. */
  needsDocument?: boolean;
}

/**
 * The home grid. Document-driven tools come first because they are the point
 * of the app; the standalone tools follow.
 */
export const TOOL_TILES: ToolTile[] = [
  {
    key: 'reviewer',
    label: 'Reviewer',
    icon: '📝',
    accent: colors.accentReviewer,
    blurb: 'Summary & key topics',
    screen: 'documents',
    needsDocument: true,
  },
  {
    key: 'flashcards',
    label: 'Flashcards',
    icon: '🎴',
    accent: colors.accentFlashcards,
    blurb: 'Flip to reveal',
    screen: 'documents',
    needsDocument: true,
  },
  {
    key: 'quiz',
    label: 'Quiz',
    icon: '📊',
    accent: colors.accentQuiz,
    blurb: 'Test yourself',
    screen: 'documents',
    needsDocument: true,
  },
  {
    key: 'map',
    label: 'Learning Path',
    icon: '🧭',
    accent: colors.accentMap,
    blurb: 'Easiest to hardest',
    screen: 'documents',
    needsDocument: true,
  },
  {
    key: 'planner',
    label: 'Planner',
    icon: '🗓️',
    accent: colors.accentPlanner,
    blurb: 'Assignments & deadlines',
    screen: 'planner',
  },
  {
    key: 'wallet',
    label: 'Allowance',
    icon: '💰',
    accent: colors.accentWallet,
    blurb: 'Money in and out',
    screen: 'wallet',
  },
  {
    key: 'schedule',
    label: 'Schedule',
    icon: '⏰',
    accent: colors.accentSchedule,
    blurb: 'Weekly timetable',
    screen: 'schedule',
  },
  {
    key: 'files',
    label: 'My Files',
    icon: '🗂️',
    accent: colors.accentFiles,
    blurb: 'Sorted by subject',
    screen: 'files',
  },
];
