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
  await prisma.activity.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.gameListEntry.deleteMany();
  await prisma.gameList.deleteMany();
  await prisma.yearlyChallenge.deleteMany();
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

  // ── Summary ────────────────────────────────────────────────────────
  const [userCount, gameCount, entryCount, activityCount, followCount, likeCount, commentCount, challengeCount, listCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.game.count(),
      prisma.gameEntry.count(),
      prisma.activity.count(),
      prisma.follow.count(),
      prisma.like.count(),
      prisma.comment.count(),
      prisma.yearlyChallenge.count(),
      prisma.gameList.count(),
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
  console.log(`🏆 Yearly challenges: ${challengeCount}`);
  console.log(`📋 Game lists:        ${listCount}`);
  console.log("═══════════════════════════════════════════════════");
  console.log("🔑 All accounts — password: password123");
  console.log("───────────────────────────────────────────────────");
  allUsers.forEach((u) => console.log(`   ${u.username.padEnd(18)} ${u.email}`));
  console.log("═══════════════════════════════════════════════════");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
