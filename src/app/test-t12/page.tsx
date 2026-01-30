"use client";

import React, { useState } from "react";
import { T12FinancialTable } from "@/components/project/T12FinancialTable";
import { T12FinancialData } from "@/types/t12-financial";

export default function TestT12Page() {
    const [data, setData] = useState<T12FinancialData | null>(null);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">
                        T12 Component Integration Test
                    </h1>
                    <button
                        onClick={() => setData(null)}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                    >
                        Reset to Demo Data
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <T12FinancialTable
                        data={data}
                        onChange={setData}
                        editable={true}
                    />
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">Debug State</h3>
                    <pre className="text-xs text-blue-800 overflow-auto max-h-60 p-2 bg-white/50 rounded">
                        {data ? JSON.stringify(data, null, 2) : "Using Internal Demo Data (State is null)"}
                    </pre>
                </div>
            </div>
        </div>
    );
}
