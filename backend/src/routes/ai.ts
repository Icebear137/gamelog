import { Router, Response } from "express";
import { z } from "zod";
import Groq from "groq-sdk";
import rateLimit from "express-rate-limit";
import prisma from "../lib/prisma";
import { optionalAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});

const ChatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(40),
  rawgId: z.number().optional(),
});

const SYSTEM_PROMPT = `You are a friendly support assistant for GameLog — a social game tracking web app. Your job is to help users understand and use the website.

Here is everything GameLog can do:

**Game Library**
- Add games to your library by searching on the Discover page or the game detail page
- Set a status for each game: Playing, Completed, Dropped, or Want to Play
- Give a rating (1–10), write a review, log playtime, and select the platform you played on
- Edit or remove games from your library at any time

**Home Feed**
- The home page shows a "Following Feed" — recent activity from people you follow
- Also shows "Global Activity" from all users
- At the top: "New Releases" (games released in the last 30 days) and "Coming Soon" (upcoming games)

**Discover Page**
- Browse and search all games in the database
- Filter by genre, sort by rating/name/release year
- "Recommended For You" section — personalized suggestions based on genres in your library
- Click "Want to Play" on a recommendation to dismiss it and load another

**Game Detail Page**
- View full game info: description, genres, platforms, developers, Metacritic score, avg playtime
- See community stats: average rating, how many users are playing/completed/dropped
- Add the game to your library directly from this page

**Lists**
- Create custom game lists (e.g. "Top 10 RPGs", "Games to play this summer")
- Lists can be public (visible to everyone) or private
- Like and comment on public lists
- Browse all public lists on the Lists → Discover page, sortable by Popular / Newest / Most Games

**Social Features**
- Follow other users to see their activity in your feed
- View any user's profile: their library, lists, reviews, activity
- Like and comment on activity posts (e.g. when someone completes a game)

**Messages / Chat**
- Send direct messages to other users
- Create group chats, set a group name and avatar
- Send images, voice messages, reply to messages, react with emojis
- Pin important messages in a group
- Create polls in a group chat
- Schedule a Game Night event in a group chat

**Profile & Settings**
- Edit your bio, avatar, Steam ID, Discord tag
- Set your profile to private (only followers can see your library/activity)
- View your own stats: total games, followers, following

**Notifications**
- Get notified when someone follows you, likes or comments on your activity or lists

**Yearly Challenge**
- Set a goal for how many games to complete in a year
- Track your progress on your profile

When a user asks how to do something, give clear step-by-step instructions. Keep answers short and friendly. If the user asks about something not related to using this website, politely say you can only help with GameLog.`;

router.post("/chat", aiRateLimit, optionalAuth, async (req: AuthRequest, res: Response) => {
  const parsed = ChatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { messages, rawgId } = parsed.data;

  if (!process.env.GROQ_API_KEY) {
    res.status(503).json({ error: "AI service not configured" });
    return;
  }

  // Build system prompt with optional page context
  let systemPrompt = SYSTEM_PROMPT;
  if (rawgId) {
    const game = await prisma.game.findUnique({
      where: { rawgId },
      select: { name: true },
    });
    if (game) {
      systemPrompt += `\n\nContext: The user is currently on the game detail page for "${game.name}". If relevant, you can reference this in your answers (e.g. guiding them to add it to their library from this page).`;
    }
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      stream: true,
      max_tokens: 1024,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? "";
      if (token) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
  } catch (err: any) {
    console.error("Groq error:", err?.message ?? err);
    const is429 = err?.message?.includes("429") || err?.status === 429;
    const msg = is429
      ? "Rate limit reached. Please wait a moment and try again."
      : "Failed to generate response. Please try again.";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
