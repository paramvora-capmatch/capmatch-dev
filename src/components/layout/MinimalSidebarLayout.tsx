// src/components/layout/MinimalSidebarLayout.tsx
"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { LayoutDashboard, Gift, LogOut } from "lucide-react"; // Added LogOut
import { useAuth } from "../../hooks/useAuth"; // Import useAuth for logout
import { useRouter } from "next/navigation"; // Import useRouter
import Image from "next/image";

import { LoadingOverlay } from "../ui/LoadingOverlay"; // Import LoadingOverlay

interface MinimalSidebarLayoutProps {
  children: ReactNode;
  title: string; // Add title prop
  breadcrumb?: ReactNode; // New optional prop for breadcrumbs
}

const MinimalSidebarLayout: React.FC<MinimalSidebarLayoutProps> = ({
  children,
  title,
  breadcrumb, // Add to props
}) => {
  const { user, logout } = useAuth(); // Get logout function

  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      console.log("Signed out successfully.");
      router.push("/login"); // Redirect to login after logout
    } catch {
      console.error("Logout failed. Please try again.");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <LoadingOverlay isLoading={false} /> {/* Include LoadingOverlay */}
      {/* Minimal Sidebar */}
      <div className="w-24 lg:w-56 bg-white shadow-md flex flex-col justify-between">
        {" "}
        {/* Adjust width as needed */}
        <div>
          {/* Logo/Brand */}
          <div className="p-4 lg:p-6 border-b border-gray-200 flex items-center justify-center">
            {/* Simplified Logo - Maybe just initials or small icon */}
            <Link
              href="/"
              className="flex items-center space-x-2"
              onClick={() => {
                try {
                  sessionStorage.setItem("navigatingToHome", "true");
                } catch (error) {
                  console.warn("Could not set navigation flag:", error);
                }
              }}
            >
              <Image
                src="/CapMatchLogo.png"
                alt="CapMatch"
                className="h-auto w-14 lg:w-20"
                height={32}
                width={32}
              />
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 px-2 lg:px-4">
            <ul className="space-y-2">
              {/* No nav items here, dashboard removed */}
            </ul>
          </nav>
        </div>
        {/* Bottom Section (User/Logout) */}
        <div className="p-2 lg:p-4 border-t border-gray-200">
          {/* User Info + Sign Out Icon */}
          <div className="mb-4 hidden lg:flex items-center">
            <div className="bg-blue-600 h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
              {user?.email?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="ml-3 flex items-center truncate">
              <p className="text-sm font-medium text-gray-700 truncate mr-2">
                {user?.email}
              </p>
              <button
                onClick={handleLogout}
                className="ml-1 p-1 rounded hover:bg-red-50 text-gray-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm">
          <div className="py-4 px-6">
            {/* Breadcrumb above header title, if provided */}
            {breadcrumb}
            <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 px-6 pt-2 pb-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MinimalSidebarLayout;
