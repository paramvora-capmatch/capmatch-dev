import { describe, it, expect } from "vitest";
import { usePermissionStore } from "../usePermissionStore";

describe("@unit @frontend @permissions @fast usePermissionStore", () => {
  it("has initial permission state", () => {
    const state = usePermissionStore.getState();
    expect(state.permissions).toEqual({});
    expect(state.currentProjectId).toBeNull();
  });
});
