-- CreateTable
CREATE TABLE "GamePlaythrough" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "playtime" INTEGER,
    "platform" TEXT,
    "completedAt" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GamePlaythrough_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GamePlaythrough_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "GameEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
