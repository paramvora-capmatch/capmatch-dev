// src/app/project/om/[id]/dashboard/asset-profile/page.tsx
"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjects } from '@/hooks/useProjects';
import { QuadrantGrid } from '@/components/om/QuadrantGrid';
import { MiniChart } from '@/components/om/widgets/MiniChart';
import { MapPin, Home, Package, Image as ImageIcon } from 'lucide-react';
import ZoningMap from '@/components/om/ZoningMap';
import { ImageSlideshow } from '@/components/om/ImageSlideshow';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';
import { parseNumeric, calculateAverage, formatFixed, formatLocale } from '@/lib/om-utils';

export default function AssetProfilePage() {
  const params = useParams();
  const projectId = params?.id as string;
  const { getProject } = useProjects();
  const project = projectId ? getProject(projectId) : null;
  const router = useRouter();
  const { content } = useOmContent();

  // Access flat fields directly
  const amenityList = Array.isArray(content?.amenityList) ? content.amenityList : [];
  const amenitySF = parseNumeric(content?.amenitySF) ?? 0;
  const residentialUnitMix = Array.isArray(content?.residentialUnitMix) ? content.residentialUnitMix : [];
  const rentComps = Array.isArray(content?.rentComps) ? content.rentComps : [];
  
  // Build unit mix data from flat residentialUnitMix array
  const unitMixData = residentialUnitMix.map((unit: any) => ({
    type: unit.unitType || unit.type || "",
    units: unit.unitCount || unit.units || 0,
    avgSF: unit.avgSF || 0,
    avgRent: unit.monthlyRent || 0,
  }));

  // Build market comps from flat rentComps array
  const marketComps = rentComps.map((comp: any) => ({
    name: comp.name || "",
    units: comp.units || 0,
    yearBuilt: comp.yearBuilt || "",
    rentPSF: comp.rentPSF || 0,
    capRate: comp.capRate || "",
  }));

  // Extract flat field values
  const totalSiteAcreage = content?.totalSiteAcreage ?? null;
  const zoningDesignation = content?.zoningDesignation ?? null;
  const allowableFAR = content?.allowableFAR ?? null;
  const farUtilizedPercent = content?.farUtilizedPercent ?? null;
  const numberOfStories = content?.numberOfStories ?? null;
  const parkingRatio = parseNumeric(content?.parkingRatio) ?? null;
  const parkingSpaces = parseNumeric(content?.parkingSpaces) ?? null;

  const avgCompRentPSF = calculateAverage(marketComps, (comp) => comp.rentPSF ?? null);

  useOMPageHeader({
    subtitle: project
      ? "Property composition, stats, and quick links into detailed asset views."
      : undefined,
  });
  
  if (!project) return <div>Project not found</div>;
  
  // Extract amenity names from flat amenityList array
  const amenityLabels = amenityList.map((a: string | { name?: string }) => 
    typeof a === "string" ? a : a.name || ""
  ).filter(Boolean);
  const quadrants = [
    {
      id: 'site-zoning',
      title: 'Site & Zoning',
      icon: MapPin,
      color: 'from-blue-400 to-blue-500',
      href: `/project/om/${projectId}/dashboard/asset-profile/site-plan`,
      metrics: (
        <div className="space-y-3">
          <ZoningMap compact={true} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500">Lot Size</p>
              <p className="text-sm font-medium">{totalSiteAcreage ? `${totalSiteAcreage} acres` : null}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Zoning</p>
              <p className="text-sm font-medium">{zoningDesignation ?? null}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">FAR</p>
              <p className="text-sm font-medium">
                {farUtilizedPercent ?? null}% / {allowableFAR ?? null}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Stories</p>
              <p className="text-sm font-medium">{numberOfStories ?? null}</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'design-amenities',
      title: 'Design & Amenities',
      icon: Home,
      color: 'from-blue-400 to-blue-500',
      href: `/project/om/${projectId}/dashboard/asset-profile/amenities`,
      metrics: (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {amenityLabels.slice(0, 6).map((amenity: string | null | undefined) => (
              <div key={amenity} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded text-center">
                {amenity}
              </div>
            ))}
          </div>
          <div className="pt-2">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Building Stats</p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Stories</span>
                <span className="font-medium">{numberOfStories ?? null}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Parking Ratio</span>
                <span className="font-medium">
                  {parkingRatio != null
                    ? `${formatFixed(parkingRatio, 2)} / unit`
                    : null}
                </span>
              </div>
              {parkingSpaces != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Parking Spaces</span>
                  <span className="font-medium">{formatLocale(parkingSpaces)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amenity SF</span>
                <span className="font-medium">
                  {amenitySF > 0
                    ? `${formatLocale(amenitySF)} SF`
                    : null}
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'unit-economics',
      title: 'Unit Economics',
      icon: Package,
      color: 'from-green-400 to-green-500',
      href: `/project/om/${projectId}/dashboard/asset-profile/unit-mix`,
      metrics: (
        <div className="space-y-3">
          <MiniChart
            type="bar"
            data={unitMixData.map((u: { avgRent?: number | null }) => ({ value: u.avgRent }))}
            height={80}
          />
          <div className="space-y-2">
            {unitMixData.slice(0, 3).map((unit: { type?: string | null; units?: number | null; avgRent?: number | null }) => (
              <div key={unit.type} className="flex justify-between text-sm">
                <span className="text-gray-600">{unit.type}</span>
                <span className="text-gray-600">{unit.units} units</span>
                <span className="font-medium">${unit.avgRent}</span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Avg Rent PSF</span>
              <span className="font-medium">
                {formatFixed(avgCompRentPSF, 2) != null ? `$${formatFixed(avgCompRentPSF, 2)}` : null}
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'comparable-assets',
      title: 'Comparable Assets',
      icon: ImageIcon,
      color: 'from-red-400 to-red-500',
      href: `/project/om/${projectId}/dashboard/asset-profile/comparables`,
      metrics: (
        <div className="space-y-3">
          <div className="space-y-2">
            {marketComps.slice(0, 3).map((comp: { name?: string | null; units?: number | null; yearBuilt?: string | null; rentPSF?: number | null; capRate?: string | null }, index: number) => (
              <div key={`comp-${index}`} className="p-2 bg-gray-50 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{comp.name}</p>
                    <p className="text-xs text-gray-500">
                      {comp.units} units • {comp.yearBuilt}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${comp.rentPSF} PSF</p>
                    <p className="text-xs text-gray-500">{comp.capRate}% cap</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
  ];
  
  return (
    <div className="space-y-6">
      {project?.owner_org_id && (
        <ImageSlideshow
          projectId={projectId}
          orgId={project.owner_org_id}
          projectName={project.projectName}
          autoPlayInterval={5000}
          height="h-80 md:h-96"
          onClick={() => router.push(`/project/om/${projectId}/dashboard/asset-profile/media`)}
        />
      )}
      <QuadrantGrid quadrants={quadrants} />
    </div>
  );
}