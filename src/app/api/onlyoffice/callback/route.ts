// src/app/api/onlyoffice/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const jwtSecret = process.env.ONLYOFFICE_JWT_SECRET;
  if (!jwtSecret) {
    console.error("ONLYOFFICE_JWT_SECRET is not set.");
    return NextResponse.json(
      { error: 1, message: "Server configuration error" },
      { status: 500 }
    );
  }

  // --- VERSIONING CHANGES START ---
  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get("resourceId");

  if (!resourceId) {
    return NextResponse.json(
      {
        error: 1,
        message: "Missing resourceId in callback URL",
      },
      { status: 400 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (jsonError) {
    console.error(
      "[OnlyOffice Callback] Failed to parse request body as JSON:",
      jsonError
    );
    return NextResponse.json(
      { error: 1, message: "Invalid request body" },
      { status: 400 }
    );
  }

  try {
    let decoded: { actions?: Array<{ userid?: string }> } | undefined;

    // Verify JWT from OnlyOffice
    if (body.token) {
      try {
        decoded = jwt.verify(body.token as string, jwtSecret) as
          | { actions?: Array<{ userid?: string }> }
          | undefined;
      } catch (err) {
        console.error("[OnlyOffice Callback] JWT verification failed:", {
          error: err instanceof Error ? err.message : String(err),
          tokenSecret: jwtSecret ? "set" : "NOT SET",
        });
        return NextResponse.json(
          { error: 1, message: "Invalid token" },
          { status: 403 }
        );
      }
    } else {
      console.error(
        "[OnlyOffice Callback] JWT token is missing from callback."
      );
      return NextResponse.json(
        { error: 1, message: "Missing token" },
        { status: 403 }
      );
    }

    const { status, url, changesurl } = body as {
      status: number;
      url?: string;
      changesurl?: string;
    };

    // Handle document save (status 2 or 6)
    if (status === 2 || status === 6) {
      // For save operations, we MUST have a user ID.
      const userId = decoded?.actions?.[0]?.userid;

      if (!userId) {
        console.error(
          "[OnlyOffice Callback] No userId found in token for a save operation (status 2 or 6). Decoded payload:",
          decoded
        );
        return NextResponse.json(
          {
            error: 1,
            message:
              "Invalid token payload; user cannot be identified for saving.",
          },
          { status: 403 }
        );
      }

      // Document is ready for saving
      if (!url) {
        console.error("No URL provided in callback for saving.");
        return NextResponse.json(
          { error: 1, message: "No URL provided for saving" },
          { status: 400 }
        );
      }

      // --- VERSIONING LOGIC ---

      // 1. Get info about the resource being saved
      const { data: resource, error: resourceError } = await supabase
        .from("resources")
        .select("org_id, project_id, name, parent_id")
        .eq("id", resourceId)
        .single();
      if (resourceError)
        throw new Error(
          `Failed to find resource ${resourceId}: ${resourceError.message}`
        );

      // Determine which subdirectory to use by checking the previous version's storage path
      // or by tracing up the parent chain to find the root type
      let storageSubdir = "project-docs"; // default
      
      // First, try to get the previous version's storage path to extract the subdirectory
      const { data: previousVersion } = await supabase
        .from("document_versions")
        .select("storage_path")
        .eq("resource_id", resourceId)
        .neq("storage_path", "placeholder")
        .order("version_number", { ascending: false })
        .limit(1)
        .single();
      
      if (previousVersion?.storage_path) {
        // Extract subdirectory from previous version's path
        // Path format: <project_id>/<subdir>/<resource_id>/v<version>_<filename>
        const pathParts = previousVersion.storage_path.split("/");
        if (pathParts.length >= 2) {
          const subdir = pathParts[1];
          if (subdir === "borrower-docs" || subdir === "project-docs") {
            storageSubdir = subdir;
          }
        }
      } else {
        // Fallback: trace up the parent chain to find the root type
        let currentParentId = resource.parent_id;
        const visited = new Set<string>();
        
        while (currentParentId) {
          if (visited.has(currentParentId)) break;
          visited.add(currentParentId);
          
          const { data: parent } = await supabase
            .from("resources")
            .select("id, resource_type, parent_id")
            .eq("id", currentParentId)
            .single();
          
          if (!parent) break;
          
          if (parent.resource_type === "BORROWER_DOCS_ROOT") {
            storageSubdir = "borrower-docs";
            break;
          } else if (parent.resource_type === "PROJECT_DOCS_ROOT") {
            storageSubdir = "project-docs";
            break;
          }
          
          currentParentId = parent.parent_id;
        }
      }

      // 2. Create a new document_versions record. The trigger will set the version_number.
      const { data: newVersion, error: versionError } = await supabase
        .from("document_versions")
        .insert({
          resource_id: resourceId,
          created_by: userId,
          changes_url: changesurl, // Store the changes URL
          storage_path: "placeholder",
        })
        .select()
        .single();
      if (versionError)
        throw new Error(
          `Failed to create new version record: ${versionError.message}`
        );

      // Mark all previous versions as superseded
      const { error: supersedError } = await supabase
        .from("document_versions")
        .update({ status: "superseded" })
        .eq("resource_id", resourceId)
        .neq("id", newVersion.id);
      if (supersedError)
        throw new Error(
          `Failed to mark previous versions as superseded: ${supersedError.message}`
        );

      // 3. Construct the new storage path with the correct subdirectory
      const newStoragePath = `${resource.project_id}/${storageSubdir}/${resourceId}/v${newVersion.version_number}_${resource.name}`;

      // Download the updated document from OnlyOffice server
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch document from OnlyOffice server: ${response.statusText}`
        );
      }
      const fileBuffer = await response.arrayBuffer();
      const contentType =
        response.headers.get("content-type") || "application/octet-stream";

      // Capture metadata before uploading
      const metadata = {
        size: fileBuffer.byteLength,
        mimeType: contentType,
        downloadedAt: new Date().toISOString(),
      };

      // 4. Upload the new version to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(resource.org_id) // bucketId is the org_id
        .upload(newStoragePath, fileBuffer, {
          contentType: contentType,
        });

      if (uploadError) {
        throw new Error(
          `Failed to upload new version to Storage: ${uploadError.message}`
        );
      }

      // 5. Update the version record with the final storage path
      const { error: updateVersionError } = await supabase
        .from("document_versions")
        .update({ storage_path: newStoragePath })
        .eq("id", newVersion.id);
      if (updateVersionError)
        throw new Error(
          `Failed to update version path: ${updateVersionError.message}`
        );

      // 5b. Update the version record with metadata
      const { error: updateMetadataError } = await supabase
        .from("document_versions")
        .update({ metadata: metadata })
        .eq("id", newVersion.id);
      if (updateMetadataError)
        throw new Error(
          `Failed to update version metadata: ${updateMetadataError.message}`
        );

      // 6. Update the main resource to point to this new version as the current one
      const { error: updateResourceError } = await supabase
        .from("resources")
        .update({ current_version_id: newVersion.id })
        .eq("id", resourceId);
      if (updateResourceError)
        throw new Error(
          `Failed to set current version: ${updateResourceError.message}`
        );

      return NextResponse.json({ error: 0 });
    }

    // For all other statuses (0, 1, 3, 4, 7), we don't need to do anything.
    // Just acknowledge the callback with success.
    return NextResponse.json({ error: 0 });
  } catch (error) {
    console.error("Error processing OnlyOffice callback:", error);
    return NextResponse.json(
      {
        error: 1,
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS (important for OnlyOffice server to be able to call back)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
