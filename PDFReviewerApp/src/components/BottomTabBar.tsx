import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, shadow } from '../theme';

export interface TabItem {
  key: string;
  label: string;
  icon: string;
  /** Count shown on the icon. Zero or undefined hides it. */
  badge?: number;
}

interface BottomTabBarProps {
  /** Exactly four tabs: two are drawn left of the centre button, two right. */
  tabs: TabItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  /** The raised centre action — uploading a document. */
  onCenterPress: () => void;
  centerIcon?: string;
}

const BAR_HEIGHT = 62;
const BUTTON_SIZE = 56;
/**
 * How far the centre button rises above the bar. The wrapper reserves this
 * much extra height so the button stays inside its parent's bounds — Android
 * clips children that overflow, which would slice the top off the button.
 */
const LIFT = 30;

/**
 * Persistent bottom navigation with a raised centre action.
 *
 * This is the piece that makes the app read as an app rather than a web page:
 * the primary destinations stay reachable at thumb height on every screen
 * instead of being buried at the top of a scrolling list.
 */
export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  tabs,
  activeKey,
  onSelect,
  onCenterPress,
  centerIcon = '＋',
}) => {
  const renderTab = (tab: TabItem) => {
    const active = tab.key === activeKey;
    return (
      <TouchableOpacity
        key={tab.key}
        style={styles.tab}
        onPress={() => onSelect(tab.key)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <View>
        <Text style={[styles.icon, active && styles.iconActive]}>{tab.icon}</Text>
        {tab.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{tab.badge > 9 ? '9+' : tab.badge}</Text>
          </View>
        ) : null}
      </View>
        <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
          {tab.label}
        </Text>
        <View style={[styles.activeDot, active && styles.activeDotOn]} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.bar}>
        {tabs.slice(0, 2).map(renderTab)}
        {/* Leaves a gap for the centre button, which is positioned over it. */}
        <View style={styles.centerGap} />
        {tabs.slice(2, 4).map(renderTab)}
      </View>

      <TouchableOpacity
        style={styles.centerButton}
        onPress={onCenterPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add a document"
      >
        <Text style={styles.centerIcon}>{centerIcon}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { height: BAR_HEIGHT + LIFT, justifyContent: 'flex-end' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_HEIGHT,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow(2),
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
  icon: { fontSize: 19, opacity: 0.4 },
  iconActive: { opacity: 1 },
  label: { ...typography.micro, color: colors.tabInactive, marginTop: 2, fontWeight: '600' },
  labelActive: { color: colors.tabActive },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
    backgroundColor: 'transparent',
  },
  activeDotOn: { backgroundColor: colors.tabActive },

  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.onPrimary, fontSize: 9, fontWeight: '800', lineHeight: 12 },

  centerGap: { width: BUTTON_SIZE + 16 },
  centerButton: {
    position: 'absolute',
    left: '50%',
    marginLeft: -BUTTON_SIZE / 2,
    // Half the button clears the top edge of the bar, and LIFT above covers it.
    bottom: BAR_HEIGHT - BUTTON_SIZE / 2,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.surface,
    ...shadow(3),
  },
  centerIcon: {
    color: colors.onPrimary,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 28,
    marginTop: -1,
  },
});

export const TAB_BAR_HEIGHT = BAR_HEIGHT + LIFT;
