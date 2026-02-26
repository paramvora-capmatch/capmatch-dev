import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rlId = getRateLimitId(request, user.id);
        const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "lenders");
        if (!rl.allowed) return rl.response;

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
