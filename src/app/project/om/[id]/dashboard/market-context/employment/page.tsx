'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, MapPin, Users } from 'lucide-react';
import EmploymentMap from '@/components/om/EmploymentMap';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';
import { parseNumeric, calculateAverage, formatLocale, formatFixed, getOMValue } from '@/lib/om-utils';

// Component to show missing values in red
const MissingValue = ({ children }: { children: React.ReactNode }) => (
  <span className="text-red-600 font-medium">{children}</span>
);

export default function EmploymentPage() {
  const { content, insights } = useOmContent();
  
  // Extract flat schema fields
  const unemploymentRate = parseNumeric(content?.unemploymentRate) ?? null;
  const jobGrowth = parseNumeric(content?.jobGrowth) ?? null;
  const largestEmployer = getOMValue(content, "largestEmployer");
  const employerConcentration = parseNumeric(content?.employerConcentration) ?? null;
  const distanceToEmployment = parseNumeric(content?.distanceToEmployment) ?? null;
  const totalJobs = parseNumeric(content?.totalJobs) ?? null;

  // Hardcoded major employers array (will be shown in red)
  const hardcodedEmployers = [
    { name: 'AT&T Discovery District', employees: 12000, growth: '+3.5%', distance: '0.4 mi' },
    { name: 'Baylor Medical Center', employees: 8500, growth: '+2.8%', distance: '0.6 mi' },
    { name: 'Dallas County Government', employees: 6200, growth: '+1.2%', distance: '0.8 mi' },
    { name: 'JP Morgan Chase', employees: 4500, growth: '+4.2%', distance: '1.2 mi' },
  ];

  // Use hardcoded employers for now (all will show in red), or use from content if available
  const majorEmployers = Array.isArray(content?.majorEmployers) && content.majorEmployers.length > 0 
    ? content.majorEmployers 
    : hardcodedEmployers;

  const getGrowthColor = (growth?: string | number | null) => {
    let growthNum: number;
    if (typeof growth === 'number') {
      growthNum = growth;
    } else if (typeof growth === 'string') {
      const value = growth.replace(/[^\d-]/g, '');
      growthNum = parseFloat(value);
    } else {
      growthNum = 0;
    }
    if (Number.isNaN(growthNum)) return 'bg-gray-100 text-gray-800';
    if (growthNum >= 10) return 'bg-green-100 text-green-800';
    if (growthNum >= 5) return 'bg-blue-100 text-blue-800';
    if (growthNum >= 0) return 'bg-green-100 text-green-800';
    return 'bg-red-100 text-red-800';
  };

  const getDistanceColor = (distance?: string | number | null) => {
    let dist: number;
    if (typeof distance === 'number') {
      dist = distance;
    } else if (typeof distance === 'string') {
      dist = parseFloat(distance.replace(/[^\d.]/g, ''));
    } else {
      dist = NaN;
    }
    if (Number.isNaN(dist)) return 'bg-gray-100 text-gray-800';
    if (dist <= 1.5) return 'bg-green-100 text-green-800';
    if (dist <= 3.0) return 'bg-blue-100 text-blue-800';
    if (dist <= 5.0) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getEmployeeSizeColor = (employees?: number | null) => {
    const value = employees ?? 0;
    if (value >= 10000) return 'bg-blue-100 text-blue-800';
    if (value >= 5000) return 'bg-blue-100 text-blue-800';
    if (value >= 2000) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const totalEmployees = majorEmployers.reduce(
    (sum: number, employer: { employees?: number | null }) => sum + (employer.employees ?? 0),
    0
  );

  const avgGrowth = calculateAverage(majorEmployers, (employer: typeof majorEmployers[0]) => {
    const growthValue = employer.growth ?? '0';
    const parsed = parseFloat(growthValue.replace(/[^\d-]/g, ''));
    return isNaN(parsed) ? null : parsed;
  });

  const avgDistance = calculateAverage(majorEmployers, (employer: typeof majorEmployers[0]) => {
    if (typeof employer.distance === 'number') return employer.distance;
    if (typeof employer.distance === 'string') {
      return parseNumeric(employer.distance.replace(/[^\d.]/g, ''));
    }
    return null;
  });

  useOMPageHeader({
    subtitle: "Job base composition, employer proximity, and growth trends.",
  });

  return (
    <div className="space-y-6">

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
            <p className="text-3xl font-bold text-blue-600">
              {majorEmployers.length > 0 ? majorEmployers.length : <MissingValue>4</MissingValue>}
            </p>
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
            <p className="text-3xl font-bold text-green-600">
              {totalJobs != null ? formatLocale(totalJobs) : totalEmployees > 0 ? formatLocale(totalEmployees) : <MissingValue>42,000</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">Direct employment</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Avg Growth</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {avgGrowth != null ? `+${formatFixed(avgGrowth, 1)}%` : jobGrowth != null ? `+${formatFixed(jobGrowth, 1)}%` : <MissingValue>+3.5%</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">Annual average</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-semibold text-gray-800">Avg Distance</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {avgDistance != null ? `${formatFixed(avgDistance, 1)} mi` : distanceToEmployment != null ? `${formatFixed(distanceToEmployment, 1)} mi` : <MissingValue>0.8 mi</MissingValue>}
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
                {majorEmployers.map((employer: { name?: string | null; employees?: number | null; growth?: string | null; distance?: string | null }, index: number) => {
                  const employees = employer.employees ?? 0;
                  return (
                    <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-800">
                          {employer.name ? <MissingValue>{employer.name}</MissingValue> : <MissingValue>Unknown Employer</MissingValue>}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatLocale(employees)} employees
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={getEmployeeSizeColor(employees)}>
                        {formatLocale(employees)}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={getGrowthColor(employer.growth)}>
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {employer.growth ? <MissingValue>{employer.growth}</MissingValue> : <MissingValue>+2.5%</MissingValue>}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={getDistanceColor(employer.distance)}>
                        <MapPin className="h-3 w-3 mr-1" />
                        {employer.distance ? <MissingValue>{employer.distance}</MissingValue> : <MissingValue>1.0 mi</MissingValue>}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        {employees >= 10000 ? (
                          <Badge className="bg-blue-100 text-blue-800">Major</Badge>
                        ) : employees >= 5000 ? (
                          <Badge className="bg-blue-100 text-blue-800">Significant</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">Moderate</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
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
              {majorEmployers.map((employer: { name?: string | null; employees?: number | null; growth?: string | null }, index: number) => {
                const employees = employer.employees ?? 0;
                const employeeTotal = totalEmployees || 1;
                const widthPercent = (employees / employeeTotal) * 100;
                return (
                  <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {employer.name ? <MissingValue>{employer.name}</MissingValue> : <MissingValue>Unknown Employer</MissingValue>}
                    </span>
                    <span className="text-sm text-gray-500">{formatLocale(employees)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
                );
              })}
              
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-800">Total Employment</span>
                  <Badge className="bg-blue-100 text-blue-800">{formatLocale(totalEmployees) ?? 0}</Badge>
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
              {majorEmployers.map((employer: { name?: string | null; employees?: number | null; growth?: string | null }, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">
                      {employer.name ? <MissingValue>{employer.name}</MissingValue> : <MissingValue>Unknown Employer</MissingValue>}
                    </p>
                    <p className="text-sm text-gray-500">{formatLocale(employer.employees ?? 0)} employees</p>
                  </div>
                  <div className="text-right">
                    <Badge className={getGrowthColor(employer.growth)}>
                      {employer.growth ? <MissingValue>{employer.growth}</MissingValue> : <MissingValue>+2.5%</MissingValue>}
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
                {['employmentStrength1', 'employmentStrength2', 'employmentStrength3'].map((field) => {
                  const insight = insights?.[field];
                  return insight ? (
                    <li key={field} className="flex items-center">
                      <span className="text-green-500 mr-2">•</span>
                      <span>{insight}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Market Opportunities</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {['employmentOpportunity1', 'employmentOpportunity2', 'employmentOpportunity3'].map((field) => {
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
              <h4 className="font-semibold text-gray-800 mb-3">Target Market</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {['targetMarket1', 'targetMarket2', 'targetMarket3'].map((field) => {
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