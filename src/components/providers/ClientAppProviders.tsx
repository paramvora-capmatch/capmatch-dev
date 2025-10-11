// src/components/providers/ClientAppProviders.tsx
'use client';

import React, { useEffect } from 'react';
import { AuthRedirector } from '../auth/AuthRedirector';
import { useAppHydration } from '@/hooks/useAppHydration';
import { SplashScreen } from '../ui/SplashScreen';
import { checkAndRunMigration } from '@/lib/migrations/rbac-migration';

export const ClientAppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isHydrated = useAppHydration();

  // Run RBAC migration on app start
  useEffect(() => {
    checkAndRunMigration();
  }, []);

  if (!isHydrated) {
    // Show a full-screen splash/loader until the app is hydrated
    // Note: The SplashScreen itself has a timeout, but this hook will keep it
    // visible until all stores confirm they are loaded.
    return <SplashScreen />;
  }

  return (
    <>
      <AuthRedirector />
      {children}
    </>
  );
};