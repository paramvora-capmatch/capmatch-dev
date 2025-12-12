import test from "node:test";
import assert from "node:assert/strict";
import {
  computeNudgeStage,
  pickResumeFocus,
  pickResumeFocusFromLastStep,
  resolveResumeFocus,
  isNotStarted,
  clampPercent,
} from "../supabase/functions/_shared/resume-nudge-logic.mjs";

test("clampPercent clamps and rounds", () => {
  assert.equal(clampPercent(0), 0);
  assert.equal(clampPercent(0.4), 0);
  assert.equal(clampPercent(0.6), 1);
  assert.equal(clampPercent(99.6), 100);
  assert.equal(clampPercent(101), 100);
  assert.equal(clampPercent(-10), 0);
  assert.equal(clampPercent(Number.NaN), 0);
});

test("computeNudgeStage returns null under 45 minutes", () => {
  const now = new Date("2025-12-12T12:00:00.000Z");
  const last = new Date("2025-12-12T11:20:00.000Z"); // 40m
  const { stage } = computeNudgeStage(now, last);
  assert.equal(stage, null);
});

test("computeNudgeStage returns t45m from 45m up to <24h", () => {
  const now = new Date("2025-12-12T12:00:00.000Z");
  const last45 = new Date("2025-12-12T11:15:00.000Z");
  assert.equal(computeNudgeStage(now, last45).stage, "t45m");

  const last23h = new Date("2025-12-11T13:00:00.000Z");
  assert.equal(computeNudgeStage(now, last23h).stage, "t45m");
});

test("computeNudgeStage returns t24h from 24h up to <3d", () => {
  const now = new Date("2025-12-12T12:00:00.000Z");
  const last24h = new Date("2025-12-11T12:00:00.000Z");
  assert.equal(computeNudgeStage(now, last24h).stage, "t24h");
});

test("computeNudgeStage supports overriding second stage minutes (t24h) for testing", () => {
  const now = new Date("2025-12-12T12:00:00.000Z");
  const last3m = new Date("2025-12-12T11:57:00.000Z"); // 3 minutes inactive
  // Force second stage to 2 minutes -> should be in t24h window
  assert.equal(
    computeNudgeStage(now, last3m, { firstStageMinutes: 1, secondStageMinutes: 2 }).stage,
    "t24h"
  );
});

test("computeNudgeStage returns t3d from 3d up to <7d", () => {
  const now = new Date("2025-12-12T12:00:00.000Z");
  const last3d = new Date("2025-12-09T12:00:00.000Z");
  assert.equal(computeNudgeStage(now, last3d).stage, "t3d");
});

test("computeNudgeStage returns t7d at >=7d", () => {
  const now = new Date("2025-12-12T12:00:00.000Z");
  const last7d = new Date("2025-12-05T12:00:00.000Z");
  assert.equal(computeNudgeStage(now, last7d).stage, "t7d");
});

test("pickResumeFocus prefers >=90% completion resume when both incomplete", () => {
  assert.equal(pickResumeFocus(95, 40), "borrower");
  assert.equal(pickResumeFocus(40, 95), "project");
});

test("pickResumeFocus defaults to project when both incomplete and neither >=90", () => {
  assert.equal(pickResumeFocus(40, 60), "project");
});

test("pickResumeFocusFromLastStep uses last_step_id prefix over percents", () => {
  assert.equal(pickResumeFocusFromLastStep("borrower:basic-info", 10, 90), "borrower");
  assert.equal(pickResumeFocusFromLastStep("project:financial-details", 90, 10), "project");
});

test("pickResumeFocusFromLastStep falls back to percent heuristic when last_step_id missing", () => {
  assert.equal(pickResumeFocusFromLastStep(null, 95, 40), "borrower");
  assert.equal(pickResumeFocusFromLastStep(undefined, 40, 95), "project");
});

test("resolveResumeFocus guards against stale last_step_id pointing to a completed resume", () => {
  // last step says borrower, but borrower already complete -> focus project if incomplete
  assert.equal(resolveResumeFocus("borrower:basic-info", 100, 10), "project");
  // last step says project, but project already complete -> focus borrower if incomplete
  assert.equal(resolveResumeFocus("project:financial-details", 10, 100), "borrower");
});

test("isNotStarted true only when both are 0", () => {
  assert.equal(isNotStarted(0, 0), true);
  assert.equal(isNotStarted(1, 0), false);
  assert.equal(isNotStarted(0, 1), false);
});



