// src/components/forms/BorrowerResumeView.tsx
import React from 'react';
import { BorrowerResumeContent } from '@/lib/project-queries';
import { Principal } from '@/types/enhanced-types';
import { KeyValueDisplay } from '../om/KeyValueDisplay';
import { User, Briefcase, DollarSign, Globe, Award, AlertTriangle } from 'lucide-react';

interface BorrowerResumeViewProps {
  resume: Partial<BorrowerResumeContent>;
}

export const BorrowerResumeView: React.FC<BorrowerResumeViewProps> = ({ resume }) => {
  const formatArray = (arr: string[] | null | undefined): string => {
    if (!arr || arr.length === 0) return 'N/A';
    return arr.join(', ');
  };

  const formatBoolean = (value: boolean | null | undefined): string => {
    if (value === null || value === undefined) return 'N/A';
    return value ? 'Yes' : 'No';
  };

  return (
    <div className="flex-1 p-4 relative z-10">
      <div className="space-y-6">
        {/* Basic Info */}
        <div>
          <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center">
            <User className="h-4 w-4 mr-2 text-blue-600" /> Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <KeyValueDisplay label="Full Legal Name" value={resume.fullLegalName} />
            <KeyValueDisplay label="Primary Entity Name" value={resume.primaryEntityName} />
            <KeyValueDisplay label="Entity Structure" value={resume.primaryEntityStructure} />
            <KeyValueDisplay label="Contact Email" value={resume.contactEmail} />
            <KeyValueDisplay label="Contact Phone" value={resume.contactPhone} />
            <KeyValueDisplay label="Mailing Address" value={resume.contactAddress} />
            {resume.bioNarrative && (
              <KeyValueDisplay label="Bio" value={resume.bioNarrative} fullWidth />
            )}
          </div>
        </div>

        {/* Key Principals */}
        {Array.isArray((resume as any).principals) && (resume as any).principals.length > 0 && (
          <div>
            <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center">
              <Award className="h-4 w-4 mr-2 text-blue-600" /> Key Principals
            </h3>
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-200">
              {(resume as any).principals.map((p: Principal, idx: number) => (
                <div key={p.id || idx} className="p-3 text-sm text-gray-800 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-medium">{p.principalLegalName}</span>
                  {p.principalRoleDefault && (
                    <span className="text-gray-600">• {p.principalRoleDefault}</span>
                  )}
                  {typeof p.ownershipPercentage === 'number' && (
                    <span className="text-gray-600">• {p.ownershipPercentage}%</span>
                  )}
                  {p.principalEmail && (
                    <span className="text-gray-600">• {p.principalEmail}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        <div>
          <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center">
            <Briefcase className="h-4 w-4 mr-2 text-blue-600" /> Experience & Background
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <KeyValueDisplay label="Years of CRE Experience" value={resume.yearsCREExperienceRange} />
            <KeyValueDisplay label="Total Value Deals Closed" value={resume.totalDealValueClosedRange} />
            <KeyValueDisplay label="Asset Classes Experience" value={formatArray(resume.assetClassesExperience)} fullWidth />
            <KeyValueDisplay label="Geographic Markets Experience" value={formatArray(resume.geographicMarketsExperience)} fullWidth />
            {resume.existingLenderRelationships && (
              <KeyValueDisplay label="Existing Lenders" value={resume.existingLenderRelationships} fullWidth />
            )}
          </div>
        </div>

        {/* Financial Info */}
        <div>
          <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center">
            <DollarSign className="h-4 w-4 mr-2 text-blue-600" /> Financial Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <KeyValueDisplay label="Credit Score Range" value={resume.creditScoreRange} />
            <KeyValueDisplay label="Net Worth Range" value={resume.netWorthRange} />
            <KeyValueDisplay label="Liquidity Range" value={resume.liquidityRange} />
          </div>
          
          {/* Financial Background */}
          {(resume.bankruptcyHistory !== undefined || 
            resume.foreclosureHistory !== undefined || 
            resume.litigationHistory !== undefined) && (
            <div className="mt-4 p-4 bg-amber-50 rounded border border-amber-200">
              <h4 className="text-sm font-semibold mb-3 flex items-center">
                <AlertTriangle className="mr-2 h-4 w-4 text-amber-600" /> Financial Background
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                <KeyValueDisplay label="Bankruptcy (7yr)" value={formatBoolean(resume.bankruptcyHistory)} />
                <KeyValueDisplay label="Foreclosure (7yr)" value={formatBoolean(resume.foreclosureHistory)} />
                <KeyValueDisplay label="Litigation" value={formatBoolean(resume.litigationHistory)} />
              </div>
            </div>
          )}
        </div>

        {/* Online Presence */}
        {(resume.linkedinUrl || resume.websiteUrl) && (
          <div>
            <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center">
              <Globe className="h-4 w-4 mr-2 text-blue-600" /> Online Presence
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {resume.linkedinUrl && (
                <KeyValueDisplay label="LinkedIn URL" value={resume.linkedinUrl} />
              )}
              {resume.websiteUrl && (
                <KeyValueDisplay label="Company Website" value={resume.websiteUrl} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

