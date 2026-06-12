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
    floatClass: "gl-card-float-a",
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
    floatClass: "gl-card-float-b",
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
    floatClass: "gl-card-float-c",
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
      className={`gl-game-card ${card.floatClass}`}
      style={{ top: card.top, right: card.right, zIndex: card.zIndex, position: "absolute" }}
    >
      <div className="gl-card-cover" style={{ background: card.coverGrad }}>
        <div className="gl-card-cover-shade" />
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

      <div className="gl-card-body">
        <p className="gl-card-title">{card.title}</p>
        <p className="gl-card-studio">{card.studio}</p>
        <div className="gl-card-meta">
          <span className="gl-status-pill" style={{
            color: card.statusColor,
            background: card.statusBg,
            borderColor: card.statusBorder,
          }}>
            {card.status}
          </span>
          {card.rating && (
            <span className="gl-card-rating">
              <Star size={10} fill="#F59E0B" color="#F59E0B" />
              {card.rating}
            </span>
          )}
        </div>
        <p className="gl-card-quote">{card.quote}</p>
        <p className="gl-card-user">— @{card.user}</p>
      </div>
    </div>
  );
}

function FeatureCard({ feat }: { feat: typeof FEATURES[number] }) {
  const Icon = feat.icon;
  return (
    <div className="gl-feat-card">
      <div className="gl-feat-icon" style={{ background: feat.bg }}>
        <Icon size={21} color={feat.color} />
      </div>
      <h3 className="gl-feat-title">{feat.title}</h3>
      <p className="gl-feat-desc">{feat.desc}</p>
    </div>
  );
}

function ActivityCard({ item }: { item: typeof ACTIVITY[number] }) {
  return (
    <div className="gl-activity-card">
      <div className="gl-activity-avatar" style={{ background: item.bg }}>
        {item.avatar}
      </div>
      <div className="gl-activity-body">
        <p className="gl-activity-text">
          <span className="gl-activity-acc">@{item.user}</span>
          {" "}
          <span>{item.action}</span>
          {" "}
          <span className="gl-activity-game">{item.game}</span>
          {item.rating && (
            <span className="gl-activity-rating"> ★ {item.rating}</span>
          )}
        </p>
      </div>
      <span className="gl-activity-time">{item.time}</span>
    </div>
  );
}

// ── Main landing page ──────────────────────────────────────────────────────────

export default memo(function LandingPage() {
  const router = useRouter();

  return (
    <div className="gl-root">

        {/* ════════════════ HERO ════════════════ */}
        <section className="gl-hero">
          {/* Background layers */}
          <div className="gl-hero-bg">
            <div className="gl-orb gl-orb-1" />
            <div className="gl-orb gl-orb-2" />
            <div className="gl-orb gl-orb-3" />
            <div className="gl-grid-bg" />
          </div>

          <div className="gl-hero-inner">
            {/* ── Left column ── */}
            <div className="gl-hero-left">
              <span className="gl-eyebrow">
                <Zap size={10} />
                The social gaming journal
              </span>

              <h1 className="gl-headline">
                <span className="gl-headline-line">Your Games.</span>
                <span className="gl-headline-line">Your</span>
                <span className="gl-headline-line gl-headline-accent">Story.</span>
              </h1>

              <p className="gl-hero-sub">
                Log every game you play, rate what you love, write reviews, and discover
                what friends are playing — all in one beautifully obsessive journal.
              </p>

              <div className="gl-cta-group">
                <button className="gl-btn-cta" onClick={() => router.push("/register")}>
                  Start tracking free <ChevronRight size={16} />
                </button>
                <button className="gl-btn-outline" onClick={() => router.push("/discover")}>
                  Browse games
                </button>
              </div>

              <div className="gl-stats">
                {STATS.map((s) => (
                  <div key={s.label} className="gl-stat-item">
                    <span className="gl-stat-val">{s.value}</span>
                    <span className="gl-stat-lbl">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right column: floating game cards ── */}
            <div className="gl-hero-right">
              {GAME_CARDS.map((card) => (
                <GameCard key={card.id} card={card} />
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════ MARQUEE ════════════════ */}
        <div className="gl-marquee-wrap">
          <div className="gl-marquee-track">
            {[...MARQUEE_GAMES, ...MARQUEE_GAMES].map((g, i) => (
              <span key={i} className="gl-marquee-item">
                {g}
                <span className="gl-marquee-sep">★</span>
              </span>
            ))}
          </div>
        </div>

        {/* ════════════════ FEATURES ════════════════ */}
        <section className="gl-features-section">
          <div className="gl-section-inner">
            <div className="gl-section-header">
              <span className="gl-eyebrow">Everything you need</span>
              <h2 className="gl-section-title">Built for serious players</h2>
              <p className="gl-section-sub">
                Not just a tracker. A full social platform for gaming culture.
              </p>
            </div>
            <div className="gl-features-grid">
              {FEATURES.map((f) => (
                <FeatureCard key={f.title} feat={f} />
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════ ACTIVITY PREVIEW ════════════════ */}
        <section className="gl-activity-section">
          <div className="gl-section-inner">
            <div className="gl-activity-layout">
              <div className="gl-activity-left">
                <span className="gl-eyebrow">Live activity</span>
                <h2
                  className="gl-section-title"
                  style={{ textAlign: "left", marginTop: 16 }}
                >
                  What's being<br />logged right now
                </h2>
                <p
                  className="gl-section-sub"
                  style={{ textAlign: "left", marginTop: 18 }}
                >
                  Join thousands of players documenting their gaming journeys in real time.
                </p>
                <button
                  className="gl-btn-cta"
                  style={{ marginTop: 36, alignSelf: "flex-start" }}
                  onClick={() => router.push("/register")}
                >
                  Join the community <ChevronRight size={16} />
                </button>
              </div>

              <div className="gl-activity-feed">
                {ACTIVITY.map((item, i) => (
                  <ActivityCard key={i} item={item} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════ CTA ════════════════ */}
        <section className="gl-cta-section">
          <div className="gl-cta-glow" />
          <div className="gl-cta-inner">
            <span className="gl-eyebrow">Ready to start?</span>
            <h2 className="gl-cta-title">
              Start your<br />GameLog today.
            </h2>
            <p className="gl-cta-sub">
              Free forever. No credit card. Just you and your games.
            </p>
            <button
              className="gl-btn-cta"
              style={{ fontSize: 16, padding: "16px 36px" }}
              onClick={() => router.push("/register")}
            >
              Create your GameLog <ChevronRight size={18} />
            </button>
          </div>
        </section>

        {/* ════════════════ FOOTER ════════════════ */}
        <footer className="gl-footer">
          <div className="gl-footer-inner">
            <div className="gl-logo">
              <div className="gl-logo-icon" style={{ width: 28, height: 28, borderRadius: 7 }}>
                <Gamepad2 size={14} color="#fff" />
              </div>
              <span className="gl-logo-text" style={{ fontSize: 15 }}>GameLog</span>
            </div>

            <div className="gl-footer-links">
              {FOOTER_LINKS.map(([label, href]) => (
                <a key={label} href={href} className="gl-footer-link">{label}</a>
              ))}
            </div>

            <p className="gl-footer-copy">© 2025 GameLog · Track the journey.</p>
          </div>
        </footer>

    </div>
  );
});
