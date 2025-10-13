// src/app/api/onlyoffice-callback/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("OnlyOffice Callback received:", body);

    const { status, url, key, users } = body;

    /**
     * OnlyOffice Document Server status codes:
     * 0 - No document with the key identifier could be found
     * 1 - Document is being edited
     * 2 - Document is ready for saving (editing is finished)
     * 3 - Document saving error has occurred
     * 4 - Document is closed with no changes
     * 6 - Document is being edited, but the current document state is saved
     * 7 - Error has occurred while force saving the document
     */

    // Handle document save (status 2 or 6)
    if (status === 2 || status === 6) {
      console.log("Document ready for saving:", { key, url });

      // In a real implementation, you would:
      // 1. Download the document from the provided URL
      // 2. Upload it to Supabase Storage
      // 3. Create a version record
      // 4. Trigger AI analysis if needed

      // For POC, just log the save event
      console.log(`Would save document ${key} from URL: ${url}`);
      console.log(`Users who edited:`, users);

      // Return success response
      return NextResponse.json({ error: 0 });
    }

    // Handle document closed without changes (status 4)
    if (status === 4) {
      console.log("Document closed without changes:", key);
      return NextResponse.json({ error: 0 });
    }

    // Handle errors (status 3 or 7)
    if (status === 3 || status === 7) {
      console.error("Error saving document:", key);
      return NextResponse.json({ error: 1 });
    }

    // For other statuses, just acknowledge
    return NextResponse.json({ error: 0 });
  } catch (error) {
    console.error("Error processing OnlyOffice callback:", error);
    return NextResponse.json(
      { error: 1, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
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

// Set CORS headers for the response
export const runtime = "edge";
export const dynamic = "force-dynamic";
