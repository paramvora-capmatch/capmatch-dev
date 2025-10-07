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
  const [redirected, setRedirected] = useState(false);

  // Update the UI loading state once when the component mounts.
  // This effect will run only once.
  useEffect(() => {
    // We intentionally leave out isLoading from the dependency array
    // so that we don't trigger repeated updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // If loading is finished, then we can check auth state
      if (!isAuthenticated) {
        if (!redirected) {
          setRedirected(true);
          console.error("Please sign in to access this page");
          router.push(redirectTo);
        }
      } else if (!user || !roles.includes(user.role)) {
        if (!redirected) {
          setRedirected(true);
          console.error("You do not have permission to access this page");
          // Redirect based on role
          if (user?.role === "advisor") {
            router.push("/advisor/dashboard");
          } else if (user?.role === "admin" || user?.role === "lender") {
            // Admin and Lender have specific dashboards, handle them or redirect to a safe place
            // For now, let's assume admin can see advisor dashboard, and lender has its own
            if (user.role === "admin") router.push("/advisor/dashboard");
            else if (user.role === "lender") router.push("/lender/dashboard");
          } else {
            router.push("/dashboard");
          }
        }
      }
    }
  }, [isAuthenticated, isLoading, router, redirected, redirectTo, roles, user]);

  if (isLoading || !isAuthenticated || !user || !roles.includes(user.role)) {
    // While loading or if unauthorized, show a loader to prevent content flash and errors.
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If all checks pass, render the children components.
  return <>{children}</>;
};
