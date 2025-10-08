// src/stores/useBorrowerProfileStore.ts
import { create } from "zustand";
import { storageService } from "@/lib/storage";
import { useAuthStore } from "./useAuthStore";
import { BorrowerProfile, Principal } from "@/types/enhanced-types";

interface BorrowerProfileState {
  borrowerProfile: BorrowerProfile | null;
  principals: Principal[];
  isLoading: boolean;
  profileChanges: boolean;
  autoCreatedFirstProfileThisSession: boolean;
}

interface BorrowerProfileActions {
  loadBorrowerProfile: () => Promise<void>;
  createBorrowerProfile: (
    profileData: Partial<BorrowerProfile>
  ) => Promise<BorrowerProfile>;
  updateBorrowerProfile: (
    updates: Partial<BorrowerProfile>,
    manual?: boolean
  ) => Promise<BorrowerProfile | null>;
  addPrincipal: (principal: Partial<Principal>) => Promise<Principal>;
  updatePrincipal: (
    id: string,
    updates: Partial<Principal>
  ) => Promise<Principal | null>;
  removePrincipal: (id: string) => Promise<boolean>;
  setProfileChanges: (hasChanges: boolean) => void;
  autoSaveBorrowerProfile: () => Promise<void>;
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
  profileChanges: false,
  autoCreatedFirstProfileThisSession: false,

  resetProfileState: () => {
    console.log("[BorrowerProfileStore] Resetting state.");
    set({
      borrowerProfile: null,
      principals: [],
      profileChanges: false,
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
      const profiles =
        (await storageService.getItem<BorrowerProfile[]>("borrowerProfiles")) ||
        [];
      const currentProfile = profiles.find((p) => p.userId === user.email);

      if (currentProfile) {
        console.log(
          `[BorrowerProfileStore] ✅ Found existing profile: ${currentProfile.id}`
        );
        set({ borrowerProfile: currentProfile });
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

    const profiles =
      (await storageService.getItem<BorrowerProfile[]>("borrowerProfiles")) ||
      [];
    await storageService.setItem("borrowerProfiles", [
      ...profiles.filter((p) => p.userId !== user.email),
      newProfile,
    ]);

    console.log(
      `[BorrowerProfileStore] Created profile ${newProfile.id} for ${user.email}`
    );
    return newProfile;
  },

  setProfileChanges: (hasChanges) => set({ profileChanges: hasChanges }),

  updateBorrowerProfile: async (updates, manual = false) => {
    const { borrowerProfile, principals } = get();
    if (!borrowerProfile) return null;

    const now = new Date().toISOString();
    const updatedProfile = { ...borrowerProfile, ...updates, updatedAt: now };
    updatedProfile.completenessPercent = calculateCompleteness(
      updatedProfile,
      principals
    );

    set({ borrowerProfile: updatedProfile });

    if (manual) {
      const profiles =
        (await storageService.getItem<BorrowerProfile[]>("borrowerProfiles")) ||
        [];
      const updatedProfiles = profiles.map((p) =>
        p.id === updatedProfile.id ? updatedProfile : p
      );
      await storageService.setItem("borrowerProfiles", updatedProfiles);
      set({ profileChanges: false });
    } else {
      set({ profileChanges: true });
    }
    return updatedProfile;
  },

  autoSaveBorrowerProfile: async () => {
    const { borrowerProfile, profileChanges } = get();
    if (!borrowerProfile || !profileChanges) return;

    try {
      const profiles =
        (await storageService.getItem<BorrowerProfile[]>("borrowerProfiles")) ||
        [];
      const updatedProfiles = profiles.map((p) =>
        p.id === borrowerProfile.id ? borrowerProfile : p
      );
      await storageService.setItem("borrowerProfiles", updatedProfiles);
      set({ profileChanges: false });
      console.log(
        `[BorrowerProfileStore] Auto-saved profile: ${borrowerProfile.fullLegalName}`
      );
    } catch (error) {
      console.error("[BorrowerProfileStore] Auto-save failed:", error);
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
      profileChanges: true,
    }));
    await get().autoSaveBorrowerProfile();
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
    await get().autoSaveBorrowerProfile();
    return updatedPrincipal;
  },

  removePrincipal: async (id) => {
    set((state) => ({
      principals: state.principals.filter((p) => p.id !== id),
      profileChanges: true,
    }));
    await get().autoSaveBorrowerProfile();
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

// Setup auto-saving interval
setInterval(() => {
  useBorrowerProfileStore.getState().autoSaveBorrowerProfile();
}, 5000);
