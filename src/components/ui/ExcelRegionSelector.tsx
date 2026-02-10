"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { ChevronRight, ChevronDown } from "lucide-react";

interface ExcelRegionSelectorProps {
    file: File | ArrayBuffer;
    onSelectionChange?: (selection: ExcelSelection | null) => void;
}

export interface ExcelSelection {
    sheetName: string;
    rangeA1: string; // e.g. "A1:C10"
    range: XLSX.Range;
}

export function ExcelRegionSelector({
    file,
    onSelectionChange,
}: ExcelRegionSelectorProps) {
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [currentSheetName, setCurrentSheetName] = useState<string>("");
    const [sheetData, setSheetData] = useState<any[][]>([]);
    const [selectionStart, setSelectionStart] = useState<{ r: number; c: number } | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<{ r: number; c: number } | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const mousePos = useRef({ x: 0, y: 0 });

    // Auto-scroll logic
    useEffect(() => {
        if (!isSelecting) return;

        const autoScroll = () => {
            if (!containerRef.current) return;
            const container = containerRef.current;
            const rect = container.getBoundingClientRect();

            const scrollThreshold = 40; // distance from edge in px
            const scrollSpeed = 15; // max scroll amount per frame

            let dx = 0;
            let dy = 0;

            // Handle vertical scroll
            if (mousePos.current.y < rect.top + scrollThreshold) {
                // Near top
                dy = -Math.max(5, scrollSpeed * (1 - (mousePos.current.y - rect.top) / scrollThreshold));
            } else if (mousePos.current.y > rect.bottom - scrollThreshold) {
                // Near bottom
                dy = Math.max(5, scrollSpeed * (1 - (rect.bottom - mousePos.current.y) / scrollThreshold));
            }

            // Handle horizontal scroll
            if (mousePos.current.x < rect.left + scrollThreshold) {
                // Near left
                dx = -Math.max(5, scrollSpeed * (1 - (mousePos.current.x - rect.left) / scrollThreshold));
            } else if (mousePos.current.x > rect.right - scrollThreshold) {
                // Near right
                dx = Math.max(5, scrollSpeed * (1 - (rect.right - mousePos.current.x) / scrollThreshold));
            }

            if (dx !== 0 || dy !== 0) {
                container.scrollBy(dx, dy);
            }
        };

        const interval = setInterval(autoScroll, 16); // ~60fps

        const handleMouseMove = (e: MouseEvent) => {
            mousePos.current = { x: e.clientX, y: e.clientY };

            // If mouse is outside but we're selecting, we might want to update selectionEnd
            // by projectively finding the nearest cell, but for now simple auto-scroll
            // is usually enough to reveal hidden cells.
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => {
            clearInterval(interval);
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, [isSelecting]);

    // Load workbook
    useEffect(() => {
        const loadWorkbook = async () => {
            try {
                let data: any;
                if (file instanceof File) {
                    data = await file.arrayBuffer();
                } else {
                    data = file;
                }

                const wb = XLSX.read(data, { type: "array" });
                setWorkbook(wb);

                if (wb.SheetNames.length > 0) {
                    setCurrentSheetName(wb.SheetNames[0]);
                }
            } catch (error) {
                console.error("Error reading Excel file:", error);
            }
        };

        loadWorkbook();
    }, [file]);

    // Load sheet data when sheet changes
    useEffect(() => {
        if (!workbook || !currentSheetName) return;

        const worksheet = workbook.Sheets[currentSheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        setSheetData(data);

        // Reset selection when sheet changes
        setSelectionStart(null);
        setSelectionEnd(null);
    }, [workbook, currentSheetName]);

    const handleCellMouseDown = (r: number, c: number) => {
        setSelectionStart({ r, c });
        setSelectionEnd({ r, c });
        setIsSelecting(true);
    };

    const handleCellMouseEnter = (r: number, c: number) => {
        if (isSelecting) {
            setSelectionEnd({ r, c });
        }
    };

    const handleMouseUp = () => {
        setIsSelecting(false);
    };

    // Calculate current selection range
    const currentSelection = useMemo(() => {
        if (!selectionStart || !selectionEnd) return null;

        const s: XLSX.Range = {
            s: {
                r: Math.min(selectionStart.r, selectionEnd.r),
                c: Math.min(selectionStart.c, selectionEnd.c),
            },
            e: {
                r: Math.max(selectionStart.r, selectionEnd.r),
                c: Math.max(selectionStart.c, selectionEnd.c),
            },
        };

        const rangeA1 = XLSX.utils.encode_range(s);

        return {
            sheetName: currentSheetName,
            rangeA1,
            range: s,
        };
    }, [selectionStart, selectionEnd, currentSheetName]);

    // Notify parent of selection change
    useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange(currentSelection);
        }
    }, [currentSelection, onSelectionChange]);

    const isCellSelected = (r: number, c: number) => {
        if (!currentSelection) return false;
        const { s, e } = currentSelection.range;
        return r >= s.r && r <= e.r && c >= s.c && c <= e.c;
    };

    if (!workbook) {
        return (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-gray-500">Loading Excel data...</div>
            </div>
        );
    }

    // Get max columns to normalize row lengths
    const maxCols = Math.max(...sheetData.map(row => row.length), 0);
    const colLabels = Array.from({ length: maxCols }, (_, i) => XLSX.utils.encode_col(i));

    return (
        <div className="flex flex-col h-full overflow-hidden select-none" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            {/* Sheet Tabs */}
            <div className="flex border-b border-gray-200 overflow-x-auto bg-gray-50">
                {workbook.SheetNames.map((name) => (
                    <button
                        key={name}
                        onClick={() => setCurrentSheetName(name)}
                        className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${currentSheetName === name
                            ? "border-blue-500 text-blue-600 bg-white"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            }`}
                    >
                        {name}
                    </button>
                ))}
            </div>

            {/* Selection info */}
            <div className="p-2 bg-blue-50 text-blue-800 text-xs font-mono border-b border-blue-100 flex justify-between items-center">
                <span>
                    {currentSelection
                        ? `Selected Range: ${currentSelection.sheetName}!${currentSelection.rangeA1}`
                        : "Click and drag to select a region"}
                </span>
                {currentSelection && (
                    <span className="text-blue-600">
                        {currentSelection.range.e.r - currentSelection.range.s.r + 1} rows x {currentSelection.range.e.c - currentSelection.range.s.c + 1} cols
                    </span>
                )}
            </div>

            {/* Table Area */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto bg-white border border-gray-200"
            >
                <table className="border-collapse text-xs">
                    <thead>
                        <tr>
                            <th className="sticky top-0 left-0 z-30 bg-gray-100 border border-gray-300 w-10 min-w-[2.5rem] h-8"></th>
                            {colLabels.map((label, i) => (
                                <th
                                    key={i}
                                    className="sticky top-0 z-20 bg-gray-100 border border-gray-300 px-2 h-8 min-w-[80px] font-medium text-gray-600"
                                >
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sheetData.map((row, r) => (
                            <tr key={r}>
                                <th className="sticky left-0 z-10 bg-gray-100 border border-gray-300 font-medium text-gray-600 w-10 min-w-[2.5rem] text-center">
                                    {r + 1}
                                </th>
                                {Array.from({ length: maxCols }).map((_, c) => {
                                    const value = row[c];
                                    const isSelected = isCellSelected(r, c);

                                    return (
                                        <td
                                            key={c}
                                            onMouseDown={() => handleCellMouseDown(r, c)}
                                            onMouseEnter={() => handleCellMouseEnter(r, c)}
                                            className={`border border-gray-200 px-2 py-1 min-w-[80px] max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap transition-colors ${isSelected
                                                ? "bg-blue-100 ring-1 ring-blue-400 z-10"
                                                : "hover:bg-gray-50"
                                                }`}
                                        >
                                            {value !== undefined ? String(value) : ""}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
