// src/components/project/ProfileSummaryCard.tsx
import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '../ui/card';
import { Loader2, Edit } from 'lucide-react';
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

  // Determine bullet and percentage color based on completion percentage
  // Uses same logic: green >= 90%, yellow >= 50%, red < 50%
  const getBulletColor = () => {
    if (completeness >= 90) return "bg-green-500";
    if (completeness >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getPercentageColor = () => {
    if (completeness >= 90) return "text-green-600";
    if (completeness >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const handleCardClick = () => {
    router.push('/dashboard/borrower-resume');
  };

  return (
    <Card
      className="relative overflow-hidden group cursor-pointer transition-all duration-200"
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
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">Completion Progress</span>
                            <div className="group relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push('/dashboard/borrower-resume');
                                    }}
                                    className="flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 overflow-hidden"
                                    aria-label="Complete Profile"
                                >
                                    <Edit className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />
                                    <span className="text-xs font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[120px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
                                        Complete Profile
                                    </span>
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`font-semibold transition-colors duration-300 ${getPercentageColor()}`}>
                                {completeness}%
                            </span>
                        </div>
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
                          <span className={`w-1.5 h-1.5 ${getBulletColor()} rounded-full mr-2 animate-pulse`}></span>
                          Complete your borrower resume to unlock lender matching.
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