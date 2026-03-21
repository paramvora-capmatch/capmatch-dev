import { describe, it, expect } from "vitest";
import { useOrgStore } from "../useOrgStore";

describe("@unit @frontend @team @fast useOrgStore", () => {
  it("has initial null org and empty members", () => {
    expect(useOrgStore.getState().currentOrg).toBeNull();
    expect(useOrgStore.getState().members).toEqual([]);
  });
});
