// src/components/layout/DashboardLayout.tsx
"use client";

import React, { ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Users, Settings, BellRing, SlidersHorizontal } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import Image from "next/image";

import { NotificationBell } from "../notifications/NotificationBell";
import { SettingsModal, SettingsTabConfig } from "../settings/SettingsModal";
import { NotificationSettingsPanel } from "../settings/NotificationSettingsPanel";
import { DropdownButton } from "../ui/DropdownButton";

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
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState("notifications");
  const [openDropdown, setOpenDropdown] = useState<'notifications' | 'settings' | null>(null);

  const settingsTabs = useMemo<SettingsTabConfig[]>(
    () => [
      {
        id: "notifications",
        label: "Notifications",
        description: "Mute or customize in-app alerts.",
        icon: <BellRing className="h-4 w-4 text-blue-500" />,
        render: () => <NotificationSettingsPanel />,
      },
      {
        id: "workspace",
        label: "Workspace",
        description: "Workspace preferences & defaults.",
        icon: <SlidersHorizontal className="h-4 w-4 text-gray-400" />,
        render: () => (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
            Additional workspace controls will appear here soon.
          </div>
        ),
      },
    ],
    []
  );

  const handleDropdownChange = (dropdown: 'notifications' | 'settings' | null) => {
    setOpenDropdown(dropdown);
  };

  const openSettingsModal = (tabId: string) => {
    setActiveSettingsTab(tabId);
    setSettingsModalOpen(true);
    setOpenDropdown(null);
  };

  const handleCloseModal = () => setSettingsModalOpen(false);

  // Use wider header padding for all pages to match content width consistently
  const headerPaddingClass = "px-14";

  const handleLogout = async () => {
    try {
      setOpenDropdown(null);
      await logout();
      console.log("Signed out successfully.");
      router.push("/login");
    } catch {
      console.error("Logout failed. Please try again.");
    }
  };

  return (
    <>
    <div className="flex h-screen bg-gray-200">

      {/* No sidebar - header-only layout */}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm sticky top-0 z-10 flex-shrink-0">
          <div className={`py-4 ${headerPaddingClass} flex items-center justify-between`}>
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
              <div className="translate-y-1">
                {breadcrumb ? (
                  <div className="[&_button]:cursor-pointer [&_a]:cursor-pointer">
                    {breadcrumb}
                  </div>
                ) : (
                  title && <h1 className="text-2xl font-semibold text-gray-800 -translate-y-1">{title}</h1>
                )}
              </div>
            </div>
            {(isAuthenticated && user) && (
              <div className="flex items-center gap-3">
                {/* Team button */}
                {!hideTeamButton && (
                  <Link
                    href="/team"
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-white text-gray-700 rounded-full border border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-600 transition-colors duration-200 shadow-sm"
                  >
                    <Users className="h-4 w-4" />
                    Team
                  </Link>
                )}
                <NotificationBell
                  isOpen={openDropdown === 'notifications'}
                  onOpenChange={(open) => handleDropdownChange(open ? 'notifications' : null)}
                />
                {/* Settings dropdown */}
                <DropdownButton
                  isOpen={openDropdown === 'settings'}
                  onOpenChange={(open) => handleDropdownChange(open ? 'settings' : null)}
                  trigger={
                    <div className="inline-flex items-center justify-center h-8 w-8 text-sm font-medium bg-gray-100 text-gray-700 rounded-full border border-gray-300 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors">
                      <Settings className="h-4 w-4" />
                    </div>
                  }
                >
                  <div className="w-56 overflow-hidden">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <p className="text-sm font-medium text-gray-900">{user.email}</p>
                      <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                    </div>
                    <div className="py-1">
                      {settingsTabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => openSettingsModal(tab.id)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          type="button"
                        >
                          <span>{tab.icon}</span>
                          <span>{tab.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-gray-100">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center gap-2"
                        type="button"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </DropdownButton>
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
    {settingsTabs.length > 0 && (
      <SettingsModal
        isOpen={isSettingsModalOpen}
        tabs={settingsTabs}
        activeTabId={activeSettingsTab}
        onClose={handleCloseModal}
        onTabChange={setActiveSettingsTab}
      />
    )}
    </>
  );
};

export default DashboardLayout;
