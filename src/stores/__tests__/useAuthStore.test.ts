import { describe, it, expect } from "vitest";
import { useAuthStore } from "../useAuthStore";

describe("@unit @frontend @auth @fast useAuthStore", () => {
  it("has initial unauthenticated state", () => {
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
