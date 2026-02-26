import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";

const LOGOS_DIR = "Landing-Page/SecuritySectionLogos";
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg", ".webp"];

export async function GET(request: Request) {
	try {
		// Public endpoint: landing page logos are shown to unauthenticated visitors
		const supabase = await createClient();
		const { data: { user } } = await supabase.auth.getUser();
		const rlId = getRateLimitId(request, user?.id ?? null);
		const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "security-logos");
		if (!rl.allowed) return rl.response;

		const dir = path.join(process.cwd(), "public", LOGOS_DIR);

		if (!fs.existsSync(dir)) {
			return NextResponse.json({ logos: [] });
		}

		const filenames = fs.readdirSync(dir);

		const logos = filenames
			.filter((file) => {
				const ext = path.extname(file).toLowerCase();
				return IMAGE_EXTENSIONS.includes(ext);
			})
			.map((file) => {
				const name = path.basename(file, path.extname(file));
				return {
					src: `/${LOGOS_DIR}/${file}`,
					name,
					scale: 1.0 as number,
				};
			});

		return NextResponse.json({ logos });
	} catch (error) {
		console.error("Error reading security logos directory:", error);
		return NextResponse.json(
			{ error: "Failed to load security logos" },
			{ status: 500 }
		);
	}
}
