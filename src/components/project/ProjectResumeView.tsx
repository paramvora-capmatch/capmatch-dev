// src/components/project/ProjectResumeView.tsx

import React from 'react';
import { useRouter } from 'next/navigation';
import { ProjectProfile } from '@/types/enhanced-types';
import { Button } from '../ui/Button';
import { ResumeVersionHistory } from './ResumeVersionHistory';
import { Edit, MapPin, DollarSign, BarChart3, AlertCircle, ChevronDown, Building2, Calculator, TrendingUp, CheckCircle, Calendar, Map, Users, FileText, Home, Briefcase, Percent, Clock, Award, Sparkles, Loader2, Building, Globe, AlertTriangle } from 'lucide-react';
import { KeyValueDisplay } from '../om/KeyValueDisplay'; // Reusing this component
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { projectResumeFieldMetadata, getFieldsForSection } from '@/lib/project-resume-field-metadata';
import { supabase } from '@/lib/supabaseClient';
import { useCallback } from 'react';
import { useAutofill } from '@/hooks/useAutofill';
import formSchema from '@/lib/enhanced-project-form.schema.json';

interface ProjectResumeViewProps {
  project: ProjectProfile;
  onEdit: () => void;
  onVersionChange?: () => void;
}

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A'; 
    try { 
        return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); 
    } catch { 
        return 'Invalid Date'; 
    }
};

const formatPercent = (value: number | null | undefined, decimals: number = 1): string => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(decimals)}%`;
};

const formatDecimal = (value: number | null | undefined, decimals: number = 2): string => {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(decimals);
};

const formatBoolean = (value: boolean | string | null | undefined): string => {
    if (value === null || value === undefined) return 'N/A';
    
    // Handle string "true"/"false" from backend/mockAPI
    if (typeof value === 'string') {
        const normalized = value.toLowerCase().trim();
        if (normalized === 'true') return 'Yes';
        if (normalized === 'false') return 'No';
        // If it's not a boolean string, return as-is (shouldn't happen for Boolean fields)
        return value;
    }
    
    // Handle actual boolean values
    return value ? 'Yes' : 'No';
};

const formatArray = (value: any): string => {
    if (!value) return 'N/A';
    
    // If it's already an array, join it
    if (Array.isArray(value)) {
        if (value.length === 0) return 'N/A';
        return value.map(item => String(item)).join(', ');
    }
    
    // If it's a string, try to parse it as JSON array, or return as-is
    if (typeof value === 'string') {
        if (value.trim() === '') return 'N/A';
        // Try to parse as JSON array
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.map(item => String(item)).join(', ');
            }
        } catch {
            // Not JSON, return as string
            return value;
        }
    }
    
    // For other types, convert to string
    return String(value);
};

// Helper to get field value from project (handles both direct properties, nested content, and rich format)
const getFieldValue = (project: ProjectProfile, fieldId: string): any => {
    // First try direct property (flat format)
    if ((project as any)[fieldId] !== undefined) {
        return (project as any)[fieldId];
    }
    // Then try nested content (for JSONB fields)
    if ((project as any).content && (project as any).content[fieldId] !== undefined) {
        const item = (project as any).content[fieldId];
        // Check if it's in rich format {value, source, warnings}
        if (item && typeof item === 'object' && 'value' in item) {
            return item.value;
        }
        return item;
    }
    // Check metadata for rich format
    if (project._metadata && project._metadata[fieldId]) {
        return project._metadata[fieldId].value;
    }
    return undefined;
};

// Helper to check if a field has a value
const hasValue = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
};

// Helper to read field config (label/required) from the shared form schema
const getFieldConfig = (fieldId: string): any => {
    const fieldsConfig = (formSchema as any).fields || {};
    return fieldsConfig[fieldId] || {};
};

const isFieldRequiredFromSchema = (fieldId: string): boolean => {
    const config = getFieldConfig(fieldId);
    return typeof config.required === 'boolean' ? config.required : false;
};

// Helper to format field value based on data type
const formatFieldValue = (value: any, dataType?: string): string => {
    // Handle boolean values first, including false (which is a valid value)
    // Check this before hasValue() because false is falsy but is a valid boolean value
    if (typeof value === 'boolean') {
        if (dataType && dataType !== 'Boolean') {
            // Data type mismatch – underlying data is likely stale/incorrect.
            // Hide the bad value by treating it as missing.
            return 'N/A';
        }
        return formatBoolean(value);
    }
    
    if (!hasValue(value)) return 'N/A';
    
    // First, check the actual runtime type of the value
    // This handles cases where metadata says one thing but data is another
    
    // If it's actually an array, format as array
    if (Array.isArray(value)) {
        return formatArray(value);
    }
    
    // If it's actually a number, use metadata for specific formatting
    if (typeof value === 'number') {
        switch (dataType) {
            case 'Currency':
                return formatCurrency(value);
            case 'Percent':
                return formatPercent(value);
            case 'Decimal':
                return formatDecimal(value);
            case 'Integer':
                return value.toLocaleString();
            default:
                return value.toLocaleString();
        }
    }
    
    // If it's a string, check metadata for special handling
    if (typeof value === 'string') {
        switch (dataType) {
            case 'Date':
                return formatDate(value);
            case 'Boolean':
                // Handle string "true"/"false" from backend/mockAPI
                return formatBoolean(value);
            case 'Currency':
            case 'Percent':
            case 'Decimal':
            case 'Integer':
                // Try to parse and format
                const num = parseFloat(value);
                if (!isNaN(num)) {
                    return formatFieldValue(num, dataType);
                }
                return value;
            case 'Checklist':
            case 'Multi-select':
            case 'Checkbox':
                // Metadata says it should be an array, but it's a string
                // Return as-is (might be comma-separated or single value)
                return value;
            default:
                // Check if string is "true" or "false" even if dataType is not explicitly Boolean
                // This handles cases where backend returns boolean as string without proper metadata
                const normalized = value.toLowerCase().trim();
                if (normalized === 'true' || normalized === 'false') {
                    return formatBoolean(value);
                }
                return value;
        }
    }
    
    // For other types, use metadata-based formatting
    switch (dataType) {
        case 'Currency':
            return formatCurrency(value);
        case 'Percent':
            return formatPercent(value);
        case 'Decimal':
            return formatDecimal(value);
        case 'Integer':
            return typeof value === 'number' ? value.toLocaleString() : String(value);
        case 'Boolean':
            return formatBoolean(value);
        case 'Date':
            return formatDate(value);
        case 'Checklist':
        case 'Multi-select':
        case 'Checkbox':
            // Metadata says array, but value isn't - return as string
            return String(value);
        default:
            return String(value);
    }
};

// Animated field wrapper component for cascading fade-in effect
const AnimatedField: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1 },
                autofill: { 
                    opacity: [0, 1],
                    transition: {
                        duration: 0.5,
                        ease: [0.25, 0.46, 0.45, 0.94]
                    }
                }
            }}
        >
            {children}
        </motion.div>
    );
};

// Helper to get a readable label from field metadata
const getFieldLabel = (field: { fieldId: string; description: string }): string => {
    // Use a mapping for common fields to get better labels
    const labelMap: Record<string, string> = {
        'projectName': 'Project Name',
        'propertyAddressStreet': 'Street Address',
        'propertyAddressCity': 'City',
        'propertyAddressState': 'State',
        'propertyAddressZip': 'ZIP Code',
        'propertyAddressCounty': 'County',
        'parcelNumber': 'Parcel Number',
        'zoningDesignation': 'Zoning Designation',
        'assetType': 'Asset Type',
        'primaryAssetClass': 'Primary Asset Class',
        'projectPhase': 'Project Phase',
        'projectDescription': 'Project Description',
        'constructionType': 'Construction Type',
        'groundbreakingDate': 'Groundbreaking Date',
        'completionDate': 'Completion Date',
        'totalDevelopmentCost': 'Total Development Cost (TDC)',
        'loanAmountRequested': 'Loan Amount Requested',
        'loanType': 'Loan Type',
        'requestedLoanTerm': 'Requested Loan Term',
        'masterPlanName': 'Master Plan Name',
        'phaseNumber': 'Phase Number',
        'totalResidentialUnits': 'Total Residential Units',
        'totalResidentialNRSF': 'Total Residential NRSF',
        'averageUnitSize': 'Average Unit Size',
        'totalCommercialGRSF': 'Total Commercial GRSF',
        'grossBuildingArea': 'Gross Building Area',
        'numberOfStories': 'Number of Stories',
        'buildingType': 'Building Type',
        'parkingSpaces': 'Parking Spaces',
        'parkingRatio': 'Parking Ratio',
        'parkingType': 'Parking Type',
        'amenityList': 'Amenities',
        'amenitySF': 'Amenity Square Footage',
        'targetLtvPercent': 'Target LTV',
        'targetLtcPercent': 'Target LTC',
        'amortizationYears': 'Amortization (Years)',
        'interestOnlyPeriodMonths': 'Interest-Only Period (Months)',
        'interestRateType': 'Interest Rate Type',
        'targetCloseDate': 'Target Close Date',
        'recoursePreference': 'Recourse Preference',
        'useOfProceeds': 'Use of Proceeds',
        'submarketName': 'Submarket',
        'distanceToCBD': 'Distance to CBD',
        'distanceToEmployment': 'Distance to Employment',
        'distanceToTransit': 'Distance to Transit',
        'walkabilityScore': 'Walkability Score',
        'population3Mi': 'Population (3-mile radius)',
        'popGrowth201020': 'Population Growth (2010-2020)',
        'projGrowth202429': 'Projected Growth (2024-2029)',
        'medianHHIncome': 'Median Household Income',
        'renterOccupiedPercent': 'Renter Occupied %',
        'bachelorsDegreePercent': 'Bachelor\'s Degree %',
        'opportunityZone': 'Opportunity Zone',
        'affordableHousing': 'Affordable Housing',
        'affordableUnitsNumber': 'Affordable Units',
        'amiTargetPercent': 'AMI Target %',
        'taxExemption': 'Tax Exemption',
        'tifDistrict': 'TIF District',
        'taxAbatement': 'Tax Abatement',
        'paceFinancing': 'PACE Financing',
        'historicTaxCredits': 'Historic Tax Credits',
        'newMarketsCredits': 'New Markets Tax Credits',
        'landAcqClose': 'Land Acquisition Close',
        'entitlements': 'Entitlements',
        'finalPlans': 'Final Plans',
        'permitsIssued': 'Permits Issued',
        'verticalStart': 'Vertical Start',
        'firstOccupancy': 'First Occupancy',
        'stabilization': 'Stabilization Date',
        'preLeasedSF': 'Pre-leased Square Footage',
        'totalSiteAcreage': 'Total Site Acreage',
        'currentSiteStatus': 'Current Site Status',
        'topography': 'Topography',
        'environmental': 'Environmental Status',
        'utilities': 'Utilities',
        'siteAccess': 'Site Access',
        'proximityShopping': 'Proximity to Shopping',
        'proximityRestaurants': 'Proximity to Restaurants',
        'proximityParks': 'Proximity to Parks',
        'proximitySchools': 'Proximity to Schools',
        'proximityHospitals': 'Proximity to Hospitals',
        'sponsorEntityName': 'Sponsor Entity Name',
        'sponsorStructure': 'Sponsor Structure',
        'equityPartner': 'Equity Partner',
        'contactInfo': 'Contact Information',
    };
    
    if (labelMap[field.fieldId]) {
        return labelMap[field.fieldId];
    }
    
    // Fallback: use description, but clean it up
    const desc = field.description.split('.')[0];
    return desc || field.fieldId;
};

export const ProjectResumeView: React.FC<ProjectResumeViewProps> = ({
  project,
  onEdit,
  onVersionChange,
}) => {
    const completeness = project.completenessPercent ?? 0;
    const progressColor = completeness >= 100 ? 'bg-green-600' : 'bg-blue-600';
    const router = useRouter();
    const [showAutofillSuccess, setShowAutofillSuccess] = React.useState(false);
    const [autofillAnimationKey, setAutofillAnimationKey] = React.useState(0);
    const [expandedSubsections, setExpandedSubsections] = React.useState<Set<string>>(
        () => new Set()
    );
    
    // Use the shared autofill hook
    const projectAddress = project.propertyAddressStreet && project.propertyAddressCity && project.propertyAddressState
      ? `${project.propertyAddressStreet} | ${project.propertyAddressCity} ${project.propertyAddressState}, ${project.propertyAddressZip || ''}`.trim()
      : undefined;
    const { isAutofilling, showSparkles, handleAutofill } = useAutofill(project.id, { projectAddress });

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

  const handleVersionHistoryOpen = useCallback(() => {
    setCollapsed(false);
  }, []);

    const toggleSubsectionOptional = React.useCallback((subsectionKey: string) => {
        setExpandedSubsections((prev) => {
            const next = new Set(prev);
            if (next.has(subsectionKey)) {
                next.delete(subsectionKey);
            } else {
                next.add(subsectionKey);
            }
            return next;
        });
    }, []);

    const sectionIconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
        FileText,
        Building,
        DollarSign,
        Globe,
        Calendar,
        Map,
        Users,
        AlertTriangle,
    };

    const getDisplayLabel = (fieldId: string, fieldMeta?: { fieldId: string; description: string }): string => {
        const config = getFieldConfig(fieldId);
        if (config.label) return config.label as string;
        if (fieldMeta) return getFieldLabel(fieldMeta);
        return fieldId;
    };

    // handleAutofill is now provided by the useAutofill hook

    return (
        <div
            className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:shadow-blue-100/30"
            aria-expanded={!collapsed}
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
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAutofill();
                        }}
                        disabled={isAutofilling}
                        className={cn(
                            "group relative flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border transition-all duration-300 overflow-hidden text-base",
                            isAutofilling 
                                ? "border-blue-400 bg-blue-50 text-blue-700" 
                                : "border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 hover:border-blue-400 text-blue-700 hover:text-blue-800 shadow-sm hover:shadow-md"
                        )}
                    >
                        {isAutofilling ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                                <span className="text-sm font-medium whitespace-nowrap max-w-0 group-hover:max-w-[120px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">Autofilling...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                <span className="text-sm font-medium text-blue-700 whitespace-nowrap max-w-0 group-hover:max-w-[140px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">Autofill Resume</span>
                            </>
                        )}
                        {/* Sparkle animation overlay */}
                        {showSparkles && (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                {[...Array(20)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                                        initial={{
                                            x: '50%',
                                            y: '50%',
                                            opacity: 1,
                                            scale: 0,
                                        }}
                                        animate={{
                                            x: `${Math.random() * 100}%`,
                                            y: `${Math.random() * 100}%`,
                                            opacity: [1, 1, 0],
                                            scale: [0, 1.5, 0],
                                        }}
                                        transition={{
                                            duration: 0.8,
                                            delay: Math.random() * 0.3,
                                            ease: 'easeOut',
                                        }}
                                        style={{
                                            left: '50%',
                                            top: '50%',
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </Button>
                    <div className="ml-2">
                      <ResumeVersionHistory
                        projectId={project.id}
                        resourceId={project.projectResumeResourceId ?? null}
                        onRollbackSuccess={() => {
                          onVersionChange?.();
                        }}
                      onOpen={handleVersionHistoryOpen}
                      />
                    </div>
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
                        <div className="flex-1 p-6 relative overflow-hidden">
                            <motion.div
                                key={autofillAnimationKey > 0 ? `autofill-${autofillAnimationKey}` : 'normal'}
                                initial="hidden"
                                animate={showAutofillSuccess && autofillAnimationKey > 0 ? "autofill" : "visible"}
                                variants={{
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.05,
                                        },
                                    },
                                    autofill: {
                                        transition: {
                                            staggerChildren: 0.025,
                                            delayChildren: 0.05,
                                        },
                                    },
                                }}
                                className="space-y-6"
                            >
                                {(((formSchema as any).steps || []) as any[]).map((step: any, stepIndex: number) => {
                                    const sectionId = step.id as string;
                                    const IconComponent =
                                        (step.icon && sectionIconComponents[step.icon as string]) || MapPin;

                                    const allFieldIds: string[] = step.fields || [];
                                    const allFieldMetas = allFieldIds
                                        .map((id) => projectResumeFieldMetadata[id])
                                        .filter((m): m is { fieldId: string; description: string; dataType?: string } => !!m);

                                    const hasAnyValueInSection = allFieldMetas.some((field) => {
                                        const value = getFieldValue(project, field.fieldId);
                                        if (sectionId === 'special-considerations') {
                                            return value !== undefined && (hasValue(value) || value === false);
                                        }
                                        return hasValue(value);
                                    });

                                    // Also check for special table data per section
                                    const hasUnitMix =
                                        sectionId === 'property-specs' &&
                                        Array.isArray(getFieldValue(project, 'residentialUnitMix')) &&
                                        (getFieldValue(project, 'residentialUnitMix') as any[]).length > 0;
                                    const hasCommercialMix =
                                        sectionId === 'property-specs' &&
                                        Array.isArray(getFieldValue(project, 'commercialSpaceMix')) &&
                                        (getFieldValue(project, 'commercialSpaceMix') as any[]).length > 0;
                                    const hasRentComps =
                                        sectionId === 'market-context' &&
                                        Array.isArray(getFieldValue(project, 'rentComps')) &&
                                        (getFieldValue(project, 'rentComps') as any[]).length > 0;

                                    if (!hasAnyValueInSection && !hasUnitMix && !hasCommercialMix && !hasRentComps) {
                                        return null;
                                    }

                                    return (
                                        <motion.div
                                            key={sectionId}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: 0.1 * stepIndex }}
                                        >
                                            <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center">
                                                <IconComponent className="h-4 w-4 mr-2 text-blue-600" />
                                                {step.title}
                                            </h3>

                                            {Array.isArray(step.subsections) && step.subsections.length > 0 ? (
                                                <div className="space-y-4">
                                                    {step.subsections.map((subsection: any) => {
                                                        const subsectionId = subsection.id as string;
                                                        const subsectionKey = `${sectionId}::${subsectionId}`;
                                                        const subsectionFieldIds: string[] = subsection.fields || [];

                                                        const requiredFieldIds = subsectionFieldIds.filter((id) =>
                                                            isFieldRequiredFromSchema(id)
                                                        );
                                                        const optionalFieldIds = subsectionFieldIds.filter(
                                                            (id) => !isFieldRequiredFromSchema(id)
                                                        );

                                                        const showOptional = expandedSubsections.has(subsectionKey);
                                                        const visibleFieldIds = showOptional
                                                            ? subsectionFieldIds
                                                            : requiredFieldIds;

                                                        const visibleFieldMetas = visibleFieldIds
                                                            .map((id) => projectResumeFieldMetadata[id])
                                                            .filter(
                                                                (
                                                                    m
                                                                ): m is {
                                                                    fieldId: string;
                                                                    description: string;
                                                                    dataType?: string;
                                                                } => !!m
                                                            )
                                                            .filter((field) => {
                                                                // Special-case: drawSchedule is rendered as its own table later
                                                                if (field.fieldId === 'drawSchedule') {
                                                                    return false;
                                                                }
                                                                const value = getFieldValue(project, field.fieldId);
                                                                if (sectionId === 'special-considerations') {
                                                                    return (
                                                                        value !== undefined &&
                                                                        (hasValue(value) || value === false)
                                                                    );
                                                                }
                                                                return hasValue(value);
                                                            });

                                                        if (visibleFieldMetas.length === 0) {
                                                            return null;
                                                        }

                                                        const optionalCount = optionalFieldIds.length;

                                                        return (
                                                            <div
                                                                key={subsectionId}
                                                                className="space-y-3 rounded-md border border-gray-100 bg-gray-50/60 p-3"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <h4 className="text-sm font-semibold text-gray-800">
                                                                        {subsection.title}
                                                                    </h4>
                                                                    {optionalCount > 0 && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                toggleSubsectionOptional(subsectionKey)
                                                                            }
                                                                            className="text-xs font-medium text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline"
                                                                        >
                                                                            {showOptional
                                                                                ? 'Hide optional fields'
                                                                                : `Show ${optionalCount} optional field${
                                                                                      optionalCount > 1 ? 's' : ''
                                                                                  }`}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                                                    {visibleFieldMetas.map((field) => {
                                                                        const value = getFieldValue(project, field.fieldId);

                                                                        // Special handling for full address
                                                                        if (field.fieldId === 'propertyAddressStreet') {
                                                                            const street =
                                                                                getFieldValue(
                                                                                    project,
                                                                                    'propertyAddressStreet'
                                                                                ) || '';
                                                                            const city =
                                                                                getFieldValue(
                                                                                    project,
                                                                                    'propertyAddressCity'
                                                                                ) || '';
                                                                            const state =
                                                                                getFieldValue(
                                                                                    project,
                                                                                    'propertyAddressState'
                                                                                ) || '';
                                                                            const zip =
                                                                                getFieldValue(
                                                                                    project,
                                                                                    'propertyAddressZip'
                                                                                ) || '';
                                                                            const address = [street, city, state, zip]
                                                                                .filter(Boolean)
                                                                                .join(', ');
                                                                            if (!address) return null;

                                                                            return (
                                                                                <AnimatedField key={field.fieldId}>
                                                                                    <KeyValueDisplay
                                                                                        label="Address"
                                                                                        value={address}
                                                                                        fullWidth={true}
                                                                                    />
                                                                                </AnimatedField>
                                                                            );
                                                                        }

                                                                        // Skip individual address parts once combined
                                                                        if (
                                                                            [
                                                                                'propertyAddressCity',
                                                                                'propertyAddressState',
                                                                                'propertyAddressZip',
                                                                            ].includes(field.fieldId)
                                                                        ) {
                                                                            return null;
                                                                        }

                                                                        const formattedValue = formatFieldValue(
                                                                            value,
                                                                            field.dataType
                                                                        );
                                                                        const isFullWidth =
                                                                            field.dataType === 'Textarea' ||
                                                                            field.fieldId === 'projectDescription' ||
                                                                            field.fieldId === 'businessPlanSummary' ||
                                                                            field.fieldId === 'marketOverviewSummary' ||
                                                                            field.fieldId === 'contactInfo';

                                                                        return (
                                                                            <AnimatedField key={field.fieldId}>
                                                                                <KeyValueDisplay
                                                                                    label={getDisplayLabel(
                                                                                        field.fieldId,
                                                                                        field
                                                                                    )}
                                                                                    value={formattedValue}
                                                                                    fullWidth={isFullWidth}
                                                                                />
                                                                            </AnimatedField>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Special tables within sections */}
                                                    {sectionId === 'property-specs' && (
                                                        <>
                                                            {(() => {
                                                                const unitMix = getFieldValue(
                                                                    project,
                                                                    'residentialUnitMix'
                                                                );
                                                                if (
                                                                    !hasValue(unitMix) ||
                                                                    !Array.isArray(unitMix) ||
                                                                    unitMix.length === 0
                                                                )
                                                                    return null;

                                                                return (
                                                                    <div className="mt-4">
                                                                        <h4 className="text-sm font-semibold text-gray-600 mb-2">
                                                                            Residential Unit Mix
                                                                        </h4>
                                                                        <div className="overflow-x-auto">
                                                                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                                                <thead className="bg-gray-50">
                                                                                    <tr>
                                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                            Unit Type
                                                                                        </th>
                                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                            Count
                                                                                        </th>
                                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                            Avg SF
                                                                                        </th>
                                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                            Monthly Rent
                                                                                        </th>
                                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                            Total SF
                                                                                        </th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="bg-white divide-y divide-gray-200">
                                                                                    {unitMix.map((unit: any, idx: number) => (
                                                                                        <tr key={idx}>
                                                                                            <td className="px-3 py-2 whitespace-nowrap">
                                                                                                {unit.unitType || 'N/A'}
                                                                                            </td>
                                                                                            <td className="px-3 py-2 whitespace-nowrap">
                                                                                                {unit.unitCount?.toLocaleString() ||
                                                                                                    'N/A'}
                                                                                            </td>
                                                                                            <td className="px-3 py-2 whitespace-nowrap">
                                                                                                {unit.avgSF?.toLocaleString() ||
                                                                                                    'N/A'}
                                                                                            </td>
                                                                                            <td className="px-3 py-2 whitespace-nowrap">
                                                                                                {formatCurrency(unit.monthlyRent)}
                                                                                            </td>
                                                                                            <td className="px-3 py-2 whitespace-nowrap">
                                                                                                {unit.totalSF?.toLocaleString() ||
                                                                                                    'N/A'}
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}

                                                            {(() => {
                                                                const spaceMix = getFieldValue(
                                                                    project,
                                                                    'commercialSpaceMix'
                                                                );
                                                                if (
                                                                    !hasValue(spaceMix) ||
                                                                    !Array.isArray(spaceMix) ||
                                                                    spaceMix.length === 0
                                                                )
                                                                    return null;

                                                                return (
                                                                    <div className="mt-4">
                                                                        <h4 className="text-sm font-semibold text-gray-600 mb-2">
                                                                            Commercial Space Mix
                                                                        </h4>
                                                                        <div className="overflow-x-auto">
                                                                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                                                <thead className="bg-gray-50">
                                                                                    <tr>
                                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                            Space Type
                                                                                        </th>
                                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                            Square Footage
                                                                                        </th>
                                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                            Tenant
                                                                                        </th>
                                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                            Lease Term
                                                                                        </th>
                                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                            Annual Rent
                                                                                        </th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="bg-white divide-y divide-gray-200">
                                                                                    {spaceMix.map((space: any, idx: number) => (
                                                                                        <tr key={idx}>
                                                                                            <td className="px-3 py-2 whitespace-nowrap">
                                                                                                {space.spaceType || 'N/A'}
                                                                                            </td>
                                                                                            <td className="px-3 py-2 whitespace-nowrap">
                                                                                                {space.squareFootage?.toLocaleString() ||
                                                                                                    'N/A'}
                                                                                            </td>
                                                                                            <td className="px-3 py-2 whitespace-nowrap">
                                                                                                {space.tenant || 'N/A'}
                                                                                            </td>
                                                                                            <td className="px-3 py-2 whitespace-nowrap">
                                                                                                {space.leaseTerm || 'N/A'}
                                                                                            </td>
                                                                                            <td className="px-3 py-2 whitespace-nowrap">
                                                                                                {formatCurrency(space.annualRent)}
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </>
                                                    )}

                                                    {sectionId === 'financial-details' && (() => {
                                                        const legacyFields = [
                                                            { id: 'purchasePrice', label: 'Purchase Price', type: 'Currency' },
                                                            { id: 'totalProjectCost', label: 'Total Project Cost', type: 'Currency' },
                                                            { id: 'capexBudget', label: 'CapEx Budget', type: 'Currency' },
                                                            { id: 'propertyNoiT12', label: 'Current NOI (T12)', type: 'Currency' },
                                                            { id: 'stabilizedNoiProjected', label: 'Projected Stabilized NOI', type: 'Currency' },
                                                            { id: 'exitStrategy', label: 'Exit Strategy', type: 'Text' },
                                                            { id: 'businessPlanSummary', label: 'Business Plan Summary', type: 'Textarea' },
                                                            { id: 'marketOverviewSummary', label: 'Market Overview Summary', type: 'Textarea' },
                                                            { id: 'equityCommittedPercent', label: 'Equity Committed', type: 'Percent' },
                                                        ];

                                                        const legacyFieldsWithValues = legacyFields.filter((field) => {
                                                            const value = getFieldValue(project, field.id);
                                                            return hasValue(value);
                                                        });

                                                        if (legacyFieldsWithValues.length === 0) return null;

                                                        return (
                                                            <div className="mt-4">
                                                                <h4 className="text-sm font-semibold text-gray-600 mb-2">
                                                                    Additional Financial Information
                                                                </h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                                                    {legacyFieldsWithValues.map((field) => {
                                                                        const value = getFieldValue(project, field.id);
                                                                        const formattedValue = formatFieldValue(
                                                                            value,
                                                                            field.type
                                                                        );
                                                                        const isFullWidth = field.type === 'Textarea';

                                                                        return (
                                                                            <AnimatedField key={field.id}>
                                                                                <KeyValueDisplay
                                                                                    label={field.label}
                                                                                    value={formattedValue}
                                                                                    fullWidth={isFullWidth}
                                                                                />
                                                                            </AnimatedField>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                    {sectionId === 'market-context' && (() => {
                                                    {sectionId === 'timeline' && (() => {
                                                        const drawSchedule = getFieldValue(project, 'drawSchedule');
                                                        if (!hasValue(drawSchedule) || !Array.isArray(drawSchedule) || drawSchedule.length === 0) {
                                                            return null;
                                                        }

                                                        return (
                                                            <div className="mt-4">
                                                                <h4 className="text-sm font-semibold text-gray-600 mb-2">
                                                                    Draw Schedule
                                                                </h4>
                                                                <div className="overflow-x-auto">
                                                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                                        <thead className="bg-gray-50">
                                                                            <tr>
                                                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                    Draw #
                                                                                </th>
                                                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                    % Complete
                                                                                </th>
                                                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                    Amount
                                                                                </th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                                            {drawSchedule.map((row: any, idx: number) => (
                                                                                <tr key={idx}>
                                                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                                                        {row.drawNumber ?? 'N/A'}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                                                        {typeof row.percentComplete === 'number'
                                                                                            ? `${row.percentComplete.toFixed(0)}%`
                                                                                            : 'N/A'}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                                                        {typeof row.amount === 'number'
                                                                                            ? formatCurrency(row.amount)
                                                                                            : 'N/A'}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}

                                                        const rentComps = getFieldValue(project, 'rentComps');
                                                        if (
                                                            !hasValue(rentComps) ||
                                                            !Array.isArray(rentComps) ||
                                                            rentComps.length === 0
                                                        )
                                                            return null;

                                                        return (
                                                            <div className="mt-4">
                                                                <h4 className="text-sm font-semibold text-gray-600 mb-2">
                                                                    Rent Comparables
                                                                </h4>
                                                                <div className="overflow-x-auto">
                                                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                                        <thead className="bg-gray-50">
                                                                            <tr>
                                                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                    Property Name
                                                                                </th>
                                                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                    Address
                                                                                </th>
                                                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                    Distance
                                                                                </th>
                                                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                    Year Built
                                                                                </th>
                                                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                    Units
                                                                                </th>
                                                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                    Occupancy
                                                                                </th>
                                                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                    Avg Rent/Month
                                                                                </th>
                                                                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                                    Rent/PSF
                                                                                </th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                                            {rentComps.map((comp: any, idx: number) => (
                                                                                <tr key={idx}>
                                                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                                                        {comp.propertyName || 'N/A'}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                                                        {comp.address || 'N/A'}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                                                        {comp.distance
                                                                                            ? `${comp.distance.toFixed(2)} mi`
                                                                                            : 'N/A'}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                                                        {comp.yearBuilt || 'N/A'}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                                                        {comp.totalUnits?.toLocaleString() ||
                                                                                            'N/A'}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                                                        {comp.occupancyPercent
                                                                                            ? `${comp.occupancyPercent.toFixed(1)}%`
                                                                                            : 'N/A'}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                                                        {formatCurrency(comp.avgRentMonth)}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                                                        {comp.rentPSF
                                                                                            ? `$${comp.rentPSF.toFixed(2)}`
                                                                                            : 'N/A'}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                // Fallback: section without explicit subsections
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                                    {allFieldMetas
                                                        .filter((field) => {
                                                            const value = getFieldValue(project, field.fieldId);
                                                            if (sectionId === 'special-considerations') {
                                                                return (
                                                                    value !== undefined &&
                                                                    (hasValue(value) || value === false)
                                                                );
                                                            }
                                                            return hasValue(value);
                                                        })
                                                        .map((field) => {
                                                            const value = getFieldValue(project, field.fieldId);
                                                            const formattedValue = formatFieldValue(
                                                                value,
                                                                field.dataType
                                                            );
                                                            const isFullWidth =
                                                                field.dataType === 'Textarea' ||
                                                                field.fieldId === 'projectDescription' ||
                                                                field.fieldId === 'businessPlanSummary' ||
                                                                field.fieldId === 'marketOverviewSummary' ||
                                                                field.fieldId === 'contactInfo';

                                                            return (
                                                                <AnimatedField key={field.fieldId}>
                                                                    <KeyValueDisplay
                                                                        label={getDisplayLabel(field.fieldId, field)}
                                                                        value={formattedValue}
                                                                        fullWidth={isFullWidth}
                                                                    />
                                                                </AnimatedField>
                                                            );
                                                        })}
                                            </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
