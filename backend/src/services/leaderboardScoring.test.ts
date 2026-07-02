import {
  displayScoreFromRankScore,
  rankScoreForRawScore,
} from "./rankScore.js";

describe("leaderboardScoring", () => {
  it("keeps display scores integer while preserving tie order", () => {
    const earlier = Date.parse("2026-06-22T10:00:00Z");
    const later = Date.parse("2026-06-22T10:05:00Z");
    const earlierRankScore = rankScoreForRawScore(100, earlier);
    const laterRankScore = rankScoreForRawScore(100, later);

    expect(displayScoreFromRankScore(earlierRankScore)).toBe(100);
    expect(earlierRankScore).toBeGreaterThan(laterRankScore);
  });

  it("can still read legacy scaled rank scores", () => {
    expect(displayScoreFromRankScore(100_000_000_123_456)).toBe(100);
  });
});
