import "dotenv/config";
import http from "http";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

import { startCronJobs } from "./lib/cron";
import { initSocket } from "./lib/socket";
import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import gamesRouter from "./routes/games";
import entriesRouter from "./routes/entries";
import feedRouter from "./routes/feed";
import activitiesRouter from "./routes/activities";
import notificationsRouter from "./routes/notifications";
import listsRouter from "./routes/lists";
import messagesRouter from "./routes/messages";
import aiRouter from "./routes/ai";
import clubsRouter from "./routes/clubs";
import uploadRouter from "./routes/upload";
import reportsRouter from "./routes/reports";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.warn("WARNING: JWT_SECRET is missing or too short. Use a random 64-char string in production.");
}

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

app.use(
  "/api/auth",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false })
);

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/games", gamesRouter);
app.use("/api/entries", entriesRouter);
app.use("/api/feed", feedRouter);
app.use("/api/activities", activitiesRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/lists", listsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/ai", aiRouter);
app.use("/api/clubs", clubsRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/reports", reportsRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = parseInt(process.env.PORT ?? "4000");
const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`GameLog backend running on http://localhost:${PORT}`);
  startCronJobs();
});
