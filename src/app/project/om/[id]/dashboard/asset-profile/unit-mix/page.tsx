'use client';

import { assetProfileDetails } from '@/services/mockOMData';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, DollarSign, Users } from 'lucide-react';

export default function UnitMixPage() {
  const totalUnits = Object.values(assetProfileDetails.unitMixDetails).reduce(
    (sum, unit) => sum + unit.count, 
    0
  );

  const totalRentableSF = Object.values(assetProfileDetails.unitMixDetails).reduce(
    (sum, unit) => sum + (unit.count * unit.avgSF), 
    0
  );

  const blendedAverageRent = Object.values(assetProfileDetails.unitMixDetails).reduce((sum, unit) => {
    const [low, high] = unit.rentRange.split('-').map(r => parseFloat(r.replace(/[^\d.]/g, '')));
    const avg = (low + high) / 2;
    return sum + avg * unit.count;
  }, 0) / totalUnits;

  const getUnitTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      studios: 'bg-blue-500',
      oneBed: 'bg-green-500',
      twoBed: 'bg-purple-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const getUnitTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      studios: 'Studio',
      oneBed: '1 Bedroom',
      twoBed: '2 Bedroom',
    };
    return labels[type] || type;
  };

  const calculatePieChartSegment = (count: number, total: number, startAngle: number) => {
    const percentage = count / total;
    const angle = percentage * 360;
    const endAngle = startAngle + angle;
    
    const x1 = 50 + 40 * Math.cos(startAngle * Math.PI / 180);
    const y1 = 50 + 40 * Math.sin(startAngle * Math.PI / 180);
    const x2 = 50 + 40 * Math.cos(endAngle * Math.PI / 180);
    const y2 = 50 + 40 * Math.sin(endAngle * Math.PI / 180);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    return {
      path: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
      percentage: Math.round(percentage * 100),
      startAngle,
      endAngle
    };
  };

  let currentAngle = 0;
  const pieSegments = Object.entries(assetProfileDetails.unitMixDetails).map(([type, unit]) => {
    const segment = calculatePieChartSegment(unit.count, totalUnits, currentAngle);
    currentAngle += (unit.count / totalUnits) * 360;
    return { type, unit, ...segment };
  });

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Unit Mix</h1>
        <p className="text-gray-600 mt-2">Detailed breakdown of unit types, sizes, and pricing</p>
      </div>

      {/* Unit Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Home className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Total Units</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{totalUnits}</p>
            <p className="text-sm text-gray-500 mt-1">Residential units</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-green-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Total SF</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{totalRentableSF.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Rentable square feet</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-purple-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Avg Rent</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">
              ${Math.round(blendedAverageRent).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">Per unit average</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-semibold text-gray-800">Avg SF</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              {Math.round(totalRentableSF / totalUnits)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Per unit average</p>
          </CardContent>
        </Card>
      </div>

      {/* Unit Mix Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Unit Breakdown Table */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Unit Breakdown</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(assetProfileDetails.unitMixDetails).map(([type, unit]) => (
                <div key={type} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800">{getUnitTypeLabel(type)}</h4>
                    <Badge className={getUnitTypeColor(type).replace('bg-', 'bg-')}>
                      {unit.count} units
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Average SF</p>
                      <p className="font-medium text-gray-800">{unit.avgSF.toLocaleString()} SF</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Rent Range</p>
                      <p className="font-medium text-gray-800">{unit.rentRange}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Deposit</p>
                      <p className="font-medium text-gray-800">{unit.deposit}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Percentage</p>
                      <p className="font-medium text-gray-800">{Math.round((unit.count / totalUnits) * 100)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Unit Distribution</h3>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center mb-6">
              <svg width="200" height="200" viewBox="0 0 100 100" className="transform -rotate-90">
                {pieSegments.map((segment, index) => (
                  <path
                    key={index}
                    d={segment.path}
                    fill={getUnitTypeColor(segment.type)}
                    stroke="white"
                    strokeWidth="2"
                  />
                ))}
                <circle cx="50" cy="50" r="15" fill="white" />
              </svg>
            </div>
            
            <div className="space-y-3">
              {pieSegments.map((segment, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className={`w-3 h-3 rounded-full mr-2 ${getUnitTypeColor(segment.type)}`}
                    />
                    <span className="text-sm font-medium text-gray-800">{getUnitTypeLabel(segment.type)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-800">{segment.percentage}%</span>
                    <span className="text-xs text-gray-500 ml-1">({segment.unit.count} units)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Analysis */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">Pricing Analysis</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Rent per Square Foot</h4>
              <div className="space-y-2">
                {Object.entries(assetProfileDetails.unitMixDetails).map(([type, unit]) => {
                  const avgRent = unit.rentRange.split('-').map(r => parseFloat(r.replace(/[^\d]/g, ''))).reduce((a, b) => a + b) / 2;
                  const rentPSF = avgRent / unit.avgSF;
                  return (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{getUnitTypeLabel(type)}</span>
                      <Badge variant="outline" className="border-gray-200">${rentPSF.toFixed(2)}/SF</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Deposit Requirements</h4>
              <div className="space-y-2">
                {Object.entries(assetProfileDetails.unitMixDetails).map(([type, unit]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{getUnitTypeLabel(type)}</span>
                    <Badge variant="outline" className="border-gray-200">{unit.deposit}</Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Market Positioning</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Luxury Tier</span>
                  <Badge className="bg-purple-100 text-purple-800">Premium</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Target Market</span>
                  <Badge variant="outline" className="border-gray-200">Young Professionals</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Competitive Position</span>
                  <Badge className="bg-green-100 text-green-800">Top 20%</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Unit Plans */}
      <Card className="hover:shadow-lg transition-shadow mt-8">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">Detailed Unit Plans</h3>
          <p className="text-sm text-gray-600">Breakdown of S, A, and B series layouts from the Hoque OM</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="py-3 px-2 font-semibold text-gray-700">Plan</th>
                  <th className="py-3 px-2 font-semibold text-gray-700">Type</th>
                  <th className="py-3 px-2 font-semibold text-gray-700">Units</th>
                  <th className="py-3 px-2 font-semibold text-gray-700">Avg SF</th>
                </tr>
              </thead>
              <tbody>
                {assetProfileDetails.detailedUnitMix.map((plan) => (
                  <tr key={plan.code} className="border-b border-gray-50">
                    <td className="py-3 px-2 font-medium text-gray-800">{plan.code}</td>
                    <td className="py-3 px-2 text-gray-600">{plan.type}</td>
                    <td className="py-3 px-2 text-gray-600">{plan.units}</td>
                    <td className="py-3 px-2 text-gray-600">{plan.avgSF.toLocaleString()} SF</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 