import { ProjectMessage } from "@/types/enhanced-types";

export const dbMessageToProjectMessage = (
  dbMessage: Record<string, any>
): ProjectMessage => {
  // Use 'any' for flexibility with joins
  return {
    id: dbMessage.id,
    thread_id: dbMessage.thread_id, // This will be null if not joined
    project_id: dbMessage.chat_threads?.project_id, // Add project_id from joined chat_threads
    user_id: dbMessage.user_id,
    content: dbMessage.content,
    created_at: dbMessage.created_at,
  };
};
