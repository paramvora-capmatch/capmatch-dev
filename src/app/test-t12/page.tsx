"use client";

import React, { useState } from "react";
import { T12FinancialTable } from "@/components/project/T12FinancialTable";
import { T12FinancialData } from "@/types/t12-financial";
import { ExcelRegionSelectorModal } from "@/components/ui/ExcelRegionSelectorModal";
import { ExcelSelection } from "@/components/ui/ExcelRegionSelector";
import { FileUp, TableProperties, RefreshCw } from "lucide-react";
import { mapExcelToT12 } from "@/utils/excel-mapping";
import { supabase } from "@/lib/supabaseClient";

export default function TestT12Page() {
    const [data, setData] = useState<T12FinancialData | null>(null);
    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [lastSelection, setLastSelection] = useState<ExcelSelection | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setIsExcelModalOpen(true);
        }
    };

    const handleExcelConfirm = async (selection: ExcelSelection) => {
        console.log("Region selected:", selection);
        setLastSelection(selection);

        if (!selectedFile) return;

        try {
            setIsExtracting(true);
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("sheet_name", selection.sheetName);
            formData.append("range_a1", selection.rangeA1);

            // Get session for token
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch("http://localhost:8000/api/v1/underwriting/extract-excel-region", {
                method: "POST",
                headers: {
                    ...(token && { "Authorization": `Bearer ${token}` }),
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Failed to extract region");
            }

            const result = await response.json();
            console.log("Extraction result:", result);

            // Map the extracted data to T12 format using indentation levels
            const mappedData = mapExcelToT12(result.data, result.indentation_levels, {
                hasHeaderRow: true // Assuming first row has month headers
            });

            setData(mappedData);

            alert(`Successfully extracted and mapped hierarchical structure from ${selection.rangeA1}!`);
        } catch (error: any) {
            console.error("Extraction error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsExtracting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">
                        T12 Component Integration Test
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                id="excel-upload"
                            />
                            <label
                                htmlFor="excel-upload"
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-md hover:bg-blue-50 cursor-pointer transition-colors"
                            >
                                <FileUp className="h-4 w-4" />
                                Extract from Excel
                            </label>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setData(null);
                                setLastSelection(null);
                            }}
                            className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {lastSelection && (
                    <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex items-center gap-3">
                        <TableProperties className="h-5 w-5 text-green-600" />
                        <div className="text-sm">
                            <span className="font-semibold text-green-800">Ready for processing:</span>
                            <span className="text-green-700 ml-2">
                                Range <code className="bg-white px-1 rounded border border-green-200">{lastSelection.rangeA1}</code>
                                from sheet <span className="italic font-medium">{lastSelection.sheetName}</span>
                            </span>
                        </div>
                    </div>
                )}

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

            <ExcelRegionSelectorModal
                isOpen={isExcelModalOpen}
                onClose={() => setIsExcelModalOpen(false)}
                file={selectedFile}
                onConfirm={handleExcelConfirm}
            />
        </div>
    );
}

