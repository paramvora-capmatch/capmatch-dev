// src/lib/imageUtils.ts
import { supabase } from '@/lib/supabaseClient';

export interface ImageData {
  url: string;
  name: string;
  title: string; // AI-generated title (extracted from filename)
  category: 'site_images' | 'architectural_diagrams' | 'other';
  resourceId: string;
  version: string;
}

/**
 * Extracts a human-readable title from the AI-generated filename.
 * Filenames are like: "front-elevation-view-abc123.jpg"
 * We remove the ID suffix and convert to Title Case.
 */
function extractTitleFromFilename(filename: string): string {
  // Remove extension
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // Remove the ID suffix (last part after last dash that looks like an ID)
  // IDs are typically 6 alphanumeric characters appended by backend
  const parts = withoutExt.split('-');
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    // If last part looks like an ID (short alphanumeric, 6 chars or less), remove it
    // This matches the backend's safe_id[:6] pattern
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
 * Loads images from the artifacts folder structure for a project.
 * Searches all resources' artifacts folders and organizes by category.
 */
export async function loadProjectImages(
  projectId: string,
  orgId: string
): Promise<ImageData[]> {
  try {
    // First, get all resources for this project
    const { data: resources, error: resourcesError } = await supabase
      .from('resources')
      .select('id')
      .eq('project_id', projectId)
      .eq('resource_type', 'PROJECT_DOCUMENT');

    if (resourcesError) {
      console.error('Error loading resources:', resourcesError);
      return [];
    }

    if (!resources || resources.length === 0) {
      return [];
    }

    const allImages: ImageData[] = [];

    // For each resource, check its artifacts folder
    for (const resource of resources) {
      const resourceId = resource.id;
      
      // Check for artifacts in different versions (v1, v2, etc.)
      // We'll check up to v10 (adjust as needed)
      for (let version = 1; version <= 10; version++) {
        const basePath = `${projectId}/project-docs/${resourceId}/artifacts/v${version}/images`;
        
        // Check each category folder
        const categories: Array<'site_images' | 'architectural_diagrams' | 'other'> = [
          'site_images',
          'architectural_diagrams',
          'other'
        ];

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
              // Create signed URLs for each image
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
                  };
                });

              const images = (await Promise.all(imagePromises)).filter(
                (img): img is ImageData => img !== null
              );

              allImages.push(...images);
            }
          } catch (err) {
            console.error(`Error loading images from ${basePath}/${category}:`, err);
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

