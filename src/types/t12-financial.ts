export interface T12Category {
    id: string;
    name: string;
    level: number; // 0 = top level, 1 = subcategory, 2 = sub-subcategory, etc.
    isTotal?: boolean; // True for summary rows like "Total Operating Income"
    isEditable?: boolean; // False for calculated totals, true for data entry rows
    monthlyValues: {
        [month: string]: number | null;
    };
    total: number;
    children?: T12Category[];
    collapsed?: boolean; // UI state for collapsible sections
}

export interface T12FinancialData {
    title: string; // e.g., "Income Statement - 12 Month"
    subtitle?: string; // e.g., "[Borrower Corporation]"
    periodRange: string; // e.g., "Nov 2024 to Oct 2025 (Trailing 12 Months)"
    accountingBasis?: string; // e.g., "Actual"
    levelOfDetail?: string; // e.g., "Detail View"
    fundType?: string; // e.g., "All"
    months: string[]; // ["Nov-24", "Dec-24", ..., "Oct-25"]
    categories: T12Category[];
}

export interface T12FinancialTableProps {
    data: T12FinancialData | null;
    onChange?: (data: T12FinancialData) => void;
    editable?: boolean;
    className?: string; // For additional styling
}
