import {
  calculatePrizePool,
  calculateWeeklyRewards,
  type RewardCandidate,
} from "./rewardCalculator.js";

function makePlayers(count: number): RewardCandidate[] {
  return Array.from({ length: count }, (_, index) => {
    const rank = index + 1;

    return {
      rank,
      userId: `player-${rank}`,
      score: 100_000 - index * 100,
    };
  });
}

describe("rewardCalculator", () => {
  it("uses 2% of total weekly earnings as the prize pool", () => {
    expect(calculatePrizePool(50_000_000)).toBe(1_000_000);
  });

  it("distributes top rewards and weighted tail rewards", () => {
    const prizePoolAmount = 1_000_000;
    const result = calculateWeeklyRewards(makePlayers(100), prizePoolAmount);

    expect(result.players[0].rewardAmount).toBe(200_000);
    expect(result.players[1].rewardAmount).toBe(150_000);
    expect(result.players[2].rewardAmount).toBe(100_000);
    expect(result.players[3].rewardAmount).toBe(11_224);
    expect(result.players[99].rewardAmount).toBe(115);
    expect(result.distributedAmount).toBe(999_952);
    expect(result.undistributedAmount).toBe(48);
  });
});
