import cron from "node-cron";
import prisma from "./prisma";
import { sendEmail, buildDigestHtml } from "./email";

/**
 * Sends the weekly digest email to all users who have opted in.
 * Runs every Monday at 09:00 UTC.
 */
export function startCronJobs() {
  cron.schedule("0 9 * * 1", sendWeeklyDigests, { timezone: "UTC" });
  console.log("[cron] Weekly digest scheduled for Mondays at 09:00 UTC");
}

async function sendWeeklyDigests() {
  console.log("[cron] Starting weekly digest run...");
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: { emailNotifications: true },
    select: { id: true, email: true, username: true, lastDigestAt: true },
  });

  let sent = 0;
  for (const user of users) {
    try {
      const cutoff = user.lastDigestAt ?? since;

      const [newLikes, newComments, newFollowers, feedActivities] = await Promise.all([
        // Likes on this user's activities since last digest
        prisma.like.count({
          where: { activity: { userId: user.id }, createdAt: { gte: cutoff } },
        }),
        // Comments on this user's activities since last digest
        prisma.comment.count({
          where: { activity: { userId: user.id }, createdAt: { gte: cutoff } },
        }),
        // New followers since last digest
        prisma.follow.findMany({
          where: { followingId: user.id, createdAt: { gte: cutoff } },
          select: { follower: { select: { username: true } } },
          take: 10,
        }),
        // Activities from followed users — up to 5 highlights
        prisma.activity.findMany({
          where: {
            createdAt: { gte: cutoff },
            user: { followers: { some: { followerId: user.id } }, isPrivate: false },
          },
          select: {
            user: { select: { username: true } },
            gameEntry: { select: { game: { select: { name: true } } } },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

      // Skip if nothing happened
      if (!newLikes && !newComments && !newFollowers.length && !feedActivities.length) continue;

      const html = buildDigestHtml({
        username: user.username,
        newFollowers: newFollowers.map((f) => ({ username: f.follower.username })),
        newLikes,
        newComments,
        feedHighlights: feedActivities
          .filter((a) => a.gameEntry?.game)
          .map((a) => ({ username: a.user.username, gameName: a.gameEntry.game!.name })),
      });

      const ok = await sendEmail(user.email, "🎮 Your GameLog Weekly Digest", html);
      if (ok) {
        await prisma.user.update({ where: { id: user.id }, data: { lastDigestAt: new Date() } });
        sent++;
      }
    } catch (err) {
      console.error(`[cron] Digest failed for user ${user.username}:`, err);
    }
  }

  console.log(`[cron] Weekly digest done. Sent ${sent}/${users.length} emails.`);
}
