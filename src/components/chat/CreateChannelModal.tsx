import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { MultiSelect } from "../ui/MultiSelect";
import { Button } from "../ui/Button";
import { Loader2, FileText, Users } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { AttachableDocument } from "../../stores/useChatStore";

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
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [documents, setDocuments] = useState<AttachableDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const memberLabelToId = useMemo(() => {
    const map = new Map<string, string>();
    memberOptions.forEach((option) => map.set(option.label, option.value));
    return map;
  }, [memberOptions]);

  const selectedMemberIds = useMemo(() => {
    return selectedLabels
      .map((label) => memberLabelToId.get(label))
      .filter((id): id is string => Boolean(id));
  }, [selectedLabels, memberLabelToId]);

  const participantsKey = useMemo(() => {
    const ids = Array.from(new Set([...baseParticipantIds, ...selectedMemberIds])).sort();
    return ids.join("|");
  }, [baseParticipantIds, selectedMemberIds]);

  const participantIds = useMemo(() => {
    if (!participantsKey) return [] as string[];
    return participantsKey.split("|").filter(Boolean);
  }, [participantsKey]);

  useEffect(() => {
    if (!isOpen) {
      setTopic("");
      setSelectedLabels([]);
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
      await onCreate(topic.trim(), selectedMemberIds);
    } catch (err) {
      console.error("Failed to create channel:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const availableOptions = useMemo(() => {
    return memberOptions.map((option) => option.label);
  }, [memberOptions]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create new channel">
      <div className="space-y-6">
        <div className="space-y-3">
          <Input
            label="Channel name"
            placeholder="e.g. Financing Discussion"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />

          <div className="border rounded-md p-3 bg-gray-50">
            <div className="flex items-center text-sm text-gray-700 font-medium mb-2">
              <Users className="h-4 w-4 mr-2" />
              Members included automatically
            </div>
            <div className="flex flex-wrap gap-2">
              {baseParticipantLabels.map((label) => (
                <span
                  key={label}
                  className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <MultiSelect
            label="Add members"
            options={availableOptions}
            value={selectedLabels}
            onChange={setSelectedLabels}
            placeholder="Select additional members..."
            helperText={
              availableOptions.length === 0
                ? "No additional members currently have access to this project."
                : undefined
            }
          />
        </div>

        <div className="border rounded-md">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
            <div className="flex items-center text-sm font-semibold text-gray-700">
              <FileText className="h-4 w-4 mr-2" />
              Documents everyone can reference
            </div>
            <span className="text-xs text-gray-500">
              {documents.length} items
            </span>
          </div>
          <div className="max-h-60 overflow-y-auto divide-y">
            {isLoadingDocs ? (
              <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
              </div>
            ) : docError ? (
              <div className="py-4 px-3 text-sm text-red-600">{docError}</div>
            ) : documents.length === 0 ? (
              <div className="py-4 px-3 text-sm text-gray-500">
                No documents are currently shared across all selected members.
              </div>
            ) : (
              documents.map((doc) => (
                <div key={doc.resourceId} className="px-3 py-2 text-sm text-gray-700 flex justify-between">
                  <span className="truncate mr-2">{doc.name}</span>
                  <span className="text-xs uppercase tracking-wide text-gray-400">
                    {doc.scope === "org" ? "ORG" : "PROJECT"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!topic.trim() || isCreating}
          >
            {isCreating ? "Creating..." : "Create channel"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

