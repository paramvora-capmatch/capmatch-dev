'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, MapPin, BarChart3 } from 'lucide-react';
import PopulationHeatmap from '@/components/om/PopulationHeatmap';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';
import { formatLocale, formatCurrency, parseNumeric, getOMValue } from '@/lib/om-utils';

export default function DemographicsPage() {
  const { content } = useOmContent();
  const marketContextDetails = content?.marketContextDetails ?? null;
  const demographicProfile = marketContextDetails?.demographicProfile ?? null;
  const oneMile = demographicProfile?.oneMile ?? null;
  const threeMile = demographicProfile?.threeMile ?? null;
  const fiveMile = demographicProfile?.fiveMile ?? null;
  const growthTrends = demographicProfile?.growthTrends ?? null;
  const radiusEntries = demographicProfile
    ? Object.entries(demographicProfile).filter(
        ([key]) =>
          !['growthTrends', 'renterShare', 'bachelorsShare'].includes(key)
      )
    : [];

  const getGrowthColor = (growth?: string | null) => {
    const growthNum = parseFloat(growth ?? '0');
    if (growthNum >= 15) return 'bg-green-100 text-green-800';
    if (growthNum >= 10) return 'bg-blue-100 text-blue-800';
    if (growthNum >= 5) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getIncomeTier = (income?: number | null) => {
    const incomeNum = income ?? 0;
    if (incomeNum >= 80000) return 'bg-green-100 text-green-800';
    if (incomeNum >= 60000) return 'bg-blue-100 text-blue-800';
    if (incomeNum >= 40000) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Extract location/connectivity fields
  const walkabilityScore = parseNumeric(content?.walkabilityScore) ?? null;
  const infrastructureCatalyst = getOMValue(content, "infrastructureCatalyst");
  const broadbandSpeed = getOMValue(content, "broadbandSpeed");
  const crimeRiskLevel = getOMValue(content, "crimeRiskLevel");

  useOMPageHeader({
    subtitle: "Population make-up, income bands, and growth across key radii.",
  });

  return (
    <div className="space-y-6">

      {/* Radius Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-blue-500 mr-2" />
              <h4 className="text-lg font-semibold text-gray-800">1 Mile Radius</h4>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {formatLocale(oneMile?.population) ?? null}
            </p>
            <p className="text-sm text-gray-500 mt-1">Population</p>
            <div className="mt-2">
              <Badge className={getIncomeTier(oneMile?.medianIncome)}>
                {formatCurrency(oneMile?.medianIncome) ?? null}
              </Badge>
              <p className="text-xs text-gray-500 mt-1">Median Income</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-green-500 mr-2" />
              <h4 className="text-lg font-semibold text-gray-800">3 Mile Radius</h4>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {formatLocale(threeMile?.population) ?? null}
            </p>
            <p className="text-sm text-gray-500 mt-1">Population</p>
            <div className="mt-2">
              <Badge className={getIncomeTier(threeMile?.medianIncome)}>
                {formatCurrency(threeMile?.medianIncome) ?? null}
              </Badge>
              <p className="text-xs text-gray-500 mt-1">Median Income</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-blue-500 mr-2" />
              <h4 className="text-lg font-semibold text-gray-800">5 Mile Radius</h4>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {formatLocale(fiveMile?.population) ?? null}
            </p>
            <p className="text-sm text-gray-500 mt-1">Population</p>
            <div className="mt-2">
              <Badge className={getIncomeTier(fiveMile?.medianIncome)}>
                {formatCurrency(fiveMile?.medianIncome) ?? null}
              </Badge>
              <p className="text-xs text-gray-500 mt-1">Median Income</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Growth Trends */}
      <Card className="hover:shadow-lg transition-shadow mb-8">
        <CardHeader>
          <h4 className="text-xl font-semibold text-gray-800">5-Year Growth Trends</h4>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-10 w-10 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Population Growth</h4>
              <Badge className={getGrowthColor(growthTrends?.populationGrowth5yr)}>
                {growthTrends?.populationGrowth5yr ?? null}
              </Badge>
              <p className="text-sm text-gray-600 mt-2">5-year increase</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-10 w-10 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Income Growth</h4>
              <Badge className={getGrowthColor(growthTrends?.incomeGrowth5yr)}>
                {growthTrends?.incomeGrowth5yr ?? null}
              </Badge>
              <p className="text-sm text-gray-600 mt-2">5-year increase</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-10 w-10 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Job Growth</h4>
              <Badge className={getGrowthColor(growthTrends?.jobGrowth5yr)}>
                {growthTrends?.jobGrowth5yr ?? null}
              </Badge>
              <p className="text-sm text-gray-600 mt-2">5-year increase</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h4 className="text-xl font-semibold text-gray-800">Population Analysis</h4>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {radiusEntries.map(([radius, data], index) => {
                const colors = [
                  'bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500',
                  'bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500',
                  'bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500'
                ];
                const color = colors[index % colors.length];
                
                return (
                  <div key={radius} className={`${color} rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-800 capitalize">
                        {radius.replace(/([A-Z])/g, ' $1').trim()} Radius
                      </h4>
                      <Badge variant="outline" className="border-gray-200 bg-white">
                      {formatLocale((data as Record<string, number | undefined>).population) ?? null}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white bg-opacity-60 rounded p-2">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">Median Income</p>
                      <p className="font-semibold text-gray-800">
                        {formatCurrency((data as Record<string, number | undefined>).medianIncome) ?? null}
                      </p>
                      </div>
                      <div className="bg-white bg-opacity-60 rounded p-2">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">Median Age</p>
                      <p className="font-semibold text-gray-800">
                        {(data as Record<string, number | undefined>).medianAge ?? null} years
                      </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h4 className="text-xl font-semibold text-gray-800">Income Distribution</h4>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {radiusEntries.map(([radius, data], index) => {
                const colors = [
                  'from-blue-400 to-blue-600',
                  'from-green-400 to-green-600',
                  'from-blue-400 to-blue-600'
                ];
                const color = colors[index % colors.length];
                
                return (
                  <div key={radius} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {radius.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    <span className="text-sm text-gray-500">
                      {formatCurrency((data as Record<string, number | undefined>).medianIncome)}
                    </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-3 rounded-full bg-gradient-to-r ${color} shadow-sm`}
                      style={{
                        width: `${((data as Record<string, number | undefined>).medianIncome ?? 0) / 100000 * 100}%`,
                      }}
                      />
                    </div>
                  </div>
                );
              })}
              
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">$40K</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">$60K</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">$80K</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">$100K+</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Insights */}
      <Card className="hover:shadow-lg transition-shadow mb-8">
        <CardHeader>
          <h4 className="text-xl font-semibold text-gray-800">Market Insights</h4>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Demographic Strengths</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  Strong population growth ({growthTrends?.populationGrowth5yr ?? null} 5-year)
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  High median income ({formatCurrency(oneMile?.medianIncome) ?? null} within 1-mile)
                </li>
                {getOMValue(content, 'demographicStrength1') && (
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">•</span>
                    {getOMValue(content, 'demographicStrength1') ?? 'Young professional demographic'}
                  </li>
                )}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Market Opportunities</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {['demographicOpportunity1', 'demographicOpportunity2', 'demographicOpportunity3'].map((field, idx) => {
                  const insight = getOMValue(content, field) ?? 
                    (idx === 0 ? 'Proximity to Downtown Dallas employers (AT&T, JP Morgan, Baylor Medical)' :
                     idx === 1 ? 'Walkability to Farmers Market and Deep Ellum entertainment district' :
                     'Limited new supply in Deep Ellum/Farmers Market corridor');
                  return insight ? (
                    <li key={field} className="flex items-center">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{insight}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Target Demographics</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {['targetDemographic1', 'targetDemographic2', 'targetDemographic3'].map((field, idx) => {
                  const insight = getOMValue(content, field) ?? 
                    (idx === 0 ? 'Downtown Dallas professionals (25-35)' :
                     idx === 1 ? 'Workforce housing eligible households (≤80% AMI)' :
                     'Healthcare, finance, and tech workers');
                  return insight ? (
                    <li key={field} className="flex items-center">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{insight}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location & Connectivity */}
      {(walkabilityScore != null || infrastructureCatalyst || broadbandSpeed || crimeRiskLevel) && (
        <Card className="hover:shadow-lg transition-shadow mb-8">
          <CardHeader>
            <h4 className="text-xl font-semibold text-gray-800">Location & Connectivity</h4>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {walkabilityScore != null && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Walkability Score</p>
                  <p className="text-2xl font-bold text-blue-900">{walkabilityScore}</p>
                  <p className="text-xs text-gray-600 mt-1">Out of 100</p>
                </div>
              )}
              {infrastructureCatalyst && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Infrastructure Catalyst</p>
                  <p className="text-sm font-semibold text-gray-800">{infrastructureCatalyst}</p>
                </div>
              )}
              {broadbandSpeed && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Broadband Speed</p>
                  <p className="text-sm font-semibold text-gray-800">{broadbandSpeed}</p>
                </div>
              )}
              {crimeRiskLevel && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Crime Risk Level</p>
                  <p className="text-sm font-semibold text-gray-800">{crimeRiskLevel}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interactive Population Heatmap */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <h4 className="text-xl font-semibold text-gray-800">Interactive Population Heatmap</h4>
          <p className="text-sm text-gray-600">Click on areas to view detailed demographic information</p>
        </CardHeader>
        <CardContent>
          <PopulationHeatmap />
        </CardContent>
      </Card>
    </div>
  );
} 