/**
 * File upload validation: type allowlist, size limits, and filename sanitization
 * to prevent path traversal and malicious filenames.
 */

/** Max size for general document uploads (e.g. PDF, DOCX). 100MB */
export const MAX_DOCUMENT_SIZE_BYTES = 100 * 1024 * 1024;

/** Max size for image/PDF uploads in project form (site images, diagrams). 10MB */
export const MAX_IMAGE_OR_PDF_SIZE_BYTES = 10 * 1024 * 1024;

/** Allowed MIME types for document manager uploads (project/borrower docs). */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',     // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/msword',  // .doc
  'application/vnd.ms-excel', // .xls
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'text/plain',
  'text/csv',
];

/** Allowed MIME type predicates for project form image/diagram uploads (images + PDF). */
export const ALLOWED_IMAGE_OR_PDF_TYPES = [
  (t: string) => t.startsWith('image/'),
  (t: string) => t === 'application/pdf',
];

/** Safe filename: remove path segments and dangerous chars. Max length 200. */
const UNSAFE_FILENAME_REGEX = /[<>:"/\\|?*\x00-\x1f]/g;
const MAX_FILENAME_LENGTH = 200;

export function sanitizeFilename(name: string): string {
  if (!name || typeof name !== 'string') return 'unnamed';
  // Take basename only (no path traversal)
  const base = name.replace(/^.*[/\\]/, '').trim();
  const sanitized = base.replace(UNSAFE_FILENAME_REGEX, '_');
  if (!sanitized) return 'unnamed';
  return sanitized.slice(0, MAX_FILENAME_LENGTH);
}

export interface ValidateFileOptions {
  allowedMimeTypes?: string[];
  allowedMimeTypePredicates?: ((mime: string) => boolean)[];
  maxSizeBytes?: number;
  requireSanitizedName?: boolean;
}

export interface ValidateFileResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
}

export function validateFile(
  file: File,
  options: ValidateFileOptions
): ValidateFileResult {
  const {
    allowedMimeTypes,
    allowedMimeTypePredicates,
    maxSizeBytes = MAX_DOCUMENT_SIZE_BYTES,
    requireSanitizedName = true,
  } = options;

  const sanitizedName = sanitizeFilename(file.name);
  const basename = file.name.replace(/^.*[/\\]/, '').trim();

  // Reject path traversal attempts
  if (file.name.includes('/') || file.name.includes('\\')) {
    return { valid: false, error: `Invalid filename: path not allowed`, sanitizedName };
  }
  if (requireSanitizedName && sanitizedName !== basename) {
    return { valid: false, error: `Invalid filename: "${file.name}"`, sanitizedName };
  }

  if (file.size > maxSizeBytes) {
    const mb = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      error: `"${file.name}" exceeds ${mb}MB limit`,
      sanitizedName,
    };
  }

  if (allowedMimeTypes?.length) {
    const ok = allowedMimeTypes.some((t) => t === file.type);
    if (!ok) {
      return {
        valid: false,
        error: `"${file.name}": file type not allowed`,
        sanitizedName,
      };
    }
  }

  if (allowedMimeTypePredicates?.length) {
    const ok = allowedMimeTypePredicates.some((pred) => pred(file.type));
    if (!ok) {
      return {
        valid: false,
        error: `"${file.name}" is not a valid image or PDF`,
        sanitizedName,
      };
    }
  }

  return { valid: true, sanitizedName };
}

/** Validate multiple files; returns valid files and list of errors for invalid ones. */
export function validateFiles(
  files: File[],
  options: ValidateFileOptions
): { valid: File[]; errors: string[] } {
  const valid: File[] = [];
  const errors: string[] = [];
  for (const file of files) {
    const result = validateFile(file, options);
    if (result.valid) {
      valid.push(file);
    } else if (result.error) {
      errors.push(result.error);
    }
  }
  return { valid, errors };
}
