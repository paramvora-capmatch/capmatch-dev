// src/components/project/ProjectStatusPathway.tsx
import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '../ui/card';
import { SuccessPathIndicator, Step } from '../ui/SuccessPathIndicator';
import { Button } from '../ui/Button';
import { 
  FileText, 
  ChevronRight, 
  UserCheck,
  MessageSquare,
  Zap,
  FileCheck,
} from 'lucide-react';
import { ProjectStatus } from '../../types/enhanced-types';

interface ProjectStatusPathwayProps {
  projectId: string;
  currentStatus: ProjectStatus;
  borrowerProfileComplete: boolean;
  projectInfoComplete: boolean;
  docsSubmitted: boolean;
  className?: string;
}

export const ProjectStatusPathway: React.FC<ProjectStatusPathwayProps> = ({
  projectId,
  currentStatus,
  borrowerProfileComplete,
  projectInfoComplete,
  docsSubmitted,
  className,
}) => {
  const router = useRouter();

  // Define pathway steps
  const pathwaySteps: Step[] = [
    {
      id: 'profile',
      label: 'Complete Profile',
      description: 'Fill out your borrower profile',
      status: borrowerProfileComplete ? 'complete' : 'current',
    },
    {
      id: 'project',
      label: 'Project Details',
      description: 'Provide information about your project',
      status: !borrowerProfileComplete ? 'upcoming' : 
              projectInfoComplete ? 'complete' : 'current',
    },
    {
      id: 'documents',
      label: 'Upload Documents',
      description: 'Submit required project documents',
      status: !projectInfoComplete ? 'upcoming' : 
              docsSubmitted ? 'complete' : 'current',
    },
    {
      id: 'advisor',
      label: 'Advisor Review',
      description: 'Your advisor will review your submission',
      status: !docsSubmitted ? 'upcoming' :
              currentStatus === 'Advisor Review' ? 'current' :
              ['Matches Curated', 'Introductions Sent', 'Term Sheet Received', 'Closed'].includes(currentStatus) ? 'complete' : 'upcoming',
    },
    {
      id: 'lenders',
      label: 'Lender Matching',
      description: 'Get matched with suitable lenders',
      status: !['Matches Curated', 'Introductions Sent', 'Term Sheet Received', 'Closed'].includes(currentStatus) ? 'upcoming' :
              currentStatus === 'Matches Curated' ? 'current' : 'complete',
    },
    {
      id: 'closing',
      label: 'Closing',
      description: 'Finalize your financing',
      status: !['Term Sheet Received', 'Closed'].includes(currentStatus) ? 'upcoming' :
              currentStatus === 'Term Sheet Received' ? 'current' :
              currentStatus === 'Closed' ? 'complete' : 'upcoming',
    },
  ];

  // Handle step click to navigate to the appropriate section
  const handleStepClick = (stepId: string) => {
    switch (stepId) {
      case 'profile':
        router.push('/profile');
        break;
      case 'project':
        router.push(`/project/edit/${projectId}`);
        break;
      case 'documents':
        router.push(`/project/documents/${projectId}`);
        break;
      case 'advisor':
      case 'lenders':
      case 'closing':
      default:
        router.push(`/project/${projectId}`);
        break;
    }
  };

  // Get next action based on current status
  const getNextAction = () => {
    if (!borrowerProfileComplete) {
      return {
        label: 'Complete Profile',
        icon: <UserCheck size={16} />,
        action: () => router.push('/profile'),
      };
    }
    
    if (!projectInfoComplete) {
      return {
        label: 'Complete Project Details',
        icon: <FileText size={16} />,
        action: () => router.push(`/project/edit/${projectId}`),
      };
    }
    
    if (!docsSubmitted) {
      return {
        label: 'Upload Documents',
        icon: <FileCheck size={16} />,
        action: () => router.push(`/project/documents/${projectId}`),
      };
    }
    
    return {
      label: 'View Project Messages',
      icon: <MessageSquare size={16} />,
      action: () => router.push(`/project/${projectId}`),
    };
  };

  const nextAction = getNextAction();

  return (
    <Card className={className}>
      <CardHeader className="pb-3 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-blue-600" />
            Your Financing Journey
          </h2>
          <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            currentStatus === 'Draft' ? 'bg-gray-100 text-gray-800' :
            currentStatus === 'Info Gathering' ? 'bg-blue-100 text-blue-800' :
            currentStatus === 'Advisor Review' ? 'bg-amber-100 text-amber-800' :
            currentStatus === 'Matches Curated' ? 'bg-purple-100 text-purple-800' :
            currentStatus === 'Introductions Sent' ? 'bg-indigo-100 text-indigo-800' :
            currentStatus === 'Term Sheet Received' ? 'bg-teal-100 text-teal-800' :
            currentStatus === 'Closed' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>
            {currentStatus}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="mb-6">
          <SuccessPathIndicator
            steps={pathwaySteps}
            orientation="vertical"
            onStepClick={handleStepClick}
          />
        </div>
        
        <div className="flex justify-end">
          <Button
            variant="primary"
            rightIcon={<ChevronRight size={16} />}
            onClick={nextAction.action}
          >
            {nextAction.label}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};