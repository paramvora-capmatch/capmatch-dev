// src/components/documents/ShareModal.tsx
import React, { useState, useEffect } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Loader2, User, Crown } from "lucide-react";
import { useOrgStore } from "@/stores/useOrgStore";
import { supabase } from "../../../lib/supabaseClient";
import { DocumentFile, DocumentFolder } from "@/hooks/useDocumentManagement";
import { Permission } from "@/types/enhanced-types";
import { cn } from "@/utils/cn";

interface ShareModalProps {
  resource: DocumentFile | DocumentFolder;
  isOpen: boolean;
  onClose: () => void;
}

interface MemberPermission {
  user_id: string;
  full_name: string;
  permission: Permission | "none";
  hasExplicitOverride: boolean;
  effectivePermission: Permission | "none" | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  resource,
  isOpen,
  onClose,
}) => {
  const { members } = useOrgStore();
  const [permissions, setPermissions] = useState<MemberPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && resource) {
      const fetchPermissions = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const { data, error: rpcError } = await supabase.rpc(
            "get_permissions_for_resource",
            {
              p_resource_id: resource.id,
            }
          );

          if (rpcError) throw rpcError;

          const currentPermissions = new Map(
            (data || []).map((p: any) => [p.user_id, p.permission])
          );
          // Fetch effective/blanket permissions for all org members so we can
          // show the true current access level even when there is no override.
          const memberIds = members.map((m) => m.user_id);
          const {
            data: effectiveData,
            error: effectiveError,
          } = await supabase.rpc(
            "get_effective_permissions_for_resource",
            {
              p_resource_id: resource.id,
              p_user_ids: memberIds,
            }
          );

          if (effectiveError) throw effectiveError;

          const effectiveById = new Map<
            string,
            Permission | "none" | null
          >(
            (effectiveData || []).map((row: any) => [
              row.user_id,
              (row.effective_permission as Permission | "none" | null) ??
                null,
            ])
          );

          const allMembersWithPerms: MemberPermission[] = members.map(
            (member) => {
              const rawPerm = currentPermissions.get(
                member.user_id
              ) as Permission | "none" | undefined;
              const effective =
                (effectiveById.get(
                  member.user_id
                ) as Permission | "none" | null) ?? null;
              return {
                user_id: member.user_id,
                full_name:
                  member.userName || member.userEmail || "Unknown",
                // Underlying explicit override value (or "none" if no row)
                permission: rawPerm ?? "none",
                hasExplicitOverride: rawPerm !== undefined,
                effectivePermission: effective,
              };
            }
          );

          setPermissions(allMembersWithPerms);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchPermissions();
    }
  }, [isOpen, resource, members]);

  const handlePermissionChange = async (
    userId: string,
    permission: Permission | "none"
  ) => {
    try {
      const { error: rpcError } = await supabase.rpc(
        "set_permission_for_resource",
        {
          p_resource_id: resource.id,
          p_user_id: userId,
          p_permission: permission,
        }
      );

      if (rpcError) throw rpcError;

      setPermissions((prev) =>
        prev.map((p) =>
          p.user_id === userId
            ? {
                ...p,
                permission,
                hasExplicitOverride: true,
                // Once there is an explicit override, it defines the effective permission
                effectivePermission:
                  permission === "none"
                    ? null
                    : (permission as Permission),
              }
            : p
        )
      );
    } catch (err: any) {
      setError(`Failed to update permission: ${err.message}`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${resource.name}"`} size="4xl">
      <ModalBody>
        {isLoading ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {permissions.map((p) => {
              const isOwner = members.find((m) => m.user_id === p.user_id)?.role === "owner";
              return (
                <div
                  key={p.user_id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      {isOwner ? (
                        <Crown size={16} />
                      ) : (
                        <User size={16} />
                      )}
                    </div>
                    <span>{p.full_name}</span>
                  </div>
                  {isOwner ? (
                    <span className="text-sm font-medium text-gray-500">
                      Owner
                    </span>
                  ) : (
                    <div className="flex gap-2 flex-shrink-0">
                      {(["none", "view", "edit"] as (Permission | "none")[]).map(
                        (perm) => {
                          // Baseline selection:
                          // - If there is an explicit override, use that.
                          // - Otherwise, use the effective/blanket permission from the hierarchy.
                          const baseline =
                            p.hasExplicitOverride && p.permission
                              ? p.permission
                              : (p.effectivePermission ?? "none");
                          const isActive = baseline === perm;
                          const isHideOption = perm === "none";
                          const label = isHideOption
                            ? p.hasExplicitOverride
                              ? "Hide"
                              : "No override"
                            : perm === "view"
                            ? "View"
                            : "Edit";
                          const title = isHideOption
                            ? p.hasExplicitOverride
                              ? "Explicitly hide this document from this user (override default access)"
                              : "No explicit override for this file; user may inherit access from project/org permissions"
                            : perm === "view"
                            ? "Grant explicit view access (override default)"
                            : "Grant explicit edit access (override default)";

                          return (
                            <button
                              key={perm}
                              onClick={() =>
                                handlePermissionChange(p.user_id, perm)
                              }
                              className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                                isActive
                                  ? perm === "edit"
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : perm === "view"
                                    ? "bg-gray-700 text-white border-gray-700"
                                    : "bg-gray-400 text-white border-gray-400"
                                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                              )}
                              title={title}
                            >
                              {label}
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Done</Button>
      </ModalFooter>
    </Modal>
  );
};
