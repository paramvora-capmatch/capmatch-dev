// src/app/api/onlyoffice/config/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase admin client to create signed URLs
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const jwtSecret = process.env.ONLYOFFICE_JWT_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const internalServerUrl = process.env.ONLYOFFICE_CALLBACK_URL || siteUrl;

  if (!jwtSecret || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing required server environment variables.");
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 }
    );
  }

  try {
    // Get current user session securely
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => {
            return cookieStore.get(name)?.value;
          },
          set: (name: string, value: string, options: CookieOptions) => {
            try {
              cookieStore.set({ name, value, ...options });
            } catch {
              // The `set` method was called from a Server Component.
            }
          },
          remove: (name: string, options: CookieOptions) => {
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch {
              // The `delete` method was called from a Server Component.
            }
          },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's name from their profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const userName = (profile && !profileError) ? profile.full_name : (user.email || "Anonymous");

    const body = await request.json();
    const { bucketId, filePath, mode = 'edit' } = body;

    if (!bucketId || !filePath) {
      return NextResponse.json(
        { error: "bucketId and filePath are required" },
        { status: 400 }
      );
    }

    // --- VERSIONING CHANGES START ---

    // 1. Find the document version and its associated resource from the storage path
    const { data: versionData, error: versionError } = await supabaseAdmin
      .from("document_versions")
      .select(
        `
            id,
            version_number,
            resource_id,
            version_number,
            resources!document_versions_resource_id_fkey ( id, name, project_id )
        `
      )
      .eq("storage_path", filePath)
      .single();

    if (versionError || !versionData || !versionData.resources) {
      throw new Error(
        `Document version not found for path: ${filePath}. ${
          versionError?.message || ""
        }`
      );
    }

    const documentVersion = versionData;
    const resource = versionData.resources as unknown as { id: string; name: string; project_id: string };

    // --- VERSIONING CHANGES END ---

    // Generate a signed URL for the specific version file path
    const { data, error: signedUrlError } = await supabaseAdmin.storage
      .from(bucketId)
      .createSignedUrl(filePath, 3600); // URL is valid for 1 hour

    if (signedUrlError) {
      throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
    }

    let documentUrl = data.signedUrl;

    // For OnlyOffice running in Docker to access localhost Supabase,
    // we need to rewrite the URL to use a Docker-accessible host
    const onlyofficeSupabaseUrl = process.env.ONLYOFFICE_SUPABASE_URL;
    if (onlyofficeSupabaseUrl) {
      // Replace localhost/127.0.0.1 URLs with the OnlyOffice-accessible URL
      const localPattern = /https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/;
      if (localPattern.test(documentUrl)) {
        const newBaseUrl = new URL(onlyofficeSupabaseUrl).origin;
        documentUrl = documentUrl.replace(localPattern, newBaseUrl);
      }
    }

    // Extract the original filename from storage path to avoid showing version/user prefixes
    // The resource.name might contain version prefix, so we extract from storage_path
    const extractOriginalFilename = (storagePath: string): string => {
      if (!storagePath) return resource.name;
      const filename = storagePath.split('/').pop() || storagePath;
      // Match patterns: v{version}_user{userId}_{filename} or v{version}_{filename}
      const newFormatMatch = filename.match(/^v\d+_user[^_]+_(.+)$/);
      if (newFormatMatch) return newFormatMatch[1];
      const oldFormatMatch = filename.match(/^v\d+_(.+)$/);
      if (oldFormatMatch) return oldFormatMatch[1];
      return filename;
    };
    
    const fileName = extractOriginalFilename(filePath);
    
    // Extract file type - try multiple sources
    let fileType = "";
    
    // First, try to get extension from extracted filename
    const nameParts = fileName.split(".");
    if (nameParts.length > 1 && nameParts[nameParts.length - 1].length <= 5) {
      fileType = nameParts[nameParts.length - 1].toLowerCase();
    }
    
    // If not found, extract from storage path (format: v{number}_user{userId}_{filename} or v{number}_{filename})
    if (!fileType) {
      const storagePathParts = filePath.split("/");
      const storageFileName = storagePathParts[storagePathParts.length - 1];
      // Try new format first (with user ID)
      const newFormatMatch = storageFileName.match(/^v\d+_user[^_]+_(.+)$/);
      if (newFormatMatch && newFormatMatch[1]) {
        const extension = newFormatMatch[1].split(".").pop();
        if (extension && extension !== newFormatMatch[1] && extension.length <= 5) {
          fileType = extension.toLowerCase();
        }
      } else {
        // Try old format (without user ID)
        const oldFormatMatch = storageFileName.match(/^v\d+_(.+)$/);
        if (oldFormatMatch && oldFormatMatch[1]) {
          const extension = oldFormatMatch[1].split(".").pop();
          if (extension && extension !== oldFormatMatch[1] && extension.length <= 5) {
            fileType = extension.toLowerCase();
          }
        }
      }
    }
    
    // Final fallback: extract from storage path directly
    if (!fileType) {
      const pathParts = filePath.split(".");
      if (pathParts.length > 1) {
        const extension = pathParts[pathParts.length - 1].toLowerCase();
        if (extension.length <= 5 && !extension.includes("/")) {
          fileType = extension;
        }
      }
    }
    
    // OnlyOffice supported file types
    const supportedFileTypes = ['docx', 'xlsx', 'pptx', 'pdf', 'doc', 'xls', 'ppt', 'odt', 'ods', 'odp'];
    
    // Validate file type
    if (!fileType || fileType.length === 0) {
      throw new Error(`Could not determine file type for document: ${fileName}. Storage path: ${filePath}`);
    }
    
    if (!supportedFileTypes.includes(fileType)) {
      throw new Error(
        `Unsupported file type for OnlyOffice: ${fileType}. Supported types: ${supportedFileTypes.join(', ')}`
      );
    }
    
    const normalizedFileType = fileType;

    const documentTypeMap: { [key: string]: string } = {
      docx: "word",
      doc: "word",
      odt: "word",
      xlsx: "cell",
      xls: "cell",
      ods: "cell",
      pptx: "slide",
      ppt: "slide",
      odp: "slide",
      pdf: "word", // PDFs are handled as word documents in OnlyOffice
    };
    const documentType = documentTypeMap[normalizedFileType] || "word";

    // Callback URL now includes the logical resource ID
    const callbackUrl = `${internalServerUrl}?resourceId=${encodeURIComponent(
      resource.id
    )}`;

    // Create a unique document key that changes when a new version is created.
    // OnlyOffice caches documents by this key. If you reuse the same key,
    // it will serve the cached version instead of loading the new one.
    // Format: {resourceId}_{versionNumber}_{timestamp}
    // The timestamp ensures that even if versions get the same name,
    // opening the same version twice gets a fresh load.
    const documentKey = `${resource.id}_v${
      documentVersion.version_number
    }_${Date.now()}`;

    const config = {
      document: {
        fileType: normalizedFileType,
        key: documentKey,
        title: fileName,
        url: documentUrl,
        permissions: {
          edit: mode === 'edit',
          download: true,
          print: true
        },
      },
      documentType,
      editorConfig: {
        mode: mode,
        lang: "en",
        callbackUrl: callbackUrl,
        user: { id: user.id, name: userName },
        customization: { autosave: true, forcesave: true, goback: false },
      },
      width: "100%",
      height: "100%",
      type: "desktop",
    };

    const token = jwt.sign(config, jwtSecret);
    const finalConfig = { ...config, token };

    return NextResponse.json(finalConfig);
  } catch (error: unknown) {
    console.error("Error generating OnlyOffice config:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 }
    );
  }
}
