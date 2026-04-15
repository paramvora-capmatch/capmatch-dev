/** Job status and response types for background tasks (autofill, underwriting). */
export type JobStatus = "pending" | "running" | "completed" | "failed";
export type AutofillContext = "project" | "borrower";
export type AutofillPhase =
  | "initializing"
  | "doc_scanning"
  | "doc_extracting"
  | "kb_querying"
  | "ai_merging"
  | "saving"
  | "completed";

export interface AutofillProgressMetadata extends Record<string, unknown> {
  phase?: AutofillPhase;
  total_docs?: number;
  doc_names?: string[];
  total_subsections?: number;
  sources?: string[];
  doc_fields?: number;
  kb_fields?: number;
  total_fields?: number;
}

export interface AutofillLifecycleEventDetail {
  projectId: string;
  context: AutofillContext;
  jobId?: string;
}

export interface AutofillProgressEventDetail extends AutofillLifecycleEventDetail {
  phase: AutofillPhase;
  metadata: AutofillProgressMetadata;
}

export const AUTOFILL_STARTED_EVENT = "autofill-started";
export const AUTOFILL_PROGRESS_EVENT = "autofill-progress";
export const AUTOFILL_COMPLETED_EVENT = "autofill-completed";
export const AUTOFILL_FAILED_EVENT = "autofill-failed";

export interface JobResponse {
  id: string;
  project_id: string;
  job_type: string;
  status: JobStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
  error_message: string | null;
}
