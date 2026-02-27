/** Job status and response types for background tasks (autofill, underwriting). */
export type JobStatus = "pending" | "running" | "completed" | "failed";

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
