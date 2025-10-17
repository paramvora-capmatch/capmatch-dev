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

  const { searchParams } = new URL(request.url);
  const bucketId = searchParams.get("bucketId");
  const filePath = searchParams.get("filePath");

  if (!bucketId || !filePath) {
    return NextResponse.json(
      { error: 1, message: "Missing bucketId or filePath in callback URL" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();

    // Verify JWT from OnlyOffice
    if (body.token) {
      try {
        jwt.verify(body.token, jwtSecret);
      } catch (err) {
        console.error("Invalid JWT in callback:", err);
        return NextResponse.json(
          { error: 1, message: "Invalid token" },
          { status: 403 }
        );
      }
    }

    const { status, url, key } = body;

    // Handle document save (status 2 or 6)
    if (status === 2 || status === 6) {
      // Document is ready for saving
      console.log(`Document ready for saving: ${key}`);

      if (!url) {
        console.error("No URL provided in callback for saving.");
        return NextResponse.json(
          { error: 1, message: "No URL provided for saving" },
          { status: 400 }
        );
      }

      // Download the updated document from OnlyOffice server
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch document from OnlyOffice server: ${response.statusText}`
        );
      }
      const fileBuffer = await response.arrayBuffer();

      // Upload the new version to Supabase Storage, overwriting the old one
      const { error: uploadError } = await supabase.storage
        .from(bucketId)
        .upload(filePath, fileBuffer, {
          upsert: true,
          contentType: response.headers.get("content-type") || undefined,
        });

      if (uploadError) {
        throw new Error(
          `Failed to upload to Supabase Storage: ${uploadError.message}`
        );
      }

      console.log(
        `Successfully saved updated document to Supabase: ${bucketId}/${filePath}`
      );
      return NextResponse.json({ error: 0 });
    }

    // For other statuses, just acknowledge
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
