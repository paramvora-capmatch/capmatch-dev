import { describe, it, expect } from "vitest";
import { useChatStore } from "../useChatStore";

describe("@unit @frontend @chat @fast useChatStore", () => {
  it("has initial empty threads and messages", () => {
    expect(useChatStore.getState().threads).toEqual([]);
    expect(useChatStore.getState().messages).toEqual([]);
  });
});
