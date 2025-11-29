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
          <KeyValueDisplay
            label="Primary Asset Class"
            value={project.primaryAssetClass || "N/A"}
          />
          <KeyValueDisplay
            label="Construction Type"
            value={project.constructionType || "N/A"}
          />
          <KeyValueDisplay
            label="Parcel Number(s)"
            value={project.parcelNumber || "N/A"}
          />
          <KeyValueDisplay
            label="Zoning Designation"
            value={project.zoningDesignation || "N/A"}
          />
          <KeyValueDisplay
            label="Current Zoning"
            value={project.currentZoning || "N/A"}
          />
          <KeyValueDisplay
            label="Total Residential Units"
            value={project.totalResidentialUnits?.toLocaleString() || "N/A"}
          />
          <KeyValueDisplay
            label="Total Residential NRSF"
            value={project.totalResidentialNRSF?.toLocaleString() || "N/A"}
          />
          <KeyValueDisplay
            label="Average Unit Size"
            value={project.averageUnitSize ? `${project.averageUnitSize} SF` : "N/A"}
          />
          <KeyValueDisplay
            label="Total Commercial GRSF"
            value={project.totalCommercialGRSF?.toLocaleString() || "N/A"}
          />
          <KeyValueDisplay
            label="Gross Building Area"
            value={project.grossBuildingArea?.toLocaleString() || "N/A"}
          />
          <KeyValueDisplay
            label="Number of Stories"
            value={project.numberOfStories?.toString() || "N/A"}
          />
          <KeyValueDisplay
            label="Building Type"
            value={project.buildingType || "N/A"}
          />
          <KeyValueDisplay
            label="Parking Spaces"
            value={project.parkingSpaces?.toString() || "N/A"}
          />
          <KeyValueDisplay
            label="Parking Ratio"
            value={project.parkingRatio ? `${project.parkingRatio.toFixed(2)}` : "N/A"}
          />
          <KeyValueDisplay
            label="Parking Type"
            value={project.parkingType || "N/A"}
          />
          {project.amenityList && project.amenityList.length > 0 && (
            <KeyValueDisplay
              label="Amenities"
              value={project.amenityList.join(", ")}
            />
          )}
          {project.adaCompliantUnitsPercent !== undefined && (
            <KeyValueDisplay
              label="ADA Compliant Units"
              value={`${project.adaCompliantUnitsPercent}%`}
            />
          )}
          <KeyValueDisplay
            label="LEED/Sustainability Rating"
            value={project.leedSustainabilityRating || "N/A"}
          />
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
            label="Requested Loan Term"
            value={project.requestedLoanTerm || "N/A"}
          />
          <KeyValueDisplay
            label="Interest Rate"
            value={project.interestRate ? `${project.interestRate}%` : "N/A"}
          />
          <KeyValueDisplay
            label="Underwriting Rate"
            value={project.underwritingRate ? `${project.underwritingRate}%` : "N/A"}
          />
          <KeyValueDisplay
            label="Amortization"
            value={project.amortization || "N/A"}
          />
          <KeyValueDisplay
            label="Prepayment Terms"
            value={project.prepaymentTerms || "N/A"}
          />
          <KeyValueDisplay
            label="Recourse"
            value={project.recourse || project.recoursePreference || "N/A"}
          />
          <KeyValueDisplay
            label="All-In Rate"
            value={project.allInRate ? `${project.allInRate}%` : "N/A"}
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
          <KeyValueDisplay
            label="Total Development Cost (TDC)"
            value={formatCurrency(project.totalDevelopmentCost)}
          />
        </div>

        {/* Development Budget */}
        <h4 className="text-lg font-semibold mt-6 mb-3 text-gray-700">
          Development Budget (Uses of Funds)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
          <KeyValueDisplay
            label="Land Acquisition"
            value={formatCurrency(project.landAcquisition)}
          />
          <KeyValueDisplay
            label="Base Construction"
            value={formatCurrency(project.baseConstruction)}
          />
          <KeyValueDisplay
            label="Contingency"
            value={formatCurrency(project.contingency)}
          />
          <KeyValueDisplay label="FF&E" value={formatCurrency(project.ffe)} />
          <KeyValueDisplay
            label="Construction Fees"
            value={formatCurrency(project.constructionFees)}
          />
          <KeyValueDisplay
            label="A&E Fees"
            value={formatCurrency(project.aeFees)}
          />
          <KeyValueDisplay
            label="Third Party Reports"
            value={formatCurrency(project.thirdPartyReports)}
          />
          <KeyValueDisplay
            label="Legal & Org"
            value={formatCurrency(project.legalAndOrg)}
          />
          <KeyValueDisplay
            label="Title & Recording"
            value={formatCurrency(project.titleAndRecording)}
          />
          <KeyValueDisplay
            label="Taxes During Construction"
            value={formatCurrency(project.taxesDuringConstruction)}
          />
          <KeyValueDisplay
            label="Working Capital"
            value={formatCurrency(project.workingCapital)}
          />
          <KeyValueDisplay
            label="Developer Fee"
            value={formatCurrency(project.developerFee)}
          />
          <KeyValueDisplay
            label="PFC/Structuring Fee"
            value={formatCurrency(project.pfcStructuringFee || project.structuringFee)}
          />
          <KeyValueDisplay
            label="Loan Fees"
            value={formatCurrency(project.loanFees)}
          />
          <KeyValueDisplay
            label="Interest Reserve"
            value={formatCurrency(project.interestReserve)}
          />
          <KeyValueDisplay
            label="Relocation Costs"
            value={formatCurrency(project.relocationCosts)}
          />
          <KeyValueDisplay
            label="Syndication Costs"
            value={formatCurrency(project.syndicationCosts)}
          />
          <KeyValueDisplay
            label="Environmental Remediation"
            value={formatCurrency(project.enviroRemediation)}
          />
        </div>

        {/* Sources of Funds */}
        <h4 className="text-lg font-semibold mt-6 mb-3 text-gray-700">
          Sources of Funds
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
          <KeyValueDisplay
            label="Senior Loan Amount"
            value={formatCurrency(project.seniorLoanAmount)}
          />
          <KeyValueDisplay
            label="Sponsor Equity"
            value={formatCurrency(project.sponsorEquity)}
          />
          <KeyValueDisplay
            label="Tax Credit Equity"
            value={formatCurrency(project.taxCreditEquity)}
          />
          <KeyValueDisplay
            label="Gap Financing"
            value={formatCurrency(project.gapFinancing)}
          />
        </div>

        {/* Operating Expenses */}
        <h4 className="text-lg font-semibold mt-6 mb-3 text-gray-700">
          Operating Expenses (Proforma Year 1)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
          <KeyValueDisplay
            label="Real Estate Taxes"
            value={formatCurrency(project.realEstateTaxes)}
          />
          <KeyValueDisplay
            label="Insurance"
            value={formatCurrency(project.insurance)}
          />
          <KeyValueDisplay
            label="Utilities"
            value={formatCurrency(project.utilities)}
          />
          <KeyValueDisplay
            label="Repairs & Maintenance"
            value={formatCurrency(project.repairsAndMaintenance)}
          />
          <KeyValueDisplay
            label="Management Fee"
            value={formatCurrency(project.managementFee)}
          />
          <KeyValueDisplay
            label="General & Admin"
            value={formatCurrency(project.generalAndAdmin)}
          />
          <KeyValueDisplay
            label="Payroll"
            value={formatCurrency(project.payroll)}
          />
          <KeyValueDisplay
            label="Reserves"
            value={formatCurrency(project.reserves)}
          />
          <KeyValueDisplay
            label="Marketing/Leasing"
            value={formatCurrency(project.marketingLeasing)}
          />
          <KeyValueDisplay
            label="Service Coordination"
            value={formatCurrency(project.serviceCoordination)}
          />
        </div>

        {/* Investment Metrics */}
        <h4 className="text-lg font-semibold mt-6 mb-3 text-gray-700">
          Investment Metrics
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
          <KeyValueDisplay
            label="NOI (Year 1)"
            value={formatCurrency(project.noiYear1)}
          />
          <KeyValueDisplay
            label="Yield on Cost"
            value={project.yieldOnCost ? `${project.yieldOnCost}%` : "N/A"}
          />
          <KeyValueDisplay
            label="Cap Rate"
            value={project.capRate ? `${project.capRate}%` : "N/A"}
          />
          <KeyValueDisplay
            label="Stabilized Value"
            value={formatCurrency(project.stabilizedValue)}
          />
          <KeyValueDisplay
            label="LTV"
            value={project.ltv ? `${project.ltv.toFixed(1)}%` : "N/A"}
          />
          <KeyValueDisplay
            label="Debt Yield"
            value={project.debtYield ? `${project.debtYield}%` : "N/A"}
          />
          <KeyValueDisplay
            label="DSCR"
            value={project.dscr ? `${project.dscr.toFixed(2)}x` : "N/A"}
          />
          <KeyValueDisplay
            label="Trended NOI (Yr 1)"
            value={formatCurrency(project.trendedNOIYear1)}
          />
          <KeyValueDisplay
            label="Untrended NOI (Yr 1)"
            value={formatCurrency(project.untrendedNOIYear1)}
          />
          <KeyValueDisplay
            label="Trended Yield"
            value={project.trendedYield ? `${project.trendedYield}%` : "N/A"}
          />
          <KeyValueDisplay
            label="Untrended Yield"
            value={project.untrendedYield ? `${project.untrendedYield}%` : "N/A"}
          />
          <KeyValueDisplay
            label="Inflation Assumption"
            value={project.inflationAssumption ? `${project.inflationAssumption}%` : "N/A"}
          />
          <KeyValueDisplay
            label="DSCR Stress Test"
            value={project.dscrStressTest ? `${project.dscrStressTest.toFixed(2)}x` : "N/A"}
          />
          <KeyValueDisplay
            label="Portfolio LTV"
            value={project.portfolioLTV ? `${project.portfolioLTV.toFixed(1)}%` : "N/A"}
          />
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

      {/* Market Overview */}
      <Section title="Market Overview" icon={<Building />}>
        <h4 className="text-lg font-semibold mb-3 text-gray-700">
          Market Summary
        </h4>
        <p className="text-gray-600 leading-relaxed mb-6">
          {project.marketOverviewSummary || "No summary provided."}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
          <KeyValueDisplay
            label="Submarket Name"
            value={project.submarketName || "N/A"}
          />
          <KeyValueDisplay
            label="Distance to CBD"
            value={project.distanceToCBD ? `${project.distanceToCBD} miles` : "N/A"}
          />
          <KeyValueDisplay
            label="Distance to Employment"
            value={project.distanceToEmployment || "N/A"}
          />
          <KeyValueDisplay
            label="Distance to Transit"
            value={project.distanceToTransit ? `${project.distanceToTransit} miles` : "N/A"}
          />
          <KeyValueDisplay
            label="Walkability Score"
            value={project.walkabilityScore?.toString() || "N/A"}
          />
          <KeyValueDisplay
            label="Population (3-mi radius)"
            value={project.population3Mi?.toLocaleString() || "N/A"}
          />
          <KeyValueDisplay
            label="Pop Growth (2010-20)"
            value={project.popGrowth201020 ? `${project.popGrowth201020}%` : "N/A"}
          />
          <KeyValueDisplay
            label="Proj Growth (2024-29)"
            value={project.projGrowth202429 ? `${project.projGrowth202429}%` : "N/A"}
          />
          <KeyValueDisplay
            label="Median HH Income"
            value={formatCurrency(project.medianHHIncome)}
          />
          <KeyValueDisplay
            label="% Renter Occupied"
            value={project.renterOccupiedPercent ? `${project.renterOccupiedPercent}%` : "N/A"}
          />
          <KeyValueDisplay
            label="% Bachelor's Degree"
            value={project.bachelorsDegreePercent ? `${project.bachelorsDegreePercent}%` : "N/A"}
          />
          <KeyValueDisplay
            label="Absorption Rate"
            value={project.absorptionRate ? `${project.absorptionRate} units/month` : "N/A"}
          />
          <KeyValueDisplay
            label="Penetration Rate"
            value={project.penetrationRate ? `${project.penetrationRate}%` : "N/A"}
          />
          <KeyValueDisplay
            label="North Star Comp"
            value={project.northStarComp || "N/A"}
          />
          <KeyValueDisplay
            label="Infrastructure Project"
            value={project.infrastructureProject || "N/A"}
          />
          <KeyValueDisplay
            label="Project Budget"
            value={formatCurrency(project.projectBudget)}
          />
          <KeyValueDisplay
            label="Infra. Completion"
            value={project.infraCompletion || "N/A"}
          />
        </div>

        {/* Rent Comps */}
        {project.rentComps && project.rentComps.length > 0 && (
          <>
            <h4 className="text-lg font-semibold mt-6 mb-3 text-gray-700">
              Rent Comparables
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Property Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Distance
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Units
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Occupancy
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Avg Rent/Month
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Rent/SF
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {project.rentComps.map((comp, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {comp.propertyName}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {comp.distance ? `${comp.distance} mi` : "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {comp.totalUnits || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {comp.occupancyPercent ? `${comp.occupancyPercent}%` : "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {comp.avgRentMonth ? formatCurrency(comp.avgRentMonth) : "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {comp.rentPSF ? `$${comp.rentPSF.toFixed(2)}` : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Sale Comps */}
        {project.saleComps && project.saleComps.length > 0 && (
          <>
            <h4 className="text-lg font-semibold mt-6 mb-3 text-gray-700">
              Sale Comparables
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Property Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Sale Price/Unit
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Cap Rate
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Sale Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {project.saleComps.map((comp, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {comp.propertyName}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {comp.salePricePerUnit ? formatCurrency(comp.salePricePerUnit) : "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {comp.capRate ? `${comp.capRate}%` : "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {comp.saleDate ? formatDate(comp.saleDate) : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      {/* Special Considerations */}
      {(project.opportunityZone !== undefined ||
        project.affordableHousing !== undefined ||
        project.taxExemption !== undefined) && (
        <Section title="Special Considerations" icon={<FileText />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {project.opportunityZone !== undefined && (
              <KeyValueDisplay
                label="Opportunity Zone"
                value={project.opportunityZone ? "Yes" : "No"}
              />
            )}
            {project.affordableHousing !== undefined && (
              <KeyValueDisplay
                label="Affordable Housing"
                value={project.affordableHousing ? "Yes" : "No"}
              />
            )}
            {project.affordableUnitsNumber !== undefined && (
              <KeyValueDisplay
                label="Affordable Units #"
                value={project.affordableUnitsNumber.toString()}
              />
            )}
            {project.amiTargetPercent !== undefined && (
              <KeyValueDisplay
                label="AMI Target %"
                value={`${project.amiTargetPercent}%`}
              />
            )}
            {project.taxExemption !== undefined && (
              <KeyValueDisplay
                label="Tax Exemption"
                value={project.taxExemption ? "Yes" : "No"}
              />
            )}
            {project.exemptionStructure && (
              <KeyValueDisplay
                label="Exemption Structure"
                value={project.exemptionStructure}
              />
            )}
            {project.sponsoringEntity && (
              <KeyValueDisplay
                label="Sponsoring Entity"
                value={project.sponsoringEntity}
              />
            )}
            {project.exemptionTerm !== undefined && (
              <KeyValueDisplay
                label="Exemption Term"
                value={`${project.exemptionTerm} years`}
              />
            )}
            {project.incentiveStacking && project.incentiveStacking.length > 0 && (
              <KeyValueDisplay
                label="Incentive Stacking"
                value={project.incentiveStacking.join(", ")}
              />
            )}
            {project.tifDistrict !== undefined && (
              <KeyValueDisplay
                label="TIF District"
                value={project.tifDistrict ? "Yes" : "No"}
              />
            )}
            {project.taxAbatement !== undefined && (
              <KeyValueDisplay
                label="Tax Abatement"
                value={project.taxAbatement ? "Yes" : "No"}
              />
            )}
            {project.seismicPMLRisk && (
              <KeyValueDisplay
                label="Seismic/PML Risk"
                value={project.seismicPMLRisk}
              />
            )}
          </div>
        </Section>
      )}

      {/* Timeline & Milestones */}
      {(project.groundbreakingDate ||
        project.completionDate ||
        project.landAcqClose) && (
        <Section title="Timeline & Milestones" icon={<FileText />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <KeyValueDisplay
              label="Land Acq. Close"
              value={formatDate(project.landAcqClose)}
            />
            <KeyValueDisplay
              label="Entitlements"
              value={project.entitlements || "N/A"}
            />
            <KeyValueDisplay
              label="Final Plans"
              value={project.finalPlans || "N/A"}
            />
            <KeyValueDisplay
              label="Permits Issued"
              value={project.permitsIssued || "N/A"}
            />
            <KeyValueDisplay
              label="Groundbreaking"
              value={formatDate(project.groundbreakingDate)}
            />
            <KeyValueDisplay
              label="Vertical Start"
              value={formatDate(project.verticalStart)}
            />
            <KeyValueDisplay
              label="Substantial Comp"
              value={formatDate(project.substantialComp)}
            />
            <KeyValueDisplay
              label="First Occupancy"
              value={formatDate(project.firstOccupancy)}
            />
            <KeyValueDisplay
              label="Stabilization"
              value={formatDate(project.stabilization)}
            />
            {project.preLeasedSF !== undefined && (
              <KeyValueDisplay
                label="Pre-Leased SF"
                value={project.preLeasedSF.toLocaleString()}
              />
            )}
            {project.absorptionProjection !== undefined && (
              <KeyValueDisplay
                label="Absorption Projection"
                value={`${project.absorptionProjection} units/month`}
              />
            )}
          </div>
        </Section>
      )}

      {/* Site & Context */}
      {(project.totalSiteAcreage ||
        project.currentSiteStatus ||
        project.floodZone) && (
        <Section title="Site & Context" icon={<MapPin />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {project.totalSiteAcreage !== undefined && (
              <KeyValueDisplay
                label="Total Site Acreage"
                value={`${project.totalSiteAcreage} acres`}
              />
            )}
            <KeyValueDisplay
              label="Current Site Status"
              value={project.currentSiteStatus || "N/A"}
            />
            <KeyValueDisplay
              label="Topography"
              value={project.topography || "N/A"}
            />
            <KeyValueDisplay
              label="Environmental"
              value={project.environmental || "N/A"}
            />
            <KeyValueDisplay
              label="Utilities"
              value={project.utilities || "N/A"}
            />
            {project.utilityCapacity && (
              <KeyValueDisplay
                label="Utility Capacity"
                value={project.utilityCapacity}
                fullWidth={true}
              />
            )}
            {project.geotechSoilsRep && (
              <KeyValueDisplay
                label="Geotech/Soils Rep"
                value={project.geotechSoilsRep}
                fullWidth={true}
              />
            )}
            {project.floodZone && (
              <KeyValueDisplay
                label="Flood Zone"
                value={project.floodZone}
              />
            )}
            {project.siteAccess && (
              <KeyValueDisplay
                label="Site Access"
                value={project.siteAccess}
                fullWidth={true}
              />
            )}
            {project.proximityShopping && (
              <KeyValueDisplay
                label="Proximity Shopping"
                value={project.proximityShopping}
              />
            )}
            {project.proximityRestaurants && (
              <KeyValueDisplay
                label="Proximity Dining"
                value={project.proximityRestaurants}
              />
            )}
            {project.proximityParks && (
              <KeyValueDisplay
                label="Proximity Parks"
                value={project.proximityParks}
              />
            )}
            {project.proximitySchools && (
              <KeyValueDisplay
                label="Proximity Schools"
                value={project.proximitySchools}
              />
            )}
            {project.proximityHospitals && (
              <KeyValueDisplay
                label="Proximity Hospitals"
                value={project.proximityHospitals}
              />
            )}
            {project.topEmployers && (
              <KeyValueDisplay
                label="Top Employers"
                value={project.topEmployers}
                fullWidth={true}
              />
            )}
          </div>
        </Section>
      )}

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
          {project.sponsorEntityName && (
            <KeyValueDisplay
              label="Sponsor Entity Name"
              value={project.sponsorEntityName}
            />
          )}
          {project.sponsorStructure && (
            <KeyValueDisplay
              label="Sponsor Structure"
              value={project.sponsorStructure}
            />
          )}
          {project.equityPartner && (
            <KeyValueDisplay
              label="Equity Partner"
              value={project.equityPartner}
            />
          )}
          {project.contactInfo && (
            <KeyValueDisplay
              label="Contact Info"
              value={project.contactInfo}
              fullWidth={true}
            />
          )}
          {project.sponsorExpScore !== undefined && (
            <KeyValueDisplay
              label="Sponsor Exp. Score"
              value={`${project.sponsorExpScore}/10`}
            />
          )}
          {project.priorDevelopments !== undefined && (
            <KeyValueDisplay
              label="Prior Developments"
              value={`${project.priorDevelopments} units`}
            />
          )}
          {project.netWorth !== undefined && (
            <KeyValueDisplay
              label="Net Worth"
              value={formatCurrency(project.netWorth)}
            />
          )}
          {project.guarantorLiquidity !== undefined && (
            <KeyValueDisplay
              label="Guarantor Liquidity"
              value={formatCurrency(project.guarantorLiquidity)}
            />
          )}
          {project.portfolioDSCR !== undefined && (
            <KeyValueDisplay
              label="Portfolio DSCR"
              value={`${project.portfolioDSCR.toFixed(2)}x`}
            />
          )}
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
