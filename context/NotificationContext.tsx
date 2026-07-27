import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { NativeModules } from 'react-native';
import NotificationToast from '../components/NotificationToast';

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

interface NotificationItem {
  id: number;
  title: string;
  body: string;
  icon?: string;
}

interface NotificationContextType {
  showNotification: (title: string, body: string, icon?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<NotificationItem | null>(null);
  const queueRef = useRef<NotificationItem[]>([]);
  const nextIdRef = useRef(0);

  const showNotification = useCallback((title: string, body: string, icon?: string) => {
    const id = nextIdRef.current++;
    queueRef.current.push({ id, title, body, icon });
    setCurrent((prev) => {
      if (prev === null && queueRef.current.length > 0) {
        return queueRef.current.shift()!;
      }
      return prev;
    });
  }, []);

  const dequeue = useCallback(() => {
    if (queueRef.current.length > 0) {
      setCurrent(queueRef.current.shift()!);
    } else {
      setCurrent(null);
    }
  }, []);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    load().then((mod) => {
      if (!mod) return;
      subscription = mod.addNotificationReceivedListener((notification) => {
        const { title, body } = notification.request.content;
        if (title) {
          showNotification(title, body ?? '');
        }
      });
    });
    return () => {
      if (subscription) subscription.remove();
    };
  }, [showNotification]);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <NotificationToast
        visible={current !== null}
        title={current?.title ?? ''}
        body={current?.body ?? ''}
        icon={current?.icon}
        onDismiss={dequeue}
      />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}
