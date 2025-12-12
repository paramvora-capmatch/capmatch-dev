import { promises as fs } from 'fs';
import path from 'path';

export interface FieldAccessLog {
  fieldId: string;
  status: 'available' | 'missing' | 'fallback';
  page: string;
  subpage?: string;
  isInsight: boolean;
  fallbackValue?: string;
  timestamp: string;
  projectId: string;
}

interface LogEntry {
  timestamp: string;
  projectId: string;
  page: string;
  subpage?: string;
  fields: FieldAccessLog[];
}

/**
 * Get the log directory path
 */
function getLogDirectory(): string {
  // Create logs directory in project root
  const logDir = path.join(process.cwd(), 'logs', 'om-field-access');
  return logDir;
}

/**
 * Get log file path for a project
 */
function getLogFilePath(projectId: string): string {
  const logDir = getLogDirectory();
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(logDir, `${projectId}-${date}.json`);
}

/**
 * Ensure log directory exists
 */
async function ensureLogDirectory(): Promise<void> {
  const logDir = getLogDirectory();
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create log directory:', error);
    throw error;
  }
}

/**
 * Read existing log file
 */
async function readLogFile(filePath: string): Promise<LogEntry[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Write log entries to file
 */
async function writeLogFile(filePath: string, entries: LogEntry[]): Promise<void> {
  await ensureLogDirectory();
  await fs.writeFile(filePath, JSON.stringify(entries, null, 2), 'utf-8');
}

/**
 * Log field access to file
 */
export async function logFieldAccess(fieldLogs: FieldAccessLog[]): Promise<void> {
  if (fieldLogs.length === 0) return;

  // Group by project, page, and subpage
  const grouped = new Map<string, Map<string, Map<string, FieldAccessLog[]>>>();
  
  for (const log of fieldLogs) {
    const projectKey = log.projectId;
    const pageKey = log.page;
    const subpageKey = log.subpage || 'main';

    if (!grouped.has(projectKey)) {
      grouped.set(projectKey, new Map());
    }
    const projectMap = grouped.get(projectKey)!;

    if (!projectMap.has(pageKey)) {
      projectMap.set(pageKey, new Map());
    }
    const pageMap = projectMap.get(pageKey)!;

    if (!pageMap.has(subpageKey)) {
      pageMap.set(subpageKey, []);
    }
    pageMap.get(subpageKey)!.push(log);
  }

  // Write each project's logs to its file
  for (const [projectId, pageMap] of grouped.entries()) {
    const filePath = getLogFilePath(projectId);
    const existingEntries = await readLogFile(filePath);
    
    // Create new entries for this batch
    const newEntries: LogEntry[] = [];
    for (const [page, subpageMap] of pageMap.entries()) {
      for (const [subpage, fields] of subpageMap.entries()) {
        newEntries.push({
          timestamp: new Date().toISOString(),
          projectId,
          page,
          subpage: subpage !== 'main' ? subpage : undefined,
          fields,
        });
      }
    }

    // Merge with existing entries (keep last 1000 entries per project to prevent file bloat)
    const allEntries = [...existingEntries, ...newEntries];
    const limitedEntries = allEntries.slice(-1000); // Keep last 1000 entries

    await writeLogFile(filePath, limitedEntries);
  }
}

/**
 * Generate a summary report from log files
 */
export async function generateSummaryReport(projectId: string, date?: string): Promise<{
  totalMissing: number;
  totalFallback: number;
  byPage: Record<string, { missing: number; fallback: number; fields: string[] }>;
}> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const filePath = path.join(getLogDirectory(), `${projectId}-${targetDate}.json`);
  
  try {
    const entries = await readLogFile(filePath);
    
    const summary = {
      totalMissing: 0,
      totalFallback: 0,
      byPage: {} as Record<string, { missing: number; fallback: number; fields: string[] }>,
    };

    for (const entry of entries) {
      const pageKey = entry.subpage ? `${entry.page}/${entry.subpage}` : entry.page;
      
      if (!summary.byPage[pageKey]) {
        summary.byPage[pageKey] = { missing: 0, fallback: 0, fields: [] };
      }

      for (const field of entry.fields) {
        if (field.status === 'missing') {
          summary.totalMissing++;
          summary.byPage[pageKey].missing++;
          if (!summary.byPage[pageKey].fields.includes(field.fieldId)) {
            summary.byPage[pageKey].fields.push(field.fieldId);
          }
        } else if (field.status === 'fallback') {
          summary.totalFallback++;
          summary.byPage[pageKey].fallback++;
          if (!summary.byPage[pageKey].fields.includes(field.fieldId)) {
            summary.byPage[pageKey].fields.push(field.fieldId);
          }
        }
      }
    }

    return summary;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return { totalMissing: 0, totalFallback: 0, byPage: {} };
    }
    throw error;
  }
}

