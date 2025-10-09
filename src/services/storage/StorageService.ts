// src/services/storage/StorageService.ts

// Define the storage service interface
export interface StorageService {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Local Storage implementation
export class LocalStorageService implements StorageService {
private prefix: string;

constructor(prefix: string = 'capmatch_') {
  this.prefix = prefix;
}

private getKeyWithPrefix(key: string): string {
  return `${this.prefix}${key}`;
}

async getItem<T>(key: string): Promise<T | null> {
  try {
    // Ensure this runs only in the browser
    if (typeof window === 'undefined') return null;
    const item = localStorage.getItem(this.getKeyWithPrefix(key));
    if (!item) return null;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error getting item ${key} from localStorage:`, error);
    return null;
  }
}

async setItem<T>(key: string, value: T): Promise<void> {
  try {
      // Ensure this runs only in the browser
      if (typeof window === 'undefined') return;
    localStorage.setItem(this.getKeyWithPrefix(key), JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting item ${key} in localStorage:`, error);
    throw error;
  }
}

async removeItem(key: string): Promise<void> {
  try {
      // Ensure this runs only in the browser
      if (typeof window === 'undefined') return;
    localStorage.removeItem(this.getKeyWithPrefix(key));
  } catch (error) {
    console.error(`Error removing item ${key} from localStorage:`, error);
    throw error;
  }
}

async clear(): Promise<void> {
  try {
    // Ensure this runs only in the browser
    if (typeof window === 'undefined') return;
    // Only clear items with our prefix
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    throw error;
  }
}
}

// Encrypted Storage implementation (Placeholder - uses LocalStorage for now)
// NOTE: Real encryption requires 'secure-ls' package and browser environment.
export class EncryptedStorageService implements StorageService {
private storage: any; // Should be SecureLS instance
private prefix: string;

constructor(prefix: string = 'capmatch_') {
  this.prefix = prefix;
  // Use LocalStorage as a fallback for this mock implementation
  this.storage = typeof window !== 'undefined' ? localStorage : {
      getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {}, length: 0, key: () => null
  };
  if (typeof window !== 'undefined' && !localStorage) {
      console.warn("EncryptedStorageService: SecureLS not implemented, falling back to potentially insecure LocalStorage.");
  }
}

private getKeyWithPrefix(key: string): string {
  return `${this.prefix}${key}`;
}

async getItem<T>(key: string): Promise<T | null> {
   try {
      // Ensure this runs only in the browser
      if (typeof window === 'undefined') return null;
      const item = this.storage.getItem(this.getKeyWithPrefix(key));
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error getting item ${key} from secure storage:`, error);
      return null;
    }
}

async setItem<T>(key: string, value: T): Promise<void> {
   try {
      // Ensure this runs only in the browser
      if (typeof window === 'undefined') return;
      this.storage.setItem(this.getKeyWithPrefix(key), JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item ${key} in secure storage:`, error);
      throw error;
    }
}

async removeItem(key: string): Promise<void> {
   try {
      // Ensure this runs only in the browser
      if (typeof window === 'undefined') return;
      this.storage.removeItem(this.getKeyWithPrefix(key));
    } catch (error) {
      console.error(`Error removing item ${key} from secure storage:`, error);
      throw error;
    }
}

async clear(): Promise<void> {
  try {
    // Ensure this runs only in the browser
    if (typeof window === 'undefined') return;
    const keysToRemove = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      this.storage.removeItem(key);
    });
  } catch (error) {
    console.error('Error clearing secure storage:', error);
    throw error;
  }
}
}

// Factory function
export function createStorageService(useEncryption: boolean = false, prefix: string = 'capmatch_'): StorageService {
if (useEncryption) {
  // In a real app, instantiate SecureLS here if available
  // console.warn("Encryption requested but not fully implemented, using LocalStorage fallback.");
  return new EncryptedStorageService(prefix); // Fallback for now
}
return new LocalStorageService(prefix);
}

// Import necessary types (adjust path if needed)
import { BorrowerProfile, ProjectProfile, ProjectMessage } from '../../../src/types/enhanced-types';