import { useEffect } from 'react';
import { store } from '../store';

export function useOnlineStatus(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    // Set online on mount
    store.setOnlineStatus(userId, true);

    // Heartbeat - update status every 30 seconds
    const heartbeat = setInterval(() => {
      store.setOnlineStatus(userId, true);
    }, 30000);

    // Set offline on unmount/close
    const handleBeforeUnload = () => {
      store.setOnlineStatus(userId, false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      store.setOnlineStatus(userId, false);
    };
  }, [userId]);
}

export function useAutoMessages() {
  useEffect(() => {
    // Check for pending auto messages every minute
    const checkMessages = () => {
      const pending = store.getPendingAutoMessages();
      pending.forEach(msg => {
        // Send the message
        if (msg.type === 'chat') {
          store.sendMessage(msg.fromId, msg.toId, msg.text);
        } else if (msg.type === 'notification') {
          store.saveNotification({
            id: msg.id,
            type: msg.notificationType || 'info',
            message: msg.text,
            read: false,
            createdAt: new Date().toISOString(),
            targetUserId: msg.toId,
          });
        }
        // Mark as sent
        store.updateAutoMessage({ ...msg, sent: true });
      });
    };

    // Check immediately
    checkMessages();

    // Then check every minute
    const interval = setInterval(checkMessages, 60000);

    return () => clearInterval(interval);
  }, []);
}
