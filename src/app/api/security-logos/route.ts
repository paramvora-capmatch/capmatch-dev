import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const LOGOS_DIR = "Landing-Page/SecuritySectionLogos";
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg", ".webp"];

export async function GET() {
	try {
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
