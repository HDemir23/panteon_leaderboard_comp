import { getWeekIdForEarnedAt } from "./earnWeek.js";

describe("earnWeek", () => {
  it("assigns earn events to the week of the event timestamp", () => {
    expect(getWeekIdForEarnedAt(Date.parse("2026-06-28T20:55:00Z"))).toBe(
      "2026-W26",
    );
    expect(getWeekIdForEarnedAt(Date.parse("2026-06-28T21:05:00Z"))).toBe(
      "2026-W27",
    );
  });
});
