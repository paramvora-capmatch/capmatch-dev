'use client';

import { assetProfileDetails } from '@/services/mockOMData';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2, DollarSign, BarChart3 } from 'lucide-react';

export default function ComparablesPage() {
  const getDistanceColor = (distance: string) => {
    const dist = parseFloat(distance);
    if (dist <= 0.5) return 'bg-green-100 text-green-800';
    if (dist <= 1.0) return 'bg-blue-100 text-blue-800';
    if (dist <= 2.0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getOccupancyColor = (occupancy: string) => {
    const occ = parseFloat(occupancy);
    if (occ >= 95) return 'bg-green-100 text-green-800';
    if (occ >= 90) return 'bg-blue-100 text-blue-800';
    if (occ >= 85) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getCapRateColor = (capRate: string) => {
    const cap = parseFloat(capRate);
    if (cap <= 4.5) return 'bg-green-100 text-green-800';
    if (cap <= 5.5) return 'bg-blue-100 text-blue-800';
    if (cap <= 6.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const avgRentPSF = assetProfileDetails.comparableDetails.reduce(
    (sum, comp) => sum + parseFloat(comp.avgRent.replace(/[^\d.]/g, '')), 
    0
  ) / assetProfileDetails.comparableDetails.length;

  const avgCapRate = assetProfileDetails.comparableDetails.reduce(
    (sum, comp) => sum + parseFloat(comp.lastSale.capRate.replace(/[^\d.]/g, '')), 
    0
  ) / assetProfileDetails.comparableDetails.length;

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Comparable Properties</h1>
        <p className="text-gray-600 mt-2">Market analysis and competitive positioning</p>
      </div>

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
            <p className="text-3xl font-bold text-blue-600">{assetProfileDetails.comparableDetails.length}</p>
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
            <p className="text-3xl font-bold text-green-600">${avgRentPSF.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">Market average</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 text-purple-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Avg Cap Rate</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{avgCapRate.toFixed(1)}%</p>
            <p className="text-sm text-gray-500 mt-1">Market average</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-semibold text-gray-800">Avg Distance</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              {(assetProfileDetails.comparableDetails.reduce((sum, comp) => sum + parseFloat(comp.distance.replace(/[^\d.]/g, '')), 0) / assetProfileDetails.comparableDetails.length).toFixed(1)} mi
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
                {assetProfileDetails.comparableDetails.map((comp, index) => (
                  <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-800">{comp.name}</p>
                        <p className="text-sm text-gray-500">{comp.address}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={getDistanceColor(comp.distance)}>
                        <MapPin className="h-3 w-3 mr-1" />
                        {comp.distance}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-gray-800">{comp.yearBuilt}</td>
                    <td className="py-4 px-4 text-gray-800">{comp.units}</td>
                    <td className="py-4 px-4">
                      <Badge className={getOccupancyColor(comp.occupancy)}>
                        {comp.occupancy}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-gray-800">{comp.avgRent}</td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-sm text-gray-800">{comp.lastSale.date}</p>
                        <p className="text-xs text-gray-500">{comp.lastSale.price}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={getCapRateColor(comp.lastSale.capRate)}>
                        {comp.lastSale.capRate}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                <div className="space-y-3">
                  {assetProfileDetails.comparableDetails.map((comp, index) => {
                    const rentPSF = parseFloat(comp.avgRent.replace(/[^\d.]/g, ''));
                    const isAboveAvg = rentPSF > avgRentPSF;
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{comp.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-800">{comp.avgRent}</span>
                          <Badge variant={isAboveAvg ? "default" : "secondary"}>
                            {isAboveAvg ? "Above" : "Below"} Avg
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-800">Market Average</span>
                  <Badge className="bg-blue-100 text-blue-800">${avgRentPSF.toFixed(2)}</Badge>
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
                <div className="space-y-3">
                  {assetProfileDetails.comparableDetails.map((comp, index) => {
                    const capRate = parseFloat(comp.lastSale.capRate.replace(/[^\d.]/g, ''));
                    const isBelowAvg = capRate < avgCapRate;
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{comp.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-800">{comp.lastSale.capRate}</span>
                          <Badge variant={isBelowAvg ? "default" : "secondary"}>
                            {isBelowAvg ? "Lower" : "Higher"} Risk
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-800">Market Average</span>
                  <Badge className="bg-purple-100 text-blue-800">{avgCapRate.toFixed(1)}%</Badge>
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
                  <Badge className="bg-green-100 text-green-800">+15%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Quality Tier</span>
                  <Badge variant="outline" className="border-gray-200">Luxury</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Competition Level</span>
                  <Badge className="bg-blue-100 text-blue-800">Moderate</Badge>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Differentiators</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  Workforce housing with PFC tax exemption
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  Pre-leased Innovation Center (30,000 SF)
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  Adjacent to Farmers Market and Deep Ellum
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Downtown Dallas Market Trends</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Demand Trend</span>
                  <Badge className="bg-green-100 text-green-800">↑ Growing</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Supply Pipeline</span>
                  <Badge className="bg-yellow-100 text-yellow-800">{'<'}6K units (24mo)</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Rent Growth</span>
                  <Badge className="bg-green-100 text-green-800">+6.9% (5yr)</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 