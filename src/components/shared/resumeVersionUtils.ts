import { projectResumeFieldMetadata } from "@/lib/project-resume-field-metadata";
import { isGroupedFormat, ungroupFromSections } from "@/lib/section-grouping";

export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
};

export const stringifyValue = (value: unknown): string => {
  if (value === undefined || value === null) return "—";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

export const getFieldLabel = (fieldId: string): string => {
  const metadata = projectResumeFieldMetadata[fieldId];
  if (metadata) {
    return metadata.description.split(".")[0] || metadata.fieldId;
  }
  return fieldId;
};

export const flattenResumeContent = (rawContent: Record<string, any> | null | undefined) => {
  if (!rawContent) return {};
  let content = rawContent;
  if (isGroupedFormat(content)) {
    content = ungroupFromSections(content);
  }

  const flat: Record<string, unknown> = {};
  Object.entries(content).forEach(([key, value]) => {
    if (key.startsWith("_")) return;
    if (value && typeof value === "object" && "value" in value) {
      flat[key] = (value as any).value;
    } else {
      flat[key] = value;
    }
  });
  return flat;
};

