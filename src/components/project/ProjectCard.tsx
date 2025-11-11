// src/components/project/ProjectCard.tsx
import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/Button';
import { ChevronRight, Building, DollarSign } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ProjectProfile } from '../../types/enhanced-types';

interface ProjectCardProps {
  project: ProjectProfile;
  hasUnreadMessages?: boolean;
  className?: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  hasUnreadMessages = false,
  className,
}) => {
  const router = useRouter();
  
  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };
  
  const projectProgress = Math.round(
    project.projectProgress ?? project.completenessPercent ?? 0
  );
  const borrowerProgress = Math.round(project.borrowerProgress ?? 0);
  const isProjectComplete = projectProgress === 100;

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800';
      case 'Info Gathering':
        return 'bg-blue-100 text-blue-800';
      case 'Advisor Review':
        return 'bg-amber-100 text-amber-800';
      case 'Matches Curated':
        return 'bg-purple-100 text-purple-800';
      case 'Introductions Sent':
        return 'bg-indigo-100 text-indigo-800';
      case 'Term Sheet Received':
        return 'bg-teal-100 text-teal-800';
      case 'Closed':
        return 'bg-green-100 text-green-800';
      case 'Withdrawn':
        return 'bg-red-100 text-red-800';
      case 'Stalled':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              {project.projectName}
              {hasUnreadMessages && (
                <span className="ml-2 w-2 h-2 bg-red-500 rounded-full" title="Unread messages"></span>
              )}
            </h3>
            <div className="flex items-center mt-1">
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getStatusColor(project.projectStatus))}>
                {project.projectStatus}
              </span>
              <span className="text-xs text-gray-500 ml-2">
                Updated {formatDate(project.updatedAt)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center">
            <Building className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm text-gray-700">{project.assetType || 'Not specified'}</span>
          </div>
          
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm text-gray-700">{formatCurrency(project.loanAmountRequested)}</span>
          </div>
        </div>
        
        <div className="mb-4 space-y-3">
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Project Resume</span>
              <span>{projectProgress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full",
                  isProjectComplete ? "bg-green-600" : "bg-blue-600"
                )}
                style={{ width: `${projectProgress}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Borrower Resume</span>
              <span>{borrowerProgress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full",
                  borrowerProgress === 100 ? "bg-green-600" : "bg-indigo-600"
                )}
                style={{ width: `${borrowerProgress}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* See OM Button - Only show for 100% complete projects */}
        {isProjectComplete && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push(`/project/om/${project.id}`)}
            className="mb-3 w-full bg-green-600 hover:bg-green-700 text-white"
          >
            See OM
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          rightIcon={<ChevronRight size={16} />}
          onClick={() => router.push(`/project/workspace/${project.id}`)}
          fullWidth
        >
          Continue
        </Button>
      </CardContent>
    </Card>
  );
};