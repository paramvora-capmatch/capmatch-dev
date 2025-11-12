// src/components/forms/AdvisorResumeView.tsx
import React from 'react';
import { AdvisorResumeContent } from '@/lib/project-queries';
import { KeyValueDisplay } from '../om/KeyValueDisplay';
import { User, Briefcase, Globe, Award, MapPin, Building2 } from 'lucide-react';

interface AdvisorResumeViewProps {
  resume: Partial<AdvisorResumeContent>;
}

export const AdvisorResumeView: React.FC<AdvisorResumeViewProps> = ({ resume }) => {
  const formatArray = (arr: string[] | null | undefined): string => {
    if (!arr || arr.length === 0) return 'N/A';
    return arr.join(', ');
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
            <KeyValueDisplay label="Name" value={resume.name} />
            <KeyValueDisplay label="Title" value={resume.title} />
            <KeyValueDisplay label="Email" value={resume.email} />
            <KeyValueDisplay label="Phone" value={resume.phone} />
            {resume.company && (
              <KeyValueDisplay label="Company" value={resume.company} />
            )}
            {resume.location && (
              <KeyValueDisplay label="Location" value={resume.location} />
            )}
            {resume.bio && (
              <KeyValueDisplay label="Bio" value={resume.bio} fullWidth />
            )}
          </div>
        </div>

        {/* Experience */}
        <div>
          <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center">
            <Briefcase className="h-4 w-4 mr-2 text-blue-600" /> Experience
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <KeyValueDisplay 
              label="Years of Experience" 
              value={resume.yearsExperience ? `${resume.yearsExperience} years` : undefined} 
            />
            <KeyValueDisplay 
              label="Specialties" 
              value={formatArray(resume.specialties)} 
              fullWidth 
            />
            {resume.education && (
              <KeyValueDisplay label="Education" value={resume.education} fullWidth />
            )}
            {resume.certifications && resume.certifications.length > 0 && (
              <KeyValueDisplay 
                label="Certifications" 
                value={formatArray(resume.certifications)} 
                fullWidth 
              />
            )}
          </div>
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
                <KeyValueDisplay label="Website" value={resume.websiteUrl} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

