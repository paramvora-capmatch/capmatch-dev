// src/components/project/ProjectResumeView.tsx

import React from 'react';
import { useRouter } from 'next/navigation';
import { ProjectProfile } from '@/types/enhanced-types';
import { Button } from '../ui/Button';
import { Edit, MapPin, DollarSign, BarChart3, AlertCircle, ChevronDown, Building2, Calculator, TrendingUp, CheckCircle, Calendar, Map, Users } from 'lucide-react';
import { KeyValueDisplay } from '../om/KeyValueDisplay'; // Reusing this component
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

interface ProjectResumeViewProps {
  project: ProjectProfile;
  onEdit: () => void;
}

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A'; try { return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); } catch { return 'Invalid Date'; }
};

export const ProjectResumeView: React.FC<ProjectResumeViewProps> = ({ project, onEdit }) => {
    const completeness = project.completenessPercent ?? 0;
    const progressColor = completeness >= 100 ? 'bg-green-600' : 'bg-blue-600';
    const router = useRouter();

    // Collapsible state (persisted per project)
    const [collapsed, setCollapsed] = React.useState<boolean>(() => {
        try {
            return JSON.parse(
                typeof window !== 'undefined'
                    ? localStorage.getItem(`resumeCollapsed:${project.id}`) || 'true'
                    : 'true'
            );
        } catch {
            return true;
        }
    });

    React.useEffect(() => {
        try {
            localStorage.setItem(`resumeCollapsed:${project.id}`, JSON.stringify(collapsed));
        } catch {}
    }, [collapsed, project?.id]);

    return (
        <div
            className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:shadow-blue-100/30 cursor-pointer"
            aria-expanded={!collapsed}
            role="button"
            tabIndex={0}
            onClick={() => setCollapsed((v) => !v)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setCollapsed((v) => !v);
                }
            }}
        >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="sticky top-[-8px] z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm rounded-t-2xl flex flex-row items-center justify-between relative px-3 py-4">
                <div className="ml-3 flex items-center gap-3">
                    <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                        <AlertCircle className="h-5 w-5 text-blue-600 mr-2 animate-pulse" />
                        Project Resume
                    </h2>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 overflow-hidden text-base"
                    >
                        <Edit className="h-5 w-5 text-gray-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[100px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">Edit</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }}
                        aria-label={collapsed ? 'Expand resume' : 'Collapse resume'}
                        className="flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 overflow-hidden text-base"
                    >
                        <ChevronDown className={cn("h-5 w-5 text-gray-600 flex-shrink-0 transition-transform duration-200", collapsed ? '' : 'rotate-180')} />
                        <span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[160px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
                          {collapsed ? 'Show Project Details' : 'Hide Project Details'}
                        </span>
                    </Button>
                </div>
                <div />
            </div>

            <AnimatePresence initial={false}>
                {!collapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden relative z-10"
                    >
                        <div className="flex-1 p-6">
                            <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.1,
                                        },
                                    },
                                }}
                                className="space-y-6"
                            >
                                {/* Basic Info */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center"><MapPin className="h-4 w-4 mr-2 text-blue-600" /> Location & Type</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                        <KeyValueDisplay label="Address" value={`${project.propertyAddressStreet || ''}, ${project.propertyAddressCity || ''}, ${project.propertyAddressState || ''} ${project.propertyAddressZip || ''}`} />
                                        <KeyValueDisplay label="County" value={project.propertyAddressCounty} />
                                        <KeyValueDisplay label="Asset Type" value={project.assetType} />
                                        <KeyValueDisplay label="Project Phase" value={project.projectPhase} />
                                        <KeyValueDisplay label="Project Description" value={project.projectDescription} fullWidth />
                                    </div>
                                </motion.div>

                                {/* Loan Info */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: 0.1 }}
                                >
                                    <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center"><DollarSign className="h-4 w-4 mr-2 text-blue-600" /> Financing Request</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                        <KeyValueDisplay label="Requested Amount" value={formatCurrency(project.loanAmountRequested)} />
                                        <KeyValueDisplay label="Capital Type" value={project.loanType} />
                                        <KeyValueDisplay label="Target LTV" value={project.targetLtvPercent ? `${project.targetLtvPercent}%` : 'N/A'} />
                                        <KeyValueDisplay label="Target LTC" value={project.targetLtcPercent ? `${project.targetLtcPercent}%` : 'N/A'} />
                                        <KeyValueDisplay label="Amortization" value={project.amortizationYears ? `${project.amortizationYears} Years` : 'N/A'} />
                                        <KeyValueDisplay label="Interest-Only" value={project.interestOnlyPeriodMonths ? `${project.interestOnlyPeriodMonths} Months` : 'N/A'} />
                                        <KeyValueDisplay label="Rate Type" value={project.interestRateType} />
                                        <KeyValueDisplay label="Recourse" value={project.recoursePreference} />
                                        <KeyValueDisplay label="Target Close Date" value={formatDate(project.targetCloseDate)} />
                                        <KeyValueDisplay label="Use of Proceeds" value={project.useOfProceeds} fullWidth />
                                    </div>
                                </motion.div>

                                {/* Financials */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: 0.2 }}
                                >
                                    <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center"><BarChart3 className="h-4 w-4 mr-2 text-blue-600" /> Financials & Strategy</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                        <KeyValueDisplay label="Purchase Price" value={formatCurrency(project.purchasePrice)} />
                                        <KeyValueDisplay label="Total Project Cost" value={formatCurrency(project.totalProjectCost)} />
                                        <KeyValueDisplay label="CapEx Budget" value={formatCurrency(project.capexBudget)} />
                                        <KeyValueDisplay label="Equity Committed" value={project.equityCommittedPercent ? `${project.equityCommittedPercent}%` : 'N/A'} />
                                        <KeyValueDisplay label="Current NOI (T12)" value={formatCurrency(project.propertyNoiT12)} />
                                        <KeyValueDisplay label="Projected Stabilized NOI" value={formatCurrency(project.stabilizedNoiProjected)} />
                                        <KeyValueDisplay label="Exit Strategy" value={project.exitStrategy} />
                                        <KeyValueDisplay label="Business Plan" value={project.businessPlanSummary} fullWidth />
                                        <KeyValueDisplay label="Market Overview" value={project.marketOverviewSummary} fullWidth />
                                    </div>
                                </motion.div>

                                {/* Property Specifications */}
                                {(project as any).totalResidentialUnits || (project as any).totalCommercialGRSF || (project as any).numberOfStories ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.3 }}
                                    >
                                        <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center"><Building2 className="h-4 w-4 mr-2 text-blue-600" /> Property Specifications</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                            {(project as any).totalResidentialUnits && (
                                                <KeyValueDisplay label="Total Residential Units" value={(project as any).totalResidentialUnits?.toString() || 'N/A'} />
                                            )}
                                            {(project as any).totalResidentialNRSF && (
                                                <KeyValueDisplay label="Total Residential NRSF" value={(project as any).totalResidentialNRSF?.toLocaleString() || 'N/A'} />
                                            )}
                                            {(project as any).totalCommercialGRSF && (
                                                <KeyValueDisplay label="Total Commercial GRSF" value={(project as any).totalCommercialGRSF?.toLocaleString() || 'N/A'} />
                                            )}
                                            {(project as any).grossBuildingArea && (
                                                <KeyValueDisplay label="Gross Building Area" value={(project as any).grossBuildingArea?.toLocaleString() || 'N/A'} />
                                            )}
                                            {(project as any).numberOfStories && (
                                                <KeyValueDisplay label="Number of Stories" value={(project as any).numberOfStories?.toString() || 'N/A'} />
                                            )}
                                            {(project as any).parkingSpaces && (
                                                <KeyValueDisplay label="Parking Spaces" value={(project as any).parkingSpaces?.toString() || 'N/A'} />
                                            )}
                                            {(project as any).parkingRatio && (
                                                <KeyValueDisplay label="Parking Ratio" value={(project as any).parkingRatio?.toFixed(2) || 'N/A'} />
                                            )}
                                        </div>
                                    </motion.div>
                                ) : null}

                                {/* Development Budget */}
                                {(project as any).landAcquisition || (project as any).baseConstruction || (project as any).totalDevelopmentCost ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.4 }}
                                    >
                                        <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center"><Calculator className="h-4 w-4 mr-2 text-blue-600" /> Development Budget</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                            {(project as any).landAcquisition && (
                                                <KeyValueDisplay label="Land Acquisition" value={formatCurrency((project as any).landAcquisition)} />
                                            )}
                                            {(project as any).baseConstruction && (
                                                <KeyValueDisplay label="Base Construction" value={formatCurrency((project as any).baseConstruction)} />
                                            )}
                                            {(project as any).contingency && (
                                                <KeyValueDisplay label="Contingency" value={formatCurrency((project as any).contingency)} />
                                            )}
                                            {(project as any).ffe && (
                                                <KeyValueDisplay label="FF&E" value={formatCurrency((project as any).ffe)} />
                                            )}
                                            {(project as any).aeFees && (
                                                <KeyValueDisplay label="A&E Fees" value={formatCurrency((project as any).aeFees)} />
                                            )}
                                            {(project as any).developerFee && (
                                                <KeyValueDisplay label="Developer Fee" value={formatCurrency((project as any).developerFee)} />
                                            )}
                                            {(project as any).interestReserve && (
                                                <KeyValueDisplay label="Interest Reserve" value={formatCurrency((project as any).interestReserve)} />
                                            )}
                                            {(project as any).workingCapital && (
                                                <KeyValueDisplay label="Working Capital" value={formatCurrency((project as any).workingCapital)} />
                                            )}
                                            {(project as any).totalDevelopmentCost && (
                                                <KeyValueDisplay label="Total Development Cost (TDC)" value={formatCurrency((project as any).totalDevelopmentCost)} />
                                            )}
                                        </div>
                                    </motion.div>
                                ) : null}

                                {/* Market Context */}
                                {(project as any).submarketName || (project as any).population3Mi || (project as any).medianHHIncome ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.5 }}
                                    >
                                        <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center"><TrendingUp className="h-4 w-4 mr-2 text-blue-600" /> Market Context</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                            {(project as any).submarketName && (
                                                <KeyValueDisplay label="Submarket" value={(project as any).submarketName} />
                                            )}
                                            {(project as any).walkabilityScore && (
                                                <KeyValueDisplay label="Walkability Score" value={(project as any).walkabilityScore?.toString() || 'N/A'} />
                                            )}
                                            {(project as any).population3Mi && (
                                                <KeyValueDisplay label="Population (3-mile)" value={(project as any).population3Mi?.toLocaleString() || 'N/A'} />
                                            )}
                                            {(project as any).medianHHIncome && (
                                                <KeyValueDisplay label="Median Household Income" value={formatCurrency((project as any).medianHHIncome)} />
                                            )}
                                            {(project as any).renterOccupiedPercent && (
                                                <KeyValueDisplay label="% Renter Occupied" value={`${(project as any).renterOccupiedPercent?.toFixed(1) || 'N/A'}%`} />
                                            )}
                                            {(project as any).popGrowth201020 && (
                                                <KeyValueDisplay label="Population Growth (2010-2020)" value={`${(project as any).popGrowth201020?.toFixed(1) || 'N/A'}%`} />
                                            )}
                                        </div>
                                    </motion.div>
                                ) : null}

                                {/* Special Considerations */}
                                {(project as any).opportunityZone !== undefined || (project as any).affordableHousing !== undefined || (project as any).taxExemption !== undefined ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.6 }}
                                    >
                                        <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-blue-600" /> Special Considerations</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                            {(project as any).opportunityZone !== undefined && (
                                                <KeyValueDisplay label="Opportunity Zone" value={(project as any).opportunityZone ? 'Yes' : 'No'} />
                                            )}
                                            {(project as any).affordableHousing !== undefined && (
                                                <KeyValueDisplay label="Affordable Housing" value={(project as any).affordableHousing ? 'Yes' : 'No'} />
                                            )}
                                            {(project as any).affordableUnitsNumber && (
                                                <KeyValueDisplay label="Affordable Units" value={(project as any).affordableUnitsNumber?.toString() || 'N/A'} />
                                            )}
                                            {(project as any).amiTargetPercent && (
                                                <KeyValueDisplay label="AMI Target %" value={`${(project as any).amiTargetPercent || 'N/A'}%`} />
                                            )}
                                            {(project as any).taxExemption !== undefined && (
                                                <KeyValueDisplay label="Tax Exemption" value={(project as any).taxExemption ? 'Yes' : 'No'} />
                                            )}
                                            {(project as any).taxAbatement !== undefined && (
                                                <KeyValueDisplay label="Tax Abatement" value={(project as any).taxAbatement ? 'Yes' : 'No'} />
                                            )}
                                        </div>
                                    </motion.div>
                                ) : null}

                                {/* Timeline & Milestones */}
                                {(project as any).groundbreakingDate || (project as any).completionDate || (project as any).firstOccupancy || (project as any).entitlements ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.7 }}
                                    >
                                        <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center"><Calendar className="h-4 w-4 mr-2 text-blue-600" /> Timeline & Milestones</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                            {(project as any).groundbreakingDate && (
                                                <KeyValueDisplay label="Groundbreaking Date" value={formatDate((project as any).groundbreakingDate)} />
                                            )}
                                            {(project as any).completionDate && (
                                                <KeyValueDisplay label="Completion Date" value={formatDate((project as any).completionDate)} />
                                            )}
                                            {(project as any).firstOccupancy && (
                                                <KeyValueDisplay label="First Occupancy" value={formatDate((project as any).firstOccupancy)} />
                                            )}
                                            {(project as any).stabilization && (
                                                <KeyValueDisplay label="Stabilization Date" value={formatDate((project as any).stabilization)} />
                                            )}
                                            {(project as any).entitlements && (
                                                <KeyValueDisplay label="Entitlements" value={(project as any).entitlements} />
                                            )}
                                            {(project as any).permitsIssued && (
                                                <KeyValueDisplay label="Permits Status" value={(project as any).permitsIssued} />
                                            )}
                                        </div>
                                    </motion.div>
                                ) : null}

                                {/* Site & Context */}
                                {(project as any).totalSiteAcreage || (project as any).currentSiteStatus || (project as any).siteAccess ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.8 }}
                                    >
                                        <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center"><Map className="h-4 w-4 mr-2 text-blue-600" /> Site & Context</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                            {(project as any).totalSiteAcreage && (
                                                <KeyValueDisplay label="Total Site Acreage" value={`${(project as any).totalSiteAcreage || 'N/A'} acres`} />
                                            )}
                                            {(project as any).currentSiteStatus && (
                                                <KeyValueDisplay label="Current Site Status" value={(project as any).currentSiteStatus} />
                                            )}
                                            {(project as any).siteAccess && (
                                                <KeyValueDisplay label="Site Access" value={(project as any).siteAccess} />
                                            )}
                                            {(project as any).proximityShopping && (
                                                <KeyValueDisplay label="Proximity to Shopping" value={(project as any).proximityShopping} />
                                            )}
                                        </div>
                                    </motion.div>
                                ) : null}

                                {/* Sponsor Information */}
                                {(project as any).sponsorEntityName || (project as any).equityPartner || (project as any).contactInfo ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.9 }}
                                    >
                                        <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center"><Users className="h-4 w-4 mr-2 text-blue-600" /> Sponsor Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                            {(project as any).sponsorEntityName && (
                                                <KeyValueDisplay label="Sponsor Entity Name" value={(project as any).sponsorEntityName} />
                                            )}
                                            {(project as any).sponsorStructure && (
                                                <KeyValueDisplay label="Sponsor Structure" value={(project as any).sponsorStructure} />
                                            )}
                                            {(project as any).equityPartner && (
                                                <KeyValueDisplay label="Equity Partner" value={(project as any).equityPartner} />
                                            )}
                                            {(project as any).contactInfo && (
                                                <KeyValueDisplay label="Contact Info" value={(project as any).contactInfo} fullWidth />
                                            )}
                                        </div>
                                    </motion.div>
                                ) : null}
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
