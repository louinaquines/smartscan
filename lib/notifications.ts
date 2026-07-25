import { storage, StorageKeys } from './storage';

type NotifyHandler = (title: string, body: string) => void;
let notifyHandler: NotifyHandler | null = null;
const timers: Record<string, ReturnType<typeof setTimeout>> = {};

export function setNotifyHandler(handler: NotifyHandler) {
  notifyHandler = handler;
}

function fire(title: string, body: string, delayMs = 2000) {
  const handler = notifyHandler;
  if (!handler) return;
  setTimeout(() => handler(title, body), delayMs);
}

function clearTimer(id: string) {
  if (timers[id]) {
    clearTimeout(timers[id]);
    delete timers[id];
  }
}

function scheduleDemo(id: string, title: string, body: string, delayMs: number) {
  clearTimer(id);
  const handler = notifyHandler;
  timers[id] = setTimeout(() => {
    if (handler) handler(title, body);
    delete timers[id];
  }, delayMs);
}

export async function requestPermissions(): Promise<boolean> {
  return true;
}

export async function cancelAllNotifications() {
  for (const key of Object.keys(timers)) {
    clearTimer(key);
  }
}

export async function scheduleRoutineTriggers(lastSessionDate: Date | null) {
  if (!lastSessionDate) return;
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - lastSessionDate.getTime()) / 86400000);
  if (daysSince < 7) {
    fire(
      'Pantry looking empty? 🥫',
      "It's been a week since your last run. Open Cany to start drafting your shopping list!"
    );
  }
  if (daysSince < 14) {
    const h2 = notifyHandler;
    setTimeout(() => {
      if (h2) h2(
        'Time for a restock! 🛒',
        "You haven't scanned any groceries lately. Prep your list now for a smoother trip later."
      );
    }, 4000);
  }
}

export async function scheduleSaturdayListTrigger(openListCount: number) {
  if (openListCount <= 0) return;
  const h3 = notifyHandler;
  setTimeout(() => {
    if (h3) h3(
      'Your list is ready! 📝',
      `You have ${openListCount} items on your checklist. Don't forget to use Cany to track your budget today.`
    );
  }, 2500);
}

export async function schedulePaydayTriggers() {
  scheduleDemo('payday-14',
    'Payday tomorrow! 💳',
    'Time to plan the grocery budget. Set your spending limit in Cany before you hit the aisles.',
    3000
  );
  scheduleDemo('payday-29',
    'Payday tomorrow! 💳',
    'Time to plan the grocery budget. Set your spending limit in Cany before you hit the aisles.',
    6000
  );
  scheduleDemo('month-start',
    'New month, fresh budget 💵',
    'A new month means a clean slate. Update your Cany budget settings for your next trip.',
    9000
  );
}

export async function scheduleHolidayTriggers() {
  scheduleDemo('holiday-holyweek',
    'Beat the holiday rush! 🏃\u200D♂️',
    'Supermarkets will be packed soon. Prep your Cany list today and shop early.',
    3500
  );
  scheduleDemo('holiday-christmas',
    'Noche Buena prep! 🎄',
    'Holiday groceries can break the bank. Use Cany to stick strictly to your festive budget.',
    7000
  );
}

export async function scheduleAbandonedCartNotifications(itemsCount: number, cartTotal: number) {
  if (itemsCount <= 0) return;
  scheduleDemo('cart-2h',
    'Did you check out? 🛍️',
    "You still have scanned items in your active cart. Don't forget to save your trip to your History!",
    5000
  );
  scheduleDemo('cart-12h',
    'Unsaved Grocery Run ⚠️',
    "Your last shopping session wasn't saved. Tap here to review your cart and log your expenses.",
    10000
  );
}

export async function cancelAbandonedCartNotifications() {
  clearTimer('cart-2h');
  clearTimer('cart-12h');
}

export async function sendBudgetLockedNotification() {
  fire('Budget Locked In 🔒', "You're all set! Stick to your limit and let the scanner do the math for you.", 1500);
}

export async function setupAllNotifications(openListCount: number) {
  const lastSession = await getLastSessionDate();
  await Promise.all([
    scheduleRoutineTriggers(lastSession),
    scheduleSaturdayListTrigger(openListCount),
    schedulePaydayTriggers(),
    scheduleHolidayTriggers(),
  ]);
}

async function getLastSessionDate(): Promise<Date | null> {
  const sessions = await storage.getJson<Array<{ date: string }>>(StorageKeys.SESSIONS, []);
  if (sessions.length === 0) return null;
  const dates = sessions.map((s) => new Date(s.date)).sort((a, b) => b.getTime() - a.getTime());
  return dates[0];
}
