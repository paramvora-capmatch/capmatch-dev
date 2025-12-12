'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Building2, DollarSign, Shield } from 'lucide-react';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';
import { parseNumeric, formatLocale } from '@/lib/om-utils';

export default function RegulatoryIncentivesPage() {
  const { content } = useOmContent();

  // Extract special considerations fields
  const affordableHousing = content?.affordableHousing ?? null;
  const amiTargetPercent = parseNumeric(content?.amiTargetPercent) ?? null;
  const relocationPlan = content?.relocationPlan ?? null;
  const taxExemption = content?.taxExemption ?? null;
  const exemptionStructure = content?.exemptionStructure ?? null;
  const sponsoringEntity = content?.sponsoringEntity ?? null;
  const exemptionTerm = content?.exemptionTerm ?? null;
  const seismicPMLRisk = content?.seismicPMLRisk ?? null;
  const opportunityZone = content?.opportunityZone ?? null;
  const incentiveStacking = content?.incentiveStacking ?? null;
  const tifDistrict = content?.tifDistrict ?? null;
  const taxAbatement = content?.taxAbatement ?? null;
  const paceFinancing = content?.paceFinancing ?? null;
  const historicTaxCredits = content?.historicTaxCredits ?? null;
  const newMarketsCredits = content?.newMarketsCredits ?? null;

  useOMPageHeader({
    subtitle: "Regulatory considerations, tax incentives, and special programs.",
  });

  return (
    <div className="space-y-6">
      {/* Affordable Housing */}
      {(affordableHousing || amiTargetPercent != null || relocationPlan) && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Building2 className="h-6 w-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-800">Affordable Housing</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {affordableHousing && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Affordable Housing Program</p>
                  <Badge className="bg-blue-100 text-blue-800">{affordableHousing}</Badge>
                </div>
              )}
              {amiTargetPercent != null && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">AMI Target</p>
                  <p className="text-lg font-semibold text-gray-800">{amiTargetPercent}%</p>
                </div>
              )}
              {relocationPlan && (
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Relocation Plan</p>
                  <p className="text-sm text-gray-700">{relocationPlan}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tax Exemption */}
      {(taxExemption || exemptionStructure || sponsoringEntity || exemptionTerm) && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-6 w-6 text-green-600" />
              <h3 className="text-xl font-semibold text-gray-800">Tax Exemption</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {taxExemption && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Tax Exemption Status</p>
                  <Badge className="bg-green-100 text-green-800">{taxExemption}</Badge>
                </div>
              )}
              {exemptionStructure && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Exemption Structure</p>
                  <p className="text-sm font-semibold text-gray-800">{exemptionStructure}</p>
                </div>
              )}
              {sponsoringEntity && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Sponsoring Entity</p>
                  <p className="text-sm font-semibold text-gray-800">{sponsoringEntity}</p>
                </div>
              )}
              {exemptionTerm && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Exemption Term</p>
                  <p className="text-sm font-semibold text-gray-800">{exemptionTerm}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk & Special Programs */}
      {(seismicPMLRisk || opportunityZone || incentiveStacking) && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-red-600" />
              <h3 className="text-xl font-semibold text-gray-800">Risk & Special Programs</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {seismicPMLRisk && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Seismic/PML Risk</p>
                  <p className="text-sm font-semibold text-gray-800">{seismicPMLRisk}</p>
                </div>
              )}
              {opportunityZone && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Opportunity Zone</p>
                  <Badge className="bg-green-100 text-green-800">{opportunityZone}</Badge>
                </div>
              )}
              {incentiveStacking && (
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Incentive Stacking</p>
                  <p className="text-sm text-gray-700">{incentiveStacking}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tax Incentives & Financing */}
      {(tifDistrict || taxAbatement || paceFinancing || historicTaxCredits || newMarketsCredits) && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Zap className="h-6 w-6 text-purple-600" />
              <h3 className="text-xl font-semibold text-gray-800">Tax Incentives & Financing</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tifDistrict && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">TIF District</p>
                  <p className="text-sm font-semibold text-gray-800">{tifDistrict}</p>
                </div>
              )}
              {taxAbatement && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Tax Abatement</p>
                  <p className="text-sm font-semibold text-gray-800">{taxAbatement}</p>
                </div>
              )}
              {paceFinancing && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">PACE Financing</p>
                  <p className="text-sm font-semibold text-gray-800">{paceFinancing}</p>
                </div>
              )}
              {historicTaxCredits && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Historic Tax Credits</p>
                  <p className="text-sm font-semibold text-gray-800">{historicTaxCredits}</p>
                </div>
              )}
              {newMarketsCredits && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">New Markets Credits</p>
                  <p className="text-sm font-semibold text-gray-800">{newMarketsCredits}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {(affordableHousing || taxExemption || opportunityZone || tifDistrict || taxAbatement) && (
        <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-blue-50">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Incentive Summary</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {affordableHousing && (
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Affordable Housing Program</span>
                  <Badge className="bg-blue-100 text-blue-800">{affordableHousing}</Badge>
                </div>
              )}
              {taxExemption && (
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Tax Exemption</span>
                  <Badge className="bg-green-100 text-green-800">{taxExemption}</Badge>
                </div>
              )}
              {opportunityZone && (
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Opportunity Zone</span>
                  <Badge className="bg-green-100 text-green-800">{opportunityZone}</Badge>
                </div>
              )}
              {tifDistrict && (
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm font-medium text-gray-700">TIF District</span>
                  <Badge className="bg-purple-100 text-purple-800">{tifDistrict}</Badge>
                </div>
              )}
              {taxAbatement && (
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Tax Abatement</span>
                  <Badge className="bg-green-100 text-green-800">{taxAbatement}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

