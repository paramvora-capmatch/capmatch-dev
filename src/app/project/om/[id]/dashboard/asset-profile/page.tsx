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
    type: unit.unitType || unit.type || null,
    units: parseNumeric(unit.unitCount || unit.units) ?? null,
    avgSF: parseNumeric(unit.avgSF) ?? null,
    avgRent: parseNumeric(unit.monthlyRent) ?? null,
  }));

  // Calculate average rent PSF from unit mix (monthly rent / avgSF)
  const avgUnitRentPSF = unitMixData.length > 0 && unitMixData.some(u => u.avgRent != null && u.avgSF != null && u.avgSF > 0)
    ? unitMixData
        .filter(u => u.avgRent != null && u.avgSF != null && u.avgSF > 0)
        .reduce((sum, unit) => {
          const rentPSF = (unit.avgRent ?? 0) / (unit.avgSF ?? 1);
          return sum + rentPSF;
        }, 0) / unitMixData.filter(u => u.avgRent != null && u.avgSF != null && u.avgSF > 0).length
    : null;

  // Build market comps from flat rentComps array
  const marketComps = rentComps.map((comp: any) => ({
    name: comp.propertyName || comp.name || null,
    units: parseNumeric(comp.totalUnits || comp.units) ?? null,
    yearBuilt: comp.yearBuilt || comp.year || null,
    rentPSF: parseNumeric(comp.rentPSF || comp.rentPerSF) ?? null,
    // Note: capRate is not in rentComps array in seed script
    capRate: null,
  }));

  // Extract flat field values
  const totalSiteAcreage = content?.totalSiteAcreage ?? null;
  const zoningDesignation = content?.zoningDesignation ?? null;
  const allowableFAR = content?.allowableFAR ?? null;
  const farUtilizedPercent = content?.farUtilizedPercent ?? null;
  const numberOfStories = content?.numberOfStories ?? null;
  const parkingRatio = parseNumeric(content?.parkingRatio) ?? null;
  const parkingSpaces = parseNumeric(content?.parkingSpaces) ?? null;

  const avgCompRentPSF = calculateAverage(marketComps, (comp: typeof marketComps[0]) => comp.rentPSF ?? null);

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
          {unitMixData.length > 0 ? (
            <div>
              <div>
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Monthly Rent by Unit Type</p>
                <MiniChart
                  type="bar"
                  data={unitMixData
                    .filter((u: { avgRent?: number | null }) => u.avgRent != null)
                    .map((u: { avgRent?: number | null }) => ({ value: u.avgRent ?? 0 }))}
                  height={80}
                />
              </div>
              <div className="space-y-2">
                {unitMixData.slice(0, 3).map((unit: { type?: string | null; units?: number | null; avgRent?: number | null }) => (
                  <div key={unit.type || 'unknown'} className="flex justify-between text-sm">
                    <span className="text-gray-600">{unit.type || 'N/A'}</span>
                    <span className="text-gray-600">
                      {unit.units != null ? `${formatLocale(unit.units)} units` : 'N/A'}
                    </span>
                    <span className="font-medium">
                      {unit.avgRent != null ? `$${formatLocale(unit.avgRent)}` : 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg Rent PSF</span>
                  <span className="font-medium">
                    {avgUnitRentPSF != null ? `$${formatFixed(avgUnitRentPSF, 2)}` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No unit mix data available</p>
          )}
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
          {marketComps.length > 0 ? (
            <div className="space-y-2">
              {marketComps.slice(0, 3).map((comp: { name?: string | null; units?: number | null; yearBuilt?: string | null; rentPSF?: number | null; capRate?: number | null }, index: number) => (
                <div key={`comp-${index}`} className="p-2 bg-gray-50 rounded">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {comp.name || `Property ${index + 1}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {comp.units != null ? `${formatLocale(comp.units)} units` : 'Units N/A'} • {comp.yearBuilt || 'Year N/A'}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-sm font-medium">
                        {comp.rentPSF != null ? `$${formatFixed(comp.rentPSF, 2)} PSF` : 'Rent N/A'}
                      </p>
                      {comp.capRate != null ? (
                        <p className="text-xs text-gray-500">{formatFixed(comp.capRate, 2)}% cap</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No comparable properties data available</p>
          )}
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