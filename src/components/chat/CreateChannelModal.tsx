import React, { useEffect, useMemo, useState } from "react";
import { Modal, ModalBody, ModalFooter } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Loader2, FileText, Users, Check, Plus } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { AttachableDocument } from "../../stores/useChatStore";
import { cn } from "../../utils/cn";

interface MemberOption {
  value: string;
  label: string;
}

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (topic: string, selectedMemberIds: string[]) => Promise<void>;
  memberOptions: MemberOption[];
  baseParticipantIds: string[];
  baseParticipantLabels: string[];
  projectId: string;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  memberOptions,
  baseParticipantIds,
  baseParticipantLabels,
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
    const ids = Array.from(new Set([...baseParticipantIds, ...Array.from(selectedMemberIds)])).sort();
    return ids.join("|");
  }, [baseParticipantIds, selectedMemberIds]);

  const participantIds = useMemo(() => {
    if (!participantsKey) return [] as string[];
    return participantsKey.split("|").filter(Boolean);
  }, [participantsKey]);

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

              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center text-sm font-semibold text-gray-900 mb-3">
                  <Users className="h-4 w-4 mr-2 text-gray-600" />
                  Owners included automatically
                </div>
                <div className="flex flex-wrap gap-2">
                  {baseParticipantLabels.map((label) => (
                    <span
                      key={label}
                      className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-200"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-900">
                Add members ({memberOptions.length})
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto mt-2">
              {memberOptions.length === 0 ? (
                <div className="text-sm text-gray-500 py-8 px-4 border border-gray-200 rounded-lg bg-gray-50 text-center">
                  No additional members currently have access to this project.
                </div>
              ) : (
                <div className="space-y-2">
                  {memberOptions.map((option) => {
                    const isSelected = selectedMemberIds.has(option.value);
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
                        <div className="flex items-center justify-between">
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
                          <div className="flex-shrink-0 ml-2">
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

