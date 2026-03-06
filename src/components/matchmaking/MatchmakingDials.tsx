"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";

/**
 * Fields that drive matchmaking (from backend DEAL_FIELD_MAP).
 * Keys match resume camelCase so backend can read from resume later.
 */
export interface MatchmakingDialsValues {
  loanAmountRequested?: number | string;
  stabilizedValue?: number | string;
  purchasePrice?: number | string;
  targetLtvPercent?: number | string;
  dscr?: number | string;
  propertyNoiT12?: number | string;
  noiYear1?: number | string;
  interestRate?: number | string;
  originationFee?: number | string;
  loanFees?: number | string;
  totalResidentialUnits?: number | string;
  affordableHousing?: string;
  affordableUnitsNumber?: number | string;
  projectPhase?: string;
  useOfProceeds?: string;
  baseConstruction?: string;
  requestedTerm?: string;
  interestOnlyPeriodMonths?: number | string;
  propertyAddressState?: string;
  propertyAddressCounty?: string;
  propertyAddressCity?: string;
  propertyAddressZip?: string;
  msaName?: string;
}

const DIAL_FIELDS: { key: keyof MatchmakingDialsValues; label: string; type: "number" | "text" }[] = [
  { key: "loanAmountRequested", label: "Loan amount requested ($)", type: "number" },
  { key: "stabilizedValue", label: "Stabilized value ($)", type: "number" },
  { key: "purchasePrice", label: "Purchase price ($)", type: "number" },
  { key: "targetLtvPercent", label: "Target LTV (%)", type: "number" },
  { key: "dscr", label: "DSCR", type: "number" },
  { key: "propertyNoiT12", label: "Property NOI T12 ($)", type: "number" },
  { key: "interestRate", label: "Interest rate (%)", type: "number" },
  { key: "totalResidentialUnits", label: "Total residential units", type: "number" },
  { key: "requestedTerm", label: "Requested term", type: "text" },
  { key: "interestOnlyPeriodMonths", label: "Interest-only period (months)", type: "number" },
  { key: "projectPhase", label: "Project phase", type: "text" },
  { key: "propertyAddressState", label: "State", type: "text" },
  { key: "propertyAddressCounty", label: "County", type: "text" },
  { key: "msaName", label: "MSA name", type: "text" },
];

interface MatchmakingDialsProps {
  initialValues?: Partial<MatchmakingDialsValues>;
  onApply?: (values: Partial<MatchmakingDialsValues>) => void;
  onRunMatchmaking?: () => void;
  disabled?: boolean;
  isAdvisorView?: boolean;
}

export const MatchmakingDials: React.FC<MatchmakingDialsProps> = ({
  initialValues,
  onApply,
  onRunMatchmaking,
  disabled,
  isAdvisorView,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [values, setValues] = useState<Partial<MatchmakingDialsValues>>(initialValues ?? {});

  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setValues(initialValues);
    }
  }, [initialValues]);

  const handleChange = (key: keyof MatchmakingDialsValues, value: string | number) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyAndRun = () => {
    onApply?.(values);
    onRunMatchmaking?.();
  };

  if (!isAdvisorView) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/80 overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-100 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <SlidersHorizontal className="h-4 w-4 text-gray-600" />
          Tune for matchmaking
        </span>
        <span className="text-gray-500">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200 bg-white">
          <p className="text-xs text-gray-500 mb-3">
            Adjust these deal parameters to see how they affect lender match scores. Changes here
            can be saved as a new resume version and run in a new matchmaking iteration.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DIAL_FIELDS.map(({ key, label, type }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">{label}</label>
                {type === "number" ? (
                  <input
                    type="number"
                    value={values[key] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      handleChange(key, v === "" ? "" : Number(v));
                    }}
                    disabled={disabled}
                    className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white disabled:opacity-50"
                  />
                ) : (
                  <input
                    type="text"
                    value={String(values[key] ?? "")}
                    onChange={(e) => handleChange(key, e.target.value)}
                    disabled={disabled}
                    className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white disabled:opacity-50"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={handleApplyAndRun}
              disabled={disabled}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Apply & run matchmaking
            </button>
            {onApply && (
              <button
                type="button"
                onClick={() => onApply(values)}
                disabled={disabled}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Apply only
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
