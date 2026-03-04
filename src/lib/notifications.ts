export interface NotificationSettings {
  enabled: boolean;
  reminderTime: string; // HH:MM format
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
}

const STORAGE_KEY = 'naijalesson-notification-settings';
const TIMER_KEY = 'naijalesson-notification-timer';

export const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  reminderTime: '16:00',
  days: [1, 2, 3, 4, 5], // Mon-Fri
};

export function getNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  if (settings.enabled) {
    scheduleNextNotification(settings);
  } else {
    clearScheduledNotification();
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function getPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function clearScheduledNotification() {
  const existingTimer = localStorage.getItem(TIMER_KEY);
  if (existingTimer) {
    clearTimeout(Number(existingTimer));
    localStorage.removeItem(TIMER_KEY);
  }
}

function scheduleNextNotification(settings: NotificationSettings) {
  clearScheduledNotification();

  const now = new Date();
  const [hours, minutes] = settings.reminderTime.split(':').map(Number);

  // Find next matching day/time
  let target = new Date(now);
  target.setHours(hours, minutes, 0, 0);

  // If time already passed today, start from tomorrow
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  // Find the next day that's in the allowed days list
  for (let i = 0; i < 7; i++) {
    const dayOfWeek = target.getDay();
    if (settings.days.includes(dayOfWeek)) break;
    target.setDate(target.getDate() + 1);
  }

  const msUntil = target.getTime() - Date.now();

  // Only schedule if within 24 hours (re-schedule on each app open)
  if (msUntil > 0 && msUntil < 24 * 60 * 60 * 1000) {
    const timer = window.setTimeout(() => {
      showNotification();
      // Re-schedule next one
      scheduleNextNotification(settings);
    }, msUntil);
    localStorage.setItem(TIMER_KEY, String(timer));
  }
}

function showNotification() {
  if (Notification.permission !== 'granted') return;
  
  const messages = [
    '📝 Time to prepare your lesson plans for tomorrow!',
    '📚 Have you updated your scheme of work this week?',
    '✏️ Don\'t forget to plan your lessons ahead!',
    '🎯 Stay prepared — review your lesson plans now.',
    '📖 A well-planned lesson is a successful one!',
  ];

  const message = messages[Math.floor(Math.random() * messages.length)];

  new Notification('Syllabix NG Reminder', {
    body: message,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'daily-reminder',
  });
}

// Call on app start to re-schedule
export function initNotifications() {
  const settings = getNotificationSettings();
  if (settings.enabled && Notification.permission === 'granted') {
    scheduleNextNotification(settings);
  }
}
