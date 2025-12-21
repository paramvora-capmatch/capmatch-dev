'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Notification {
  id: string;
  user_id: string;
  event_id?: number;
  title: string;
  body?: string | null;
  link_url?: string | null;
  read_at?: string | null;
  payload?: Record<string, unknown> | null;
  created_at: string;
}

interface ToastContextValue {
  showToast: (notification: Notification) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
  activeToasts: Notification[];
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const MAX_TOASTS = 5;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [activeToasts, setActiveToasts] = useState<Notification[]>([]);

  const showToast = useCallback((notification: Notification) => {
    setActiveToasts((prev) => {
      // Check if toast already exists (prevent duplicates)
      if (prev.some((t) => t.id === notification.id)) {
        return prev;
      }

      // Add new toast and limit to MAX_TOASTS
      const newToasts = [notification, ...prev];

      // If exceeds max, remove the oldest ones
      if (newToasts.length > MAX_TOASTS) {
        return newToasts.slice(0, MAX_TOASTS);
      }

      return newToasts;
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setActiveToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setActiveToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{ showToast, dismissToast, clearAllToasts, activeToasts }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
