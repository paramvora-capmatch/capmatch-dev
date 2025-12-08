"use client";

import React from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useOrgStore } from "@/stores/useOrgStore";
import { Permission } from "@/types/enhanced-types";
import { cn } from "@/utils/cn";
import { FileText } from "lucide-react";

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

  const [selectedFileKey, setSelectedFileKey] = React.useState<string | null>(
    null
  );
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
    // Select first file by default
    if (files.length > 0) {
      setSelectedFileKey(fileKey(files[0]));
    } else {
      setSelectedFileKey(null);
    }
  }, [isOpen, files, memberList]);

  const handleSet = (userId: string, fileKey: string, perm: UploadPermissions) => {
    setSelections((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [fileKey]: perm,
      },
    }));
  };

  // Set permission for all members for a specific file
  const handleSetForAll = (fileKey: string, perm: UploadPermissions) => {
    setSelections((prev) => {
      const next = { ...prev };
      for (const m of memberList) {
        if (!next[m.user_id]) {
          next[m.user_id] = {};
        }
        next[m.user_id][fileKey] = perm;
      }
      return next;
    });
  };

  // Get permission for all members for a file (returns the most common one, or "view" if mixed)
  const getPermissionForAll = (fileKey: string): UploadPermissions => {
    const perms = memberList.map(
      (m) => selections[m.user_id]?.[fileKey] || "view"
    );
    const allSame = perms.every((p) => p === perms[0]);
    if (allSame) {
      return perms[0];
    }
    // If mixed, return the highest permission level (none < view < edit)
    if (perms.some((p) => p === "edit")) return "edit";
    if (perms.some((p) => p === "view")) return "view";
    return "none";
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

  const selectedFile = files.find((f) => fileKey(f) === selectedFileKey);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Document Permissions" size="4xl">
      <ModalBody>
        {memberList.length === 0 ? (
          <div className="text-sm text-gray-600">
            No members to configure. Owners have full access by default.
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 gap-4 h-[500px]">
            {/* Left Column: Document List */}
            <div className="border-r border-gray-200 pr-4 flex flex-col min-h-0 overflow-hidden">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex-shrink-0">
                Documents ({files.length})
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                {files.map((file) => {
                  const fKey = fileKey(file);
                  const isSelected = selectedFileKey === fKey;
                  const allPermission = getPermissionForAll(fKey);

                  return (
                    <div
                      key={fKey}
                      className={cn(
                        "border rounded-lg p-3 cursor-pointer transition-all",
                        isSelected
                          ? "border-blue-500 bg-blue-50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      )}
                      onClick={() => setSelectedFileKey(fKey)}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <FileText className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {formatFileSize(file.size)}
                          </div>
                        </div>
                      </div>

                      {/* Bulk Permission Pills */}
                      <div className="flex gap-1.5 mt-2">
                        {(["none", "view", "edit"] as UploadPermissions[]).map(
                          (p) => (
                            <button
                              key={p}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetForAll(fKey, p);
                              }}
                              className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                                allPermission === p
                                  ? p === "edit"
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : p === "view"
                                    ? "bg-gray-700 text-white border-gray-700"
                                    : "bg-gray-400 text-white border-gray-400"
                                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                              )}
                              title={
                                p === "none"
                                  ? "None for All"
                                  : p === "view"
                                  ? "View for All"
                                  : "Edit for All"
                              }
                            >
                              {p === "none"
                                ? "None"
                                : p === "view"
                                ? "View"
                                : "Edit"}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Member List */}
            <div className="flex flex-col min-h-0 overflow-hidden">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex-shrink-0">
                {selectedFile ? (
                  <>
                    Permissions for{" "}
                    <span className="text-blue-600">{selectedFile.name}</span>
                  </>
                ) : (
                  "Select a document to set permissions"
                )}
              </h3>
              {selectedFile ? (
                <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                  {memberList.map((member) => {
                    const fKey = fileKey(selectedFile);
                    const current =
                      selections[member.user_id]?.[fKey] || "view";
                    return (
                      <div
                        key={member.user_id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {member.userName || member.userEmail || "Member"}
                          </div>
                          {member.userEmail && member.userName && (
                            <div className="text-xs text-gray-500 truncate">
                              {member.userEmail}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {(["none", "view", "edit"] as UploadPermissions[]).map(
                            (p) => (
                              <button
                                key={p}
                                onClick={() => handleSet(member.user_id, fKey, p)}
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                                  current === p
                                    ? p === "edit"
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : p === "view"
                                      ? "bg-gray-700 text-white border-gray-700"
                                      : "bg-gray-400 text-white border-gray-400"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                )}
                                title={
                                  p === "none"
                                    ? "No Access"
                                    : p === "view"
                                    ? "Can View"
                                    : "Can Edit"
                                }
                              >
                                {p === "none" ? "None" : p === "view" ? "View" : "Edit"}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
                  Select a document from the left to configure permissions
                </div>
              )}
            </div>
          </div>
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
