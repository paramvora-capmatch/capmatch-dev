// src/contexts/AuthContext.tsx

"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useContext,
} from "react";
import { StorageService } from "../services/storage/StorageService";
import {
  EnhancedUser,
  BorrowerProfile,
  ProjectProfile,
  ProjectPhase,
} from "../types/enhanced-types";
import { mockProfiles, mockProjects } from "../../lib/mockData";
import { supabase } from "../../lib/supabaseClient";
import { ProjectContext } from "./ProjectContext";
import { BorrowerProfileContext } from "./BorrowerProfileContext";

// Define context interface
interface AuthContextProps {
  user: EnhancedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginSource: "direct" | "lenderline";
  login: (
    email: string,
    source?: "direct" | "lenderline",
    role?: "borrower" | "advisor" | "lender" | "admin"
  ) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<EnhancedUser>) => void; // Keep updateUser definition
}

// Create context
export const AuthContext = createContext<AuthContextProps>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  loginSource: "direct",
  login: async () => {},
  logout: () => {},
  updateUser: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
  storageService: StorageService;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  storageService,
}) => {
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginSource, setLoginSource] = useState<"direct" | "lenderline">(
    "direct"
  );

  // Get contexts needed
  const projectContext = useContext(ProjectContext);
  const borrowerProfileContext = useContext(BorrowerProfileContext);

  // This is the new source of truth. It listens to Supabase auth events.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsLoading(true);
      if (event === "SIGNED_IN" && session && session.user) {
        const { user: authUser } = session;
        // The role is stored in user_metadata which we set during sign-up/sign-in
        const role = authUser.user_metadata.role || "borrower";
        const loginSource = authUser.user_metadata.loginSource || "direct";

        const enhancedUser: EnhancedUser = {
          email: authUser.email!,
          role,
          loginSource,
          lastLogin: new Date(authUser.last_sign_in_at || Date.now()),
          name: authUser.user_metadata.name,
        };

        await storageService.setItem("user", enhancedUser);
        setUser(enhancedUser);
        setLoginSource(loginSource);

        // This is the new trigger point for first-time setup!
        // A new user is detected if their account was created very recently.
        const isNewUser =
          new Date().getTime() - new Date(authUser.created_at!).getTime() <
          60 * 1000; // Signed up within the last minute

        if (isNewUser && role === "borrower") {
          console.log(
            "[Auth] New borrower signed in, triggering first-time setup."
          );
          // The other contexts will now detect the new user and create a profile/project automatically.
        }
      } else if (event === "SIGNED_OUT") {
        await storageService.removeItem("user");
        setUser(null);
        setLoginSource("direct");
        borrowerProfileContext.resetProfileState?.();
        projectContext.resetProjectState?.();
      } else if (event === "INITIAL_SESSION" && session && session.user) {
        // This handles re-hydrating the session when the user comes back to the app
        const { user: authUser } = session;
        const role = authUser.user_metadata.role || "borrower";
        setUser({
          email: authUser.email!,
          role,
          lastLogin: new Date(authUser.last_sign_in_at!),
        });
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [storageService, borrowerProfileContext, projectContext]);

  // --- Test Data Handling ---
  const handleTestData = async (email: string): Promise<boolean> => {
    if (email === "borrower3@example.com") {
      console.log("[Auth] Clearing data for borrower3@example.com");
      await storageService.clearUserSpecificData(email);
      // Trigger context resets
      borrowerProfileContext.resetProfileState?.(); // Use reset function if available
      projectContext.resetProjectState?.(); // Use reset function if available
      return true;
    }
    if (
      email === "borrower1@example.com" ||
      email === "borrower2@example.com"
    ) {
      const profiles =
        (await storageService.getItem<BorrowerProfile[]>("borrowerProfiles")) ||
        [];
      if (!profiles.some((p) => p.userId === email)) {
        console.log(`[Auth] Seeding data for ${email}`);
        const profileToSeed = mockProfiles[email];
        const projectsToSeed = mockProjects[email] || [];
        if (profileToSeed)
          await storageService.setItem("borrowerProfiles", [
            ...profiles,
            profileToSeed,
          ]);
        const existingProjects =
          (await storageService.getItem<ProjectProfile[]>("projects")) || [];
        const newProjects = projectsToSeed.filter(
          (sp) => !existingProjects.some((ep) => ep.id === sp.id)
        );
        if (newProjects.length > 0)
          await storageService.setItem("projects", [
            ...existingProjects,
            ...newProjects,
          ]);
      } else {
        console.log(`[Auth] Data exists for ${email}, skipping seed.`);
      }
    }
    return false;
  };

  // --- Update user data ---
  const updateUser = useCallback(
    async (userData: Partial<EnhancedUser>) => {
      setUser((currentUser) => {
        if (!currentUser) return null;
        try {
          const sourceToKeep = userData.loginSource || loginSource;
          const updatedUser = {
            ...currentUser,
            ...userData,
            loginSource: sourceToKeep,
          };
          // Update storage asynchronously without awaiting here to avoid blocking state update
          storageService
            .setItem("user", updatedUser)
            .catch((err) => console.error("Storage update failed:", err));
          if (userData.loginSource) setLoginSource(userData.loginSource); // Update source state if changed
          return updatedUser;
        } catch (error) {
          console.error("Failed to update user:", error);
          return currentUser;
        }
      });
    },
    [storageService, loginSource]
  );

  // Login function
  const login = useCallback(
    async (
      email: string,
      source: "direct" | "lenderline" = "direct",
      role: "borrower" | "advisor" | "lender" | "admin" = "borrower"
    ) => {
      try {
        const demoAccounts = [
          'borrower1@example.com',
          'borrower2@example.com',
          'advisor1@capmatch.com',
          'admin@capmatch.com',
          'lender1@example.com'
        ];

        // For demo accounts, we use a mock login. For real emails, we trigger Supabase.
        if (demoAccounts.includes(email)) {
          console.log(`[Auth] Using mock login for: ${email}`);
          setIsLoading(true);
          setLoginSource(source);
          await handleTestData(email);
          const detectedRole = email.includes("admin@capmatch.com")
            ? "admin"
            : role;
          const newUser: EnhancedUser = {
            email,
            lastLogin: new Date(),
            role: detectedRole,
            loginSource: source,
          };
          await storageService.setItem("user", newUser);
          setUser(newUser);
          setIsLoading(false);
        } else {
          console.log(`[Auth] Triggering magic link for: ${email}`);
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              data: { role, loginSource: source },
              emailRedirectTo: window.location.origin,
            },
          });
          if (error) throw error;
          // The UI will show "Check your email". No state change here.
        }
      } catch (error) {
        console.error("[Auth] Login process failed:", error);
        setIsLoading(false); // Ensure loading is stopped on error
        throw error;
      }
    },
    [storageService]
  );

  // Logout function
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);

      // First, try to sign out from Supabase. This will trigger the onAuthStateChange
      // listener for real sessions.
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Log the error but continue with manual cleanup to ensure logout.
        console.error("Supabase signOut error:", error.message);
      }

      // Manually clear all session state regardless of Supabase result.
      // This is the key fix that handles mock sessions correctly.
      await storageService.removeItem("user");
      setUser(null);
      setLoginSource("direct");
      borrowerProfileContext.resetProfileState?.();
      projectContext.resetProjectState?.();

      console.log("[Auth] Logged out and cleared local session state.");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [storageService, borrowerProfileContext, projectContext]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginSource,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
