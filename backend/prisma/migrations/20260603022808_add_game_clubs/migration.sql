-- CreateTable
CREATE TABLE "GameClub" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "gameId" TEXT,
    "genre" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GameClub_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameClub_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameClubMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameClubMember_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "GameClub" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameClubMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameClubPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GameClubPost_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "GameClub" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameClubPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameClubComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameClubComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "GameClubPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameClubComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameClubPostLike" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameClubPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "GameClubPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameClubPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GameClubMember_clubId_userId_key" ON "GameClubMember"("clubId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GameClubPostLike_postId_userId_key" ON "GameClubPostLike"("postId", "userId");
