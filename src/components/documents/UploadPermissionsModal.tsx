"use client";

import React from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useOrgStore } from "@/stores/useOrgStore";
import { Permission } from "@/types/enhanced-types";
import { cn } from "@/utils/cn";

type UploadPermissions = Permission | "none";

interface UploadPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
  onConfirm: (
    selections: Record<string, Record<string, UploadPermissions>>
    // selections[userId][fileKey] = permission
  ) => Promise<void> | void;
}

// Create a deterministic key for each File to index selections
const fileKey = (file: File) => `${file.name}__${file.size}__${file.type}`;

export const UploadPermissionsModal: React.FC<UploadPermissionsModalProps> = ({
  isOpen,
  onClose,
  files,
  onConfirm,
}) => {
  const { members } = useOrgStore();

  const memberList = React.useMemo(
    () => members.filter((m) => m.role !== "owner"),
    [members]
  );

  const [activeIdx, setActiveIdx] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);

  // selections[userId][fileKey] = permission
  const [selections, setSelections] = React.useState<
    Record<string, Record<string, UploadPermissions>>
  >({});

  // Initialize default to "view" for all members and files
  React.useEffect(() => {
    if (!isOpen) return;
    const next: Record<string, Record<string, UploadPermissions>> = {};
    for (const m of memberList) {
      const perFiles: Record<string, UploadPermissions> = {};
      for (const f of files) {
        perFiles[fileKey(f)] = "view";
      }
      next[m.user_id] = perFiles;
    }
    setSelections(next);
    setActiveIdx(0);
  }, [isOpen, files, memberList]);

  const handleSet = (userId: string, f: File, perm: UploadPermissions) => {
    setSelections((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [fileKey(f)]: perm,
      },
    }));
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(selections);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const activeMember = memberList[activeIdx];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set access for uploads">
      <ModalBody>
        {memberList.length === 0 ? (
          <div className="text-sm text-gray-600">No members to configure. Owners have full access by default.</div>
        ) : (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {memberList.map((m, idx) => (
                <button
                  key={m.user_id}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm border",
                    idx === activeIdx
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  )}
                  onClick={() => setActiveIdx(idx)}
                >
                  {m.userName || m.userEmail || "Member"}
                </button>
              ))}
            </div>

            {/* File list with permission pills */}
            {activeMember && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {files.map((f) => {
                  const current = selections[activeMember.user_id]?.[fileKey(f)] || "view";
                  return (
                    <div
                      key={fileKey(f)}
                      className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-white"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-sm font-medium text-gray-900 truncate">{f.name}</div>
                        <div className="text-xs text-gray-500 truncate">{Math.round(f.size / 1024)} KB</div>
                      </div>
                      <div className="flex gap-2">
                        {(["none", "view", "edit"] as UploadPermissions[]).map((p) => (
                          <button
                            key={p}
                            onClick={() => handleSet(activeMember.user_id, f, p)}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-xs border",
                              current === p
                                ? p === "edit"
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : p === "view"
                                  ? "bg-gray-800 text-white border-gray-800"
                                  : "bg-gray-300 text-gray-800 border-gray-300"
                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            )}
                            title={p === "none" ? "No Access" : p === "view" ? "Can View" : "Can Edit"}
                          >
                            {p === "none" ? "None" : p === "view" ? "View" : "Edit"}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={submitting}>
          {submitting ? "Saving..." : "Save & Upload"}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default UploadPermissionsModal;


