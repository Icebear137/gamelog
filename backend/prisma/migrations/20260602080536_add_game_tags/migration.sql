-- CreateTable
CREATE TABLE "GameTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameTag_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameTagVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tagId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameTagVote_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "GameTag" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameTagVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GameTag_gameId_tag_key" ON "GameTag"("gameId", "tag");

-- CreateIndex
CREATE UNIQUE INDEX "GameTagVote_tagId_userId_key" ON "GameTagVote"("tagId", "userId");
