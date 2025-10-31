// src/components/project/ProfileSummaryCard.tsx
import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/Button';
import { Loader2, User } from 'lucide-react';
import { BorrowerResumeContent } from '@/lib/project-queries';

interface ProfileSummaryCardProps {
  profile: BorrowerResumeContent | null;
  isLoading: boolean;
}

export const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({ profile, isLoading }) => {
  const router = useRouter();

  const completeness = profile?.completenessPercent || 0;
  const isAtRisk = completeness < 70;
  const progressColor = completeness === 100
    ? 'bg-green-600'
    : isAtRisk
      ? 'bg-red-600'
      : 'bg-blue-600';
  const progressBgColor = completeness === 100
    ? 'bg-emerald-50'
    : isAtRisk
      ? 'bg-red-50'
      : 'bg-blue-50';


  const handleCardClick = () => {
    router.push('/dashboard/borrower-resume');
  };

  return (
    <Card
      className={`shadow-sm border relative overflow-hidden group cursor-pointer hover:shadow-md transition-all duration-200 ${isAtRisk ? 'border-red-300' : 'border-gray-200'}`}
      onClick={handleCardClick}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardContent className="p-3 md:p-4 relative">
        {isLoading ? (
          <div className="h-12 flex items-center justify-center text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <span className="ml-3">Loading profile...</span>
          </div>
        ) : profile ? (
            <>
                <div className="w-full">
                    <div className="flex justify-between items-center mb-2 text-sm">
                        <span className="font-medium text-gray-700">Completion Progress</span>
                        <span className={`font-semibold transition-colors duration-300 ${completeness === 100 ? 'text-emerald-600' : isAtRisk ? 'text-red-600' : 'text-blue-600'}`}>
                            {completeness}%
                        </span>
                    </div>
                    <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                        {/* Progress bar with solid color and animation */}
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${progressColor} shadow-sm relative overflow-hidden`}
                            style={{ width: `${completeness}%` }}
                        >
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" 
                                 style={{ 
                                   backgroundSize: '200% 100%',
                                   animation: 'shimmer 2s infinite'
                                 }} 
                            />
                        </div>
                        {/* Subtle glow effect for incomplete progress */}
                        {completeness < 100 && (
                          <div className={`absolute inset-0 ${progressBgColor} rounded-full animate-pulse opacity-20`} />
                        )}
                    </div>
                    
                    {/* Additional context for incomplete profiles */}
                    {completeness < 100 && (
                      <div className="mt-2 text-xs text-gray-600">
                        <p className="flex items-center animate-pulse">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
                          Complete your profile to improve lender matching and project success.
                        </p>
                      </div>
                    )}
                </div>
            </>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No profile found. Please create one to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};