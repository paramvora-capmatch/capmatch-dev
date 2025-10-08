// src/lib/storage.ts
import { createStorageService } from '@/services/storage/StorageService';

// Create and export a single instance of the storage service for the app
export const storageService = createStorageService(false, 'capmatch_');