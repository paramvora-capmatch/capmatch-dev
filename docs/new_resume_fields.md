# Main Sections

### **Section 1: Project Identification & Basic Info**

**1.1 Project Identity**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Project Name** | Text | **Required** | **User Input** | N/A | Legal/Marketing | Placeholder: "e.g., SoGood Apartments". |
| **Project Address** | Address | **Required** | **User Input** | N/A | **CRITICAL TRIGGER** | Google Places Autocomplete. Triggers API jobs. |
| **City/State/Zip** | Auto | **Required** | **Derived** [Address] | **External** [Maps API] | Jurisdiction | Auto-populated read-only. |
| **County** | Text | **Required** | **Document** [Title] | **External** [Census] | Tax | Auto-populated. |
| **Deal Status** | Dropdown | **Required** | **User Input** | N/A | **Workflow Logic** | [Inquiry, Underwriting, Pre-Submission, Submitted, Closed]. |

**1.2 Classification**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Project Type** | Multi-select | **Required** | **User Input** | N/A | Classification | [Multifamily, Mixed-Use, Retail, Office]. |
| **Construction Type** | Dropdown | **Required** | **Document** [Arch Plans] | **User Input** | Risk Profile | [Ground-Up, Renovation, Adaptive Reuse]. |
| **Project Phase** | Dropdown | **Required** | **User Input** | **Document** [Schedule] | Risk | [Pre-Dev, Vertical, Lease-Up, Stabilized]. |

---

### **Section 2: Property Specifications**

**2.1 Physical Structure**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Total Units** | Integer | **Required** | **Derived** [Sum Unit Mix] | **Document** [Arch Plans] | Density | Read-only. |
| **Net Rentable SF (NRSF)** | Integer | **Required** | **Derived** [Sum SF] | **Document** [Arch Plans] | Revenue | Read-only. |
| **Avg Unit Size** | Integer | **Required** | **Derived** [NRSF/Units] | N/A | Marketability | Read-only. |
| **Commercial GRSF** | Integer | **Optional** | **Document** [Arch Plans] | **User Input** | Revenue | Retail/Office space (if Mixed Use). |
| **Building Efficiency %** | Percent | **Required** | **Derived** [NRSF/GBA] | **Document** [Arch Plans] | Cost Eff. | Target 80-85%. |
| **Building Type** | Dropdown | **Required** | **Document** [Arch Plans] | **User Input** | Asset Class | [High-rise, Mid-rise, Garden, Podium]. |

**2.2 Amenities & Unit Details**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Amenity List** | Checklist | **Optional** | **Document** [Arch Plans] | **User Input** | Lifestyle | [Pool, Gym, Coworking, Dog Wash, etc.]. |
| **Parking Spaces** | Integer | **Required** | **Document** [Site Plan] | **User Input** | Zoning | Total count. |
| **Parking Ratio** | Decimal | **Required** | **Derived** [Spaces/Units] | N/A | Marketability | Read-only. |
| **Furnished Units?** | Boolean | **Optional** | **User Input** | N/A | Revenue | Toggle switch. |
| **Loss to Lease %** | Percent | **Optional** | **Document** [Rent Roll] | **Derived** | Upside | Gap between Market and Actual rent. |
| **Studio Count** | Integer | **Optional** | **Document** [Arch Plans] | **User Input** | Mix Detail | Specific count for granular modeling. |
| **1-Bed Count** | Integer | **Optional** | **Document** [Arch Plans] | **User Input** | Mix Detail | Specific count. |
| **2-Bed Count** | Integer | **Optional** | **Document** [Arch Plans] | **User Input** | Mix Detail | Specific count. |
| **3-Bed Count** | Integer | **Optional** | **Document** [Arch Plans] | **User Input** | Mix Detail | Specific count. |

**2.3 Systems, ESG & Compliance**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **ADA Compliant %** | Percent | **Required** | **Document** [Arch Plans] | **User Input** | Compliance | Required for HUD/Fannie (min 5%). |
| **HVAC System** | Dropdown | **Optional** | **Document** [MEP Plans] | **User Input** | OpEx/Value | [Central, Split System, PTAC, VRF]. |
| **Roof Type/Age** | Text | **Optional** | **Document** [Eng. Report] | **User Input** | CapEx Risk | e.g., "TPO, 2 years old". |
| **Solar Capacity (kW)** | Numeric | **Optional** | **Document** [Arch Plans] | **User Input** | ESG/Savings | If applicable. |
| **EV Charging Stations** | Integer | **Optional** | **Document** [Site Plan] | **User Input** | Amenity | Count of stations. |
| **LEED/Green Rating** | Dropdown | **Optional** | **Document** [Specs] | **User Input** | ESG | [Certified, Silver, Gold, Platinum, NGBS]. |

**2.4 Residential Unit Mix (Sub-Table)**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Unit Type** | Text | **Required** | **Document** [Arch Plans] | **User Input** | Segmentation | e.g., "Studio S1", "1BR A1". |
| **Unit Count** | Integer | **Required** | **Document** [Arch Plans] | **User Input** | Density | Numeric Input. |
| **Avg SF/Unit** | Integer | **Required** | **Document** [Arch Plans] | **User Input** | Size | Numeric Input. |
| **Monthly Rent/Unit** | Currency | **Required** | **Document** [Market Study] | **User Input** | Revenue | Currency Input. |
| **Total SF** | Integer | **Required** | **Derived** [Count * SF] | N/A | Density | Auto-calc. |
| **% of Total Units** | Percent | **Required** | **Derived** [Count / Total Units] | N/A | Mix Analysis | Auto-calc. |
| **Affordability Status** | Dropdown | **Required** | **Document** [Rent Roll] | **User Input** | Compliance | [Market Rate, Affordable @ 60% AMI, etc.]. |
| **Affordable Units Count** | Integer | **Required** | **Derived** [Sum Affordable] | **Document** [Reg Agmt] | Restriction | Auto-sum; critical for tax exemptions. |
| **AMI Target %** | Percent | **Optional** | **Document** [Reg Agreement] | **User Input** | Affordability | Per row; e.g., 60% AMI. |
| **Rent Bump Schedule** | Text | **Optional** | **Document** [Proforma] | **User Input** | Revenue Growth | e.g., "$2.13 to $2.46"; trended. |

**2.5 Commercial Space Mix (Sub-Table)**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Space Type** | Text | **Required** | **Document** [Arch Plans] | **User Input** | Usage | e.g., "Retail", "Office". |
| **Square Footage** | Integer | **Required** | **Document** [Arch Plans] | **User Input** | Revenue | Numeric Input. |
| **Tenant (if known)** | Text | **Optional** | **Document** [Lease/LOI] | **User Input** | Risk | Text Input. |
| **Lease Term** | Text | **Optional** | **Document** [Lease/LOI] | **User Input** | Stability | Text Input. |
| **Annual Rent** | Currency | **Required** | **Document** [Lease/LOI] | **User Input** | Income | Currency Input. |
| **TI Allowance** | Currency | **Optional** | **Document** [Lease/LOI] | **User Input** | Cost Driver | Per tenant; impacts capex. |

---

### **Section 3: Financial Details**

**3.1 Uses of Funds (Budget)**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Total Dev Cost (TDC)** | Currency | **Required** | **Derived** [Budget Sum] | **Document** [Budget] | Loan Basis | Read-only calculated. |
| **Land Acquisition** | Currency | **Required** | **Document** [Purchase Agmt] | **User Input** | Cost Basis | Currency Input. |
| **Base Construction** | Currency | **Required** | **Document** [Budget] | **User Input** | Hard Cost | Currency Input. |
| **Contingency** | Currency | **Required** | **Document** [Budget] | **Derived** [5% of Hard] | Risk Buffer | Currency Input. |
| **FF&E** | Currency | **Optional** | **Document** [Budget] | **User Input** | Hard Cost | Furniture, Fixtures & Equipment. |
| **Construction Fees** | Currency | **Required** | **Document** [Budget] | **User Input** | Hard Cost | GC Fees/General Conditions. |
| **A&E Fees** | Currency | **Required** | **Document** [Budget] | **User Input** | Soft Cost | Architecture & Engineering. |
| **Third Party Reports** | Currency | **Required** | **Document** [Budget] | **User Input** | Soft Cost | Environmental, Appraisal, etc. |
| **Legal & Org** | Currency | **Required** | **Document** [Budget] | **User Input** | Soft Cost | Legal fees. |
| **Title & Recording** | Currency | **Required** | **Document** [Budget] | **User Input** | Soft Cost | Closing costs. |
| **Taxes During Const.** | Currency | **Required** | **Document** [Budget] | **User Input** | Soft Cost | Property taxes before stabilization. |
| **Working Capital** | Currency | **Optional** | **Document** [Budget] | **User Input** | Soft Cost | Operating cash. |
| **Developer Fee** | Currency | **Required** | **Document** [Budget] | **Derived** [4% of TDC] | Sponsor Profit | Currency Input. |
| **PFC/Structure Fee** | Currency | **Optional** | **Document** [Budget] | **User Input** | Soft Cost | Specific to Tax Exemption deals. |
| **Loan Fees** | Currency | **Required** | **Document** [Budget] | **Derived** [1-2% of Loan] | Financing | Origination fees. |
| **Interest Reserve** | Currency | **Required** | **Document** [Budget] | **Derived** [Calc] | Financing | Debt service during construction. |
| **Op. Deficit Escrow** | Currency | **Optional** | **Derived** [6 Mos OpEx] | **Document** [Proforma] | Risk Buffer | *Moved from Sec 6*. |
| **Lease-Up Escrow** | Currency | **Optional** | **Derived** [6-12 Mos] | **Document** [Proforma] | Absorption | *Moved from Sec 6*. |
| **Relocation Costs** | Currency | **Optional** | **Document** [Relocation Plan] | **User Input** | Soft Cost | Tenant-in-place expenses. |
| **Syndication Costs** | Currency | **Optional** | **Document** [Equity Commit] | **User Input** | Soft Cost | Placement fees; max 2% of equity. |
| **Enviro. Remediation** | Currency | **Optional** | **Document** [Phase II ESA] | **User Input** | Hard Cost | Asbestos/lead abatement. |

**3.2 Sources of Funds**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Senior Loan Amount** | Currency | **Required** | **Document** [Sources & Uses] | **User Input** | Debt | Currency Input. |
| **Sponsor Equity** | Currency | **Required** | **Document** [Sources & Uses] | **Derived** [TDC - Loan] | Equity | Currency Input. |
| **Tax Credit Equity** | Currency | **Optional** | **Document** [Equity Commit] | **External** [LIHTC Pricing] | Equity | Auto-estimate from basis. |
| **Gap Financing** | Currency | **Optional** | **Document** [Sources & Uses] | **User Input** | Subordinate Debt | e.g., TIF grants; ensure subordination. |

**3.3 Loan Terms & Structure**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Loan Amount Requested** | Currency | **Required** | **Document** [Sources & Uses] | **User Input** | Primary Ask | Currency Input. |
| **Loan Type** | Dropdown | **Required** | **User Input** | N/A | Product | [Construction, Bridge, Perm, Mezzanine]. |
| **Requested Term** | Text | **Required** | **Document** [Term Sheet] | **User Input** | Timeline | e.g., "3 Years + 1 Year Ext". |
| **Amortization** | Dropdown | **Required** | **Document** [Term Sheet] | **User Input** | Repayment | [IO, 30yr Sched, 25yr Sched]. |
| **Interest Rate** | Percent | **Required** | **Document** [Term Sheet] | **User Input** | Cost of Debt | Percentage Input. |
| **Underwriting Rate** | Percent | **Required** | **Document** [Term Sheet] | **Derived** [Rate + 2%] | Stress Test | Percentage Input. |
| **Prepayment Premium** | Dropdown | **Optional** | **Document** [Term Sheet] | **User Input** | Exit Cost | [Yield Maint, Defeasance, Open]. |
| **Prepayment Terms** | Text | **Optional** | **Document** [Term Sheet] | **User Input** | Exit Cost | Text Input. |
| **Recourse** | Dropdown | **Required** | **Document** [Term Sheet] | **User Input** | Liability | Dropdown: [Full, Partial, Non]. |
| **Perm Takeout Planned** | Boolean | **Required** | **Document** [Term Sheet] | **User Input** | Strategy | Toggle Switch. |
| **All-In Rate** | Percent | **Required** | **Derived** [Base + Fees] | **Document** [Term Sheet] | DSCR Calc | Includes origination/MIP. |

**3.4 Operating Expenses (Proforma)**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Real Estate Taxes** | Currency | **Required** | **Document** [Proforma] | **External** [Tax Assessor] | OpEx | Currency Input. |
| **Insurance** | Currency | **Required** | **Document** [Proforma] | **User Input** | OpEx | Currency Input. |
| **Utilities** | Currency | **Required** | **Document** [Proforma] | **User Input** | OpEx | Currency Input. |
| **Repairs & Maint.** | Currency | **Required** | **Document** [Proforma] | **User Input** | OpEx | Currency Input. |
| **Management Fee** | Currency | **Required** | **Document** [Proforma] | **Derived** [3-5% EGI] | OpEx | Currency Input. |
| **General & Admin** | Currency | **Required** | **Document** [Proforma] | **User Input** | OpEx | Currency Input. |
| **Payroll** | Currency | **Required** | **Document** [Proforma] | **User Input** | OpEx | Currency Input. |
| **Reserves** | Currency | **Required** | **Document** [Proforma] | **Derived** [$250/unit] | OpEx | Currency Input. |
| **Marketing/Leasing** | Currency | **Required** | **Document** [Proforma] | **Derived** [2% GPR] | OpEx | For lease-up; trended at 2%. |
| **Service Coordination** | Currency | **Optional** | **Document** [Proforma] | **User Input** | OpEx | Specific to supportive housing. |

**3.5 Investment Metrics & Exit**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Exit Strategy** | Dropdown | **Required** | **Document** [Inv. Memo] | **User Input** | Valuation | [Hold, Value-Add Sale, Refinance, Condo Conv]. |
| **Expected Hold Period** | Integer | **Required** | **Document** [Inv. Memo] | **User Input** | Return Calc | Years (e.g., 5). |
| **LTV Stress Max** | Percent | **Optional** | **User Input** | **Derived** [Lender Rules] | Safety | Max LTV if Cap Rate expands +50bps. |
| **DSCR Stress Min** | Decimal | **Optional** | **User Input** | **Derived** [Lender Rules] | Safety | Min DSCR if Vacancy increases 5%. |
| **NOI (Year 1)** | Currency | **Required** | **Derived** [EGI - Total Exp] | **Document** [Proforma] | Valuation | Read-only calculated. |
| **Yield on Cost** | Percent | **Required** | **Derived** [NOI / TDC] | N/A | Return | Read-only calculated. |
| **Cap Rate** | Percent | **Required** | **Document** [Appraisal] | **External** [CoStar] | Valuation | Percentage Input. |
| **Stabilized Value** | Currency | **Required** | **Derived** [NOI / Cap Rate] | **Document** [Appraisal] | Exit Value | Read-only calculated. |
| **LTV** | Percent | **Required** | **Derived** [Loan / Value] | N/A | Leverage | Read-only calculated. |
| **Debt Yield** | Percent | **Required** | **Derived** [NOI / Loan] | N/A | Risk | Read-only calculated. |
| **DSCR** | Decimal | **Required** | **Derived** [NOI / Debt Svc] | N/A | Coverage | Read-only calculated. |
| **Trended NOI (Yr 1)** | Currency | **Optional** | **Document** [Proforma] | **Derived** [Untrended * Inf] | Upside | Inflation set at ~2%. |
| **Untrended NOI (Yr 1)** | Currency | **Required** | **Document** [Proforma] | **Derived** [NOI / Inf] | Downside | Base case; borrower verifies. |
| **Trended Yield** | Percent | **Optional** | **Derived** [Trended / TDC] | **Document** [Proforma] | Return | Read-only. |
| **Untrended Yield** | Percent | **Required** | **Derived** [Untrended / TDC] | **Document** [Proforma] | Return | Read-only. |
| **Inflation Assumption** | Percent | **Required** | **Document** [Proforma] | **External** [FRED CPI] | Modeling | Percentage Input. |
| **DSCR Stress Test** | Decimal | **Required** | **Derived** [Stress Calc] | N/A | Coverage | Calculated at Rate + 2%. |
| **Portfolio LTV** | Percent | **Optional** | **Derived** [Debt / Port Value] | **Document** [Sponsor FS] | Leverage | For sponsor; max 75%. |

---

### **Section 4: Market Context**

**4.1 Demographics & Economy**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **MSA Name** | Auto | **Required** | **Derived** [Geo] | **External** [Census] | Macro | Metropolitan Statistical Area. |
| **Population (3-mi)** | Integer | **Required** | **External** [Census ACS] | **Document** [Market Study] | Demand | Current population. |
| **Pop Growth (5-yr Proj)** | Percent | **Required** | **External** [Census ACS] | **Document** [Market Study] | Trend | Future growth forecast. |
| **Median HH Income** | Currency | **Required** | **External** [Census ACS] | **Document** [Market Study] | Affordability | Renter capacity. |
| **Renter Occupied %** | Percent | **Required** | **External** [Census ACS] | **Document** [Market Study] | Demand | Target >50% for MF. |
| **Unemployment Rate** | Percent | **Required** | **External** [BLS] | **Document** [Market Study] | Econ Health | Local unemployment %. |
| **Largest Employer** | Text | **Optional** | **Document** [Market Study] | **User Input** | Demand | Name of top employer. |
| **Employer Concentration** | Percent | **Optional** | **Document** [Market Study] | **Derived** | Risk | % of jobs from top employer (<25% ideal). |
| **Crime Risk Level** | Dropdown | **Optional** | **External** [Crime Data] | **Document** [Market Study] | Safety | [Low, Moderate, High]. |

**4.2 Location & Connectivity**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Submarket Name** | Text | **Required** | **Document** [Market Study] | **External** [CoStar] | Comp ID | Text Input. |
| **Walkability Score** | Integer | **Optional** | **External** [Walk Score] | **Document** [Market Study] | Lifestyle | 0-100 Score. |
| **Infra. Catalyst** | Text | **Optional** | **Document** [Market Study] | **User Input** | Demand | e.g., "New Light Rail Station". |
| **Broadband Speed** | Text | **Optional** | **External** [FCC Map] | **User Input** | Tech Amenity | e.g., "Fiber 1Gbps Available". |

**4.3 Supply & Demand**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Submarket Absorption** | Integer | **Required** | **External** [CoStar] | **Document** [Market Study] | Velocity | Net units absorbed per year. |
| **Supply Pipeline (Units)** | Integer | **Required** | **External** [CoStar] | **Document** [Market Study] | Supply Risk | Units under construction + planned. |
| **Months of Supply** | Decimal | **Required** | **Derived** [Supply/Absorp] | **External** [CoStar] | Balance | <12 months preferred. |
| **Capture Rate** | Percent | **Required** | **Derived** [Subj Units/Demand] | **Document** [Market Study] | Feasibility | Project's required share of demand. |
| **Market Concessions** | Text | **Optional** | **External** [CoStar] | **Document** [Market Study] | Pricing | e.g., "1 Month Free". |
| **North Star Comp** | Text | **Optional** | **User Input** | **Document** [Market Study] | Positioning | The 1 comp sponsor wants to beat. |

**4.4 Rent Comps (Sub-Table)**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Property Name** | Text | **Required** | **Document** [Market Study] | **External** [CoStar] | Benchmarking | Text Input. |
| **Address** | Address | **Required** | **Document** [Market Study] | **External** [CoStar] | Location | Text Input. |
| **Distance** | Decimal | **Required** | **Derived** [Geo-calc] | **External** [Google Maps] | Relevance | Read-only. |
| **Year Built** | Integer | **Required** | **Document** [Market Study] | **External** [CoStar] | Quality | Numeric Input. |
| **Total Units** | Integer | **Required** | **Document** [Market Study] | **External** [CoStar] | Size | Numeric Input. |
| **Occupancy %** | Percent | **Required** | **Document** [Market Study] | **External** [CoStar] | Demand | Percentage Input. |
| **Avg Rent/Month** | Currency | **Required** | **Document** [Market Study] | **External** [CoStar] | Price | Currency Input. |
| **Rent/SF** | Currency | **Required** | **Derived** [Rent / Size] | **Document** [Market Study] | Price | Read-only. |
| **Concessions** | Text | **Optional** | **Document** [Market Study] | **External** [CoStar] | Adjustment | e.g., "1 month free". |

**4.5 Sale Comps (Sub-Table)**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Property Name** | Text | **Required** | **Document** [Appraisal] | **External** [CoStar] | Benchmarking | Text Input. |
| **Sale Price/Unit** | Currency | **Required** | **Document** [Appraisal] | **External** [CoStar] | Exit Value | Currency Input. |
| **Cap Rate** | Percent | **Required** | **Document** [Appraisal] | **External** [CoStar] | Valuation | Percentage Input. |
| **Sale Date** | Date | **Required** | **Document** [Appraisal] | **External** [CoStar] | Timing | Date Picker. |

---

### **Section 5: Special Considerations**

**5.1 Affordable Housing & Compliance**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Affordable Housing?** | Boolean | **Required** | **Document** [Reg Agreement] | **User Input** | Compliance | Toggle Switch. |
| **Affordable Units #** | Integer | **Optional** | **Document** [Reg Agreement] | **User Input** | Compliance | Required if Affordable=True. |
| **AMI Target %** | Percent | **Optional** | **Document** [Reg Agreement] | **User Input** | Restriction | Percentage Input. |
| **Relocation Plan** | Dropdown | **Optional** | **Document** [Relocation Plan] | **User Input** | Compliance | [Complete, In Process, N/A]. |

**5.2 Incentives & Tax Credits**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Opportunity Zone?** | Boolean | **Required** | **External** [US Treasury] | **User Input** | Tax Benefit | Read-only flag. |
| **Tax Exemption?** | Boolean | **Required** | **Document** [Incentive Agmt] | **User Input** | Savings | Toggle Switch. |
| **Exemption Structure** | Dropdown | **Optional** | **Document** [Incentive Agmt] | **User Input** | Legal Cost | [PFC, MMD, PILOT]. |
| **Sponsoring Entity** | Text | **Optional** | **Document** [Incentive Agmt] | **User Input** | Legal | Text Input (e.g. "SoGood MMD"). |
| **Exemption Term** | Integer | **Optional** | **Document** [Incentive Agmt] | **User Input** | Valuation | Numeric Input (Years). |
| **Incentive Stacking** | Checklist | **Optional** | **Document** [Incentive Agmt] | **User Input** | Financing Layer | Select: [LIHTC, Section 8, HOME]. |
| **TIF District** | Boolean | **Optional** | **External** [City GIS] | **User Input** | Financing | Toggle Switch. |
| **Tax Abatement** | Boolean | **Optional** | **Document** [Incentive Agmt] | **User Input** | Savings | Toggle Switch. |
| **PACE Financing** | Boolean | **Optional** | **User Input** | N/A | Capital | Toggle Switch. |
| **Historic Tax Credits** | Boolean | **Optional** | **Document** [NPS Cert] | **User Input** | Capital | Toggle Switch. |
| **New Markets Credits** | Boolean | **Optional** | **External** [CDFI Fund] | **User Input** | Capital | Toggle Switch. |

---

### **Section 6: Timeline & Milestones**

**6.1 Key Dates**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Land Acq. Close** | Date | **Required** | **Document** [Settlement Stmt] | **User Input** | Status | Date Picker. |
| **Groundbreaking Date** | Date | **Required** | **Document** [Schedule] | **User Input** | Timeline | Date Picker. |
| **Vertical Start** | Date | **Required** | **Document** [Schedule] | **User Input** | Draw | Date Picker. |
| **Substantial Comp** | Date | **Required** | **Document** [Schedule] | **User Input** | Completion | Date Picker. |
| **First Occupancy** | Date | **Required** | **Document** [Schedule] | **User Input** | Revenue | Date Picker. |
| **Stabilization** | Date | **Required** | **Document** [Proforma] | **User Input** | Exit | Date Picker. |
| **Completion Date** | Date | **Required** | **Document** [Schedule] | **User Input** | Timeline | Date Picker. |

**6.2 Entitlements & Permitting**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Entitlements** | Text | **Required** | **Document** [Zoning Letter] | **User Input** | Risk | Dropdown: [Approved/Pending]. |
| **Final Plans** | Text | **Required** | **Document** [Arch Contract] | **User Input** | Risk | Dropdown: [Approved/Pending]. |
| **Permits Issued** | Text | **Required** | **Document** [Building Permits] | **External** [Census BPS] | Risk | Dropdown: [Issued/Pending]. |

**6.3 Construction & Lease-Up Status**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Pre-Leased SF** | Integer | **Optional** | **Document** [Lease Agmt] | **User Input** | Risk | Numeric Input. |
| **Draw Schedule** | Table/Obj | **Required** | **Document** [Const Contract] | **User Input** | Funding | Draw #, % Complete, Amount. |
| **Absorption Projection** | Integer | **Required** | **Document** [Market Study] | **Derived** | Lease-Up | Units/Month forecast. |

---

### **Section 7: Site & Context**

**7.1 Land & Zoning**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Parcel Number(s)** | Text | **Required** | **Document** [ALTA Survey] | **External** [Regrid API] | Legal ID | Comma-separated values. |
| **Zoning Designation** | Text | **Required** | **Document** [Zoning Letter] | **External** [Zoneomics] | Entitlements | Current zoning code (e.g., PD-317). |
| **Expected Zoning Changes** | Dropdown | **Optional** | **User Input** | **Document** [Entitlements] | Risk | [None, Variance, PUD, Re-Zoning]. |
| **Total Site Acreage** | Decimal | **Required** | **Document** [ALTA Survey] | **External** [Regrid] | Density | Numeric Input. |
| **Buildable Acreage** | Decimal | **Required** | **Document** [ALTA Survey] | **Derived** | Efficiency | Excludes wetlands/easements. |
| **Allowable FAR** | Decimal | **Required** | **Document** [Zoning Letter] | **External** [Zoneomics] | Capacity | Floor Area Ratio limit. |
| **FAR Utilized %** | Percent | **Optional** | **Derived** [GBA/Land Area] | N/A | Efficiency | How much of zoning is used. |
| **Density Bonus?** | Boolean | **Optional** | **Document** [Zoning] | **User Input** | Upside | Eligible for extra units? |

**7.2 Physical Characteristics & Access**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Current Site Status** | Dropdown | **Required** | **Document** [Phase I ESA] | **External** [Street View] | Prep Cost | [Vacant, Improved, Brownfield]. |
| **Topography** | Dropdown | **Required** | **Document** [Survey] | **External** [USGS] | Site Work | [Flat, Sloped, Steep]. |
| **Soil Conditions** | Text | **Optional** | **Document** [Geotech] | **User Input** | Foundation | e.g., "Expansive Clay, req Piles". |
| **Access Points** | Text | **Optional** | **Document** [Civil Plans] | **External** [Maps] | Logistics | e.g., "1 Curb Cut on Main St". |
| **Adjacent Land Use** | Text | **Required** | **Document** [Zoning] | **External** [Maps] | Compatibility | e.g., "Heavy Industrial" (Risk). |
| **View Corridors** | Multi-select | **Optional** | **User Input** | **External** [Maps] | Premium | [Skyline, Water, Park, None]. |

**7.3 Environmental & Hazards**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Flood Zone** | Text | **Required** | **Document** [ALTA/FEMA] | **External** [FEMA API] | Insurance | e.g., "Zone X" or "Zone AE". |
| **Wetlands Present?** | Boolean | **Required** | **Document** [Env Report] | **External** [US FWS] | Regulatory | USACE jurisdiction flag. |
| **Seismic Risk** | Dropdown | **Required** | **Document** [Eng Report] | **External** [USGS] | Hazard | [Low, Moderate, High]. |
| **Seismic/PML Risk** | Text | **Optional** | **Document** [Eng Report] | **External** [USGS API] | Hazard | *Moved from Sec 5*. % PML; required in seismic zones. |
| **Phase I ESA Finding** | Dropdown | **Required** | **Document** [Phase I ESA] | **User Input** | Liability | [Clean, REC, HREC]. |
| **Noise Factors** | Multi-select | **Optional** | **Document** [Env Report] | **User Input** | Livability | [Highway, Rail, Airport, None]. |

**7.4 Infrastructure & Utilities**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Utility Availability** | Dropdown | **Required** | **Document** [Will Serve] | **User Input** | Infra | [All Available, Extension Req, None]. |
| **Easements** | Text | **Required** | **Document** [Title/ALTA] | **User Input** | Constraints | Summary of major easements. |

---

### **Section 8: Sponsor Information**

**8.1 Entity Structure**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Sponsor Entity Name** | Text | **Required** | **Document** [Org Chart] | **User Input** | Borrower | Text Input. |
| **Sponsor Structure** | Text | **Required** | **Document** [Org Chart] | **User Input** | Legal | Text Input (GP/LP). |
| **Equity Partner** | Text | **Optional** | **Document** [Org Chart] | **User Input** | Capital | Text Input. |
| **Syndication Status** | Dropdown | **Required** | **Document** [Equity Letter] | **User Input** | Capital | [Committed, In Process, TBD]. |
| **Contact Info** | Text | **Required** | **User Input** | N/A | Comms | Text Input. |

**8.2 Track Record**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Sponsor Experience** | Dropdown | **Required** | **Document** [Track Record] | **User Input** | Capacity | [First-Time, Emerging, Seasoned]. |
| **Sponsor Exp. Score** | Integer | **Optional** | **Derived** [Prior Units] | **Document** [Bio] | Capacity | 0-10 scale based on track record. |
| **Prior Developments** | Integer | **Optional** | **User Input** | **Document** [Track Record] | Track Record | # of multifamily units completed. |
| **Portfolio DSCR** | Decimal | **Optional** | **Derived** [Port NOI/Debt] | **Document** [Sponsor FS] | Performance | Min 1.20x; overall sponsor health. |

**8.3 Financial Strength**

| Field | Data Type | Requirement | Primary Source | Backup Source | Relevance | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Borrower Net Worth** | Currency | **Required** | **Document** [Personal FS] | **User Input** | Liquidity | Must be ≥ Loan Amount (typically). |
| **Guarantor Liquidity** | Currency | **Required** | **Document** [Guarantor FS] | **User Input** | Coverage | ≥10% of loan; 3-yr audited statements. |