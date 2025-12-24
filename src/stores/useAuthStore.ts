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
import { apiClient } from "@/lib/apiClient";

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
  // Tracks when a manual logout is in progress so we can skip "unexpected sign out" recovery
  isManualLogout: boolean;
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
// Track recovery attempts to prevent infinite loops
let recoveryAttempts = 0;
const MAX_RECOVERY_ATTEMPTS = 2;
let lastRecoveryAttempt = 0;
const RECOVERY_COOLDOWN_MS = 5000; // 5 seconds between recovery attempts

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
  isManualLogout: false,
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

              const { error: onboardError } = await apiClient.onboardBorrower({
                existing_user: true,
                user_id: authUser.id,
                email: userEmail,
                full_name: fullName,
              });

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

          // Handle token refresh events
          if (event === "TOKEN_REFRESHED") {
            // If session is null after refresh, the refresh failed
            if (!session) {
              console.warn("[AuthStore] Token refresh failed - session is null");
              
              // Check if we should attempt recovery
              const now = Date.now();
              const canAttemptRecovery = 
                recoveryAttempts < MAX_RECOVERY_ATTEMPTS &&
                (now - lastRecoveryAttempt) > RECOVERY_COOLDOWN_MS;
              
              if (canAttemptRecovery) {
                recoveryAttempts++;
                lastRecoveryAttempt = now;
                
                console.log(`[AuthStore] Attempting session recovery (attempt ${recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS})...`);
                
                try {
                  // Try to get the current session - this might recover if it's a transient error
                  const { data: { session: recoveredSession }, error: recoveryError } = 
                    await supabase.auth.getSession();
                  
                  if (recoveryError) {
                    console.error("[AuthStore] Session recovery failed:", recoveryError);
                    // If recovery fails, check if user was previously authenticated
                    const currentState = get();
                    if (currentState.isAuthenticated && currentState.user) {
                      // User was authenticated but recovery failed - this is unexpected
                      console.error("[AuthStore] Unexpected sign out after token refresh failure");
                      // Don't immediately sign out - let the SIGNED_OUT event handle it if needed
                    }
                  } else if (recoveredSession?.user) {
                    console.log("[AuthStore] Session recovery successful");
                    recoveryAttempts = 0; // Reset on success
                    // The session recovery will trigger another auth state change event
                    // which will handle setting up the user state
                    return;
                  } else {
                    console.warn("[AuthStore] Session recovery returned no session");
                  }
                } catch (recoveryException) {
                  console.error("[AuthStore] Exception during session recovery:", recoveryException);
                }
              } else {
                console.warn("[AuthStore] Max recovery attempts reached or cooldown active, skipping recovery");
              }
            } else {
              // Successful refresh - reset recovery attempts
              recoveryAttempts = 0;
            }
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
            const currentState = get();
            const isManualLogout = currentState.isManualLogout;

            // Only attempt recovery for *unexpected* sign-outs
            if (!isManualLogout && currentState.isAuthenticated && currentState.user) {
              console.warn("[AuthStore] Unexpected SIGNED_OUT event - user was authenticated");
              
              // Attempt recovery before signing out
              const now = Date.now();
              const canAttemptRecovery = 
                recoveryAttempts < MAX_RECOVERY_ATTEMPTS &&
                (now - lastRecoveryAttempt) > RECOVERY_COOLDOWN_MS;
              
              if (canAttemptRecovery) {
                recoveryAttempts++;
                lastRecoveryAttempt = now;
                
                console.log(`[AuthStore] Attempting recovery from unexpected sign out (attempt ${recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS})...`);
                
                try {
                  const { data: { session: recoveredSession }, error: recoveryError } = 
                    await supabase.auth.getSession();
                  
                  if (!recoveryError && recoveredSession?.user) {
                    console.log("[AuthStore] Recovered from unexpected sign out");
                    recoveryAttempts = 0; // Reset on success
                    // Don't process SIGNED_OUT - the recovered session will trigger SIGNED_IN
                    return;
                  } else {
                    console.warn("[AuthStore] Recovery from unexpected sign out failed:", recoveryError);
                    // Fall through to normal SIGNED_OUT handling
                  }
                } catch (recoveryException) {
                  console.error("[AuthStore] Exception during recovery from sign out:", recoveryException);
                  // Fall through to normal SIGNED_OUT handling
                }
              }
            }
            
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
                  const { error: onboardError } = await apiClient.onboardBorrower({
                    existing_user: true,
                    user_id: authUser.id,
                    email: userEmail,
                    full_name: fullName,
                  });
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
              // Only clear state if this is a legitimate sign out (not a recovery scenario)
              // Recovery attempts are handled above, so if we reach here, it's a real sign out
              recoveryAttempts = 0; // Reset recovery attempts on legitimate sign out
              set({
                user: null,
                isAuthenticated: false,
                loginSource: "direct",
                justLoggedIn: false,
                // Clear RBAC data
                activeOrg: null,
                orgMemberships: [],
                currentOrgRole: null,
                isManualLogout: false,
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

      // Use the FastAPI endpoint to onboard the borrower
      const { data, error } = await apiClient.onboardBorrower({
        email,
        password,
        full_name: "New User", // Assuming a default name for now
      });

      if (error) {
        throw error;
      }

      // After a successful sign-up via API, the user is created
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
    // Mark this as an intentional/manual logout and show auth loading
    set({ isLoading: true, isManualLogout: true });
    // Reset recovery attempts on manual logout
    recoveryAttempts = 0;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[AuthStore] Logout error:", error.message);
        // If signOut fails, clear manual logout flag so future unexpected events can still recover
        set({ isManualLogout: false });
      }
      // Auth listener will handle state reset
      set({ justLoggedIn: false });
    } catch (error) {
      console.error("[AuthStore] Logout failed:", error);
      set({ isLoading: false, isManualLogout: false });
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
    // NOTE: This function signature is incomplete - the API requires password and full_name
    // This function may be unused or needs to be updated to match the new API signature
    // For accepting invites, use useOrgStore.acceptInvite() instead
    console.warn(
      "[AuthStore] acceptInvite called with incomplete signature. " +
      "Use useOrgStore.acceptInvite() with password and full_name instead."
    );
    throw new Error(
      "acceptInvite requires password and full_name. Use useOrgStore.acceptInvite() instead."
    );
  },
}));

// Initialize auth listener ONCE when the store is created
useAuthStore.getState().init();
