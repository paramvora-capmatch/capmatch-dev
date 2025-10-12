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
  _setLoading: (isLoading: boolean) => void;
  clearJustLoggedIn: () => void;
}

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
      return () => {};
    }

    authListenerInitialized = true;
    console.log(
      "[AuthStore] 🚀 Initializing auth listener for the first time."
    );

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

    checkInitialSession().then(() => {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`[AuthStore] 📡 Auth event received: ${event}`);

        if (event === "INITIAL_SESSION") {
          console.log(
            "[AuthStore] ⏭️ Ignoring INITIAL_SESSION event (handled manually)"
          );
          return;
        }

        if (event === "TOKEN_REFRESHED") {
          console.log("[AuthStore] 🔄 Token refreshed silently");
          return;
        }

        const currentState = get();
        const isAlreadyAuthenticated =
          currentState.isAuthenticated && currentState.user;

        if (event === "SIGNED_IN" && !isAlreadyAuthenticated) {
          set({ isLoading: true, justLoggedIn: true });
          console.log(
            "[AuthStore] 🔒 Fresh login detected, setting loading and justLoggedIn state"
          );
        } else if (event === "SIGNED_IN" && isAlreadyAuthenticated) {
          console.log(
            "[AuthStore] ✓ Session revalidation (user already authenticated)"
          );
          return;
        } else if (event === "SIGNED_OUT") {
          set({ isLoading: true });
        }

        try {
          if (session?.user) {
            let loginSource =
              session.user.user_metadata.loginSource || "direct";
            if (
              event === "SIGNED_IN" &&
              !session.user.user_metadata.loginSource
            ) {
              const storedSource = sessionStorage.getItem("oauth_login_source");
              if (storedSource) {
                loginSource = storedSource;
                sessionStorage.removeItem("oauth_login_source");
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
        console.log(`[AuthStore] 🎭 Using demo account: ${email}`);

        if (email.startsWith("borrower")) {
          const profiles =
            (await storageService.getItem<any[]>("borrowerProfiles")) || [];
          if (!profiles.some((p) => p.userId === email)) {
            console.log(`[AuthStore] 🌱 Seeding data for ${email}`);
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
      } else {
        console.log(`[AuthStore] 🔐 Signing in with Supabase: ${email}`);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        console.log("[AuthStore] Sign-in session:", {
          userId: data.session?.user.id,
          accessToken: data.session?.access_token,
        });
        if (data.session) {
          // Force session sync
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }
      }
    } catch (error) {
      console.error("[AuthStore] ❌ Sign in failed:", error);
      set({ isLoading: false });
      throw error;
    }
  },

  signInWithGoogle: async (source = "direct") => {
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
      console.error("[AuthStore] ❌ Google Sign-In failed:", error);
      set({ isLoading: false });
    }
  },

  signUp: async (email, password, source = "direct") => {
    try {
      console.log(`[AuthStore] 📝 Signing up: ${email}`);
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
      console.error("[AuthStore] ❌ Sign up failed:", error);
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

useAuthStore.getState().init();
