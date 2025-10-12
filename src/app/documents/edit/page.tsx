"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Upload, File, Edit, Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Button } from "@/components/ui/Button";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// Excel Editor Component
const ExcelEditor: React.FC<{ file: File }> = ({ file }) => {
  const [data, setData] = useState<any[][]>([]);
  const [sheetName, setSheetName] = useState<string>("");

  React.useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const workbook = XLSX.read(e.target?.result, { type: "binary" });
      const firstSheetName = workbook.SheetNames[0];
      setSheetName(firstSheetName);
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      setData(jsonData as any[][]);
    };
    reader.readAsBinaryString(file);
  }, [file]);

  const handleCellChange = (
    rowIndex: number,
    colIndex: number,
    value: string
  ) => {
    const newData = [...data];
    if (!newData[rowIndex]) newData[rowIndex] = [];
    newData[rowIndex][colIndex] = value;
    setData(newData);
  };

  const handleDownload = () => {
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Sheet1");
    XLSX.writeFile(workbook, file.name.replace(/\.xlsx?$/, "_edited.xlsx"));
  };

  return (
    <div>
      <div className="overflow-auto border rounded-lg max-h-[60vh]">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="px-1 py-0 whitespace-nowrap">
                    <input
                      type="text"
                      value={cell || ""}
                      onChange={(e) =>
                        handleCellChange(rowIndex, colIndex, e.target.value)
                      }
                      className="w-full p-1 border border-transparent focus:border-blue-500 focus:outline-none rounded-sm bg-transparent"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        onClick={handleDownload}
        className="mt-4"
        leftIcon={<Download size={16} />}
      >
        Download Edited Excel
      </Button>
    </div>
  );
};

// Word Editor Component
const WordEditor: React.FC<{ file: File }> = ({ file }) => {
  const [htmlContent, setHtmlContent] = useState("");

  React.useEffect(() => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        const result = await mammoth.convertToHtml({
          arrayBuffer: e.target.result as ArrayBuffer,
        });
        setHtmlContent(result.value);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [file]);

  return (
    <div>
      <div
        contentEditable
        className="prose max-w-none border p-4 rounded-lg min-h-[60vh] overflow-auto focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      <p className="text-sm text-gray-500 mt-2">
        Basic editing is enabled. Saving back to .docx format is not supported
        in this demo.
      </p>
    </div>
  );
};

// PDF Viewer Component
const PdfViewer: React.FC<{ file: File }> = ({ file }) => {
  const [numPages, setNumPages] = useState<number>();

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }): void => {
    setNumPages(numPages);
  };

  return (
    <div>
      <div className="border rounded-lg min-h-[60vh] overflow-auto bg-gray-100 p-4">
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          }
          error={
            <div className="text-red-500 text-center">Failed to load PDF.</div>
          }
        >
          {Array.from({ length: numPages || 0 }, (_, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              className="mb-4 shadow-md"
              renderTextLayer={false} // Improves performance for this demo
            />
          ))}
        </Document>
      </div>
      <p className="text-sm text-gray-500 mt-2">
        PDF viewing is enabled. Full editing functionality is complex and not
        included in this demo.
      </p>
    </div>
  );
};

export default function DocumentEditPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"excel" | "word" | "pdf" | null>(
    null
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setFileType(null);
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (["xlsx", "xls"].includes(extension!)) {
      setFileType("excel");
    } else if (extension === "docx") {
      setFileType("word");
    } else if (extension === "pdf") {
      setFileType("pdf");
    } else {
      alert(
        "Unsupported file type. Please select an Excel, Word, or PDF file."
      );
      setFileType(null);
      setSelectedFile(null);
      e.target.value = ""; // Reset file input
      return;
    }
    setSelectedFile(file);
  };

  const renderEditor = () => {
    if (!selectedFile) return null;
    switch (fileType) {
      case "excel":
        return <ExcelEditor file={selectedFile} />;
      case "word":
        return <WordEditor file={selectedFile} />;
      case "pdf":
        return <PdfViewer file={selectedFile} />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout title="Offline Document Editor">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center">
              <Edit className="mr-2" /> Document Playground
            </h2>
            <label className="inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-md text-sm px-4 py-2 cursor-pointer">
              <Upload size={16} className="mr-2" />
              <span>Open File</span>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".xlsx,.xls,.doc,.docx,.pdf"
              />
            </label>
          </div>
          <p className="text-sm text-gray-500">
            This is a temporary, offline-only page to test document editing
            capabilities. Changes are not saved to any database.
          </p>
        </CardHeader>
        <CardContent>
          {selectedFile ? (
            <div>
              <div className="mb-4 p-3 bg-gray-100 rounded-md border border-gray-200 flex items-center justify-between">
                <div className="flex items-center min-w-0">
                  <File className="h-5 w-5 mr-2 text-gray-600 flex-shrink-0" />
                  <span
                    className="font-medium text-gray-800 truncate"
                    title={selectedFile.name}
                  >
                    {selectedFile.name}
                  </span>
                </div>
                <span className="text-sm text-gray-500 capitalize ml-4 flex-shrink-0">
                  {fileType}
                </span>
              </div>
              {renderEditor()}
            </div>
          ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <p className="text-gray-500">Select a file to begin editing.</p>
              <p className="text-xs text-gray-400 mt-1">
                Supported formats: .xlsx, .docx, .pdf
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
