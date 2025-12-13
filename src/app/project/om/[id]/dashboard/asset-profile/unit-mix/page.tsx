'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, DollarSign, Users } from 'lucide-react';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';
import { formatLocale, formatFixed, parseNumeric } from '@/lib/om-utils';

// Component to show missing values in red
const MissingValue = ({ children }: { children: React.ReactNode }) => (
  <span className="text-red-600 font-medium">{children}</span>
);

type UnitMixUnit = {
  count?: number | null;
  avgSF?: number | null;
  monthlyRent?: number | null;
  deposit?: string | null;
};

export default function UnitMixPage() {
  const { content, insights } = useOmContent();
  
  // Extract flat schema fields
  const totalResidentialUnits = parseNumeric(content?.totalResidentialUnits) ?? null;
  const totalResidentialNRSF = parseNumeric(content?.totalResidentialNRSF) ?? null;
  const averageUnitSize = parseNumeric(content?.averageUnitSize) ?? null;
  
  // Access flat residentialUnitMix array directly
  const residentialUnitMix = Array.isArray(content?.residentialUnitMix) ? content.residentialUnitMix : [];
  
  // Transform flat array to unit mix details structure for UI
  const unitMixDetails: Record<string, UnitMixUnit> = {};
  residentialUnitMix.forEach((unit: any) => {
    const unitType = unit.unitType || unit.type || 'unknown';
    unitMixDetails[unitType] = {
      count: unit.unitCount || unit.units || null,
      avgSF: unit.avgSF || unit.averageUnitSize || null,
      monthlyRent: unit.monthlyRent ? parseNumeric(unit.monthlyRent) : null,
      deposit: null, // Not in seed script
    };
  });
  
  const unitEntries = Object.entries(unitMixDetails) as [string, UnitMixUnit][];
  const calculatedTotalUnits = unitEntries.reduce(
    (sum: number, [, unit]: [string, UnitMixUnit]) => sum + (unit.count ?? 0),
    0
  );
  const totalUnits = totalResidentialUnits ?? (calculatedTotalUnits > 0 ? calculatedTotalUnits : null);

  const calculatedTotalRentableSF = unitEntries.reduce(
    (sum: number, [, unit]: [string, UnitMixUnit]) => sum + ((unit.count ?? 0) * (unit.avgSF ?? 0)),
    0
  );
  const totalRentableSF = totalResidentialNRSF ?? (calculatedTotalRentableSF > 0 ? calculatedTotalRentableSF : null);

  // Calculate blended average rent from monthlyRent values
  const blendedAverageRent =
    totalUnits != null && totalUnits > 0
      ? unitEntries.reduce((sum: number, [, unit]: [string, UnitMixUnit]) => {
          const rent = unit.monthlyRent ?? 0;
          return sum + rent * (unit.count ?? 0);
        }, 0) / totalUnits
      : null;
  const blendedAverageRentDisplay =
    blendedAverageRent != null ? Math.round(blendedAverageRent) : null;
  
  const avgSF = averageUnitSize ?? (totalUnits != null && totalUnits > 0 && totalRentableSF != null
    ? Math.round(totalRentableSF / totalUnits)
    : null);

  const getUnitTypeColor = (type: string) => {
    // Color based on unit type code (S = Studio, A = 1 Bed, B = 2 Bed)
    if (type.startsWith('S')) return '#3b82f6'; // blue-500
    if (type.startsWith('A')) return '#10b981'; // green-500
    if (type.startsWith('B')) return '#a855f7'; // purple-500
    return '#6b7280'; // gray-500
  };

  const getUnitTypeColorClass = (type: string) => {
    // Tailwind class for badges and other non-SVG elements
    if (type.startsWith('S')) return 'bg-blue-500';
    if (type.startsWith('A')) return 'bg-green-500';
    if (type.startsWith('B')) return 'bg-purple-500';
    return 'bg-gray-500';
  };

  const getUnitTypeLabel = (type: string) => {
    // Map unit type codes to labels
    if (type.startsWith('S')) {
      return type === 'S1' || type === 'S2' || type === 'S3' ? `Studio ${type.slice(1)}` : 'Studio';
    }
    if (type.startsWith('A')) {
      return type === 'A1' || type === 'A2' || type === 'A3' ? `1 Bed ${type.slice(1)}` : '1 Bedroom';
    }
    if (type.startsWith('B')) {
      return type === 'B1' || type === 'B2' ? `2 Bed ${type.slice(1)}` : '2 Bedroom';
    }
    return type;
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
      percentage: Math.round(percentage * 10000) / 100, // Round to 2 decimal places
      startAngle,
      endAngle
    };
  };

  let currentAngle = 0;
  // Use residentialUnitMix array for detailed unit mix
  const detailedUnitMix = residentialUnitMix.map((unit: any) => ({
    code: unit.unitType || unit.type || '',
    type: unit.unitType || unit.type || '',
    units: unit.unitCount || unit.units || 0,
    avgSF: unit.avgSF || unit.averageUnitSize || 0,
  }));
  const pieSegments =
    totalUnits != null && totalUnits > 0
      ? unitEntries.map(([type, unit]: [string, UnitMixUnit]) => {
          const segment = calculatePieChartSegment(unit.count ?? 0, totalUnits, currentAngle);
          currentAngle += ((unit.count ?? 0) / totalUnits) * 360;
          return { type, unit, ...segment };
        })
      : [];

  useOMPageHeader({
    subtitle: "Distribution of unit types, sizes, rents, and pricing insights.",
  });

  return (
    <div className="space-y-6">

      {/* Unit Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2" dataSourceFields={['total residential units']}>
            <div className="flex items-center">
              <Home className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Total Units</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {totalUnits != null ? totalUnits : <MissingValue>Not available</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">Residential units</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2" dataSourceFields={['total residential nrsf']}>
            <div className="flex items-center">
              <Users className="h-5 w-5 text-green-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Total SF</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {totalRentableSF != null 
                ? formatLocale(totalRentableSF) 
                : <MissingValue>Not available</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">Rentable square feet</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Avg Rent</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {blendedAverageRentDisplay != null
                ? `$${formatLocale(blendedAverageRentDisplay)}`
                : <MissingValue>Not available</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">Per unit average</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-semibold text-gray-800">Avg SF</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {avgSF != null ? `${formatLocale(avgSF)} SF` : <MissingValue>Not available</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">Per unit average</p>
          </CardContent>
        </Card>
      </div>

      {/* Unit Mix Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Unit Breakdown Table */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader dataSourceSection="unit mix">
            <h3 className="text-xl font-semibold text-gray-800">Unit Breakdown</h3>
          </CardHeader>
          <CardContent>
            {unitEntries.length > 0 ? (
              <div className="space-y-4">
                {unitEntries.map(([type, unit]: [string, UnitMixUnit]) => (
                  <div key={type} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-800">{getUnitTypeLabel(type)}</h4>
                      <Badge className={getUnitTypeColorClass(type)}>
                        {unit.count != null ? `${unit.count} units` : <MissingValue>Count N/A</MissingValue>}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Average SF</p>
                        <p className="font-medium text-gray-800">
                          {unit.avgSF != null ? `${formatLocale(unit.avgSF)} SF` : <MissingValue>Not available</MissingValue>}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Monthly Rent</p>
                        <p className="font-medium text-gray-800">
                          {unit.monthlyRent != null ? `$${formatLocale(unit.monthlyRent)}` : <MissingValue>Not available</MissingValue>}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Deposit</p>
                        <p className="font-medium text-gray-800">
                          {unit.deposit ? unit.deposit : <MissingValue>Not specified</MissingValue>}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Percentage</p>
                        <p className="font-medium text-gray-800">
                          {totalUnits != null && totalUnits > 0 && unit.count != null
                            ? `${formatFixed(((unit.count / totalUnits) * 100), 2)}%`
                            : <MissingValue>N/A</MissingValue>}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                <MissingValue>No unit mix data available</MissingValue>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Unit Distribution</h3>
          </CardHeader>
          <CardContent>
            {pieSegments.length > 0 ? (
              <>
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
                          className={`w-3 h-3 rounded-full mr-2 ${getUnitTypeColorClass(segment.type)}`}
                        />
                        <span className="text-sm font-medium text-gray-800">{getUnitTypeLabel(segment.type)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-gray-800">{formatFixed(segment.percentage, 2)}%</span>
                        <span className="text-xs text-gray-500 ml-1">
                          ({(segment.unit as UnitMixUnit).count != null ? `${(segment.unit as UnitMixUnit).count} units` : <MissingValue>N/A</MissingValue>})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-center py-8">
                <MissingValue>No unit distribution data available</MissingValue>
              </p>
            )}
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
              {unitEntries.length > 0 ? (
                <div className="space-y-2">
                  {unitEntries.map(([type, unit]: [string, UnitMixUnit]) => {
                    const rentPSF = unit.monthlyRent != null && unit.avgSF != null && unit.avgSF > 0
                      ? unit.monthlyRent / unit.avgSF
                      : null;
                    return (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{getUnitTypeLabel(type)}</span>
                        <Badge variant="outline" className="border-gray-200">
                          {rentPSF != null ? `$${formatFixed(rentPSF, 2)}/SF` : <MissingValue>N/A</MissingValue>}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  <MissingValue>No unit data available</MissingValue>
                </p>
              )}
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Deposit Requirements</h4>
              {unitEntries.length > 0 ? (
                <div className="space-y-2">
                  {unitEntries.map(([type, unit]: [string, UnitMixUnit]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{getUnitTypeLabel(type)}</span>
                      <Badge variant="outline" className="border-gray-200">
                        {unit.deposit ? unit.deposit : <MissingValue>Not specified</MissingValue>}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  <MissingValue>No unit data available</MissingValue>
                </p>
              )}
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Market Positioning</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Luxury Tier</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {content?.luxuryTier ?? null}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Target Market</span>
                  <Badge variant="outline" className="border-gray-200">
                    {content?.targetMarket ?? null}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Competitive Position</span>
                  <Badge className="bg-green-100 text-green-800">
                    {content?.competitivePosition ?? null}
                  </Badge>
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
          {content?.unitPlanDescription ? (
            <p className="text-sm text-gray-600">{content.unitPlanDescription}</p>
          ) : null}
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
                {detailedUnitMix.map((plan: { code?: string | null; type?: string | null; units?: number | null; avgSF?: number | null }, index: number) => (
                  <tr key={plan.code || `plan-${index}`} className="border-b border-gray-50">
                    <td className="py-3 px-2 font-medium text-gray-800">
                      {plan.code ? plan.code : <MissingValue>N/A</MissingValue>}
                    </td>
                    <td className="py-3 px-2 text-gray-600">
                      {plan.type ? plan.type : <MissingValue>N/A</MissingValue>}
                    </td>
                    <td className="py-3 px-2 text-gray-600">
                      {plan.units != null ? plan.units : <MissingValue>N/A</MissingValue>}
                    </td>
                    <td className="py-3 px-2 text-gray-600">
                      {plan.avgSF != null ? `${formatLocale(plan.avgSF)} SF` : <MissingValue>N/A</MissingValue>}
                    </td>
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