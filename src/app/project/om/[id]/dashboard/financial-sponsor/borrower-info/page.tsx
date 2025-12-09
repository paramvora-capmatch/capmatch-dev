'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Building2, Phone, Mail, MapPin, Briefcase, Award, AlertTriangle } from 'lucide-react';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';
import { getOMValue } from '@/lib/om-utils';

export default function BorrowerInfoPage() {
  const { content } = useOmContent();

  // Extract borrower fields from flat OM content
  const fullLegalName = getOMValue(content, "fullLegalName");
  const primaryEntityName = getOMValue(content, "primaryEntityName");
  const primaryEntityStructure = getOMValue(content, "primaryEntityStructure");
  const contactEmail = getOMValue(content, "contactEmail");
  const contactPhone = getOMValue(content, "contactPhone");
  const contactAddress = getOMValue(content, "contactAddress");
  const yearsCREExperienceRange = getOMValue(content, "yearsCREExperienceRange");
  const assetClassesExperience = getOMValue(content, "assetClassesExperience");
  const geographicMarketsExperience = getOMValue(content, "geographicMarketsExperience");
  const totalDealValueClosedRange = getOMValue(content, "totalDealValueClosedRange");
  const existingLenderRelationships = getOMValue(content, "existingLenderRelationships");
  const bioNarrative = getOMValue(content, "bioNarrative");
  const creditScoreRange = getOMValue(content, "creditScoreRange");
  const netWorthRange = getOMValue(content, "netWorthRange");
  const liquidityRange = getOMValue(content, "liquidityRange");
  const bankruptcyHistory = getOMValue(content, "bankruptcyHistory");
  const foreclosureHistory = getOMValue(content, "foreclosureHistory");
  const litigationHistory = getOMValue(content, "litigationHistory");
  const linkedinUrl = getOMValue(content, "linkedinUrl");
  const websiteUrl = getOMValue(content, "websiteUrl");

  useOMPageHeader({
    subtitle: "Borrower entity information, experience, and financial profile.",
  });

  return (
    <div className="space-y-6">
      {/* Entity Information */}
      {(fullLegalName || primaryEntityName || primaryEntityStructure) && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Building2 className="h-6 w-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-800">Entity Information</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fullLegalName && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Full Legal Name</p>
                  <p className="text-sm font-semibold text-gray-800">{fullLegalName}</p>
                </div>
              )}
              {primaryEntityName && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Primary Entity Name</p>
                  <p className="text-sm font-semibold text-gray-800">{primaryEntityName}</p>
                </div>
              )}
              {primaryEntityStructure && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Entity Structure</p>
                  <Badge className="bg-blue-100 text-blue-800">{primaryEntityStructure}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Information */}
      {(contactEmail || contactPhone || contactAddress) && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-6 w-6 text-green-600" />
              <h3 className="text-xl font-semibold text-gray-800">Contact Information</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contactEmail && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                    <p className="text-sm font-medium text-gray-800">{contactEmail}</p>
                  </div>
                </div>
              )}
              {contactPhone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                    <p className="text-sm font-medium text-gray-800">{contactPhone}</p>
                  </div>
                </div>
              )}
              {contactAddress && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Mailing Address</p>
                    <p className="text-sm font-medium text-gray-800">{contactAddress}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Experience & Track Record */}
      {(yearsCREExperienceRange || assetClassesExperience || geographicMarketsExperience || totalDealValueClosedRange) && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Briefcase className="h-6 w-6 text-purple-600" />
              <h3 className="text-xl font-semibold text-gray-800">Experience & Track Record</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {yearsCREExperienceRange && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Years of CRE Experience</p>
                  <p className="text-sm font-semibold text-gray-800">{yearsCREExperienceRange}</p>
                </div>
              )}
              {assetClassesExperience && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Asset Classes Experience</p>
                  <p className="text-sm text-gray-700">{assetClassesExperience}</p>
                </div>
              )}
              {geographicMarketsExperience && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Geographic Markets Experience</p>
                  <p className="text-sm text-gray-700">{geographicMarketsExperience}</p>
                </div>
              )}
              {totalDealValueClosedRange && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Deal Value Closed</p>
                  <p className="text-sm font-semibold text-gray-800">{totalDealValueClosedRange}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Profile */}
      {(creditScoreRange || netWorthRange || liquidityRange) && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Award className="h-6 w-6 text-green-600" />
              <h3 className="text-xl font-semibold text-gray-800">Financial Profile</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {creditScoreRange && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Credit Score Range</p>
                  <p className="text-lg font-semibold text-gray-800">{creditScoreRange}</p>
                </div>
              )}
              {netWorthRange && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Net Worth Range</p>
                  <p className="text-lg font-semibold text-gray-800">{netWorthRange}</p>
                </div>
              )}
              {liquidityRange && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Liquidity Range</p>
                  <p className="text-lg font-semibold text-gray-800">{liquidityRange}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lender Relationships */}
      {existingLenderRelationships && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Existing Lender Relationships</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{existingLenderRelationships}</p>
          </CardContent>
        </Card>
      )}

      {/* Bio */}
      {bioNarrative && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Bio</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 leading-relaxed">{bioNarrative}</p>
          </CardContent>
        </Card>
      )}

      {/* Risk Factors */}
      {(bankruptcyHistory || foreclosureHistory || litigationHistory) && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h3 className="text-xl font-semibold text-gray-800">Risk Factors</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bankruptcyHistory && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Bankruptcy History (7yr)</p>
                  <Badge className={bankruptcyHistory === 'Yes' || bankruptcyHistory === true ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                    {bankruptcyHistory}
                  </Badge>
                </div>
              )}
              {foreclosureHistory && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Foreclosure History (7yr)</p>
                  <Badge className={foreclosureHistory === 'Yes' || foreclosureHistory === true ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                    {foreclosureHistory}
                  </Badge>
                </div>
              )}
              {litigationHistory && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Litigation History</p>
                  <p className="text-sm text-gray-700">{litigationHistory}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Online Presence */}
      {(linkedinUrl || websiteUrl) && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Online Presence</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {linkedinUrl && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">LinkedIn</p>
                  <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    {linkedinUrl}
                  </a>
                </div>
              )}
              {websiteUrl && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Company Website</p>
                  <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    {websiteUrl}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

