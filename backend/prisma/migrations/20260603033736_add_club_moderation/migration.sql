-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GameClub" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "gameId" TEXT,
    "genre" TEXT,
    "createdBy" TEXT NOT NULL,
    "pinnedPostId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GameClub_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameClub_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GameClub_pinnedPostId_fkey" FOREIGN KEY ("pinnedPostId") REFERENCES "GameClubPost" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GameClub" ("avatar", "createdAt", "createdBy", "description", "gameId", "genre", "id", "name", "updatedAt") SELECT "avatar", "createdAt", "createdBy", "description", "gameId", "genre", "id", "name", "updatedAt" FROM "GameClub";
DROP TABLE "GameClub";
ALTER TABLE "new_GameClub" RENAME TO "GameClub";
CREATE TABLE "new_GameClubMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameClubMember_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "GameClub" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameClubMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GameClubMember" ("clubId", "id", "joinedAt", "role", "userId") SELECT "clubId", "id", "joinedAt", "role", "userId" FROM "GameClubMember";
DROP TABLE "GameClubMember";
ALTER TABLE "new_GameClubMember" RENAME TO "GameClubMember";
CREATE UNIQUE INDEX "GameClubMember_clubId_userId_key" ON "GameClubMember"("clubId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
