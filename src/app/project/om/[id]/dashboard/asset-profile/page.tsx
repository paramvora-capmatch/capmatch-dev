// src/app/project/om/[id]/dashboard/asset-profile/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useProjects } from '@/hooks/useProjects';
import { QuadrantGrid } from '@/components/om/QuadrantGrid';
import { MiniChart } from '@/components/om/widgets/MiniChart';
import { unitMixData, marketComps, assetProfileDetails, projectOverview } from '@/services/mockOMData';
import { MapPin, Home, Package, Building2, Image as ImageIcon } from 'lucide-react';
import ZoningMap from '@/components/om/ZoningMap';
import { supabase } from '@/lib/supabaseClient';

export default function AssetProfilePage() {
  const params = useParams();
  const projectId = params?.id as string;
  const { getProject } = useProjects();
  const project = projectId ? getProject(projectId) : null;
  const [siteImageCount, setSiteImageCount] = useState(0);
  const [diagramCount, setDiagramCount] = useState(0);
  
  const loadMediaCounts = useCallback(async () => {
    if (!projectId || !project?.owner_org_id) return;
    
    try {
      const orgId = project.owner_org_id;

      // Count site images
      const { data: siteData } = await supabase.storage
        .from(orgId)
        .list(`${projectId}/site-images`, {
          limit: 100,
        });
      if (siteData) {
        const count = siteData.filter((f) => f.name !== ".keep" && f.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)).length;
        setSiteImageCount(count);
      }

      // Count diagrams
      const { data: diagramData } = await supabase.storage
        .from(orgId)
        .list(`${projectId}/architectural-diagrams`, {
          limit: 100,
        });
      if (diagramData) {
        const count = diagramData.filter((f) => f.name !== ".keep" && f.name.match(/\.(jpg|jpeg|png|gif|webp|pdf)$/i)).length;
        setDiagramCount(count);
      }
    } catch (error) {
      console.error('Error loading media counts:', error);
    }
  }, [projectId, project]);

  useEffect(() => {
    if (!projectId || !project?.owner_org_id) return;
    loadMediaCounts();
  }, [projectId, project, loadMediaCounts]);
  
  if (!project) return <div>Project not found</div>;
  
  const avgCompRentPSF = (marketComps.reduce((sum, comp) => sum + comp.rentPSF, 0) / marketComps.length).toFixed(2);
  const amenityLabels = assetProfileDetails.amenityDetails.map((a) => a.name);
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
              <p className="text-sm font-medium">{assetProfileDetails.sitePlan.lotSize}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Zoning</p>
              <p className="text-sm font-medium">{assetProfileDetails.sitePlan.zoningDetails.current}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">FAR</p>
              <p className="text-sm font-medium">
                {assetProfileDetails.sitePlan.zoningDetails.usedFAR} / {assetProfileDetails.sitePlan.zoningDetails.allowedFAR}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Height</p>
              <p className="text-sm font-medium">
                {assetProfileDetails.sitePlan.zoningDetails.actualHeight} / {assetProfileDetails.sitePlan.zoningDetails.heightLimit}
              </p>
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
            {amenityLabels.slice(0, 6).map((amenity) => (
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
                  <span className="font-medium">{projectOverview.propertyStats.stories}</span>
              </div>
              <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Parking Ratio</span>
                  <span className="font-medium">{projectOverview.propertyStats.parkingRatio.toFixed(2)} / unit</span>
              </div>
              <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amenity SF</span>
                  <span className="font-medium">{assetProfileDetails.amenityDetails.reduce((sum, amenity) => sum + parseInt(amenity.size.replace(/[^\d]/g, ''), 10), 0).toLocaleString()} SF</span>
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
            data={unitMixData.map((u) => ({ value: u.avgRent }))}
            height={80}
          />
          <div className="space-y-2">
            {unitMixData.slice(0, 3).map((unit) => (
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
              <span className="font-medium">${avgCompRentPSF}</span>
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
            {marketComps.slice(0, 3).map((comp) => (
              <div key={comp.name} className="p-2 bg-gray-50 rounded">
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
    },
    {
      id: 'media-gallery',
      title: 'Media & Plans',
      icon: Building2,
      color: 'from-blue-400 to-blue-500',
      href: `/project/om/${projectId}/dashboard/asset-profile/media`,
      metrics: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-50 rounded p-2 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Site Imagery</p>
              <p className="text-xl font-semibold text-blue-700">{siteImageCount}</p>
            </div>
            <div className="bg-blue-50 rounded p-2 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Diagrams</p>
              <p className="text-xl font-semibold text-blue-700">{diagramCount}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Review architectural diagrams, site renderings, and streetscape imagery pulled from the Hoque OM.
          </p>
        </div>
      )
    }
  ];
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Asset Profile Details
      </h2>
      <QuadrantGrid quadrants={quadrants} />
    </div>
  );
}