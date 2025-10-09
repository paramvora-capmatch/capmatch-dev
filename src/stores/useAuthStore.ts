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
  isDemo: boolean;
  justLoggedIn: boolean;
}

interface AuthActions {
  init: () => () => void;
  signInWithPassword: (
    email: string,
    password: string,
    source?: "direct" | "lenderline"
  ) => Promise<void>;
  signInWithGoogle: (source?: "direct" | "lenderline") => Promise<void>;
  signUp: (
    email: string,
    password: string,
    source?: "direct" | "lenderline"
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<EnhancedUser>) => void;
  _setUser: (user: EnhancedUser | null) => void;
  _setLoading: (loading: boolean) => void;
  clearJustLoggedIn: () => void;
}

// Global singleton to ensure auth listener is set up only once across all navigations
let authListenerInitialized = false;
let authSubscription: any = null;
let initialSessionCheckComplete = false;

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  loginSource: "direct",
  isDemo: false,
  justLoggedIn: false,
  clearJustLoggedIn: () => set({ justLoggedIn: false }),
  _setUser: (user) => set({ user, isAuthenticated: !!user }),
  _setLoading: (isLoading) => set({ isLoading }),

  init: () => {
    if (authListenerInitialized) {
      console.log("[AuthStore] Listener already initialized, skipping setup.");
      return () => {}; // Return no-op, don't re-initialize
    }

    authListenerInitialized = true;
    console.log(
      "[AuthStore] 🚀 Initializing auth listener for the first time."
    );

    // Immediately check for existing session - SYNCHRONOUSLY start this
    const checkInitialSession = async () => {
      console.log("[AuthStore] 🔍 Checking for existing session...");

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("[AuthStore] ❌ Error getting session:", error);
          set({ isLoading: false });
          return;
        }

        if (session?.user) {
          console.log(
            "[AuthStore] 📋 Found existing session for:",
            session.user.email
          );
          const authUser = session.user;

          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role, full_name")
            .eq("id", authUser.id)
            .single();

          if (profile && !profileError) {
            const role = profile.role as EnhancedUser["role"];
            const loginSource = authUser.user_metadata.loginSource || "direct";
            const enhancedUser: EnhancedUser = {
              id: authUser.id,
              email: authUser.email!,
              role,
              loginSource,
              lastLogin: new Date(authUser.last_sign_in_at || Date.now()),
              name: profile.full_name || authUser.user_metadata.name,
              isDemo: false,
            };

            set({
              user: enhancedUser,
              isAuthenticated: true,
              loginSource,
              isDemo: false,
              isLoading: false,
            });

            console.log(
              `[AuthStore] ✅ Initial session restored: ${enhancedUser.email} (${enhancedUser.role})`
            );
          } else {
            console.error(
              "[AuthStore] ❌ Error fetching profile:",
              profileError
            );
            await supabase.auth.signOut();
            set({ isLoading: false });
          }
        } else {
          console.log("[AuthStore] ℹ️ No existing session found.");
          set({ isLoading: false });
        }
      } catch (e) {
        console.error("[AuthStore] ❌ Error in checkInitialSession:", e);
        set({ isLoading: false });
      } finally {
        initialSessionCheckComplete = true;
        console.log("[AuthStore] 🏁 Initial session check complete");
      }
    };

    // Run initial session check immediately, then set up listener
    checkInitialSession().then(() => {
      // Now set up the auth state change listener after initial check
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`[AuthStore] 📡 Auth event received: ${event}`);

        // Ignore INITIAL_SESSION since we handle it above
        if (event === "INITIAL_SESSION") {
          console.log(
            "[AuthStore] ⏭️ Ignoring INITIAL_SESSION event (handled manually)"
          );
          return;
        }

        // Don't show loading spinner for token refresh
        if (event === "TOKEN_REFRESHED") {
          console.log("[AuthStore] 🔄 Token refreshed silently");
          return;
        }

        // Get current state to check if user is already authenticated
        const currentState = get();
        const isAlreadyAuthenticated =
          currentState.isAuthenticated && currentState.user;

        // Only show loading for actual authentication changes, not re-validation
        if (event === "SIGNED_IN" && !isAlreadyAuthenticated) {
          // This is a fresh login, show loading
          set({ isLoading: true, justLoggedIn: true });
          console.log(
            "[AuthStore] 🔒 Fresh login detected, setting loading and justLoggedIn state"
          );
        } else if (event === "SIGNED_IN" && isAlreadyAuthenticated) {
          // User is already logged in, this is just a session revalidation (e.g., tab switch)
          console.log(
            "[AuthStore] ✓ Session revalidation (user already authenticated)"
          );
          return; // Don't process this event, user is already set up
        } else if (event === "SIGNED_OUT") {
          set({ isLoading: true });
        }

        try {
          if (session?.user) {
            // Retrieve and clear login source for OAuth flows on first sign in
            let loginSource =
              session.user.user_metadata.loginSource || "direct";
            if (
              event === "SIGNED_IN" &&
              !session.user.user_metadata.loginSource
            ) {
              const storedSource = sessionStorage.getItem("oauth_login_source");
              if (storedSource) {
                loginSource = storedSource;
                sessionStorage.removeItem("oauth_login_source"); // Clean up
                // Persist to user_metadata
                supabase.auth.updateUser({
                  data: { loginSource: loginSource },
                });
              }
            }

            const authUser = session.user;
            const { data: profile, error } = await supabase
              .from("profiles")
              .select("role, full_name")
              .eq("id", authUser.id)
              .single();

            if (profile && !error) {
              const role = profile.role as EnhancedUser["role"];
              const enhancedUser: EnhancedUser = {
                id: authUser.id,
                email: authUser.email!,
                role,
                loginSource,
                lastLogin: new Date(authUser.last_sign_in_at || Date.now()),
                name: profile.full_name || authUser.user_metadata.name,
                isDemo: false,
              };

              set({
                user: enhancedUser,
                isAuthenticated: true,
                loginSource,
                isDemo: false,
              });

              console.log(
                `[AuthStore] ✅ User authenticated via ${event}: ${enhancedUser.email}`
              );
            } else {
              console.error("[AuthStore] Profile fetch failed:", error);
              await supabase.auth.signOut();
            }
          } else if (event === "SIGNED_OUT") {
            set({
              user: null,
              isAuthenticated: false,
              loginSource: "direct",
              isDemo: false,
              justLoggedIn: false,
            });
            console.log("[AuthStore] 👋 User signed out");
          }
        } catch (e) {
          console.error("[AuthStore] Error in auth state change handler:", e);
          set({ user: null, isAuthenticated: false, isDemo: false });
        } finally {
          set({ isLoading: false });
          console.log("[AuthStore] ✅ Auth event processed");
        }
      });

      authSubscription = subscription;
      console.log("[AuthStore] 🎧 Auth listener registered");
    });

    // Return cleanup function
    return () => {
      console.log("[AuthStore] 🧹 Cleaning up auth listener");
      if (authSubscription) {
        authSubscription.unsubscribe();
        authSubscription = null;
      }
      authListenerInitialized = false;
    };
  },

  signInWithPassword: async (email, password, source = "direct") => {
    set({ isLoading: true });

    try {
      const demoAccounts = [
        "borrower1@example.com",
        "borrower2@example.com",
        "advisor1@capmatch.com",
        "admin@capmatch.com",
        "lender1@example.com",
      ];

      if (demoAccounts.includes(email) && password === "password123") {
        console.log(`[Auth] 🎭 Using demo account: ${email}`);

        if (email.startsWith("borrower")) {
          const profiles =
            (await storageService.getItem<any[]>("borrowerProfiles")) || [];
          if (!profiles.some((p) => p.userId === email)) {
            console.log(`[Auth] 🌱 Seeding data for ${email}`);
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
          isDemo: true,
        };

        set({
          user: newUser,
          isAuthenticated: true,
          loginSource: source,
          isDemo: true,
          isLoading: false,
          justLoggedIn: true,
        });
      } else if (demoAccounts.includes(email) && password !== "password123") {
        throw new Error("Invalid password for demo account.");
      } else {
        console.log(`[Auth] 🔐 Signing in with Supabase: ${email}`);
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Auth listener will handle state update
      }
    } catch (error) {
      console.error("[Auth] ❌ Sign in failed:", error);
      set({ isLoading: false });
      throw error;
    }
  },

  signInWithGoogle: async (source = "direct") => {
    // This action will cause a page redirect. The loading state will be handled
    // by the onAuthStateChange listener when the user is redirected back.
    // Setting isLoading: true here is not necessary as the page will unload.
    try {
      sessionStorage.setItem("oauth_login_source", source);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("[Auth] ❌ Google Sign-In failed:", error);
      // If redirect fails for some reason, ensure loading state is turned off.
      set({ isLoading: false });
    }
  },

  signUp: async (email, password, source = "direct") => {
    try {
      console.log(`[Auth] 📝 Signing up: ${email}`);
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
    } catch (error) {
      console.error("[Auth] ❌ Sign up failed:", error);
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    console.log("[AuthStore] 🚪 Logout initiated");

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[AuthStore] Logout error:", error.message);
      }
      // Auth listener will handle state reset
      set({ justLoggedIn: false });
    } catch (error) {
      console.error("[AuthStore] Logout failed:", error);
      set({ isLoading: false });
    }
  },

  updateUser: (userData) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...userData };
      return {
        user: updatedUser,
        loginSource: updatedUser.loginSource || state.loginSource,
        isDemo: state.isDemo,
      };
    });
  },
}));

// Initialize auth listener ONCE when the store is created
useAuthStore.getState().init();
