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

  try {
    const body = await request.json();

    console.log("[OnlyOffice Callback] Request body received:", {
      status: body.status,
      hasToken: !!body.token,
      hasUrl: !!body.url,
      tokenLength: body.token?.length || 0,
    });

    let decoded: any;

    // Verify JWT from OnlyOffice
    if (body.token) {
      try {
        decoded = jwt.verify(body.token, jwtSecret);
        console.log("[OnlyOffice Callback] Token verified successfully.");
      } catch (err) {
        console.error("[OnlyOffice Callback] JWT verification failed:", {
          error: err instanceof Error ? err.message : String(err),
          tokenSecret: jwtSecret ? "set" : "NOT SET",
        });
        return NextResponse.json({ error: 1, message: "Invalid token" }, { status: 403 });
      }
    } else {
      console.error("[OnlyOffice Callback] JWT token is missing from callback.");
      return NextResponse.json(
        { error: 1, message: "Missing token" },
        { status: 403 });
    }

    const { status, url, changesurl, key } = body;

    // Handle document save (status 2 or 6)
    if (status === 2 || status === 6) {
      // For save operations, we MUST have a user ID.
      const userId = decoded?.actions?.[0]?.userid;

      if (!userId) {
        console.error("[OnlyOffice Callback] No userId found in token for a save operation (status 2 or 6). Decoded payload:", decoded);
        return NextResponse.json(
          {
            error: 1,
            message: "Invalid token payload; user cannot be identified for saving.",
          },
          { status: 403 }
        );
      }

      // Document is ready for saving
      console.log(`[OnlyOffice Callback] Document ready for saving`, {
        resourceId,
        status,
        hasUrl: !!url,
      });

      if (!url) {
        console.error("No URL provided in callback for saving.");
        return NextResponse.json(
          { error: 1, message: "No URL provided for saving" },
          { status: 400 }
        );
      }

      // Log the save request for debugging
      console.log(
        `[OnlyOffice Callback] Save triggered for resource ${resourceId} by user ${userId}`
      );

      // --- VERSIONING LOGIC ---

      // 1. Get info about the resource being saved
      const { data: resource, error: resourceError } = await supabase
        .from("resources")
        .select("org_id, project_id, name")
        .eq("id", resourceId)
        .single();
      if (resourceError)
        throw new Error(
          `Failed to find resource ${resourceId}: ${resourceError.message}`
        );
      console.log("[OnlyOffice Callback] Resource found:", {
        resourceId,
        resourceName: resource.name,
      });

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
      console.log("[OnlyOffice Callback] New version created:", {
        versionId: newVersion.id,
        versionNumber: newVersion.version_number,
      });

      // Mark all previous versions as superseded
      const { error: supersedError } = await supabase
        .from("document_versions")
        .update({ status: "superseded" })
        .eq("resource_id", resourceId)
        .neq("id", newVersion.id);
      if (supersedError)
        throw new Error(`Failed to mark previous versions as superseded: ${supersedError.message}`);

      // 3. Construct the new storage path
      const newStoragePath = `${resource.project_id}/${resourceId}/v${newVersion.version_number}_${resource.name}`;

      // Download the updated document from OnlyOffice server
      console.log(
        `[OnlyOffice Callback] Downloading file from OnlyOffice at: ${url}`
      );
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
      console.log(
        `[OnlyOffice Callback] File metadata - Size: ${metadata.size} bytes, Type: ${metadata.mimeType}`
      );

      // 4. Upload the new version to Supabase Storage
      console.log(
        `[OnlyOffice Callback] Uploading to storage at path: ${newStoragePath}`
      );
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
      console.log(
        `[OnlyOffice Callback] Successfully uploaded to ${newStoragePath}`
      );

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

      console.log(
        `Successfully saved new version ${newVersion.version_number} for resource ${resourceId} at ${newStoragePath}`
      );
      return NextResponse.json({ error: 0 });
    }

    // For all other statuses (0, 1, 3, 4, 7), we don't need to do anything.
    // Just acknowledge the callback with success.
    console.log(`[OnlyOffice Callback] Acknowledging status ${status}. No save action taken.`);
    return NextResponse.json({ error: 0 });
  } catch (error: any) {
    console.error("Error processing OnlyOffice callback:", error);
    return NextResponse.json(
      { error: 1, message: error.message },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS (important for OnlyOffice server to be able to call back)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
