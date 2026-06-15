"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import {
  Gamepad2, Star, Users, BookOpen, TrendingUp,
  Trophy, MessageSquare, ChevronRight, Zap,
} from "lucide-react";

// ── Static data ────────────────────────────────────────────────────────────────

const GAME_CARDS = [
  {
    id: "elden",
    title: "Elden Ring",
    studio: "FromSoftware · 2022",
    status: "Completed",
    statusColor: "#4ade80",
    statusBg: "rgba(74,222,128,0.12)",
    statusBorder: "rgba(74,222,128,0.28)",
    rating: "9.5",
    quote: '"A brutal, beautiful open world."',
    user: "kiryu_k",
    coverGrad: "linear-gradient(145deg,#1a0533 0%,#3b1260 60%,#5b1fa0 100%)",
    avatarBg: "#6D28D9",
    top: "0px", right: "32px",
    floatClass: "animate-float-a",
    zIndex: 30,
  },
  {
    id: "hades",
    title: "Hades II",
    studio: "Supergiant · 2024",
    status: "Playing",
    statusColor: "#38bdf8",
    statusBg: "rgba(56,189,248,0.12)",
    statusBorder: "rgba(56,189,248,0.28)",
    rating: null,
    quote: '"40h in and still hooked."',
    user: "indie_queen",
    coverGrad: "linear-gradient(145deg,#0c1a33 0%,#0e2a52 60%,#1a4080 100%)",
    avatarBg: "#0E7490",
    top: "190px", right: "218px",
    floatClass: "animate-[gl-float-b_9s_ease-in-out_infinite_1.2s]",
    zIndex: 20,
  },
  {
    id: "disco",
    title: "Disco Elysium",
    studio: "ZA/UM · 2019",
    status: "Completed",
    statusColor: "#4ade80",
    statusBg: "rgba(74,222,128,0.12)",
    statusBorder: "rgba(74,222,128,0.28)",
    rating: "10",
    quote: '"The most literary RPG ever made."',
    user: "lore_master",
    coverGrad: "linear-gradient(145deg,#0c1f12 0%,#133a1c 60%,#1e5a2a 100%)",
    avatarBg: "#065F46",
    top: "346px", right: "14px",
    floatClass: "animate-[gl-float-c_6s_ease-in-out_infinite_0.6s]",
    zIndex: 10,
  },
];

const FEATURES = [
  {
    icon: BookOpen,
    title: "Log Everything",
    desc: "Track status, hours, playthroughs, and ratings across your entire game library.",
    color: "#7C3AED",
    bg: "rgba(124,58,237,0.13)",
  },
  {
    icon: Star,
    title: "Rate & Review",
    desc: "Write in-depth reviews with spoiler support and discover critical consensus.",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.13)",
  },
  {
    icon: Users,
    title: "Social Feed",
    desc: "See what friends are playing in real time. Follow taste-makers who get it.",
    color: "#06B6D4",
    bg: "rgba(6,182,212,0.13)",
  },
  {
    icon: TrendingUp,
    title: "Discover Games",
    desc: "Get recommendations personalised to your taste based on what you've loved.",
    color: "#10B981",
    bg: "rgba(16,185,129,0.13)",
  },
  {
    icon: Trophy,
    title: "Leaderboards",
    desc: "Compete monthly for most completions, most reviews, and community kudos.",
    color: "#F97316",
    bg: "rgba(249,115,22,0.13)",
  },
  {
    icon: MessageSquare,
    title: "Game Clubs",
    desc: "Join communities around specific titles. Discuss, debate, and replay together.",
    color: "#A855F7",
    bg: "rgba(168,85,247,0.13)",
  },
];

const STATS = [
  { value: "50K+", label: "Games in database" },
  { value: "12K+", label: "Logs this month"   },
  { value: "8K+",  label: "Reviews written"   },
  { value: "2K+",  label: "Active players"    },
];

const MARQUEE_GAMES = [
  "Elden Ring", "Hades II", "Baldur's Gate 3", "Hollow Knight", "Disco Elysium",
  "God of War", "The Witcher 3", "Sekiro", "Cyberpunk 2077", "Red Dead Redemption 2",
  "Ghost of Tsushima", "Persona 5 Royal", "Final Fantasy XVI", "Alan Wake 2", "Dark Souls III",
  "Celeste", "Outer Wilds", "Death Stranding", "Control", "Metroid Dread",
];

const ACTIVITY = [
  { user: "kiryu_k",     avatar: "K", bg: "#6D28D9", action: "completed", game: "Elden Ring",      rating: "9.5", time: "2m ago"  },
  { user: "sakura_plays",avatar: "S", bg: "#BE185D", action: "started",   game: "Hades II",        rating: null,  time: "9m ago"  },
  { user: "rpg_master",  avatar: "R", bg: "#0E7490", action: "rated",     game: "Baldur's Gate 3", rating: "8.0", time: "17m ago" },
  { user: "indie_queen", avatar: "I", bg: "#B45309", action: "reviewed",  game: "Hollow Knight",   rating: "9.0", time: "24m ago" },
  { user: "nhan_minh",   avatar: "N", bg: "#065F46", action: "completed", game: "Disco Elysium",   rating: "10",  time: "33m ago" },
];

const FOOTER_LINKS = [
  ["Discover",    "/discover"   ],
  ["Reviews",     "/reviews"    ],
  ["Clubs",       "/clubs"      ],
  ["Leaderboard", "/leaderboard"],
  ["Login",       "/login"      ],
  ["Register",    "/register"   ],
] as const;

// ── Sub-components ─────────────────────────────────────────────────────────────

function GameCard({ card }: { card: typeof GAME_CARDS[number] }) {
  return (
    <div
      className={`absolute w-[218px] bg-[rgba(13,13,26,0.92)] border border-white/10 rounded-[16px] overflow-hidden shadow-[0_28px_64px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)] backdrop-blur-[16px] ${card.floatClass}`}
      style={{ top: card.top, right: card.right, zIndex: card.zIndex, position: "absolute" }}
    >
      <div className="h-24 relative flex items-end p-[10px_12px]" style={{ background: card.coverGrad }}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(13,13,26,0.75)]" />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7,
            background: card.avatarBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, color: "#fff",
            fontFamily: "'Outfit', sans-serif",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}>
            {card.title[0]}
          </div>
        </div>
      </div>

      <div className="p-[10px_12px_14px]">
        <p className="font-outfit text-[13px] font-bold text-gl-text m-0 mb-0.5 truncate">{card.title}</p>
        <p className="font-outfit text-[10px] text-gl-muted m-0 mb-2.5">{card.studio}</p>
        <div className="flex items-center justify-between">
          <span className="font-outfit text-[9px] font-bold tracking-[0.1em] uppercase px-2 py-[3px] rounded-[5px] border" style={{
            color: card.statusColor,
            background: card.statusBg,
            borderColor: card.statusBorder,
          }}>
            {card.status}
          </span>
          {card.rating && (
            <span className="font-outfit text-[12px] font-bold text-gl-amber flex items-center gap-[3px]">
              <Star size={10} fill="#F59E0B" color="#F59E0B" />
              {card.rating}
            </span>
          )}
        </div>
        <p className="font-outfit text-[10px] italic text-gl-muted leading-[1.5] mt-[9px] pt-[9px] border-t border-white/[0.07] truncate">{card.quote}</p>
        <p className="font-outfit text-[10px] font-semibold text-[rgba(139,92,246,0.9)] mt-[5px]">— @{card.user}</p>
      </div>
    </div>
  );
}

function FeatureCard({ feat }: { feat: typeof FEATURES[number] }) {
  const Icon = feat.icon;
  return (
    <div className="bg-gl-surface border border-gl-border rounded-[16px] p-[30px] transition-[transform,border-color,box-shadow] duration-[240ms] cursor-default hover:-translate-y-[5px] hover:border-gl-violet/30 hover:shadow-[0_20px_48px_rgba(0,0,0,0.35)]">
      <div className="w-[46px] h-[46px] rounded-[12px] flex items-center justify-center mb-[18px]" style={{ background: feat.bg }}>
        <Icon size={21} color={feat.color} />
      </div>
      <h3 className="font-outfit text-[16px] font-bold text-gl-text m-0 mb-2">{feat.title}</h3>
      <p className="font-outfit text-[14px] text-gl-subtext leading-[1.65] m-0">{feat.desc}</p>
    </div>
  );
}

function ActivityCard({ item }: { item: typeof ACTIVITY[number] }) {
  return (
    <div className="bg-[rgba(6,6,14,0.85)] border border-gl-border rounded-[12px] p-[13px_16px] flex items-center gap-[14px] transition-colors hover:border-gl-violet/[0.22]">
      <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center font-outfit text-[12px] font-bold text-white flex-shrink-0" style={{ background: item.bg }}>
        {item.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-outfit text-[13px] text-gl-subtext truncate leading-none">
          <span className="text-gl-violet-light font-semibold">@{item.user}</span>
          {" "}
          <span>{item.action}</span>
          {" "}
          <span className="text-gl-text font-semibold">{item.game}</span>
          {item.rating && (
            <span className="text-gl-amber font-semibold"> ★ {item.rating}</span>
          )}
        </p>
      </div>
      <span className="font-outfit text-[10px] text-gl-muted flex-shrink-0">{item.time}</span>
    </div>
  );
}

// ── Main landing page ──────────────────────────────────────────────────────────

export default memo(function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gl-bg text-gl-text font-outfit">

        {/* ════════════════ HERO ════════════════ */}
        <section className="relative overflow-hidden min-h-[calc(100vh-64px)] flex items-center">
          {/* Background layers */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute rounded-full blur-[90px] pointer-events-none w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(124,58,237,0.38)_0%,transparent_65%)] -top-[280px] -left-[160px] animate-orb-pulse" />
            <div className="absolute rounded-full blur-[90px] pointer-events-none w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(6,182,212,0.2)_0%,transparent_65%)] -bottom-[120px] right-[5%] animate-[gl-orb-pulse_7s_ease-in-out_infinite_2.5s]" />
            <div className="absolute rounded-full blur-[90px] pointer-events-none w-[300px] h-[300px] bg-[radial-gradient(circle,rgba(124,58,237,0.15)_0%,transparent_65%)] top-[40%] right-[30%] animate-[gl-orb-pulse_11s_ease-in-out_infinite_1s]" />
            <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_85%_80%_at_50%_40%,black_20%,transparent_100%)]" />
          </div>

          <div className="max-w-[1280px] mx-auto px-7 py-[72px] pb-[80px] grid grid-cols-2 gap-16 items-center relative z-[2] w-full max-[1024px]:grid-cols-1 max-[1024px]:gap-12">
            {/* ── Left column ── */}
            <div className="flex flex-col gap-7">
              <span className="font-outfit text-[10px] font-bold tracking-[0.18em] uppercase text-gl-violet-light inline-flex items-center gap-2.5 before:content-[''] before:inline-block before:w-5 before:h-px before:bg-gl-violet">
                <Zap size={10} />
                The social gaming journal
              </span>

              <h1 className="font-bebas text-[clamp(70px,9.5vw,128px)] leading-[0.88] text-gl-text m-0 tracking-[0.01em]">
                <span className="block">Your Games.</span>
                <span className="block">Your</span>
                <span className="block text-transparent [-webkit-text-stroke:2px_rgba(139,92,246,0.7)]">Story.</span>
              </h1>

              <p className="font-outfit text-[17px] leading-[1.72] text-gl-subtext max-w-[450px] m-0">
                Log every game you play, rate what you love, write reviews, and discover
                what friends are playing — all in one beautifully obsessive journal.
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                <button className="font-outfit text-[15px] font-semibold text-white bg-gradient-to-br from-gl-violet to-[#5B21B6] border-none cursor-pointer px-7 py-[14px] rounded-[10px] inline-flex items-center gap-2 transition-all shadow-[0_0_32px_rgba(124,58,237,0.35),0_4px_16px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:shadow-[0_0_52px_rgba(124,58,237,0.55),0_8px_24px_rgba(0,0,0,0.35)]" onClick={() => router.push("/register")}>
                  Start tracking free <ChevronRight size={16} />
                </button>
                <button className="font-outfit text-[15px] font-medium text-gl-subtext bg-none border border-gl-border cursor-pointer px-7 py-[13px] rounded-[10px] transition-[color,border-color,transform] hover:text-gl-text hover:border-white/[0.22] hover:-translate-y-px" onClick={() => router.push("/discover")}>
                  Browse games
                </button>
              </div>

              <div className="flex gap-0 pt-5 border-t border-gl-border">
                {STATS.map((s) => (
                  <div key={s.label} className="flex flex-col gap-[3px] pr-7 [&+&]:pl-7 [&+&]:border-l [&+&]:border-gl-border">
                    <span className="font-outfit text-[22px] font-bold text-gl-text tracking-[-0.03em]">{s.value}</span>
                    <span className="font-outfit text-[11px] text-gl-muted tracking-[0.04em]">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right column: floating game cards ── */}
            <div className="relative h-[540px] max-[1024px]:hidden">
              {GAME_CARDS.map((card) => (
                <GameCard key={card.id} card={card} />
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════ MARQUEE ════════════════ */}
        <div className="border-t border-gl-border border-b bg-[rgba(13,13,26,0.55)] py-[13px] overflow-hidden">
          <div className="flex w-max animate-marquee">
            {[...MARQUEE_GAMES, ...MARQUEE_GAMES].map((g, i) => (
              <span key={i} className="font-outfit text-[12px] font-medium text-gl-muted px-5 flex items-center gap-2 whitespace-nowrap transition-colors hover:text-gl-subtext">
                {g}
                <span className="text-gl-violet/50 text-[7px]">★</span>
              </span>
            ))}
          </div>
        </div>

        {/* ════════════════ FEATURES ════════════════ */}
        <section className="py-[108px]">
          <div className="max-w-[1280px] mx-auto px-7">
            <div className="text-center mb-[60px] flex flex-col items-center gap-[18px]">
              <span className="font-outfit text-[10px] font-bold tracking-[0.18em] uppercase text-gl-violet-light inline-flex items-center gap-2.5 before:content-[''] before:inline-block before:w-5 before:h-px before:bg-gl-violet">Everything you need</span>
              <h2 className="font-bebas text-[clamp(40px,5.5vw,68px)] text-gl-text m-0 leading-[0.95] tracking-[0.01em]">Built for serious players</h2>
              <p className="font-outfit text-[16px] text-gl-subtext max-w-[480px] text-center leading-[1.65] m-0">
                Not just a tracker. A full social platform for gaming culture.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-[18px] max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1">
              {FEATURES.map((f) => (
                <FeatureCard key={f.title} feat={f} />
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════ ACTIVITY PREVIEW ════════════════ */}
        <section className="py-[108px] bg-[rgba(13,13,26,0.4)] border-t border-gl-border border-b">
          <div className="max-w-[1280px] mx-auto px-7">
            <div className="grid grid-cols-[1fr_1.1fr] gap-[80px] items-center max-[1024px]:grid-cols-1 max-[1024px]:gap-12">
              <div className="flex flex-col gap-0">
                <span className="font-outfit text-[10px] font-bold tracking-[0.18em] uppercase text-gl-violet-light inline-flex items-center gap-2.5 before:content-[''] before:inline-block before:w-5 before:h-px before:bg-gl-violet">Live activity</span>
                <h2
                  className="font-bebas text-[clamp(40px,5.5vw,68px)] text-gl-text m-0 leading-[0.95] tracking-[0.01em]"
                  style={{ textAlign: "left", marginTop: 16 }}
                >
                  What's being<br />logged right now
                </h2>
                <p
                  className="font-outfit text-[16px] text-gl-subtext max-w-[480px] text-center leading-[1.65] m-0"
                  style={{ textAlign: "left", marginTop: 18 }}
                >
                  Join thousands of players documenting their gaming journeys in real time.
                </p>
                <button
                  className="font-outfit text-[15px] font-semibold text-white bg-gradient-to-br from-gl-violet to-[#5B21B6] border-none cursor-pointer px-7 py-[14px] rounded-[10px] inline-flex items-center gap-2 transition-all shadow-[0_0_32px_rgba(124,58,237,0.35),0_4px_16px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:shadow-[0_0_52px_rgba(124,58,237,0.55),0_8px_24px_rgba(0,0,0,0.35)]"
                  style={{ marginTop: 36, alignSelf: "flex-start" }}
                  onClick={() => router.push("/register")}
                >
                  Join the community <ChevronRight size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-2.5">
                {ACTIVITY.map((item, i) => (
                  <ActivityCard key={i} item={item} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════ CTA ════════════════ */}
        <section className="py-[128px] px-7 text-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[radial-gradient(ellipse,rgba(124,58,237,0.22)_0%,transparent_68%)] pointer-events-none" />
          <div className="relative z-[2] flex flex-col items-center gap-[22px]">
            <span className="font-outfit text-[10px] font-bold tracking-[0.18em] uppercase text-gl-violet-light inline-flex items-center gap-2.5 before:content-[''] before:inline-block before:w-5 before:h-px before:bg-gl-violet">Ready to start?</span>
            <h2 className="font-bebas text-[clamp(52px,8vw,100px)] text-gl-text m-0 leading-[0.9]">
              Start your<br />GameLog today.
            </h2>
            <p className="font-outfit text-[16px] text-gl-subtext m-0">
              Free forever. No credit card. Just you and your games.
            </p>
            <button
              className="font-outfit text-[15px] font-semibold text-white bg-gradient-to-br from-gl-violet to-[#5B21B6] border-none cursor-pointer px-7 py-[14px] rounded-[10px] inline-flex items-center gap-2 transition-all shadow-[0_0_32px_rgba(124,58,237,0.35),0_4px_16px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:shadow-[0_0_52px_rgba(124,58,237,0.55),0_8px_24px_rgba(0,0,0,0.35)]"
              style={{ fontSize: 16, padding: "16px 36px" }}
              onClick={() => router.push("/register")}
            >
              Create your GameLog <ChevronRight size={18} />
            </button>
          </div>
        </section>

        {/* ════════════════ FOOTER ════════════════ */}
        <footer className="border-t border-gl-border py-9 px-7">
          <div className="max-w-[1280px] mx-auto flex items-center justify-between flex-wrap gap-5">
            <div className="flex items-center gap-2.5 no-underline flex-shrink-0">
              <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-gl-violet to-[#5B21B6] flex items-center justify-center flex-shrink-0" style={{ width: 28, height: 28, borderRadius: 7 }}>
                <Gamepad2 size={14} color="#fff" />
              </div>
              <span className="font-outfit font-bold text-lg text-gl-text tracking-[-0.025em]" style={{ fontSize: 15 }}>GameLog</span>
            </div>

            <div className="flex gap-7 flex-wrap">
              {FOOTER_LINKS.map(([label, href]) => (
                <a key={label} href={href} className="font-outfit text-[13px] text-gl-muted no-underline transition-colors hover:text-gl-subtext">{label}</a>
              ))}
            </div>

            <p className="font-outfit text-[12px] text-gl-muted m-0">© 2025 GameLog · Track the journey.</p>
          </div>
        </footer>

    </div>
  );
});
