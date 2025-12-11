'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2, DollarSign, BarChart3 } from 'lucide-react';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';
import { parseNumeric, calculateAverage, formatFixed, formatLocale } from '@/lib/om-utils';

// Component to show missing values in red
const MissingValue = ({ children }: { children: React.ReactNode }) => (
  <span className="text-red-600 font-medium">{children}</span>
);

export default function ComparablesPage() {
  const { content } = useOmContent();
  
  // Access flat rentComps array directly
  const rentComps = Array.isArray(content?.rentComps) ? content.rentComps : [];
  
  // Extract market context fields from flat schema
  const submarketName = content?.submarketName || null;
  const supplyPipeline = parseNumeric(content?.supplyPipeline) ?? null;
  const projGrowth202429 = parseNumeric(content?.projGrowth202429) ?? null;
  const substantialComp = content?.substantialComp || null;
  
  // Transform flat rentComps to comparableDetails structure for UI
  const comparableDetails = rentComps.map((comp: any) => ({
    name: comp.propertyName || comp.name || null,
    address: comp.address || comp.location || null,
    distance: parseNumeric(comp.distance) ?? null,
    yearBuilt: comp.yearBuilt || comp.year || null,
    units: parseNumeric(comp.totalUnits || comp.units) ?? null,
    occupancyPercent: parseNumeric(comp.occupancyPercent || comp.occupancy) ?? null,
    rentPSF: parseNumeric(comp.rentPSF || comp.rentPerSF) ?? null,
    avgRentMonth: parseNumeric(comp.avgRentMonth) ?? null,
    // Note: saleDate, salePrice, and capRate are not in the seed script's rentComps
    lastSale: {
      date: comp.saleDate || comp.lastSaleDate || null,
      price: comp.salePrice ? parseNumeric(comp.salePrice) : null,
      capRate: parseNumeric(comp.capRate) ?? null,
    },
  }));

  // Calculate averages from actual numeric values
  const avgRentPSF = comparableDetails.length > 0
    ? comparableDetails.reduce((sum, comp) => sum + (comp.rentPSF ?? 0), 0) / comparableDetails.length
    : null;
  
  const avgCapRate = comparableDetails.length > 0 && comparableDetails.some(c => c.lastSale.capRate != null)
    ? comparableDetails
        .filter(c => c.lastSale.capRate != null)
        .reduce((sum, comp) => sum + (comp.lastSale.capRate ?? 0), 0) / comparableDetails.filter(c => c.lastSale.capRate != null).length
    : null;
  
  const avgDistance = comparableDetails.length > 0 && comparableDetails.some(c => c.distance != null)
    ? comparableDetails
        .filter(c => c.distance != null)
        .reduce((sum, comp) => sum + (comp.distance ?? 0), 0) / comparableDetails.filter(c => c.distance != null).length
    : null;
  
  const comparablesCount = comparableDetails.length;

  const getDistanceColor = (distance: number | null) => {
    if (distance == null) return 'bg-gray-100 text-gray-800';
    if (distance <= 0.5) return 'bg-green-100 text-green-800';
    if (distance <= 1.0) return 'bg-blue-100 text-blue-800';
    if (distance <= 2.0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getOccupancyColor = (occupancy: number | null) => {
    if (occupancy == null) return 'bg-gray-100 text-gray-800';
    if (occupancy >= 95) return 'bg-green-100 text-green-800';
    if (occupancy >= 90) return 'bg-blue-100 text-blue-800';
    if (occupancy >= 85) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getCapRateColor = (capRate: number | null) => {
    if (capRate == null) return 'bg-gray-100 text-gray-800';
    if (capRate <= 4.5) return 'bg-green-100 text-green-800';
    if (capRate <= 5.5) return 'bg-blue-100 text-blue-800';
    if (capRate <= 6.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  useOMPageHeader({
    subtitle: "Market comps showcasing rents, occupancy, pricing, and scale.",
  });

  return (
    <div className="space-y-6">

      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Building2 className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Comparables</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {comparablesCount > 0 ? comparablesCount : <MissingValue>0</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">Properties analyzed</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-green-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Avg Rent PSF</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {avgRentPSF != null ? `$${formatFixed(avgRentPSF, 2)}` : <MissingValue>Not available</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">Market average</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Avg Cap Rate</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {avgCapRate != null ? `${formatFixed(avgCapRate, 1)}%` : <MissingValue>Not available</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">Market average</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-semibold text-gray-800">Avg Distance</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {avgDistance != null ? `${formatFixed(avgDistance, 1)} mi` : <MissingValue>Not available</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">From project site</p>
          </CardContent>
        </Card>
      </div>

      {/* Comparables Table */}
      <Card className="hover:shadow-lg transition-shadow mb-8">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">Comparable Properties Analysis</h3>
        </CardHeader>
        <CardContent>
          {comparableDetails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 font-semibold text-gray-800">Property</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-800">Distance</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-800">Year Built</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-800">Units</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-800">Occupancy</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-800">Rent PSF</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-800">Last Sale</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-800">Cap Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {comparableDetails.map((comp: typeof comparableDetails[number], index: number) => (
                    <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-800">
                            {comp.name ? comp.name : <MissingValue>Unknown Property</MissingValue>}
                          </p>
                          {comp.address ? (
                            <p className="text-sm text-gray-500">{comp.address}</p>
                          ) : (
                            <p className="text-sm text-gray-500 italic">
                              <MissingValue>Address not available</MissingValue>
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {comp.distance != null ? (
                          <Badge className={getDistanceColor(comp.distance)}>
                            <MapPin className="h-3 w-3 mr-1" />
                            {formatFixed(comp.distance, 1)} mi
                          </Badge>
                        ) : (
                          <MissingValue>N/A</MissingValue>
                        )}
                      </td>
                      <td className="py-4 px-4 text-gray-800">
                        {comp.yearBuilt ? comp.yearBuilt : <MissingValue>N/A</MissingValue>}
                      </td>
                      <td className="py-4 px-4 text-gray-800">
                        {comp.units != null ? formatLocale(comp.units) : <MissingValue>N/A</MissingValue>}
                      </td>
                      <td className="py-4 px-4">
                        {comp.occupancyPercent != null ? (
                          <Badge className={getOccupancyColor(comp.occupancyPercent)}>
                            {formatFixed(comp.occupancyPercent, 1)}%
                          </Badge>
                        ) : (
                          <MissingValue>N/A</MissingValue>
                        )}
                      </td>
                      <td className="py-4 px-4 text-gray-800">
                        {comp.rentPSF != null ? `$${formatFixed(comp.rentPSF, 2)}/SF` : <MissingValue>N/A</MissingValue>}
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          {comp.lastSale.date ? (
                            <p className="text-sm text-gray-800">{comp.lastSale.date}</p>
                          ) : (
                            <p className="text-sm text-gray-500 italic">
                              <MissingValue>Date N/A</MissingValue>
                            </p>
                          )}
                          {comp.lastSale.price != null ? (
                            <p className="text-xs text-gray-500">${formatLocale(comp.lastSale.price)}</p>
                          ) : (
                            <p className="text-xs text-gray-500 italic">
                              <MissingValue>Price N/A</MissingValue>
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {comp.lastSale.capRate != null ? (
                          <Badge className={getCapRateColor(comp.lastSale.capRate)}>
                            {formatFixed(comp.lastSale.capRate, 2)}%
                          </Badge>
                        ) : (
                          <MissingValue>N/A</MissingValue>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              <MissingValue>No comparable properties data available</MissingValue>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Market Positioning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Rent Analysis</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Rent per Square Foot Comparison</h4>
                {comparableDetails.length > 0 ? (
                  <div className="space-y-3">
                    {comparableDetails.map((comp: typeof comparableDetails[number], index: number) => {
                      const isAboveAvg =
                        avgRentPSF != null && comp.rentPSF != null
                          ? comp.rentPSF > avgRentPSF
                          : false;
                      return (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {comp.name ? comp.name : <MissingValue>Unknown Property</MissingValue>}
                          </span>
                          <div className="flex items-center space-x-2">
                            {comp.rentPSF != null ? (
                              <>
                                <span className="text-sm font-medium text-gray-800">
                                  ${formatFixed(comp.rentPSF, 2)}/SF
                                </span>
                                {avgRentPSF != null && (
                                  <Badge variant={isAboveAvg ? "default" : "secondary"}>
                                    {isAboveAvg ? "Above" : "Below"} Avg
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <MissingValue>N/A</MissingValue>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    <MissingValue>No comparable data available</MissingValue>
                  </p>
                )}
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-800">Market Average</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {avgRentPSF != null ? `$${formatFixed(avgRentPSF, 2)}` : <MissingValue>N/A</MissingValue>}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Investment Metrics</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Cap Rate Analysis</h4>
                {comparableDetails.length > 0 ? (
                  <div className="space-y-3">
                    {comparableDetails.map((comp: typeof comparableDetails[number], index: number) => {
                      const isBelowAvg =
                        avgCapRate != null && comp.lastSale.capRate != null
                          ? comp.lastSale.capRate < avgCapRate
                          : false;
                      return (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {comp.name ? comp.name : <MissingValue>Unknown Property</MissingValue>}
                          </span>
                          <div className="flex items-center space-x-2">
                            {comp.lastSale.capRate != null ? (
                              <>
                                <span className="text-sm font-medium text-gray-800">
                                  {formatFixed(comp.lastSale.capRate, 2)}%
                                </span>
                                {avgCapRate != null && (
                                  <Badge variant={isBelowAvg ? "default" : "secondary"}>
                                    {isBelowAvg ? "Lower" : "Higher"} Risk
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <MissingValue>N/A</MissingValue>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    <MissingValue>No comparable data available</MissingValue>
                  </p>
                )}
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-800">Market Average</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {avgCapRate != null ? `${formatFixed(avgCapRate, 1)}%` : <MissingValue>N/A</MissingValue>}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Competitive Analysis */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">Competitive Positioning</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Market Position</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Rent Premium</span>
                  <Badge className="bg-green-100 text-green-800">
                    <MissingValue>Not specified</MissingValue>
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Quality Tier</span>
                  <Badge variant="outline" className="border-gray-200">
                    <MissingValue>Not specified</MissingValue>
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Competition Level</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    <MissingValue>Not specified</MissingValue>
                  </Badge>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Differentiators</h4>
              {substantialComp ? (
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">•</span>
                    <span>{substantialComp}</span>
                  </li>
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  <MissingValue>No differentiators specified</MissingValue>
                </p>
              )}
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">
                {submarketName ? `${submarketName} Market Trends` : 'Market Trends'}
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Demand Trend</span>
                  <Badge className="bg-green-100 text-green-800">
                    <MissingValue>Not specified</MissingValue>
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Supply Pipeline</span>
                  <Badge className="bg-green-100 text-green-800">
                    {supplyPipeline != null 
                      ? `<${formatLocale(Math.round(supplyPipeline / 1000))}K units (24mo)`
                      : <MissingValue>Not specified</MissingValue>}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Rent Growth</span>
                  <Badge className="bg-green-100 text-green-800">
                    {projGrowth202429 != null 
                      ? `+${formatFixed(projGrowth202429, 1)}% (5yr)`
                      : <MissingValue>Not specified</MissingValue>}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 