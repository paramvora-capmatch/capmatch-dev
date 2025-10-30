"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Button } from "../ui/Button";
import { X, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';

// Set workerSrc to a CDN to avoid bundling issues with Next.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.mjs`;

interface DiffViewerProps {
  resourceId: string;
  versionId1: string; // Earlier version
  versionId2: string; // Later version
  onClose: () => void;
}

interface DiffLine {
  type: "added" | "removed" | "context";
  content: string;
  lineNumber1?: number;
  lineNumber2?: number;
}

interface VersionInfo {
  id: string;
  version_number: number;
  created_at: string;
  storage_path: string;
}

const extractTextFromPdf = async (buffer: ArrayBuffer): Promise<string> => {
  try {
    const pdf = await pdfjs.getDocument({ data: buffer } as Record<
      string,
      unknown
    >).promise;
    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: { str: string }) => item.str)
        .join(" ");
      text += pageText + "\n";
    }

    return text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
};

const extractTextFromExcel = async (buffer: ArrayBuffer): Promise<string> => {
  try {
    const workbook = XLSX.read(buffer, { type: "array" });
    let text = "";

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      text += `Sheet: ${sheetName}\n`;
      const csvText = XLSX.utils.sheet_to_csv(sheet);
      text += csvText + "\n\n";
    });

    return text;
  } catch (error) {
    console.error("Error extracting text from Excel:", error);
    throw new Error("Failed to extract text from Excel file");
  }
};

const extractTextFromPowerPoint = async (
  buffer: ArrayBuffer
): Promise<string> => {
  try {
    // PowerPoint files are ZIP archives - we need to extract XML content
    const zip = await import("jszip").then((m) => new m.default());
    const zipData = await zip.loadAsync(buffer);

    let text = "";
    const slideFiles = Object.keys(zipData.files).filter((name: string) =>
      name.match(/ppt\/slides\/slide\d+\.xml$/)
    );

    for (const slideFile of slideFiles.sort()) {
      const content = await zipData.files[slideFile].async("string");
      // Extract text from XML tags (simple regex-based extraction)
      const textMatches = content.match(/<a:t>([^<]+)<\/a:t>/g);
      if (textMatches) {
        textMatches.forEach((match: string) => {
          const extractedText = match.replace(/<a:t>|<\/a:t>/g, "");
          text += extractedText + "\n";
        });
      }
      text += "\n---\n";
    }

    return text;
  } catch (error) {
    console.error("Error extracting text from PowerPoint:", error);
    throw new Error("Failed to extract text from PowerPoint file");
  }
};

const extractTextFromDocx = async (buffer: ArrayBuffer): Promise<string> => {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value;
  } catch (error) {
    console.error("Error extracting text from DOCX:", error);
    throw new Error("Failed to extract text from document");
  }
};

const extractText = async (
  buffer: ArrayBuffer,
  filename: string
): Promise<string> => {
  const ext = filename.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "docx":
    case "doc":
      return extractTextFromDocx(buffer);
    case "pdf":
      return extractTextFromPdf(buffer);
    case "xlsx":
    case "xls":
      return extractTextFromExcel(buffer);
    case "pptx":
    case "ppt":
      return extractTextFromPowerPoint(buffer);
    default:
      throw new Error(`Unsupported file format: ${ext}`);
  }
};

const computeDiff = (text1: string, text2: string): DiffLine[] => {
  const lines1 = text1.split("\n");
  const lines2 = text2.split("\n");
  const diffs: DiffLine[] = [];

  // Simple line-by-line diff (can be improved with a proper diff algorithm)
  const maxLen = Math.max(lines1.length, lines2.length);

  for (let i = 0; i < maxLen; i++) {
    const line1 = lines1[i];
    const line2 = lines2[i];

    if (line1 === undefined) {
      // Line added in version 2
      diffs.push({
        type: "added",
        content: line2,
        lineNumber2: i + 1,
      });
    } else if (line2 === undefined) {
      // Line removed in version 2
      diffs.push({
        type: "removed",
        content: line1,
        lineNumber1: i + 1,
      });
    } else if (line1 !== line2) {
      // Line changed - show both versions
      diffs.push({
        type: "removed",
        content: line1,
        lineNumber1: i + 1,
      });
      diffs.push({
        type: "added",
        content: line2,
        lineNumber2: i + 1,
      });
    } else {
      // Lines are the same
      diffs.push({
        type: "context",
        content: line1,
        lineNumber1: i + 1,
        lineNumber2: i + 1,
      });
    }
  }

  return diffs;
};

export const DocumentDiffViewer: React.FC<DiffViewerProps> = ({
  resourceId,
  versionId1,
  versionId2,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<DiffLine[]>([]);
  const [version1Info, setVersion1Info] = useState<VersionInfo | null>(null);
  const [version2Info, setVersion2Info] = useState<VersionInfo | null>(null);

  const loadAndCompareDocs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch version metadata
      const { data: versions, error: versionError } = await supabase
        .from("document_versions")
        .select("id, version_number, created_at, storage_path")
        .in("id", [versionId1, versionId2]) as {
          data: Array<{ id: string; version_number: number; created_at: string; storage_path: string }> | null;
          error: Error | null;
        };
      if (versionError) throw versionError;

      const v1 = versions?.find((v) => v.id === versionId1);
      const v2 = versions?.find((v) => v.id === versionId2);

      if (!v1 || !v2) {
        throw new Error("Version not found");
      }

      setVersion1Info(v1);
      setVersion2Info(v2);

      // Get the org/bucket ID from resources
      const { data: resource, error: resourceError } = await supabase
        .from("resources")
        .select("org_id")
        .eq("id", resourceId)
        .single();

      if (resourceError) throw resourceError;

      const bucketId = resource.org_id;

      // Download both files
      const { data: file1Data, error: file1Error } = await supabase.storage
        .from(bucketId)
        .download(v1.storage_path);

      if (file1Error) throw file1Error;

      const { data: file2Data, error: file2Error } = await supabase.storage
        .from(bucketId)
        .download(v2.storage_path);

      if (file2Error) throw file2Error;

      // Extract text from both documents
      const buffer1 = await file1Data.arrayBuffer();
      const buffer2 = await file2Data.arrayBuffer();

      const text1 = await extractText(buffer1, v1.storage_path);
      const text2 = await extractText(buffer2, v2.storage_path);

      // Compute diff
      const diffLines = computeDiff(text1, text2);
      setDiffs(diffLines);
    } catch (err: unknown) {
      console.error("Error loading diff:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load document comparison"
      );
    } finally {
      setIsLoading(false);
    }
  }, [resourceId, versionId1, versionId2]); // Dependencies for useCallback

  useEffect(() => {
    loadAndCompareDocs();
  }, [loadAndCompareDocs]); // Effect depends on the memoized function

  const addedCount = diffs.filter((d) => d.type === "added").length;
  const removedCount = diffs.filter((d) => d.type === "removed").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">
              Comparing v{version1Info?.version_number} → v
              {version2Info?.version_number}
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              {version1Info?.created_at
                ? new Date(version1Info.created_at).toLocaleDateString()
                : "N/A"}{" "}
              →{" "}
              {version2Info?.created_at
                ? new Date(version2Info.created_at).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-green-600 font-medium">+{addedCount}</span>
              <span className="text-gray-400 mx-2">|</span>
              <span className="text-red-600 font-medium">-{removedCount}</span>
            </div>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          ) : (
            <div className="font-mono text-sm">
              {diffs.map((diff, idx) => (
                <div
                  key={idx}
                  className={`py-1 px-4 ${
                    diff.type === "added"
                      ? "bg-green-50 text-green-900"
                      : diff.type === "removed"
                      ? "bg-red-50 text-red-900"
                      : "bg-white text-gray-700"
                  }`}
                >
                  <span className="inline-block w-12 text-gray-500">
                    {diff.type === "added" && "+"}
                    {diff.type === "removed" && "-"}
                  </span>
                  <span className="text-gray-500 inline-block w-12 text-right">
                    {diff.lineNumber1 || diff.lineNumber2}
                  </span>
                  <span className="ml-4 break-all">{diff.content}</span>
                </div>
              ))}
              {diffs.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No differences found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
