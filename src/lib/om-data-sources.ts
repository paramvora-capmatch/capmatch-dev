// src/lib/om-data-sources.ts
// Mapping of field names to their data sources based on Hoque_Data.md

export interface DataSource {
  primary: string;
  backup?: string;
  notes?: string;
}

// Map field names (normalized) to their sources
export const dataSourceMap: Record<string, DataSource> = {
  // Section 1: Project Identification & Basic Info
  'project name': { primary: 'User Input', notes: 'Simple text input' },
  'project address': { primary: 'User Input', notes: 'Google Places Autocomplete input' },
  'city': { primary: 'Derived [Extract from Address]', backup: 'External [Google Maps API]' },
  'state': { primary: 'Derived [Extract from Address]', backup: 'External [Google Maps API]' },
  'zip code': { primary: 'Derived [Extract from Address]', backup: 'External [USPS API]' },
  'county': { primary: 'Document [Title Commitment]', backup: 'External [Census TIGERweb]' },
  'parcel number': { primary: 'Document [ALTA Survey]', backup: 'External [Regrid API]' },
  'zoning designation': { primary: 'Document [Zoning Letter]', backup: 'External [Zoneomics API]' },
  'project type': { primary: 'User Input' },
  'primary asset class': { primary: 'User Input' },
  'construction type': { primary: 'Document [Arch Plans]', backup: 'User Input' },
  'groundbreaking date': { primary: 'Document [Construction Schedule]', backup: 'User Input' },
  'completion date': { primary: 'Document [Construction Schedule]', backup: 'User Input' },
  'total dev cost': { primary: 'Derived [Sum of Budget]', backup: 'Document [Dev Budget]' },
  'tdc': { primary: 'Derived [Sum of Budget]', backup: 'Document [Dev Budget]' },
  'loan amount requested': { primary: 'Document [Sources & Uses]', backup: 'User Input' },
  'requested loan term': { primary: 'Document [Term Sheet]', backup: 'User Input' },
  'master plan name': { primary: 'Document [Marketing Brochure]', backup: 'User Input' },
  'phase number': { primary: 'Document [Site Plan]', backup: 'User Input' },

  // Section 2: Property Specifications
  'total residential units': { primary: 'Derived [Sum of Unit Mix]', backup: 'Document [Arch Plans]' },
  'total residential nrsf': { primary: 'Derived [Sum of Unit SF]', backup: 'Document [Arch Plans]' },
  'average unit size': { primary: 'Derived [NRSF / Units]' },
  'total commercial grsf': { primary: 'Document [Arch Plans]', backup: 'User Input' },
  'gross building area': { primary: 'Document [Arch Plans]', backup: 'User Input' },
  'number of stories': { primary: 'Document [Elevations]', backup: 'User Input' },
  'building type': { primary: 'Document [Arch Plans]', backup: 'User Input' },
  'parking spaces': { primary: 'Document [Site Plan]', backup: 'User Input' },
  'parking ratio': { primary: 'Derived [Spaces / Units]' },
  'parking type': { primary: 'Document [Site Plan]', backup: 'User Input' },
  'amenity list': { primary: 'Document [Arch Plans]', backup: 'User Input' },
  'amenity sf': { primary: 'Derived [Sum of Areas]', backup: 'Document [Arch Plans]' },

  // Section 3: Financial Details
  'land acquisition': { primary: 'Document [Purchase Agmt]', backup: 'User Input' },
  'base construction': { primary: 'Document [Budget]', backup: 'User Input' },
  'hard cost': { primary: 'Document [Budget]', backup: 'User Input' },
  'contingency': { primary: 'Document [Budget]', backup: 'Derived [5% of Hard]' },
  'ff&e': { primary: 'Document [Budget]', backup: 'User Input' },
  'construction fees': { primary: 'Document [Budget]', backup: 'User Input' },
  'a&e fees': { primary: 'Document [Budget]', backup: 'User Input' },
  'third party reports': { primary: 'Document [Budget]', backup: 'User Input' },
  'legal & org': { primary: 'Document [Budget]', backup: 'User Input' },
  'title & recording': { primary: 'Document [Budget]', backup: 'User Input' },
  'taxes during const': { primary: 'Document [Budget]', backup: 'User Input' },
  'working capital': { primary: 'Document [Budget]', backup: 'User Input' },
  'developer fee': { primary: 'Document [Budget]', backup: 'Derived [4% of TDC]' },
  'pfc structuring fee': { primary: 'Document [Budget]', backup: 'User Input' },
  'loan fees': { primary: 'Document [Budget]', backup: 'Derived [1-2% of Loan]' },
  'financing costs': { primary: 'Document [Budget]', backup: 'Derived [1-2% of Loan]' },
  'interest reserve': { primary: 'Document [Budget]', backup: 'Derived [Calc]' },
  'senior loan amount': { primary: 'Document [Sources & Uses]', backup: 'User Input' },
  'sponsor equity': { primary: 'Document [Sources & Uses]', backup: 'Derived [TDC - Loan]' },
  'interest rate': { primary: 'Document [Term Sheet]', backup: 'User Input' },
  'underwriting rate': { primary: 'Document [Term Sheet]', backup: 'Derived [Rate + 2%]' },
  'amortization': { primary: 'Document [Term Sheet]', backup: 'User Input' },
  'prepayment terms': { primary: 'Document [Term Sheet]', backup: 'User Input' },
  'recourse': { primary: 'Document [Term Sheet]', backup: 'User Input' },
  'perm takeout planned': { primary: 'Document [Term Sheet]', backup: 'User Input' },
  'real estate taxes': { primary: 'Document [Proforma]', backup: 'External [Tax Assessor]' },
  'insurance': { primary: 'Document [Proforma]', backup: 'User Input' },
  'utilities costs': { primary: 'Document [Proforma]', backup: 'User Input' },
  'repairs & maint': { primary: 'Document [Proforma]', backup: 'User Input' },
  'management fee': { primary: 'Document [Proforma]', backup: 'Derived [3-5% EGI]' },
  'general & admin': { primary: 'Document [Proforma]', backup: 'User Input' },
  'payroll': { primary: 'Document [Proforma]', backup: 'User Input' },
  'reserves': { primary: 'Document [Proforma]', backup: 'Derived [$250/unit]' },
  'noi': { primary: 'Derived [EGI - Total Exp]', backup: 'Document [Proforma]' },
  'yield on cost': { primary: 'Derived [NOI / TDC]' },
  'cap rate': { primary: 'Document [Appraisal]', backup: 'External [CoStar]' },
  'stabilized value': { primary: 'Derived [NOI / Cap Rate]', backup: 'Document [Appraisal]' },
  'ltv': { primary: 'Derived [Loan / Value]' },
  'debt yield': { primary: 'Derived [NOI / Loan]' },
  'dscr': { primary: 'Derived [NOI / Debt Svc]' },
  'loan to cost': { primary: 'Derived [Loan / TDC]' },
  'equity contribution': { primary: 'Derived [Equity / TDC]' },
  'total capitalization': { primary: 'Derived [Loan + Equity]' },
  'leverage': { primary: 'Derived [Loan / Total Capital]' },

  // Section 4: Market Context
  'submarket name': { primary: 'Document [Market Study]', backup: 'External [CoStar]' },
  'distance to cbd': { primary: 'Derived [Geo-calc]', backup: 'External [Google Maps]' },
  'dist to employment': { primary: 'Document [Market Study]', backup: 'External [Google Maps]' },
  'dist to transit': { primary: 'Derived [Geo-calc]', backup: 'External [Walk Score]' },
  'walkability score': { primary: 'Document [Market Study]', backup: 'External [Walk Score]' },
  'population': { primary: 'External [Census ACS]', backup: 'Document [Market Study]' },
  'pop growth': { primary: 'External [Census ACS]', backup: 'Document [Market Study]' },
  'proj growth': { primary: 'External [Census ACS]', backup: 'Document [Market Study]' },
  'median hh income': { primary: 'External [Census ACS]', backup: 'Document [Market Study]' },
  '% renter occupied': { primary: 'External [Census ACS]', backup: 'Document [Market Study]' },
  '% bachelors degree': { primary: 'External [Census ACS]', backup: 'Document [Market Study]' },

  // Section 5: Special Considerations
  'opportunity zone': { primary: 'External [US Treasury]', backup: 'User Input' },
  'affordable housing': { primary: 'Document [Reg Agreement]', backup: 'User Input' },
  'affordable units': { primary: 'Document [Reg Agreement]', backup: 'User Input' },
  'ami target': { primary: 'Document [Reg Agreement]', backup: 'User Input' },
  'tax exemption': { primary: 'Document [Incentive Agmt]', backup: 'User Input' },
  'tif district': { primary: 'External [City GIS]', backup: 'User Input' },
  'tax abatement': { primary: 'Document [Incentive Agmt]', backup: 'User Input' },
  'pace financing': { primary: 'User Input' },
  'historic tax credits': { primary: 'Document [NPS Cert]', backup: 'User Input' },
  'new markets credits': { primary: 'External [CDFI Fund]', backup: 'User Input' },

  // Section 6: Timeline & Milestones
  'land acq close': { primary: 'Document [Settlement Stmt]', backup: 'User Input' },
  'entitlements': { primary: 'Document [Zoning Letter]', backup: 'User Input' },
  'final plans': { primary: 'Document [Arch Contract]', backup: 'User Input' },
  'permits issued': { primary: 'Document [Building Permits]', backup: 'External [Census BPS]' },
  'groundbreaking': { primary: 'Document [Schedule]', backup: 'User Input' },
  'vertical start': { primary: 'Document [Schedule]', backup: 'User Input' },
  'substantial comp': { primary: 'Document [Schedule]', backup: 'User Input' },
  'first occupancy': { primary: 'Document [Schedule]', backup: 'User Input' },
  'stabilization': { primary: 'Document [Proforma]', backup: 'User Input' },
  'pre-leased sf': { primary: 'Document [Lease Agmt]', backup: 'User Input' },

  // Section 7: Site & Context
  'total site acreage': { primary: 'Document [ALTA Survey]', backup: 'External [Regrid API]' },
  'current site status': { primary: 'Document [Phase I ESA]', backup: 'External [Street View]' },
  'topography': { primary: 'Document [Survey]', backup: 'External [USGS API]' },
  'environmental': { primary: 'Document [Phase I ESA]', backup: 'External [EPA API]' },
  'site utilities': { primary: 'Document [Civil Plans]', backup: 'User Input' },
  'site access': { primary: 'Document [Civil Plans]', backup: 'External [Google Maps]' },
  'proximity shopping': { primary: 'Document [Market Study]', backup: 'External [Google Maps]' },
  'proximity restaurants': { primary: 'Document [Market Study]', backup: 'External [Google Maps]' },
  'proximity parks': { primary: 'Document [Market Study]', backup: 'External [Google Maps]' },
  'proximity schools': { primary: 'Document [Market Study]', backup: 'External [Google Maps]' },
  'proximity hospitals': { primary: 'Document [Market Study]', backup: 'External [Google Maps]' },

  // Section 8: Sponsor Information
  'sponsor entity name': { primary: 'Document [Org Chart]', backup: 'User Input' },
  'sponsor structure': { primary: 'Document [Org Chart]', backup: 'User Input' },
  'equity partner': { primary: 'Document [Org Chart]', backup: 'User Input' },
  'contact info': { primary: 'User Input' },

  // Loan Terms
  'loan type': { primary: 'User Input' },
  'rate': { primary: 'Document [Term Sheet]', backup: 'User Input' },
  'floor rate': { primary: 'Document [Term Sheet]', backup: 'User Input' },
  'term': { primary: 'Document [Term Sheet]', backup: 'User Input' },
  'extension': { primary: 'Document [Term Sheet]', backup: 'User Input' },
  'origination fee': { primary: 'Document [Term Sheet]', backup: 'User Input' },
  'exit fee': { primary: 'Document [Term Sheet]', backup: 'User Input' },
  'lender reserves': { primary: 'Document [Term Sheet]', backup: 'User Input' },
  'tax & insurance': { primary: 'Document [Term Sheet]', backup: 'User Input' },
  'capex reserve': { primary: 'Document [Term Sheet]', backup: 'User Input' },
  'min dscr': { primary: 'Document [Term Sheet]', backup: 'User Input' },
  'max ltv': { primary: 'Document [Term Sheet]', backup: 'User Input' },
  'min liquidity': { primary: 'Document [Term Sheet]', backup: 'User Input' },
  'completion guaranty': { primary: 'Document [Term Sheet]', backup: 'User Input' },
};

/**
 * Get data sources for a field or set of fields
 * @param fields - Field name(s) to look up (will be normalized)
 * @returns Array of data sources
 */
export function getDataSources(fields: string | string[]): DataSource[] {
  const fieldArray = Array.isArray(fields) ? fields : [fields];
  const sources: DataSource[] = [];
  const seen = new Set<string>();

  fieldArray.forEach((field) => {
    const normalized = field.toLowerCase().trim();
    const source = dataSourceMap[normalized];
    
    if (source && !seen.has(normalized)) {
      sources.push(source);
      seen.add(normalized);
    }
  });

  // If no exact match, try partial matches
  if (sources.length === 0) {
    Object.keys(dataSourceMap).forEach((key) => {
      if (fieldArray.some(f => key.includes(f.toLowerCase()) || f.toLowerCase().includes(key))) {
        const source = dataSourceMap[key];
        if (source && !seen.has(key)) {
          sources.push(source);
          seen.add(key);
        }
      }
    });
  }

  return sources;
}

/**
 * Get data sources for a card/section based on common field patterns
 * @param sectionName - Name of the section/card
 * @returns Array of data sources
 */
export function getSectionSources(sectionName: string): DataSource[] {
  const normalized = sectionName.toLowerCase();
  
  // Map section names to their relevant fields
  const sectionFieldMap: Record<string, string[]> = {
    'capital stack': ['loan amount requested', 'senior loan amount', 'sponsor equity', 'total dev cost', 'tdc'],
    'sources & uses': ['senior loan amount', 'sponsor equity', 'land acquisition', 'base construction', 'contingency'],
    'key terms': ['interest rate', 'loan type', 'term', 'recourse', 'amortization', 'prepayment terms'],
    'loan structure': ['loan type', 'interest rate', 'term', 'recourse'],
    'fees': ['origination fee', 'exit fee', 'loan fees'],
    'lender reserves': ['interest reserve', 'tax & insurance', 'capex reserve'],
    'financial covenants': ['min dscr', 'max ltv', 'min liquidity', 'completion guaranty'],
    'debt terms': ['interest rate', 'loan type', 'term', 'amortization', 'recourse'],
    'milestones': ['groundbreaking', 'substantial comp', 'first occupancy', 'stabilization'],
    'property specifications': ['total residential units', 'gross building area', 'parking spaces', 'building type'],
    'unit mix': ['total residential units', 'average unit size'],
    'amenities': ['amenity list', 'amenity sf'],
    'site & zoning': ['zoning designation', 'parcel number', 'total site acreage'],
    'market context': ['submarket name', 'population', 'median hh income', 'walkability score'],
    'demographics': ['population', 'pop growth', 'median hh income', '% renter occupied'],
    'returns': ['yield on cost', 'irr', 'equity multiple', 'cap rate'],
    'sponsor profile': ['sponsor entity name', 'sponsor structure', 'equity partner'],
  };

  // Try exact match first
  if (sectionFieldMap[normalized]) {
    return getDataSources(sectionFieldMap[normalized]);
  }

  // Try partial matches
  for (const [key, fields] of Object.entries(sectionFieldMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return getDataSources(fields);
    }
  }

  return [];
}

