-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rawgId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "coverImage" TEXT,
    "genres" TEXT NOT NULL DEFAULT '[]',
    "releaseYear" INTEGER,
    "rawgRating" REAL,
    "description" TEXT,
    "platforms" TEXT NOT NULL DEFAULT '[]',
    "developers" TEXT NOT NULL DEFAULT '[]',
    "publishers" TEXT NOT NULL DEFAULT '[]',
    "website" TEXT,
    "metacritic" INTEGER,
    "esrbRating" TEXT,
    "avgPlaytime" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Game" ("coverImage", "createdAt", "genres", "id", "name", "rawgId", "rawgRating", "releaseYear", "slug") SELECT "coverImage", "createdAt", "genres", "id", "name", "rawgId", "rawgRating", "releaseYear", "slug" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
CREATE UNIQUE INDEX "Game_rawgId_key" ON "Game"("rawgId");
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
