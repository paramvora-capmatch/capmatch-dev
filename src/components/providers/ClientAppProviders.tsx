// src/components/providers/ClientAppProviders.tsx
'use client';

import React from 'react';
import { AuthProvider } from '../../contexts/AuthContext';
import { BorrowerProfileProvider } from '../../contexts/BorrowerProfileContext';
import { ProjectProvider } from '../../contexts/ProjectContext';
import { LenderProvider } from '../../contexts/LenderContext';
import { AuthRedirector } from '../auth/AuthRedirector';
import { createStorageService } from '../../services/storage/StorageService';

// Initialize storage service
const storageService = createStorageService(false, 'capmatch_'); // Set to true for encrypted storage

export const ClientAppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider storageService={storageService}>
      <AuthRedirector />
      <BorrowerProfileProvider storageService={storageService}>
        <ProjectProvider storageService={storageService}>
          <LenderProvider storageService={storageService}>
            {children}
          </LenderProvider>
        </ProjectProvider>
      </BorrowerProfileProvider>
    </AuthProvider>
  );
};