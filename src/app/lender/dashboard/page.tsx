// src/app/lender/dashboard/page.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { RoleBasedRoute } from "../../../components/auth/RoleBasedRoute";
import { useAuth } from "../../../hooks/useAuth";
import { Button } from "../../../components/ui/Button";
import { LogOut, Construction } from "lucide-react";
import MinimalSidebarLayout from "@/components/layout/MinimalSidebarLayout";

export default function LenderDashboardPage() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  return (
    <RoleBasedRoute roles={["lender"]}>
      <MinimalSidebarLayout title="Lender Dashboard">
        <div className="text-center p-8 bg-white rounded-lg shadow-md border border-gray-200">
          <Construction className="h-16 w-16 mx-auto text-amber-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Coming Soon!
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            The Lender Dashboard is currently under construction. This is where
            you will find curated deal flow matched to your investment criteria.
          </p>
          <div className="mt-6">
            <Button
              variant="outline"
              onClick={handleLogout}
              leftIcon={<LogOut size={16} />}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </MinimalSidebarLayout>
    </RoleBasedRoute>
  );
}
