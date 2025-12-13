'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';
import { parseNumeric, formatLocale } from '@/lib/om-utils';

type MilestoneStatus = 'completed' | 'current' | 'upcoming';

interface Milestone {
  phase: string;
  date: string | null;
  status: MilestoneStatus;
  duration?: number;
}

// Helper functions - moved outside component to prevent re-creation on every render
const getStatus = (date: string | null): MilestoneStatus => {
  if (!date) return 'upcoming';
  const milestoneDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  milestoneDate.setHours(0, 0, 0, 0);
  
  if (milestoneDate < today) return 'completed';
  if (milestoneDate.getTime() === today.getTime()) return 'current';
  return 'upcoming';
};

// Calculate duration in days between two dates
const calculateDuration = (startDate: string | null, endDate: string | null): number => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default function MilestonesPage() {
  const { content } = useOmContent();
  
  // Helper function to calculate days between dates
  const daysBetween = (date1: string | null | undefined, date2: string | null | undefined): number | null => {
    if (!date1 || !date2) return null;
    try {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };
  
  // Build milestones from flat date fields with status from resume (calculated by backend)
  const milestones = [
    { phase: "Land Acquisition", date: content?.landAcqClose ?? null, status: content?.landAcqStatus ?? null },
    { phase: "Entitlements", date: content?.entitlementsDate ?? null, status: content?.entitlementsStatus ?? null },
    { phase: "Groundbreaking", date: content?.groundbreakingDate ?? null, status: content?.groundbreakingStatus ?? null },
    { phase: "Vertical Start", date: content?.verticalStart ?? null, status: content?.verticalStartStatus ?? null },
    { phase: "First Occupancy", date: content?.firstOccupancy ?? null, status: content?.firstOccupancyStatus ?? null },
    { phase: "Completion", date: content?.completionDate ?? null, status: content?.completionStatus ?? null },
    { phase: "Stabilization", date: content?.stabilization ?? null, status: content?.stabilizationStatus ?? null },
  ].filter(item => item.date);

  // Calculate durations for each milestone
  const milestonesWithDuration = milestones.map((milestone, index) => {
    let duration: number | null = null;
    
    // First milestone (Land Acquisition) has no duration
    if (index === 0) {
      return { ...milestone, duration: null };
    }
    
    // Calculate duration from previous milestone date
    const prevMilestone = milestones[index - 1];
    if (prevMilestone?.date && milestone.date) {
      duration = daysBetween(prevMilestone.date, milestone.date);
    }
    
    return { ...milestone, duration };
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'current':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'upcoming':
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: MilestoneStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'current':
        return 'bg-blue-100 text-blue-800';
      case 'upcoming':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate total duration from milestone dates (in days)
  // Use pre-calculated value if available, otherwise calculate from first to last milestone
  const totalDuration = content?.totalProjectDurationDays 
    ? parseNumeric(content.totalProjectDurationDays) 
    : milestones.length > 0 && milestones[0].date && milestones[milestones.length - 1].date
    ? daysBetween(milestones[0].date, milestones[milestones.length - 1].date)
    : 0;

  // Extract construction/lease-up fields
  const preLeasedSF = parseNumeric(content?.preLeasedSF) ?? null;
  const drawSchedule = content?.drawSchedule;
  const absorptionProjection = content?.absorptionProjection ?? null;

  // Memoize subtitle to prevent re-renders
  const subtitle = useMemo(() => "Timeline of critical phases, durations, and current status.", []);
  
  useOMPageHeader({
    subtitle,
  });

  return (
    <div className="space-y-6">
      {/* Timeline View */}
      <Card>
        <CardHeader dataSourceSection="milestones">
          <h2 className="text-xl">Timeline Overview</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {milestonesWithDuration.map((milestone: { status?: string | null; phase?: string | null; date?: string | null; duration?: number | null }, index: number) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {milestone.status ? getStatusIcon(milestone.status) : <Clock className="h-5 w-5 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {milestone.phase ?? null}
                    </p>
                      {milestone.status && (
                        <Badge className={getStatusColor(milestone.status)}>
                          {milestone.status}
                        </Badge>
                      )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-500">{milestone.date ?? null}</p>
                    <p className="text-sm text-gray-500">{milestone.duration ?? null} days</p>
                  </div>
                </div>
              </div>
            ) : (
              milestones.map((milestone, index) => (
                <div key={`${milestone.phase}-${index}`} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(milestone.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {milestone.phase}
                      </p>
                      <Badge className={getStatusColor(milestone.status)}>
                        {milestone.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-500">
                        {milestone.phase === "Entitlements" && entitlements === 'Approved' 
                          ? 'Approved' 
                          : milestone.date ?? 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {milestone.duration ? `${milestone.duration} days` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gantt Chart */}
      <Card>
        <CardHeader dataSourceSection="milestones">
          <h2 className="text-xl">Gantt Chart</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {milestonesWithDuration.map((milestone: { status?: string | null; phase?: string | null; date?: string | null; duration?: number | null }, index: number) => {
              // Calculate cumulative duration for positioning
              let cumulativeDuration = 0;
              for (let i = 0; i < index; i++) {
                const prevDuration = milestonesWithDuration[i]?.duration ?? 0;
                cumulativeDuration += prevDuration ?? 0;
              }
              
              const duration = milestone.duration ?? 0;
              const startPercentage = totalDuration && totalDuration > 0 ? (cumulativeDuration / totalDuration) * 100 : 0;
              const widthPercentage = totalDuration && totalDuration > 0 ? (duration / totalDuration) * 100 : 0;

              return (
                <div key={index} className="relative">
                  <div className="flex items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 w-48 truncate">
                      {milestone.phase ?? null}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      {duration ? `${duration} days` : 'N/A'}
                    </span>
                  </div>
                  <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                        milestone.status === 'completed'
                          ? 'bg-green-500'
                          : milestone.status === 'current'
                          ? 'bg-blue-500'
                          : milestone.status === 'upcoming'
                          ? 'bg-gray-400'
                          : 'bg-gray-300'
                      }`}
                      style={{
                        left: `${startPercentage}%`,
                        width: `${widthPercentage}%`,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {milestone.date ?? ''}
                      </span>
                    </div>
                    <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                      {widthPercentage > 0 && (
                        <div
                          className={`absolute top-0 h-full rounded-full transition-all duration-300 ${
                            milestone.status === 'completed'
                              ? 'bg-green-500'
                              : milestone.status === 'current'
                              ? 'bg-blue-500'
                              : 'bg-gray-400'
                          }`}
                          style={{
                            left: `${startPercentage}%`,
                            width: `${widthPercentage}%`,
                          }}
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-xs font-medium ${widthPercentage > 0 ? 'text-white' : 'text-gray-600'}`}>
                          {milestone.phase === "Entitlements" && entitlements === 'Approved' 
                            ? 'Approved' 
                            : milestone.date ?? 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg">Total Duration</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{totalDuration ? `${totalDuration} days` : 'N/A'}</p>
            <p className="text-sm text-gray-500 mt-1">From start to finish</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg">Completed</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {milestonesWithDuration.filter((m: { status?: string | null }) => m.status === 'completed').length}
            </p>
            <p className="text-sm text-gray-500 mt-1">Milestones completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg">Remaining</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {milestonesWithDuration.filter((m: { status?: string | null }) => m.status === 'upcoming').length}
            </p>
            <p className="text-sm text-gray-500 mt-1">Milestones pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Construction & Lease-Up Status */}
      {(preLeasedSFValue != null || drawSchedule || absorptionProjection) && (
        <Card>
          <CardHeader>
            <h2 className="text-xl">Construction & Lease-Up Status</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {preLeasedSFValue != null && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-2">Pre-Leased SF</p>
                  <p className="text-2xl font-bold text-blue-900">{formatLocale(preLeasedSFValue)} SF</p>
                </div>
              )}
              {absorptionProjection && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wider mb-2">Absorption Projection</p>
                  <p className="text-sm text-gray-800">{absorptionProjection}</p>
                </div>
              )}
              {drawSchedule && Array.isArray(drawSchedule) && drawSchedule.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">Draw Schedule</p>
                  <div className="space-y-2">
                    {drawSchedule.map((draw: any, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-800">
                            {draw.phase || draw.description || `Draw ${index + 1}`}
                          </span>
                          <span className="text-sm text-gray-600">
                            {draw.amount != null ? `$${formatLocale(draw.amount)}` : draw.percentage != null ? `${draw.percentage}%` : null}
                          </span>
                        </div>
                        {draw.date && (
                          <p className="text-xs text-gray-500 mt-1">Due: {draw.date}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 