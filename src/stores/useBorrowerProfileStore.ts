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
			(Array.isArray(value)
				? value.length > 0
				: String(value).trim() !== "")
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

const createDefaultBorrowerProfile = (
	userId: string,
	email: string,
	fullName?: string | null
): BorrowerProfile => {
	const now = new Date().toISOString();
	return {
		id: userId,
		userId: email,
		fullLegalName: fullName || "",
		primaryEntityName: "",
		primaryEntityStructure: "LLC",
		contactEmail: email,
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
	};
};

export const useBorrowerProfileStore = create<
	BorrowerProfileState & BorrowerProfileActions
>((set, get) => ({
	borrowerProfile: null,
	principals: [],
	isLoading: true,

	resetProfileState: () => {
		console.log("[BorrowerProfileStore] Resetting state.");
		set({
			borrowerProfile: null,
			principals: [],
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
			let profileToSet: BorrowerProfile | undefined | null = null;

			if (user.isDemo) {
				console.log(
					"[BorrowerProfileStore] Loading profile from local storage for demo user."
				);
				const profiles =
					(await storageService.getItem<BorrowerProfile[]>(
						"borrowerProfiles"
					)) || [];
				profileToSet = profiles.find((p) => p.userId === user.email);
			} else {
				console.log(
					"[BorrowerProfileStore] Loading profile from Supabase for real user."
				);
				const { data, error } = await supabase
					.from("profiles")
					.select("id, email, full_name")
					.eq("id", user.id)
					.single();
				if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows found

				if (data) {
					const extendedProfile =
						await storageService.getItem<BorrowerProfile>(
							`borrowerProfile_${user.id}`
						);
					if (extendedProfile) {
						profileToSet = {
							...extendedProfile,
							id: data.id,
							userId: data.email,
							contactEmail: data.email,
							fullLegalName:
								data.full_name || extendedProfile.fullLegalName,
						};
					} else {
						profileToSet = createDefaultBorrowerProfile(
							data.id,
							data.email,
							data.full_name
						);
					}
				}
			}

			if (profileToSet) {
				console.log(
					`[BorrowerProfileStore] ✅ Found existing profile: ${profileToSet.id}`
				);
				set({ borrowerProfile: profileToSet });
				// Principals are always in local storage for demo, and in Supabase for real users
				// For now, let's assume they are only local for demo.
				const allPrincipals =
					(await storageService.getItem<Principal[]>("principals")) ||
					[];
				set({
					principals: allPrincipals.filter(
						(p) => p.borrowerProfileId === profileToSet!.id
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
				useAuthStore
					.getState()
					.updateUser({ profileId: newProfile.id });
				console.log(
					`[BorrowerProfileStore] ✅ Auto-created new profile: ${newProfile.id}`
				);
			}
		} catch (error) {
			console.error(
				"[BorrowerProfileStore] Failed to load profile:",
				error
			);
			get().resetProfileState();
		} finally {
			set({ isLoading: false });
			console.log("[BorrowerProfileStore] ✅ Finished loading profile.");
		}
	},

	createBorrowerProfile: async (profileData) => {
		const { user } = useAuthStore.getState();
		if (!user) throw new Error("User must be logged in");

		const newProfile = createDefaultBorrowerProfile(
			user.id || generateUniqueId("profile"),
			user.email,
			user.name
		);
		Object.assign(newProfile, profileData);

		newProfile.completenessPercent = calculateCompleteness(newProfile, []);

		set({ borrowerProfile: newProfile, principals: [] });

		if (user.isDemo) {
			newProfile.id = generateUniqueId("profile"); // Ensure demo profile has unique ID
			newProfile.userId = user.email; // Demo users are identified by email
			const profiles =
				(await storageService.getItem<BorrowerProfile[]>(
					"borrowerProfiles"
				)) || [];
			await storageService.setItem("borrowerProfiles", [
				...profiles.filter((p) => p.userId !== user.email),
				newProfile,
			]);
		} else if (user) {
			// For real users, a default profile is created in memory and will be saved to local storage on first update.
			console.warn(
				"[BorrowerProfileStore] createBorrowerProfile called for real user. A default profile is created in memory and will be saved to local storage on first update."
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
		const updatedProfile = {
			...borrowerProfile,
			...updates,
			updatedAt: now,
		};
		updatedProfile.completenessPercent = calculateCompleteness(
			updatedProfile,
			principals
		);

		set({ borrowerProfile: updatedProfile });

		try {
			if (user?.isDemo && user.email) {
				const profiles =
					(await storageService.getItem<BorrowerProfile[]>(
						"borrowerProfiles"
					)) || [];
				const updatedProfiles = profiles.map((p) =>
					p.userId === user.email ? updatedProfile : p
				);
				await storageService.setItem(
					"borrowerProfiles",
					updatedProfiles
				);
			} else if (user) {
				// For real users, update the 'profiles' table with relevant fields
				const { error: dbError } = await supabase
					.from("profiles")
					.update({ full_name: updatedProfile.fullLegalName })
					.eq("id", user.id);
				if (dbError) throw dbError;

				// And save the full extended profile to user-specific local storage
				await storageService.setItem(
					`borrowerProfile_${user.id}`,
					updatedProfile
				);
			}

			console.log(
				`[BorrowerProfileStore] Saved profile: ${updatedProfile.id}`
			);
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
			return { principals: newPrincipals };
		});

		if (!updatedPrincipal) return null;

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
	const currentUser = authState.user;
	const prevUser = prevAuthState.user;
	const wasLoading = prevAuthState.isLoading;
	const isLoading = authState.isLoading;
	const currentProfileUserId =
		useBorrowerProfileStore.getState().borrowerProfile?.userId;

	// Case 1: User logged out
	if (!currentUser && prevUser) {
		console.log(
			"[ProfileStore Subscription] 👋 User logged out. Resetting profile state."
		);
		useBorrowerProfileStore.getState().resetProfileState();
		return;
	}

	// Case 2: Non-borrower logged in
	if (currentUser && !isLoading && currentUser.role !== "borrower") {
		console.log(
			"[ProfileStore Subscription] ℹ️ Non-borrower user. Resetting profile state."
		);
		useBorrowerProfileStore.getState().resetProfileState();
		return;
	}

	// Case 3: Borrower user ready to load (auth just finished loading OR user changed)
	if (currentUser && !isLoading && currentUser.role === "borrower") {
		// Only trigger if:
		// a) Auth was loading and now isn't (fresh auth completion)
		// b) User changed (different ID)
		// c) No profile loaded yet for this user
		const shouldLoad =
			wasLoading || // Auth just completed
			(prevUser && currentUser.id !== prevUser.id) || // User switched
			currentProfileUserId !== currentUser.email; // Profile not loaded for current user

		if (shouldLoad) {
			console.log(
				"[ProfileStore Subscription] 🔄 Triggering profile load for borrower:",
				currentUser.email
			);
			useBorrowerProfileStore.getState().loadBorrowerProfile();
		}
	}
});
