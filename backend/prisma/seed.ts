import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import axios from "axios";

const prisma = new PrismaClient();
const RAWG_KEY = process.env.RAWG_API_KEY;

const GAME_IDS = [
  326243, // Elden Ring
  3498,   // The Witcher 3: Wild Hunt
  28,     // Red Dead Redemption 2
  58175,  // God of War (2018)
  41494,  // Cyberpunk 2077
  27964,  // Hollow Knight
  278387, // Disco Elysium
  225259, // Baldur's Gate 3
  58134,  // Sekiro: Shadows Die Twice
  17519,  // Dark Souls III
  3339,   // Persona 5 Royal
  14804,  // Stardew Valley
  4200,   // Portal 2
  58577,  // Ghost of Tsushima
  3070,   // The Last of Us
  1090630,// Hades
  28992,  // Horizon Zero Dawn
  17550,  // Bloodborne
  782,    // Dark Souls
  17399,  // Divinity: Original Sin 2
  58693,  // Monster Hunter: World
  53974,  // Doom Eternal
  9928,   // Undertale
  40050,  // Dead Cells
  58855,  // Death Stranding
  8950,   // Ori and the Blind Forest
  3836,   // Grand Theft Auto V
  17000,  // The Legend of Zelda: Breath of the Wild
];

async function fetchGame(rawgId: number) {
  try {
    const res = await axios.get(`https://api.rawg.io/api/games/${rawgId}`, {
      params: { key: RAWG_KEY },
    });
    return res.data;
  } catch {
    return null;
  }
}

function extractYear(released: string | null): number | null {
  if (!released) return null;
  const y = parseInt(released.split("-")[0]);
  return isNaN(y) ? null : y;
}

async function addEntry(
  userId: string,
  gameId: string,
  status: string,
  rating: number | null,
  review: string | null,
  playtime: number | null,
  activityType: string,
  platform?: string | null
) {
  const entry = await prisma.gameEntry.create({
    data: { userId, gameId, status, rating, review, playtime, platform: platform ?? null },
  });
  const activity = await prisma.activity.create({
    data: { userId, gameEntryId: entry.id, type: activityType },
  });
  return { entry, activity };
}

function maybeEntry(
  game: any | undefined,
  userId: string,
  status: string,
  rating: number | null,
  review: string | null,
  playtime: number | null,
  activityType: string,
  platform?: string | null
) {
  if (!game) return Promise.resolve(null);
  return addEntry(userId, game.id, status, rating, review, playtime, activityType, platform);
}

async function main() {
  console.log("🗑️  Clearing database...");
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.reviewLike.deleteMany();
  await prisma.gameTagVote.deleteMany();
  await prisma.gameTag.deleteMany();
  await prisma.gameListLike.deleteMany();
  await prisma.gameListComment.deleteMany();
  // Club data
  await prisma.gameClubPostReaction.deleteMany();
  await prisma.gameClubPostLike.deleteMany();
  await prisma.gameClubComment.deleteMany();
  await prisma.gameClubPost.deleteMany();
  await prisma.gameClubMember.deleteMany();
  await prisma.gameClub.deleteMany();
  // Playthroughs
  await prisma.gamePlaythrough.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.gameListEntry.deleteMany();
  await prisma.gameList.deleteMany();
  await prisma.yearlyChallenge.deleteMany();
  await prisma.postComment.deleteMany();
  await prisma.postLike.deleteMany();
  await prisma.post.deleteMany();
  await prisma.gameEntry.deleteMany();
  await prisma.game.deleteMany();
  await prisma.user.deleteMany();
  console.log("✅ Database cleared\n");

  // ── Users ──────────────────────────────────────────────────────────
  console.log("👥 Creating users...");
  const password = await bcrypt.hash("password123", 10);

  const [vinh, sakura, loot, souls, nhan, strats, kazuki, indieQueen, rpgMaster, speedster] = await Promise.all([
    prisma.user.create({
      data: {
        username: "xvinhgaming",
        email: "vinh@example.com",
        password,
        bio: "Vietnamese gamer. Elden Ring is peak gaming. Dark Souls ruined other games for me.",
        steamId: "xvinhgaming",
        discordTag: "vinh#0001",
      },
    }),
    prisma.user.create({
      data: {
        username: "sakura_plays",
        email: "sakura@example.com",
        password,
        bio: "JRPG completionist. 100% every game I touch. Currently grinding Persona 5 confidants.",
        discordTag: "sakura#2077",
      },
    }),
    prisma.user.create({
      data: {
        username: "loot_goblin",
        email: "loot@example.com",
        password,
        bio: "Open world enjoyer. If there's loot, I'm there. 500+ hours in Stardew Valley and counting.",
        steamId: "loot_goblin_real",
      },
    }),
    prisma.user.create({
      data: {
        username: "soulsaddict",
        email: "souls@example.com",
        password,
        bio: "Git gud or go home. Platinumed every FromSoftware game. Malenia is NOT that hard.",
        steamId: "soulsaddict_real",
      },
    }),
    prisma.user.create({
      data: {
        username: "nhan_minh",
        email: "nhan@example.com",
        password,
        bio: "Indie game enthusiast. Hollow Knight changed my life. Still waiting for Silksong.",
      },
    }),
    prisma.user.create({
      data: {
        username: "pro_strats",
        email: "strats@example.com",
        password,
        bio: "Strategy & RPG enjoyer. BG3 is the greatest game of the decade. No debate.",
      },
    }),
    prisma.user.create({
      data: {
        username: "kazuki_gamer",
        email: "kazuki@example.com",
        password,
        bio: "Action game aficionado. God of War and Ghost of Tsushima are art. PS5 exclusive enjoyer.",
        discordTag: "kazuki#4488",
      },
    }),
    prisma.user.create({
      data: {
        username: "indie_queen",
        email: "indie@example.com",
        password,
        bio: "AAA games are mid, indie games are life. Hades is a 12/10. Support small devs!",
        steamId: "indie_queen_steam",
      },
    }),
    prisma.user.create({
      data: {
        username: "rpg_master",
        email: "rpgmaster@example.com",
        password,
        bio: "If it has a dialogue tree, I've played it. 4 BG3 playthroughs and counting.",
        discordTag: "rpgmaster#9999",
      },
    }),
    prisma.user.create({
      data: {
        username: "speedster_99",
        email: "speed@example.com",
        password,
        bio: "Speedrunner & challenge runner. Portal 2 any% WR holder (not really). Fast games only.",
        steamId: "speedster_99",
      },
    }),
  ]);

  const allUsers = [vinh, sakura, loot, souls, nhan, strats, kazuki, indieQueen, rpgMaster, speedster];
  console.log(`✅ ${allUsers.length} users created\n`);

  // ── Games ──────────────────────────────────────────────────────────
  console.log("🎮 Fetching games from RAWG API...");
  const rawgResults: any[] = [];
  for (const id of GAME_IDS) {
    const data = await fetchGame(id);
    if (data) {
      rawgResults.push(data);
      process.stdout.write(".");
    } else {
      process.stdout.write(`\n  ⚠️  rawgId ${id} not found, skipping\n`);
    }
  }
  console.log(`\n✅ ${rawgResults.length} games fetched\n`);

  console.log("💾 Saving games...");
  const games = await Promise.all(
    rawgResults.map((g) =>
      prisma.game.create({
        data: {
          rawgId: g.id,
          name: g.name,
          slug: g.slug,
          coverImage: g.background_image ?? null,
          genres: JSON.stringify(g.genres?.map((x: any) => x.name) ?? []),
          releaseYear: extractYear(g.released),
          rawgRating: g.rating ?? null,
        },
      })
    )
  );

  const gm = Object.fromEntries(games.map((g) => [g.rawgId, g]));
  // Core games (all used below — wrapped in ?. since RAWG may skip)
  const eldenRing    = gm[326243];
  const witcher3     = gm[3498];
  const rdr2         = gm[28];
  const godOfWar     = gm[58175];
  const cyberpunk    = gm[41494];
  const hollowKnight = gm[27964];
  const discoElysium = gm[278387];
  const bg3          = gm[225259];
  const sekiro       = gm[58134];
  const ds3          = gm[17519];
  const persona5     = gm[3339];
  const stardew      = gm[14804];
  const portal2      = gm[4200];
  const ghost        = gm[58577];
  const lastOfUs     = gm[3070];
  const hades        = gm[1090630];
  const horizon      = gm[28992];
  const bloodborne   = gm[17550];
  const ds1          = gm[782];
  const divinity2    = gm[17399];
  const mhw          = gm[58693];
  const doom         = gm[53974];
  const undertale    = gm[9928];
  const deadCells    = gm[40050];
  const deathStrand  = gm[58855];
  const ori          = gm[8950];
  const gtav         = gm[3836];
  const botw         = gm[17000];

  console.log(`✅ ${games.length} games saved\n`);

  // ── Libraries ──────────────────────────────────────────────────────
  console.log("📚 Creating game libraries...");

  // vinh — FromSoft main + Cyberpunk
  const vE = (await Promise.all([
    maybeEntry(eldenRing,   vinh.id, "COMPLETED",    10, "Masterpiece. Every boss fight is unforgettable. FromSoftware redefined open-world design with this one.", 120, "COMPLETED",  "PC"),
    maybeEntry(sekiro,      vinh.id, "COMPLETED",    9,  "The parry system is genius. Isshin is the best boss in gaming history, full stop.", 80, "COMPLETED",    "PC"),
    maybeEntry(ds3,         vinh.id, "COMPLETED",    9,  "Perfect send-off for the trilogy. Champion Gundyr is criminally underrated.", 95, "COMPLETED",         "PC"),
    maybeEntry(bloodborne,  vinh.id, "COMPLETED",    10, "The atmosphere is unmatched. Gascoigne is the best tutorial boss ever designed.", 70, "COMPLETED",        "PS5"),
    maybeEntry(ds1,         vinh.id, "COMPLETED",    9,  "Undead Burg to Anor Londo is the greatest level design sequence in any game.", 60, "COMPLETED",          "PC"),
    maybeEntry(cyberpunk,   vinh.id, "PLAYING",      null, null, 45, "STARTED",                                                                                     "PC"),
    maybeEntry(bg3,         vinh.id, "WANT_TO_PLAY", null, null, null, "ADDED_TO_WISHLIST"),
    maybeEntry(hades,       vinh.id, "COMPLETED",    9,  "Roguelite perfected. Story delivered through gameplay loops — genre defining.", 50, "COMPLETED",          "PC"),
    maybeEntry(deathStrand, vinh.id, "DROPPED",      5,  "Incredible visuals and lore but walking simulator isn't my thing. Respect the vision though.", 10, "DROPPED", "PC"),
  ])).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof addEntry>>>[];

  // sakura — JRPG queen
  const sE = (await Promise.all([
    maybeEntry(persona5,    sakura.id, "COMPLETED",    10, "Best JRPG ever made. The style, the music, the story — pure perfection. 100% all confidants.", 150, "COMPLETED",  "PS5"),
    maybeEntry(bg3,         sakura.id, "COMPLETED",    10, "Finally finished Act 3. The depth of choice is unreal. Shadowheart's arc made me cry.", 90, "COMPLETED",              "PC"),
    maybeEntry(witcher3,    sakura.id, "COMPLETED",    9,  "The side quests alone are better than most games' main stories. Bloody Baron arc is devastating.", 110, "COMPLETED", "PS5"),
    maybeEntry(godOfWar,    sakura.id, "COMPLETED",    9,  "Kratos's redemption arc made me cry twice. God of War reinvented itself perfectly.", 35, "COMPLETED",                 "PS5"),
    maybeEntry(eldenRing,   sakura.id, "DROPPED",      5,  "I tried, I really did. But the difficulty is just not for me. No shame in that.", 15, "DROPPED",                      "PS5"),
    maybeEntry(stardew,     sakura.id, "PLAYING",      null, null, 200, "STARTED",                                                                                                "Switch"),
    maybeEntry(mhw,         sakura.id, "PLAYING",      null, null, 80, "STARTED",                                                                                                 "PC"),
  ])).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof addEntry>>>[];

  // loot — Open world + chill games
  const lE = (await Promise.all([
    maybeEntry(stardew,     loot.id, "COMPLETED",    10, "520 hours and I still come back. Best relaxing game ever created. ConcernedApe is a legend.", 520, "COMPLETED", "PC"),
    maybeEntry(rdr2,        loot.id, "COMPLETED",    10, "The world is unbelievably detailed. I spent 3 hours just watching NPC routines.", 85, "COMPLETED",               "PS5"),
    maybeEntry(cyberpunk,   loot.id, "COMPLETED",    8,  "Rough launch but now it's incredible. Night City is the best open world in gaming.", 70, "COMPLETED",            "PC"),
    maybeEntry(witcher3,    loot.id, "PLAYING",      null, null, 40, "STARTED",                                                                                             "PC"),
    maybeEntry(ghost,       loot.id, "COMPLETED",    9,  "Photo mode alone is worth the price. Most visually stunning game I've played.", 55, "COMPLETED",                  "PS5"),
    maybeEntry(eldenRing,   loot.id, "PLAYING",      null, null, 25, "STARTED",                                                                                             "PS5"),
    maybeEntry(horizon,     loot.id, "COMPLETED",    8,  "Aloy's world is gorgeous. The robot dinosaurs never get old. Hunting Thunderjaws is therapeutic.", 45, "COMPLETED","PC"),
    maybeEntry(botw,        loot.id, "COMPLETED",    9,  "The first 20 hours of discovery are something I'll never forget. Woke up at 3am just to explore.", 80, "COMPLETED","Switch"),
    maybeEntry(gtav,        loot.id, "COMPLETED",    9,  "Still the king of open-world chaos. The three-protagonist system was genius.", 60, "COMPLETED",                   "PC"),
  ])).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof addEntry>>>[];

  // souls — Soulslike obsessed
  const soE = (await Promise.all([
    maybeEntry(eldenRing,   souls.id, "COMPLETED",    10, "Platinum trophy done. 200 hours. Malenia took 47 tries. Best boss FromSoftware has ever designed.", 200, "COMPLETED", "PC"),
    maybeEntry(sekiro,      souls.id, "COMPLETED",    10, "Isshin Phase 3 lightning reversal is the most satisfying moment in all of gaming.", 160, "COMPLETED",                  "PC"),
    maybeEntry(ds3,         souls.id, "COMPLETED",    9,  "Twin Princes is peak boss design. Ringed City DLC is better than most full games.", 130, "COMPLETED",                  "PC"),
    maybeEntry(hollowKnight,souls.id, "COMPLETED",    9,  "The Soulslike of indie games. Path of Pain is sadistic perfection.", 70, "COMPLETED",                                  "PC"),
    maybeEntry(bloodborne,  souls.id, "COMPLETED",    10, "Platinumed. Orphan of Kos is the hardest boss I've fought. Gascoigne hit different the first time.", 100, "COMPLETED","PS5"),
    maybeEntry(ds1,         souls.id, "COMPLETED",    9,  "Where it all started. Still the best world design in the series. Lordran is a masterpiece.", 90, "COMPLETED",          "PC"),
    maybeEntry(bg3,         souls.id, "PLAYING",      null, null, 50, "STARTED",                                                                                                   "PC"),
    maybeEntry(doom,        souls.id, "COMPLETED",    9,  "The Marauder is this game's Malenia — controversial but I love it. Ultra-nightmare cleared.", 25, "COMPLETED",          "PC"),
    maybeEntry(deathStrand, souls.id, "DROPPED",      4,  "Not for me. I get what it's going for but I need some actual gameplay in my games.", 5, "DROPPED",                      "PC"),
  ])).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof addEntry>>>[];

  // nhan — Indie specialist
  const nE = (await Promise.all([
    maybeEntry(hollowKnight,nhan.id, "COMPLETED",    10, "Team Cherry created something magical. The lore runs deeper than most AAA games. Still waiting for Silksong.", 85, "COMPLETED",  "PC"),
    maybeEntry(discoElysium,nhan.id, "COMPLETED",    10, "The most ambitious RPG I've played. Every dialogue option matters. Harry Du Bois is a masterpiece.", 25, "COMPLETED",             "PC"),
    maybeEntry(stardew,     nhan.id, "COMPLETED",    9,  "ConcernedApe built this solo. Genuinely mind-blowing how polished it is.", 300, "COMPLETED",                                     "Switch"),
    maybeEntry(portal2,     nhan.id, "COMPLETED",    10, "Still the gold standard for co-op puzzle design. Cave Johnson is an icon. GlaDOS arc is perfect.", 15, "COMPLETED",              "PC"),
    maybeEntry(undertale,   nhan.id, "COMPLETED",    10, "Toby Fox did something no one else has done. The Genocide route changed how I think about games.", 12, "COMPLETED",              "PC"),
    maybeEntry(deadCells,   nhan.id, "COMPLETED",    8,  "Boss Cells 5 is brutal but fair. The pixel art is some of the best I've seen. Beheaded is iconic.", 40, "COMPLETED",             "PC"),
    maybeEntry(ori,         nhan.id, "COMPLETED",    9,  "The most beautiful platformer ever made. The Hollow Grove sequence still gives me chills.", 8, "COMPLETED",                      "PC"),
    maybeEntry(hades,       nhan.id, "COMPLETED",    10, "Supergiant Games outdid themselves. Every run feels different. Zagreus / Meg dynamic is chef's kiss.", 100, "COMPLETED",         "PC"),
    maybeEntry(eldenRing,   nhan.id, "PLAYING",      null, null, 30, "STARTED",                                                                                                            "PC"),
    maybeEntry(bg3,         nhan.id, "WANT_TO_PLAY", null, null, null, "ADDED_TO_WISHLIST"),
  ])).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof addEntry>>>[];

  // strats — Narrative RPG connoisseur
  const stE = (await Promise.all([
    maybeEntry(bg3,         strats.id, "COMPLETED",    10, "Larian Studios delivered the RPG of the generation. 4 playthroughs and still finding new content.", 250, "COMPLETED",       "PC"),
    maybeEntry(witcher3,    strats.id, "COMPLETED",    10, "The bar for narrative RPGs. Blood and Wine DLC alone is worth the full price.", 140, "COMPLETED",                            "PC"),
    maybeEntry(rdr2,        strats.id, "COMPLETED",    9,  "Arthur Morgan is the best-written video game protagonist ever. Chapter 6 destroyed me emotionally.", 80, "COMPLETED",       "PS5"),
    maybeEntry(godOfWar,    strats.id, "COMPLETED",    9,  "The father-son dynamic carries this game into masterpiece territory.", 30, "COMPLETED",                                      "PS5"),
    maybeEntry(lastOfUs,    strats.id, "COMPLETED",    9,  "The best narrative in gaming. Clicker sounds still give me anxiety.", 15, "COMPLETED",                                       "PS5"),
    maybeEntry(discoElysium,strats.id, "COMPLETED",    10, "More game should be like this. The skill system is genius. Kim Kitsuragi best NPC of all time.", 30, "COMPLETED",            "PC"),
    maybeEntry(divinity2,   strats.id, "COMPLETED",    9,  "Before BG3 this was the gold standard for CRPGs. Fort Joy to Arx is an incredible journey.", 120, "COMPLETED",              "PC"),
    maybeEntry(persona5,    strats.id, "WANT_TO_PLAY", null, null, null, "ADDED_TO_WISHLIST"),
    maybeEntry(eldenRing,   strats.id, "WANT_TO_PLAY", null, null, null, "ADDED_TO_WISHLIST"),
  ])).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof addEntry>>>[];

  // kazuki — Action/console gamer
  const kE = (await Promise.all([
    maybeEntry(godOfWar,    kazuki.id, "COMPLETED",    10, "God of War Ragnarök is a masterpiece, but this one started it all. Kratos growth from anger to wisdom.", 40, "COMPLETED",   "PS5"),
    maybeEntry(ghost,       kazuki.id, "COMPLETED",    10, "The most beautiful game I've ever played. Dueling with the wind mechanic is pure genius.", 60, "COMPLETED",                   "PS5"),
    maybeEntry(sekiro,      kazuki.id, "PLAYING",      null, null, 20, "STARTED",                                                                                                          "PS5"),
    maybeEntry(mhw,         kazuki.id, "COMPLETED",    9,  "350 hours and I never felt bored. The Rajang fight is still the hardest thing I've done in games.", 350, "COMPLETED",        "PS5"),
    maybeEntry(lastOfUs,    kazuki.id, "COMPLETED",    10, "Best storytelling in gaming, period. Giraffes scene is the most beautiful moment in any game.", 18, "COMPLETED",              "PS5"),
    maybeEntry(doom,        kazuki.id, "COMPLETED",    8,  "The combat is incredible. Movement system is like a rhythm game. Marauder is annoying though.", 20, "COMPLETED",              "PC"),
    maybeEntry(bg3,         kazuki.id, "COMPLETED",    9,  "Didn't expect to love a CRPG this much. Astarion romance changed me as a person.", 80, "COMPLETED",                          "PC"),
    maybeEntry(rdr2,        kazuki.id, "COMPLETED",    9,  "Arthur Morgan is a beautiful, tragic character. The ending is one of the best in gaming.", 70, "COMPLETED",                  "PS5"),
    maybeEntry(persona5,    kazuki.id, "COMPLETED",    9,  "The style is unmatched. Every UI transition is art. Phantom Thieves best crew ever.", 100, "COMPLETED",                      "PS5"),
    maybeEntry(cyberpunk,   kazuki.id, "WANT_TO_PLAY", null, null, null, "ADDED_TO_WISHLIST"),
  ])).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof addEntry>>>[];

  // indieQueen — Indie evangelist
  const iE = (await Promise.all([
    maybeEntry(hades,       indieQueen.id, "COMPLETED",    10, "The best roguelike ever made. Music, art, writing, gameplay — flawless. I wept at the ending.", 120, "COMPLETED",     "PC"),
    maybeEntry(hollowKnight,indieQueen.id, "COMPLETED",    10, "Team Cherry made the perfect game. The silence and the lore together are haunting.", 90, "COMPLETED",                  "PC"),
    maybeEntry(stardew,     indieQueen.id, "COMPLETED",    10, "400 hours and I still boot it up when I need peace. Pelican Town is my home.", 400, "COMPLETED",                       "Switch"),
    maybeEntry(undertale,   indieQueen.id, "COMPLETED",    10, "My first Undertale run I went full Genocide. The Sans fight broke me. 10/10 no notes.", 10, "COMPLETED",              "PC"),
    maybeEntry(ori,         indieQueen.id, "COMPLETED",    10, "I've never cried harder at a platformer. The Ku backstory in Will of the Wisps destroyed me.", 9, "COMPLETED",        "PC"),
    maybeEntry(deadCells,   indieQueen.id, "PLAYING",      null, null, 60, "STARTED",                                                                                                  "PC"),
    maybeEntry(portal2,     indieQueen.id, "COMPLETED",    9,  "Perfect game design. Every puzzle teaches you a new mechanic organically. Cave Johnson > GLaDOS.", 14, "COMPLETED",   "PC"),
    maybeEntry(discoElysium,indieQueen.id, "WANT_TO_PLAY", null, null, null, "ADDED_TO_WISHLIST"),
    maybeEntry(bg3,         indieQueen.id, "PLAYING",      null, null, 30, "STARTED",                                                                                                  "PC"),
  ])).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof addEntry>>>[];

  // rpgMaster — CRPG/RPG expert
  const rE = (await Promise.all([
    maybeEntry(persona5,    rpgMaster.id, "COMPLETED",    10, "180 hours. True ending achieved. Every Social Link maxed. Persona 5 is life.", 180, "COMPLETED",                        "PS5"),
    maybeEntry(bg3,         rpgMaster.id, "COMPLETED",    10, "My 4th playthrough is an evil Durge Paladin. I keep finding new content. GOTY forever.", 200, "COMPLETED",              "PC"),
    maybeEntry(witcher3,    rpgMaster.id, "COMPLETED",    10, "Blood and Wine is a perfect farewell to Geralt. Still the best open-world RPG ever made.", 160, "COMPLETED",            "PC"),
    maybeEntry(discoElysium,rpgMaster.id, "COMPLETED",    9,  "Zaum's use of language is extraordinary. Every skill check feels meaningful. Art Cop run recommended.", 28, "COMPLETED","PC"),
    maybeEntry(divinity2,   rpgMaster.id, "PLAYING",      null, null, 80, "STARTED",                                                                                                   "PC"),
    maybeEntry(eldenRing,   rpgMaster.id, "COMPLETED",    8,  "Great game but not my preferred style. Ranni's questline is brilliant world-building.", 90, "COMPLETED",                "PS5"),
    maybeEntry(rdr2,        rpgMaster.id, "COMPLETED",    9,  "The epilogue made me sob like a baby. Rockstar peaked here, nothing will top it.", 90, "COMPLETED",                    "Xbox Series X|S"),
    maybeEntry(ds3,         rpgMaster.id, "WANT_TO_PLAY", null, null, null, "ADDED_TO_WISHLIST"),
    maybeEntry(stardew,     rpgMaster.id, "COMPLETED",    9,  "A masterwork of relaxation game design. Everything in Pelican Town has purpose.", 200, "COMPLETED",                     "PC"),
    maybeEntry(godOfWar,    rpgMaster.id, "COMPLETED",    9,  "Every conversation between Kratos and Atreus is pure gold. Show, don't tell, done perfectly.", 35, "COMPLETED",        "PS5"),
  ])).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof addEntry>>>[];

  // speedster — Speedrunner
  const spE = (await Promise.all([
    maybeEntry(portal2,     speedster.id, "COMPLETED",    10, "Finished my 50th Portal 2 run last night. The movement tech in this game is boundless.", 20, "COMPLETED",       "PC"),
    maybeEntry(hollowKnight,speedster.id, "COMPLETED",    9,  "NMG Any% in 1:12:34 on my PB. Pure Vessel hitbox is frame perfect insanity.", 60, "COMPLETED",                   "PC"),
    maybeEntry(sekiro,      speedster.id, "COMPLETED",    8,  "All bosses run is brutal but fair. Emma skip is the most satisfying tech I've ever learned.", 40, "COMPLETED",   "PC"),
    maybeEntry(hades,       speedster.id, "COMPLETED",    9,  "Heat 32 cleared. BiS build optimization is like a puzzle game on top of the main game.", 150, "COMPLETED",     "PC"),
    maybeEntry(doom,        speedster.id, "COMPLETED",    10, "Ultra-nightmare done. Movement is a language this game speaks fluently.", 18, "COMPLETED",                       "PC"),
    maybeEntry(deadCells,   speedster.id, "COMPLETED",    9,  "Boss Cells 5 cleared. 5BC Any% speedrun scene is wild. This game respects your time.", 80, "COMPLETED",        "PC"),
    maybeEntry(ori,         speedster.id, "COMPLETED",    9,  "Blind Wells is the hardest platformer section I've ever played. Speed-run routing is elegant.", 6, "COMPLETED", "PC"),
    maybeEntry(eldenRing,   speedster.id, "PLAYING",      null, null, 40, "STARTED",                                                                                           "PC"),
    maybeEntry(stardew,     speedster.id, "WANT_TO_PLAY", null, null, null, "ADDED_TO_WISHLIST"),
    maybeEntry(bg3,         speedster.id, "WANT_TO_PLAY", null, null, null, "ADDED_TO_WISHLIST"),
  ])).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof addEntry>>>[];

  console.log("✅ Libraries created\n");

  // ── Follows ────────────────────────────────────────────────────────
  console.log("🤝 Creating follow relationships...");
  const followPairs: [string, string][] = [
    [vinh.id,       souls.id],
    [vinh.id,       nhan.id],
    [vinh.id,       strats.id],
    [vinh.id,       kazuki.id],
    [vinh.id,       speedster.id],
    [sakura.id,     vinh.id],
    [sakura.id,     loot.id],
    [sakura.id,     nhan.id],
    [sakura.id,     rpgMaster.id],
    [sakura.id,     kazuki.id],
    [loot.id,       vinh.id],
    [loot.id,       sakura.id],
    [loot.id,       souls.id],
    [loot.id,       nhan.id],
    [loot.id,       rpgMaster.id],
    [souls.id,      vinh.id],
    [souls.id,      strats.id],
    [souls.id,      kazuki.id],
    [souls.id,      speedster.id],
    [nhan.id,       sakura.id],
    [nhan.id,       loot.id],
    [nhan.id,       indieQueen.id],
    [nhan.id,       speedster.id],
    [strats.id,     vinh.id],
    [strats.id,     sakura.id],
    [strats.id,     souls.id],
    [strats.id,     rpgMaster.id],
    [kazuki.id,     vinh.id],
    [kazuki.id,     souls.id],
    [kazuki.id,     loot.id],
    [indieQueen.id, nhan.id],
    [indieQueen.id, sakura.id],
    [indieQueen.id, speedster.id],
    [rpgMaster.id,  strats.id],
    [rpgMaster.id,  sakura.id],
    [rpgMaster.id,  vinh.id],
    [speedster.id,  nhan.id],
    [speedster.id,  souls.id],
    [speedster.id,  indieQueen.id],
  ];

  await Promise.all(
    followPairs.map(([fId, gId]) => fId !== gId
      ? prisma.follow.create({ data: { followerId: fId, followingId: gId } }).catch(() => {})
      : Promise.resolve()
    )
  );
  console.log("✅ Follows created\n");

  // ── Likes ──────────────────────────────────────────────────────────
  console.log("❤️  Creating likes...");

  // Safe helpers — silently skip if activityId is undefined (game not fetched)
  function likesFor(activityId: string | undefined, userIds: string[]) {
    if (!activityId) return [] as Promise<unknown>[];
    return userIds.map((uid) =>
      prisma.like.create({ data: { userId: uid, activityId } }).catch(() => null)
    );
  }

  const c = (userId: string, activityId: string | undefined, body: string): Promise<unknown> => {
    if (!activityId) return Promise.resolve(null);
    return prisma.comment.create({ data: { userId, activityId, body } }).catch(() => null);
  };

  await Promise.all([
    // vinh's Elden Ring completion — popular post
    ...likesFor(vE[0]?.activity.id, [souls.id, nhan.id, loot.id, strats.id, kazuki.id, rpgMaster.id]),
    // vinh's Bloodborne
    ...likesFor(vE[3]?.activity.id, [souls.id, speedster.id, kazuki.id]),
    // vinh's Sekiro
    ...likesFor(vE[1]?.activity.id, [nhan.id, loot.id, kazuki.id, souls.id]),
    // soulsaddict Elden Ring platinum — very popular
    ...likesFor(soE[0]?.activity.id, [vinh.id, nhan.id, loot.id, strats.id, kazuki.id, speedster.id, rpgMaster.id]),
    // soulsaddict Bloodborne
    ...likesFor(soE[4]?.activity.id, [vinh.id, kazuki.id, speedster.id]),
    // nhan's Hollow Knight
    ...likesFor(nE[0]?.activity.id, [vinh.id, loot.id, indieQueen.id, speedster.id, sakura.id]),
    // nhan's Disco Elysium
    ...likesFor(nE[1]?.activity.id, [vinh.id, souls.id, sakura.id, strats.id, rpgMaster.id]),
    // nhan's Hades
    ...likesFor(nE[7]?.activity.id, [indieQueen.id, speedster.id, sakura.id]),
    // sakura's Persona 5
    ...likesFor(sE[0]?.activity.id, [vinh.id, nhan.id, loot.id, kazuki.id, rpgMaster.id]),
    // sakura's BG3
    ...likesFor(sE[1]?.activity.id, [strats.id, rpgMaster.id, nhan.id]),
    // sakura's Elden Ring drop
    ...likesFor(sE[4]?.activity.id, [vinh.id, souls.id]),
    // strats' BG3 — huge post
    ...likesFor(stE[0]?.activity.id, [vinh.id, sakura.id, souls.id, nhan.id, rpgMaster.id, kazuki.id]),
    // strats' Disco Elysium
    ...likesFor(stE[5]?.activity.id, [nhan.id, rpgMaster.id, indieQueen.id]),
    // loot's Stardew
    ...likesFor(lE[0]?.activity.id, [nhan.id, sakura.id, indieQueen.id, rpgMaster.id]),
    // loot's RDR2
    ...likesFor(lE[1]?.activity.id, [vinh.id, souls.id, strats.id, kazuki.id]),
    // kazuki's God of War
    ...likesFor(kE[0]?.activity.id, [sakura.id, loot.id, strats.id, rpgMaster.id]),
    // kazuki's Ghost of Tsushima
    ...likesFor(kE[1]?.activity.id, [loot.id, sakura.id, vinh.id]),
    // kazuki's MHW
    ...likesFor(kE[3]?.activity.id, [souls.id, speedster.id]),
    // indieQueen's Hades
    ...likesFor(iE[0]?.activity.id, [nhan.id, speedster.id, sakura.id, loot.id]),
    // indieQueen's Hollow Knight
    ...likesFor(iE[1]?.activity.id, [nhan.id, souls.id, speedster.id]),
    // indieQueen's Undertale
    ...likesFor(iE[3]?.activity.id, [nhan.id, speedster.id, sakura.id]),
    // rpgMaster's BG3
    ...likesFor(rE[1]?.activity.id, [strats.id, sakura.id, nhan.id, loot.id]),
    // rpgMaster's Witcher 3
    ...likesFor(rE[2]?.activity.id, [strats.id, loot.id, sakura.id]),
    // speedster's Portal 2
    ...likesFor(spE[0]?.activity.id, [nhan.id, indieQueen.id, souls.id]),
    // speedster's Hollow Knight speedrun
    ...likesFor(spE[1]?.activity.id, [souls.id, nhan.id, indieQueen.id]),
  ].flat().filter(Boolean));
  console.log("✅ Likes created\n");

  // ── Comments ───────────────────────────────────────────────────────
  console.log("💬 Creating comments...");
  await Promise.allSettled([
    // On vinh's Elden Ring
    c(souls.id,      vE[0]?.activity.id, "Finally! Welcome to the club 🏆 How many tries did Malenia take you?"),
    c(nhan.id,       vE[0]?.activity.id, "10/10 is exactly right. Elden Ring is a generational achievement."),
    c(loot.id,       vE[0]?.activity.id, "I still need to finish this... been stuck on Radahn for a week 😭"),
    c(kazuki.id,     vE[0]?.activity.id, "Bloodborne next if you haven't already. You'll love it."),
    // On soulsaddict's Elden Ring
    c(vinh.id,       soE[0]?.activity.id, "200 hours!! I thought my 120 was a lot. Mad respect for the platinum grind."),
    c(nhan.id,       soE[0]?.activity.id, "Malenia took me 47 tries too! Did you use the bleed build or pure skill?"),
    c(kazuki.id,     soE[0]?.activity.id, "Legend. I rage quit after my first Malenia attempt."),
    // On nhan's Disco Elysium
    c(loot.id,       nE[1]?.activity.id, "Harry Du Bois is one of the best characters ever written. The Kim bromance is unreal."),
    c(vinh.id,       nE[1]?.activity.id, "I need to play this. Heard it's basically a playable novel?"),
    c(strats.id,     nE[1]?.activity.id, "Did you go Art Cop or Sensitive Cop? Those are the only valid builds."),
    c(rpgMaster.id,  nE[1]?.activity.id, "Still the most original RPG ever made. Nothing comes close to its writing."),
    // On sakura's Persona 5
    c(strats.id,     sE[0]?.activity.id, "Just started Persona 5. Does Royal add a lot over the base game?"),
    c(nhan.id,       sE[0]?.activity.id, "Royal is essential. New semester + Kasumi + better ending. Just play Royal."),
    c(kazuki.id,     sE[0]?.activity.id, "The music alone deserves 10/10. Beneath the Mask is my alarm clock."),
    // On strats' BG3
    c(sakura.id,     stE[0]?.activity.id, "4 playthroughs!! I'm on my second and still finding new dialogue every session 😭"),
    c(rpgMaster.id,  stE[0]?.activity.id, "Fellow 4-run veteran here. Try evil Durge Paladin next, it's unhinged."),
    c(nhan.id,       stE[0]?.activity.id, "Shadowheart's arc is the best character writing I've seen in years."),
    // On sakura's Elden Ring drop
    c(vinh.id,       sE[4]?.activity.id, "Completely valid. Fromsoft games aren't for everyone. No shame at all 👍"),
    c(souls.id,      sE[4]?.activity.id, "Have you tried Sekiro? Honestly more approachable once it clicks."),
    // On loot's Stardew
    c(nhan.id,       lE[0]?.activity.id, "520 hours 😂 I thought my 300 was unhinged. We are NOT the same."),
    c(indieQueen.id, lE[0]?.activity.id, "Fellow 400+ hour Stardew veteran reporting in. Pierre is a menace and I love him."),
    // On kazuki's God of War
    c(sakura.id,     kE[0]?.activity.id, "The Leviathan Axe is the most satisfying weapon in any action game."),
    c(strats.id,     kE[0]?.activity.id, "Freya's whole arc across both games is incredible storytelling."),
    // On kazuki's Ghost of Tsushima
    c(loot.id,       kE[1]?.activity.id, "Photo mode in this game is an art studio. I have 200+ screenshots."),
    // On indieQueen's Hades
    c(nhan.id,       iE[0]?.activity.id, "Meg / Zagreus arc is the best romance in any game. Change my mind."),
    c(speedster.id,  iE[0]?.activity.id, "The Heat 32 grind is where it really gets wild. Current PB is 14:22."),
    // On speedster's Portal 2
    c(nhan.id,       spE[0]?.activity.id, "50 runs!! What's your any% PB?"),
    c(indieQueen.id, spE[0]?.activity.id, "Still the best co-op experience ever made. Nothing has beaten it."),
    // On rpgMaster's BG3
    c(strats.id,     rE[1]?.activity.id, "Fellow 4-runner! What's your current playthrough class/race?"),
    c(sakura.id,     rE[1]?.activity.id, "I'm only on my first playthrough. Does it stay fresh on repeat runs?"),
    c(rpgMaster.id,  rE[1]?.activity.id, "@sakura_plays Every run is completely different. Totally different quests unlock based on your character."),
  ]);
  console.log("✅ Comments created\n");

  // ── Review Helpful Votes ───────────────────────────────────────────
  console.log("👍 Creating review helpful votes...");

  function rl(entryId: string | undefined, userIds: string[]) {
    if (!entryId) return [] as Promise<unknown>[];
    return userIds.map((uid) =>
      prisma.reviewLike.create({ data: { userId: uid, entryId } }).catch(() => null)
    );
  }

  await Promise.all([
    // vinh's reviews — well-written Soulslike takes
    ...rl(vE[0]?.entry.id, [souls.id, nhan.id, kazuki.id, speedster.id]),   // Elden Ring
    ...rl(vE[1]?.entry.id, [souls.id, kazuki.id, speedster.id]),             // Sekiro
    ...rl(vE[3]?.entry.id, [souls.id, nhan.id, kazuki.id]),                  // Bloodborne
    ...rl(vE[2]?.entry.id, [souls.id, speedster.id]),                        // DS3
    ...rl(vE[7]?.entry.id, [nhan.id, indieQueen.id, speedster.id]),          // Hades
    // soulsaddict — platinum veteran reviews
    ...rl(soE[0]?.entry.id, [vinh.id, nhan.id, kazuki.id, speedster.id, strats.id]), // Elden Ring
    ...rl(soE[1]?.entry.id, [vinh.id, kazuki.id, speedster.id, nhan.id]),   // Sekiro
    ...rl(soE[4]?.entry.id, [vinh.id, kazuki.id, nhan.id]),                 // Bloodborne
    ...rl(soE[7]?.entry.id, [vinh.id, speedster.id]),                       // Doom Eternal
    // sakura — JRPG depth
    ...rl(sE[0]?.entry.id, [kazuki.id, rpgMaster.id, strats.id, loot.id]),  // Persona 5
    ...rl(sE[1]?.entry.id, [strats.id, rpgMaster.id, nhan.id]),             // BG3
    ...rl(sE[2]?.entry.id, [strats.id, loot.id, rpgMaster.id]),             // Witcher 3
    // loot — open world expertise
    ...rl(lE[0]?.entry.id, [nhan.id, sakura.id, indieQueen.id]),            // Stardew
    ...rl(lE[1]?.entry.id, [vinh.id, strats.id, kazuki.id, rpgMaster.id]),  // RDR2
    ...rl(lE[6]?.entry.id, [kazuki.id, sakura.id]),                          // Horizon
    ...rl(lE[7]?.entry.id, [loot.id === loot.id ? strats.id : "", speedster.id]), // BotW
    // nhan — indie authority
    ...rl(nE[0]?.entry.id, [indieQueen.id, speedster.id, vinh.id, loot.id, souls.id]), // Hollow Knight
    ...rl(nE[1]?.entry.id, [strats.id, rpgMaster.id, vinh.id, souls.id]),   // Disco Elysium
    ...rl(nE[4]?.entry.id, [indieQueen.id, speedster.id, loot.id]),         // Undertale
    ...rl(nE[7]?.entry.id, [indieQueen.id, speedster.id, sakura.id]),        // Hades
    // strats — narrative RPG gospel
    ...rl(stE[0]?.entry.id, [sakura.id, rpgMaster.id, nhan.id, kazuki.id]), // BG3
    ...rl(stE[1]?.entry.id, [loot.id, rpgMaster.id, sakura.id, kazuki.id]), // Witcher 3
    ...rl(stE[5]?.entry.id, [nhan.id, rpgMaster.id, indieQueen.id]),        // Disco Elysium
    ...rl(stE[4]?.entry.id, [kazuki.id, rpgMaster.id, sakura.id]),          // Last of Us
    // kazuki — action/console champion
    ...rl(kE[0]?.entry.id, [sakura.id, strats.id, loot.id, rpgMaster.id]),  // God of War
    ...rl(kE[1]?.entry.id, [loot.id, sakura.id, vinh.id]),                  // Ghost of Tsushima
    ...rl(kE[3]?.entry.id, [souls.id, speedster.id, vinh.id]),              // MHW
    ...rl(kE[4]?.entry.id, [strats.id, rpgMaster.id, sakura.id]),           // Last of Us
    // indieQueen — indie credentials
    ...rl(iE[0]?.entry.id, [nhan.id, speedster.id, sakura.id, loot.id]),    // Hades
    ...rl(iE[1]?.entry.id, [nhan.id, souls.id, speedster.id, vinh.id]),     // Hollow Knight
    ...rl(iE[2]?.entry.id, [nhan.id, sakura.id, loot.id]),                  // Stardew
    ...rl(iE[4]?.entry.id, [nhan.id, speedster.id, sakura.id]),             // Undertale
    // rpgMaster — CRPG deep dives
    ...rl(rE[0]?.entry.id, [sakura.id, kazuki.id, strats.id]),              // Persona 5
    ...rl(rE[1]?.entry.id, [strats.id, sakura.id, nhan.id, loot.id]),       // BG3
    ...rl(rE[2]?.entry.id, [strats.id, loot.id, sakura.id, kazuki.id]),     // Witcher 3
    // speedster — speedrun perspective
    ...rl(spE[0]?.entry.id, [nhan.id, indieQueen.id, souls.id]),            // Portal 2
    ...rl(spE[1]?.entry.id, [souls.id, nhan.id, indieQueen.id]),            // Hollow Knight
    ...rl(spE[3]?.entry.id, [nhan.id, indieQueen.id, vinh.id]),             // Hades
  ].flat().filter(Boolean));
  console.log("✅ Review helpful votes created\n");

  // ── Game Tags ─────────────────────────────────────────────────────
  console.log("🏷️  Creating game tags...");

  async function createTag(game: any, tag: string, voterIds: string[]) {
    if (!game) return;
    const gt = await prisma.gameTag.upsert({
      where: { gameId_tag: { gameId: game.id, tag } },
      create: { gameId: game.id, tag },
      update: {},
    });
    for (const uid of voterIds) {
      await prisma.gameTagVote.upsert({
        where: { tagId_userId: { tagId: gt.id, userId: uid } },
        create: { tagId: gt.id, userId: uid },
        update: {},
      }).catch(() => {});
    }
  }

  const allU = [vinh, sakura, loot, souls, nhan, strats, kazuki, indieQueen, rpgMaster, speedster];

  await Promise.all([
    // Elden Ring
    createTag(eldenRing,    "difficult",      [vinh.id, souls.id, nhan.id, kazuki.id, speedster.id]),
    createTag(eldenRing,    "open-world",     [vinh.id, loot.id, strats.id, rpgMaster.id]),
    createTag(eldenRing,    "atmospheric",    [vinh.id, souls.id, nhan.id]),
    createTag(eldenRing,    "action",         [souls.id, kazuki.id, speedster.id]),

    // Sekiro
    createTag(sekiro,       "difficult",      [vinh.id, souls.id, speedster.id, kazuki.id]),
    createTag(sekiro,       "action",         [vinh.id, kazuki.id, souls.id]),
    createTag(sekiro,       "short",          [speedster.id, souls.id]),

    // Bloodborne
    createTag(bloodborne,   "difficult",      [vinh.id, souls.id, kazuki.id]),
    createTag(bloodborne,   "atmospheric",    [vinh.id, souls.id, nhan.id, strats.id]),
    createTag(bloodborne,   "horror",         [souls.id, nhan.id, kazuki.id]),

    // BG3
    createTag(bg3,          "story-rich",     [sakura.id, strats.id, rpgMaster.id, nhan.id, kazuki.id]),
    createTag(bg3,          "rpg",            [strats.id, rpgMaster.id, sakura.id, loot.id]),
    createTag(bg3,          "co-op",          [strats.id, nhan.id, indieQueen.id]),
    createTag(bg3,          "long",           [strats.id, rpgMaster.id, sakura.id]),

    // Witcher 3
    createTag(witcher3,     "open-world",     [sakura.id, loot.id, strats.id, rpgMaster.id]),
    createTag(witcher3,     "story-rich",     [sakura.id, strats.id, rpgMaster.id, loot.id]),
    createTag(witcher3,     "rpg",            [strats.id, rpgMaster.id, sakura.id]),
    createTag(witcher3,     "long",           [rpgMaster.id, strats.id, loot.id]),

    // Persona 5
    createTag(persona5,     "story-rich",     [sakura.id, kazuki.id, rpgMaster.id, strats.id]),
    createTag(persona5,     "rpg",            [sakura.id, rpgMaster.id, strats.id]),
    createTag(persona5,     "long",           [sakura.id, rpgMaster.id, kazuki.id]),
    createTag(persona5,     "atmospheric",    [sakura.id, kazuki.id, nhan.id]),

    // Hades
    createTag(hades,        "roguelike",      [nhan.id, indieQueen.id, speedster.id, vinh.id]),
    createTag(hades,        "story-rich",     [nhan.id, indieQueen.id, strats.id]),
    createTag(hades,        "action",         [nhan.id, speedster.id, vinh.id]),

    // Hollow Knight
    createTag(hollowKnight, "difficult",      [nhan.id, souls.id, speedster.id, indieQueen.id]),
    createTag(hollowKnight, "atmospheric",    [nhan.id, indieQueen.id, vinh.id]),
    createTag(hollowKnight, "platformer",     [nhan.id, indieQueen.id, speedster.id]),

    // Stardew Valley
    createTag(stardew,      "relaxing",       [loot.id, nhan.id, sakura.id, indieQueen.id, rpgMaster.id]),
    createTag(stardew,      "sandbox",        [loot.id, rpgMaster.id, indieQueen.id]),
    createTag(stardew,      "long",           [loot.id, nhan.id, sakura.id]),

    // RDR2
    createTag(rdr2,         "open-world",     [loot.id, strats.id, kazuki.id, rpgMaster.id]),
    createTag(rdr2,         "story-rich",     [loot.id, strats.id, kazuki.id, rpgMaster.id]),
    createTag(rdr2,         "atmospheric",    [strats.id, kazuki.id, rpgMaster.id]),

    // God of War
    createTag(godOfWar,     "story-rich",     [sakura.id, kazuki.id, strats.id, rpgMaster.id]),
    createTag(godOfWar,     "action",         [kazuki.id, vinh.id, souls.id]),
    createTag(godOfWar,     "emotional",      [sakura.id, strats.id, rpgMaster.id]),

    // Ghost of Tsushima
    createTag(ghost,        "open-world",     [loot.id, kazuki.id]),
    createTag(ghost,        "atmospheric",    [kazuki.id, loot.id, vinh.id]),
    createTag(ghost,        "action",         [kazuki.id, loot.id]),

    // Portal 2
    createTag(portal2,      "puzzle",         [nhan.id, indieQueen.id, speedster.id]),
    createTag(portal2,      "co-op",          [nhan.id, indieQueen.id, speedster.id]),
    createTag(portal2,      "funny",          [nhan.id, speedster.id]),
    createTag(portal2,      "short",          [speedster.id, nhan.id, indieQueen.id]),

    // Undertale
    createTag(undertale,    "story-rich",     [nhan.id, indieQueen.id, sakura.id]),
    createTag(undertale,    "emotional",      [nhan.id, indieQueen.id]),
    createTag(undertale,    "short",          [nhan.id, speedster.id, indieQueen.id]),
    createTag(undertale,    "funny",          [nhan.id, indieQueen.id]),

    // Dead Cells
    createTag(deadCells,    "roguelike",      [nhan.id, indieQueen.id, speedster.id]),
    createTag(deadCells,    "difficult",      [nhan.id, speedster.id]),
    createTag(deadCells,    "action",         [speedster.id, nhan.id]),

    // Disco Elysium
    createTag(discoElysium, "story-rich",     [nhan.id, strats.id, rpgMaster.id, indieQueen.id]),
    createTag(discoElysium, "rpg",            [strats.id, rpgMaster.id, nhan.id]),
    createTag(discoElysium, "atmospheric",    [nhan.id, strats.id]),

    // Ori
    createTag(ori,          "platformer",     [nhan.id, indieQueen.id, speedster.id]),
    createTag(ori,          "emotional",      [nhan.id, indieQueen.id]),
    createTag(ori,          "atmospheric",    [nhan.id, indieQueen.id]),
    createTag(ori,          "short",          [speedster.id, nhan.id]),

    // Doom Eternal
    createTag(doom,         "action",         [souls.id, kazuki.id, speedster.id]),
    createTag(doom,         "difficult",      [souls.id, speedster.id]),

    // Cyberpunk 2077
    createTag(cyberpunk,    "open-world",     [loot.id, vinh.id]),
    createTag(cyberpunk,    "story-rich",     [loot.id, strats.id]),
    createTag(cyberpunk,    "atmospheric",    [loot.id, vinh.id]),

    // Last of Us
    createTag(lastOfUs,     "story-rich",     [strats.id, kazuki.id, rpgMaster.id]),
    createTag(lastOfUs,     "emotional",      [strats.id, kazuki.id]),
    createTag(lastOfUs,     "horror",         [kazuki.id, strats.id]),

    // Divinity 2
    createTag(divinity2,    "rpg",            [strats.id, rpgMaster.id]),
    createTag(divinity2,    "story-rich",     [strats.id, rpgMaster.id]),
    createTag(divinity2,    "co-op",          [strats.id]),
    createTag(divinity2,    "long",           [strats.id, rpgMaster.id]),
  ].filter(Boolean));

  console.log("✅ Game tags created\n");

  // ── Yearly Challenges ──────────────────────────────────────────────
  console.log("🏆 Creating yearly challenges...");
  const year = new Date().getFullYear();
  await Promise.all([
    prisma.yearlyChallenge.create({ data: { userId: vinh.id,       year, goal: 10  } }),
    prisma.yearlyChallenge.create({ data: { userId: sakura.id,     year, goal: 12  } }),
    prisma.yearlyChallenge.create({ data: { userId: loot.id,       year, goal: 8   } }),
    prisma.yearlyChallenge.create({ data: { userId: souls.id,      year, goal: 12  } }),
    prisma.yearlyChallenge.create({ data: { userId: nhan.id,       year, goal: 20  } }),
    prisma.yearlyChallenge.create({ data: { userId: strats.id,     year, goal: 5   } }),
    prisma.yearlyChallenge.create({ data: { userId: kazuki.id,     year, goal: 10  } }),
    prisma.yearlyChallenge.create({ data: { userId: indieQueen.id, year, goal: 15  } }),
    prisma.yearlyChallenge.create({ data: { userId: rpgMaster.id,  year, goal: 8   } }),
    prisma.yearlyChallenge.create({ data: { userId: speedster.id,  year, goal: 15  } }),
  ]);
  console.log("✅ Yearly challenges created\n");

  // ── Game Lists ─────────────────────────────────────────────────────
  console.log("📋 Creating game lists...");

  async function createList(
    userId: string,
    name: string,
    description: string,
    isPublic: boolean,
    gameInternalIds: string[]
  ) {
    const list = await prisma.gameList.create({
      data: { userId, name, description, isPublic },
    });
    for (const gameId of gameInternalIds.filter(Boolean)) {
      await prisma.gameListEntry.create({ data: { listId: list.id, gameId } }).catch(() => {});
    }
    return list;
  }

  await Promise.all([
    // vinh
    createList(vinh.id, "FromSoftware Hall of Fame", "Every FromSoftware game ranked — the best game studio alive.", true,
      [eldenRing, sekiro, ds3, bloodborne, ds1].filter(Boolean).map((g) => g!.id)),
    createList(vinh.id, "Currently Playing", "Games I'm actively grinding right now.", false,
      [cyberpunk].filter(Boolean).map((g) => g!.id)),

    // sakura
    createList(sakura.id, "Top JRPGs of All Time", "A curated list for anyone getting into JRPGs. Start here.", true,
      [persona5, witcher3].filter(Boolean).map((g) => g!.id)),
    createList(sakura.id, "Comfort Games 🌸", "Games I return to when life gets rough.", true,
      [stardew, persona5, godOfWar].filter(Boolean).map((g) => g!.id)),
    createList(sakura.id, "Backlog of Shame", "Games I own but haven't touched yet.", false,
      [eldenRing].filter(Boolean).map((g) => g!.id)),

    // loot
    createList(loot.id, "Open World Masterclasses", "The best open worlds in gaming — immersion guaranteed.", true,
      [rdr2, witcher3, ghost, horizon, botw, gtav, cyberpunk].filter(Boolean).map((g) => g!.id)),

    // souls
    createList(souls.id, "The Souls Collection 💀", "Every Soulslike worth playing. No hand-holding allowed.", true,
      [eldenRing, sekiro, ds3, bloodborne, ds1, hollowKnight].filter(Boolean).map((g) => g!.id)),
    createList(souls.id, "Games That Made Me Rage Quit (then come back)", "A complicated relationship.", true,
      [eldenRing, sekiro, bloodborne].filter(Boolean).map((g) => g!.id)),

    // nhan
    createList(nhan.id, "Must-Play Indie Games 🎮", "Indie games that punch above AAA weight. Support small devs!", true,
      [hollowKnight, discoElysium, stardew, portal2, undertale, deadCells, ori, hades].filter(Boolean).map((g) => g!.id)),
    createList(nhan.id, "Games I Recommend to Everyone", "Show these to people who say games aren't art.", true,
      [hollowKnight, discoElysium, hades, portal2, undertale].filter(Boolean).map((g) => g!.id)),

    // strats
    createList(strats.id, "The RPG Canon", "If you want to understand RPGs, play these in order.", true,
      [bg3, witcher3, discoElysium, divinity2, persona5].filter(Boolean).map((g) => g!.id)),

    // kazuki
    createList(kazuki.id, "PlayStation Exclusives — Ranked", "The reason to own a PlayStation.", true,
      [godOfWar, ghost, lastOfUs, bloodborne, persona5].filter(Boolean).map((g) => g!.id)),

    // indieQueen
    createList(indieQueen.id, "Games That Made Me Cry 😭", "Bring tissues. All of these wrecked me.", true,
      [hades, hollowKnight, ori, undertale, stardew].filter(Boolean).map((g) => g!.id)),
    createList(indieQueen.id, "Best Soundtracks in Gaming", "Games where the music IS the experience.", true,
      [hades, undertale, hollowKnight, persona5].filter(Boolean).map((g) => g!.id)),

    // rpgMaster
    createList(rpgMaster.id, "For First-Time RPG Players", "Where to start if you've never played an RPG.", true,
      [persona5, bg3, witcher3, stardew].filter(Boolean).map((g) => g!.id)),

    // speedster
    createList(speedster.id, "Best Games for Speedrunning", "Games with deep movement tech and active communities.", true,
      [portal2, hollowKnight, hades, deadCells, ori].filter(Boolean).map((g) => g!.id)),
  ]);
  console.log("✅ Game lists created\n");

  // ── Game Clubs ─────────────────────────────────────────────────────
  console.log("🎯 Creating game clubs...");

  const post = (body: string) => `<p>${body}</p>`;
  const rich = (body: string) => body; // already HTML

  // Helper to create club + members + posts + reactions
  async function createClub(
    creatorId: string,
    name: string,
    description: string,
    genre: string,
    memberIds: string[],
    posts: { userId: string; body: string; likeIds: string[]; reactions: { emoji: string; userId: string }[]; comments: { userId: string; body: string }[] }[],
  ) {
    const club = await prisma.gameClub.create({
      data: {
        name, description, genre,
        createdBy: creatorId,
        members: {
          create: [
            { userId: creatorId, role: "admin" },
            ...memberIds.filter((id) => id !== creatorId).map((id) => ({ userId: id, role: "member" })),
          ],
        },
      },
    });

    for (const p of posts) {
      const clubPost = await prisma.gameClubPost.create({
        data: { clubId: club.id, userId: p.userId, body: p.body },
      });
      for (const uid of p.likeIds) {
        await prisma.gameClubPostLike.create({ data: { postId: clubPost.id, userId: uid } }).catch(() => {});
      }
      for (const r of p.reactions) {
        await prisma.gameClubPostReaction.create({ data: { postId: clubPost.id, emoji: r.emoji, userId: r.userId } }).catch(() => {});
      }
      for (const c of p.comments) {
        await prisma.gameClubComment.create({ data: { postId: clubPost.id, userId: c.userId, body: c.body } }).catch(() => {});
      }
    }
    return club;
  }

  // 1. Souls & Soulslike — vinh creates
  await createClub(
    vinh.id, "Souls & Soulslike", "The hardest games deserve the toughest community. Discuss FromSoftware and all soulslike games.", "Action / Soulslike",
    [vinh.id, souls.id, kazuki.id, speedster.id, nhan.id],
    [
      {
        userId: vinh.id,
        body: rich(`<p><strong>Welcome to Souls &amp; Soulslike!</strong></p><p>This is the place to discuss everything FromSoftware — boss strategies, lore theories, build recommendations. Whether you're struggling with Margit or going for Malenia platinum, you're among friends.</p><ul><li>Share your best builds 🗡️</li><li>Ask for boss tips</li><li>Post your achievements</li></ul>`),
        likeIds: [souls.id, kazuki.id, speedster.id, nhan.id],
        reactions: [{ emoji: "🔥", userId: souls.id }, { emoji: "🎮", userId: kazuki.id }, { emoji: "👏", userId: speedster.id }],
        comments: [
          { userId: souls.id, body: "Finally a club for us! Ready to discuss Malenia strategies 24/7." },
          { userId: kazuki.id, body: "Love it. First topic: most satisfying boss kill ever?" },
        ],
      },
      {
        userId: souls.id,
        body: rich(`<p>🏆 <strong>Challenge thread: Malenia no-hit run</strong></p><p>After 147 attempts, I finally got her no-hit. Here's what worked for me:</p><ol><li>Bloodhound's Step dodge timing</li><li>Rivers of Blood bleed proc resets her health regen</li><li>Stay <em>aggressive</em> — she heals on every hit she lands</li></ol><p>Anyone else grinding this? Drop your attempt count below 👇</p>`),
        likeIds: [vinh.id, kazuki.id, speedster.id],
        reactions: [{ emoji: "🔥", userId: vinh.id }, { emoji: "👏", userId: kazuki.id }, { emoji: "😮", userId: speedster.id }],
        comments: [
          { userId: vinh.id, body: "147 attempts is nothing. Mine was 230. Respect." },
          { userId: speedster.id, body: "I can do it with just jumping attacks if you want a real challenge lol" },
        ],
      },
      {
        userId: kazuki.id,
        body: rich(`<p>Hot take: <strong>Sekiro is the best FromSoftware game</strong>, not Elden Ring.</p><p>The parry system creates the most satisfying combat loop in gaming. Every boss fight is a rhythm game. Elden Ring is great but it lets you overlevel and cheese everything — Sekiro forces you to actually git gud.</p><p>Discuss. 🔥</p>`),
        likeIds: [vinh.id, souls.id],
        reactions: [{ emoji: "🔥", userId: souls.id }, { emoji: "👍", userId: vinh.id }],
        comments: [
          { userId: vinh.id, body: "Hard disagree but I respect it. Elden Ring world design is unmatched." },
          { userId: souls.id, body: "Sekiro combat > everything. But Elden Ring has Malenia so..." },
          { userId: nhan.id, body: "As an outsider: Hollow Knight is better than both 😂" },
        ],
      },
    ]
  );

  // 2. JRPG Paradise — sakura creates
  await createClub(
    sakura.id, "JRPG Paradise", "For lovers of turn-based combat, wild storylines, and 100+ hour completionist runs.", "JRPG",
    [sakura.id, kazuki.id, rpgMaster.id, strats.id, loot.id],
    [
      {
        userId: sakura.id,
        body: rich(`<p>👋 <strong>Welcome to JRPG Paradise!</strong></p><p>Whether you're a Persona purist, a Final Fantasy veteran, or just starting out — you belong here. Let's talk about the genre that defined gaming storytelling.</p><p><strong>Current club focus:</strong> Persona 5 Royal — we're doing a group playthrough. Join in!</p>`),
        likeIds: [kazuki.id, rpgMaster.id, strats.id],
        reactions: [{ emoji: "❤️", userId: kazuki.id }, { emoji: "👍", userId: rpgMaster.id }, { emoji: "🎮", userId: strats.id }],
        comments: [
          { userId: rpgMaster.id, body: "Already on my 4th P5R playthrough. Happy to guide newcomers!" },
          { userId: kazuki.id, body: "The soundtrack alone is worth the price of admission." },
        ],
      },
      {
        userId: rpgMaster.id,
        body: rich(`<p>📖 <strong>JRPG Starter Guide — Where to Begin?</strong></p><p>People always ask me where to start with JRPGs. Here's my answer based on playstyle:</p><ul><li><strong>Want accessibility?</strong> → Persona 5 Royal. Best UI in gaming.</li><li><strong>Want epic scope?</strong> → Baldur's Gate 3 (honorary CRPG/JRPG)</li><li><strong>Want pure vibes?</strong> → Stardew Valley (yes it counts)</li><li><strong>Want challenge?</strong> → Divinity: Original Sin 2</li></ul><p>What would you add?</p>`),
        likeIds: [sakura.id, strats.id, loot.id],
        reactions: [{ emoji: "👍", userId: sakura.id }, { emoji: "❤️", userId: strats.id }],
        comments: [
          { userId: sakura.id, body: "Perfect list. I'd add Witcher 3 for storytelling masterclass." },
          { userId: strats.id, body: "BG3 is absolutely CRPG royalty. Larian outdid themselves." },
        ],
      },
    ]
  );

  // 3. Indie Gems — nhan creates
  await createClub(
    nhan.id, "Indie Gems", "AAA budgets can't buy heart. Celebrating the best indie games and the developers who make them.", "Indie",
    [nhan.id, indieQueen.id, speedster.id, sakura.id, loot.id],
    [
      {
        userId: nhan.id,
        body: rich(`<p>🌟 <strong>Welcome to Indie Gems!</strong></p><p>This club exists because some of the best games ever made were created by a single person or tiny team. No bloat, no FOMO, just pure creative vision.</p><p>Monthly spotlight: <strong>Hollow Knight</strong> — Team Cherry's masterpiece that still gets updates in 2024.</p>`),
        likeIds: [indieQueen.id, speedster.id, sakura.id],
        reactions: [{ emoji: "❤️", userId: indieQueen.id }, { emoji: "🎮", userId: speedster.id }, { emoji: "👏", userId: sakura.id }],
        comments: [
          { userId: indieQueen.id, body: "FINALLY a club that gets it. Support small devs always!" },
          { userId: speedster.id, body: "Hollow Knight speedrun community is one of the best in gaming." },
        ],
      },
      {
        userId: indieQueen.id,
        body: rich(`<p>💔 <strong>Underrated indie games that deserved more attention</strong></p><p>Some of my personal heartbreaks — games I loved that almost no one played:</p><ol><li><strong>Disco Elysium</strong> — most ambitious RPG ever, criminally underplayed</li><li><strong>Return of the Obra Dinn</strong> — puzzle perfection</li><li><strong>Celeste</strong> — platforming poetry</li><li><strong>Night in the Woods</strong> — best writing about modern anxiety</li></ol><p>What's yours?</p>`),
        likeIds: [nhan.id, speedster.id, sakura.id, loot.id],
        reactions: [{ emoji: "😢", userId: nhan.id }, { emoji: "❤️", userId: speedster.id }],
        comments: [
          { userId: nhan.id, body: "Disco Elysium is legitimately a 10/10 piece of literature." },
          { userId: speedster.id, body: "Celeste is incredible and the speedrun scene is amazing too." },
          { userId: loot.id, body: "Adding: Outer Wilds. Nothing else like it in gaming." },
        ],
      },
    ]
  );

  // 4. Open World Explorers — loot creates
  await createClub(
    loot.id, "Open World Explorers", "The world is a sandbox. Tips, screenshots, and discoveries from the best open world games.", "Open World",
    [loot.id, vinh.id, kazuki.id, strats.id, rpgMaster.id],
    [
      {
        userId: loot.id,
        body: rich(`<p>🌍 <strong>What makes a great open world?</strong></p><p>After 1000+ hours across RDR2, Witcher 3, BotW, and Ghost of Tsushima, here's my opinion on what separates great open worlds from mediocre ones:</p><ul><li><strong>Density over size</strong> — every corner should have a story</li><li><strong>Environmental storytelling</strong> — the world itself should explain its history</li><li><strong>Meaningful traversal</strong> — the act of moving should be fun (horseback in RDR2, gliding in BotW)</li></ul><p>What's your favorite open world and why?</p>`),
        likeIds: [vinh.id, kazuki.id, strats.id, rpgMaster.id],
        reactions: [{ emoji: "👍", userId: vinh.id }, { emoji: "🔥", userId: kazuki.id }, { emoji: "👏", userId: strats.id }],
        comments: [
          { userId: kazuki.id, body: "Ghost of Tsushima is my personal peak. Every hill is a painting." },
          { userId: strats.id, body: "Witcher 3 still the GOAT for density. Every side quest has a moral." },
          { userId: vinh.id, body: "Elden Ring changed what I think about open world structure. Zero handholding." },
        ],
      },
    ]
  );

  // 5. Speedrunners United — speedster creates
  await createClub(
    speedster.id, "Speedrunners United", "Every frame counts. Share PBs, routing discussions, tech discoveries.", "Speedrunning",
    [speedster.id, nhan.id, souls.id, indieQueen.id],
    [
      {
        userId: speedster.id,
        body: rich(`<p>⏱️ <strong>Welcome to Speedrunners United!</strong></p><p>Whether you're chasing world records or just trying to beat your friend — you're a speedrunner. This club is for:</p><ul><li>Sharing PBs 🏆</li><li>Discussing movement tech</li><li>Finding running partners</li><li>Routing new games</li></ul><p>Current PB showcase: <strong>Portal 2 any% — 17:43</strong>. Anyone beating that?</p>`),
        likeIds: [nhan.id, souls.id, indieQueen.id],
        reactions: [{ emoji: "🔥", userId: nhan.id }, { emoji: "😮", userId: souls.id }, { emoji: "👏", userId: indieQueen.id }],
        comments: [
          { userId: nhan.id, body: "17:43 is insane. My Portal 2 any% PB is 21:12 and I thought that was decent 😅" },
          { userId: souls.id, body: "Elden Ring any% is my current obsession. Glitchless or bust." },
        ],
      },
      {
        userId: nhan.id,
        body: rich(`<p>🦋 <strong>Hollow Knight NMG any% routing breakdown</strong></p><p>For anyone getting into HK speedrunning, here are the key tech pieces:</p><ol><li><strong>Nail pogo</strong> — fundamental movement, learn this first</li><li><strong>Shade skips</strong> — skip entire areas with precise positioning</li><li><strong>Boss order</strong> — Hornet 1 → False Knight skip → ...</li></ol><p>The current WR route saves ~23 minutes over casual playthrough. Insane.</p>`),
        likeIds: [speedster.id, indieQueen.id],
        reactions: [{ emoji: "🎮", userId: speedster.id }, { emoji: "😮", userId: indieQueen.id }],
        comments: [
          { userId: speedster.id, body: "Solid breakdown. Shade skips took me weeks to get consistent." },
        ],
      },
    ]
  );

  console.log("✅ Game clubs created\n");

  // ── Game Playthroughs ──────────────────────────────────────────────
  console.log("🔄 Creating playthroughs...");

  // Helper to find entry id
  async function entryId(userId: string, gameId: string | undefined) {
    if (!gameId) return null;
    const e = await prisma.gameEntry.findUnique({ where: { userId_gameId: { userId, gameId } } });
    return e?.id ?? null;
  }

  const [
    vinhEldenId, vinhBloodId, vinhDs3Id,
    soulsEldenId, soulsSekiroId, soulsBloodId, soulsDs3Id,
    speedPortalId, speedHkId, speedHadesId,
    nahnHkId, nahnHadesId,
  ] = await Promise.all([
    entryId(vinh.id,     eldenRing?.id ?? ""),
    entryId(vinh.id,     bloodborne?.id ?? ""),
    entryId(vinh.id,     ds3?.id ?? ""),
    entryId(souls.id,    eldenRing?.id ?? ""),
    entryId(souls.id,    sekiro?.id ?? ""),
    entryId(souls.id,    bloodborne?.id ?? ""),
    entryId(souls.id,    ds3?.id ?? ""),
    entryId(speedster.id, portal2?.id ?? ""),
    entryId(speedster.id, hollowKnight?.id ?? ""),
    entryId(speedster.id, hades?.id ?? ""),
    entryId(nhan.id,     hollowKnight?.id ?? ""),
    entryId(nhan.id,     hades?.id ?? ""),
  ]);

  const playthroughs: { entryId: string; userId: string; playtime?: number; platform?: string; completedAt?: Date; note?: string }[] = [];

  if (vinhEldenId) {
    playthroughs.push(
      { entryId: vinhEldenId, userId: vinh.id, playtime: 120, platform: "PC",  completedAt: new Date("2023-04-01"), note: "First playthrough — Malenia took 67 tries" },
      { entryId: vinhEldenId, userId: vinh.id, playtime: 85,  platform: "PC",  completedAt: new Date("2023-09-15"), note: "NG+ — Faith/Strength build, much easier" },
    );
  }
  if (vinhBloodId) playthroughs.push({ entryId: vinhBloodId, userId: vinh.id, playtime: 70, platform: "PS5", completedAt: new Date("2023-06-10"), note: "PS5 remaster, incredible" });
  if (vinhDs3Id)   playthroughs.push({ entryId: vinhDs3Id,   userId: vinh.id, playtime: 95, platform: "PC",  completedAt: new Date("2023-02-20"), note: "All bosses, no summons" });

  if (soulsEldenId) {
    playthroughs.push(
      { entryId: soulsEldenId, userId: souls.id, playtime: 200, platform: "PC",  completedAt: new Date("2022-04-15"), note: "Platinum run — Malenia 47 tries" },
      { entryId: soulsEldenId, userId: souls.id, playtime: 90,  platform: "PC",  completedAt: new Date("2022-09-01"), note: "NG++ — pure quality build" },
      { entryId: soulsEldenId, userId: souls.id, playtime: 60,  platform: "PC",  completedAt: new Date("2023-05-20"), note: "DLC patch run — Shadow of the Erdtree prep" },
    );
  }
  if (soulsSekiroId) {
    playthroughs.push(
      { entryId: soulsSekiroId, userId: souls.id, playtime: 160, platform: "PC", completedAt: new Date("2021-07-01"), note: "All endings — Shura last" },
      { entryId: soulsSekiroId, userId: souls.id, playtime: 40,  platform: "PC", completedAt: new Date("2022-01-10"), note: "Demon Bell + Kuro's Charm — REAL difficulty" },
    );
  }
  if (soulsBloodId) {
    playthroughs.push(
      { entryId: soulsBloodId, userId: souls.id, playtime: 100, platform: "PS5", completedAt: new Date("2020-11-20"), note: "Platinum — Orphan took 89 tries" },
      { entryId: soulsBloodId, userId: souls.id, playtime: 50,  platform: "PS5", completedAt: new Date("2021-04-05"), note: "Arcane build run, very different experience" },
    );
  }
  if (soulsDs3Id) {
    playthroughs.push(
      { entryId: soulsDs3Id, userId: souls.id, playtime: 130, platform: "PC", completedAt: new Date("2019-06-01"), note: "All bosses first playthrough" },
      { entryId: soulsDs3Id, userId: souls.id, playtime: 80,  platform: "PC", completedAt: new Date("2020-03-10"), note: "NG+7 — Pyromancy only challenge" },
    );
  }

  if (speedPortalId) {
    playthroughs.push(
      { entryId: speedPortalId, userId: speedster.id, playtime: 20, platform: "PC", completedAt: new Date("2022-05-01"), note: "Casual first run" },
      { entryId: speedPortalId, userId: speedster.id, playtime: 1,  platform: "PC", completedAt: new Date("2022-06-15"), note: "Any% — 18:42, learning the route" },
      { entryId: speedPortalId, userId: speedster.id, playtime: 1,  platform: "PC", completedAt: new Date("2023-01-20"), note: "Any% PB — 17:43, still chasing sub-17" },
    );
  }
  if (speedHkId) {
    playthroughs.push(
      { entryId: speedHkId, userId: speedster.id, playtime: 60, platform: "PC", completedAt: new Date("2021-08-01"), note: "Casual 112% completion" },
      { entryId: speedHkId, userId: speedster.id, playtime: 1,  platform: "PC", completedAt: new Date("2022-03-15"), note: "NMG any% PB — 1:12:34" },
    );
  }
  if (speedHadesId) {
    playthroughs.push(
      { entryId: speedHadesId, userId: speedster.id, playtime: 150, platform: "PC", completedAt: new Date("2021-10-01"), note: "Heat 32 cleared — BiS build" },
      { entryId: speedHadesId, userId: speedster.id, playtime: 1,   platform: "PC", completedAt: new Date("2022-05-10"), note: "Speedrun any% — optimizing Ares + Aphrodite build" },
    );
  }

  if (nahnHkId) {
    playthroughs.push(
      { entryId: nahnHkId, userId: nhan.id, playtime: 85, platform: "PC",      completedAt: new Date("2021-04-01"), note: "112% completion + all DLCs" },
      { entryId: nahnHkId, userId: nhan.id, playtime: 30, platform: "Switch",  completedAt: new Date("2022-07-20"), note: "Replay on Switch — just as good" },
    );
  }
  if (nahnHadesId) {
    playthroughs.push(
      { entryId: nahnHadesId, userId: nhan.id, playtime: 100, platform: "PC", completedAt: new Date("2021-11-01"), note: "Finished story, all endings" },
      { entryId: nahnHadesId, userId: nhan.id, playtime: 40,  platform: "Switch", completedAt: new Date("2022-08-15"), note: "Replay on Switch for portability" },
    );
  }

  await Promise.all(
    playthroughs.map((p) =>
      prisma.gamePlaythrough.create({
        data: { userId: p.userId, entryId: p.entryId, playtime: p.playtime, platform: p.platform, completedAt: p.completedAt, note: p.note },
      }).catch(() => {})
    )
  );

  console.log("✅ Playthroughs created\n");

  // ── Social Posts ───────────────────────────────────────────────────
  console.log("📝 Creating social posts...");

  async function createPost(
    authorId: string,
    textContent: string,
    likeUserIds: string[],
    comments: { userId: string; body: string }[]
  ) {
    const p = await prisma.post.create({
      data: { authorId, textContent, images: "[]", visibility: "public" },
    });
    for (const uid of likeUserIds) {
      await prisma.postLike.create({ data: { postId: p.id, userId: uid } }).catch(() => {});
    }
    for (const cm of comments) {
      await prisma.postComment.create({ data: { postId: p.id, userId: cm.userId, body: cm.body } }).catch(() => {});
    }
    return p;
  }

  await Promise.all([
    // ── vinh ──
    createPost(vinh.id,
      "Just hit 120 hours in Elden Ring. Still going. This game absolutely refuses to let me go 🗡️ What's everyone's favorite area?",
      [souls.id, nhan.id, kazuki.id, loot.id, strats.id],
      [
        { userId: souls.id, body: "Mountaintops of the Giants hits different at 3am. 10/10." },
        { userId: nhan.id, body: "Liurnia is my personal favorite. The lake atmosphere is incredible." },
        { userId: kazuki.id, body: "Farum Azula. That place looks absolutely insane." },
      ]
    ),
    createPost(vinh.id,
      "Hot take: Sekiro has the best boss design in all of gaming. Isshin phase 3 is perfection of the form. Change my mind.",
      [souls.id, kazuki.id, speedster.id],
      [
        { userId: souls.id, body: "Can't change it because it's correct. Every fight is a rhythm game." },
        { userId: kazuki.id, body: "Isshin is peak. Nothing in gaming hits like that lightning reversal moment." },
      ]
    ),
    createPost(vinh.id,
      "Cyberpunk 2077 update after 45 hours: I take back everything I said at launch. Night City in 2.0 is an absolute masterpiece. CDPR redeemed themselves completely. V's story slaps.",
      [loot.id, strats.id, rpgMaster.id, nhan.id],
      [
        { userId: loot.id, body: "Night City is the best open world in gaming. I spent 2 hours just riding around doing nothing." },
        { userId: rpgMaster.id, body: "Phantom Liberty DLC is incredible too. Songbird might be the best thing CDPR ever wrote." },
      ]
    ),

    // ── sakura ──
    createPost(sakura.id,
      "Persona 5 Royal 100% complete ✅ Every confidant maxed. All trophies earned. 150 hours of pure perfection. This is genuinely the best game ever made and I will not be taking questions.",
      [vinh.id, nhan.id, kazuki.id, rpgMaster.id, strats.id, loot.id],
      [
        { userId: rpgMaster.id, body: "Fellow P5R completionist 🫡 Did you get the true ending first try or did you need a guide?" },
        { userId: kazuki.id, body: "Beneath the Mask is still my alarm clock sound. No regrets whatsoever." },
        { userId: nhan.id, body: "200 hours into Stardew Valley here. We are kindred spirits of gaming dedication." },
      ]
    ),
    createPost(sakura.id,
      "Stardew Valley hours: 200+. Just discovered I've been doing farm layout completely wrong this whole time. Apparently there's an 'optimal' layout. I don't care. My chaotic farm brings me joy and that's the only metric that matters.",
      [nhan.id, loot.id, indieQueen.id, rpgMaster.id],
      [
        { userId: loot.id, body: "520 hours here and my farm is still total chaos. Chaos farm > meta farm always." },
        { userId: indieQueen.id, body: "ConcernedApe made the game about joy, not efficiency. You're playing it correctly." },
      ]
    ),

    // ── loot ──
    createPost(loot.id,
      "Spent 3 hours in RDR2 today without completing a single quest. Found a hermit in the mountains who just... lives there. Has his whole setup. Rockstar put more effort into one irrelevant NPC than most studios put into entire games.",
      [vinh.id, strats.id, kazuki.id, rpgMaster.id, souls.id],
      [
        { userId: strats.id, body: "That hermit is Arthur's spiritual opposite. Rockstar absolutely knew what they were doing." },
        { userId: kazuki.id, body: "RDR2 world density is untouchable. I found a family of serial killers once just wandering." },
        { userId: vinh.id, body: "This is why I need to go back to RDR2. Haven't touched it since 2020." },
      ]
    ),
    createPost(loot.id,
      "Ghost of Tsushima photo mode just cost me an entire evening. Posted 43 screenshots today. Zero regrets. This game is a painting that you can walk around inside of.",
      [kazuki.id, sakura.id, vinh.id, rpgMaster.id],
      [
        { userId: kazuki.id, body: "Ghost photo mode is one of the best ever made. The wind mechanic is perfect for dramatic shots." },
        { userId: sakura.id, body: "Post the screenshots!!! 🌸 I need them." },
      ]
    ),

    // ── soulsaddict ──
    createPost(souls.id,
      "PLATINUM TROPHY — Elden Ring ✅\n\n200 hours. Malenia took exactly 47 attempts.\n\nShe is not that hard.\n\n(She is absolutely that hard. Do not let anyone tell you otherwise. She heals on every hit.)",
      [vinh.id, nhan.id, kazuki.id, strats.id, rpgMaster.id, speedster.id, loot.id],
      [
        { userId: vinh.id, body: "200 hours for the platinum is NOTHING. Absolute legend. Congrats 🏆" },
        { userId: kazuki.id, body: "47 attempts is genuinely impressive restraint. I rage quit after attempt 20." },
        { userId: speedster.id, body: "Have you considered a no-hit run next? Asking for a friend." },
      ]
    ),
    createPost(souls.id,
      "Day 147 of attempting Malenia no-hit run. Current status: I am completely normal. I am not obsessed. I definitely still have a healthy relationship with this game.\n\n(I do not.)",
      [vinh.id, kazuki.id, speedster.id, nhan.id],
      [
        { userId: vinh.id, body: "147 attempts and you're still here. You are either the most determined or least sane person I know. Respect either way." },
        { userId: speedster.id, body: "Waterfowl Dance is just a math problem. Once you solve the math it clicks. You'll get it." },
        { userId: nhan.id, body: "I admire and fear you in equal measure. Please take care of yourself." },
      ]
    ),

    // ── nhan ──
    createPost(nhan.id,
      "Disco Elysium is the most daring game ever made. It trusts you to be intelligent. It trusts you to sit with difficult ideas. It has no combat because the combat IS the dialogue. Nothing else does this. Harry Du Bois is literature.",
      [vinh.id, souls.id, strats.id, rpgMaster.id, indieQueen.id, sakura.id],
      [
        { userId: strats.id, body: "Kim Kitsuragi is the greatest NPC ever written. This is not a debate." },
        { userId: rpgMaster.id, body: "Art Cop run is the only valid first playthrough. Everything else is a warmup." },
        { userId: indieQueen.id, body: "I need to actually play this. It keeps coming up everywhere and I keep skipping it." },
      ]
    ),
    createPost(nhan.id,
      "Reminder that Hades exists, costs $15–25, has more content than most $70 games, has one of the best stories in gaming, and the gameplay loop is genuinely perfect. If you haven't played it you are missing out on something special.",
      [indieQueen.id, speedster.id, sakura.id, vinh.id, loot.id],
      [
        { userId: indieQueen.id, body: "Zagreus/Meg is the best romance in gaming. I said what I said and I stand by it." },
        { userId: speedster.id, body: "Heat 32 cleared here. The depth of build optimization is genuinely insane." },
      ]
    ),

    // ── strats ──
    createPost(strats.id,
      "BG3 playthrough 4 started — Evil Durge Paladin of Conquest. Already betrayed Karlach, allied with the Goblins, and made Shadowheart do something horrible. Larian's writing handles this without blinking. Every choice has weight.",
      [sakura.id, rpgMaster.id, nhan.id, kazuki.id, vinh.id],
      [
        { userId: rpgMaster.id, body: "Evil Durge is the TRUE BG3 experience. The Dark Urge monologue in Act 1 is some of the best writing in gaming." },
        { userId: sakura.id, body: "On my second run and I made completely opposite choices. Feels like an entirely different game." },
      ]
    ),
    createPost(strats.id,
      "Hot take: Arthur Morgan is the greatest protagonist in gaming history and RDR2 Chapter 6 is the finest piece of interactive storytelling ever created. I will elaborate on this indefinitely if you let me.",
      [kazuki.id, loot.id, rpgMaster.id, sakura.id, vinh.id, souls.id],
      [
        { userId: kazuki.id, body: "The mountain scene while Crash of Worlds plays... I'm emotional just thinking about it." },
        { userId: rpgMaster.id, body: "This is not a hot take. This is factual information backed by all evidence." },
        { userId: loot.id, body: "The epilogue made me cry and I don't cry at games. RDR2 broke my rules." },
      ]
    ),

    // ── kazuki ──
    createPost(kazuki.id,
      "Ghost of Tsushima. Torii gate on a cliffside. Wind through the pampas grass. Golden light on the ocean. I put down the controller and just stood there for five minutes. This is why we play games.",
      [loot.id, sakura.id, vinh.id, rpgMaster.id, strats.id],
      [
        { userId: loot.id, body: "This game is a living painting. I have more Ghost screenshots than actual photos on my phone." },
        { userId: sakura.id, body: "Now I need to play this immediately. Adding to my list 😭" },
      ]
    ),
    createPost(kazuki.id,
      "The Leviathan Axe in God of War is the most satisfying weapon in the history of gaming. Throwing it. Watching enemies freeze. Calling it back. The THUNK when it returns to your hand. This is perfect game design and I will not discuss alternatives.",
      [sakura.id, strats.id, rpgMaster.id, loot.id, vinh.id],
      [
        { userId: strats.id, body: "Santa Monica studied what makes weapons feel good and then did it perfectly. Ragnarok's spear is somehow even better." },
        { userId: vinh.id, body: "Every weapon in that game has weight and feedback. The shield timing system is masterful too." },
      ]
    ),

    // ── indieQueen ──
    createPost(indieQueen.id,
      "Please play Hollow Knight. It's $15. It has 60+ hours of content. Three people built something larger and deeper than most AAA studios. The lore is darker than Dark Souls. The combat is tighter than most action games. You have no excuse.",
      [nhan.id, speedster.id, souls.id, sakura.id, vinh.id],
      [
        { userId: nhan.id, body: "Team Cherry are modern legends. Still updating it for FREE years later." },
        { userId: souls.id, body: "The Radiance fight is better than most FromSoft bosses. Typed this with my whole chest." },
        { userId: speedster.id, body: "The speedrun community is incredible too. Pure Vessel hitbox is frame-perfect art." },
      ]
    ),
    createPost(indieQueen.id,
      "Hades 10/10 forever. I've never played a game where every single element — music, writing, art, mechanics, story, replayability — is simultaneously perfect. Supergiant can do absolutely no wrong. They are the greatest studio alive.",
      [nhan.id, speedster.id, sakura.id, loot.id, vinh.id, strats.id],
      [
        { userId: nhan.id, body: "Bastion → Transistor → Pyre → Hades. They have never, ever missed. What is in their water?" },
        { userId: speedster.id, body: "Heat 32 speedrun is one of the hardest things I've done in gaming. In the best way." },
      ]
    ),

    // ── rpgMaster ──
    createPost(rpgMaster.id,
      "BG3 playthrough 4 done. Started 5 immediately. I keep finding dialogue I've never seen before. Quests I've never triggered. Characters saying things I didn't know they could say. Larian built a mountain and we're all still at base camp.",
      [strats.id, sakura.id, nhan.id, kazuki.id, loot.id],
      [
        { userId: strats.id, body: "I'm on playthrough 4 too and we are living parallel lives. Twin Durge energy." },
        { userId: sakura.id, body: "I'm only on run 2 and I'm already lost in choices I didn't know existed." },
      ]
    ),
    createPost(rpgMaster.id,
      "The Witcher 3 Blood and Wine DLC is better than most full-price games. Toussaint is the most beautiful area in any RPG. Geralt's ending still makes me emotional. CDPR made something that will outlive all of us.",
      [strats.id, loot.id, sakura.id, kazuki.id, souls.id],
      [
        { userId: strats.id, body: "Blood and Wine is a love letter from CDPR to their players. They knew exactly what they were doing." },
        { userId: loot.id, body: "Toussaint as an open world is so underrated. Dense, gorgeous, and perfect." },
      ]
    ),

    // ── speedster ──
    createPost(speedster.id,
      "Portal 2 any% PB: 17:43 🎉\n\nFinally got the cornershooting tech consistent after 6 weeks of grinding. Still chasing sub-17 but this feels incredible. If you've never watched Portal 2 speedruns you are genuinely missing out on art.",
      [nhan.id, indieQueen.id, souls.id, vinh.id],
      [
        { userId: nhan.id, body: "17:43 on a game I need 5 hours to beat. What do you do differently with your brain 😂" },
        { userId: indieQueen.id, body: "Sub-17 incoming. I can feel it from here. You've absolutely got this." },
      ]
    ),
    createPost(speedster.id,
      "Hollow Knight NMG any% PB: 1:12:34 ✅\n\nPure Vessel decided today was not the day to cooperate. Pure Vessel will always be wrong about this. The nail pogo routing through White Palace is finally consistent.\n\nNext target: sub 1:10.",
      [nhan.id, indieQueen.id, souls.id, vinh.id, kazuki.id],
      [
        { userId: nhan.id, body: "1:12 on a game I spent 85 hours on. I'm simultaneously impressed and personally offended." },
        { userId: souls.id, body: "Pure Vessel no-hit in a speedrun context is legitimately insane. Absolute monster run." },
        { userId: indieQueen.id, body: "1:10 is already yours. White Palace routing alone saves 2+ minutes easy." },
      ]
    ),
  ]);

  console.log("✅ Social posts created\n");

  // ── Summary ────────────────────────────────────────────────────────
  const [userCount, gameCount, entryCount, activityCount, followCount, likeCount, commentCount, reviewLikeCount, tagCount, clubCount, playthroughCount, challengeCount, listCount, postCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.game.count(),
      prisma.gameEntry.count(),
      prisma.activity.count(),
      prisma.follow.count(),
      prisma.like.count(),
      prisma.comment.count(),
      prisma.reviewLike.count(),
      prisma.gameTag.count(),
      prisma.gameClub.count(),
      prisma.gamePlaythrough.count(),
      prisma.yearlyChallenge.count(),
      prisma.gameList.count(),
      prisma.post.count(),
    ]);

  console.log("═══════════════════════════════════════════════════");
  console.log("🎉 Seed complete!");
  console.log("═══════════════════════════════════════════════════");
  console.log(`👤 Users:             ${userCount}`);
  console.log(`🎮 Games:             ${gameCount}`);
  console.log(`📚 Library entries:   ${entryCount}`);
  console.log(`📢 Activities:        ${activityCount}`);
  console.log(`🤝 Follows:           ${followCount}`);
  console.log(`❤️  Likes:             ${likeCount}`);
  console.log(`💬 Comments:          ${commentCount}`);
  console.log(`👍 Review helpful:    ${reviewLikeCount}`);
  console.log(`🏷️  Game tags:         ${tagCount}`);
  console.log(`🎯 Game clubs:        ${clubCount}`);
  console.log(`🔄 Playthroughs:      ${playthroughCount}`);
  console.log(`🏆 Yearly challenges: ${challengeCount}`);
  console.log(`📋 Game lists:        ${listCount}`);
  console.log(`📝 Social posts:      ${postCount}`);
  console.log("═══════════════════════════════════════════════════");
  console.log("🔑 All accounts — password: password123");
  console.log("───────────────────────────────────────────────────");
  allUsers.forEach((u) => console.log(`   ${u.username.padEnd(18)} ${u.email}`));
  console.log("═══════════════════════════════════════════════════");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
