import {
	computeProjectCompletion,
	PROJECT_REQUIRED_FIELDS,
} from "@/utils/resumeCompletion";
import { projectProfileForCompletion } from "./fixtures/projectProfile";

describe("computeProjectCompletion", () => {
	it("returns 0 for null or undefined project", () => {
		expect(computeProjectCompletion(null)).toBe(0);
		expect(computeProjectCompletion(undefined)).toBe(0);
	});

	it("returns 0 when no locked fields", () => {
		expect(computeProjectCompletion({}, {})).toBe(0);
		expect(computeProjectCompletion(projectProfileForCompletion, {})).toBe(0);
	});

	it("counts only required-and-locked fields", () => {
		const totalRequired = PROJECT_REQUIRED_FIELDS.length;
		expect(totalRequired).toBeGreaterThan(0);

		const locked: Record<string, boolean> = {};
		PROJECT_REQUIRED_FIELDS.slice(0, 2).forEach((f) => {
			locked[f] = true;
		});
		const percent = computeProjectCompletion(
			projectProfileForCompletion,
			locked
		);
		expect(percent).toBe(Math.round((2 / totalRequired) * 100));
	});

	it("returns 100 when all required fields are locked", () => {
		const locked: Record<string, boolean> = {};
		PROJECT_REQUIRED_FIELDS.forEach((f) => {
			locked[f] = true;
		});
		expect(computeProjectCompletion(projectProfileForCompletion, locked)).toBe(
			100
		);
	});
});
