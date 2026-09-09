import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Assignment, ClassSession } from '../types';
import { minutesOfTime, parseISODate } from '../utils/datetime';

/**
 * Local reminders for deadlines and classes.
 *
 * A badge only helps someone already looking at the app, which is exactly when
 * they do not need reminding — so the reminder itself is a real scheduled
 * notification that arrives with the app closed. Everything is scheduled
 * on-device; there is no push server and nothing leaves the phone.
 */

/** Evening before a deadline, so there is still time to do something. */
const ASSIGNMENT_HOUR = 18;
/** Minutes of warning before a class starts. */
const CLASS_LEAD_MINUTES = 15;
const CHANNEL_ID = 'reminders';

const supported = () => Platform.OS === 'ios' || Platform.OS === 'android';

let handlerInstalled = false;

function installHandler() {
  if (handlerInstalled) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  handlerInstalled = true;
}

/**
 * Asks for permission if it has not been settled yet. Called at the moment a
 * reminder would first be useful — saving an assignment or a class — rather
 * than on first launch, so the request has visible context.
 */
export async function ensureRemindersReady(): Promise<boolean> {
  if (!supported()) return false;

  try {
    installHandler();

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Deadlines and classes',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;

    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch (e) {
    console.warn('Could not set up reminders:', e);
    return false;
  }
}

/** 0 = Monday here; the scheduler counts 1 = Sunday. */
function toSchedulerWeekday(day: number): number {
  return ((day + 1) % 7) + 1;
}

/**
 * Rebuilds every scheduled reminder from the current data.
 *
 * Cancelling and re-scheduling wholesale is far easier to keep correct than
 * tracking which notification belongs to which edited or deleted row.
 */
export async function syncReminders(
  assignments: Assignment[],
  sessions: ClassSession[]
): Promise<{ scheduled: number }> {
  if (!supported()) return { scheduled: 0 };

  try {
    const permitted = await Notifications.getPermissionsAsync();
    if (!permitted.granted) return { scheduled: 0 };

    installHandler();
    await Notifications.cancelAllScheduledNotificationsAsync();

    let scheduled = 0;
    const now = Date.now();

    for (const assignment of assignments) {
      if (assignment.done) continue;

      const due = parseISODate(assignment.dueDate);
      if (!due) continue;

      const fireAt = new Date(due);
      fireAt.setDate(fireAt.getDate() - 1);
      fireAt.setHours(ASSIGNMENT_HOUR, 0, 0, 0);
      // A date in the past cannot be scheduled, and an overdue item is already
      // shown at the top of the planner anyway.
      if (fireAt.getTime() <= now) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Due tomorrow: ${assignment.subject}`,
          body: assignment.title,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
          channelId: CHANNEL_ID,
        },
      });
      scheduled += 1;
    }

    for (const session of sessions) {
      if (session.day < 0 || session.day > 6) continue;

      const startMinutes = minutesOfTime(session.start);
      const warnAt = Math.max(0, startMinutes - CLASS_LEAD_MINUTES);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${session.subject} starts soon`,
          body: session.room ? `${session.start} · ${session.room}` : `Starts at ${session.start}`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: toSchedulerWeekday(session.day),
          hour: Math.floor(warnAt / 60),
          minute: warnAt % 60,
          channelId: CHANNEL_ID,
        },
      });
      scheduled += 1;
    }

    return { scheduled };
  } catch (e) {
    console.warn('Could not schedule reminders:', e);
    return { scheduled: 0 };
  }
}

export async function cancelAllReminders(): Promise<void> {
  if (!supported()) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('Could not cancel reminders:', e);
  }
}

/**
 * Reloads both lists from storage and rebuilds the schedule. Screens call this
 * after saving, so neither has to know about the other's data.
 */
export async function refreshReminders(): Promise<void> {
  const { loadJson, STORAGE_KEYS } = await import('../utils/storage');
  const [assignments, sessions] = await Promise.all([
    loadJson<Assignment[]>(STORAGE_KEYS.assignments, []),
    loadJson<ClassSession[]>(STORAGE_KEYS.schedule, []),
  ]);
  await syncReminders(assignments, sessions);
}
