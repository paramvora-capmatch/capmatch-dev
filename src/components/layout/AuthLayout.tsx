// components/layout/AuthLayout.tsx

"use client";
import Image from "next/image";

import React, { ReactNode } from "react";
import Link from "next/link";

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex flex-col">
      <header className="bg-white shadow-sm p-4">
        <div className="container mx-auto">
          <Link
            href="/"
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
              alt="CapMatch Logo"
              height={32}
              width={32}
            />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>

      <footer className="bg-white shadow-sm p-4 mt-auto">
        <div className="container mx-auto text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} CapMatch Platform</p>
        </div>
      </footer>
    </div>
  );
};

export default AuthLayout;
