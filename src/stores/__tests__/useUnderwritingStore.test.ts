import { describe, it, expect } from "vitest";
import { useUnderwritingStore } from "../useUnderwritingStore";

describe("@unit @frontend @underwriting @fast useUnderwritingStore", () => {
  it("has initial underwriting state", () => {
    const state = useUnderwritingStore.getState();
    expect(state.threads).toEqual([]);
    expect(state.messages).toEqual([]);
  });
});
