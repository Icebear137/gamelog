-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "bio" TEXT,
    "avatar" TEXT,
    "steamId" TEXT,
    "discordTag" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "notifFollow" BOOLEAN NOT NULL DEFAULT true,
    "notifLike" BOOLEAN NOT NULL DEFAULT true,
    "notifComment" BOOLEAN NOT NULL DEFAULT true,
    "notifMention" BOOLEAN NOT NULL DEFAULT true,
    "lastDigestAt" DATETIME,
    "lastSeen" DATETIME
);
INSERT INTO "new_User" ("avatar", "bio", "createdAt", "discordTag", "email", "emailNotifications", "id", "isPrivate", "lastDigestAt", "lastSeen", "password", "steamId", "updatedAt", "username") SELECT "avatar", "bio", "createdAt", "discordTag", "email", "emailNotifications", "id", "isPrivate", "lastDigestAt", "lastSeen", "password", "steamId", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
