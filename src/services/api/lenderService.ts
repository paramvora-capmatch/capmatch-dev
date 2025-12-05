// src/services/api/lenderService.ts
import { LenderProfile } from '../../types/lender';

// Import the mock data (you already have this in lib/mockApiService.ts)
// Just re-export it for now, but structure it to be easily replaced with a real API

export async function getLenders(): Promise<LenderProfile[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // For now, re-use your existing mock data
  // In the future, this would be replaced with a fetch call
  return (await import('../../../lib/mockApiService')).getLenders();
}