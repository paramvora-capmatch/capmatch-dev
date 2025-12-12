'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, MapPin, BarChart3 } from 'lucide-react';
import PopulationHeatmap from '@/components/om/PopulationHeatmap';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';
import { formatLocale, formatCurrency, parseNumeric } from '@/lib/om-utils';

export default function DemographicsPage() {
  const { content, insights } = useOmContent();
  
  type RadiusData = {
    population: number | null;
    medianIncome: number | null;
    medianAge: number | null;
  };

  // Read from flat fields
  const population1Mi = parseNumeric(content?.population1Mi) ?? null;
  const population3Mi = parseNumeric(content?.population3Mi) ?? null;
  const population5Mi = parseNumeric(content?.population5Mi) ?? null;
  const medianIncome1Mi = parseNumeric(content?.medianIncome1Mi) ?? null;
  const medianHHIncome = parseNumeric(content?.medianHHIncome) ?? null;
  const medianIncome5Mi = parseNumeric(content?.medianIncome5Mi) ?? null;
  const medianAge1Mi = parseNumeric(content?.medianAge1Mi) ?? null;
  const medianAge3Mi = parseNumeric(content?.medianAge3Mi) ?? null;
  const medianAge5Mi = parseNumeric(content?.medianAge5Mi) ?? null;
  const incomeGrowth5yr = content?.incomeGrowth5yr ?? null;
  const jobGrowth5yr = content?.jobGrowth5yr ?? null;
  const populationGrowth5yr = content?.projGrowth202429 ?? null; // Use projGrowth202429 as fallback
  const renterShare = content?.renterShare ?? null;
  const bachelorsShare = content?.bachelorsShare ?? null;
  
  // Build radius data objects for compatibility with existing UI code
  const oneMile: RadiusData = {
    population: population1Mi,
    medianIncome: medianIncome1Mi,
    medianAge: medianAge1Mi
  };
  const threeMile: RadiusData = {
    population: population3Mi,
    medianIncome: medianHHIncome,
    medianAge: medianAge3Mi
  };
  const fiveMile: RadiusData = {
    population: population5Mi,
    medianIncome: medianIncome5Mi,
    medianAge: medianAge5Mi
  };
  
  // Build radius entries for Population Analysis section
  const radiusEntries = (
    [
      ['oneMile', oneMile],
      ['threeMile', threeMile],
      ['fiveMile', fiveMile],
    ] as const satisfies ReadonlyArray<readonly [string, RadiusData]>
  ).filter(
    ([_, data]) =>
      data.population != null ||
      data.medianIncome != null ||
      data.medianAge != null
  );

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
  const infrastructureCatalyst = content?.infrastructureCatalyst ?? null;
  const broadbandSpeed = content?.broadbandSpeed ?? null;
  const crimeRiskLevel = content?.crimeRiskLevel ?? null;

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
              <Badge className={getGrowthColor(populationGrowth5yr ? `${populationGrowth5yr}%` : null)}>
                {populationGrowth5yr != null ? `${populationGrowth5yr}%` : null}
              </Badge>
              <p className="text-sm text-gray-600 mt-2">5-year increase</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-10 w-10 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Income Growth</h4>
              <Badge className={getGrowthColor(incomeGrowth5yr ? `${incomeGrowth5yr}%` : null)}>
                {incomeGrowth5yr != null ? `${incomeGrowth5yr}%` : null}
              </Badge>
              <p className="text-sm text-gray-600 mt-2">5-year increase</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-10 w-10 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Job Growth</h4>
              <Badge className={getGrowthColor(jobGrowth5yr ? `${jobGrowth5yr}%` : null)}>
                {jobGrowth5yr != null ? `${jobGrowth5yr}%` : null}
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
                      {formatLocale(data.population) ?? null}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white bg-opacity-60 rounded p-2">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">Median Income</p>
                      <p className="font-semibold text-gray-800">
                        {formatCurrency(data.medianIncome) ?? null}
                      </p>
                      </div>
                      <div className="bg-white bg-opacity-60 rounded p-2">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">Median Age</p>
                      <p className="font-semibold text-gray-800">
                        {data.medianAge ?? null} years
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
                      {formatCurrency(data.medianIncome)}
                    </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-3 rounded-full bg-gradient-to-r ${color} shadow-sm`}
                      style={{
                        width: `${(data.medianIncome ?? 0) / 100000 * 100}%`,
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
                  Strong population growth ({populationGrowth5yr != null ? `${populationGrowth5yr}%` : null} 5-year)
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  High median income ({formatCurrency(medianIncome1Mi) ?? null} within 1-mile)
                </li>
                {insights?.demographicStrength1 && (
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">•</span>
                    {insights.demographicStrength1}
                  </li>
                )}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Market Opportunities</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {['demographicOpportunity1', 'demographicOpportunity2', 'demographicOpportunity3'].map((field) => {
                  const insight = insights?.[field];
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
                {['targetDemographic1', 'targetDemographic2', 'targetDemographic3'].map((field) => {
                  const insight = insights?.[field];
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