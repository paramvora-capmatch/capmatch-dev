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
} from "lucide-react";
import PlaceholderImage from "@/components/ui/PlaceholderImage";
import { useOMPageHeader } from "@/hooks/useOMPageHeader";
import { useOmContent } from "@/hooks/useOmContent";

export default function SponsorProfilePage() {
  const { content } = useOmContent();
  const financialDetails = content?.financialDetails ?? null;
  const sponsorProfile = financialDetails?.sponsorProfile ?? null;
  const principals = sponsorProfile?.principals ?? [];
  const references = sponsorProfile?.references ?? [];
  const trackRecord = sponsorProfile?.trackRecord ?? [];

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
    subtitle: "Sponsor team overview, track record, and lender references.",
  });

  return (
    <div className="space-y-6">

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
              {sponsorProfile?.yearFounded ?? null}
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
              {sponsorProfile?.totalDeveloped ?? null}
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
              {sponsorProfile?.totalUnits?.toLocaleString() ?? null}
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
              {sponsorProfile?.activeProjects ?? null}
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
                    {sponsorProfile?.firmName ?? null}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Year Founded</p>
                  <p className="font-medium text-gray-800">
                    {sponsorProfile?.yearFounded ?? null}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    Total Development Value
                  </p>
                  <p className="font-medium text-gray-800">
                    {sponsorProfile?.totalDeveloped ?? null}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Units Delivered</p>
                  <p className="font-medium text-gray-800">
                    {sponsorProfile?.totalUnits?.toLocaleString() ?? null}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Projects</p>
                  <p className="font-medium text-gray-800">
                    {sponsorProfile?.activeProjects ?? null}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-3">
                Contact Information
              </h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    Available upon request
                  </span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    Available upon request
                  </span>
                </div>
                <div className="pt-4">
                  <p className="text-sm text-gray-500">
                    For detailed contact information and references, please
                    contact the deal team.
                  </p>
                </div>
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
                        {principal.name}
                      </h4>
                      <p className="text-lg font-semibold text-blue-600 mb-2">
                        {principal.role}
                      </p>
                      <div className="flex items-center mb-3">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <Badge className="bg-blue-100 text-blue-800 border-0">
                          {principal.experience} Experience
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-700 leading-relaxed">
                        {principal.bio}
                      </p>
                    </div>

                    <div className="flex items-center">
                      <GraduationCap className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">
                        {principal.education}
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
                            {specialty}
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
                              {achievement}
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
                          {project.project}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {project.year ?? null}
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {project.units ?? null}
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={getIRRColor(irrValue)}>
                          {irrValue != null ? `${irrValue}%` : null}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline" className="text-xs">
                          {project.market}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline" className="text-xs">
                          {project.type}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          {irrValue != null ? (
                            irrValue >= 25 ? (
                              <Badge className="bg-green-100 text-green-800">
                                Exceptional
                              </Badge>
                            ) : irrValue >= 20 ? (
                              <Badge className="bg-blue-100 text-blue-800">
                                Strong
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">
                                Good
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
                        {reference.firm ?? null}
                      </h4>
                      <p className="text-sm text-blue-600 font-medium">
                        {reference.relationship ?? null}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">
                        {reference.years ?? null}
                      </span>
                    </div>
                    <div className="pt-2">
                      <p className="text-sm text-gray-600">
                        {reference.contact ?? null}
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

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
                  {sponsorProfile?.totalUnits?.toLocaleString() ?? null}{" "}
                  units delivered
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  {sponsorProfile?.yearFounded ?? null} years of
                  experience
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">•</span>
                  Proven track record across multiple projects
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
                  Strong IRR performance (18-26%)
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  {sponsorProfile?.totalDeveloped ?? null} total
                  development value
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  Consistent project delivery
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
                  Established lender relationships
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  Strong local market knowledge
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-2">•</span>
                  Reputation for quality execution
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
