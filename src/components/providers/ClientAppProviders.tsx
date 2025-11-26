// src/components/providers/ClientAppProviders.tsx
'use client';

import React from 'react';
import { AuthRedirector } from '../auth/AuthRedirector';
import { useAppHydration } from '@/hooks/useAppHydration';
import { SplashScreen } from '../ui/SplashScreen';
import { ThemeProvider } from '@/contexts/ThemeContext';

export const ClientAppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isHydrated = useAppHydration();

  if (!isHydrated) {
    // Show a full-screen splash/loader until the app is hydrated
    // Note: The SplashScreen itself has a timeout, but this hook will keep it
    // visible until all stores confirm they are loaded.
    return <SplashScreen text="Initializing application..." />;
  }

  return (
    <ThemeProvider>
      <AuthRedirector />
      {children}
    </ThemeProvider>
  );
};