"use client";

import { dealSnapshotDetails } from "@/services/mockOMData";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Info } from "lucide-react";

export default function RiskAnalysisPage() {
  const getRiskColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-red-200 bg-red-50";
      case "medium":
        return "border-yellow-200 bg-yellow-50";
      case "low":
        return "border-green-200 bg-green-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const getProbabilityColor = (probability: string) => {
    const prob = parseInt(probability);
    if (prob >= 50) return "bg-red-100 text-red-800";
    if (prob >= 25) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  return (
    <div className="space-y-6 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Risk Analysis</h1>
        <p className="text-gray-600 mt-2">
          Comprehensive risk assessment and mitigation strategies
        </p>
      </div>

      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-semibold text-red-800">High Risk</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {dealSnapshotDetails.riskMatrix.high.length}
            </p>
            <p className="text-sm text-red-600 mt-1">Critical issues</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-semibold text-yellow-800">
              Medium Risk
            </h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {dealSnapshotDetails.riskMatrix.medium.length}
            </p>
            <p className="text-sm text-yellow-600 mt-1">Monitor closely</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <h3 className="text-lg font-semibold text-green-800">Low Risk</h3>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {dealSnapshotDetails.riskMatrix.low.length}
            </p>
            <p className="text-sm text-green-600 mt-1">Well controlled</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Matrix */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold">Risk Matrix</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* High Risk */}
            {dealSnapshotDetails.riskMatrix.high.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-red-800 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  High Risk Items
                </h3>
                {dealSnapshotDetails.riskMatrix.high.map(
                  (risk: Record<string, unknown>, index: number) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${getRiskColor(
                        "high"
                      )}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-900 mb-2">
                            {risk.risk as string}
                          </h4>
                          <p className="text-red-800 text-sm mb-3">
                            {risk.mitigation as string}
                          </p>
                          <Badge
                            className={getProbabilityColor(
                              risk.probability as string
                            )}
                          >
                            Probability: {risk.probability as string}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-green-600 font-medium">
                  No high-risk items identified
                </p>
                <p className="text-green-500 text-sm">
                  Excellent risk management
                </p>
              </div>
            )}

            {/* Medium Risk */}
            {dealSnapshotDetails.riskMatrix.medium.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-yellow-800 flex items-center">
                  <Info className="h-5 w-5 mr-2" />
                  Medium Risk Items
                </h3>
                {dealSnapshotDetails.riskMatrix.medium.map(
                  (risk: Record<string, unknown>, index: number) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${getRiskColor(
                        "medium"
                      )}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-yellow-900 mb-2">
                            {risk.risk as string}
                          </h4>
                          <p className="text-yellow-800 text-sm mb-3">
                            {risk.mitigation as string}
                          </p>
                          <Badge
                            className={getProbabilityColor(
                              risk.probability as string
                            )}
                          >
                            Probability: {risk.probability as string}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Low Risk */}
            {dealSnapshotDetails.riskMatrix.low.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-800 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Low Risk Items
                </h3>
                {dealSnapshotDetails.riskMatrix.low.map(
                  (risk: Record<string, unknown>, index: number) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${getRiskColor("low")}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-green-900 mb-2">
                            {risk.risk as string}
                          </h4>
                          <p className="text-green-800 text-sm mb-3">
                            {risk.mitigation as string}
                          </p>
                          <Badge
                            className={getProbabilityColor(
                              risk.probability as string
                            )}
                          >
                            Probability: {risk.probability as string}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Risk Mitigation Summary */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold">Risk Mitigation Summary</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Key Mitigation Strategies
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Fixed-price GMP contract with contingency
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Strong pre-leasing commitments
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  Full entitlement and permits secured
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Risk Monitoring
              </h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Monthly construction cost reviews
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Quarterly market demand analysis
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  Regular entitlement compliance checks
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
