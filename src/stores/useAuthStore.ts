// src/stores/useAuthStore.ts
import { create } from "zustand";
import { supabase } from "../../lib/supabaseClient";
import { storageService } from "@/lib/storage";
import {
  EnhancedUser,
  // New schema types
  Org,
  OrgMemberRole,
  OrgMember,
} from "@/types/enhanced-types";
import { mockProfiles, mockProjects } from "../../lib/mockData";
import { Session } from "@supabase/supabase-js"; // Import Session type

interface AuthState {
  user: EnhancedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginSource: "direct" | "lenderline";
  isDemo: boolean;
  justLoggedIn: boolean;
  // RBAC additions - updated for new schema
  activeOrg: Org | null;
  orgMemberships: OrgMember[];
  currentOrgRole: "owner" | "project_manager" | "member" | null;
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
  // RBAC additions
  loadOrgMemberships: () => Promise<void>;
  acceptInvite: (token: string, accept?: boolean) => Promise<void>;
}

// Global singleton to ensure auth listener is set up only once across all navigations
let authListenerInitialized = false;
let authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  loginSource: "direct",
  isDemo: false,
  justLoggedIn: false,
  // RBAC additions - updated for new schema
  activeOrg: null,
  orgMemberships: [],
  currentOrgRole: null,
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
          error: sessionError, // Renamed error to sessionError
        } = await supabase.auth.getSession();

        if (sessionError) {
          // Used sessionError
          console.error("[AuthStore] ❌ Error getting session:", sessionError);
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
            .select("app_role, full_name")
            .eq("id", authUser.id)
            .single();

          if (profile && !profileError) {
            const role = profile.app_role as EnhancedUser["role"]; // Removed 'as any'
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

            // Load org memberships for borrower/lender users
            if (
              enhancedUser.role === "borrower" ||
              enhancedUser.role === "lender" ||
              enhancedUser.role === "advisor"
            ) {
              get().loadOrgMemberships();
            }

            console.log(
              `[AuthStore] ✅ Initial session restored: ${enhancedUser.email} (${enhancedUser.role})`
            );
            console.log("[AuthStore] 🔍 Debug - User object:", enhancedUser);
          } else {
            console.warn(
              "[AuthStore] Profile not found during initial session. Attempting onboarding for existing user."
            );

            try {
              const userEmail = authUser.email;
              const fullName = authUser.user_metadata?.name || "New User";
              if (!userEmail) {
                throw new Error("Authenticated user has no email");
              }

              const { error: onboardError } = await supabase.functions.invoke(
                "onboard-borrower",
                {
                  body: {
                    existing_user: true,
                    user_id: authUser.id,
                    email: userEmail,
                    full_name: fullName,
                  },
                }
              );

              if (onboardError) {
                console.error(
                  "[AuthStore] Onboarding existing user during initial session failed:",
                  onboardError
                );
                await supabase.auth.signOut();
                set({ isLoading: false });
                return;
              }

              // Fetch profile again after onboarding
              const { data: profileAfter, error: profileAfterErr } = await supabase
                .from("profiles")
                .select("app_role, full_name")
                .eq("id", authUser.id)
                .single();

              if (profileAfter && !profileAfterErr) {
                const role = profileAfter.app_role as EnhancedUser["role"]; // Removed 'as any'
                const loginSource = authUser.user_metadata.loginSource || "direct";
                const enhancedUser: EnhancedUser = {
                  id: authUser.id,
                  email: authUser.email!,
                  role,
                  loginSource,
                  lastLogin: new Date(authUser.last_sign_in_at || Date.now()),
                  name: profileAfter.full_name || authUser.user_metadata.name,
                  isDemo: false,
                };

                set({
                  user: enhancedUser,
                  isAuthenticated: true,
                  loginSource,
                  isDemo: false,
                  isLoading: false,
                });

                if (
                  enhancedUser.role === "borrower" ||
                  enhancedUser.role === "lender" ||
                  enhancedUser.role === "advisor"
                ) {
                  get().loadOrgMemberships();
                }
              } else {
                console.error(
                  "[AuthStore] Profile still missing after onboarding during initial session:",
                  profileAfterErr
                );
                await supabase.auth.signOut();
                set({ isLoading: false });
              }
            } catch (e) {
              console.error(
                "[AuthStore] Exception during onboarding for initial session:",
                e
              );
              await supabase.auth.signOut();
              set({ isLoading: false });
            }
          }
        } else {
          console.log("[AuthStore] ℹ️ No existing session found.");
          set({ isLoading: false });
        }
      } catch (e) {
        console.error("[AuthStore] ❌ Error in checkInitialSession:", e);
        set({ isLoading: false });
      }
    };

    // Run initial session check immediately, then set up listener
    checkInitialSession().then(() => {
      // Now set up the auth state change listener after initial check
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(
        async (event: string, session: Session | null) => {
          // Added type annotations
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
              let oauthLoginSource = // Renamed loginSource to oauthLoginSource
                session.user.user_metadata.loginSource || "direct";
              if (
                event === "SIGNED_IN" &&
                !session.user.user_metadata.loginSource
              ) {
                const storedSource =
                  sessionStorage.getItem("oauth_login_source");
                if (storedSource) {
                  oauthLoginSource = storedSource; // Used oauthLoginSource
                  sessionStorage.removeItem("oauth_login_source"); // Clean up
                  // Persist to user_metadata
                  supabase.auth.updateUser({
                    data: { loginSource: oauthLoginSource }, // Used oauthLoginSource
                  });
                }
              }

              const authUser = session.user;
              const { data: profile, error } = await supabase
                .from("profiles")
                .select("app_role, full_name")
                .eq("id", authUser.id)
                .single();

              if (profile && !error) {
                const role = profile.app_role as EnhancedUser["role"]; // Removed 'as any'
                const enhancedUser: EnhancedUser = {
                  id: authUser.id,
                  email: authUser.email!,
                  role,
                  loginSource: oauthLoginSource, // Used oauthLoginSource
                  lastLogin: new Date(authUser.last_sign_in_at || Date.now()),
                  name: profile.full_name || authUser.user_metadata.name,
                  isDemo: false,
                };

                set({
                  user: enhancedUser,
                  isAuthenticated: true,
                  loginSource: oauthLoginSource, // Used oauthLoginSource
                  isDemo: false,
                });

                // Load org memberships for borrower/lender users
                if (
                  enhancedUser.role === "borrower" ||
                  enhancedUser.role === "lender" ||
                  enhancedUser.role === "advisor"
                ) {
                  get().loadOrgMemberships();
                }

                console.log(
                  `[AuthStore] ✅ User authenticated via ${event}: ${enhancedUser.email}`
                );
              } else {
                console.warn("[AuthStore] Profile not found. Attempting onboarding for existing user (e.g., Google sign-in)");
                try {
                  const userEmail = authUser.email;
                  const fullName = authUser.user_metadata?.name || "New User";
                  if (!userEmail) {
                    throw new Error("Authenticated user has no email");
                  }
                  const { error: onboardError } = await supabase.functions.invoke(
                    "onboard-borrower",
                    {
                      body: {
                        existing_user: true,
                        user_id: authUser.id,
                        email: userEmail,
                        full_name: fullName,
                      },
                    }
                  );
                  if (onboardError) {
                    console.error("[AuthStore] Onboarding existing user failed:", onboardError);
                    await supabase.auth.signOut();
                    return;
                  }

                  // Fetch profile again after onboarding
                  const { data: profileAfter, error: profileAfterErr } = await supabase
                    .from("profiles")
                    .select("app_role, full_name")
                    .eq("id", authUser.id)
                    .single();

                  if (profileAfter && !profileAfterErr) {
                    const role = profileAfter.app_role as EnhancedUser["role"]; // Removed 'as any'
                    const enhancedUser: EnhancedUser = {
                      id: authUser.id,
                      email: authUser.email!,
                      role,
                      loginSource: oauthLoginSource, // Used oauthLoginSource
                      lastLogin: new Date(authUser.last_sign_in_at || Date.now()),
                      name: profileAfter.full_name || authUser.user_metadata.name,
                      isDemo: false,
                    };

                    set({
                      user: enhancedUser,
                      isAuthenticated: true,
                      loginSource: oauthLoginSource, // Used oauthLoginSource
                      isDemo: false,
                    });

                    if (
                      enhancedUser.role === "borrower" ||
                      enhancedUser.role === "lender" ||
                      enhancedUser.role === "advisor"
                    ) {
                      get().loadOrgMemberships();
                    }
                  } else {
                    console.error("[AuthStore] Profile still missing after onboarding:", profileAfterErr);
                    await supabase.auth.signOut();
                  }
                } catch (onboardException) {
                  console.error("[AuthStore] Exception during existing user onboarding:", onboardException);
                  await supabase.auth.signOut();
                }
              }
            } else if (event === "SIGNED_OUT") {
              set({
                user: null,
                isAuthenticated: false,
                loginSource: "direct",
                isDemo: false,
                justLoggedIn: false,
                // Clear RBAC data
                activeOrg: null,
                orgMemberships: [],
                currentOrgRole: null,
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
        }
      );

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
            (await storageService.getItem<Record<string, unknown>[]>("borrowerProfiles")) || [];
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
              (await storageService.getItem<Record<string, unknown>[]>("projects")) || [];
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
        if (email.includes("admin@capmatch.com")) role = "advisor";
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

        if (error) {
          // If credentials are invalid, attempt onboarding as a new user.
          // If the email already exists (e.g., different auth method), onboarding will fail and we surface invalid credentials.
          const message = (error as any)?.message || String(error);
          console.warn("[Auth] Sign-in failed, attempting onboarding fallback:", message);
          try {
            const { data: onboardData, error: onboardError } = await supabase.functions.invoke(
              "onboard-borrower",
              {
                body: {
                  email,
                  password,
                  full_name: "New User",
                },
              }
            );

            if (onboardError) {
              const oeMsg = typeof onboardError === "object" && onboardError !== null && "message" in onboardError
                ? (onboardError as any).message
                : String(onboardError);
              // If user already exists, treat as invalid credentials for this flow
              if (/already\s*(registered|exists)/i.test(oeMsg)) {
                throw new Error("Invalid email or password.");
              }
              throw new Error(oeMsg);
            }

            if (!onboardData?.user) {
              throw new Error("Onboarding did not return user data");
            }

            // After onboarding, sign the user in
            const { error: postOnboardSignInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            if (postOnboardSignInError) {
              throw postOnboardSignInError;
            }
            // Auth listener will handle state update
          } catch (fallbackErr) {
            console.error("[Auth] Fallback onboarding flow failed:", fallbackErr);
            throw fallbackErr;
          }
        }
        // If no error, auth listener will handle state update
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

  signUp: async (email, password) => {
    try {
      console.log(`[Auth] 📝 Signing up via Edge Function: ${email}`);

      // We are now calling our custom Edge Function
      const { data, error } = await supabase.functions.invoke(
        "onboard-borrower",
        {
          body: { email, password, full_name: "New User" }, // Assuming a default name for now
        }
      );

      if (error) {
        // The error from the function might be a string or an object
        const errorMessage =
          typeof error === "object" && error !== null && "message" in error
            ? error.message
            : String(error);
        throw new Error(errorMessage);
      }

      // After a successful sign-up via edge function, the user is created
      // but is not yet logged in on the client. We now sign them in.
      if (data?.user) {
        console.log("[Auth] ✅ Sign-up successful, now signing in...");
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }
        // The onAuthStateChange listener will now handle the SIGNED_IN event
        // and set the user state correctly.
      } else {
        throw new Error("Sign up function returned no user data.");
      }
    } catch (error: unknown) {
      console.error("[Auth] ❌ Sign up flow failed:", error);
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

  // RBAC methods
  loadOrgMemberships: async () => {
    const { user } = get();
    console.log("[AuthStore] 🔍 DEBUG - Starting loadOrgMemberships");
    console.log(
      "[AuthStore] 🔍 DEBUG - User:",
      user ? { id: user.id, email: user.email, role: user.role } : "null"
    );

    if (!user || !user.id) {
      console.log("[AuthStore] ❌ No user or user ID found");
      return;
    }

    try {
      // Load org memberships for all roles
      console.log("[AuthStore] 🔍 DEBUG - Querying org_members table...");
      const { data: memberships, error } = await supabase
        .from("org_members")
        .select(
          `
          *,
          orgs(*)
        `
        )
        .eq("user_id", user.id);

      if (error) {
        console.error("[AuthStore] ❌ Error querying org_members:", error);
        throw error;
      }

      const orgMemberships = memberships || [];
      console.log(
        "[AuthStore] 🔍 DEBUG - Raw memberships from DB:",
        orgMemberships.length
      );
      if (orgMemberships.length > 0) {
        console.log(
          "[AuthStore] 🔍 DEBUG - Sample membership:",
          orgMemberships[0]
        );
      }

      // If no memberships found, leave state empty (user may need to accept an invite)
      if (orgMemberships.length === 0) {
        console.log("[AuthStore] ❌ No memberships found for user");
        set({ orgMemberships: [], activeOrg: null, currentOrgRole: null });
        return;
      }

      // Single-org assumption: pick the first membership
      const firstMembership = orgMemberships[0];
      const activeOrg = (firstMembership.orgs as Org) || null; // Added type assertion
      const currentOrgRole = (firstMembership.role as OrgMemberRole) || null;

      console.log(
        "[AuthStore] 🔍 DEBUG - Setting active org:",
        activeOrg ? { id: activeOrg.id, name: activeOrg.name } : "null"
      );
      console.log(
        "[AuthStore] 🔍 DEBUG - Setting current org role:",
        currentOrgRole
      );

      set({
        orgMemberships,
        activeOrg,
        currentOrgRole,
      });

      console.log("[AuthStore] ✅ Org memberships loaded successfully");
    } catch (error) {
      console.error("[AuthStore] ❌ Error loading org memberships:", error);
    }
  },

  acceptInvite: async (token: string, accept: boolean = true) => {
    try {
      const { error } = await supabase.functions.invoke("accept-invite", {
        // Removed 'data' as it's unused
        body: { token, accept },
      });
      if (error) throw error;
      // Refresh memberships after accepting/cancelling
      await get().loadOrgMemberships();
    } catch (e) {
      console.error("[AuthStore] acceptInvite failed:", e);
      throw e;
    }
  },
}));

// Initialize auth listener ONCE when the store is created
useAuthStore.getState().init();
