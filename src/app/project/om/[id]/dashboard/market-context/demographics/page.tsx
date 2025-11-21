'use client';

import { marketContextDetails } from '@/services/mockOMData';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, MapPin, BarChart3 } from 'lucide-react';
import PopulationHeatmap from '@/components/om/PopulationHeatmap';

export default function DemographicsPage() {
  const getGrowthColor = (growth: string) => {
    const growthNum = parseFloat(growth);
    if (growthNum >= 15) return 'bg-green-100 text-green-800';
    if (growthNum >= 10) return 'bg-blue-100 text-blue-800';
    if (growthNum >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getIncomeTier = (income: number) => {
    if (income >= 80000) return 'bg-green-100 text-green-800';
    if (income >= 60000) return 'bg-blue-100 text-blue-800';
    if (income >= 40000) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Demographics</h1>
        <p className="text-gray-600 mt-2">Comprehensive demographic analysis and population trends</p>
      </div>

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
              {marketContextDetails.demographicProfile.oneMile.population.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">Population</p>
            <div className="mt-2">
              <Badge className={getIncomeTier(marketContextDetails.demographicProfile.oneMile.medianIncome)}>
                ${marketContextDetails.demographicProfile.oneMile.medianIncome.toLocaleString()}
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
              {marketContextDetails.demographicProfile.threeMile.population.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">Population</p>
            <div className="mt-2">
              <Badge className={getIncomeTier(marketContextDetails.demographicProfile.threeMile.medianIncome)}>
                ${marketContextDetails.demographicProfile.threeMile.medianIncome.toLocaleString()}
              </Badge>
              <p className="text-xs text-gray-500 mt-1">Median Income</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-purple-500 mr-2" />
              <h4 className="text-lg font-semibold text-gray-800">5 Mile Radius</h4>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">
              {marketContextDetails.demographicProfile.fiveMile.population.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">Population</p>
            <div className="mt-2">
              <Badge className={getIncomeTier(marketContextDetails.demographicProfile.fiveMile.medianIncome)}>
                ${marketContextDetails.demographicProfile.fiveMile.medianIncome.toLocaleString()}
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
              <Badge className={getGrowthColor(marketContextDetails.demographicProfile.growthTrends.populationGrowth5yr)}>
                {marketContextDetails.demographicProfile.growthTrends.populationGrowth5yr}
              </Badge>
              <p className="text-sm text-gray-600 mt-2">5-year increase</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-10 w-10 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Income Growth</h4>
              <Badge className={getGrowthColor(marketContextDetails.demographicProfile.growthTrends.incomeGrowth5yr)}>
                {marketContextDetails.demographicProfile.growthTrends.incomeGrowth5yr}
              </Badge>
              <p className="text-sm text-gray-600 mt-2">5-year increase</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-10 w-10 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Job Growth</h4>
              <Badge className={getGrowthColor(marketContextDetails.demographicProfile.growthTrends.jobGrowth5yr)}>
                {marketContextDetails.demographicProfile.growthTrends.jobGrowth5yr}
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
              {Object.entries(marketContextDetails.demographicProfile).filter(([key]) => !['growthTrends', 'renterShare', 'bachelorsShare'].includes(key)).map(([radius, data], index) => {
                const colors = [
                  'bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500',
                  'bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500',
                  'bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500'
                ];
                const color = colors[index % colors.length];
                
                return (
                  <div key={radius} className={`${color} rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-800 capitalize">
                        {radius.replace(/([A-Z])/g, ' $1').trim()} Radius
                      </h4>
                      <Badge variant="outline" className="border-gray-200 bg-white">
                      {(data as Record<string, number>).population.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-white bg-opacity-60 rounded p-2">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">Median Income</p>
                      <p className="font-semibold text-gray-800">${(data as Record<string, number>).medianIncome.toLocaleString()}</p>
                      </div>
                      <div className="bg-white bg-opacity-60 rounded p-2">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">Median Age</p>
                      <p className="font-semibold text-gray-800">{(data as Record<string, number>).medianAge} years</p>
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
              {Object.entries(marketContextDetails.demographicProfile).filter(([key]) => !['growthTrends', 'renterShare', 'bachelorsShare'].includes(key)).map(([radius, data], index) => {
                const colors = [
                  'from-blue-400 to-blue-600',
                  'from-green-400 to-green-600',
                  'from-purple-400 to-purple-600'
                ];
                const color = colors[index % colors.length];
                
                return (
                  <div key={radius} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {radius.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    <span className="text-sm text-gray-500">${(data as Record<string, number>).medianIncome.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-3 rounded-full bg-gradient-to-r ${color} shadow-sm`}
                      style={{ width: `${((data as Record<string, number>).medianIncome / 100000) * 100}%` }}
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
                  Strong population growth ({marketContextDetails.demographicProfile.growthTrends.populationGrowth5yr} 5-year)
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  High median income (${marketContextDetails.demographicProfile.oneMile.medianIncome.toLocaleString()} within 1-mile)
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  Young professional demographic
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Market Opportunities</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  Growing tech employment base
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  Rising disposable income
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  Limited luxury housing supply
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Target Demographics</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-purple-500 mr-2">•</span>
                  Young professionals (25-35)
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-2">•</span>
                  Dual-income households
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-2">•</span>
                  Tech and finance workers
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

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