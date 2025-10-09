// src/components/dashboard/ProjectCard.tsx
import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/Button';
import { ChevronRight, CheckCircle, Trash2, Calendar, Building, Star, TrendingUp } from 'lucide-react'; // Added Trash2
import { ProjectProfile } from '@/types/enhanced-types';
import { useProjects } from '@/hooks/useProjects';

interface ProjectCardProps {
  project: ProjectProfile;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const router = useRouter();
  const { deleteProject } = useProjects();

  const completeness = project.completenessPercent || 0;
  const isComplete = completeness === 100;

  // Format date helper (could be moved to utils)
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return 'Invalid Date'; }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    if (window.confirm(`Are you sure you want to delete "${project.projectName}"? This action cannot be undone.`)) {
      try {
        await deleteProject(project.id);
        // Optionally show a success toast message here
        console.log('Project deleted successfully');
      } catch (error) {
        console.error("Failed to delete project:", error);
        // Optionally show an error toast message here
      }
    }
  };

  // Enhanced status color helper with gradients
  const getStatusColorClasses = (status: string) => {
     switch (status) {
        case 'Draft': return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-200';
        case 'Info Gathering': return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-200';
        case 'Advisor Review': return 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border border-amber-200';
        case 'Matches Curated': return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-200';
        case 'Introductions Sent': return 'bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 border border-indigo-200';
        case 'Term Sheet Received': return 'bg-gradient-to-r from-teal-100 to-teal-200 text-teal-800 border border-teal-200';
        case 'Closed': return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-200';
        default: return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-200'; // For Stalled/Withdrawn
     }
  };

  return (
    <div className="group relative">
      {/* Subtle glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-all duration-300"></div>
      
      <Card className="relative bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col border border-gray-100 hover:border-gray-200 group-hover:scale-[1.02] rounded-xl overflow-hidden">
        {/* Gradient pulse overlay - sweeps from left to right on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-200/50 via-white/40 via-purple-200/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1200 ease-in-out"></div>
        </div>

        {/* Completion status indicator bar */}
        <div className="h-1 bg-gray-100">
          <div 
            className={`h-full transition-all duration-500 ${
              isComplete 
                ? 'bg-gradient-to-r from-green-500 to-green-600' 
                : 'bg-gradient-to-r from-blue-500 to-blue-600'
            }`}
            style={{ width: `${completeness}%` }}
          />
        </div>

        <CardContent className="p-6 flex flex-col flex-grow">
          {/* Enhanced Header: Name and Status */}
          <div className="flex justify-between items-start mb-4 gap-2">
            <h3 className="text-xl font-bold text-gray-800 truncate mr-3 group-hover:text-blue-800 transition-colors duration-200" title={project.projectName || 'Unnamed Project'}>
              {project.projectName || 'Unnamed Project'}
            </h3>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-sm ${getStatusColorClasses(project.projectStatus)}`}>
                {project.projectStatus === 'Closed' ? (
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                )}
                {project.projectStatus}
              </span>
               <Button variant="ghost" size="icon" onClick={handleDelete} className="h-7 w-7 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-full">
                 <Trash2 size={14} />
               </Button>
            </div>
          </div>

          {/* Enhanced Details Section */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center text-sm text-gray-600 bg-gray-50/80 rounded-lg p-3">
              <Building className="h-4 w-4 mr-2 text-blue-600 flex-shrink-0" />
              <span className="font-medium">{project.assetType || 'Asset Type TBD'}</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-600 bg-gray-50/80 rounded-lg p-3">
              <Calendar className="h-4 w-4 mr-2 text-green-600 flex-shrink-0" />
              <span>Updated: <span className="font-medium">{formatDate(project.updatedAt)}</span></span>
            </div>
          </div>

          {/* Enhanced Progress Section */}
          <div className="mb-6 mt-auto">
            <div className="flex justify-between items-center text-sm mb-3">
              <span className="text-gray-700 font-medium flex items-center">
                <Star className="h-4 w-4 mr-1.5 text-yellow-500" />
                Completion Progress
              </span>
              <span className={`font-bold text-lg ${isComplete ? 'text-green-600' : 'text-blue-600'}`}>
                {completeness}%
              </span>
            </div>
            
            <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 shadow-sm ${
                  isComplete 
                    ? 'bg-gradient-to-r from-green-500 to-green-600' 
                    : 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700'
                }`}
                style={{ width: `${completeness}%` }}
              />
              {/* Subtle shimmer effect */}
              <div 
                className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
                style={{ 
                  clipPath: `inset(0 ${100 - completeness}% 0 0)`,
                  animationDuration: '2s'
                }}
              />
            </div>
            
            {isComplete && (
              <div className="flex items-center justify-center mt-2 text-xs text-green-700 bg-green-50 rounded-lg py-1">
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Project Complete • OM Ready
              </div>
            )}
          </div>

          {/* Enhanced Action Buttons */}
          <div className="space-y-3 flex-shrink-0">
            {/* See OM Button - Only show for 100% complete projects */}
            {isComplete && (
              <Button
                variant="success"
                fullWidth
                onClick={() => router.push(`/project/om/${project.id}`)}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                View Offering Memorandum
              </Button>
            )}

            {/* Enhanced Action Button */}
            <Button
              variant={isComplete ? "outline" : "primary"}
              fullWidth
              rightIcon={<ChevronRight size={16} />}
              onClick={() => router.push(`/project/workspace/${project.id}`)}
              className={isComplete 
                ? "border-gray-200 hover:border-blue-300 hover:bg-blue-50/70 hover:text-blue-700 transition-all duration-200 group-hover:shadow-sm font-medium"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
              }
            >
              {isComplete ? 'Review Project' : 'Continue Setup'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};