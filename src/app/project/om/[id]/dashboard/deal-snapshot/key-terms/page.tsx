"use client";

import { dealSnapshotDetails } from "@/services/mockOMData";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Percent, Clock, Shield, FileText, Sparkles } from "lucide-react";

export default function KeyTermsPage() {

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Key Terms</h1>
        <p className="text-gray-600 mt-2">
          Comprehensive loan structure and terms overview
        </p>
      </div>

      {/* Basic Loan Terms */}
      <Card className="hover:shadow-lg transition-shadow mb-8 border-blue-200 bg-white">
        <CardHeader className="pb-3" dataSourceSection="key terms">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-800">
              Loan Structure
            </h3>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <p className="text-sm font-medium text-blue-600">Loan Type</p>
              <p className="font-bold text-lg text-gray-900">
                {dealSnapshotDetails.keyTerms.loanType}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-green-200 hover:border-green-400 transition-colors">
              <p className="text-sm font-medium text-green-600">Interest Rate</p>
              <p className="font-bold text-lg text-gray-900">
                {dealSnapshotDetails.keyTerms.rate}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-colors">
              <p className="text-sm font-medium text-purple-600">Floor Rate</p>
              <p className="font-bold text-lg text-gray-900">
                {dealSnapshotDetails.keyTerms.floor}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-amber-200 hover:border-amber-400 transition-colors">
              <p className="text-sm font-medium text-amber-600">Term</p>
              <p className="font-bold text-lg text-gray-900">
                {dealSnapshotDetails.keyTerms.term}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-cyan-200 hover:border-cyan-400 transition-colors">
              <p className="text-sm font-medium text-cyan-600">Extensions</p>
              <p className="font-bold text-lg text-gray-900">
                {dealSnapshotDetails.keyTerms.extension}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors">
              <p className="text-sm font-medium text-red-600">Recourse</p>
              <p className="font-bold text-lg text-gray-900">
                {dealSnapshotDetails.keyTerms.recourse}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fees and Reserves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow border-orange-200 bg-white">
          <CardHeader className="pb-3" dataSourceFields={['origination fee', 'exit fee', 'loan fees']}>
            <div className="flex items-center space-x-2">
              <Percent className="h-6 w-6 text-orange-600" />
              <h3 className="text-xl font-semibold text-gray-800">Fees</h3>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-orange-200 hover:border-orange-400 transition-colors">
                <span className="text-gray-700 font-medium">Origination Fee</span>
                <Badge className="bg-orange-100 text-orange-800 border-2 border-orange-300 font-semibold text-base px-3 py-1">
                  {dealSnapshotDetails.keyTerms.origination}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-amber-200 hover:border-amber-400 transition-colors">
                <span className="text-gray-700 font-medium">Exit Fee</span>
                <Badge className="bg-amber-100 text-amber-800 border-2 border-amber-300 font-semibold text-base px-3 py-1">
                  {dealSnapshotDetails.keyTerms.exitFee}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-teal-200 bg-white">
          <CardHeader className="pb-3" dataSourceSection="lender reserves">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-teal-600" />
              <h3 className="text-xl font-semibold text-gray-800">
                Lender Reserves
              </h3>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-teal-200 hover:border-teal-400 transition-colors">
                <span className="text-gray-700 font-medium">Interest Reserve</span>
                <Badge className="bg-teal-100 text-teal-800 border-2 border-teal-300 font-semibold text-base px-3 py-1">
                  {dealSnapshotDetails.keyTerms.lenderReserves.interest}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-cyan-200 hover:border-cyan-400 transition-colors">
                <span className="text-gray-700 font-medium">Tax & Insurance</span>
                <Badge className="bg-cyan-100 text-cyan-800 border-2 border-cyan-300 font-semibold text-base px-3 py-1">
                  {dealSnapshotDetails.keyTerms.lenderReserves.taxInsurance}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-emerald-200 hover:border-emerald-400 transition-colors">
                <span className="text-gray-700 font-medium">CapEx Reserve</span>
                <Badge className="bg-emerald-100 text-emerald-800 border-2 border-emerald-300 font-semibold text-base px-3 py-1">
                  {dealSnapshotDetails.keyTerms.lenderReserves.capEx}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Covenants */}
      <Card className="hover:shadow-lg transition-shadow border-violet-200 bg-white">
        <CardHeader className="pb-3" dataSourceSection="financial covenants">
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-violet-600" />
            <h3 className="text-xl font-semibold text-gray-800">
              Financial Covenants
            </h3>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-violet-200 hover:border-violet-400 transition-colors">
              <p className="text-sm font-medium text-violet-600">Minimum DSCR</p>
              <p className="font-bold text-lg text-gray-900">
                {dealSnapshotDetails.keyTerms.covenants.minDSCR}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-colors">
              <p className="text-sm font-medium text-purple-600">Maximum LTV</p>
              <p className="font-bold text-lg text-gray-900">
                {dealSnapshotDetails.keyTerms.covenants.maxLTV}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-indigo-200 hover:border-indigo-400 transition-colors">
              <p className="text-sm font-medium text-indigo-600">Minimum Liquidity</p>
              <p className="font-bold text-lg text-gray-900">
                {dealSnapshotDetails.keyTerms.covenants.minLiquidity}
              </p>
            </div>
            <div className="space-y-2 p-4 bg-white rounded-lg border-2 border-pink-200 hover:border-pink-400 transition-colors">
              <p className="text-sm font-medium text-pink-600">Completion Guaranty</p>
              <p className="font-bold text-lg text-gray-900">
                {dealSnapshotDetails.keyTerms.covenants.completionGuaranty}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow mt-8 border-emerald-200 bg-white">
        <CardHeader className="pb-3" dataSourceFields={['opportunity zone', 'tax exemption', 'affordable housing']}>
          <div className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-emerald-600" />
            <h3 className="text-xl font-semibold text-gray-800">Special Programs & Incentives</h3>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Opportunity Zone benefits, Dallas PFC lease, and workforce housing covenant tied to the Hoque structure.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {dealSnapshotDetails.specialPrograms.map((program, index) => (
              <div 
                key={program.name} 
                className={`flex items-start justify-between rounded-lg p-5 bg-white border-2 transition-all hover:shadow-md ${
                  index === 0 
                    ? 'border-emerald-300'
                    : index === 1
                    ? 'border-blue-300'
                    : 'border-purple-300'
                }`}
              >
                <div className="pr-4">
                  <h4 className={`font-bold text-lg mb-1 ${
                    index === 0 
                      ? 'text-emerald-900'
                      : index === 1
                      ? 'text-blue-900'
                      : 'text-purple-900'
                  }`}>
                    {program.name}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    index === 0 
                      ? 'text-emerald-700'
                      : index === 1
                      ? 'text-blue-700'
                      : 'text-purple-700'
                  }`}>
                    {program.description}
                  </p>
                </div>
                <Badge className={`whitespace-nowrap border-2 font-semibold text-base px-3 py-1 ${
                  index === 0
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                }`}>
                  {index === 0 ? "Qualified" : "In Structuring"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
