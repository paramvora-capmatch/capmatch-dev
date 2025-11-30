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

