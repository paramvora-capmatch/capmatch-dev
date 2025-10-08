// src/stores/useAuthStore.ts
import { create } from "zustand";
import { supabase } from "../../lib/supabaseClient";
import { storageService } from "@/lib/storage";
import { EnhancedUser } from "@/types/enhanced-types";
import { mockProfiles, mockProjects } from "../../lib/mockData";

interface AuthState {
  user: EnhancedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginSource: "direct" | "lenderline";
}

interface AuthActions {
  init: () => () => void; // Returns the unsubscribe function
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
  logout: () => Promise<void>;
  updateUser: (userData: Partial<EnhancedUser>) => void;
  _setUser: (user: EnhancedUser | null) => void;
  _setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  loginSource: "direct",
  _setUser: (user) => set({ user, isAuthenticated: !!user }),
  _setLoading: (isLoading) => set({ isLoading }),

  init: () => {
    console.log("[AuthStore] Initializing auth listener.");
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      get()._setLoading(true);
      console.log(`[AuthStore] ⏳ Auth event: ${event}. Starting auth check.`);
      try {
        // If there is a session, the user might be logged in.
        if (session?.user) {
          if (event === "SIGNED_IN")
            sessionStorage.setItem("justLoggedIn", "true");

          const authUser = session!.user;
          const currentUser = get().user;

          // On refresh, a SIGNED_IN event fires. If we already have this user in state,
          // we can skip the expensive profile fetch and just finish loading.
          if (
            currentUser &&
            currentUser.id === authUser.id &&
            event === "SIGNED_IN"
          ) {
            console.log(
              `[AuthStore] ✅ User ${authUser.email} already in state during SIGNED_IN (refresh). Finalizing auth check.`
            );
            get()._setLoading(false); // We are done loading.
            return;
          }

          const { data: profile, error } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", authUser.id)
            .single();

          if (profile && !error) {
            const role = profile.role as EnhancedUser["role"];
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
            set({ user: enhancedUser, isAuthenticated: true, loginSource });
            console.log(
              `[AuthStore] ✅ Set user: ${enhancedUser.email} with role ${enhancedUser.role}`
            );
            get()._setLoading(false);
          } else {
            console.error(
              "Error fetching user profile or profile not found:",
              error
            );
            await supabase.auth.signOut(); // Force sign out if profile is corrupt
            // The SIGNED_OUT event will handle state clearing.
          }
        }
        // If there's no session, the user is logged out.
        else if (event === "SIGNED_OUT" || !session) {
          // Handle both explicit sign-out and initial state with no user
          await storageService.removeItem("user");
          set({ user: null, isAuthenticated: false, loginSource: "direct" });
          console.log("[AuthStore] ✅ User signed out or no session found.");
          get()._setLoading(false);
        }
      } catch (e) {
        console.error("[AuthStore] Error processing auth state change:", e);
        get()._setUser(null);
        get()._setLoading(false);
      }
    });

    return () => {
      console.log("[AuthStore] Unsubscribing from auth state changes.");
      subscription.unsubscribe();
    };
  },

  signInWithPassword: async (email, password, source = "direct") => {
    get()._setLoading(true);
    try {
      const demoAccounts = [
        "borrower1@example.com",
        "borrower2@example.com",
        "advisor1@capmatch.com",
        "admin@capmatch.com",
        "lender1@example.com",
      ];

      if (demoAccounts.includes(email) && password === "password123") {
        console.log(`[Auth] Using mock sign-in for: ${email}`);

        // Seed test data if necessary
        if (email.startsWith("borrower")) {
          const profiles =
            (await storageService.getItem<any[]>("borrowerProfiles")) || [];
          if (!profiles.some((p) => p.userId === email)) {
            console.log(`[Auth] Seeding data for ${email}`);
            const profileToSeed =
              mockProfiles[email as keyof typeof mockProfiles];
            const projectsToSeed =
              mockProjects[email as keyof typeof mockProjects] || [];

            if (profileToSeed)
              await storageService.setItem("borrowerProfiles", [
                ...profiles,
                profileToSeed,
              ]);

            const existingProjects =
              (await storageService.getItem<any[]>("projects")) || [];
            const newProjects = projectsToSeed.filter(
              (sp) => !existingProjects.some((ep) => ep.id === sp.id)
            );
            if (newProjects.length > 0)
              await storageService.setItem("projects", [
                ...existingProjects,
                ...newProjects,
              ]);
          }
        }

        const demoUserIds: { [key: string]: string } = {
          "borrower1@example.com": "00000000-0000-0000-0000-000000000001",
          "borrower2@example.com": "00000000-0000-0000-0000-000000000002",
          "advisor1@capmatch.com": "00000000-0000-0000-0000-000000000003",
          "admin@capmatch.com": "00000000-0000-0000-0000-000000000004",
          "lender1@example.com": "00000000-0000-0000-0000-000000000005",
        };

        let role: EnhancedUser["role"] = "borrower";
        if (email.includes("admin@capmatch.com")) role = "admin";
        else if (email.includes("advisor")) role = "advisor";
        else if (email.includes("lender")) role = "lender";

        const newUser: EnhancedUser = {
          id: demoUserIds[email] || `demo-user-${email}`,
          email,
          lastLogin: new Date(),
          role,
          loginSource: source,
        };

        await storageService.setItem("user", newUser);
        set({ user: newUser, isAuthenticated: true, loginSource: source });
        sessionStorage.setItem("justLoggedIn", "true");
      } else if (demoAccounts.includes(email) && password !== "password123") {
        throw new Error("Invalid password for demo account.");
      } else {
        console.log(`[Auth] Signing in with password for: ${email}`);
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // onAuthStateChange will handle setting user state
      }
    } catch (error) {
      console.error("[Auth] Sign in process failed:", error);
      throw error;
    } finally {
      get()._setLoading(false);
    }
  },

  signUp: async (email, password, source = "direct") => {
    try {
      console.log(`[Auth] Signing up: ${email}`);
      let role: EnhancedUser["role"] = "borrower";
      if (email.endsWith("@advisor.com")) role = "advisor";

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role, loginSource: source },
        },
      });
      if (error) throw error;
      // onAuthStateChange will handle setting user state
    } catch (error) {
      console.error("[Auth] Sign up process failed:", error);
      throw error;
    }
  },

  logout: async () => {
    get()._setLoading(true);
    console.log("[AuthStore] Logout initiated.");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Supabase signOut error:", error.message);
      }
      // The onAuthStateChange listener will handle clearing the state.
    } catch (error) {
      console.error("Logout failed:", error);
    }
  },

  updateUser: (userData) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...userData };
      storageService
        .setItem("user", updatedUser)
        .catch((err) => console.error("Storage update failed:", err));
      return {
        user: updatedUser,
        loginSource: updatedUser.loginSource || state.loginSource,
      };
    });
  },
}));

// Initialize the auth listener when the app loads
useAuthStore.getState().init();
