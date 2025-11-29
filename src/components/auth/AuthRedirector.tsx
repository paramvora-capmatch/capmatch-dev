// src/components/auth/AuthRedirector.tsx
"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";

export const AuthRedirector = () => {
  const { user, isAuthenticated, isLoading, justLoggedIn, clearJustLoggedIn } =
    useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Don't do anything while auth state is loading
    if (isLoading) {
      return;
    }

    const isAuthPage = pathname === "/login";
    const isHomePage = pathname === "/";

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
          router.replace("/dashboard"); // Fallback
      }
    };

    if (isAuthenticated && user) {
      // Case 1: An already logged-in user navigates to the login page. Redirect them away.
      if (isAuthPage) {
        performRedirect();
      }

      // Case 2: A user just logged in via magic link or password and was redirected to the homepage.
      // Perform the one-time redirect to their dashboard.
      if (isHomePage && justLoggedIn) {
        clearJustLoggedIn(); // Clear the flag in the store
        performRedirect();
      }
    }
  }, [isAuthenticated, isLoading, user, pathname, router, justLoggedIn, clearJustLoggedIn]);

  return null; // This component does not render anything
};
