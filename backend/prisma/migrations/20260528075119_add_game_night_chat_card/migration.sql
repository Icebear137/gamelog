/*
  Warnings:

  - You are about to drop the column `gameName` on the `GameNight` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `GameNightRsvp` table. All the data in the column will be lost.
  - Added the required column `messageId` to the `GameNight` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `GameNight` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `GameNightRsvp` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GameNight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gameId" TEXT,
    "scheduledAt" DATETIME NOT NULL,
    "platform" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameNight_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameNight_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameNight_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GameNight_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GameNight" ("conversationId", "createdAt", "createdBy", "gameId", "id", "note", "scheduledAt") SELECT "conversationId", "createdAt", "createdBy", "gameId", "id", "note", "scheduledAt" FROM "GameNight";
DROP TABLE "GameNight";
ALTER TABLE "new_GameNight" RENAME TO "GameNight";
CREATE UNIQUE INDEX "GameNight_messageId_key" ON "GameNight"("messageId");
CREATE TABLE "new_GameNightRsvp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameNightId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GameNightRsvp_gameNightId_fkey" FOREIGN KEY ("gameNightId") REFERENCES "GameNight" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameNightRsvp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GameNightRsvp" ("gameNightId", "id", "status", "userId") SELECT "gameNightId", "id", "status", "userId" FROM "GameNightRsvp";
DROP TABLE "GameNightRsvp";
ALTER TABLE "new_GameNightRsvp" RENAME TO "GameNightRsvp";
CREATE UNIQUE INDEX "GameNightRsvp_gameNightId_userId_key" ON "GameNightRsvp"("gameNightId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
