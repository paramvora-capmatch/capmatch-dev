// src/stores/useBorrowerProfileStore.ts
import { create } from "zustand";
import { storageService } from "@/lib/storage";
import { useAuthStore } from "./useAuthStore";
import { BorrowerProfile, Principal } from "@/types/enhanced-types";
import { supabase } from "../../lib/supabaseClient";

interface BorrowerProfileState {
  borrowerProfile: BorrowerProfile | null;
  principals: Principal[];
  isLoading: boolean;
  autoCreatedFirstProfileThisSession: boolean;
}

interface BorrowerProfileActions {
  loadBorrowerProfile: () => Promise<void>;
  createBorrowerProfile: (
    profileData: Partial<BorrowerProfile>
  ) => Promise<BorrowerProfile>;
  updateBorrowerProfile: (
    updates: Partial<BorrowerProfile>
  ) => Promise<BorrowerProfile | null>;
  addPrincipal: (principal: Partial<Principal>) => Promise<Principal>;
  updatePrincipal: (
    id: string,
    updates: Partial<Principal>
  ) => Promise<Principal | null>;
  removePrincipal: (id: string) => Promise<boolean>;
  resetProfileState: () => void;
}

const generateUniqueId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const calculateCompleteness = (
  profile: BorrowerProfile | null,
  principals: Principal[]
): number => {
  if (!profile) return 0;
  const requiredFields: (keyof BorrowerProfile)[] = [
    "fullLegalName",
    "primaryEntityName",
    "primaryEntityStructure",
    "contactEmail",
    "contactPhone",
    "contactAddress",
    "yearsCREExperienceRange",
    "assetClassesExperience",
    "geographicMarketsExperience",
    "creditScoreRange",
    "netWorthRange",
    "liquidityRange",
  ];
  let filledCount = 0;
  requiredFields.forEach((field) => {
    const value = profile[field];
    if (
      value &&
      (Array.isArray(value) ? value.length > 0 : String(value).trim() !== "")
    )
      filledCount++;
  });
  const optionalFields: (keyof BorrowerProfile)[] = [
    "bioNarrative",
    "linkedinUrl",
    "websiteUrl",
    "totalDealValueClosedRange",
    "existingLenderRelationships",
  ];
  optionalFields.forEach((field) => {
    const value = profile[field];
    if (value && String(value).trim() !== "") filledCount += 0.5;
  });
  if (principals.length > 0)
    filledCount += 1 + Math.min(principals.length, 3) * 0.5;
  const maxPoints = requiredFields.length + optionalFields.length * 0.5 + 2.5;
  return Math.min(100, Math.round((filledCount / maxPoints) * 100));
};

export const useBorrowerProfileStore = create<
  BorrowerProfileState & BorrowerProfileActions
>((set, get) => ({
  borrowerProfile: null,
  principals: [],
  isLoading: true,
  autoCreatedFirstProfileThisSession: false,

  resetProfileState: () => {
    console.log("[BorrowerProfileStore] Resetting state.");
    set({
      borrowerProfile: null,
      principals: [],
      autoCreatedFirstProfileThisSession: false,
      isLoading: false, // Done loading an empty state
    });
  },

  loadBorrowerProfile: async () => {
    const { user } = useAuthStore.getState();
    if (!user || user.role !== "borrower") {
      get().resetProfileState();
      return;
    }
    // Only set loading if there's no profile for the current user yet.
    if (get().borrowerProfile?.userId !== user.email) {
      set({ isLoading: true });
    }
    console.log(
      "[BorrowerProfileStore] ⏳ Loading profile for user:",
      user.email
    );
    try {
      let currentProfile: BorrowerProfile | undefined | null = null;

      if (user.isDemo) {
        console.log(
          "[BorrowerProfileStore] Loading profile from local storage for demo user."
        );
        const profiles =
          (await storageService.getItem<BorrowerProfile[]>(
            "borrowerProfiles"
          )) || [];
        currentProfile = profiles.find((p) => p.userId === user.email);
      } else {
        console.log(
          "[BorrowerProfileStore] Loading profile from Supabase for real user."
        );
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows found
        currentProfile = data;
      }

      if (currentProfile) {
        console.log(
          `[BorrowerProfileStore] ✅ Found existing profile: ${currentProfile.id}`
        );
        set({ borrowerProfile: currentProfile });
        // Principals are always in local storage for demo, and in Supabase for real users
        // For now, let's assume they are only local for demo.
        const allPrincipals =
          (await storageService.getItem<Principal[]>("principals")) || [];
        set({
          principals: allPrincipals.filter(
            (p) => p.borrowerProfileId === currentProfile.id
          ),
        });
      } else {
        // Auto-create profile for new user
        console.log(
          "[BorrowerProfileStore] No profile found, auto-creating..."
        );
        const newProfile = await get().createBorrowerProfile({
          userId: user.email,
          contactEmail: user.email,
        });
        useAuthStore.getState().updateUser({ profileId: newProfile.id });
        set({ autoCreatedFirstProfileThisSession: true });
        console.log(
          `[BorrowerProfileStore] ✅ Auto-created new profile: ${newProfile.id}`
        );
      }
    } catch (error) {
      console.error("[BorrowerProfileStore] Failed to load profile:", error);
      get().resetProfileState();
    } finally {
      set({ isLoading: false });
      console.log("[BorrowerProfileStore] ✅ Finished loading profile.");
    }
  },

  createBorrowerProfile: async (profileData) => {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error("User must be logged in");

    const now = new Date().toISOString();
    const newProfile: BorrowerProfile = {
      id: generateUniqueId("profile"),
      userId: user.email,
      fullLegalName: profileData.fullLegalName || "",
      primaryEntityName: profileData.primaryEntityName || "",
      primaryEntityStructure: profileData.primaryEntityStructure || "LLC",
      contactEmail: user.email,
      contactPhone: "",
      contactAddress: "",
      bioNarrative: "",
      linkedinUrl: "",
      websiteUrl: "",
      yearsCREExperienceRange: "0-2",
      assetClassesExperience: [],
      geographicMarketsExperience: [],
      totalDealValueClosedRange: "N/A",
      existingLenderRelationships: "",
      creditScoreRange: "N/A",
      netWorthRange: "<$1M",
      liquidityRange: "<$100k",
      bankruptcyHistory: false,
      foreclosureHistory: false,
      litigationHistory: false,
      completenessPercent: 0,
      createdAt: now,
      updatedAt: now,
      ...profileData,
    };
    newProfile.completenessPercent = calculateCompleteness(newProfile, []);

    set({ borrowerProfile: newProfile, principals: [] });

    if (user.isDemo) {
      const profiles =
        (await storageService.getItem<BorrowerProfile[]>("borrowerProfiles")) ||
        [];
      await storageService.setItem("borrowerProfiles", [
        ...profiles.filter((p) => p.userId !== user.email),
        newProfile,
      ]);
    } else {
      // For real users, this data is in the 'profiles' table, updated via Supabase functions or direct calls.
      // This create function is mainly for the demo flow. A real user's profile is created on sign up.
      // We can add logic here to update the Supabase profile if needed.
      // For now, let's assume this is mostly for demo mode.
      console.warn(
        "[BorrowerProfileStore] createBorrowerProfile is primarily for demo users. Real user profiles are created at sign-up."
      );
    }

    console.log(
      `[BorrowerProfileStore] Created profile ${newProfile.id} for ${user.email}`
    );
    return newProfile;
  },

  updateBorrowerProfile: async (updates) => {
    const { user } = useAuthStore.getState();
    const { borrowerProfile, principals } = get();
    if (!borrowerProfile) return null;

    const now = new Date().toISOString();
    const updatedProfile = { ...borrowerProfile, ...updates, updatedAt: now };
    updatedProfile.completenessPercent = calculateCompleteness(
      updatedProfile,
      principals
    );

    set({ borrowerProfile: updatedProfile });

    try {
      if (user?.isDemo) {
        const profiles =
          (await storageService.getItem<BorrowerProfile[]>(
            "borrowerProfiles"
          )) || [];
        const updatedProfiles = profiles.map((p) =>
          p.id === updatedProfile.id ? updatedProfile : p
        );
        await storageService.setItem("borrowerProfiles", updatedProfiles);
      } else {
        // For real users, we would update the 'profiles' table in Supabase
        const { error } = await supabase
          .from("profiles")
          .update({
            // map fields here... for now, let's assume it's just for demo.
            // full_legal_name: updatedProfile.fullLegalName, ...
          })
          .eq("id", user.id);
        if (error) throw error;
      }

      console.log(`[BorrowerProfileStore] Saved profile: ${updatedProfile.id}`);
      return updatedProfile;
    } catch (error) {
      console.error("[BorrowerProfileStore] Save failed:", error);
      return null;
    }
  },

  addPrincipal: async (principalData) => {
    const { borrowerProfile } = get();
    if (!borrowerProfile) throw new Error("Profile must exist");

    const now = new Date().toISOString();
    const newPrincipal: Principal = {
      id: generateUniqueId("principal"),
      borrowerProfileId: borrowerProfile.id,
      principalLegalName: "",
      principalRoleDefault: "Key Principal",
      principalBio: "",
      principalEmail: "",
      ownershipPercentage: 0,
      creditScoreRange: "N/A",
      netWorthRange: "<$1M",
      liquidityRange: "<$100k",
      bankruptcyHistory: false,
      foreclosureHistory: false,
      pfsDocumentId: null,
      createdAt: now,
      updatedAt: now,
      ...principalData,
    };

    set((state) => ({
      principals: [...state.principals, newPrincipal],
    }));

    // Save principals to storage
    const allPrincipals =
      (await storageService.getItem<Principal[]>("principals")) || [];
    await storageService.setItem("principals", [
      ...allPrincipals,
      newPrincipal,
    ]);

    // Recalculate and save profile completeness
    const updatedProfile = { ...borrowerProfile };
    updatedProfile.completenessPercent = calculateCompleteness(
      updatedProfile,
      get().principals
    );
    await get().updateBorrowerProfile(updatedProfile);

    return newPrincipal;
  },

  updatePrincipal: async (id, updates) => {
    let updatedPrincipal: Principal | null = null;
    set((state) => {
      const newPrincipals = state.principals.map((p) => {
        if (p.id === id) {
          updatedPrincipal = {
            ...p,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          return updatedPrincipal;
        }
        return p;
      });
      return { principals: newPrincipals, profileChanges: true };
    });

    const allPrincipals =
      (await storageService.getItem<Principal[]>("principals")) || [];
    const updatedAllPrincipals = allPrincipals.map((p) =>
      p.id === id ? updatedPrincipal! : p
    );
    await storageService.setItem("principals", updatedAllPrincipals);

    return updatedPrincipal;
  },

  removePrincipal: async (id) => {
    const { borrowerProfile } = get();
    set((state) => ({
      principals: state.principals.filter((p) => p.id !== id),
    }));

    const allPrincipals =
      (await storageService.getItem<Principal[]>("principals")) || [];
    await storageService.setItem(
      "principals",
      allPrincipals.filter((p) => p.id !== id)
    );

    if (borrowerProfile) {
      const updatedProfile = { ...borrowerProfile };
      updatedProfile.completenessPercent = calculateCompleteness(
        updatedProfile,
        get().principals
      );
      await get().updateBorrowerProfile(updatedProfile);
    }
    return true;
  },
}));

// Subscribe to auth store to automatically load or reset the profile
useAuthStore.subscribe((authState, prevAuthState) => {
  // On login/session hydration
  if (
    authState.user &&
    !authState.isLoading &&
    (authState.user?.id !== prevAuthState.user?.id || prevAuthState.isLoading)
  ) {
    if (authState.user.role === "borrower") {
      console.log(
        "[Subscription] Auth user detected. Triggering profile load."
      );
      useBorrowerProfileStore.getState().loadBorrowerProfile();
    } else {
      // If the logged-in user is not a borrower, there's no profile to load.
      // Resetting the state clears any previous borrower's data and sets loading to false.
      console.log(
        "[Subscription] Non-borrower user detected. Resetting profile state."
      );
      useBorrowerProfileStore.getState().resetProfileState();
    }
  } // On logout
  else if (!authState.user && prevAuthState.user) {
    useBorrowerProfileStore.getState().resetProfileState();
  }
});
