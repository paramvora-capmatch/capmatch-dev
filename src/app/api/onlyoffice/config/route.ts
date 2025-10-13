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
    const { fileName, fileType, documentType } = body;

    if (!fileName || !fileType || !documentType) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // For Docker on local dev, the container needs to reach the host machine.
    // 'localhost' inside the container refers to the container itself.
    // 'host.docker.internal' is a special DNS name that resolves to the host's IP.
    const host = "http://host.docker.internal:3000";

    const documentUrl = `${host}/samples/${fileName}`;
    const callbackUrl = `${host}/api/onlyoffice-callback`;

    // This is the full config object that OnlyOffice needs
    const config = {
      document: {
        fileType: fileType,
        key: `${fileName}-${Date.now()}`, // Unique key for each editing session
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
      height: "100%",
      width: "100%",
      type: "desktop",
    };

    // Create the JWT by signing the entire config object
    // OnlyOffice expects the token to be added to the top level of the config
    const token = jwt.sign(config, jwtSecret);

    // Add the generated token to the config object
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
