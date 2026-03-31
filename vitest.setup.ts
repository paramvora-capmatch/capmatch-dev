import "@testing-library/jest-dom/vitest";

// Dummy env for store tests that import supabaseClient (which throws if unset)
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
}
