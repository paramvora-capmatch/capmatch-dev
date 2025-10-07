// src/components/auth/AuthRedirector.tsx
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';

export const AuthRedirector = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Don't do anything while auth state is loading
    if (isLoading) {
      return;
    }

    const isAuthPage = pathname === '/login';
    const isHomePage = pathname === '/';

    const justLoggedIn = sessionStorage.getItem('justLoggedIn');

    if (isAuthenticated && user && (isAuthPage || (isHomePage && justLoggedIn))) {
      console.log(`[AuthRedirector] User authenticated on auth-sensitive page. Redirecting...`);

      if (isHomePage && justLoggedIn) {
        sessionStorage.removeItem('justLoggedIn');
      }

      switch (user.role) {
        case 'borrower':
          router.replace('/dashboard');
          break;
        case 'advisor':
        case 'admin':
          router.replace('/advisor/dashboard');
          break;
        case 'lender':
          router.replace('/lender/dashboard');
          break;
        default:
          router.replace('/dashboard'); // Fallback
      }
    }
  }, [isAuthenticated, isLoading, user, pathname, router]);

  return null; // This component does not render anything
};