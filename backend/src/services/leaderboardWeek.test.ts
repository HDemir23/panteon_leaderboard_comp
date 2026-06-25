import { getCurrentWeekId } from "./leaderboardWeek.js";

describe("leaderboardWeek", () => {
  it("formats ISO week ids", () => {
    expect(getCurrentWeekId(new Date("2026-06-25T12:00:00Z"), "UTC")).toBe(
      "2026-W26",
    );
  });

  it("uses the configured timezone for week boundaries", () => {
    expect(
      getCurrentWeekId(new Date("2026-06-28T21:05:00Z"), "Europe/Istanbul"),
    ).toBe("2026-W27");
    expect(
      getCurrentWeekId(new Date("2026-06-28T20:55:00Z"), "Europe/Istanbul"),
    ).toBe("2026-W26");
  });
});
