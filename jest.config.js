/** @type {import('jest').Config} */
const config = {
	testEnvironment: "node",
	roots: ["<rootDir>/src"],
	testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
	},
	transform: {
		"^.+\\.(ts|tsx)$": ["ts-jest", { useESM: false }],
	},
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};

module.exports = config;
