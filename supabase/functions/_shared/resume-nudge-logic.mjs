/**
 * Pure JS logic used by the resume nudges cron and unit tested via node:test.
 * Keep this dependency-free and compatible with both Deno and Node.
 */

export const NUDGE_STAGES = /** @type {const} */ (["t45m", "t24h", "t3d", "t7d"]);

/**
 * @param {Date} now
 * @param {Date} lastActivityAt
 * @param {{
 *   firstStageMinutes?: number,
 *   secondStageMinutes?: number,
 * }} [options]
 * @returns {{ stage: typeof NUDGE_STAGES[number] | null, minutesInactive: number }}
 */
export function computeNudgeStage(now, lastActivityAt, options = {}) {
  const ms = now.getTime() - lastActivityAt.getTime();
  const minutesInactive = Math.floor(ms / (60 * 1000));

  const firstStageMinutes =
    typeof options.firstStageMinutes === "number" && Number.isFinite(options.firstStageMinutes)
      ? Math.max(1, Math.floor(options.firstStageMinutes))
      : 45;

  const secondStageMinutesRaw =
    typeof options.secondStageMinutes === "number" && Number.isFinite(options.secondStageMinutes)
      ? Math.max(1, Math.floor(options.secondStageMinutes))
      : 24 * 60;
  // Ensure stage ordering: second must be strictly after first.
  const secondStageMinutes = Math.max(secondStageMinutesRaw, firstStageMinutes + 1);

  // First stage (t45m) runs from firstStageMinutes up to (but not including) secondStageMinutes.
  if (minutesInactive >= firstStageMinutes && minutesInactive < secondStageMinutes) {
    return { stage: "t45m", minutesInactive };
  }
  // Second stage (t24h) runs from secondStageMinutes up to <3d (unless you later choose to override 3d too).
  if (minutesInactive >= secondStageMinutes && minutesInactive < 3 * 24 * 60) {
    return { stage: "t24h", minutesInactive };
  }
  if (minutesInactive >= 3 * 24 * 60 && minutesInactive < 7 * 24 * 60) return { stage: "t3d", minutesInactive };
  if (minutesInactive >= 7 * 24 * 60) return { stage: "t7d", minutesInactive };
  return { stage: null, minutesInactive };
}

/**
 * Prefer nudging the closest-to-done resume, else project by default.
 *
 * @param {number} borrowerPercent
 * @param {number} projectPercent
 * @returns {"borrower"|"project"|"both"}
 */
export function pickResumeFocus(borrowerPercent, projectPercent) {
  const b = clampPercent(borrowerPercent);
  const p = clampPercent(projectPercent);

  const borrowerIncomplete = b < 100;
  const projectIncomplete = p < 100;

  if (borrowerIncomplete && projectIncomplete) {
    // If one is >=90, pick it (high conversion).
    if (b >= 90 && p < 90) return "borrower";
    if (p >= 90 && b < 90) return "project";
    // Otherwise default to project since OM unlock messaging centers on project details.
    return "project";
  }
  if (borrowerIncomplete) return "borrower";
  if (projectIncomplete) return "project";
  return "both";
}

/**
 * Prefer focus based on last_step_id when available:
 * - borrower:* => borrower
 * - project:*  => project
 * Falls back to percentage heuristic when lastStepId is missing/unknown.
 *
 * @param {string | null | undefined} lastStepId
 * @param {number} borrowerPercent
 * @param {number} projectPercent
 * @returns {"borrower"|"project"|"both"}
 */
export function pickResumeFocusFromLastStep(lastStepId, borrowerPercent, projectPercent) {
  if (typeof lastStepId === "string" && lastStepId.length > 0) {
    if (lastStepId.startsWith("borrower:")) return "borrower";
    if (lastStepId.startsWith("project:")) return "project";
  }
  return pickResumeFocus(borrowerPercent, projectPercent);
}

/**
 * Resolve focus using last_step_id first, but guard against stale step ids:
 * if the chosen focus resume is already 100% complete, switch focus to the other
 * incomplete resume (if any).
 *
 * @param {string | null | undefined} lastStepId
 * @param {number} borrowerPercent
 * @param {number} projectPercent
 * @returns {"borrower"|"project"|"both"}
 */
export function resolveResumeFocus(lastStepId, borrowerPercent, projectPercent) {
  const b = clampPercent(borrowerPercent);
  const p = clampPercent(projectPercent);

  let focus = pickResumeFocusFromLastStep(lastStepId, b, p);
  if (focus === "borrower" && b >= 100) {
    return p < 100 ? "project" : "both";
  }
  if (focus === "project" && p >= 100) {
    return b < 100 ? "borrower" : "both";
  }
  return focus;
}

/**
 * If neither resume has started (both 0%), skip the 45m stage to avoid nagging too early.
 * @param {number} borrowerPercent
 * @param {number} projectPercent
 * @returns {boolean}
 */
export function isNotStarted(borrowerPercent, projectPercent) {
  return clampPercent(borrowerPercent) <= 0 && clampPercent(projectPercent) <= 0;
}

/**
 * @param {number} value
 * @returns {number}
 */
export function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}



