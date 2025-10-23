// src/components/documents/ShareModal.tsx
import React, { useState, useEffect } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Loader2, User, Crown } from "lucide-react";
import { useOrgStore } from "@/stores/useOrgStore";
import { supabase } from "../../../lib/supabaseClient";
import { DocumentFile, DocumentFolder } from "@/hooks/useDocumentManagement";
import { Select } from "../ui/Select";
import { Permission } from "@/types/enhanced-types";

interface ShareModalProps {
  resource: DocumentFile | DocumentFolder;
  isOpen: boolean;
  onClose: () => void;
}

interface MemberPermission {
  user_id: string;
  full_name: string;
  permission: Permission | "none";
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
          const allMembersWithPerms = members.map((member) => ({
            user_id: member.user_id,
            full_name: member.userName || member.userEmail || "Unknown",
            permission:
              (currentPermissions.get(member.user_id) as Permission | "none") ||
              "none",
          }));

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
        prev.map((p) => (p.user_id === userId ? { ...p, permission } : p))
      );
    } catch (err: any) {
      setError(`Failed to update permission: ${err.message}`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${resource.name}"`}>
      <ModalBody>
        {isLoading ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {permissions.map((p) => (
              <div
                key={p.user_id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    {members.find((m) => m.user_id === p.user_id)?.role ===
                    "owner" ? (
                      <Crown size={16} />
                    ) : (
                      <User size={16} />
                    )}
                  </div>
                  <span>{p.full_name}</span>
                </div>
                {members.find((m) => m.user_id === p.user_id)?.role ===
                "owner" ? (
                  <span className="text-sm font-medium text-gray-500">
                    Owner
                  </span>
                ) : (
                  <Select
                    value={p.permission}
                    onChange={(e) =>
                      handlePermissionChange(
                        p.user_id,
                        e.target.value as Permission | "none"
                      )
                    }
                    options={[
                      { value: "edit", label: "Can Edit" },
                      { value: "view", label: "Can View" },
                      { value: "none", label: "No Access" },
                    ]}
                    className="w-32"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Done</Button>
      </ModalFooter>
    </Modal>
  );
};
