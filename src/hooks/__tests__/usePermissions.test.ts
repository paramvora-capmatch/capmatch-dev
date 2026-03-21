/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePermissions } from "../usePermissions";

describe("@integration @frontend @permissions usePermissions", () => {
  it("returns permission helpers for null resource", () => {
    const { result } = renderHook(() => usePermissions(null));
    expect(result.current).toHaveProperty("canView");
    expect(result.current).toHaveProperty("canEdit");
    expect(result.current.permission).toBeNull();
  });
});
