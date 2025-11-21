'use client';

import { marketContextDetails } from '@/services/mockOMData';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, MapPin, Users } from 'lucide-react';
import EmploymentMap from '@/components/om/EmploymentMap';

export default function EmploymentPage() {
  const getGrowthColor = (growth: string) => {
    const growthNum = parseInt(growth.replace(/[^\d-]/g, ''));
    if (growthNum >= 10) return 'bg-green-100 text-green-800';
    if (growthNum >= 5) return 'bg-blue-100 text-blue-800';
    if (growthNum >= 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getDistanceColor = (distance: string) => {
    const dist = parseFloat(distance);
    if (dist <= 1.5) return 'bg-green-100 text-green-800';
    if (dist <= 3.0) return 'bg-blue-100 text-blue-800';
    if (dist <= 5.0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getEmployeeSizeColor = (employees: number) => {
    if (employees >= 10000) return 'bg-purple-100 text-purple-800';
    if (employees >= 5000) return 'bg-blue-100 text-blue-800';
    if (employees >= 2000) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const totalEmployees = marketContextDetails.majorEmployers.reduce(
    (sum, employer) => sum + employer.employees, 
    0
  );

  const avgGrowth = marketContextDetails.majorEmployers.reduce(
    (sum, employer) => sum + parseInt(employer.growth.replace(/[^\d-]/g, '')), 
    0
  ) / marketContextDetails.majorEmployers.length;

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Employment</h1>
        <p className="text-gray-600 mt-2">Major employers and job market analysis</p>
      </div>

      {/* Employment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Building2 className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Major Employers</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{marketContextDetails.majorEmployers.length}</p>
            <p className="text-sm text-gray-500 mt-1">Companies analyzed</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-green-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Total Jobs</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{totalEmployees.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Direct employment</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-purple-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Avg Growth</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">+{avgGrowth.toFixed(1)}%</p>
            <p className="text-sm text-gray-500 mt-1">Annual average</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-semibold text-gray-800">Avg Distance</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              {(marketContextDetails.majorEmployers.reduce((sum, employer) => sum + parseFloat(employer.distance.replace(/[^\d.]/g, '')), 0) / marketContextDetails.majorEmployers.length).toFixed(1)} mi
            </p>
            <p className="text-sm text-gray-500 mt-1">From project site</p>
          </CardContent>
        </Card>
      </div>

      {/* Major Employers Table */}
      <Card className="hover:shadow-lg transition-shadow mb-8">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">Major Employers Analysis</h3>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">Company</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">Employees</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">Growth</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">Distance</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">Market Impact</th>
                </tr>
              </thead>
              <tbody>
                {marketContextDetails.majorEmployers.map((employer, index) => (
                  <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-800">{employer.name}</p>
                        <p className="text-sm text-gray-500">{employer.employees.toLocaleString()} employees</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={getEmployeeSizeColor(employer.employees)}>
                        {employer.employees.toLocaleString()}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={getGrowthColor(employer.growth)}>
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {employer.growth}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={getDistanceColor(employer.distance)}>
                        <MapPin className="h-3 w-3 mr-1" />
                        {employer.distance}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        {employer.employees >= 10000 ? (
                          <Badge className="bg-purple-100 text-purple-800">Major</Badge>
                        ) : employer.employees >= 5000 ? (
                          <Badge className="bg-blue-100 text-blue-800">Significant</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">Moderate</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Employment Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Employment Distribution</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {marketContextDetails.majorEmployers.map((employer, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{employer.name}</span>
                    <span className="text-sm text-gray-500">{employer.employees.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${(employer.employees / totalEmployees) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-800">Total Employment</span>
                  <Badge className="bg-blue-100 text-blue-800">{totalEmployees.toLocaleString()}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Growth Analysis</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {marketContextDetails.majorEmployers.map((employer, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{employer.name}</p>
                    <p className="text-sm text-gray-500">{employer.employees.toLocaleString()} employees</p>
                  </div>
                  <div className="text-right">
                    <Badge className={getGrowthColor(employer.growth)}>
                      {employer.growth}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">Annual growth</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Impact Analysis */}
      <Card className="hover:shadow-lg transition-shadow mb-8">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">Market Impact Analysis</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Employment Strengths</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  Strong tech sector presence
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  Healthcare employment stability
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  Financial services growth
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Market Opportunities</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  High-income tech workers
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  Growing employment base
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  Proximity to major employers
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Target Market</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-purple-500 mr-2">•</span>
                  Tech professionals
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-2">•</span>
                  Healthcare workers
                </li>
                <li className="flex items-center">
                  <span className="text-purple-500 mr-2">•</span>
                  Finance professionals
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Employment Map */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">Interactive Employment Map</h3>
          <p className="text-sm text-gray-600">Click on employers to view detailed information</p>
        </CardHeader>
        <CardContent>
          <EmploymentMap />
        </CardContent>
      </Card>
    </div>
  );
} 