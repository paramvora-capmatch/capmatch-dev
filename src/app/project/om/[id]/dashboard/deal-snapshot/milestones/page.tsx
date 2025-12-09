'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useOMPageHeader } from '@/hooks/useOMPageHeader';
import { useOmContent } from '@/hooks/useOmContent';

export default function MilestonesPage() {
  const { content } = useOmContent();
  
  // Build milestones from flat date fields
  const milestones = [
    { phase: "Land Acquisition", date: content?.landAcqClose ?? null, status: "completed" as const },
    { phase: "Entitlements", date: content?.entitlements ?? null, status: "completed" as const },
    { phase: "Groundbreaking", date: content?.groundbreakingDate ?? null, status: "current" as const },
    { phase: "Vertical Start", date: content?.verticalStart ?? null, status: "current" as const },
    { phase: "First Occupancy", date: content?.firstOccupancy ?? null, status: "upcoming" as const },
    { phase: "Completion", date: content?.completionDate ?? null, status: "upcoming" as const },
    { phase: "Stabilization", date: content?.stabilization ?? null, status: "upcoming" as const },
  ].filter(item => item.date);

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

  const getStatusColor = (status: string) => {
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

  const totalDuration = milestones.reduce(
    (sum: number, milestone: { duration?: number | null }) => sum + (milestone.duration ?? 0),
    0
  );

  useOMPageHeader({
    subtitle: "Timeline of critical phases, durations, and current status.",
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
            {milestones.map((milestone: { status?: string | null; phase?: string | null; date?: string | null; duration?: number | null }, index: number) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {getStatusIcon(milestone.status ?? 'upcoming')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {milestone.phase ?? null}
                    </p>
                      <Badge className={getStatusColor(milestone.status ?? 'upcoming')}>
                      {milestone.status ?? null}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-500">{milestone.date ?? null}</p>
                    <p className="text-sm text-gray-500">{milestone.duration ?? null} days</p>
                  </div>
                </div>
              </div>
            ))}
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
            {milestones.map((milestone: { status?: string | null; phase?: string | null; date?: string | null; duration?: number | null }, index: number) => {
              const previousDuration = milestones
                .slice(0, index)
                .reduce((sum: number, m: { duration?: number | null }) => sum + (m.duration ?? 0), 0);
              const startPercentage = totalDuration > 0 ? (previousDuration / totalDuration) * 100 : 0;
              const duration = milestone.duration ?? 0;
              const widthPercentage = totalDuration > 0 ? (duration / totalDuration) * 100 : 0;

              return (
                <div key={index} className="relative">
                  <div className="flex items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 w-48 truncate">
                      {milestone.phase ?? null}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      {duration} days
                    </span>
                  </div>
                  <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
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
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {milestone.date}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
              {milestones.filter((m: { status?: string | null }) => m.status === 'completed').length}
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
              {milestones.filter((m: { status?: string | null }) => m.status === 'upcoming').length}
            </p>
            <p className="text-sm text-gray-500 mt-1">Milestones pending</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 