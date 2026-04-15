// src/components/auth/AuthRedirector.tsx
"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { SplashScreen } from "@/components/ui/SplashScreen";

/** Routes that require an authenticated user — mirrors middleware.ts PROTECTED_PREFIXES. */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/project/',
  '/advisor',
  '/lender',
  '/team',
  '/documents/edit',
  '/meeting/',
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );
}

export const AuthRedirector = () => {
  const { user, isAuthenticated, isLoading, justLoggedIn, clearJustLoggedIn } =
    useAuth();
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Wait for initial auth hydration to complete before making any routing decisions
    if (isHydrating || isLoading) {
      return;
    }

    const isAuthPage = pathname === "/login";
    const isOnboardingPage = pathname === "/onboarding";
    const isHomePage = pathname === "/";
    const isProtected = isProtectedPath(pathname);

    const performRedirect = () => {
      if (!user) return;
      switch (user.role) {
        case "borrower":
          router.replace("/dashboard");
          break;
        case "advisor":
          router.replace("/advisor/dashboard");
          break;
        case "lender":
          router.replace("/lender/dashboard");
          break;
        default:
          router.replace("/dashboard");
      }
    };

    if (needsOnboarding && !isOnboardingPage) {
      router.replace("/onboarding");
      return;
    }

    if (isAuthenticated && user) {
      // Logged-in user on the login page → send to dashboard
      if (isAuthPage) {
        performRedirect();
      }

      // Just logged in and on the homepage → redirect to dashboard
      if (isHomePage && justLoggedIn) {
        clearJustLoggedIn();
        performRedirect();
      }
    } else if (!isAuthenticated && !needsOnboarding && isProtected) {
      // Unauthenticated on a protected route → redirect to login
      const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(loginUrl);
    }
  }, [
    isAuthenticated,
    isHydrating,
    isLoading,
    user,
    pathname,
    router,
    justLoggedIn,
    clearJustLoggedIn,
    needsOnboarding,
  ]);

  // While hydrating on a protected page, show the splash screen to prevent flash
  if ((isHydrating || isLoading) && isProtectedPath(pathname)) {
    return <SplashScreen text="Loading..." />;
  }

  return null;
};
