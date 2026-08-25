import { Platform, NativeModules } from 'react-native';
import { storage, StorageKeys } from './storage';

type NotificationsModule = typeof import('expo-notifications');
let Notifications: NotificationsModule | null = null;

async function load(): Promise<NotificationsModule | null> {
  if (Notifications) return Notifications;
  if (!NativeModules?.ExpoPushTokenManager) return null;
  try {
    Notifications = await import('expo-notifications');
    return Notifications;
  } catch {
    return null;
  }
}

const NOTIFICATION_IDS = {
  WEEKLY_REMINDER: 'weekly-reminder',
  SATURDAY_LIST: 'saturday-list',
  ABANDONED_CART_2H: 'abandoned-cart-2h',
  ABANDONED_CART_12H: 'abandoned-cart-12h',
};

export async function setupNotificationHandler() {
  const mod = await load();
  if (!mod) return;
  mod.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function requestPermissions(): Promise<boolean> {
  const mod = await load();
  if (!mod) return false;
  const { status: existingStatus } = await mod.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await mod.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return false;
  }
  if (Platform.OS === 'android') {
    await mod.setNotificationChannelAsync('cany-notifications', {
      name: 'Cany Notifications',
      importance: mod.AndroidImportance.HIGH,
    });
  }
  return true;
}

export async function cancelAllNotifications() {
  const mod = await load();
  if (!mod) return;
  await mod.cancelAllScheduledNotificationsAsync();
}

export async function scheduleRoutineTriggers(lastSessionDate: Date | null) {
  const mod = await load();
  if (!mod) return;
  if (!lastSessionDate) return;
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - lastSessionDate.getTime()) / 86400000);

  if (daysSince >= 7) {
    await mod.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDS.WEEKLY_REMINDER,
      content: {
        title: 'Pantry looking empty? 🥫',
        body: "It's been a week since your last run. Open Cany to start drafting your shopping list!",
      },
      trigger: {
        type: mod.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 86400,
      },
    });
  }
}

export async function scheduleSaturdayListTrigger(openListCount: number) {
  const mod = await load();
  if (!mod) return;
  if (openListCount <= 0) return;
  const now = new Date();
  if (now.getDay() !== 6) return;

  await mod.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.SATURDAY_LIST,
    content: {
      title: 'Your list is ready! 📝',
      body: `You have ${openListCount} items on your checklist. Don't forget to use Cany to track your budget today.`,
    },
    trigger: {
      type: mod.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3600,
    },
  });
}

export async function scheduleAbandonedCartNotifications(itemsCount: number, _cartTotal: number) {
  const mod = await load();
  if (!mod) return;
  if (itemsCount <= 0) return;

  await mod.cancelScheduledNotificationAsync(NOTIFICATION_IDS.ABANDONED_CART_2H);
  await mod.cancelScheduledNotificationAsync(NOTIFICATION_IDS.ABANDONED_CART_12H);

  await mod.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.ABANDONED_CART_2H,
    content: {
      title: 'Did you check out? 🛍️',
      body: "You still have scanned items in your active cart. Don't forget to save your trip to your History!",
    },
    trigger: {
      type: mod.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2 * 3600,
    },
  });

  await mod.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.ABANDONED_CART_12H,
    content: {
      title: 'Unsaved Grocery Run ⚠️',
      body: "Your last shopping session wasn't saved. Tap here to review your cart and log your expenses.",
    },
    trigger: {
      type: mod.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 12 * 3600,
    },
  });
}

export async function cancelAbandonedCartNotifications() {
  const mod = await load();
  if (!mod) return;
  await mod.cancelScheduledNotificationAsync(NOTIFICATION_IDS.ABANDONED_CART_2H);
  await mod.cancelScheduledNotificationAsync(NOTIFICATION_IDS.ABANDONED_CART_12H);
}

export async function sendBudgetLockedNotification() {
  const mod = await load();
  if (!mod) return;
  await mod.scheduleNotificationAsync({
    content: {
      title: 'Budget Locked In 🔒',
      body: "You're all set! Stick to your limit and let the scanner do the math for you.",
    },
    trigger: {
      type: mod.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
    },
  });
}

export async function setupAllNotifications(openListCount: number) {
  const lastSession = await getLastSessionDate();
  await Promise.all([
    scheduleRoutineTriggers(lastSession),
    scheduleSaturdayListTrigger(openListCount),
  ]);
}

async function getLastSessionDate(): Promise<Date | null> {
  const sessions = await storage.getJson<Array<{ date: string }>>(StorageKeys.SESSIONS, []);
  if (sessions.length === 0) return null;
  const dates = sessions.map((s) => new Date(s.date)).sort((a, b) => b.getTime() - a.getTime());
  return dates[0];
}
