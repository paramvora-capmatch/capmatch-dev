// src/components/om/OfferingMemorandum.tsx
import React from "react";
import { ProjectProfile, BorrowerProfile } from "@/types/enhanced-types";
import { Section } from "./Section";
import { KeyValueDisplay } from "./KeyValueDisplay";
import { PlaceholderBlock } from "./PlaceholderBlock";
import {
  MapPin,
  Building,
  DollarSign,
  User,
  FileText,
  BarChart3,
  Image as ImageIcon,
  Users,
} from "lucide-react";
import Image from "next/image";

interface OfferingMemorandumProps {
  project: ProjectProfile;
  profile: BorrowerProfile;
}

// Helper to format currency
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
// Helper to format date
const formatDate = (dateString?: string | null): string => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Invalid Date";
  }
};

export const OfferingMemorandum: React.FC<OfferingMemorandumProps> = ({
  project,
  profile,
}) => {
  return (
    <div className="om-container space-y-8 md:space-y-12 print:space-y-6">
      {/* OM Header */}
      <div className="text-center mb-8 md:mb-12 border-b pb-6 print:border-none print:mb-6">
        <Image
          src="/CapMatchLogo.png"
          alt="CapMatch Logo"
          className="h-10 mx-auto mb-4 print:h-8"
          width={40}
          height={40}
        />
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
          {project.projectName}
        </h1>
        <p className="text-lg text-gray-500 mt-1">
          {project.assetType} - {project.projectPhase}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {project.propertyAddressStreet}, {project.propertyAddressCity},{" "}
          {project.propertyAddressState} {project.propertyAddressZip}
        </p>
        <p className="text-xs text-gray-400 mt-4">
          Generated: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Executive Summary (Placeholder) */}
      <Section title="Executive Summary" icon={<FileText />}>
        <PlaceholderBlock
          height="h-32"
          text="Provide a high-level overview of the investment opportunity, key highlights, and requested financing."
        />
      </Section>

      {/* Property Details */}
      <Section title="Property Details" icon={<MapPin />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <KeyValueDisplay
            label="Address"
            value={`${project.propertyAddressStreet}, ${project.propertyAddressCity}, ${project.propertyAddressState} ${project.propertyAddressZip}`}
          />
          <KeyValueDisplay
            label="County"
            value={project.propertyAddressCounty || "N/A"}
          />
          <KeyValueDisplay label="Asset Type" value={project.assetType} />
          {/* Add more property specific fields like Year Built, Units, SqFt if available */}
          <KeyValueDisplay label="Year Built" value="-" />
          <KeyValueDisplay label="Units / SqFt" value="-" />
          <KeyValueDisplay label="Occupancy" value="-" />
        </div>
        <PlaceholderBlock
          height="h-48"
          text="Property Photos / Map Placeholder"
          className="mt-6"
          icon={<ImageIcon />}
        />
        <h4 className="text-lg font-semibold mt-6 mb-3 text-gray-700">
          Property Description
        </h4>
        <p className="text-gray-600 leading-relaxed">
          {project.projectDescription || "No description provided."}
        </p>
      </Section>

      {/* Financing Request */}
      <Section title="Financing Request" icon={<DollarSign />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <KeyValueDisplay
            label="Requested Amount"
            value={formatCurrency(project.loanAmountRequested)}
            isLarge={true}
          />
          <KeyValueDisplay
            label="Capital Type"
            value={project.loanType}
            isLarge={true}
          />
          <KeyValueDisplay label="Project Phase" value={project.projectPhase} />
          <KeyValueDisplay
            label="Target LTV"
            value={`${project.targetLtvPercent || 0}%`}
          />
          {(project.targetLtcPercent ?? 0) > 0 && (
            <KeyValueDisplay
              label="Target LTC"
              value={`${project.targetLtcPercent ?? 0}%`}
            />
          )}
          <KeyValueDisplay
            label="Amortization"
            value={`${project.amortizationYears || 0} Years`}
          />
          <KeyValueDisplay
            label="Interest-Only Period"
            value={`${project.interestOnlyPeriodMonths || 0} Months`}
          />
          <KeyValueDisplay
            label="Interest Rate Type"
            value={project.interestRateType}
          />
          <KeyValueDisplay
            label="Recourse Preference"
            value={project.recoursePreference}
          />
          <KeyValueDisplay
            label="Target Closing Date"
            value={formatDate(project.targetCloseDate)}
          />
          <KeyValueDisplay
            label="Use of Proceeds"
            value={project.useOfProceeds || "N/A"}
            fullWidth={true}
          />
        </div>
      </Section>

      {/* Project Financials */}
      <Section title="Project Financials & Strategy" icon={<BarChart3 />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
          <KeyValueDisplay
            label="Purchase Price / Basis"
            value={formatCurrency(project.purchasePrice)}
          />
          <KeyValueDisplay
            label="Total Project Cost"
            value={formatCurrency(project.totalProjectCost)}
          />
          <KeyValueDisplay
            label="CapEx / Construction Budget"
            value={formatCurrency(project.capexBudget)}
          />
          <KeyValueDisplay
            label="Equity Committed"
            value={`${project.equityCommittedPercent || 0}%`}
          />
          <KeyValueDisplay
            label="Current / TTM NOI"
            value={formatCurrency(project.propertyNoiT12)}
          />
          <KeyValueDisplay
            label="Projected Stabilized NOI"
            value={formatCurrency(project.stabilizedNoiProjected)}
          />
          <KeyValueDisplay label="Exit Strategy" value={project.exitStrategy} />
        </div>
        <h4 className="text-lg font-semibold mt-6 mb-3 text-gray-700">
          Business Plan Summary
        </h4>
        <p className="text-gray-600 leading-relaxed">
          {project.businessPlanSummary || "No summary provided."}
        </p>
        <PlaceholderBlock
          height="h-60"
          text="Detailed Pro Forma / Financial Projections Placeholder"
          className="mt-6"
        />
      </Section>

      {/* Market Overview (Placeholder) */}
      <Section title="Market Overview" icon={<Building />}>
        <h4 className="text-lg font-semibold mb-3 text-gray-700">
          Market Summary
        </h4>
        <p className="text-gray-600 leading-relaxed mb-6">
          {project.marketOverviewSummary || "No summary provided."}
        </p>
        <PlaceholderBlock
          height="h-40"
          text="Market Comparables / Demographics Placeholder"
        />
      </Section>

      {/* Sponsor Information */}
      <Section title="Sponsor Information" icon={<User />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
          <KeyValueDisplay
            label="Sponsor Legal Name"
            value={profile.fullLegalName}
          />
          <KeyValueDisplay
            label="Primary Entity"
            value={`${profile.primaryEntityName} (${profile.primaryEntityStructure})`}
          />
          <KeyValueDisplay
            label="Years Experience"
            value={profile.yearsCREExperienceRange}
          />
          <KeyValueDisplay label="Contact Email" value={profile.contactEmail} />
          <KeyValueDisplay label="Contact Phone" value={profile.contactPhone} />
        </div>
        <h4 className="text-lg font-semibold mt-6 mb-3 text-gray-700">
          Experience Highlights
        </h4>
        <div className="text-sm text-gray-600 space-y-1 mb-4">
          <p>
            <strong>Asset Classes:</strong>{" "}
            {profile.assetClassesExperience?.join(", ") || "N/A"}
          </p>
          <p>
            <strong>Geographic Markets:</strong>{" "}
            {profile.geographicMarketsExperience?.join(", ") || "N/A"}
          </p>
          <p>
            <strong>Deal Volume Closed:</strong>{" "}
            {profile.totalDealValueClosedRange || "N/A"}
          </p>
        </div>
        <h4 className="text-lg font-semibold mt-6 mb-3 text-gray-700">
          Sponsor Bio
        </h4>
        <p className="text-gray-600 leading-relaxed mb-6">
          {profile.bioNarrative || "No bio provided."}
        </p>

        {/* Placeholder for Principals - Needs data from ProjectContext.projectPrincipals and BorrowerProfileContext.principals */}
        <Section
          title="Key Principals"
          icon={<Users />}
          level={2}
          className="mt-6"
        >
          <PlaceholderBlock
            height="h-24"
            text="List of Key Principals and Guarantors Placeholder (Requires fetching linked principals)"
          />
        </Section>
      </Section>

      {/* Disclaimer */}
      <div className="pt-8 mt-8 border-t print:mt-4">
        <p className="text-xs text-gray-500 italic text-center">
          Disclaimer: This document is for informational purposes only and does
          not constitute an offer to lend or invest. All information is provided
          by the borrower and has not been independently verified by CapMatch.
          Financial projections are estimates and actual results may differ.
          Potential lenders should conduct their own due diligence.
        </p>
      </div>
    </div>
  );
};
