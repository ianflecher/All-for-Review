import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, TextStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

interface LongTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
}

/** Characters per page. Small enough that any single node lays out instantly. */
const PAGE_SIZE = 8000;

/**
 * Ends a page on a paragraph break where there is one nearby, otherwise on a
 * space, so text never resumes mid-word. Always returns a position past
 * `from`, which is what stops the paging loop below from spinning.
 */
function pageEnd(text: string, from: number): number {
  const limit = from + PAGE_SIZE;
  if (limit >= text.length) return text.length;

  const paragraph = text.lastIndexOf('\n\n', limit);
  if (paragraph > from + PAGE_SIZE / 2) return paragraph;

  const space = text.lastIndexOf(' ', limit);
  return space > from ? space : limit;
}

/**
 * Reveals a long document a page at a time.
 *
 * A whole extracted document in one <Text> is a single huge Spannable on
 * Android: a 100-page PDF is a few hundred KB of text, and laying that out in
 * one node freezes the screen for seconds and can take the app down with it.
 * So the text is cut into pages, each its own node — one is mounted to start
 * with and the rest arrive on demand, and no single node is ever large enough
 * to be a problem however big the source was.
 */
export const LongText: React.FC<LongTextProps> = ({ text, style }) => {
  const pages = useMemo(() => {
    const trimmed = text.trim();
    const result: string[] = [];
    let from = 0;
    while (from < trimmed.length) {
      const end = pageEnd(trimmed, from);
      result.push(trimmed.slice(from, end));
      from = end;
    }
    return result;
  }, [text]);

  const [visible, setVisible] = useState(1);

  const hasMore = visible < pages.length;
  const remaining = useMemo(
    () => (hasMore ? pages.slice(visible).reduce((total, page) => total + page.length, 0) : 0),
    [pages, visible, hasMore]
  );

  return (
    <View>
      {pages.slice(0, visible).map((page, index) => (
        <Text key={index} style={style} selectable>
          {page}
          {index === visible - 1 && hasMore ? '…' : ''}
        </Text>
      ))}

      {hasMore && (
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setVisible((shown) => shown + 1)}
          activeOpacity={0.7}
        >
          <Text style={styles.moreText}>
            Show more ({remaining.toLocaleString()} characters left)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  moreButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
    alignItems: 'center',
  },
  moreText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
});
