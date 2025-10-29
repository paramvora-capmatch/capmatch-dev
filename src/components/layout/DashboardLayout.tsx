// src/components/layout/DashboardLayout.tsx
"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, LayoutGrid, User, Folder, Users } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import Image from "next/image";

import { LoadingOverlay } from "../ui/LoadingOverlay";
import { cn } from "../../utils/cn";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  sidebarMinimal?: boolean;
  sidebarLinks?: { label: string; icon: React.ReactNode; href: string }[];
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  sidebarLinks: customSidebarLinks,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isAuthenticated, currentOrgRole } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      console.log("You have been successfully signed out");
      router.push("/");
    } catch {
      console.error("Failed to sign out. Please try again.");
    }
  };

  const defaultSidebarLinks = [
    { label: "Dashboard", icon: <LayoutGrid size={18} />, href: "/dashboard" },
    { label: "My Profile", icon: <User size={18} />, href: "/profile" },
    { label: "Documents", icon: <Folder size={18} />, href: "/documents" },
    { label: "Team", icon: <Users size={18} />, href: "/team" },
  ];
  const sidebarLinks = customSidebarLinks ?? defaultSidebarLinks;

  return (
    <div className="flex h-screen bg-gray-50">
      <LoadingOverlay isLoading={false} />

      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <Link href="/dashboard">
            <Image
              src="/CapMatchLogo.png"
              alt="CapMatch"
              className="h-10 w-auto"
              height={32}
              width={32}
            />
          </Link>
        </div>

        <nav className="mt-6 px-4 flex-grow">
          <div className="space-y-1">
            {sidebarLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center px-4 py-2.5 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <span className="mr-3">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200">
          {isAuthenticated && user && (
            <div className="flex items-center mb-4">
              <div className="bg-blue-600 h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <div className="ml-3 truncate">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {user.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user.role}
                  {currentOrgRole && ` - ${currentOrgRole.charAt(0).toUpperCase() + currentOrgRole.slice(1)}`}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="py-4 px-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
          </div>
        </header>

        <main className="p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
