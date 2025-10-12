// src/components/auth/RoleBasedRoute.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";

interface RoleBasedRouteProps {
  children: React.ReactNode;
  roles: ("borrower" | "advisor" | "lender" | "admin")[];
  redirectTo?: string;
}

export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({
  children,
  roles,
  redirectTo = "/login",
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Don't do anything until the initial auth load is complete.
    if (isLoading && !hasChecked) {
      return;
    }

    const authorized = isAuthenticated && user && roles.includes(user.role);

    console.log('[RoleBasedRoute] 🔍 Debug:', {
      isAuthenticated,
      userRole: user?.role,
      requiredRoles: roles,
      authorized,
      userEmail: user?.email
    });

    if (authorized) {
      setIsAuthorized(true);
    } else {
      // If not authorized after the check, redirect.
      // This also handles the case where a user's session expires.
      setIsAuthorized(false);
      console.error("Unauthorized access to route, redirecting.");
      router.push(redirectTo);
    }

    // Mark that the initial check has been performed.
    // This ensures this logic only redirects, it doesn't get stuck.
    if (!hasChecked) {
      setHasChecked(true);
    }

  }, [isLoading, isAuthenticated, user, roles, router, redirectTo]);

  // While the initial check is pending on first load, show a full-page loader.
  if (!hasChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If the user is authorized, render the children.
  // This component will now *never* unmount its children during a background re-fetch,
  // because `hasChecked` will remain true and `isAuthorized` will remain true.
  if (isAuthorized) {
    return <>{children}</>;
  }

  // If not authorized (and redirection is in progress), render a loader as well.
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
};
