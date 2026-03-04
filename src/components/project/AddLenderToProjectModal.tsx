"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, Building2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AddLenderToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  existingLenderOrgIds: string[];
  onSuccess: () => void;
}

interface LenderOrg {
  id: string;
  name: string;
}

export const AddLenderToProjectModal: React.FC<AddLenderToProjectModalProps> = ({
  isOpen,
  onClose,
  projectId,
  existingLenderOrgIds,
  onSuccess,
}) => {
  const [lenderOrgs, setLenderOrgs] = useState<LenderOrg[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSelectedOrgId(null);
    const fetchLenderOrgs = async () => {
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from("orgs")
          .select("id, name")
          .eq("entity_type", "lender")
          .order("name");
        if (fetchError) throw fetchError;
        setLenderOrgs(data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load lenders");
      } finally {
        setLoading(false);
      }
    };
    fetchLenderOrgs();
  }, [isOpen]);

  const availableOrgs = lenderOrgs.filter(
    (org) => !existingLenderOrgIds.includes(org.id)
  );

  const handleAdd = async () => {
    if (!selectedOrgId) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc(
        "grant_lender_project_access_by_advisor",
        {
          p_project_id: projectId,
          p_lender_org_id: selectedOrgId,
        }
      );
      if (rpcError) throw rpcError;
      onSuccess();
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to add lender to project"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Send package to lender
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-auto">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : availableOrgs.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">
              {existingLenderOrgIds.length > 0
                ? "All lender organizations have already been added to this project."
                : "No lender organizations found. Lenders must sign up and have an org with entity_type 'lender'."}
            </p>
          ) : (
            <ul className="space-y-2">
              {availableOrgs.map((org) => (
                <li key={org.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedOrgId(selectedOrgId === org.id ? null : org.id)
                    }
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      selectedOrgId === org.id
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <Building2 className="h-5 w-5 text-gray-400 shrink-0" />
                    <span className="font-medium text-gray-900">{org.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedOrgId || submitting}
            leftIcon={
              submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : undefined
            }
          >
            {submitting ? "Sending…" : "Send package"}
          </Button>
        </div>
      </div>
    </div>
  );
};
