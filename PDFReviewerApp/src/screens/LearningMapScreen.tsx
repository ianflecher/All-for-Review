import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { buildConceptMap, findIsolatedConcepts, ConceptNode } from '../utils/conceptMap';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius, spacing, typography, card, shadow } from '../theme';

interface LearningMapScreenProps {
  fileName: string;
  text: string;
  onBack: () => void;
}

interface PlacedNode extends ConceptNode {
  x: number;
  y: number;
  size: number;
}

export const LearningMapScreen: React.FC<LearningMapScreenProps> = ({
  fileName,
  text,
  onBack,
}) => {
  const [selected, setSelected] = useState<string | null>(null);

  const map = useMemo(() => buildConceptMap(text, 12), [text]);
  const gaps = useMemo(() => findIsolatedConcepts(map), [map]);

  const screenWidth = Dimensions.get('window').width;
  const canvas = Math.min(Math.max(screenWidth - 40, 260), 380);
  const centre = canvas / 2;

  const placed: PlacedNode[] = useMemo(() => {
    const { nodes } = map;
    if (nodes.length === 0) return [];

    const maxWeight = Math.max(...nodes.map((n) => n.weight), 1);
    const sizeFor = (w: number) => 46 + Math.round((w / maxWeight) * 26);

    // Strongest concept sits in the middle; the rest ring around it.
    const [hub, ...rest] = nodes;
    const radius = centre - sizeFor(maxWeight) / 2 - 8;

    const result: PlacedNode[] = [
      { ...hub, x: centre, y: centre, size: sizeFor(hub.weight) },
    ];

    rest.forEach((node, i) => {
      const angle = (i / rest.length) * Math.PI * 2 - Math.PI / 2;
      result.push({
        ...node,
        x: centre + Math.cos(angle) * radius,
        y: centre + Math.sin(angle) * radius,
        size: sizeFor(node.weight),
      });
    });

    return result;
  }, [map, centre]);

  const positionOf = (id: string) => placed.find((n) => n.id === id);

  const selectedContexts = selected ? map.contexts[selected] ?? [] : [];
  const selectedLinks = selected
    ? map.edges
        .filter((e) => e.source === selected || e.target === selected)
        .map((e) => (e.source === selected ? e.target : e.source))
    : [];

  const maxEdgeWeight = Math.max(...map.edges.map((e) => e.weight), 1);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Learning Map"
        subtitle={fileName}
        onBack={onBack}
        accent={colors.accentMap}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {placed.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyTitle}>Not Enough Content</Text>
            <Text style={styles.emptyText}>
              This material is too short to find connected concepts.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.hint}>
              Bigger circles appear more often. Lines connect concepts discussed together. Tap a
              concept to see where it appears.
            </Text>

            <View style={[styles.canvas, { width: canvas, height: canvas }]}>
              {/* Edges first so nodes paint on top. */}
              {map.edges.map((edge, idx) => {
                const a = positionOf(edge.source);
                const b = positionOf(edge.target);
                if (!a || !b) return null;

                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                const isActive =
                  selected !== null && (edge.source === selected || edge.target === selected);
                const thickness = 1 + (edge.weight / maxEdgeWeight) * 2.5;

                return (
                  <View
                    key={`${edge.source}-${edge.target}-${idx}`}
                    pointerEvents="none"
                    style={[
                      styles.edge,
                      {
                        width: length,
                        height: thickness,
                        left: (a.x + b.x) / 2 - length / 2,
                        top: (a.y + b.y) / 2 - thickness / 2,
                        transform: [{ rotate: `${angle}deg` }],
                        backgroundColor: isActive ? colors.primary : colors.primarySoftBorder,
                      },
                    ]}
                  />
                );
              })}

              {placed.map((node) => {
                const isSelected = node.id === selected;
                return (
                  <TouchableOpacity
                    key={node.id}
                    activeOpacity={0.85}
                    onPress={() => setSelected(isSelected ? null : node.id)}
                    style={[
                      styles.node,
                      {
                        width: node.size,
                        height: node.size,
                        borderRadius: node.size / 2,
                        left: node.x - node.size / 2,
                        top: node.y - node.size / 2,
                        backgroundColor: isSelected ? colors.primaryDarker : colors.primary,
                        borderWidth: isSelected ? 3 : 0,
                      },
                    ]}
                  >
                    <Text style={styles.nodeText} numberOfLines={2}>
                      {node.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selected && (
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>{selected}</Text>

                {selectedLinks.length > 0 && (
                  <View style={styles.chipRow}>
                    {selectedLinks.map((id) => (
                      <TouchableOpacity
                        key={id}
                        style={styles.chip}
                        onPress={() => setSelected(id)}
                      >
                        <Text style={styles.chipText}>{id}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.detailLabel}>Where it appears</Text>
                {selectedContexts.length === 0 ? (
                  <Text style={styles.detailBody}>No example sentences found.</Text>
                ) : (
                  selectedContexts.map((sentence, i) => (
                    <Text key={i} style={styles.detailBody}>
                      • {sentence}
                    </Text>
                  ))
                )}
              </View>
            )}

            {gaps.length > 0 && (
              <View style={styles.gapsCard}>
                <Text style={styles.gapsTitle}>🔍 Possible Knowledge Gaps</Text>
                <Text style={styles.gapsHint}>
                  These come up on their own, with few links to other ideas — worth reading around.
                </Text>
                <View style={styles.chipRow}>
                  {gaps.map((id) => (
                    <TouchableOpacity
                      key={id}
                      style={styles.gapChip}
                      onPress={() => setSelected(id)}
                    >
                      <Text style={styles.gapChipText}>{id}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl, alignItems: 'center' },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  canvas: { position: 'relative', marginBottom: spacing.xl },
  edge: { position: 'absolute' },
  node: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderColor: colors.accentMap,
    ...shadow(2),
  },
  nodeText: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  detailCard: { ...card(1), padding: spacing.lg, width: '100%', marginBottom: spacing.lg },
  detailTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textTransform: 'capitalize',
  },
  detailLabel: {
    ...typography.micro,
    color: colors.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailBody: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 6,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: 6 },
  chip: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primarySoftBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  chipText: { ...typography.micro, color: colors.primary },
  gapsCard: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(224, 160, 18, 0.35)',
  },
  gapsTitle: { ...typography.bodyStrong, color: colors.textPrimary, marginBottom: 4 },
  gapsHint: { ...typography.micro, color: colors.textSecondary, lineHeight: 17, marginBottom: spacing.md, fontWeight: '400' },
  gapChip: {
    backgroundColor: colors.accentMap,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  gapChipText: { ...typography.micro, color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 60, marginBottom: spacing.lg, opacity: 0.45 },
  emptyTitle: { ...typography.subheading, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  },
});
