// src/app/api/onlyoffice/config/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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
            } catch (error) {
              // The `set` method was called from a Server Component.
            }
          },
          remove: (name: string, options: CookieOptions) => {
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch (error) {
              // The `delete` method was called from a Server Component.
            }
          },
        },
      }
    );
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's name from their profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const userName = profile?.full_name || user.email || "Anonymous";

    const body = await request.json();
    const { bucketId, filePath } = body;

    if (!bucketId || !filePath) {
      return NextResponse.json(
        { error: "bucketId and filePath are required" },
        { status: 400 }
      );
    }

    // Generate a signed URL using the admin client
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
        console.log(
          "[OnlyOffice Config] Rewrote Supabase URL for Docker access:",
          documentUrl
        );
      }
    }

    const fileName = filePath.split("/").pop() || "document";
    const fileType = fileName.split(".").pop() || "";

    const documentTypeMap: { [key: string]: string } = {
      docx: "word",
      xlsx: "cell",
      pptx: "slide",
    };
    const documentType = documentTypeMap[fileType] || "word";

    const callbackUrl = `${internalServerUrl}/api/onlyoffice/callback?bucketId=${encodeURIComponent(
      bucketId
    )}&filePath=${encodeURIComponent(filePath)}`;

    // Generate a URL-safe, unique key using a hash of the bucket and file path
    const documentKey = crypto
      .createHash("sha256")
      .update(`${bucketId}/${filePath}`)
      .digest("hex")
      .substring(0, 20);

    const config = {
      document: {
        fileType: fileType,
        key: documentKey,
        title: fileName,
        url: documentUrl,
        permissions: { edit: true, download: true, print: true },
      },
      documentType,
      editorConfig: {
        mode: "edit",
        lang: "en",
        callbackUrl: callbackUrl,
        user: { id: user.id, name: userName },
        customization: { autosave: true, forcesave: true, goback: false },
      },
      width: "100%",
      height: "100%",
      type: "desktop",
    };

    const token = jwt.sign(config, jwtSecret, { noTimestamp: true });
    const finalConfig = { ...config, token };

    console.log("[OnlyOffice Config] Document URL:", documentUrl);
    console.log("[OnlyOffice Config] Callback URL:", callbackUrl);

    return NextResponse.json(finalConfig);
  } catch (error: any) {
    console.error("Error generating OnlyOffice config:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
