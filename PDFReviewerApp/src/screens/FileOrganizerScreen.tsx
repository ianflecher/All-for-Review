import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { FileItem, SourceKind } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { FormModal, Field, ChipRow } from '../components/FormModal';
import { colors, radius, spacing, typography, card } from '../theme';
import { showAlert } from '../utils/alert';
import { useAndroidBack } from '../utils/useAndroidBack';
import { loadJson, saveJson, removeJson, STORAGE_KEYS } from '../utils/storage';
import { deleteStoredFile } from '../services/fileStore';
import { detectSourceKind, sourceKindLabel } from '../services/sourceService';

interface FileOrganizerScreenProps {
  onBack: () => void;
}

const UNSORTED = 'Unsorted';
const DEFAULT_SUBJECTS = ['Math', 'Science', 'English', 'Filipino', 'History', 'Research'];

const SOURCE_ICONS: Record<SourceKind, string> = {
  pdf: '📄',
  word: '📝',
  slides: '📊',
  text: '📃',
  captions: '🎬',
  link: '🔗',
};

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

/**
 * Sorts documents into subject folders.
 *
 * Works on the same `uploadedFiles` entry the documents screen reads, so a file
 * filed here shows the same subject there, and vice versa.
 */
export const FileOrganizerScreen: React.FC<FileOrganizerScreenProps> = ({ onBack }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<FileItem | null>(null);
  const [chosenSubject, setChosenSubject] = useState(UNSORTED);
  const [newSubject, setNewSubject] = useState('');

  useEffect(() => {
    loadJson<FileItem[]>(STORAGE_KEYS.files, []).then(setFiles);
  }, []);

  const persist = useCallback((next: FileItem[]) => {
    setFiles(next);
    saveJson(STORAGE_KEYS.files, next);
  }, []);

  const closeAssign = useCallback(() => {
    setAssigning(null);
    setNewSubject('');
  }, []);

  useAndroidBack(
    useCallback(() => {
      if (assigning) {
        closeAssign();
        return true;
      }
      if (activeSubject) {
        setActiveSubject(null);
        return true;
      }
      onBack();
      return true;
    }, [assigning, closeAssign, activeSubject, onBack])
  );

  const subjectOptions = useMemo(() => {
    const used = files.map((file) => file.subject).filter((s): s is string => !!s);
    return Array.from(new Set([...used, ...DEFAULT_SUBJECTS]));
  }, [files]);

  /** Folder list with counts, "Unsorted" pinned last so it never buries real subjects. */
  const folders = useMemo(() => {
    const counts = new Map<string, number>();
    for (const file of files) {
      const key = file.subject || UNSORTED;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => {
        if (a[0] === UNSORTED) return 1;
        if (b[0] === UNSORTED) return -1;
        return a[0].localeCompare(b[0]);
      })
      .map(([name, count]) => ({ name, count }));
  }, [files]);

  const visibleFiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return files
      .filter((file) => (activeSubject ? (file.subject || UNSORTED) === activeSubject : true))
      .filter((file) => (query ? file.name.toLowerCase().includes(query) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [files, activeSubject, search]);

  const openAssign = (file: FileItem) => {
    setAssigning(file);
    setChosenSubject(file.subject || UNSORTED);
    setNewSubject('');
  };

  const applySubject = () => {
    if (!assigning) return;
    const target = newSubject.trim() || chosenSubject;
    persist(
      files.map((file) =>
        file.id === assigning.id
          ? { ...file, subject: target === UNSORTED ? undefined : target }
          : file
      )
    );
    closeAssign();
  };

  const remove = (file: FileItem) => {
    showAlert('Delete document', `Remove "${file.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          persist(files.filter((f) => f.id !== file.id));
          // Drop the stored copy and the cached summary, so deleting really
          // frees the space rather than just hiding the row.
          deleteStoredFile(file.uri);
          removeJson(`analysis_${file.id}`);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="File Organizer"
        subtitle={activeSubject ?? 'All documents'}
        onBack={activeSubject ? () => setActiveSubject(null) : onBack}
        accent={colors.accentFlashcards}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {files.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🗂️</Text>
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptyText}>
              Upload a document from the Study Materials screen first. Anything you add there shows
              up here, ready to be filed under a subject.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search documents…"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text style={styles.searchClear}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>SUBJECTS</Text>
            <View style={styles.folderGrid}>
              <TouchableOpacity
                style={[styles.folder, activeSubject === null && styles.folderActive]}
                onPress={() => setActiveSubject(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.folderIcon}>📚</Text>
                <Text
                  style={[styles.folderName, activeSubject === null && styles.folderNameActive]}
                  numberOfLines={1}
                >
                  All
                </Text>
                <Text
                  style={[styles.folderCount, activeSubject === null && styles.folderCountActive]}
                >
                  {files.length}
                </Text>
              </TouchableOpacity>

              {folders.map((folder) => {
                const active = activeSubject === folder.name;
                return (
                  <TouchableOpacity
                    key={folder.name}
                    style={[styles.folder, active && styles.folderActive]}
                    onPress={() => setActiveSubject(active ? null : folder.name)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.folderIcon}>
                      {folder.name === UNSORTED ? '📥' : '📁'}
                    </Text>
                    <Text
                      style={[styles.folderName, active && styles.folderNameActive]}
                      numberOfLines={1}
                    >
                      {folder.name}
                    </Text>
                    <Text style={[styles.folderCount, active && styles.folderCountActive]}>
                      {folder.count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>
              {visibleFiles.length} {visibleFiles.length === 1 ? 'DOCUMENT' : 'DOCUMENTS'}
            </Text>

            {visibleFiles.length === 0 ? (
              <Text style={styles.noMatch}>Nothing matches that search.</Text>
            ) : (
              visibleFiles.map((file) => {
                const kind: SourceKind = file.kind ?? detectSourceKind(file.name) ?? 'pdf';
                return (
                  <View key={file.id} style={styles.fileRow}>
                    <Text style={styles.fileIcon}>{SOURCE_ICONS[kind]}</Text>
                    <TouchableOpacity
                      style={styles.fileBody}
                      onPress={() => openAssign(file)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.fileName} numberOfLines={2}>
                        {file.name}
                      </Text>
                      <Text style={styles.fileMeta} numberOfLines={1}>
                        {sourceKindLabel(kind)}
                        {file.size ? ` · ${formatSize(file.size)}` : ''} · {file.uploadedAt}
                      </Text>
                      <View style={styles.subjectPill}>
                        <Text style={styles.subjectPillText}>
                          {file.subject ? `📁 ${file.subject}` : '📥 Tap to file'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(file)} style={styles.deleteButton}>
                      <Text style={styles.deleteText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <FormModal
        visible={assigning !== null}
        title="File under a subject"
        submitLabel="Save"
        onSubmit={applySubject}
        onClose={closeAssign}
      >
        <Text style={styles.assignName} numberOfLines={2}>
          {assigning?.name}
        </Text>
        <ChipRow
          label="SUBJECT"
          options={[UNSORTED, ...subjectOptions]}
          selected={chosenSubject}
          onSelect={(option) => {
            setChosenSubject(option);
            setNewSubject('');
          }}
        />
        <Field
          label="OR TYPE A NEW SUBJECT"
          value={newSubject}
          onChangeText={setNewSubject}
          placeholder="e.g. Chemistry"
          autoCapitalize="words"
        />
      </FormModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  searchBar: {
    ...card(1),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  searchIcon: { fontSize: 14, marginRight: spacing.sm },
  searchInput: { flex: 1, paddingVertical: spacing.md, ...typography.body, color: colors.textPrimary },
  searchClear: { fontSize: 14, color: colors.textMuted, padding: spacing.xs },

  sectionTitle: {
    ...typography.micro,
    color: colors.textSecondary,
    letterSpacing: 0.4,
    marginBottom: spacing.md,
  },

  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xxl },
  folder: {
    ...card(1),
    width: '30%',
    flexGrow: 1,
    minWidth: 96,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  folderActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  folderIcon: { fontSize: 22, marginBottom: 4 },
  folderName: { ...typography.micro, color: colors.textPrimary, textAlign: 'center' },
  folderNameActive: { color: colors.onPrimary },
  folderCount: { ...typography.micro, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
  folderCountActive: { color: colors.onPrimaryMuted },

  fileRow: {
    ...card(1),
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  fileIcon: { fontSize: 20, marginRight: spacing.md, marginTop: 2 },
  fileBody: { flex: 1 },
  fileName: { ...typography.bodyStrong, color: colors.textPrimary },
  fileMeta: { ...typography.micro, color: colors.textMuted, fontWeight: '400', marginTop: 3 },
  subjectPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.sm,
  },
  subjectPillText: { ...typography.micro, color: colors.primary },
  deleteButton: { paddingLeft: spacing.sm, paddingVertical: spacing.xs },
  deleteText: { fontSize: 13 },

  noMatch: { ...typography.caption, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },

  assignName: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: spacing.lg },
  emptyIcon: { fontSize: 46, marginBottom: spacing.md, opacity: 0.5 },
  emptyTitle: { ...typography.subheading, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
