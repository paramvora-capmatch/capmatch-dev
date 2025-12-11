'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useProjects } from '@/hooks/useProjects';
import { FileText, Loader2 } from 'lucide-react';
import { ImagePreviewModal } from '@/components/om/ImagePreviewModal';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { loadProjectImages, groupImagesByCategory, type ImageData } from '@/lib/imageUtils';

interface MediaFile {
  name: string;
  url: string;
  title: string;
  isPdf: boolean;
}

export default function MediaGalleryPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const { getProject } = useProjects();
  const project = projectId ? getProject(projectId) : null;
  
  const [siteImages, setSiteImages] = useState<MediaFile[]>([]);
  const [architecturalDiagrams, setArchitecturalDiagrams] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  
  // Combine all images for preview navigation
  const allImages = [...siteImages, ...architecturalDiagrams];

  useOMPageHeader({
    subtitle: "Gallery of site imagery, streetscapes, and architectural diagrams.",
  });

  const loadMedia = useCallback(async () => {
    if (!projectId || !project?.owner_org_id) return;
    
    setLoading(true);
    try {
      const orgId = project.owner_org_id;

      // Load all images from both main folders and artifacts (exclude "other" category)
      const allImages = await loadProjectImages(projectId, orgId, true);
      
      // Group by category
      const grouped = groupImagesByCategory(allImages);
      
      // Convert to MediaFile format
      const siteImagesData: MediaFile[] = grouped.site_images.map(img => ({
        name: img.name,
        url: img.url,
        title: img.title,
        isPdf: false,
      }));
      
      const diagramsData: MediaFile[] = grouped.architectural_diagrams.map(img => ({
        name: img.name,
        url: img.url,
        title: img.title,
        isPdf: false, // PDFs would be handled separately if needed
      }));
      
      setSiteImages(siteImagesData);
      setArchitecturalDiagrams(diagramsData);
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, project]);

  useEffect(() => {
    if (!projectId || !project) return;
    loadMedia();
  }, [projectId, project, loadMedia]);

  // Preload images into browser cache for faster subsequent loads
  useEffect(() => {
    if (siteImages.length === 0 && architecturalDiagrams.length === 0) return;
    
    // Preload all images using native Image API for better browser cache utilization
    const allImageUrls = [...siteImages, ...architecturalDiagrams]
      .map(img => img.url)
      .filter(Boolean);
    
    allImageUrls.forEach(url => {
      // Use native Image preloading for better browser cache utilization
      const img = new Image();
      img.src = url;
    });
  }, [siteImages, architecturalDiagrams]);

  if (!project) {
    return <div className="text-center py-8">Project not found</div>;
  }

  const handleImageClick = (index: number) => {
    setPreviewIndex(index);
    setPreviewOpen(true);
  };

  const handleSiteImageClick = (image: MediaFile) => {
    const index = siteImages.findIndex(img => img.name === image.name);
    handleImageClick(index);
  };

  const handleDiagramClick = (diagram: MediaFile) => {
    const index = siteImages.length + architecturalDiagrams.findIndex(img => img.name === diagram.name);
    handleImageClick(index);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Site Imagery */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">Site & Context Imagery</h3>
          <p className="text-sm text-gray-600">
            Macro views illustrating how the project fits within the master plan and surrounding districts.
          </p>
        </CardHeader>
        <CardContent>
          {siteImages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No site images uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {siteImages.map((image, index) => (
                <div key={image.name} className="space-y-3">
                  <div 
                    className="relative w-full h-56 rounded-xl overflow-hidden border border-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => handleSiteImageClick(image)}
                  >
                    <Image
                      src={image.url}
                      alt={image.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                      unoptimized
                      priority={index < 4}
                      loading={index < 4 ? "eager" : "lazy"}
                    />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800">{image.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diagrams */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">Architectural Diagrams</h3>
          <p className="text-sm text-gray-600">
            Floor plates, site plans, and massing studies from the project submittal package.
          </p>
        </CardHeader>
        <CardContent>
          {architecturalDiagrams.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No architectural diagrams uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {architecturalDiagrams.map((diagram, index) => (
                <div key={diagram.name} className="space-y-3">
                  <div 
                    className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-100 bg-white cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => handleDiagramClick(diagram)}
                  >
                    {diagram.isPdf ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <FileText className="h-12 w-12 text-gray-400" />
                      </div>
                    ) : (
                      <Image
                        src={diagram.url}
                        alt={diagram.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-contain p-4 bg-white"
                        unoptimized
                        priority={index < 6}
                        loading={index < 6 ? "eager" : "lazy"}
                      />
                    )}
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-800">{diagram.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Modal */}
      {allImages.length > 0 && (
        <ImagePreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          images={allImages}
          currentIndex={previewIndex}
          onIndexChange={setPreviewIndex}
        />
      )}
    </div>
  );
}

