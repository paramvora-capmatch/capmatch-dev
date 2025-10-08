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
  signInWithPassword: (
    email: string,
    password: string,
    source?: "direct" | "lenderline"
  ) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    source?: "direct" | "lenderline"
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
  signInWithPassword: async () => {},
  signUp: async () => {},
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
      try {
        if (event === "SIGNED_IN") {
          sessionStorage.setItem('justLoggedIn', 'true');
        }
        if (event === "SIGNED_IN" && session && session.user) {
          const { user: authUser } = session;

          // Fetch the role from our public.profiles table
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authUser.id)
            .single();

          if (error || !profile) {
            console.error("Error fetching user profile or profile not found:", error);
            // Fallback or sign out user
            await supabase.auth.signOut();
            // Don't return here, let finally block handle loading state
          } else {
            const role = profile.role as 'borrower' | 'advisor' | 'lender' | 'admin';
            const loginSource = authUser.user_metadata.loginSource || "direct";

            const enhancedUser: EnhancedUser = {
              id: authUser.id,
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
          }
        } else if (event === "SIGNED_OUT") {
          await storageService.removeItem("user");
          setUser(null);
          setLoginSource("direct");
        } else if (event === "INITIAL_SESSION" && session && session.user) {
          // This handles re-hydrating the session when the user comes back to the app
          const { user: authUser } = session;
          const role = authUser.user_metadata.role || "borrower";
          setUser({
            id: authUser.id,
            email: authUser.email!,
            role,
            lastLogin: new Date(authUser.last_sign_in_at!),
          });
        }
      } finally {
        setIsLoading(false);
      }
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

  // Sign In with Password
  const signInWithPassword = useCallback(
    async (
      email: string,
      password: string,
      source: "direct" | "lenderline" = "direct"
    ) => {
      try {
        const demoAccounts = [
          "borrower1@example.com",
          "borrower2@example.com",
          "advisor1@capmatch.com",
          "admin@capmatch.com",
          "lender1@example.com",
        ];

        // For demo accounts, we use a mock login with a hardcoded password.
        if (demoAccounts.includes(email) && password === "password123") {
          console.log(`[Auth] Using mock sign-in for: ${email}`);
          setIsLoading(true);
          setLoginSource(source);
          await handleTestData(email);

          const demoUserIds: { [key: string]: string } = {
            "borrower1@example.com": "00000000-0000-0000-0000-000000000001",
            "borrower2@example.com": "00000000-0000-0000-0000-000000000002",
            "advisor1@capmatch.com": "00000000-0000-0000-0000-000000000003",
            "admin@capmatch.com": "00000000-0000-0000-0000-000000000004",
            "lender1@example.com": "00000000-0000-0000-0000-000000000005",
          };

          let role: "borrower" | "advisor" | "admin" | "lender" = "borrower";
          if (email.includes("admin@capmatch.com")) role = "admin";
          else if (email.includes("advisor")) role = "advisor";
          else if (email.includes("lender")) role = "lender";

          const newUser: EnhancedUser = {
            id: demoUserIds[email] || `demo-user-${email}`,
            email,
            lastLogin: new Date(),
            role: role,
            loginSource: source,
          };
          await storageService.setItem("user", newUser);
          setUser(newUser);
          setIsLoading(false);
          sessionStorage.setItem('justLoggedIn', 'true');
        } else if (demoAccounts.includes(email) && password !== "password123") {
          throw new Error("Invalid password for demo account.");
        } else {
          console.log(`[Auth] Signing in with password for: ${email}`);
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          // onAuthStateChange will handle setting user state
        }
      } catch (error) {
        console.error("[Auth] Sign in process failed:", error);
        setIsLoading(false); // Ensure loading is stopped on error
        throw error;
      }
    },
    [storageService]
  );

  // Sign Up function
  const signUp = useCallback(async (email: string, password: string, source: "direct" | "lenderline" = "direct") => {
    try {
      console.log(`[Auth] Signing up: ${email}`);
      let role: "borrower" | "advisor" | "admin" = "borrower";
      if (email === 'advisor1@capmatch.com') role = 'advisor';
      else if (email === 'admin@capmatch.com') role = 'admin';

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role, loginSource: source },
        },
      });
      if (error) throw error;
      // onAuthStateChange will handle setting user state and creating profile via trigger
    } catch (error) {
      console.error("[Auth] Sign up process failed:", error);
      throw error;
    }
  }, []);

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
        signInWithPassword,
        signUp,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
