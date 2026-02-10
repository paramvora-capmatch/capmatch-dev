import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
    try {
        const lendersDirectory = path.join(process.cwd(), "public", "lenders");
        
        // Check if directory exists
        if (!fs.existsSync(lendersDirectory)) {
            return NextResponse.json({ files: [] });
        }

        const filenames = fs.readdirSync(lendersDirectory);

        // Filter for image files
        const images = filenames.filter((file) => {
            const ext = path.extname(file).toLowerCase();
            return [".png", ".jpg", ".jpeg", ".svg", ".webp"].includes(ext);
        });

        const imagePaths = images.map((file) => `/lenders/${file}`);

        return NextResponse.json({ files: imagePaths });
    } catch (error) {
        console.error("Error reading lenders directory:", error);
        return NextResponse.json({ error: "Failed to load lenders" }, { status: 500 });
    }
}
