// src/contexts/AuthContext.tsx

'use client';

import React, { createContext, useState, useEffect, useCallback, ReactNode, useContext } from 'react';
import { StorageService } from '../services/storage/StorageService';
import { EnhancedUser, BorrowerProfile, ProjectProfile, ProjectPhase } from '../types/enhanced-types';
import { mockProfiles, mockProjects } from '../../lib/mockData';
import { ProjectContext } from './ProjectContext';
import { BorrowerProfileContext } from './BorrowerProfileContext';

// Define context interface
interface AuthContextProps {
  user: EnhancedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginSource: 'direct' | 'lenderline';
  login: (email: string, source?: 'direct' | 'lenderline', role?: 'borrower' | 'advisor' | 'lender' | 'admin') => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<EnhancedUser>) => void; // Keep updateUser definition
}

// Create context
export const AuthContext = createContext<AuthContextProps>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  loginSource: 'direct',
  login: async () => {},
  logout: () => {},
  updateUser: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
  storageService: StorageService;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  storageService
}) => {
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginSource, setLoginSource] = useState<'direct' | 'lenderline'>('direct');

  // Get contexts needed
  const projectContext = useContext(ProjectContext);
  const borrowerProfileContext = useContext(BorrowerProfileContext);

  // Load user from storage on mount
  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);
      try {
        const userData = await storageService.getItem<EnhancedUser>('user');
        if (userData) {
          if (!userData.role) userData.role = 'borrower';
          // Load profile ID from storage as well during initial load
          const profiles = await storageService.getItem<BorrowerProfile[]>('borrowerProfiles') || [];
          const userProfile = profiles.find(p => p.userId === userData.email);
          if (userProfile) userData.profileId = userProfile.id;

          setUser(userData);
          setLoginSource(userData.loginSource || 'direct');
        }
      } catch (error) { console.error('Failed to load user data:', error); }
      finally { setIsLoading(false); }
    };
    loadUser();
  }, [storageService]);

  // --- Test Data Handling ---
  const handleTestData = async (email: string): Promise<boolean> => {
     if (email === 'borrower3@example.com') {
        console.log('[Auth] Clearing data for borrower3@example.com');
        await storageService.clearUserSpecificData(email);
        // Trigger context resets
        borrowerProfileContext.resetProfileState?.(); // Use reset function if available
        projectContext.resetProjectState?.();      // Use reset function if available
        return true;
      }
      if (email === 'borrower1@example.com' || email === 'borrower2@example.com') {
          const profiles = await storageService.getItem<BorrowerProfile[]>('borrowerProfiles') || [];
          if (!profiles.some(p => p.userId === email)) {
              console.log(`[Auth] Seeding data for ${email}`);
              const profileToSeed = mockProfiles[email];
              const projectsToSeed = mockProjects[email] || [];
              if (profileToSeed) await storageService.setItem('borrowerProfiles', [...profiles, profileToSeed]);
              const existingProjects = await storageService.getItem<ProjectProfile[]>('projects') || [];
              const newProjects = projectsToSeed.filter(sp => !existingProjects.some(ep => ep.id === sp.id));
              if (newProjects.length > 0) await storageService.setItem('projects', [...existingProjects, ...newProjects]);
          } else { console.log(`[Auth] Data exists for ${email}, skipping seed.`); }
      }
      return false;
  };

  // --- Update user data ---
  const updateUser = useCallback(async (userData: Partial<EnhancedUser>) => {
    setUser(currentUser => {
        if (!currentUser) return null;
        try {
            const sourceToKeep = userData.loginSource || loginSource;
            const updatedUser = { ...currentUser, ...userData, loginSource: sourceToKeep };
            // Update storage asynchronously without awaiting here to avoid blocking state update
            storageService.setItem('user', updatedUser).catch(err => console.error("Storage update failed:", err));
            if(userData.loginSource) setLoginSource(userData.loginSource); // Update source state if changed
            return updatedUser;
        } catch (error) { console.error('Failed to update user:', error); return currentUser; }
    });
  }, [storageService, loginSource]);


  // --- Auto Project Creation Logic ---
  const createFirstProjectIfNeeded = async (loggedInUser: EnhancedUser, source: 'direct' | 'lenderline') => {
        if (!projectContext || !borrowerProfileContext) { console.error("[Auth] Contexts not available."); return; }
        if (loggedInUser.role !== 'borrower') return;

        // Check storage first for profile & projects
        const profiles = await storageService.getItem<BorrowerProfile[]>('borrowerProfiles') || [];
        let userProfile = profiles.find(p => p.userId === loggedInUser.email);
        let existingProjectFound = false;
        if (userProfile) {
            const allProjects = await storageService.getItem<ProjectProfile[]>('projects') || [];
            existingProjectFound = allProjects.some(p => p.borrowerProfileId === userProfile.id);
        }

        if (!userProfile || !existingProjectFound) {
             console.log(`[Auth] First project condition met for ${loggedInUser.email}.`);
             // For new users (not borrower1/borrower2), create empty project without seeding details
             const isTestUser = loggedInUser.email === 'borrower1@example.com' || loggedInUser.email === 'borrower2@example.com';
             
             let projectData: Partial<ProjectProfile>;
             if (isTestUser) {
               // For test users, use default project data
               projectData = { projectName: `Unnamed Project` };
               
               if (source === 'lenderline') { /* ... apply prefs logic ... */ try { const d=localStorage.getItem('lastFormData'); if(d) { /* ... parsing ... */ projectData.assetType=JSON.parse(d).asset_types?.[0]||'';/*...*/ localStorage.removeItem('lastFormData');} } catch(e){ console.error("Err apply prefs", e); } }
             } else {
               // For new users, create completely empty project
               projectData = { 
                 projectName: 'New Project',
                 projectDescription: '',
                 assetType: '',
                 projectPhase: undefined,
                 loanAmountRequested: undefined,
                 loanType: '',
                 targetLtvPercent: undefined,
                 targetLtcPercent: undefined,
                 amortizationYears: undefined,
                 interestOnlyPeriodMonths: undefined,
                 interestRateType: undefined,
                 targetCloseDate: '',
                 useOfProceeds: '',
                 recoursePreference: undefined,
                 purchasePrice: null,
                 totalProjectCost: null,
                 capexBudget: null,
                 propertyNoiT12: null,
                 stabilizedNoiProjected: null,
                 exitStrategy: undefined,
                 businessPlanSummary: '',
                 marketOverviewSummary: '',
                 equityCommittedPercent: undefined
               };
             }

              try {
                 let finalProfileId = userProfile?.id;

                 // *** Create Profile if needed ***
                 if (!finalProfileId) {
                     console.log(`[Auth] Creating minimal profile...`);
                     // For new users (not borrower1/borrower2), create empty profile without seeding details
                     const isTestUser = loggedInUser.email === 'borrower1@example.com' || loggedInUser.email === 'borrower2@example.com';
                     
                     if (isTestUser) {
                       // For test users, create profile with seeded data
                       const newProfile = await borrowerProfileContext.createBorrowerProfile({
                           userId: loggedInUser.email, contactEmail: loggedInUser.email,
                           fullLegalName: loggedInUser.email.split('@')[0] || 'New User',
                           primaryEntityName: 'My Entity',
                       });
                       if (!newProfile?.id) throw new Error("Profile creation failed.");
                       finalProfileId = newProfile.id;
                     } else {
                       // For new users, create completely empty profile
                       const newProfile = await borrowerProfileContext.createBorrowerProfile({
                           userId: loggedInUser.email, contactEmail: loggedInUser.email,
                           fullLegalName: '',
                           primaryEntityName: '',
                       });
                       if (!newProfile?.id) throw new Error("Profile creation failed.");
                       finalProfileId = newProfile.id;
                     }
                     
                     // Update user in Auth context state *and* storage
                     await updateUser({ profileId: finalProfileId }); // Use the updateUser function
                     console.log(`[Auth] Minimal profile created: ${finalProfileId}`);
                     // Allow profile context state to potentially update
                     await new Promise(res => setTimeout(res, 50));
                 }

                 // *** Create Project ***
                 // The ProjectContext should now have the profile available via its own context hook
                 const newProject = await projectContext.createProject(projectData);
                 if (!newProject?.id) throw new Error("Project creation failed.");

                 console.log(`[Auth] Auto-created project "${newProject.projectName}" (ID: ${newProject.id}) for profile ${finalProfileId}`);

              } catch (error) { console.error("[Auth] Failed auto-creation:", error); }
         } else { console.log(`[Auth] Existing profile/project found for ${loggedInUser.email}.`); }
  };


  // Login function
  const login = useCallback(async (
      email: string,
      source: 'direct' | 'lenderline' = 'direct',
      role: 'borrower' | 'advisor' | 'lender' | 'admin' = 'borrower'
    ) => {
    if (!projectContext || !borrowerProfileContext) { /* ... error handling ... */ throw new Error("Init error"); }
    try {
      setIsLoading(true); setLoginSource(source);
      await handleTestData(email); // Handle test users first

      // Prioritize the explicitly passed role. The admin check is an override for specific emails.
      const detectedRole = email.includes('admin@capmatch.com') ? 'admin' : role;
      const newUser: EnhancedUser = { email, lastLogin: new Date(), role: detectedRole, loginSource: source };
      if (detectedRole !== 'borrower') { /* set name */ const nm = email.match(/([^@]+)@/); if(nm) newUser.name = nm[1].split('.').map(p=>p[0].toUpperCase()+p.slice(1)).join(' '); }

      const profiles = await storageService.getItem<BorrowerProfile[]>('borrowerProfiles') || [];
      const userProfile = profiles.find(p => p.userId === email);
      if (userProfile) newUser.profileId = userProfile.id;

      await storageService.setItem('user', newUser);
      setUser(newUser); // Set user state *first*

      // Allow contexts to update based on the new user state
      await new Promise(resolve => setTimeout(resolve, 150));

      // Auto-creation of borrower profile and first project is now handled by the
      // respective providers. No need to invoke it from AuthProvider.

    } catch (error) { console.error('[Auth] Login failed:', error); throw error; }
    finally { setIsLoading(false); }
    // Dependencies reviewed - OK
  }, [storageService, projectContext, borrowerProfileContext, updateUser]); // Added updateUser


  // Logout function
  const logout = useCallback(async () => {
    try { setIsLoading(true); await storageService.removeItem('user'); setUser(null); setLoginSource('direct');
        // Reset contexts on logout
        borrowerProfileContext.resetProfileState?.();
        projectContext.resetProjectState?.();
    } catch (error) { console.error('Logout failed:', error); }
    finally { setIsLoading(false); }
   }, [storageService, borrowerProfileContext, projectContext ]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, loginSource, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};