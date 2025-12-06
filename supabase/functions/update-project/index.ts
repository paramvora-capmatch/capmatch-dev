// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Import section grouping utilities (inline for Deno compatibility)
// We'll implement a simplified version here since we can't import TS files directly
function isGroupedFormat(data: Record<string, unknown>): boolean {
  const keys = Object.keys(data);
  // Check for new format with actual section IDs
  // Note: In a Deno function, we can't import schema-utils, so we use a hardcoded list
  // This should match the section IDs from enhanced-project-form.schema.json
  const knownSectionIds = [
    'basic-info', 'property-specs', 'dev-budget', 'loan-info', 'financials',
    'market-context', 'special-considerations', 'timeline', 'site-context', 'sponsor-info'
  ];
  return keys.some(key => knownSectionIds.includes(key));
}

// Hardcoded field-to-subsection mapping (matching enhanced-project-form.schema.json)
// This is used as a fallback when formSchema is not available
const FIELD_TO_SUBSECTION: Record<string, string> = {
  // basic-info section subsections
  "projectName": "project-identity",
  "propertyAddressStreet": "project-identity",
  "propertyAddressCity": "project-identity",
  "propertyAddressState": "project-identity",
  "propertyAddressZip": "project-identity",
  "propertyAddressCounty": "project-identity",
  "dealStatus": "project-identity",
  "assetType": "classification",
  "constructionType": "classification",
  "projectPhase": "classification",
  "projectDescription": "classification",
  "parcelNumber": "classification",
  "zoningDesignation": "classification",
  // Add more mappings as needed for other sections
};

// Helper to get subsection for a field (simplified - in production, load from schema)
function getSubsectionForField(fieldId: string, sectionId: string, formSchema: any): string | null {
  // First try to use formSchema if available
  if (formSchema) {
    const steps = formSchema?.steps || [];
    
    for (const step of steps) {
      if (step.id !== sectionId) continue;
      
      const subsections = step.subsections || [];
      for (const subsection of subsections) {
        const fields = subsection.fields || [];
        if (fields.includes(fieldId)) {
          return subsection.id;
        }
      }
      
      // If section has no subsections, return null
      if (subsections.length === 0) {
        return null;
      }
    }
  }
  
  // Fallback to hardcoded mapping
  return FIELD_TO_SUBSECTION[fieldId] || null;
}

function groupBySections(flatData: Record<string, unknown>, formSchema?: any): Record<string, any> {
  // Simplified field-to-section mapping (matching Backend/services/field_section_mapping.py)
  const FIELD_TO_SECTION: Record<string, string> = {
    "projectName": "basic-info", "propertyAddressStreet": "basic-info", "propertyAddressCity": "basic-info",
    "propertyAddressState": "basic-info", "propertyAddressZip": "basic-info", "propertyAddressCounty": "basic-info",
    "parcelNumber": "basic-info", "zoningDesignation": "basic-info",
    "primaryAssetClass": "basic-info", "constructionType": "basic-info", "groundbreakingDate": "basic-info",
    "completionDate": "basic-info", "totalDevelopmentCost": "basic-info", "loanAmountRequested": "basic-info",
    "loanType": "basic-info", "requestedLoanTerm": "basic-info", "masterPlanName": "basic-info",
    "phaseNumber": "basic-info", "projectDescription": "basic-info", "projectPhase": "basic-info", "assetType": "basic-info",
    "totalResidentialUnits": "property-specs", "totalResidentialNRSF": "property-specs", "averageUnitSize": "property-specs",
    "totalCommercialGRSF": "property-specs", "grossBuildingArea": "property-specs", "numberOfStories": "property-specs",
    "buildingType": "property-specs", "parkingSpaces": "property-specs", "parkingRatio": "property-specs",
    "parkingType": "property-specs", "amenityList": "property-specs", "amenitySF": "property-specs",
    "landAcquisition": "dev-budget", "baseConstruction": "dev-budget", "contingency": "dev-budget",
    "ffe": "dev-budget", "softCostsTotal": "dev-budget", "constructionFees": "dev-budget",
    "aeFees": "dev-budget", "thirdPartyReports": "dev-budget", "legalOrg": "dev-budget",
    "titleRecording": "dev-budget", "taxesDuringConst": "dev-budget", "workingCapital": "dev-budget",
    "developerFee": "dev-budget", "pfcStructuringFee": "dev-budget", "financingCosts": "dev-budget",
    "interestReserve": "dev-budget", "seniorLoanAmount": "financials", "sponsorEquity": "financials",
    "interestRate": "loan-info", "underwritingRate": "loan-info", "amortization": "loan-info",
    "prepaymentTerms": "loan-info", "recourse": "loan-info", "permTakeoutPlanned": "loan-info",
    "realEstateTaxes": "financials", "insurance": "financials", "utilities": "financials",
    "repairsMaint": "financials", "managementFee": "financials", "generalAdmin": "financials",
    "payroll": "financials", "reserves": "financials", "noiYear1": "financials",
    "yieldOnCost": "financials", "capRate": "financials", "stabilizedValue": "financials",
    "ltv": "financials", "debtYield": "financials", "dscr": "financials",
    "purchasePrice": "financials", "totalProjectCost": "financials", "capexBudget": "financials",
    "equityCommittedPercent": "financials", "propertyNoiT12": "financials", "stabilizedNoiProjected": "financials",
    "exitStrategy": "financials", "businessPlanSummary": "financials", "marketOverviewSummary": "financials",
    "targetLtvPercent": "loan-info", "targetLtcPercent": "loan-info", "amortizationYears": "loan-info",
    "interestOnlyPeriodMonths": "loan-info", "interestRateType": "loan-info", "targetCloseDate": "loan-info",
    "recoursePreference": "loan-info", "useOfProceeds": "loan-info",
    "submarketName": "market-context", "distanceToCBD": "market-context", "distanceToEmployment": "market-context",
    "distanceToTransit": "market-context", "walkabilityScore": "market-context", "population3Mi": "market-context",
    "popGrowth201020": "market-context", "projGrowth202429": "market-context", "medianHHIncome": "market-context",
    "renterOccupiedPercent": "market-context", "bachelorsDegreePercent": "market-context", "rentComps": "market-context",
    "opportunityZone": "special-considerations", "affordableHousing": "special-considerations",
    "affordableUnitsNumber": "special-considerations", "amiTargetPercent": "special-considerations",
    "taxExemption": "special-considerations", "tifDistrict": "special-considerations", "taxAbatement": "special-considerations",
    "paceFinancing": "special-considerations", "historicTaxCredits": "special-considerations", "newMarketsCredits": "special-considerations",
    "landAcqClose": "timeline", "entitlements": "timeline", "finalPlans": "timeline",
    "permitsIssued": "timeline", "groundbreaking": "timeline", "verticalStart": "timeline",
    "firstOccupancy": "timeline", "stabilization": "timeline", "preLeasedSF": "timeline",
    "totalSiteAcreage": "site-context", "currentSiteStatus": "site-context", "topography": "site-context",
    "environmental": "site-context", "siteAccess": "site-context", "proximityShopping": "site-context",
    "proximityRestaurants": "site-context", "proximityParks": "site-context", "proximitySchools": "site-context",
    "proximityHospitals": "site-context",
    "sponsorEntityName": "sponsor-info", "sponsorStructure": "sponsor-info", "equityPartner": "sponsor-info", "contactInfo": "sponsor-info",
  };
  
  const grouped: Record<string, any> = {};
  
  for (const [fieldId, fieldValue] of Object.entries(flatData)) {
    if (fieldId.startsWith('_') || fieldId === 'projectSections' || fieldId === 'borrowerSections' || fieldId === 'completenessPercent') continue;
    
    const sectionId = FIELD_TO_SECTION[fieldId];
    if (sectionId) {
      if (!grouped[sectionId]) {
        grouped[sectionId] = {};
      }
      
      // Check if this section has subsections
      const subsectionId = formSchema ? getSubsectionForField(fieldId, sectionId, formSchema) : null;
      
      if (subsectionId) {
        // Section has subsections - nest field in subsection
        if (!grouped[sectionId][subsectionId]) {
          grouped[sectionId][subsectionId] = {};
        }
        grouped[sectionId][subsectionId][fieldId] = fieldValue;
      } else {
        // Section has no subsections - place field directly in section
        grouped[sectionId][fieldId] = fieldValue;
      }
    } else {
      if (!grouped["unknown"]) grouped["unknown"] = {};
      grouped["unknown"][fieldId] = fieldValue;
    }
  }
  
  return grouped;
}

function ungroupFromSections(groupedData: Record<string, unknown>, formSchema?: any): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  
  for (const [sectionKey, sectionData] of Object.entries(groupedData)) {
    // Preserve special root-level keys
    if (sectionKey.startsWith('_') || sectionKey === 'completenessPercent' || 
        sectionKey === 'projectSections' || sectionKey === 'borrowerSections') {
      flat[sectionKey] = sectionData;
      continue;
    }
    
    if (!sectionData || typeof sectionData !== 'object' || Array.isArray(sectionData)) {
      // Not a valid section structure - treat as field
      flat[sectionKey] = sectionData;
      continue;
    }
    
    // New format - check if section has subsections
    let hasSubsections = false;
    if (formSchema) {
      const steps = formSchema.steps || [];
      for (const step of steps) {
        if (step.id === sectionKey) {
          const subsections = step.subsections || [];
          if (subsections.length > 0) {
            const firstKey = Object.keys(sectionData)[0];
            const subsectionIds = subsections.map((sub: any) => sub.id);
            hasSubsections = firstKey && subsectionIds.includes(firstKey);
          }
          break;
        }
      }
    }
    
    if (hasSubsections) {
      // Section has subsections - iterate through subsections
      for (const [subsectionId, subsectionData] of Object.entries(sectionData as Record<string, unknown>)) {
        if (subsectionData && typeof subsectionData === 'object' && !Array.isArray(subsectionData)) {
          for (const [fieldId, fieldValue] of Object.entries(subsectionData as Record<string, unknown>)) {
            flat[fieldId] = fieldValue;
          }
        } else {
          // Invalid subsection structure - treat as field
          flat[subsectionId] = subsectionData;
        }
      }
    } else {
      // Section has no subsections - fields are directly in section
      for (const [fieldId, fieldValue] of Object.entries(sectionData as Record<string, unknown>)) {
        flat[fieldId] = fieldValue;
      }
    }
  }
  
  return flat;
}

type CoreUpdates = {
  name?: string;
  assigned_advisor_id?: string | null;
};

type ResumeUpdates = Record<string, unknown>;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization header required");
    const jwt = authHeader.replace("Bearer ", "");

    const { project_id, core_updates, resume_updates } = (await req.json()) as {
      project_id: string;
      core_updates?: CoreUpdates;
      resume_updates?: ResumeUpdates;
    };

    if (!project_id) throw new Error("project_id is required");

    // Use a client authenticated as the caller so RLS enforces permissions
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    // Optionally verify user session
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) throw new Error("Authentication failed");

    // 1) Update core project fields (if any)
    if (core_updates && Object.keys(core_updates).length > 0) {
      const { error: projectError } = await supabase
        .from("projects")
        .update(core_updates)
        .eq("id", project_id);
      if (projectError) throw new Error(`Failed to update project: ${projectError.message}`);
    }

    // 2) Update resume JSONB (merge existing with incoming partial)
    if (resume_updates && Object.keys(resume_updates).length > 0) {
      // Use pointer logic to get the current resume (same as getProjectWithResume)
      const { data: resource } = await supabase
        .from("resources")
        .select("current_version_id")
        .eq("resource_type", "PROJECT_RESUME")
        .eq("project_id", project_id)
        .maybeSingle();

      let existing: { content: Record<string, unknown> } | null = null;
      let fetchError = null;

      if (resource?.current_version_id) {
        // Pointer exists: Fetch that specific version
        const result = await supabase
          .from("project_resumes")
          .select("id, content")
          .eq("id", resource.current_version_id)
          .single();
        existing = result.data;
        fetchError = result.error;
      } else {
        // No pointer: Fallback to fetching the latest by date
        const result = await supabase
          .from("project_resumes")
          .select("id, content")
          .eq("project_id", project_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        existing = result.data;
        fetchError = result.error;
      }

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(`Failed to read resume: ${fetchError.message}`);
      }

      let existingContent = (existing?.content ?? {}) as Record<string, unknown>;
      
      // Check if existing content is in section-grouped format and ungroup if needed
      // Note: We don't have access to formSchema in this Deno function, so we use simplified logic
      if (isGroupedFormat(existingContent)) {
        existingContent = ungroupFromSections(existingContent) as Record<string, unknown>;
      }
      
      // Handle rich data format merging
      // If resume_updates contains _metadata, convert it to rich format
      const metadata = (resume_updates as any)._metadata;
      let finalContentFlat: Record<string, unknown> = { ...existingContent };
      const rootKeys: Record<string, unknown> = {};
      
      // Helper to normalize any legacy `source`/`sources`/string into a single
      // SourceMetadata-like object. The backend schema uses:
      //   { value, source: { type, name?, derivation? }, warnings, other_values }
      const toSourceObject = (input: any): any => {
        if (!input) return { type: "user_input" };

        // Already a SourceMetadata-like object
        if (typeof input === "object" && input !== null && "type" in input) {
          return input;
        }

        // Legacy array form – pick the first entry
        if (Array.isArray(input) && input.length > 0) {
          const first = input[0];
          if (typeof first === "object" && first !== null && "type" in first) {
            return first;
          }
          if (typeof first === "string") {
            const normalized = first.toLowerCase().trim();
            if (normalized === "user_input" || normalized === "user input") {
              return { type: "user_input" };
            }
            return { type: "document", name: first };
          }
        }

        // Legacy string source
        if (typeof input === "string") {
          const normalized = input.toLowerCase().trim();
          if (normalized === "user_input" || normalized === "user input") {
            return { type: "user_input" };
          }
          return { type: "document", name: input };
        }

        return { type: "user_input" };
      };
      
      if (metadata) {
        // Convert metadata to rich format and merge
        for (const key in resume_updates) {
          if (key === '_metadata') continue;

          // Reserved root-level keys (e.g. _lockedFields / _lockedSections) should stay at the top level
          if (key.startsWith('_') || key === 'projectSections' || key === 'borrowerSections') {
            rootKeys[key] = resume_updates[key];
            continue;
          }
          
          const value = resume_updates[key];
          const meta = metadata[key];
          
          if (meta) {
            // Save in rich format using single `source` object and optional other_values
            const metaAny: any = meta;
            const existingItem = existingContent[key];

            const primarySourceInput =
              metaAny.source !== undefined
                ? metaAny.source
                : Array.isArray(metaAny.sources) && metaAny.sources.length > 0
                ? metaAny.sources[0]
                : undefined;

            finalContentFlat[key] = {
              value,
              source: toSourceObject(primarySourceInput),
              warnings: metaAny.warnings || [],
              other_values: metaAny.other_values || [],
            };
          } else {
            // Check if existing content has rich format for this field
            const existingItem = existingContent[key];
            if (
              existingItem &&
              typeof existingItem === "object" &&
              ("value" in existingItem || "source" in existingItem || "sources" in existingItem)
            ) {
              const existingObj = existingItem as any;
              const existingPrimarySourceInput =
                "source" in existingObj
                  ? existingObj.source
                  : Array.isArray(existingObj.sources) && existingObj.sources.length > 0
                  ? existingObj.sources[0]
                  : undefined;
      
              // Preserve existing metadata structure, update value, and normalize to new schema
              finalContentFlat[key] = {
                value,
                source: toSourceObject(existingPrimarySourceInput),
                warnings: existingObj.warnings || [],
                other_values: existingObj.other_values || [],
              };
            } else {
              // Convert to rich format - this is user input without existing rich format
              finalContentFlat[key] = {
                value,
                source: toSourceObject(null),
                warnings: [],
                other_values: [],
              };
            }
          }
        }
      } else {
        // No metadata - merge flat values, but preserve existing rich format
        for (const key in resume_updates) {
          if (key === '_metadata') continue;

          if (key.startsWith('_') || key === 'projectSections' || key === 'borrowerSections') {
            rootKeys[key] = resume_updates[key];
            continue;
          }
          
          const value = resume_updates[key];
          const existingItem = existingContent[key];
          
          if (
            existingItem &&
            typeof existingItem === "object" &&
            ("value" in existingItem || "source" in existingItem || "sources" in existingItem)
          ) {
            const existingObj = existingItem as any;
            const existingPrimarySourceInput =
              "source" in existingObj
                ? existingObj.source
                : Array.isArray(existingObj.sources) && existingObj.sources.length > 0
                ? existingObj.sources[0]
                : undefined;
      
            // Preserve existing rich format, update value, normalize to new schema
            finalContentFlat[key] = {
              value,
              source: toSourceObject(existingPrimarySourceInput),
              warnings: existingObj.warnings || [],
              other_values: existingObj.other_values || [],
            };
          } else {
            // Convert to rich format - this is user input without existing rich format
            finalContentFlat[key] = {
              value,
              source: toSourceObject(null),
              warnings: [],
              other_values: [],
            };
          }
        }
      }
      
      // Ensure all fields are in rich format (safety check)
      // Convert any remaining flat values to rich format
      for (const key in finalContentFlat) {
        const item = finalContentFlat[key];
        // Ensure objects with `value` are normalized to { value, source, warnings, other_values }
        if (item !== null && typeof item === "object" && "value" in item) {
          const obj = item as any;
          const primarySourceInput =
            obj.source !== undefined
              ? obj.source
              : Array.isArray(obj.sources) && obj.sources.length > 0
              ? obj.sources[0]
              : undefined;

          const normalized: any = {
            value: obj.value,
            source: toSourceObject(primarySourceInput),
            warnings: obj.warnings || [],
            other_values: obj.other_values || [],
          };
          finalContentFlat[key] = normalized;
        } else if (
          item !== null &&
          item !== undefined &&
          typeof item !== "object"
        ) {
          // Flat value - convert to rich format
          finalContentFlat[key] = {
            value: item,
            source: toSourceObject(null),
            warnings: [],
            other_values: [],
          };
        }
      }
      
      // Group data by sections before saving
      // Note: We don't have access to formSchema in this Deno function, so grouping will use simplified logic
      const finalContent = {
        ...rootKeys,
        ...groupBySections(finalContentFlat),
      };

      // Prepare update payload
      const updatePayload: { 
        content: Record<string, unknown>; 
      } = {
        content: finalContent
      };

      // Update the existing row (update in place, don't create new version)
      if (existing?.id) {
        const { error: updateError } = await supabase
          .from("project_resumes")
          .update(updatePayload)
          .eq("id", existing.id);
        if (updateError) throw new Error(`Failed to save resume: ${updateError.message}`);
      } else {
        // No existing resume - create new one
        const insertPayload: { 
          project_id: string; 
          content: Record<string, unknown>; 
        } = {
          project_id,
          content: finalContent
        };
        const { error: insertError } = await supabase
          .from("project_resumes")
          .insert(insertPayload);
        if (insertError) throw new Error(`Failed to create resume: ${insertError.message}`);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[update-project] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});


