import React, { useEffect, useMemo, useState } from "react";
import { Modal, ModalBody, ModalFooter } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Loader2, FileText, Users, Check, Plus } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { AttachableDocument } from "../../stores/useChatStore";
import { cn } from "../../utils/cn";

type MemberRole = "owner" | "member" | "advisor" | "project_manager";

interface MemberOption {
  value: string;
  label: string;
  role?: MemberRole;
}

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (topic: string, selectedMemberIds: string[]) => Promise<void>;
  memberOptions: MemberOption[];
  projectId: string;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  memberOptions,
  projectId,
}) => {
  const [topic, setTopic] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [documents, setDocuments] = useState<AttachableDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const participantsKey = useMemo(() => {
    // Note: Current user is automatically added by createThread, so we only need selectedMemberIds
    const ids = Array.from(new Set(selectedMemberIds)).sort();
    return ids.join("|");
  }, [selectedMemberIds]);

  const participantIds = useMemo(() => {
    if (!participantsKey) return [] as string[];
    return participantsKey.split("|").filter(Boolean);
  }, [participantsKey]);

  const prioritizedMemberOptions = useMemo(() => {
    const rolePriority: Record<MemberRole, number> = {
      owner: 0,
      advisor: 1,
      member: 2,
      project_manager: 2,
    };

    return [...memberOptions].sort((a, b) => {
      const aPriority =
        (a.role && rolePriority[a.role as MemberRole]) ?? rolePriority.member;
      const bPriority =
        (b.role && rolePriority[b.role as MemberRole]) ?? rolePriority.member;

      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.label.localeCompare(b.label);
    });
  }, [memberOptions]);

  // Preselect owners and advisors whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    const defaultSelected = new Set(
      prioritizedMemberOptions
        .filter(
          (option) =>
            option.role === "owner" ||
            option.role === "advisor" ||
            option.role === "project_manager" // treat project managers as members (no auto select)
        )
        .filter((option) => option.role === "owner" || option.role === "advisor")
        .map((option) => option.value)
    );

    setSelectedMemberIds(defaultSelected);
  }, [isOpen, prioritizedMemberOptions]);

  useEffect(() => {
    if (!isOpen) {
      setTopic("");
      setSelectedMemberIds(new Set());
      setDocuments([]);
      setDocError(null);
      setIsCreating(false);
      setIsLoadingDocs(false);
      return;
    }

    const fetchDocs = async () => {
      if (!projectId || participantIds.length === 0) {
        setDocuments([]);
        setDocError(null);
        setIsLoadingDocs(false);
        return;
      }

      setIsLoadingDocs(true);
      setDocError(null);
      try {
        const { data, error } = await supabase.rpc(
          "get_common_file_resources_for_member_set",
          {
            p_project_id: projectId,
            p_user_ids: participantIds,
          }
        );

        if (error) {
          throw new Error(error.message);
        }

        const docs: AttachableDocument[] = (data as any[])?.map((doc) => ({
          resourceId: doc.resource_id,
          name: doc.name,
          scope: doc.scope,
        })) ?? [];

        setDocuments(docs);
      } catch (err) {
        console.error("Failed to load doc intersection:", err);
        setDocError(
          err instanceof Error
            ? err.message
            : "Failed to load shared documents"
        );
        setDocuments([]);
      } finally {
        setIsLoadingDocs(false);
      }
    };

    fetchDocs();
  }, [isOpen, participantIds, projectId]);

  const handleCreate = async () => {
    if (!topic.trim()) return;
    setIsCreating(true);
    try {
      await onCreate(topic.trim(), Array.from(selectedMemberIds));
    } catch (err) {
      console.error("Failed to create channel:", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create new channel" size="4xl">
      <ModalBody>
        <div className="grid grid-cols-2 gap-4 h-[500px]">
          {/* Left Panel - Form */}
          <div className="border-r border-gray-200 pr-4 flex flex-col">
            <div className="space-y-4 flex-shrink-0">
              <Input
                label="Channel name"
                placeholder="e.g. Financing Discussion"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />


              <h3 className="text-sm font-semibold text-gray-900">
                Add members ({prioritizedMemberOptions.length})
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto mt-2">
              {prioritizedMemberOptions.length === 0 ? (
                <div className="text-sm text-gray-500 py-8 px-4 border border-gray-200 rounded-lg bg-gray-50 text-center">
                  No additional members currently have access to this project.
                </div>
              ) : (
                <div className="space-y-2">
                  {prioritizedMemberOptions.map((option) => {
                    const isSelected = selectedMemberIds.has(option.value);
                    const normalizedRole =
                      option.role === "project_manager" ? "member" : option.role;
                    const roleStyles =
                      normalizedRole === "owner"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : normalizedRole === "advisor"
                        ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                        : normalizedRole === "member"
                        ? "bg-slate-100 text-slate-700 border border-slate-200"
                        : null;
                    return (
                      <div
                        key={option.value}
                        onClick={() => toggleMemberSelection(option.value)}
                        className={cn(
                          "border rounded-lg p-3 cursor-pointer transition-all group",
                          isSelected
                            ? "border-blue-500 bg-blue-50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className={cn(
                              "text-sm",
                              isSelected
                                ? "text-blue-900 font-medium"
                                : "text-gray-900 group-hover:text-blue-900"
                            )}
                          >
                            {option.label}
                          </span>
                          <div className="flex items-center gap-2">
                            {roleStyles && (
                              <span
                                className={cn(
                                  "text-[11px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide",
                                  roleStyles
                                )}
                              >
                                {normalizedRole}
                              </span>
                            )}
                            {isSelected ? (
                              <Check className="h-5 w-5 text-blue-600" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-gray-300 group-hover:border-blue-400 flex items-center justify-center transition-colors">
                                <Plus className="h-3 w-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Documents */}
          <div className="flex flex-col pl-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-900">
                Documents everyone can reference
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {documents.length} {documents.length === 1 ? "item" : "items"}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoadingDocs ? (
                <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                </div>
              ) : docError ? (
                <div className="py-4 px-3 text-sm text-red-600 border border-red-200 rounded-lg bg-red-50">
                  {docError}
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-500">
                  <FileText className="h-8 w-8 text-gray-400 mb-2" />
                  <p>No documents are currently shared</p>
                  <p className="text-xs text-gray-400 mt-1">
                    across all selected members
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.resourceId}
                      className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {doc.name}
                          </div>
                          <div className="mt-1">
                            <span className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                              {doc.scope === "org" ? "BORROWER DOCS" : "PROJECT DOCS"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={isCreating}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={!topic.trim() || isCreating}>
          {isCreating ? "Creating..." : "Create channel"}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

