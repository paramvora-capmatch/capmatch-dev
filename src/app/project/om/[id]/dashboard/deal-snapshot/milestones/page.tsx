'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';
import { getOMValue, parseNumeric, formatLocale } from '@/lib/om-utils';

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

  // Memoize content values to prevent unnecessary re-renders
  const landAcqClose = useMemo(() => content?.landAcqClose, [content?.landAcqClose]);
  const entitlements = useMemo(() => content?.entitlements, [content?.entitlements]);
  const groundbreakingDate = useMemo(() => content?.groundbreakingDate, [content?.groundbreakingDate]);
  const verticalStart = useMemo(() => content?.verticalStart, [content?.verticalStart]);
  const firstOccupancy = useMemo(() => content?.firstOccupancy, [content?.firstOccupancy]);
  const completionDate = useMemo(() => content?.completionDate, [content?.completionDate]);
  const stabilization = useMemo(() => content?.stabilization, [content?.stabilization]);
  const preLeasedSF = useMemo(() => content?.preLeasedSF, [content?.preLeasedSF]);
  const drawSchedule = useMemo(() => content?.drawSchedule, [content?.drawSchedule]);

  // Build milestones from flat date fields - memoized to prevent re-renders
  const milestones = useMemo(() => {
    const entitlementsValue = entitlements;
    const isEntitlementsApproved = entitlementsValue === 'Approved';
    
    const allMilestones: Milestone[] = [
      { phase: "Land Acquisition", date: landAcqClose ?? null, status: getStatus(landAcqClose ?? null) },
      { 
        phase: "Entitlements", 
        date: isEntitlementsApproved ? null : (entitlementsValue ?? null), 
        status: isEntitlementsApproved ? 'completed' as const : getStatus(entitlementsValue ?? null) 
      },
      { phase: "Groundbreaking", date: groundbreakingDate ?? null, status: getStatus(groundbreakingDate ?? null) },
      { phase: "Vertical Start", date: verticalStart ?? null, status: getStatus(verticalStart ?? null) },
      { phase: "First Occupancy", date: firstOccupancy ?? null, status: getStatus(firstOccupancy ?? null) },
      { phase: "Completion", date: completionDate ?? null, status: getStatus(completionDate ?? null) },
      { phase: "Stabilization", date: stabilization ?? null, status: getStatus(stabilization ?? null) },
    ];

    // Calculate durations between consecutive milestones
    const milestonesWithDuration = allMilestones.map((milestone, index) => {
      if (index === 0) {
        return { ...milestone, duration: 0 };
      }
      const prevMilestone = allMilestones[index - 1];
      // Skip duration calculation for Entitlements if it's "Approved" (no date)
      if (milestone.phase === "Entitlements" && !milestone.date) {
        return { ...milestone, duration: 0 };
      }
      if (prevMilestone.phase === "Entitlements" && !prevMilestone.date) {
        // If previous milestone is Entitlements without date, use the milestone before that
        const prevPrevMilestone = index > 1 ? allMilestones[index - 2] : null;
        if (prevPrevMilestone?.date) {
          const duration = calculateDuration(prevPrevMilestone.date, milestone.date);
          return { ...milestone, duration };
        }
        return { ...milestone, duration: 0 };
      }
      const duration = calculateDuration(prevMilestone.date, milestone.date);
      return { ...milestone, duration };
    });

    // Filter out milestones without dates (except Entitlements which can be "Approved")
    return milestonesWithDuration.filter(item => item.date || (item.phase === "Entitlements" && isEntitlementsApproved));
  }, [landAcqClose, entitlements, groundbreakingDate, verticalStart, firstOccupancy, completionDate, stabilization]);

  const getStatusIcon = (status: MilestoneStatus) => {
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

  // Calculate total duration from first to last milestone (in days)
  const totalDuration = useMemo(() => {
    if (milestones.length < 2) return 0;
    const firstDate = milestones[0]?.date;
    const lastDate = milestones[milestones.length - 1]?.date;
    if (!firstDate || !lastDate) return 0;
    return calculateDuration(firstDate, lastDate);
  }, [milestones]);

  // Extract construction/lease-up fields - memoized
  const preLeasedSFValue = useMemo(() => parseNumeric(preLeasedSF) ?? null, [preLeasedSF]);
  const absorptionProjection = useMemo(() => {
    if (!content) return null;
    return getOMValue(content, "absorptionProjection");
  }, [content]);

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
            {milestones.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No milestones found. Please add milestone dates to the project.</p>
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
          {milestones.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No milestones found. Please add milestone dates to the project.</p>
            </div>
          ) : totalDuration === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Unable to calculate timeline. Please ensure milestone dates are valid.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map((milestone, index) => {
                // Calculate cumulative duration from start
                const cumulativeDuration = milestones.slice(0, index).reduce((sum, m) => sum + (m.duration || 0), 0);
                const startPercentage = totalDuration > 0 ? (cumulativeDuration / totalDuration) * 100 : 0;
                const widthPercentage = totalDuration > 0 ? ((milestone.duration || 0) / totalDuration) * 100 : 0;

                return (
                  <div key={`gantt-${milestone.phase}-${index}`} className="relative">
                    <div className="flex items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 w-48 truncate">
                        {milestone.phase}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        {milestone.duration ? `${milestone.duration} days` : 'N/A'}
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
            <p className="text-3xl font-bold text-blue-600">{totalDuration} days</p>
            <p className="text-sm text-gray-500 mt-1">From start to finish</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg">Completed</h2>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {milestones.filter(m => m.status === 'completed').length}
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
              {milestones.filter(m => m.status === 'upcoming').length}
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