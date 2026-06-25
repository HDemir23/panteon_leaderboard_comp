const DEFAULT_LEADERBOARD_TIMEZONE =
  process.env.WEEKLY_LEADERBOARD_TIMEZONE || "Europe/Istanbul";

function getDatePartsInTimezone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const valueFor = (type: string) => {
    const value = parts.find((part) => part.type === type)?.value;

    if (!value) {
      throw new Error(`Missing ${type} while formatting week id`);
    }

    return Number(value);
  };

  return {
    year: valueFor("year"),
    month: valueFor("month"),
    day: valueFor("day"),
  };
}

function padWeek(week: number): string {
  return String(week).padStart(2, "0");
}

export function getCurrentWeekId(
  date = new Date(),
  timeZone = DEFAULT_LEADERBOARD_TIMEZONE,
): string {
  const { year, month, day } = getDatePartsInTimezone(date, timeZone);
  const target = new Date(
    Date.UTC(year, month - 1, day),
  );

  target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));

  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );

  return `${target.getUTCFullYear()}-W${padWeek(week)}`;
}

export function leaderboardKeyForWeek(weekId: string): string {
  return `leaderboard:week:${weekId}`;
}
