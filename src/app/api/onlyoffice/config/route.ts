// src/app/api/onlyoffice/config/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(request: NextRequest) {
  const jwtSecret = process.env.ONLYOFFICE_JWT_SECRET;

  if (!jwtSecret) {
    console.error("ONLYOFFICE_JWT_SECRET is not set in environment variables.");
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { fileName, fileType, documentType, height = "100%" } = body;

    if (!fileName || !fileType || !documentType) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const host = "http://host.docker.internal:3000";
    const documentUrl = `${host}/samples/${fileName}`;
    const callbackUrl = `${host}/api/onlyoffice-callback`;

    const config = {
      document: {
        fileType: fileType,
        key: `${fileName}-${Date.now()}`,
        title: fileName,
        url: documentUrl,
        permissions: { edit: true, download: true, print: true },
      },
      documentType,
      editorConfig: {
        mode: "edit",
        lang: "en",
        callbackUrl: callbackUrl,
        user: { id: "demo-user", name: "Demo User" },
        customization: { autosave: true, forcesave: true },
      },
      height: height, // Use provided height or default to "100%"
      width: "100%",
      type: "desktop",
    };

    const token = jwt.sign(config, jwtSecret);
    const finalConfig = { ...config, token };

    return NextResponse.json(finalConfig);
  } catch (error) {
    console.error("Error generating OnlyOffice config:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
