-- CreateTable
CREATE TABLE "GameClubPostReaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameClubPostReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "GameClubPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameClubPostReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GameClubPostReaction_postId_userId_emoji_key" ON "GameClubPostReaction"("postId", "userId", "emoji");
