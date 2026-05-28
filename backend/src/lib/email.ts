import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  FRONTEND_URL = "http://localhost:3000",
} = process.env;

/** Returns null (and logs a warning) when SMTP is not configured */
function createTransport() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT ?? "587"),
    secure: parseInt(SMTP_PORT ?? "587") === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const transport = createTransport();
  if (!transport) {
    console.log(`[email] SMTP not configured — would have sent "${subject}" to ${to}`);
    return false;
  }
  try {
    await transport.sendMail({
      from: SMTP_FROM ?? SMTP_USER,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return false;
  }
}

export function buildDigestHtml(opts: {
  username: string;
  newFollowers: { username: string }[];
  newLikes: number;
  newComments: number;
  feedHighlights: { username: string; gameName: string }[];
}): string {
  const { username, newFollowers, newLikes, newComments, feedHighlights } = opts;
  const appUrl = FRONTEND_URL;

  const followersList = newFollowers.length
    ? newFollowers.map((f) => `<li><a href="${appUrl}/user/${f.username}" style="color:#7c3aed">${f.username}</a></li>`).join("")
    : "<li>None this week</li>";

  const highlightsList = feedHighlights.length
    ? feedHighlights.map((h) => `<li><b>${h.username}</b> — ${h.gameName}</li>`).join("")
    : "<li>No activity from people you follow</li>";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your GameLog Weekly Digest</title></head>
<body style="font-family:sans-serif;background:#0f0f0f;color:#e5e5e5;padding:24px;max-width:560px;margin:0 auto">
  <h1 style="color:#7c3aed;font-size:1.5rem;margin-bottom:4px">🎮 GameLog Weekly Digest</h1>
  <p style="color:#9ca3af;margin-top:0">Hey <b style="color:#fff">${username}</b>, here's what happened this week.</p>

  <div style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:20px;margin:20px 0">
    <h2 style="margin-top:0;color:#a78bfa;font-size:1rem">Your Activity</h2>
    <p>❤️ <b>${newLikes}</b> like${newLikes !== 1 ? "s" : ""} on your posts</p>
    <p>💬 <b>${newComments}</b> new comment${newComments !== 1 ? "s" : ""}</p>
  </div>

  ${newFollowers.length ? `
  <div style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:20px;margin:20px 0">
    <h2 style="margin-top:0;color:#a78bfa;font-size:1rem">New Followers (${newFollowers.length})</h2>
    <ul style="padding-left:20px">${followersList}</ul>
  </div>` : ""}

  ${feedHighlights.length ? `
  <div style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:20px;margin:20px 0">
    <h2 style="margin-top:0;color:#a78bfa;font-size:1rem">From Your Feed</h2>
    <ul style="padding-left:20px">${highlightsList}</ul>
  </div>` : ""}

  <p style="color:#6b7280;font-size:0.8rem;margin-top:32px">
    <a href="${appUrl}/settings" style="color:#7c3aed">Unsubscribe</a> from weekly digests ·
    <a href="${appUrl}" style="color:#7c3aed">Go to GameLog</a>
  </p>
</body>
</html>`;
}
