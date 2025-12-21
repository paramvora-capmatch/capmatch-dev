'use client';

import { AnimatePresence } from 'framer-motion';
import { useToast } from '@/contexts/ToastContext';
import { NotificationToast } from './NotificationToast';

export function NotificationToastContainer() {
  const { activeToasts, dismissToast } = useToast();

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {activeToasts.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <NotificationToast
              notification={notification}
              onDismiss={() => dismissToast(notification.id)}
              onNavigate={() => dismissToast(notification.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
