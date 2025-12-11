"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  TrendingUp,
  Phone,
  Mail,
  DollarSign,
  GraduationCap,
  Star,
  Calendar,
  User,
  MapPin,
  Briefcase,
  Award,
  AlertTriangle,
} from "lucide-react";
import PlaceholderImage from "@/components/ui/PlaceholderImage";
import { useOMPageHeader } from "@/hooks/useOMPageHeader";
import { useOmContent } from "@/hooks/useOmContent";
import { formatLocale, parseNumeric, getOMValue, formatFixed } from "@/lib/om-utils";

// Component to show missing values in red
const MissingValue = ({ children }: { children: React.ReactNode }) => (
  <span className="text-red-600 font-medium">{children}</span>
);

export default function SponsorProfilePage() {
  const { content } = useOmContent();
  
  // Extract sponsor fields from flat OM content
  const sponsorExpScore = parseNumeric(content?.sponsorExpScore) ?? null;
  const sponsorEntityName = getOMValue(content, "sponsorEntityName");
  const priorDevelopments = parseNumeric(content?.priorDevelopments) ?? null;
  const totalResidentialUnits = parseNumeric(content?.totalResidentialUnits) ?? null;
  const sponsorExperience = getOMValue(content, "sponsorExperience");
  
  // Extract borrower fields from flat OM content (from borrower resume)
  const fullLegalName = getOMValue(content, "fullLegalName");
  const primaryEntityName = getOMValue(content, "primaryEntityName");
  const primaryEntityStructure = getOMValue(content, "primaryEntityStructure");
  const contactEmail = getOMValue(content, "contactEmail");
  const contactPhone = getOMValue(content, "contactPhone");
  const contactAddress = getOMValue(content, "contactAddress");
  const yearsCREExperienceRange = getOMValue(content, "yearsCREExperienceRange");
  const assetClassesExperience = Array.isArray(content?.assetClassesExperience) 
    ? content.assetClassesExperience 
    : (typeof content?.assetClassesExperience === 'string' ? [content.assetClassesExperience] : null);
  const geographicMarketsExperience = Array.isArray(content?.geographicMarketsExperience)
    ? content.geographicMarketsExperience
    : (typeof content?.geographicMarketsExperience === 'string' ? [content.geographicMarketsExperience] : null);
  const totalDealValueClosedRange = getOMValue(content, "totalDealValueClosedRange");
  const existingLenderRelationships = getOMValue(content, "existingLenderRelationships");
  const bioNarrative = getOMValue(content, "bioNarrative");
  const creditScoreRange = getOMValue(content, "creditScoreRange");
  const netWorthRange = getOMValue(content, "netWorthRange");
  const liquidityRange = getOMValue(content, "liquidityRange");
  const bankruptcyHistory = content?.bankruptcyHistory;
  const foreclosureHistory = content?.foreclosureHistory;
  const litigationHistory = getOMValue(content, "litigationHistory");
  const linkedinUrl = getOMValue(content, "linkedinUrl");
  const websiteUrl = getOMValue(content, "websiteUrl");
  
  // Build sponsor profile from flat fields
  const sponsorProfile = {
    firmName: sponsorEntityName,
    yearFounded: null, // Not directly available
    totalDeveloped: priorDevelopments,
    totalUnits: totalResidentialUnits,
    activeProjects: null, // Not directly available
    sponsorEntityName,
    sponsorExperience,
    sponsorExpScore,
  };
  
  // Principals, references, and track record - hardcoded demo data
  const principals: any[] = [
    {
      name: "Mike Hoque",
      role: "Founder & CEO",
      experience: "20+ years",
      bio: "Mike Hoque is the founder and CEO of Hoque Global, a Dallas-based master developer specializing in catalytic mixed-use districts and workforce housing. With over 20 years of experience in real estate development, Mike has led the company in delivering over $500M in development value across Texas.",
      education: "MBA, Southern Methodist University",
      specialties: ["Mixed-Use Development", "Public-Private Partnerships", "Workforce Housing"],
      achievements: [
        "Led development of $200M+ in mixed-use projects",
        "Established strategic partnerships with City of Dallas",
        "Delivered 1,000+ residential units"
      ]
    },
    {
      name: "Sarah Johnson",
      role: "Chief Operating Officer",
      experience: "15+ years",
      bio: "Sarah Johnson brings extensive operational expertise to Hoque Global, overseeing project execution and ensuring timely delivery of developments. She has managed complex construction projects totaling over $300M in value.",
      education: "BS Civil Engineering, University of Texas",
      specialties: ["Project Management", "Construction Operations", "Cost Control"],
      achievements: [
        "Managed 15+ successful project completions",
        "Achieved 98% on-time delivery rate",
        "Reduced construction costs by 12% through optimization"
      ]
    }
  ];
  
  const references: any[] = [
    {
      firm: "Frost Bank",
      relationship: "Construction Lender",
      years: "8 years",
      contact: "John Smith, VP Commercial Lending"
    },
    {
      firm: "Citi Community Capital",
      relationship: "Affordable Housing Lender",
      years: "5 years",
      contact: "Jane Doe, Director of Community Development"
    },
    {
      firm: "Dallas Housing Finance Corp",
      relationship: "Public Finance Partner",
      years: "10 years",
      contact: "Robert Williams, Executive Director"
    }
  ];
  
  const trackRecord: any[] = [
    {
      project: "Downtown Dallas Mixed-Use",
      year: 2022,
      units: 180,
      irr: 22.5,
      market: "Dallas-Fort Worth",
      type: "Mixed-Use"
    },
    {
      project: "East Dallas Apartments",
      year: 2020,
      units: 120,
      irr: 19.8,
      market: "Dallas-Fort Worth",
      type: "Multifamily"
    },
    {
      project: "Fort Worth Workforce Housing",
      year: 2019,
      units: 95,
      irr: 18.2,
      market: "Dallas-Fort Worth",
      type: "Affordable Housing"
    },
    {
      project: "Plano Office Complex",
      year: 2018,
      units: 0,
      irr: 16.5,
      market: "Dallas-Fort Worth",
      type: "Office"
    }
  ];

  const getIRRColor = (irr?: string | number | null) => {
    const irrNum =
      typeof irr === "number"
        ? irr
        : parseFloat(typeof irr === "string" ? irr : String(irr ?? ""));
    if (Number.isNaN(irrNum)) return "bg-gray-100 text-gray-800";
    if (irrNum >= 25) return "bg-green-100 text-green-800";
    if (irrNum >= 20) return "bg-blue-100 text-blue-800";
    if (irrNum >= 15) return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  const getIrrValue = (irr?: string | number | null) => {
    const irrNum =
      typeof irr === "number"
        ? irr
        : parseFloat(typeof irr === "string" ? irr : String(irr ?? ""));
    return Number.isNaN(irrNum) ? null : irrNum;
  };

  useOMPageHeader({
    subtitle: "Sponsor and borrower entity information, experience, track record, and financial profile.",
  });

  return (
    <div className="space-y-6">
      {/* Entity Information */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-800">Entity Information</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Full Legal Name</p>
              <p className="text-sm font-semibold text-gray-800">
                {fullLegalName ? fullLegalName : <MissingValue>Hoque Global</MissingValue>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Primary Entity Name</p>
              <p className="text-sm font-semibold text-gray-800">
                {primaryEntityName ? primaryEntityName : <MissingValue>Hoque Global / ACARA PFC JV</MissingValue>}
              </p>
            </div>
            {primaryEntityStructure && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Entity Structure</p>
                <Badge className="bg-blue-100 text-blue-800">{primaryEntityStructure}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <User className="h-6 w-6 text-green-600" />
            <h3 className="text-xl font-semibold text-gray-800">Contact Information</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                <p className="text-sm font-medium text-gray-800">
                  {contactEmail ? contactEmail : <MissingValue>info@hoqueglobal.com</MissingValue>}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                <p className="text-sm font-medium text-gray-800">
                  {contactPhone ? contactPhone : <MissingValue>972.455.1943</MissingValue>}
                </p>
              </div>
            </div>
            {contactAddress && (
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Mailing Address</p>
                  <p className="text-sm font-medium text-gray-800">{contactAddress}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Company Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Building2 className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">Founded</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {sponsorProfile?.yearFounded != null ? sponsorProfile.yearFounded : <MissingValue>2008</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">Years in business</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-green-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">
                Total Developed
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {sponsorProfile?.totalDeveloped != null ? formatLocale(sponsorProfile.totalDeveloped) : <MissingValue>1,000</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">Cumulative value</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">
                Total Units
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {sponsorProfile?.totalUnits != null ? formatLocale(sponsorProfile.totalUnits) : <MissingValue>250</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">Units delivered</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-red-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">
                Active Projects
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {sponsorProfile?.activeProjects != null ? sponsorProfile.activeProjects : <MissingValue>3</MissingValue>}
            </p>
            <p className="text-sm text-gray-500 mt-1">Current developments</p>
          </CardContent>
        </Card>
      </div>

      {/* Company Information */}
      <Card className="hover:shadow-lg transition-shadow mb-8">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">
            Company Information
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">
                Company Details
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Company Name</p>
                  <p className="font-medium text-gray-800">
                    {sponsorProfile?.firmName ? sponsorProfile.firmName : <MissingValue>Hoque Global</MissingValue>}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Year Founded</p>
                  <p className="font-medium text-gray-800">
                    {sponsorProfile?.yearFounded != null ? sponsorProfile.yearFounded : <MissingValue>2008</MissingValue>}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    Total Development Value
                  </p>
                  <p className="font-medium text-gray-800">
                    {sponsorProfile?.totalDeveloped != null ? formatLocale(sponsorProfile.totalDeveloped) : <MissingValue>1,000</MissingValue>}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Units Delivered</p>
                  <p className="font-medium text-gray-800">
                    {sponsorProfile?.totalUnits != null ? formatLocale(sponsorProfile.totalUnits) : <MissingValue>250</MissingValue>}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Projects</p>
                  <p className="font-medium text-gray-800">
                    {sponsorProfile?.activeProjects != null ? sponsorProfile.activeProjects : <MissingValue>3</MissingValue>}
                  </p>
                </div>
                {sponsorExpScore != null && (
                  <div>
                    <p className="text-sm text-gray-500">Sponsor Experience Score</p>
                    <p className="font-medium text-gray-800">{sponsorExpScore}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-3">
                Experience & Track Record
              </h4>
              <div className="space-y-3">
                {yearsCREExperienceRange && (
                  <div>
                    <p className="text-sm text-gray-500">Years of CRE Experience</p>
                    <p className="font-medium text-gray-800">{yearsCREExperienceRange}</p>
                  </div>
                )}
                {assetClassesExperience && assetClassesExperience.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Asset Classes Experience</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {assetClassesExperience.map((asset: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {asset}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {geographicMarketsExperience && geographicMarketsExperience.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Geographic Markets Experience</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {geographicMarketsExperience.map((market: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {market}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {totalDealValueClosedRange && (
                  <div>
                    <p className="text-sm text-gray-500">Total Deal Value Closed</p>
                    <p className="font-medium text-gray-800">{totalDealValueClosedRange}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Principal Team */}
      <Card className="hover:shadow-lg transition-shadow mb-8">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">
            Principal Team
          </h3>
          <p className="text-sm text-gray-600">
            Meet the leadership team driving our success
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {principals.map(
              (principal: { name?: string | null; role?: string | null; experience?: string | null; bio?: string | null; education?: string | null; specialties?: string[] | null; achievements?: string[] | null }, index: number) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start mb-6">
                    <div className="mr-4 flex-shrink-0">
                      <PlaceholderImage
                        name={principal.name ?? ''}
                        size={80}
                        color={index === 0 ? "3B82F6" : "10B981"}
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-gray-800 mb-1">
                        <MissingValue>{principal.name}</MissingValue>
                      </h4>
                      <p className="text-lg font-semibold text-blue-600 mb-2">
                        <MissingValue>{principal.role}</MissingValue>
                      </p>
                      <div className="flex items-center mb-3">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <Badge className="bg-blue-100 text-blue-800 border-0">
                          <MissingValue>{principal.experience} Experience</MissingValue>
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-700 leading-relaxed">
                        <MissingValue>{principal.bio}</MissingValue>
                      </p>
                    </div>

                    <div className="flex items-center">
                      <GraduationCap className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">
                        <MissingValue>{principal.education}</MissingValue>
                      </span>
                    </div>

                    <div>
                      <h5 className="font-semibold text-gray-800 mb-2">
                        Specialties
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {(principal.specialties ?? []).map((specialty: string, idx: number) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs"
                          >
                            <MissingValue>{specialty}</MissingValue>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-semibold text-gray-800 mb-2">
                        Key Achievements
                      </h5>
                      <div className="space-y-2">
                        {(principal.achievements ?? []).map((achievement: string, idx: number) => (
                          <div key={idx} className="flex items-center">
                            <Star className="h-3 w-3 text-green-500 mr-2" />
                            <span className="text-sm text-gray-600">
                              <MissingValue>{achievement}</MissingValue>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Track Record */}
      <Card className="hover:shadow-lg transition-shadow mb-8">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">Track Record</h3>
          <p className="text-sm text-gray-600">
            Proven success across diverse project types and markets
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">
                    Project
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">
                    Year
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">
                    Units
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">
                    IRR
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">
                    Market
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-800">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody>
                {trackRecord.map((project: { project?: string | null; year?: number | null; units?: number | null; irr?: string | number | null; market?: string | null; type?: string | null }, index: number) => {
                  const irrValue = getIrrValue(project.irr);
                  return (
                    <tr
                      key={index}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-800">
                          <MissingValue>{project.project}</MissingValue>
                        </p>
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        <MissingValue>{project.year}</MissingValue>
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {project.units != null ? project.units : <MissingValue>0</MissingValue>}
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={getIRRColor(irrValue)}>
                          {irrValue != null ? (
                            <MissingValue>{formatFixed(irrValue, 2)}%</MissingValue>
                          ) : null}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline" className="text-xs">
                          <MissingValue>{project.market}</MissingValue>
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline" className="text-xs">
                          <MissingValue>{project.type}</MissingValue>
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          {irrValue != null ? (
                            irrValue >= 25 ? (
                              <Badge className="bg-green-100 text-green-800">
                                <MissingValue>Exceptional</MissingValue>
                              </Badge>
                            ) : irrValue >= 20 ? (
                              <Badge className="bg-blue-100 text-blue-800">
                                <MissingValue>Strong</MissingValue>
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">
                                <MissingValue>Good</MissingValue>
                              </Badge>
                            )
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* References */}
      <Card className="hover:shadow-lg transition-shadow mb-8">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">References</h3>
          <p className="text-sm text-gray-600">
            Established relationships with leading financial institutions
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {references.map((reference: { firm?: string | null; relationship?: string | null; years?: string | null; contact?: string | null }, index: number) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        <MissingValue>{reference.firm}</MissingValue>
                      </h4>
                      <p className="text-sm text-blue-600 font-medium">
                        <MissingValue>{reference.relationship}</MissingValue>
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">
                        <MissingValue>{reference.years}</MissingValue>
                      </span>
                    </div>
                    <div className="pt-2">
                      <p className="text-sm text-gray-600">
                        <MissingValue>{reference.contact}</MissingValue>
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Experience & Track Record */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Briefcase className="h-6 w-6 text-purple-600" />
            <h3 className="text-xl font-semibold text-gray-800">Experience & Track Record</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {yearsCREExperienceRange ? (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Years of CRE Experience</p>
                <p className="text-sm font-semibold text-gray-800">{yearsCREExperienceRange}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Years of CRE Experience</p>
                <p className="text-sm font-semibold text-gray-800"><MissingValue>16+</MissingValue></p>
              </div>
            )}
            {assetClassesExperience && assetClassesExperience.length > 0 ? (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Asset Classes Experience</p>
                <div className="flex flex-wrap gap-2">
                  {assetClassesExperience.map((asset: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {asset}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Asset Classes Experience</p>
                <div className="flex flex-wrap gap-2">
                  {['Mixed-Use', 'Multifamily', 'Office', 'Master-Planned Districts'].map((asset: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      <MissingValue>{asset}</MissingValue>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {geographicMarketsExperience && geographicMarketsExperience.length > 0 ? (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Geographic Markets Experience</p>
                <div className="flex flex-wrap gap-2">
                  {geographicMarketsExperience.map((market: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {market}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Geographic Markets Experience</p>
                <div className="flex flex-wrap gap-2">
                  {['Dallas-Fort Worth', 'Texas Triangle', 'Southeast US'].map((market: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      <MissingValue>{market}</MissingValue>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {totalDealValueClosedRange ? (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Deal Value Closed</p>
                <p className="text-sm font-semibold text-gray-800">{totalDealValueClosedRange}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Deal Value Closed</p>
                <p className="text-sm font-semibold text-gray-800"><MissingValue>$500M+</MissingValue></p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial Profile */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Award className="h-6 w-6 text-green-600" />
            <h3 className="text-xl font-semibold text-gray-800">Financial Profile</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {creditScoreRange ? (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Credit Score Range</p>
                <p className="text-lg font-semibold text-gray-800">{creditScoreRange}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Credit Score Range</p>
                <p className="text-lg font-semibold text-gray-800"><MissingValue>700-749</MissingValue></p>
              </div>
            )}
            {netWorthRange ? (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Net Worth Range</p>
                <p className="text-lg font-semibold text-gray-800">{netWorthRange}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Net Worth Range</p>
                <p className="text-lg font-semibold text-gray-800"><MissingValue>$50M-$100M</MissingValue></p>
              </div>
            )}
            {liquidityRange ? (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Liquidity Range</p>
                <p className="text-lg font-semibold text-gray-800">{liquidityRange}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Liquidity Range</p>
                <p className="text-lg font-semibold text-gray-800"><MissingValue>$5M-$10M</MissingValue></p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lender Relationships */}
      {existingLenderRelationships ? (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Existing Lender Relationships</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{existingLenderRelationships}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Existing Lender Relationships</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700"><MissingValue>Frost Bank; Citi Community Capital; Dallas Housing Finance Corp</MissingValue></p>
          </CardContent>
        </Card>
      )}

      {/* Bio */}
      {bioNarrative ? (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Bio</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 leading-relaxed">{bioNarrative}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Bio</h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 leading-relaxed">
              <MissingValue>Hoque Global is a Dallas-based master developer delivering catalytic mixed-use districts and workforce housing through public-private partnerships, including PFC structures with the City of Dallas. ACARA serves as capital partner, structuring Opportunity Zone-aligned investments with a $950M+ track record across Texas.</MissingValue>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Risk Factors */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h3 className="text-xl font-semibold text-gray-800">Risk Factors</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Bankruptcy History (7yr)</p>
              {bankruptcyHistory !== undefined ? (
                <Badge className={bankruptcyHistory === true || bankruptcyHistory === 'Yes' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                  {bankruptcyHistory === true || bankruptcyHistory === 'Yes' ? 'Yes' : 'No'}
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-800">
                  <MissingValue>No</MissingValue>
                </Badge>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Foreclosure History (7yr)</p>
              {foreclosureHistory !== undefined ? (
                <Badge className={foreclosureHistory === true || foreclosureHistory === 'Yes' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                  {foreclosureHistory === true || foreclosureHistory === 'Yes' ? 'Yes' : 'No'}
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-800">
                  <MissingValue>No</MissingValue>
                </Badge>
              )}
            </div>
            {litigationHistory && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Litigation History</p>
                <p className="text-sm text-gray-700">{litigationHistory}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Online Presence */}
      {(linkedinUrl || websiteUrl) ? (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Online Presence</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {linkedinUrl && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">LinkedIn</p>
                  <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    {linkedinUrl}
                  </a>
                </div>
              )}
              {websiteUrl && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Company Website</p>
                  <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                    {websiteUrl}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-800">Online Presence</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">LinkedIn</p>
                <a href="https://www.linkedin.com/company/hoque-global" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  <MissingValue>https://www.linkedin.com/company/hoque-global</MissingValue>
                </a>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Company Website</p>
                <a href="https://www.hoqueglobal.com" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  <MissingValue>https://www.hoqueglobal.com</MissingValue>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Strengths */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-800">
            Company Strengths
          </h3>
          <p className="text-sm text-gray-600">
            Core competencies that drive our success
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-white rounded-xl p-6 border border-green-100">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Development Expertise
              </h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  {sponsorProfile?.totalUnits != null ? formatLocale(sponsorProfile.totalUnits) : <MissingValue>250</MissingValue>}{" "}
                  units delivered
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  {sponsorProfile?.yearFounded != null ? sponsorProfile.yearFounded : <MissingValue>16</MissingValue>} years of
                  experience
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  <MissingValue>Proven track record across multiple projects</MissingValue>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 border border-blue-100">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Financial Performance
              </h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  <MissingValue>Strong IRR performance (18-26%)</MissingValue>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  {sponsorProfile?.totalDeveloped != null ? formatLocale(sponsorProfile.totalDeveloped) : <MissingValue>1,000</MissingValue>} total
                  development value
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  <MissingValue>Consistent project delivery</MissingValue>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 border border-blue-100">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Market Position
              </h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  <MissingValue>Established lender relationships</MissingValue>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  <MissingValue>Strong local market knowledge</MissingValue>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  <MissingValue>Reputation for quality execution</MissingValue>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
