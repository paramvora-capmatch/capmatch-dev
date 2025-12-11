// src/lib/imageUtils.ts
import { supabase } from '@/lib/supabaseClient';

export interface ImageData {
  url: string;
  name: string;
  title: string; // AI-generated title (extracted from filename)
  category: 'site_images' | 'architectural_diagrams' | 'other';
  resourceId?: string; // Only for artifacts images
  version?: string; // Only for artifacts images
  source: 'main_folder' | 'artifacts'; // Source of the image
  storagePath: string; // Full storage path for deletion
  documentName?: string; // Document name if from artifacts
}

// Signed URL caching configuration
const SIGNED_URL_EXPIRY_SECONDS = 86400; // 24 hours (increased from 1 hour)
const CACHE_REFRESH_BUFFER_SECONDS = 3600; // Refresh 1 hour before expiry
const CACHE_KEY_PREFIX = 'supabase_signed_urls_';

interface CachedUrl {
  url: string;
  expiresAt: number; // Timestamp in milliseconds
}

/**
 * Gets a cache key for a storage path and org ID
 */
function getCacheKey(orgId: string, storagePath: string): string {
  return `${CACHE_KEY_PREFIX}${orgId}_${storagePath}`;
}

/**
 * Retrieves a cached signed URL if it exists and is still valid
 */
function getCachedSignedUrl(orgId: string, storagePath: string): string | null {
  if (typeof window === 'undefined') return null; // Server-side rendering
  
  try {
    const cacheKey = getCacheKey(orgId, storagePath);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const entry: CachedUrl = JSON.parse(cached);
    const now = Date.now();
    
    // Check if expired (with buffer for refresh)
    if (now >= entry.expiresAt - (CACHE_REFRESH_BUFFER_SECONDS * 1000)) {
      // Expired or about to expire, remove from cache
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return entry.url;
  } catch (error) {
    console.warn('Error reading cached signed URL:', error);
    return null;
  }
}

/**
 * Caches a signed URL with expiration timestamp
 */
function setCachedSignedUrl(orgId: string, storagePath: string, url: string): void {
  if (typeof window === 'undefined') return; // Server-side rendering
  
  try {
    const cacheKey = getCacheKey(orgId, storagePath);
    const entry: CachedUrl = {
      url,
      expiresAt: Date.now() + (SIGNED_URL_EXPIRY_SECONDS * 1000),
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    // Handle quota exceeded or other storage errors gracefully
    console.warn('Error caching signed URL:', error);
    // Try to clean up old entries if storage is full
    try {
      cleanupExpiredCacheEntries();
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Cleans up expired cache entries to free up localStorage space
 */
function cleanupExpiredCacheEntries(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const entry: CachedUrl = JSON.parse(cached);
            if (now >= entry.expiresAt) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // Invalid entry, remove it
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Creates a signed URL with caching support
 * Returns cached URL if available and valid, otherwise creates a new one
 */
export async function getSignedUrl(
  orgId: string,
  storagePath: string
): Promise<string | null> {
  // Try cache first
  const cachedUrl = getCachedSignedUrl(orgId, storagePath);
  if (cachedUrl) {
    return cachedUrl;
  }
  
  // Create new signed URL
  const { data: urlData, error: urlError } = await supabase.storage
    .from(orgId)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);
  
  if (urlError) {
    console.error(`Error creating signed URL for ${storagePath}:`, urlError);
    return null;
  }
  
  if (urlData?.signedUrl) {
    // Cache the new URL
    setCachedSignedUrl(orgId, storagePath, urlData.signedUrl);
    return urlData.signedUrl;
  }
  
  return null;
}

/**
 * Extracts a human-readable title from the filename.
 * New format: "3rd Floor Unit Key Plan.jpg" (Title Case with spaces, no extension)
 * Old format: "front-elevation-view-abc123.jpg" (kebab-case with ID)
 */
function extractTitleFromFilename(filename: string): string {
  // Remove extension
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // If filename already has spaces (new format), use it as-is
  if (withoutExt.includes(' ')) {
    return withoutExt;
  }
  
  // Old format: kebab-case with possible ID suffix
  const parts = withoutExt.split('-');
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    // If last part looks like an ID (short alphanumeric, 6 chars or less), remove it
    if (lastPart.length <= 6 && /^[a-zA-Z0-9]+$/.test(lastPart)) {
      parts.pop();
    }
  }
  
  // Join with spaces and convert to Title Case
  const title = parts
    .join(' ')
    .split(' ')
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .filter(word => word.length > 0)
    .join(' ');
  
  return title || withoutExt;
}

/**
 * Loads images from both main folders (site-images, architectural-diagrams) 
 * and artifacts folders for a project.
 */
export async function loadProjectImages(
  projectId: string,
  orgId: string,
  excludeOther: boolean = false // Exclude "other" category from artifacts
): Promise<ImageData[]> {
  try {
    const allImages: ImageData[] = [];

    // 1. Load images from main folders (site-images, architectural-diagrams)
    const mainFolders = [
      { path: `${projectId}/site-images`, category: 'site_images' as const },
      { path: `${projectId}/architectural-diagrams`, category: 'architectural_diagrams' as const }
    ];

    for (const folder of mainFolders) {
      try {
        const { data: files, error } = await supabase.storage
          .from(orgId)
          .list(folder.path, {
            limit: 1000,
            sortBy: { column: 'name', order: 'asc' },
          });

        if (error) {
          console.warn(`Error listing ${folder.path}:`, error);
          continue;
        }

        if (files && files.length > 0) {
          const imagePromises = files
            .filter((f) => f.name !== '.keep' && f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
            .map(async (f) => {
              const filePath = `${folder.path}/${f.name}`;
              const signedUrl = await getSignedUrl(orgId, filePath);

              if (!signedUrl) {
                console.error(`Error getting signed URL for ${f.name}`);
                return null;
              }

              return {
                url: signedUrl,
                name: f.name,
                title: extractTitleFromFilename(f.name),
                category: folder.category,
                source: 'main_folder' as const,
                storagePath: filePath,
              };
            });

          const images = (await Promise.all(imagePromises)).filter(
            (img): img is NonNullable<typeof img> => img !== null
          );

          allImages.push(...(images as ImageData[]));
        }
      } catch (err) {
        console.error(`Error loading images from ${folder.path}:`, err);
      }
    }

    // 2. Load images from artifacts folders
    // Get all FILE resources that are project documents (not folders)
    const { data: resources, error: resourcesError } = await supabase
      .from('resources')
      .select('id, name')
      .eq('project_id', projectId)
      .eq('resource_type', 'FILE');

    if (resourcesError) {
      console.error('Error loading resources:', resourcesError);
    } else if (resources && resources.length > 0) {
      // Create a map of resource ID to name
      const resourceMap = new Map(resources.map(r => [r.id, r.name]));

      // For each resource, check its artifacts folder
      for (const resource of resources) {
        const resourceId = resource.id;
        const documentName = resource.name;
        
        // Check for artifacts in different versions (v1, v2, etc.)
        for (let version = 1; version <= 10; version++) {
          const basePath = `${projectId}/project-docs/${resourceId}/artifacts/v${version}/images`;
          
          // Check each category folder (exclude "other" if requested)
          const categories: Array<'site_images' | 'architectural_diagrams' | 'other'> = excludeOther
            ? ['site_images', 'architectural_diagrams']
            : ['site_images', 'architectural_diagrams', 'other'];

          for (const category of categories) {
            try {
              const { data: files, error } = await supabase.storage
                .from(orgId)
                .list(`${basePath}/${category}`, {
                  limit: 100,
                  sortBy: { column: 'name', order: 'asc' },
                });

              if (error) {
                // Folder might not exist, which is fine
                continue;
              }

              if (files && files.length > 0) {
                const imagePromises = files
                  .filter((f) => f.name !== '.keep' && f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
                  .map(async (f) => {
                    const filePath = `${basePath}/${category}/${f.name}`;
                    const signedUrl = await getSignedUrl(orgId, filePath);

                    if (!signedUrl) {
                      console.error(`Error getting signed URL for ${f.name}`);
                      return null;
                    }

                    return {
                      url: signedUrl,
                      name: f.name,
                      title: extractTitleFromFilename(f.name),
                      category,
                      resourceId,
                      version: `v${version}`,
                      source: 'artifacts' as const,
                      storagePath: filePath,
                      documentName,
                    };
                  });

                const images = (await Promise.all(imagePromises)).filter(
                  (img): img is NonNullable<typeof img> => img !== null
                );

                allImages.push(...(images as ImageData[]));
              }
            } catch (err) {
              console.error(`Error loading images from ${basePath}/${category}:`, err);
            }
          }
        }
      }
    }

    // Sort by category, then by name
    allImages.sort((a, b) => {
      const categoryOrder = { site_images: 0, architectural_diagrams: 1, other: 2 };
      const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category];
      if (categoryDiff !== 0) return categoryDiff;
      return a.name.localeCompare(b.name);
    });

    return allImages;
  } catch (error) {
    console.error('Error loading project images:', error);
    return [];
  }
}

/**
 * Groups images by category for easier display
 */
export function groupImagesByCategory(images: ImageData[]): {
  site_images: ImageData[];
  architectural_diagrams: ImageData[];
  other: ImageData[];
} {
  return {
    site_images: images.filter(img => img.category === 'site_images'),
    architectural_diagrams: images.filter(img => img.category === 'architectural_diagrams'),
    other: images.filter(img => img.category === 'other'),
  };
}

