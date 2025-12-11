'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Building2, DollarSign, Shield } from 'lucide-react';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';
import { getOMValue, parseNumeric, formatLocale, formatFixed } from '@/lib/om-utils';

// Component to show missing values in red
const MissingValue = ({ children }: { children: React.ReactNode }) => (
  <span className="text-red-600 font-medium">{children}</span>
);

export default function RegulatoryIncentivesPage() {
  const { content } = useOmContent();

  // Extract special considerations fields from flat schema
  const affordableHousing = content?.affordableHousing ?? null;
  const affordableUnitsNumber = parseNumeric(content?.affordableUnitsNumber) ?? null;
  const amiTargetPercent = parseNumeric(content?.amiTargetPercent) ?? null;
  const relocationPlan = getOMValue(content, "relocationPlan");
  const taxExemption = content?.taxExemption ?? null;
  const exemptionStructure = getOMValue(content, "exemptionStructure");
  const sponsoringEntity = getOMValue(content, "sponsoringEntity");
  const exemptionTerm = parseNumeric(content?.exemptionTerm) ?? null;
  const seismicPMLRisk = getOMValue(content, "seismicPMLRisk");
  const opportunityZone = content?.opportunityZone ?? null;
  const incentiveStacking = Array.isArray(content?.incentiveStacking) ? content.incentiveStacking : (content?.incentiveStacking ? [content.incentiveStacking] : null);
  const tifDistrict = content?.tifDistrict ?? null;
  const taxAbatement = content?.taxAbatement ?? null;
  const paceFinancing = content?.paceFinancing ?? null;
  const historicTaxCredits = content?.historicTaxCredits ?? null;
  const newMarketsCredits = content?.newMarketsCredits ?? null;
  const impactFees = parseNumeric(content?.impactFees) ?? null;
  const totalIncentiveValue = parseNumeric(content?.totalIncentiveValue) ?? null;

  useOMPageHeader({
    subtitle: "Regulatory considerations, tax incentives, and special programs.",
  });

  return (
    <div className="space-y-6">
      {/* Affordable Housing */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-800">Affordable Housing</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Affordable Housing Program</p>
              {affordableHousing === true ? (
                <Badge className="bg-blue-100 text-blue-800">Yes</Badge>
              ) : affordableHousing === false ? (
                <Badge className="bg-gray-100 text-gray-800">No</Badge>
              ) : (
                <MissingValue>Yes</MissingValue>
              )}
            </div>
            {affordableUnitsNumber != null && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Affordable Units</p>
                <p className="text-lg font-semibold text-gray-800">{formatLocale(affordableUnitsNumber)} units</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">AMI Target</p>
              <p className="text-lg font-semibold text-gray-800">
                {amiTargetPercent != null ? `${amiTargetPercent}%` : <MissingValue>80%</MissingValue>}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Relocation Plan</p>
              <p className="text-sm text-gray-700">
                {relocationPlan ? relocationPlan : <MissingValue>N/A</MissingValue>}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Exemption */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <DollarSign className="h-6 w-6 text-green-600" />
            <h3 className="text-xl font-semibold text-gray-800">Tax Exemption</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Tax Exemption Status</p>
              {taxExemption === true ? (
                <Badge className="bg-green-100 text-green-800">Yes</Badge>
              ) : taxExemption === false ? (
                <Badge className="bg-gray-100 text-gray-800">No</Badge>
              ) : (
                <MissingValue>Yes</MissingValue>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Exemption Structure</p>
              <p className="text-sm font-semibold text-gray-800">
                {exemptionStructure ? exemptionStructure : <MissingValue>PFC</MissingValue>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Sponsoring Entity</p>
              <p className="text-sm font-semibold text-gray-800">
                {sponsoringEntity ? sponsoringEntity : <MissingValue>Dallas Housing Finance Corporation PFC</MissingValue>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Exemption Term</p>
              <p className="text-sm font-semibold text-gray-800">
                {exemptionTerm != null ? `${exemptionTerm} years` : <MissingValue>99 years</MissingValue>}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk & Special Programs */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-red-600" />
            <h3 className="text-xl font-semibold text-gray-800">Risk & Special Programs</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Seismic/PML Risk</p>
              <p className="text-sm font-semibold text-gray-800">
                {seismicPMLRisk ? seismicPMLRisk : <MissingValue>2.5% PML</MissingValue>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Opportunity Zone</p>
              {opportunityZone === true ? (
                <Badge className="bg-green-100 text-green-800">Qualified</Badge>
              ) : opportunityZone === false ? (
                <Badge className="bg-gray-100 text-gray-800">Not Qualified</Badge>
              ) : (
                <MissingValue>Qualified</MissingValue>
              )}
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Incentive Stacking</p>
              {incentiveStacking && Array.isArray(incentiveStacking) && incentiveStacking.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {incentiveStacking.map((item: string, index: number) => (
                    <Badge key={index} className="bg-blue-100 text-blue-800">{item}</Badge>
                  ))}
                </div>
              ) : incentiveStacking ? (
                <p className="text-sm text-gray-700">{incentiveStacking}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <MissingValue>PFC Tax Exemption</MissingValue>
                  <MissingValue>Opportunity Zone</MissingValue>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Incentives & Financing */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Zap className="h-6 w-6 text-purple-600" />
            <h3 className="text-xl font-semibold text-gray-800">Tax Incentives & Financing</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">TIF District</p>
              {tifDistrict === true ? (
                <Badge className="bg-purple-100 text-purple-800">Yes</Badge>
              ) : tifDistrict === false ? (
                <Badge className="bg-gray-100 text-gray-800">No</Badge>
              ) : (
                <MissingValue>No</MissingValue>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Tax Abatement</p>
              {taxAbatement === true ? (
                exemptionTerm != null ? (
                  <p className="text-sm font-semibold text-gray-800">{exemptionTerm} years</p>
                ) : (
                  <Badge className="bg-green-100 text-green-800">Yes</Badge>
                )
              ) : taxAbatement === false ? (
                <Badge className="bg-gray-100 text-gray-800">No</Badge>
              ) : (
                <MissingValue>10 Years</MissingValue>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">PACE Financing</p>
              {paceFinancing === true ? (
                <Badge className="bg-green-100 text-green-800">Yes</Badge>
              ) : paceFinancing === false ? (
                <Badge className="bg-gray-100 text-gray-800">No</Badge>
              ) : (
                <MissingValue>No</MissingValue>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Historic Tax Credits</p>
              {historicTaxCredits === true ? (
                <Badge className="bg-green-100 text-green-800">Yes</Badge>
              ) : historicTaxCredits === false ? (
                <Badge className="bg-gray-100 text-gray-800">No</Badge>
              ) : (
                <MissingValue>No</MissingValue>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">New Markets Credits</p>
              {newMarketsCredits === true ? (
                <Badge className="bg-green-100 text-green-800">Yes</Badge>
              ) : newMarketsCredits === false ? (
                <Badge className="bg-gray-100 text-gray-800">No</Badge>
              ) : (
                <MissingValue>No</MissingValue>
              )}
            </div>
            {impactFees != null && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Impact Fees</p>
                <p className="text-sm font-semibold text-gray-800">${formatFixed(impactFees, 2)}/SF</p>
              </div>
            )}
          </div>
          {totalIncentiveValue != null && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Total Incentive Value</p>
                <p className="text-2xl font-bold text-green-600">
                  ${formatFixed(totalIncentiveValue / 1000000, 1)}M
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-blue-50">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">Incentive Summary</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="text-sm font-medium text-gray-700">Affordable Housing Program</span>
              {affordableHousing === true ? (
                <Badge className="bg-blue-100 text-blue-800">Yes</Badge>
              ) : affordableHousing === false ? (
                <Badge className="bg-gray-100 text-gray-800">No</Badge>
              ) : (
                <MissingValue>Yes</MissingValue>
              )}
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="text-sm font-medium text-gray-700">Tax Exemption</span>
              {taxExemption === true ? (
                <Badge className="bg-green-100 text-green-800">Yes</Badge>
              ) : taxExemption === false ? (
                <Badge className="bg-gray-100 text-gray-800">No</Badge>
              ) : (
                <MissingValue>Yes</MissingValue>
              )}
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="text-sm font-medium text-gray-700">Opportunity Zone</span>
              {opportunityZone === true ? (
                <Badge className="bg-green-100 text-green-800">Qualified</Badge>
              ) : opportunityZone === false ? (
                <Badge className="bg-gray-100 text-gray-800">Not Qualified</Badge>
              ) : (
                <MissingValue>Qualified</MissingValue>
              )}
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="text-sm font-medium text-gray-700">TIF District</span>
              {tifDistrict === true ? (
                <Badge className="bg-purple-100 text-purple-800">Yes</Badge>
              ) : tifDistrict === false ? (
                <Badge className="bg-gray-100 text-gray-800">No</Badge>
              ) : (
                <MissingValue>No</MissingValue>
              )}
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="text-sm font-medium text-gray-700">Tax Abatement</span>
              {taxAbatement === true ? (
                exemptionTerm != null ? (
                  <Badge className="bg-green-100 text-green-800">{exemptionTerm} Years</Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-800">Yes</Badge>
                )
              ) : taxAbatement === false ? (
                <Badge className="bg-gray-100 text-gray-800">No</Badge>
              ) : (
                <MissingValue>10 Years</MissingValue>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

