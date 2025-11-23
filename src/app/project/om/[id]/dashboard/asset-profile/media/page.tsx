'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { useProjects } from '@/hooks/useProjects';
import { FileText, Loader2 } from 'lucide-react';

interface MediaFile {
  name: string;
  url: string;
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

  useEffect(() => {
    if (!projectId || !project) return;
    loadMedia();
  }, [projectId, project]);

  const loadMedia = async () => {
    if (!projectId || !project?.owner_org_id) return;
    
    setLoading(true);
    try {
      const orgId = project.owner_org_id;

      // Load site images
      const { data: siteData, error: siteError } = await supabase.storage
        .from(orgId)
        .list(`${projectId}/site-images`, {
          limit: 100,
          sortBy: { column: "name", order: "asc" },
        });

      if (siteError) {
        console.error('Error loading site images:', siteError);
      } else if (siteData) {
        const imagePromises = siteData
          .filter((f) => f.name !== ".keep" && f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
          .map(async (f) => {
            const filePath = `${projectId}/site-images/${f.name}`;
            const { data, error } = await supabase.storage
              .from(orgId)
              .createSignedUrl(filePath, 3600); // 1 hour expiry
            
            if (error) {
              console.error(`Error creating signed URL for ${f.name}:`, error);
              return null;
            }
            
            return {
              name: f.name,
              url: data.signedUrl,
              isPdf: false,
            };
          });
        
        const images = (await Promise.all(imagePromises)).filter((img): img is MediaFile => img !== null);
        setSiteImages(images);
      }

      // Load architectural diagrams
      const { data: diagramData, error: diagramError } = await supabase.storage
        .from(orgId)
        .list(`${projectId}/architectural-diagrams`, {
          limit: 100,
          sortBy: { column: "name", order: "asc" },
        });

      if (diagramError) {
        console.error('Error loading diagrams:', diagramError);
      } else if (diagramData) {
        const diagramPromises = diagramData
          .filter((f) => f.name !== ".keep" && (f.name.match(/\.(jpg|jpeg|png|gif|webp|pdf)$/i)))
          .map(async (f) => {
            const filePath = `${projectId}/architectural-diagrams/${f.name}`;
            const { data, error } = await supabase.storage
              .from(orgId)
              .createSignedUrl(filePath, 3600); // 1 hour expiry
            
            if (error) {
              console.error(`Error creating signed URL for ${f.name}:`, error);
              return null;
            }
            
            return {
              name: f.name,
              url: data.signedUrl,
              isPdf: f.name.match(/\.pdf$/i) !== null,
            };
          });
        
        const diagrams = (await Promise.all(diagramPromises)).filter((diag): diag is MediaFile => diag !== null);
        setArchitecturalDiagrams(diagrams);
      }
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!project) {
    return <div className="text-center py-8">Project not found</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Media & Diagrams</h1>
        <p className="text-gray-600 mt-2">
          Visual materials uploaded to the project including site imagery, streetscapes, and architectural diagrams.
        </p>
      </div>

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
              {siteImages.map((image) => (
                <div key={image.name} className="space-y-3">
                  <div className="relative w-full h-56 rounded-xl overflow-hidden border border-gray-100">
                    <Image
                      src={image.url}
                      alt={image.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800">{image.name}</h4>
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
              {architecturalDiagrams.map((diagram) => (
                <div key={diagram.name} className="space-y-3">
                  <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-100 bg-white">
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
                      />
                    )}
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-800">{diagram.name}</h4>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

