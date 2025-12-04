// src/stores/useAuthStore.ts
import { create } from "zustand";
import { supabase } from "../../lib/supabaseClient";
import {
  EnhancedUser,
  // New schema types
  Org,
  OrgMemberRole,
  OrgMember,
} from "@/types/enhanced-types";
import { Session } from "@supabase/supabase-js"; // Import Session type

interface AuthState {
  user: EnhancedUser | null;
  isAuthenticated: boolean;
  /**
   * Transient flag for the *initial* auth/session resolution on app load.
   * Only this should gate the global "Initializing application..." splash.
   */
  isHydrating: boolean;
  /**
   * General auth loading flag (login/logout, etc).
   * This should NOT be used to block the entire app from rendering.
   */
  isLoading: boolean;
  loginSource: "direct" | "lenderline";
  justLoggedIn: boolean;
  // RBAC additions - updated for new schema
  activeOrg: Org | null;
  orgMemberships: OrgMember[];
  currentOrgRole: "owner" | "member" | null;
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
  // On first load we are hydrating until `checkInitialSession` settles.
  isHydrating: true,
  isLoading: true,
  loginSource: "direct",
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
      return () => {}; // Return no-op, don't re-initialize
    }

    authListenerInitialized = true;

    // Immediately check for existing session - SYNCHRONOUSLY start this
    const checkInitialSession = async () => {
      try {
        // We're now in the initial hydration phase.
        set({ isHydrating: true, isLoading: true });
        const {
          data: { session },
          error: sessionError, // Renamed error to sessionError
        } = await supabase.auth.getSession();

        if (sessionError) {
          // Used sessionError
          console.error("[AuthStore] ❌ Error getting session:", sessionError);
          set({ isHydrating: false, isLoading: false });
          return;
        }

        if (session?.user) {
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
            };

            set({
              user: enhancedUser,
              isAuthenticated: true,
              loginSource,
              isHydrating: false,
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
          } else {

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
                set({ isHydrating: false, isLoading: false });
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
                };

                set({
                  user: enhancedUser,
                  isAuthenticated: true,
                  loginSource,
                  isHydrating: false,
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
                set({ isHydrating: false, isLoading: false });
              }
            } catch (e) {
              console.error(
                "[AuthStore] Exception during onboarding for initial session:",
                e
              );
              await supabase.auth.signOut();
              set({ isHydrating: false, isLoading: false });
            }
          }
        } else {
          set({ isHydrating: false, isLoading: false });
        }
      } catch (e) {
        console.error("[AuthStore] ❌ Error in checkInitialSession:", e);
        set({ isHydrating: false, isLoading: false });
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

          // Ignore INITIAL_SESSION since we handle it above
          if (event === "INITIAL_SESSION") {
            return;
          }

          // Don't show loading spinner for token refresh
          if (event === "TOKEN_REFRESHED") {
            return;
          }

          // Get current state to check if user is already authenticated
          const currentState = get();
          const isAlreadyAuthenticated =
            currentState.isAuthenticated && currentState.user;

          // Only show *auth* loading (not global hydration) for actual auth changes.
          if (event === "SIGNED_IN" && !isAlreadyAuthenticated) {
            // This is a fresh login, show auth loading but do not re-trigger hydration gating.
            set({ isLoading: true, justLoggedIn: true });
          } else if (event === "SIGNED_IN" && isAlreadyAuthenticated) {
            // User is already logged in, this is just a session revalidation (e.g., tab switch)
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
                };

                set({
                  user: enhancedUser,
                  isAuthenticated: true,
                  loginSource: oauthLoginSource, // Used oauthLoginSource
                });

                // Load org memberships for borrower/lender users
                if (
                  enhancedUser.role === "borrower" ||
                  enhancedUser.role === "lender" ||
                  enhancedUser.role === "advisor"
                ) {
                  get().loadOrgMemberships();
                }
              } else {
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
                    };

                    set({
                      user: enhancedUser,
                      isAuthenticated: true,
                      loginSource: oauthLoginSource, // Used oauthLoginSource
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
                justLoggedIn: false,
                // Clear RBAC data
                activeOrg: null,
                orgMemberships: [],
                currentOrgRole: null,
              });
            }
          } catch (e) {
            console.error("[AuthStore] Error in auth state change handler:", e);
            set({ user: null, isAuthenticated: false });
          } finally {
            // Auth event has finished processing; clear auth loading.
            set({ isLoading: false });
          }
        }
      );

      authSubscription = subscription;
    });

    // Return cleanup function
    return () => {
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const msg = (error as any)?.message || String(error);

        // Map common Supabase auth errors to a clean, user-friendly message.
        if (/invalid login credentials/i.test(msg)) {
          throw new Error("Incorrect email or password.");
        }

        throw new Error(msg || "Could not sign you in. Please try again.");
      }
      // If no error, auth listener + auth state change handler will update state.
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
          // Redirect back to the login page; the login route will immediately
          // send the user to the correct dashboard based on their role.
          redirectTo: `${window.location.origin}/login`,
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
      };
    });
  },

  // RBAC methods
  loadOrgMemberships: async () => {
    const { user } = get();

    if (!user || !user.id) {
      return;
    }

    try {
      // Load org memberships for all roles
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

      // If no memberships found, leave state empty (user may need to accept an invite)
      if (orgMemberships.length === 0) {
        set({ orgMemberships: [], activeOrg: null, currentOrgRole: null });
        return;
      }

      // Single-org assumption: pick the first membership
      const firstMembership = orgMemberships[0];
      const activeOrg = (firstMembership.orgs as Org) || null; // Added type assertion
      const currentOrgRole = (firstMembership.role as OrgMemberRole) || null;

      set({
        orgMemberships,
        activeOrg,
        currentOrgRole,
      });
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
