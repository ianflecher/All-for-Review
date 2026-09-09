import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { DashboardScreen } from './src/screens/DashboardScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { PlannerScreen } from './src/screens/PlannerScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { WalletScreen } from './src/screens/WalletScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { FileOrganizerScreen } from './src/screens/FileOrganizerScreen';
import { BottomTabBar, TabItem } from './src/components/BottomTabBar';
import { PdfExtractorHost } from './src/services/nativePdfExtractor';
import { OcrHost } from './src/services/ocrService';
import { AppScreen } from './src/navigation';
import { Assignment } from './src/types';
import { loadJson, STORAGE_KEYS } from './src/utils/storage';
import { daysUntil } from './src/utils/datetime';
import { refreshReminders } from './src/services/reminders';
import { colors } from './src/theme';

/** The four persistent destinations, two either side of the centre button. */
const TABS: TabItem[] = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'documents', label: 'Study', icon: '📚' },
  { key: 'planner', label: 'Planner', icon: '🗓️' },
  { key: 'profile', label: 'Profile', icon: '👤' },
];

type TabKey = 'home' | 'documents' | 'planner' | 'profile';
/** Screens reached from the home grid; they cover the tabs while open. */
type OverlayKey = 'wallet' | 'schedule' | 'files';

const OVERLAY_KEYS: OverlayKey[] = ['wallet', 'schedule', 'files'];
const isOverlay = (screen: AppScreen): screen is OverlayKey =>
  (OVERLAY_KEYS as string[]).includes(screen);

const App = () => {
  const [tab, setTab] = useState<TabKey>('home');
  const [overlay, setOverlay] = useState<OverlayKey | null>(null);

  // Bumped whenever the home tab is re-entered, so its counts re-read storage
  // after another screen has changed something.
  const [refreshKey, setRefreshKey] = useState(0);
  // Incremented by the centre button to ask the study tab to open the picker.
  const [pickToken, setPickToken] = useState(0);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Re-read on every tab change, so the badge reflects edits made elsewhere.
  useEffect(() => {
    loadJson<Assignment[]>(STORAGE_KEYS.assignments, []).then(setAssignments);
  }, [tab, overlay, refreshKey]);

  // Deadlines can pass while the app is closed, so rebuild the schedule once
  // at startup rather than relying only on the planner having been opened.
  useEffect(() => {
    refreshReminders();

    // Paint the window behind the app in the theme's own colour, so there is
    // no white flash before the first frame on a dark device.
    import('expo-system-ui')
      .then((SystemUI) => SystemUI.setBackgroundColorAsync(colors.background))
      .catch(() => undefined);
  }, []);

  /** Overdue plus due today — what actually needs attention now. */
  const plannerBadge = useMemo(
    () =>
      assignments.filter((item) => {
        if (item.done) return false;
        const days = daysUntil(item.dueDate);
        return days !== null && days <= 0;
      }).length,
    [assignments]
  );

  const tabs = useMemo(
    () => TABS.map((tab) => (tab.key === 'planner' ? { ...tab, badge: plannerBadge } : tab)),
    [plannerBadge]
  );

  const goTab = useCallback((next: TabKey) => {
    setOverlay(null);
    setTab(next);
    if (next === 'home') setRefreshKey((key) => key + 1);
  }, []);

  const open = useCallback(
    (screen: AppScreen) => {
      if (isOverlay(screen)) {
        setOverlay(screen);
        return;
      }
      goTab(screen as TabKey);
    },
    [goTab]
  );

  const closeOverlay = useCallback(() => {
    setOverlay(null);
    setRefreshKey((key) => key + 1);
  }, []);

  const startUpload = useCallback(() => {
    setOverlay(null);
    setTab('documents');
    setPickToken((token) => token + 1);
  }, []);

  // The PDF engine only has to be alive where documents are read.
  const needsPdfEngine = Platform.OS !== 'web' && tab === 'documents' && overlay === null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {/* Both readers live where documents are opened. They are separate hosts
          on purpose: the PDF one is the main path and should not be put at
          risk by the OCR engine sharing its page. */}
      {needsPdfEngine && <PdfExtractorHost />}
      {needsPdfEngine && <OcrHost />}

      {/* The blue headers run to the top of the screen, so only the bottom
          edge is inset — the header handles its own top padding. */}
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {overlay ? (
          <View style={styles.screen}>
            {overlay === 'wallet' && <WalletScreen onBack={closeOverlay} />}
            {overlay === 'schedule' && <ScheduleScreen onBack={closeOverlay} />}
            {overlay === 'files' && <FileOrganizerScreen onBack={closeOverlay} />}
          </View>
        ) : (
          <>
            <View style={styles.screen}>
              {tab === 'home' && (
                <DashboardScreen onOpen={open} onUpload={startUpload} refreshKey={refreshKey} />
              )}
              {tab === 'documents' && (
                <HomeScreen onNavigateToLanding={() => goTab('home')} pickToken={pickToken} />
              )}
              {tab === 'planner' && <PlannerScreen onBack={() => goTab('home')} />}
              {tab === 'profile' && <ProfileScreen onBack={() => goTab('home')} />}
            </View>

            <BottomTabBar
              tabs={tabs}
              activeKey={tab}
              onSelect={(key) => goTab(key as TabKey)}
              onCenterPress={startUpload}
            />
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1 },
});

export default App;
