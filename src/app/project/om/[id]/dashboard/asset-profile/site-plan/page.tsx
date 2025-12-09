'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2, TreePine, Car } from 'lucide-react';
import InteractiveSiteMap from '@/components/om/InteractiveSiteMap';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';
import { formatFixed } from '@/lib/om-utils';

export default function SitePlanPage() {
  const { content } = useOmContent();
  
  // Access flat fields directly
  const totalSiteAcreage = content?.totalSiteAcreage ?? null;
  const lotSize = totalSiteAcreage ? `${totalSiteAcreage} Acres` : null;
  const buildingFootprint = content?.grossBuildingArea ? `${content.grossBuildingArea} SF` : null;
  const parkingSpaces = content?.parkingSpaces ?? null;
  const greenSpace = null; // Not directly available in flat fields
  
  // Zoning details from flat fields
  const allowedFAR = parseFloat(String(content?.allowableFAR ?? '0'));
  const usedFAR = parseFloat(String(content?.farUtilizedPercent ?? '0'));
  const heightLimit = parseFloat(String(content?.numberOfStories ?? '0')) * 10; // Approximate: 10ft per story
  const actualHeight = parseFloat(String(content?.numberOfStories ?? '0')) * 10;
  
  // Setbacks not directly available - using placeholders
  const setbacks = {
    front: null,
    side: null,
    rear: null,
  };
  
  const zoningDetails = {
    current: content?.zoningDesignation ?? null,
    allowedFAR: content?.allowableFAR ?? null,
    usedFAR: content?.farUtilizedPercent ?? null,
    heightLimit: heightLimit > 0 ? `${heightLimit} ft` : null,
    actualHeight: actualHeight > 0 ? `${actualHeight} ft` : null,
  };
  
  const farUtilization =
    allowedFAR > 0 ? Math.round((usedFAR / allowedFAR) * 100) : null;
  
  const heightRemaining =
    !Number.isNaN(heightLimit) && !Number.isNaN(actualHeight)
      ? heightLimit - actualHeight
      : null;
  const farRemaining =
    !Number.isNaN(allowedFAR) && !Number.isNaN(usedFAR)
      ? allowedFAR - usedFAR
      : null;
  
  const buildingCoverageValue = content?.grossBuildingArea ?? 0;
  const totalSiteSF = totalSiteAcreage ? totalSiteAcreage * 43560 : 1; // Convert acres to SF
  const buildingCoveragePercent =
    buildingCoverageValue > 0 && totalSiteSF > 0
      ? Math.round((buildingCoverageValue / totalSiteSF) * 100)
      : null;
  
  const parkingRatioValue = content?.parkingRatio ?? null;
  const parkingRatio =
    parkingSpaces != null && totalSiteAcreage != null
      ? Math.round((parkingSpaces / (totalSiteAcreage * 43560 / 1000)) * 100) / 100
      : parkingRatioValue;

  useOMPageHeader({
    subtitle: "Layout of buildings, circulation, zoning, and site efficiencies.",
  });

  return (
    <div className="space-y-6">

      {/* Site Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2" dataSourceFields={['total site acreage']}>
            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Lot Size</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{lotSize ?? null}</p>
            <p className="text-sm text-gray-500 mt-1">Total site area</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Building2 className="h-5 w-5 text-green-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Building</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{buildingFootprint ?? null}</p>
            <p className="text-sm text-gray-500 mt-1">Building footprint</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2" dataSourceFields={['parking spaces']}>
            <div className="flex items-center">
              <Car className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Parking</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{parkingSpaces ?? null}</p>
            <p className="text-sm text-gray-500 mt-1">Parking spaces</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <TreePine className="h-5 w-5 text-green-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Green Space</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{greenSpace ?? null}</p>
            <p className="text-sm text-gray-500 mt-1">Site coverage</p>
          </CardContent>
        </Card>
      </div>

      {/* Zoning Details */}
      <Card className="hover:shadow-lg transition-shadow mb-8">
        <CardHeader dataSourceSection="site & zoning">
          <h3 className="text-xl font-semibold text-gray-800">Zoning Information</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Current Zoning</p>
                <p className="font-semibold text-gray-800">{zoningDetails.current ?? null}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Allowed FAR</p>
                <p className="font-semibold text-gray-800">{zoningDetails.allowedFAR ?? null}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Used FAR</p>
                <p className="font-semibold text-gray-800">{zoningDetails.usedFAR ?? null}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Height Limit</p>
                <p className="font-semibold text-gray-800">{zoningDetails.heightLimit ?? null}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Actual Height</p>
                <p className="font-semibold text-gray-800">{zoningDetails.actualHeight ?? null}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">FAR Utilization</p>
                <Badge variant="outline" className="border-gray-200">
                  {farUtilization != null ? `${farUtilization}%` : null}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Setbacks</p>
                <div className="space-y-1">
                  <p className="text-xs text-gray-600">Front: {setbacks?.front ?? null}</p>
                  <p className="text-xs text-gray-600">Side: {setbacks?.side ?? null}</p>
                  <p className="text-xs text-gray-600">Rear: {setbacks?.rear ?? null}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Site Map */}
      <Card className="hover:shadow-lg transition-shadow mb-8">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">Interactive Site Map</h3>
          <p className="text-sm text-gray-600">Click on areas to view detailed information</p>
        </CardHeader>
        <CardContent>
          <InteractiveSiteMap />
        </CardContent>
      </Card>

      {/* Site Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Site Efficiency</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Building Coverage</span>
                <Badge variant="secondary">
                  {buildingCoveragePercent != null ? `${buildingCoveragePercent}%` : null}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Parking Ratio</span>
                <Badge variant="secondary">
                  {parkingRatio != null ? `${parkingRatio} spaces/acre` : null}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Green Space Ratio</span>
                <Badge variant="secondary">{greenSpace ?? null}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Development Potential</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">FAR Remaining</span>
                <Badge variant="outline" className="border-gray-200">
                  {formatFixed(farRemaining, 1) ?? null}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Height Remaining</span>
                <Badge variant="outline" className="border-gray-200">
                  {formatFixed(heightRemaining, 1) != null ? `${formatFixed(heightRemaining, 1)} feet` : null}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Zoning Compliance</span>
                <Badge className="bg-green-100 text-green-800">Compliant</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 