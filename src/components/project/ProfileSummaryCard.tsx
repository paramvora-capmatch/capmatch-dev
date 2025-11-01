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
  
  // Determine color scheme based on completion percentage
  const getColorScheme = () => {
    if (completeness < 30) {
      return {
        border: 'border-red-400',
        borderWidth: 'border-2', // Thicker border for < 30%
        progressColor: 'bg-red-600',
        progressBgColor: 'bg-red-50',
        textColor: 'text-red-600',
      };
    } else if (completeness < 70) {
      return {
        border: 'border-yellow-400',
        borderWidth: 'border',
        progressColor: 'bg-yellow-500',
        progressBgColor: 'bg-yellow-50',
        textColor: 'text-yellow-600',
      };
    } else if (completeness === 100) {
      return {
        border: 'border-emerald-300',
        borderWidth: 'border',
        progressColor: 'bg-green-600',
        progressBgColor: 'bg-emerald-50',
        textColor: 'text-emerald-600',
      };
    } else {
      return {
        border: 'border-blue-300',
        borderWidth: 'border',
        progressColor: 'bg-blue-600',
        progressBgColor: 'bg-blue-50',
        textColor: 'text-blue-600',
      };
    }
  };

  const colorScheme = getColorScheme();


  const handleCardClick = () => {
    router.push('/dashboard/borrower-resume');
  };

  return (
    <Card
      className={`shadow-sm ${colorScheme.borderWidth} ${colorScheme.border} relative overflow-hidden group cursor-pointer hover:shadow-md transition-all duration-200`}
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
                        <span className={`font-semibold transition-colors duration-300 ${colorScheme.textColor}`}>
                            {completeness}%
                        </span>
                    </div>
                    <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                        {/* Progress bar with solid color and animation */}
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${colorScheme.progressColor} shadow-sm relative overflow-hidden`}
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
                          <div className={`absolute inset-0 ${colorScheme.progressBgColor} rounded-full animate-pulse opacity-20`} />
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