import { T12FinancialData, T12Category } from "@/types/t12-financial";

/**
 * Transforms flat Excel data with indentation levels into a hierarchical T12 structure.
 */
export function mapExcelToT12(
    data: any[][],
    indentationLevels: number[],
    options: {
        hasHeaderRow?: boolean;
        monthNames?: string[];
    } = {}
): T12FinancialData {
    const { hasHeaderRow = false, monthNames = [] } = options;

    // 1. Process months/headers
    let finalMonths = monthNames;
    let dataStartIndex = 0;

    if (hasHeaderRow && data.length > 0) {
        const headerRow = data[0];
        // Assume first column is name, subsequent are months
        if (finalMonths.length === 0) {
            finalMonths = headerRow.slice(1, 13).map(m => String(m || ""));
        }
        dataStartIndex = 1;
    }

    // Default months if still missing
    if (finalMonths.length === 0) {
        finalMonths = ["Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6", "Month 7", "Month 8", "Month 9", "Month 10", "Month 11", "Month 12"];
    }

    // 2. Map indentation levels to normalized levels (0, 1, 2...)
    const uniqueIndents = Array.from(new Set(indentationLevels)).filter(i => i !== undefined).sort((a, b) => a - b);
    const indentMap = new Map();
    uniqueIndents.forEach((val, idx) => indentMap.set(val, idx));

    // 3. Build hierarchy
    const categories: T12Category[] = [];
    const stack: { category: T12Category; level: number }[] = [];

    for (let i = dataStartIndex; i < data.length; i++) {
        const row = data[i];
        const rawIndent = indentationLevels[i];
        const name = String(row[0] || "Unnamed Row");

        // Skip empty rows
        if (!name.trim() && row.slice(1).every(v => v === null || v === undefined || v === "")) continue;

        const level = indentMap.get(rawIndent) || 0;

        // Extract values
        const monthlyValues: { [month: string]: number | null } = {};
        let rowTotal = 0;

        finalMonths.forEach((month, colIdx) => {
            const val = row[colIdx + 1];
            const numVal = (val === null || val === undefined || val === "") ? null : Number(val);
            monthlyValues[month] = numVal;
            if (numVal !== null) rowTotal += numVal;
        });

        const category: T12Category = {
            id: `row-${i}-${Date.now()}`,
            name,
            level,
            monthlyValues,
            total: rowTotal,
            isEditable: true,
            children: []
        };

        // Find parent in stack
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
            stack.pop();
        }

        if (stack.length === 0) {
            categories.push(category);
        } else {
            const parent = stack[stack.length - 1].category;
            if (!parent.children) parent.children = [];
            parent.children.push(category);
        }

        stack.push({ category, level });
    }

    return {
        title: "Extracted Financial Statement",
        periodRange: `${finalMonths[0]} to ${finalMonths[finalMonths.length - 1]}`,
        months: finalMonths,
        categories
    };
}
