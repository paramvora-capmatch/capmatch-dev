// src/stores/useBorrowerProfileStore.ts
import { create } from "zustand";
import { storageService } from "@/lib/storage";
import { useAuthStore } from "./useAuthStore";
import { BorrowerProfile, Principal } from "@/types/enhanced-types";
import {
	dbBorrowerToBorrowerProfile,
	dbPrincipalToPrincipal,
} from "@/lib/dto-mapper";
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
			useBorrowerProfileStore.getState().resetProfileState();
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
			let profileToSet: BorrowerProfile | null = null;
			let principalsToSet: Principal[] = [];

			if (user.isDemo) {
				console.log(
					"[BorrowerProfileStore] Loading profile from local storage for demo user."
				);
				const profiles =
					(await storageService.getItem<BorrowerProfile[]>(
						"borrowerProfiles"
					)) || [];
				profileToSet = profiles.find((p) => p.userId === user.email);

				if (profileToSet) {
					const allPrincipals =
						(await storageService.getItem<Principal[]>(
							"principals"
						)) || [];
					principalsToSet = allPrincipals.filter(
						(p) => p.borrowerProfileId === profileToSet!.id
					);
				}
			} else {
				console.log(
					"[BorrowerProfileStore] Loading profile from Supabase for real user."
				);
				const { data: borrowerData, error: borrowerError } =
					await supabase
						.from("borrowers")
						.select("*")
						.eq("id", user.id)
						.single();

				if (borrowerError && borrowerError.code !== "PGRST116")
					throw borrowerError;

				let finalBorrowerData = borrowerData;
				// If no profile exists (e.g., first login for an old user before trigger was added), create it.
				if (!borrowerData) {
					console.log(
						`[BorrowerProfileStore] No borrower profile found for ${user.id}, creating one.`
					);
					const { data: newBorrowerData, error: insertError } =
						await supabase
							.from("borrowers")
							.insert({ id: user.id, full_legal_name: user.name })
							.select()
							.single();
					if (insertError) throw insertError;
					finalBorrowerData = newBorrowerData;
				}

				if (finalBorrowerData) {
					profileToSet = dbBorrowerToBorrowerProfile(
						finalBorrowerData,
						user
					);

					const { data: principalsData, error: principalsError } =
						await supabase
							.from("principals")
							.select("*")
							.eq("borrower_profile_id", finalBorrowerData.id);
					if (principalsError) throw principalsError;
					principalsToSet = principalsData.map(
						dbPrincipalToPrincipal
					);
				}
			}

			if (profileToSet) {
				console.log(
					`[BorrowerProfileStore] ✅ Found existing profile: ${profileToSet.id}`
				);
				profileToSet.completenessPercent = calculateCompleteness(
					profileToSet,
					principalsToSet
				);
				set({
					borrowerProfile: profileToSet,
					principals: principalsToSet,
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

		// This function should now only be used for demo users, as the trigger/load handles real users.
		if (user.isDemo) {
			const profiles =
				(await storageService.getItem<BorrowerProfile[]>(
					"borrowerProfiles"
				)) || [];
			await storageService.setItem("borrowerProfiles", [
				...profiles.filter((p) => p.userId !== user.email),
				newProfile,
			]);
		} else {
			console.warn(
				"[BorrowerProfileStore] createBorrowerProfile called for a real user. This should be handled by the trigger on new user signup."
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
				// For real users, update the 'borrowers' table
				const dbUpdates = {
					updated_at: now,
					full_legal_name: updatedProfile.fullLegalName,
					primary_entity_name: updatedProfile.primaryEntityName,
					primary_entity_structure:
						updatedProfile.primaryEntityStructure,
					contact_phone: updatedProfile.contactPhone,
					contact_address: updatedProfile.contactAddress,
					bio_narrative: updatedProfile.bioNarrative,
					linkedin_url: updatedProfile.linkedinUrl,
					website_url: updatedProfile.websiteUrl,
					years_cre_experience_range:
						updatedProfile.yearsCREExperienceRange,
					asset_classes_experience:
						updatedProfile.assetClassesExperience,
					geographic_markets_experience:
						updatedProfile.geographicMarketsExperience,
					total_deal_value_closed_range:
						updatedProfile.totalDealValueClosedRange,
					existing_lender_relationships:
						updatedProfile.existingLenderRelationships,
					credit_score_range: updatedProfile.creditScoreRange,
					net_worth_range: updatedProfile.netWorthRange,
					liquidity_range: updatedProfile.liquidityRange,
					bankruptcy_history: updatedProfile.bankruptcyHistory,
					foreclosure_history: updatedProfile.foreclosureHistory,
					litigation_history: updatedProfile.litigationHistory,
				};
				const { error: dbError } = await supabase
					.from("borrowers")
					.update(dbUpdates)
					.eq("id", user.id);
				if (dbError) throw dbError;

				// Also update full_name in profiles table to keep it in sync for other parts of the app
				const { error: profileDbError } = await supabase
					.from("profiles")
					.update({ full_name: updatedProfile.fullLegalName })
					.eq("id", user.id);
				if (profileDbError) throw profileDbError;
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
		const { user } = useAuthStore.getState();
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

		if (user?.isDemo) {
			const allPrincipals =
				(await storageService.getItem<Principal[]>("principals")) || [];
			await storageService.setItem("principals", [
				...allPrincipals,
				newPrincipal,
			]);
		} else {
			const { data, error } = await supabase
				.from("principals")
				.insert({
					borrower_profile_id: newPrincipal.borrowerProfileId,
					principal_legal_name: newPrincipal.principalLegalName,
					principal_role_default: newPrincipal.principalRoleDefault,
					principal_bio: newPrincipal.principalBio,
					principal_email: newPrincipal.principalEmail,
					ownership_percentage: newPrincipal.ownershipPercentage,
					credit_score_range: newPrincipal.creditScoreRange,
					net_worth_range: newPrincipal.netWorthRange,
					liquidity_range: newPrincipal.liquidityRange,
					bankruptcy_history: newPrincipal.bankruptcyHistory,
					foreclosure_history: newPrincipal.foreclosureHistory,
					pfs_document_id: newPrincipal.pfsDocumentId,
				})
				.select()
				.single();
			if (error) throw error;
			newPrincipal.id = data.id; // Update with DB-generated ID
		}

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
		const { user } = useAuthStore.getState();
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

		if (user?.isDemo) {
			const allPrincipals =
				(await storageService.getItem<Principal[]>("principals")) || [];
			const updatedAllPrincipals = allPrincipals.map((p) =>
				p.id === id ? updatedPrincipal! : p
			);
			await storageService.setItem("principals", updatedAllPrincipals);
		} else {
			const { error } = await supabase
				.from("principals")
				.update({
					principal_legal_name: updatedPrincipal.principalLegalName,
					principal_role_default:
						updatedPrincipal.principalRoleDefault,
					principal_bio: updatedPrincipal.principalBio,
					principal_email: updatedPrincipal.principalEmail,
					ownership_percentage: updatedPrincipal.ownershipPercentage,
					credit_score_range: updatedPrincipal.creditScoreRange,
					net_worth_range: updatedPrincipal.netWorthRange,
					liquidity_range: updatedPrincipal.liquidityRange,
					bankruptcy_history: updatedPrincipal.bankruptcyHistory,
					foreclosure_history: updatedPrincipal.foreclosureHistory,
					pfs_document_id: updatedPrincipal.pfsDocumentId,
					updated_at: updatedPrincipal.updatedAt,
				})
				.eq("id", id);
			if (error) throw error;
		}

		return updatedPrincipal;
	},

	removePrincipal: async (id) => {
		const { user } = useAuthStore.getState();
		const { borrowerProfile } = get();
		set((state) => ({
			principals: state.principals.filter((p) => p.id !== id),
		}));

		if (user?.isDemo) {
			const allPrincipals =
				(await storageService.getItem<Principal[]>("principals")) || [];
			await storageService.setItem(
				"principals",
				allPrincipals.filter((p) => p.id !== id)
			);
		} else {
			const { error } = await supabase
				.from("principals")
				.delete()
				.eq("id", id);
			if (error) throw error;
		}

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
