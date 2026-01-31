"use client";

import React, { useState, useCallback, useMemo } from "react";
import { ChevronRight, ChevronDown, Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import type {
    T12FinancialData,
    T12Category,
    T12FinancialTableProps,
} from "@/types/t12-financial";

/**
 * T12 Financial Table Component
 * Displays hierarchical financial data with editable cells
 */
export function T12FinancialTable({
    data,
    onChange,
    editable = false,
    className = "",
}: T12FinancialTableProps) {
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
        new Set()
    );
    const [editingCell, setEditingCell] = useState<{
        categoryId: string;
        month: string;
    } | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const [editingName, setEditingName] = useState<string | null>(null);
    const [editNameValue, setEditNameValue] = useState<string>("");
    const [confirmDeletionId, setConfirmDeletionId] = useState<string | null>(null);

    // Default mock data for visualization if no data provided
    const displayData = useMemo(() => {
        if (!data || Object.keys(data).length === 0) {
            return {
                title: "Income Statement - 12 Month (Demo Data)",
                periodRange: "Jan 2024 - Dec 2024",
                months: ["Jan-24", "Feb-24", "Mar-24", "Apr-24", "May-24", "Jun-24", "Jul-24", "Aug-24", "Sep-24", "Oct-24", "Nov-24", "Dec-24"],
                categories: [
                    {
                        id: "income",
                        name: "Income",
                        level: 0,
                        monthlyValues: { "Jan-24": 0, "Feb-24": 0, "Mar-24": 0, "Apr-24": 0, "May-24": 0, "Jun-24": 0, "Jul-24": 0, "Aug-24": 0, "Sep-24": 0, "Oct-24": 0, "Nov-24": 0, "Dec-24": 0 },
                        total: 0,
                        children: [
                            {
                                id: "gross-potential-rent",
                                name: "Gross Potential Rent",
                                level: 1,
                                isEditable: true,
                                monthlyValues: { "Jan-24": 45000, "Feb-24": 45500, "Mar-24": 46000, "Apr-24": 46000, "May-24": 47000, "Jun-24": 47500, "Jul-24": 48000, "Aug-24": 48500, "Sep-24": 49000, "Oct-24": 49500, "Nov-24": 50000, "Dec-24": 50500 },
                                total: 572500
                            },
                            {
                                id: "loss-to-lease",
                                name: "Loss to Lease",
                                level: 1,
                                isEditable: true,
                                monthlyValues: { "Jan-24": -1000, "Feb-24": -1200, "Mar-24": -1100, "Apr-24": -1000, "May-24": -900, "Jun-24": -800, "Jul-24": -700, "Aug-24": -600, "Sep-24": -500, "Oct-24": -400, "Nov-24": -300, "Dec-24": -200 },
                                total: -8700
                            }
                        ]
                    },
                    {
                        id: "total-income",
                        name: "Total Operating Income",
                        level: 0,
                        isTotal: true,
                        monthlyValues: { "Jan-24": 44000, "Feb-24": 44300, "Mar-24": 44900, "Apr-24": 45000, "May-24": 46100, "Jun-24": 46700, "Jul-24": 47300, "Aug-24": 47900, "Sep-24": 48500, "Oct-24": 49100, "Nov-24": 49700, "Dec-24": 50300 },
                        total: 563800
                    },
                    {
                        id: "expenses",
                        name: "Operating Expenses",
                        level: 0,
                        monthlyValues: { "Jan-24": 0, "Feb-24": 0, "Mar-24": 0, "Apr-24": 0, "May-24": 0, "Jun-24": 0, "Jul-24": 0, "Aug-24": 0, "Sep-24": 0, "Oct-24": 0, "Nov-24": 0, "Dec-24": 0 },
                        total: 0,
                        children: [
                            {
                                id: "taxes",
                                name: "Real Estate Taxes",
                                level: 1,
                                isEditable: true,
                                monthlyValues: { "Jan-24": 5000, "Feb-24": 5000, "Mar-24": 5000, "Apr-24": 5000, "May-24": 5000, "Jun-24": 5000, "Jul-24": 5000, "Aug-24": 5000, "Sep-24": 5000, "Oct-24": 5000, "Nov-24": 5000, "Dec-24": 5000 },
                                total: 60000
                            },
                            {
                                id: "insurance",
                                name: "Insurance",
                                level: 1,
                                isEditable: true,
                                monthlyValues: { "Jan-24": 2000, "Feb-24": 2000, "Mar-24": 2000, "Apr-24": 2000, "May-24": 2000, "Jun-24": 2000, "Jul-24": 2000, "Aug-24": 2000, "Sep-24": 2000, "Oct-24": 2000, "Nov-24": 2000, "Dec-24": 2000 },
                                total: 24000
                            }
                        ]
                    }
                ]
            };
        }
        return data;
    }, [data]);

    const toggleCollapse = useCallback((categoryId: string) => {
        setCollapsedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    }, []);

    const handleCellClick = useCallback(
        (category: T12Category, month: string) => {
            if (!editable || !category.isEditable) return;

            setEditingCell({ categoryId: category.id, month });
            setEditValue(
                category.monthlyValues[month]?.toString() || ""
            );
        },
        [editable]
    );

    const handleCellSave = useCallback(
        (category: T12Category, month: string) => {
            if (!onChange || !editingCell) return;

            const numValue = parseFloat(editValue.replace(/,/g, ""));
            if (isNaN(numValue)) {
                // Invalid input, cancel
                setEditingCell(null);
                setEditValue("");
                return;
            }

            // Update the category's monthly value
            const updatedData = updateCategoryValue(
                displayData,
                category.id,
                month,
                numValue
            );

            onChange(updatedData);
            setEditingCell(null);
            setEditValue("");
        },
        [displayData, editValue, editingCell, onChange]
    );

    const handleCellCancel = useCallback(() => {
        setEditingCell(null);
        setEditValue("");
    }, []);

    const handleNameClick = useCallback((category: T12Category) => {
        if (!editable || !category.isEditable) return;
        setEditingName(category.id);
        setEditNameValue(category.name);
    }, [editable]);

    const handleNameSave = useCallback((category: T12Category) => {
        if (!onChange || !editingName) return;

        const updatedData = updateCategoryProperty(
            displayData,
            category.id,
            "name",
            editNameValue
        );

        onChange(updatedData);
        setEditingName(null);
        setEditNameValue("");
    }, [displayData, editNameValue, editingName, onChange]);

    const handleAddRow = useCallback((parentId: string) => {
        if (!onChange) return;

        const newRowId = `new-row-${Date.now()}`;
        const updatedData = addChildToCategory(displayData, parentId, newRowId);

        onChange(updatedData);
        // Auto-expand the parent if it was collapsed
        setCollapsedCategories((prev) => {
            const next = new Set(prev);
            next.delete(parentId);
            return next;
        });
    }, [displayData, onChange]);

    const handleDeleteRow = useCallback((categoryId: string) => {
        if (!onChange) return;
        setConfirmDeletionId(categoryId);
    }, [onChange]);

    const confirmDeleteRow = useCallback((categoryId: string) => {
        if (!onChange) return;
        const updatedData = removeCategory(displayData, categoryId);
        onChange(updatedData);
        setConfirmDeletionId(null);
    }, [displayData, onChange]);

    const cancelDeleteRow = useCallback(() => {
        setConfirmDeletionId(null);
    }, []);

    const handleMoveRow = useCallback((categoryId: string, direction: "up" | "down") => {
        if (!onChange) return;
        const updatedData = moveCategory(displayData, categoryId, direction);
        onChange(updatedData);
    }, [displayData, onChange]);

    const handlePromoteRow = useCallback((categoryId: string) => {
        if (!onChange) return;
        const updatedData = promoteCategory(displayData, categoryId);
        onChange(updatedData);
    }, [displayData, onChange]);

    const handleDemoteRow = useCallback((categoryId: string) => {
        if (!onChange) return;
        const updatedData = demoteCategory(displayData, categoryId);
        onChange(updatedData);
    }, [displayData, onChange]);

    const handleAddRootRow = useCallback(() => {
        if (!onChange) return;
        const newRowId = `row-${Date.now()}`;
        const emptyValues: { [key: string]: number } = {};
        displayData.months.forEach(m => emptyValues[m] = 0);

        const newRow: T12Category = {
            id: newRowId,
            name: "New Category",
            level: 0,
            isEditable: true,
            monthlyValues: emptyValues,
            total: 0
        };

        const updatedData = {
            ...displayData,
            categories: [...displayData.categories, newRow]
        };
        onChange(updatedData);
    }, [displayData, onChange]);

    const handleAddSibling = useCallback((categoryId: string) => {
        if (!onChange) return;
        const newRowId = `row-${Date.now()}`;
        const updatedData = addSiblingToCategory(displayData, categoryId, newRowId);
        onChange(updatedData);
    }, [displayData, onChange]);

    const formatCurrency = (value: number | null): string => {
        if (value === null || value === undefined) return "-";
        const absValue = Math.abs(value);
        const formatted = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(absValue);

        return value < 0 ? `(${formatted})` : formatted;
    };

    const renderCategory = (
        category: T12Category,
        depth: number = 0
    ): React.ReactNode => {
        const isCollapsed = collapsedCategories.has(category.id);
        const hasChildren = category.children && category.children.length > 0;
        const indentPx = depth * 24;

        return (
            <React.Fragment key={category.id}>
                <tr
                    className={`
            border-b border-gray-100
            ${category.isTotal ? "font-bold bg-gray-50" : ""}
            ${depth === 0 ? "bg-gray-100" : ""}
          `}
                >
                    {/* Account Name Column (Sticky) */}
                    <td
                        className="px-3 py-2 sticky left-0 bg-white z-10 whitespace-nowrap"
                        style={{ paddingLeft: `${indentPx + 12}px` }}
                        colSpan={hasChildren ? displayData.months.length + 2 : 1}
                    >
                        <div className="flex items-center gap-2 group">
                            {hasChildren ? (
                                <button
                                    type="button"
                                    onClick={() => toggleCollapse(category.id)}
                                    className="hover:bg-gray-200 rounded p-0.5"
                                    aria-label={
                                        isCollapsed ? "Expand" : "Collapse"
                                    }
                                >
                                    {isCollapsed ? (
                                        <ChevronRight className="h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                </button>
                            ) : (
                                <div className="w-5" />
                            )}

                            {editingName === category.id ? (
                                <input
                                    type="text"
                                    value={editNameValue}
                                    onChange={(e) => setEditNameValue(e.target.value)}
                                    onBlur={() => handleNameSave(category)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleNameSave(category);
                                        if (e.key === "Escape") setEditingName(null);
                                    }}
                                    className="border border-blue-500 rounded px-1 outline-none text-sm font-medium"
                                    autoFocus
                                />
                            ) : (
                                <span
                                    className={`
                                        ${category.isTotal ? "font-semibold" : ""} 
                                        ${editable && category.isEditable ? "cursor-text hover:text-blue-600 border-b border-transparent hover:border-blue-200" : ""}
                                    `}
                                    onClick={() => handleNameClick(category)}
                                >
                                    {category.name}
                                </span>
                            )}

                            {/* Row Management buttons (visible on hover) */}
                            {editable && (
                                <div className={`flex items-center gap-1 transition-opacity ml-auto ${confirmDeletionId === category.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                    }`}>
                                    {confirmDeletionId === category.id ? (
                                        <div className="flex items-center gap-1 bg-red-50 p-1 rounded border border-red-200 animate-in fade-in zoom-in duration-200">
                                            <span className="text-[10px] font-bold text-red-600 mr-1">Delete?</span>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); confirmDeleteRow(category.id); }}
                                                className="p-1 hover:bg-red-200 text-red-600 rounded bg-white shadow-sm"
                                                title="Confirm Delete"
                                            >
                                                <Check className="h-3 w-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); cancelDeleteRow(); }}
                                                className="p-1 hover:bg-gray-200 text-gray-600 rounded bg-white shadow-sm"
                                                title="Cancel Delete"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddRow(category.id); }}
                                                className="p-1 hover:bg-blue-100 text-blue-600 rounded"
                                                title="Add sub-item"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddSibling(category.id); }}
                                                className="p-1 hover:bg-gray-100 text-gray-600 rounded"
                                                title="Add sibling"
                                            >
                                                <Plus className="h-3 w-3 border border-gray-400 rounded-sm" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMoveRow(category.id, "up"); }}
                                                className="p-1 hover:bg-gray-100 text-gray-500 rounded"
                                                title="Move up"
                                            >
                                                <ArrowUp className="h-3 w-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMoveRow(category.id, "down"); }}
                                                className="p-1 hover:bg-gray-100 text-gray-500 rounded"
                                                title="Move down"
                                            >
                                                <ArrowDown className="h-3 w-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePromoteRow(category.id); }}
                                                className="p-1 hover:bg-gray-100 text-gray-500 rounded"
                                                title="Move up a level (Promote)"
                                            >
                                                <ArrowLeft className="h-3 w-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDemoteRow(category.id); }}
                                                className="p-1 hover:bg-gray-100 text-gray-500 rounded"
                                                title="Move down a level (Demote)"
                                            >
                                                <ArrowRight className="h-3 w-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteRow(category.id); }}
                                                className="p-1 hover:bg-red-100 text-red-600 rounded"
                                                title="Delete row"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </td>

                    {/* Monthly Value Columns */}
                    {!hasChildren && displayData.months.map((month) => {
                        const value = category.monthlyValues[month];
                        const isEditing =
                            editingCell?.categoryId === category.id &&
                            editingCell?.month === month;
                        const isEditable = editable && category.isEditable;

                        return (
                            <td
                                key={month}
                                className={`
                  px-3 py-2 text-right whitespace-nowrap
                  ${value !== null && value < 0 ? "text-red-600" : ""}
                  ${isEditable ? "cursor-pointer hover:bg-blue-50" : ""}
                `}
                                onClick={() =>
                                    !isEditing && handleCellClick(category, month)
                                }
                            >
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={() => handleCellSave(category, month)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                handleCellSave(category, month);
                                            } else if (e.key === "Escape") {
                                                handleCellCancel();
                                            }
                                        }}
                                        className="w-full px-2 py-1 border border-blue-500 rounded text-right"
                                        autoFocus
                                    />
                                ) : (
                                    formatCurrency(value)
                                )}
                            </td>
                        );
                    })}

                    {/* Total Column */}
                    {!hasChildren && (
                        <td
                            className={`
                  px-3 py-2 text-right whitespace-nowrap font-semibold
                  ${category.total < 0 ? "text-red-600" : ""}
                `}
                        >
                            {formatCurrency(category.total)}
                        </td>
                    )}
                </tr>

                {/* Render children if not collapsed */}
                {!isCollapsed &&
                    hasChildren &&
                    category.children!.map((child) =>
                        renderCategory(child, depth + 1)
                    )}
            </React.Fragment>
        );
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Header */}
            <div className="space-y-1">
                <h3 className="text-lg font-semibold text-gray-800">
                    {displayData.title}
                </h3>
                {displayData.subtitle && (
                    <p className="text-sm text-gray-600">{displayData.subtitle}</p>
                )}
                <div className="flex gap-4 text-xs text-gray-500">
                    {displayData.fundType && <span>Fund Type: {displayData.fundType}</span>}
                    <span>Period: {displayData.periodRange}</span>
                    {displayData.accountingBasis && (
                        <span>Basis: {displayData.accountingBasis}</span>
                    )}
                    {displayData.levelOfDetail && (
                        <span>Detail: {displayData.levelOfDetail}</span>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-20">
                        <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-30">
                                Account Name
                            </th>
                            {displayData.months.map((month) => (
                                <th
                                    key={month}
                                    className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                    {month}
                                </th>
                            ))}
                            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {displayData.categories.map((category) => renderCategory(category))}
                        {editable && (
                            <tr>
                                <td colSpan={displayData.months.length + 2} className="px-3 py-2">
                                    <button
                                        type="button"
                                        onClick={handleAddRootRow}
                                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span>Add New Section</span>
                                    </button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editable && (
                <p className="text-xs text-gray-500 italic">
                    Click on any editable cell to modify values. Press Enter to save
                    or Escape to cancel.
                </p>
            )}
        </div>
    );
}

/**
 * Helper function to update a category's monthly value.
 * Only recalculates that specific row's total.
 */
function updateCategoryValue(
    data: T12FinancialData,
    categoryId: string,
    month: string,
    newValue: number
): T12FinancialData {
    const updateCategory = (category: T12Category): T12Category => {
        if (category.id === categoryId) {
            const updatedMonthlyValues = {
                ...category.monthlyValues,
                [month]: newValue,
            };
            // Recalculate row total only
            const total = Object.values(updatedMonthlyValues).reduce(
                (sum: number, val: number | null) => sum + (val || 0),
                0
            );
            return {
                ...category,
                monthlyValues: updatedMonthlyValues,
                total,
            };
        }
        if (category.children) {
            return {
                ...category,
                children: category.children.map(updateCategory)
            };
        }
        return category;
    };

    return {
        ...data,
        categories: data.categories.map(updateCategory),
    };
}

/**
 * Helper to update any property of a category (e.g., name)
 */
function updateCategoryProperty(
    data: T12FinancialData,
    categoryId: string,
    property: keyof T12Category,
    value: any
): T12FinancialData {
    const updateCategory = (category: T12Category): T12Category => {
        if (category.id === categoryId) {
            return { ...category, [property]: value };
        }
        if (category.children) {
            return { ...category, children: category.children.map(updateCategory) };
        }
        return category;
    };
    return {
        ...data,
        categories: data.categories.map(updateCategory),
    };
}

/**
 * Helper to add a new child to a category
 */
function addChildToCategory(
    data: T12FinancialData,
    parentId: string,
    newId: string
): T12FinancialData {
    const updateCategory = (category: T12Category): T12Category => {
        if (category.id === parentId) {
            const emptyValues: { [key: string]: number } = {};
            data.months.forEach(m => emptyValues[m] = 0);

            const newChild: T12Category = {
                id: newId,
                name: "New Sub-item",
                level: category.level + 1,
                isEditable: true,
                monthlyValues: emptyValues,
                total: 0
            };

            return {
                ...category,
                children: [...(category.children || []), newChild]
            };
        }
        if (category.children) {
            return { ...category, children: category.children.map(updateCategory) };
        }
        return category;
    };
    return {
        ...data,
        categories: data.categories.map(updateCategory),
    };
}

/**
 * Helper to add a sibling after a category
 */
function addSiblingToCategory(
    data: T12FinancialData,
    categoryId: string,
    newId: string
): T12FinancialData {
    const emptyValues: { [key: string]: number } = {};
    data.months.forEach(m => emptyValues[m] = 0);

    const transform = (categories: T12Category[]): T12Category[] => {
        const result: T12Category[] = [];
        for (const cat of categories) {
            result.push(cat);
            if (cat.id === categoryId) {
                result.push({
                    id: newId,
                    name: "New Sibling",
                    level: cat.level,
                    isEditable: true,
                    monthlyValues: emptyValues,
                    total: 0
                });
            }
            if (cat.children) {
                cat.children = transform(cat.children);
            }
        }
        return result;
    };

    return {
        ...data,
        categories: transform(data.categories)
    };
}

/**
 * Helper to move a category up or down
 */
function moveCategory(
    data: T12FinancialData,
    categoryId: string,
    direction: "up" | "down"
): T12FinancialData {
    const moveInList = (list: T12Category[]): T12Category[] => {
        const idx = list.findIndex(c => c.id === categoryId);
        if (idx !== -1) {
            const newList = [...list];
            if (direction === "up" && idx > 0) {
                [newList[idx], newList[idx - 1]] = [newList[idx - 1], newList[idx]];
            } else if (direction === "down" && idx < newList.length - 1) {
                [newList[idx], newList[idx + 1]] = [newList[idx + 1], newList[idx]];
            }
            return newList;
        }
        return list.map(c => ({
            ...c,
            children: c.children ? moveInList(c.children) : undefined
        }));
    };

    return {
        ...data,
        categories: moveInList(data.categories)
    };
}

/**
 * Helper to promote a category (move out of parent)
 */
function promoteCategory(data: T12FinancialData, categoryId: string): T12FinancialData {
    let categoryToMove: T12Category | null = null;
    let parentId: string | null = null;

    // 1. Find and Remove
    const findAndRemove = (list: T12Category[], pId: string | null = null): T12Category[] => {
        const idx = list.findIndex(c => c.id === categoryId);
        if (idx !== -1) {
            categoryToMove = list[idx];
            parentId = pId;
            return [...list.slice(0, idx), ...list.slice(idx + 1)];
        }
        return list.map(c => ({
            ...c,
            children: c.children ? findAndRemove(c.children, c.id) : undefined
        }));
    };

    const newCategories = findAndRemove(data.categories);
    if (!categoryToMove || !parentId) return data; // Can't promote root items

    // 2. Insert after parent
    const insertAfterParent = (list: T12Category[]): T12Category[] => {
        const idx = list.findIndex(c => c.id === parentId);
        if (idx !== -1 && categoryToMove) {
            const promoted = updateCategoryLevels(categoryToMove, list[idx].level);
            return [...list.slice(0, idx + 1), promoted, ...list.slice(idx + 1)];
        }
        return list.map(c => ({
            ...c,
            children: c.children ? insertAfterParent(c.children) : undefined
        }));
    };

    return {
        ...data,
        categories: insertAfterParent(newCategories)
    };
}

/**
 * Helper to demote a category (make it child of sibling above)
 */
function demoteCategory(data: T12FinancialData, categoryId: string): T12FinancialData {
    let categoryToMove: T12Category | null = null;
    let siblingAboveId: string | null = null;

    // 1. Find and Remove
    const findAndRemove = (list: T12Category[]): T12Category[] => {
        const idx = list.findIndex(c => c.id === categoryId);
        if (idx !== -1) {
            categoryToMove = list[idx];
            if (idx > 0) siblingAboveId = list[idx - 1].id;
            return [...list.slice(0, idx), ...list.slice(idx + 1)];
        }
        return list.map(c => ({
            ...c,
            children: c.children ? findAndRemove(c.children) : undefined
        }));
    };

    const newCategories = findAndRemove(data.categories);
    if (!categoryToMove || !siblingAboveId) return data; // No sibling above to become child of

    // 2. Insert into sibling's children
    const insertIntoSibling = (list: T12Category[]): T12Category[] => {
        return list.map(c => {
            if (c.id === siblingAboveId && categoryToMove) {
                const demoted = updateCategoryLevels(categoryToMove, c.level + 1);
                return {
                    ...c,
                    children: [...(c.children || []), demoted]
                };
            }
            return {
                ...c,
                children: c.children ? insertIntoSibling(c.children) : undefined
            };
        });
    };

    return {
        ...data,
        categories: insertIntoSibling(newCategories)
    };
}

/**
 * Helper to update levels recursively
 */
function updateCategoryLevels(category: T12Category, newLevel: number): T12Category {
    const updated: T12Category = { ...category, level: newLevel };
    if (updated.children) {
        updated.children = updated.children.map(child => updateCategoryLevels(child, newLevel + 1));
    }
    return updated;
}

/**
 * Helper to remove a category
 */
function removeCategory(
    data: T12FinancialData,
    categoryId: string
): T12FinancialData {
    const filterCategory = (categories: T12Category[]): T12Category[] => {
        return categories
            .filter(c => c.id !== categoryId)
            .map(c => ({
                ...c,
                children: c.children ? filterCategory(c.children) : undefined
            }));
    };

    return {
        ...data,
        categories: filterCategory(data.categories)
    };
}
