import prisma from "./prisma";

export interface AchievementDef {
  type: string;
  name: string;
  description: string;
  icon: string; // emoji used in toasts/badges
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { type: "FIRST_GAME",      name: "First Entry",       description: "Added your first game to the library",   icon: "🎮" },
  { type: "LIBRARY_10",      name: "Collector",         description: "10 games in your library",               icon: "📚" },
  { type: "LIBRARY_50",      name: "Hoarder",           description: "50 games in your library",               icon: "🗄️" },
  { type: "LIBRARY_100",     name: "Completionist",     description: "100 games in your library",              icon: "🏆" },
  { type: "COMPLETED_FIRST", name: "Finisher",          description: "Completed your first game",              icon: "✅" },
  { type: "COMPLETED_10",    name: "Dedicated",         description: "Completed 10 games",                     icon: "🎯" },
  { type: "COMPLETED_50",    name: "Veteran",           description: "Completed 50 games",                     icon: "⚔️" },
  { type: "PERFECT_SCORE",   name: "Perfectionist",     description: "Gave a perfect 10/10 rating",            icon: "⭐" },
  { type: "CRITIC",          name: "Harsh Critic",      description: "Gave 10/10 to 5 different games",        icon: "🎖️" },
  { type: "REVIEWER",        name: "Reviewer",          description: "Wrote reviews for 10 games",             icon: "✍️" },
  { type: "SOCIAL_10",       name: "Social Butterfly",  description: "Following 10 or more people",            icon: "🦋" },
  { type: "POPULAR_10",      name: "Popular",           description: "Reached 10 followers",                   icon: "🌟" },
];

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map((a) => [a.type, a]));

/**
 * Checks what achievements the user qualifies for, awards any not yet earned,
 * and returns the list of newly-earned achievement types.
 */
export async function checkAndAwardAchievements(userId: string): Promise<AchievementDef[]> {
  const [totalEntries, completedCount, perfectRatings, reviewCount, followingCount, followersCount] =
    await Promise.all([
      prisma.gameEntry.count({ where: { userId } }),
      prisma.gameEntry.count({ where: { userId, status: "COMPLETED" } }),
      prisma.gameEntry.count({ where: { userId, rating: 10 } }),
      prisma.gameEntry.count({ where: { userId, review: { not: null } } }),
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.follow.count({ where: { followingId: userId } }),
    ]);

  const qualified: string[] = [];
  if (totalEntries >= 1)    qualified.push("FIRST_GAME");
  if (totalEntries >= 10)   qualified.push("LIBRARY_10");
  if (totalEntries >= 50)   qualified.push("LIBRARY_50");
  if (totalEntries >= 100)  qualified.push("LIBRARY_100");
  if (completedCount >= 1)  qualified.push("COMPLETED_FIRST");
  if (completedCount >= 10) qualified.push("COMPLETED_10");
  if (completedCount >= 50) qualified.push("COMPLETED_50");
  if (perfectRatings >= 1)  qualified.push("PERFECT_SCORE");
  if (perfectRatings >= 5)  qualified.push("CRITIC");
  if (reviewCount >= 10)    qualified.push("REVIEWER");
  if (followingCount >= 10) qualified.push("SOCIAL_10");
  if (followersCount >= 10) qualified.push("POPULAR_10");

  const existing = await prisma.userAchievement.findMany({
    where: { userId },
    select: { type: true },
  });
  const existingSet = new Set(existing.map((a) => a.type));

  const newTypes = qualified.filter((t) => !existingSet.has(t));
  if (newTypes.length > 0) {
    // SQLite does not support skipDuplicates on createMany — insert individually
    // and ignore unique-constraint errors from race conditions
    await Promise.all(
      newTypes.map((type) =>
        prisma.userAchievement.create({ data: { userId, type } }).catch(() => {})
      )
    );
  }

  return newTypes.map((t) => ACHIEVEMENT_MAP.get(t)!).filter(Boolean);
}
