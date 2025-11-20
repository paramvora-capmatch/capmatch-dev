'use client';

import Image from 'next/image';
import { mediaAssets } from '@/services/mockOMData';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function MediaGalleryPage() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Media & Diagrams</h1>
        <p className="text-gray-600 mt-2">
          Visual materials pulled directly from the Hoque OM including site imagery, streetscapes, and architectural diagrams.
        </p>
      </div>

      {/* Site Imagery */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">Site & Context Imagery</h3>
          <p className="text-sm text-gray-600">
            Macro views illustrating how SoGood Apartments fits within the master plan and surrounding districts.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mediaAssets.site.map((asset) => (
              <div key={asset.title} className="space-y-3">
                <div className="relative w-full h-56 rounded-xl overflow-hidden border border-gray-100">
                  <Image
                    src={asset.imageUrl}
                    alt={asset.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-800">{asset.title}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {asset.source}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{asset.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {asset.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Diagrams */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">Architectural Diagrams</h3>
          <p className="text-sm text-gray-600">
            Floor plates, site plans, and massing studies extracted from the Hoque submittal package.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mediaAssets.diagrams.map((asset) => (
              <div key={asset.title} className="space-y-3">
                <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-100 bg-white">
                  <Image
                    src={asset.imageUrl}
                    alt={asset.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-contain p-4 bg-white"
                  />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-800">{asset.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{asset.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex flex-wrap gap-1">
                      {asset.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {asset.source}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

