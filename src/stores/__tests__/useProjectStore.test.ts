import { describe, it, expect } from "vitest";
import { useProjectStore } from "../useProjectStore";

describe("@unit @frontend @project @fast useProjectStore", () => {
  it("has initial empty project list", () => {
    expect(useProjectStore.getState().projects).toEqual([]);
    expect(useProjectStore.getState().activeProject).toBeNull();
  });
});
