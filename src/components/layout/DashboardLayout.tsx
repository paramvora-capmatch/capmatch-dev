// src/components/layout/DashboardLayout.tsx
"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Users, Settings } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import Image from "next/image";

import { LoadingOverlay } from "../ui/LoadingOverlay";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string; // Made optional since we can use breadcrumb instead
  breadcrumb?: ReactNode; // Optional breadcrumb to replace title
  hideTeamButton?: boolean; // If true, hides the Team button
  mainClassName?: string; // Allows per-page control of main area padding/overflow
  // Backwards compat: allow legacy prop; if provided and mainClassName is not,
  // we will use it to set overflow behavior.
  scrollableContent?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  breadcrumb,
  hideTeamButton = false,
  mainClassName,
  scrollableContent = true,
}) => {
  const router = useRouter();
  const { user, logout, isAuthenticated, currentOrgRole, activeOrg } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      console.log("Signed out successfully.");
      router.push("/login");
    } catch {
      console.error("Logout failed. Please try again.");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <LoadingOverlay isLoading={false} />

      {/* No sidebar - header-only layout */}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm sticky top-0 z-10 flex-shrink-0">
          <div className="py-4 px-1 sm:px-2 lg:px-2 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Image
                  src="/CapMatchLogo.png"
                  alt="CapMatch"
                  className="h-8 w-auto"
                  height={32}
                  width={32}
                />
              </Link>
              <div>
                {breadcrumb ? (
                  breadcrumb
                ) : (
                  title && <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
                )}
              </div>
            </div>
            {(isAuthenticated && user) && (
              <div className="flex items-center gap-3">
                {/* User email */}
                <span className="text-sm text-gray-700 hidden sm:inline">
                  {user.email} {currentOrgRole && activeOrg ? `| ${activeOrg.name}` : ""}
                </span>
                {/* Team button */}
                {!hideTeamButton && (
                  <Link
                    href="/team"
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg border border-blue-600 hover:bg-blue-700 hover:border-blue-700 transition-colors duration-200 shadow-sm"
                  >
                    <Users className="h-4 w-4" />
                    Team
                  </Link>
                )}
                {/* Settings dropdown */}
                <div className="relative">
                  <details className="group">
                    <summary className="list-none cursor-pointer inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900">
                      <Settings className="h-4 w-4" />
                    </summary>
                    <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </button>
                    </div>
                  </details>
                </div>
              </div>
            )}
          </div>
        </header>

        {(() => {
          const resolvedMain =
            mainClassName ||
            (scrollableContent ? "flex-1 overflow-auto px-6 pt-2 pb-6" : "flex-1 overflow-hidden");
          return <main className={resolvedMain}>{children}</main>;
        })()}
      </div>
    </div>
  );
};

export default DashboardLayout;
