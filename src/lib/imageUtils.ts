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

// Simple in-memory cache with TTL (5 minutes)
const imageCache = new Map<string, { data: ImageData[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(projectId: string, orgId: string, excludeOther: boolean): string {
  return `${projectId}:${orgId}:${excludeOther}`;
}

function getCachedImages(projectId: string, orgId: string, excludeOther: boolean): ImageData[] | null {
  const key = getCacheKey(projectId, orgId, excludeOther);
  const cached = imageCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedImages(projectId: string, orgId: string, excludeOther: boolean, images: ImageData[]): void {
  const key = getCacheKey(projectId, orgId, excludeOther);
  imageCache.set(key, { data: images, timestamp: Date.now() });
}

/**
 * Invalidates the cache for a specific project.
 * Call this after uploading or deleting images to ensure fresh data.
 */
export function invalidateProjectImageCache(projectId: string, orgId: string): void {
  // Remove both excludeOther=true and excludeOther=false entries
  imageCache.delete(getCacheKey(projectId, orgId, true));
  imageCache.delete(getCacheKey(projectId, orgId, false));
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
 * Loads images from a single main folder (site-images or architectural-diagrams)
 */
async function loadMainFolderImages(
  projectId: string,
  orgId: string,
  folderPath: string,
  category: 'site_images' | 'architectural_diagrams'
): Promise<ImageData[]> {
  try {
    const { data: files, error } = await supabase.storage
      .from(orgId)
      .list(folderPath, {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      console.warn(`Error listing ${folderPath}:`, error);
      return [];
    }

    if (!files || files.length === 0) {
      return [];
    }

    // Filter image files and create signed URLs in parallel
    const imageFiles = files.filter(
      (f) => f.name !== '.keep' && f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );

    const imagePromises = imageFiles.map(async (f) => {
      const filePath = `${folderPath}/${f.name}`;
      const { data: urlData, error: urlError } = await supabase.storage
        .from(orgId)
        .createSignedUrl(filePath, 3600);

      if (urlError) {
        console.error(`Error creating signed URL for ${f.name}:`, urlError);
        return null;
      }

      return {
        url: urlData.signedUrl,
        name: f.name,
        title: extractTitleFromFilename(f.name),
        category,
        source: 'main_folder' as const,
        storagePath: filePath,
      };
    });

    const images = (await Promise.all(imagePromises)).filter(
      (img): img is NonNullable<typeof img> => img !== null
    );

    return images;
  } catch (err) {
    console.error(`Error loading images from ${folderPath}:`, err);
    return [];
  }
}

/**
 * Discovers which version folders actually exist for a resource's artifacts
 */
async function discoverArtifactVersions(
  projectId: string,
  orgId: string,
  resourceId: string
): Promise<number[]> {
  try {
    const artifactsPath = `${projectId}/project-docs/${resourceId}/artifacts`;
    const { data: folders, error } = await supabase.storage
      .from(orgId)
      .list(artifactsPath, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error || !folders) {
      return [];
    }

    // Extract version numbers from folder names like "v1", "v2", etc.
    const versions: number[] = [];
    for (const folder of folders) {
      const match = folder.name.match(/^v(\d+)$/);
      if (match) {
        versions.push(parseInt(match[1], 10));
      }
    }

    return versions.sort((a, b) => a - b);
  } catch (err) {
    console.error(`Error discovering versions for resource ${resourceId}:`, err);
    return [];
  }
}

/**
 * Loads images from artifacts folders for a single resource
 */
async function loadResourceArtifactImages(
  projectId: string,
  orgId: string,
  resourceId: string,
  documentName: string,
  excludeOther: boolean
): Promise<ImageData[]> {
  try {
    // Discover which versions actually exist instead of checking 1-10 blindly
    const versions = await discoverArtifactVersions(projectId, orgId, resourceId);
    
    if (versions.length === 0) {
      return [];
    }

    const categories: Array<'site_images' | 'architectural_diagrams' | 'other'> = excludeOther
      ? ['site_images', 'architectural_diagrams']
      : ['site_images', 'architectural_diagrams', 'other'];

    // Process all version/category combinations in parallel
    const versionCategoryPromises = versions.flatMap((version) =>
      categories.map(async (category) => {
        const basePath = `${projectId}/project-docs/${resourceId}/artifacts/v${version}/images`;
        
        try {
          const { data: files, error } = await supabase.storage
            .from(orgId)
            .list(`${basePath}/${category}`, {
              limit: 100,
              sortBy: { column: 'name', order: 'asc' },
            });

          if (error || !files || files.length === 0) {
            return [];
          }

          const imageFiles = files.filter(
            (f) => f.name !== '.keep' && f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
          );

          // Create signed URLs in parallel
          const imagePromises = imageFiles.map(async (f) => {
            const filePath = `${basePath}/${category}/${f.name}`;
            const { data: urlData, error: urlError } = await supabase.storage
              .from(orgId)
              .createSignedUrl(filePath, 3600);

            if (urlError) {
              console.error(`Error creating signed URL for ${f.name}:`, urlError);
              return null;
            }

            return {
              url: urlData.signedUrl,
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

          return images;
        } catch (err) {
          console.error(`Error loading images from ${basePath}/${category}:`, err);
          return [];
        }
      })
    );

    const allVersionImages = await Promise.all(versionCategoryPromises);
    return allVersionImages.flat();
  } catch (err) {
    console.error(`Error loading artifact images for resource ${resourceId}:`, err);
    return [];
  }
}

/**
 * Loads images from both main folders (site-images, architectural-diagrams) 
 * and artifacts folders for a project.
 * 
 * Optimizations:
 * - Parallel processing of main folders and resources
 * - Only checks artifact versions that actually exist (not 1-10 blindly)
 * - In-memory caching with 5-minute TTL
 */
export async function loadProjectImages(
  projectId: string,
  orgId: string,
  excludeOther: boolean = false // Exclude "other" category from artifacts
): Promise<ImageData[]> {
  try {
    // Check cache first
    const cached = getCachedImages(projectId, orgId, excludeOther);
    if (cached) {
      return cached;
    }

    // 1. Load images from main folders in parallel
    const mainFolders = [
      { path: `${projectId}/site-images`, category: 'site_images' as const },
      { path: `${projectId}/architectural-diagrams`, category: 'architectural_diagrams' as const }
    ];

    const mainFolderPromises = mainFolders.map((folder) =>
      loadMainFolderImages(projectId, orgId, folder.path, folder.category)
    );

    const mainFolderResults = await Promise.all(mainFolderPromises);
    const mainImages = mainFolderResults.flat();

    // 2. Load images from artifacts folders
    // Get all FILE resources that are project documents (not folders)
    const { data: resources, error: resourcesError } = await supabase
      .from('resources')
      .select('id, name')
      .eq('project_id', projectId)
      .eq('resource_type', 'FILE');

    let artifactImages: ImageData[] = [];
    
    if (resourcesError) {
      console.error('Error loading resources:', resourcesError);
    } else if (resources && resources.length > 0) {
      // Process all resources in parallel
      const resourcePromises = resources.map((resource) =>
        loadResourceArtifactImages(
          projectId,
          orgId,
          resource.id,
          resource.name,
          excludeOther
        )
      );

      const resourceResults = await Promise.all(resourcePromises);
      artifactImages = resourceResults.flat();
    }

    // Combine and sort all images
    const allImages = [...mainImages, ...artifactImages];
    
    allImages.sort((a, b) => {
      const categoryOrder = { site_images: 0, architectural_diagrams: 1, other: 2 };
      const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category];
      if (categoryDiff !== 0) return categoryDiff;
      return a.name.localeCompare(b.name);
    });

    // Cache the results
    setCachedImages(projectId, orgId, excludeOther, allImages);

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

/**
 * Gets a signed URL for an image from Supabase storage.
 * 
 * @param orgId - Organization ID (bucket name)
 * @param storagePath - Full storage path to the image
 * @returns Signed URL string or null if error
 */
export async function getSignedUrl(orgId: string, storagePath: string): Promise<string | null> {
  try {
    const { data: urlData, error } = await supabase.storage
      .from(orgId)
      .createSignedUrl(storagePath, 3600);

    if (error) {
      console.error(`Error creating signed URL for ${storagePath}:`, error);
      return null;
    }

    return urlData?.signedUrl || null;
  } catch (error) {
    console.error(`Exception creating signed URL for ${storagePath}:`, error);
    return null;
  }
}

