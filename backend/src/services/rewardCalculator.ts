export interface RewardCandidate {
  rank: number;
  userId: string;
  score: number;
}

export interface RewardedPlayer extends RewardCandidate {
  rewardAmount: number;
}

export interface RewardCalculationResult {
  players: RewardedPlayer[];
  distributedAmount: number;
  undistributedAmount: number;
}

export const PRIZE_POOL_PERCENTAGE = 0.02;

const FIRST_PLACE_SHARE = 0.2;
const SECOND_PLACE_SHARE = 0.15;
const THIRD_PLACE_SHARE = 0.1;
const TAIL_POOL_SHARE = 0.55;
const LOWEST_REWARDED_RANK = 100;

export function calculatePrizePool(totalWeeklyEarned: number): number {
  return Math.floor(totalWeeklyEarned * PRIZE_POOL_PERCENTAGE);
}

function tailWeightForRank(rank: number): number {
  return LOWEST_REWARDED_RANK + 1 - rank;
}

export function calculateWeeklyRewards(
  players: RewardCandidate[],
  prizePoolAmount: number,
): RewardCalculationResult {
  const firstReward = Math.floor(prizePoolAmount * FIRST_PLACE_SHARE);
  const secondReward = Math.floor(prizePoolAmount * SECOND_PLACE_SHARE);
  const thirdReward = Math.floor(prizePoolAmount * THIRD_PLACE_SHARE);
  const tailPool = Math.floor(prizePoolAmount * TAIL_POOL_SHARE);
  const tailPlayers = players.filter((player) => player.rank >= 4);
  const tailWeightTotal = tailPlayers.reduce(
    (sum, player) => sum + tailWeightForRank(player.rank),
    0,
  );

  const rewardedPlayers = players.map((player) => {
    let rewardAmount = 0;

    if (player.rank === 1) {
      rewardAmount = firstReward;
    } else if (player.rank === 2) {
      rewardAmount = secondReward;
    } else if (player.rank === 3) {
      rewardAmount = thirdReward;
    } else if (tailWeightTotal > 0) {
      rewardAmount = Math.floor(
        (tailPool * tailWeightForRank(player.rank)) / tailWeightTotal,
      );
    }

    return { ...player, rewardAmount };
  });

  const distributedAmount = rewardedPlayers.reduce(
    (sum, player) => sum + player.rewardAmount,
    0,
  );

  return {
    players: rewardedPlayers,
    distributedAmount,
    undistributedAmount: prizePoolAmount - distributedAmount,
  };
}
