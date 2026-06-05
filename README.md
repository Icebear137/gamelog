# GameLog

A social gaming journal — track your library, write reviews, discover games, chat with friends, and join community clubs.

---

## Features

### 🎮 Library & Game Tracking
- Track games with statuses: **Playing, Completed, Dropped, Want to Play**
- Rate (1–10), write reviews, log playtime and platform per game
- **Replay tracking** — log multiple playthroughs of the same game (NG+, speedruns, etc.)
- **Yearly challenge** — set a completion goal and track progress
- Export library as **CSV or JSON**

### 🔍 Discovery
- Search games via RAWG.io API with genre/year filters
- **New Releases** and **Coming Soon** sections on the home page (auto-slide)
- **Trending games** and **personalized recommendations** based on your library
- Browse games by **community tags** (e.g. relaxing, co-op, difficult)
- **Media gallery** on each game page — screenshots and trailers from RAWG with resize/lightbox

### ⭐ Reviews & Ratings
- Write markdown reviews with spoiler tags
- **Helpful votes** on reviews
- Global community reviews feed with sorting (Recent / Most Helpful)
- Per-game review pages

### 📋 Game Lists
- Create public/private curated game lists
- Like and comment on public lists
- Discover trending lists from the community

### 👥 Social
- Follow other players — see their activity in a personalized feed
- Like and comment on activity posts
- **Compare game libraries** with any user
- **Discover players** based on game overlap
- User profiles: stats, achievements, activity, reviews, lists

### 🏆 Leaderboards
- Weekly / Monthly / All-time rankings
- Categories: Most Completed, Most Reviews, Most Liked

### 🎯 Game Clubs
- Create or join **public communities** around games and genres
- **Rich text posts** (Tiptap editor) — headings, images with resize/align, text alignment, lists, blockquotes, links
- Like, comment, and **emoji reactions** on posts
- Sort posts by Newest / Popular / Trending
- **Admin tools**: pin posts, manage members (kick, ban, unban, promote/demote)
- **Members sidebar** with real-time online status (Socket.io presence)
- Link a game to a club for its cover art

### 💬 Messaging
- **Direct messages** and **group chats**
- File attachments (PDF, ZIP, etc.) with download
- Image (single and multi) and **voice messages** (WaveSurfer.js waveform, volume control)
- **Polls** — multiple choice, anonymous, expiry timer, close manually, view voters
- **Game Night scheduler** — RSVP going/maybe/no
- Reply, forward (all message types), react with emojis
- Pinned messages with click-to-scroll banner
- Message search within a conversation
- Group: custom avatar, rename, member nicknames, admin roles, kick, typing indicators
- Seen receipts showing member avatars
- DM info panel: shared games, shared images, shared files
- Real-time via Socket.io

### 🤖 AI Assistant
- Floating chatbox (Groq / Llama) that answers questions about using the GameLog website
- Context-aware: knows which game page you're on

### ⚙️ Settings & Notifications
- Edit profile: bio, avatar, Steam ID, Discord tag
- **Private profile** toggle
- **Notification preferences**: toggle follow, like, comment, mention notifications individually
- Email notification opt-out
- **Light / Dark mode** toggle (persisted)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript 5 |
| **Styling** | Tailwind CSS v4, Radix UI Themes |
| **State** | TanStack Query v5, Zustand 5 |
| **Rich Text** | Tiptap (Headings, TextAlign, Underline, Link, Resizable Image) |
| **Audio** | WaveSurfer.js (waveform player) |
| **Theme** | next-themes (light/dark) |
| **Backend** | Node.js, Express 5, TypeScript |
| **Database** | SQLite via Prisma ORM |
| **Real-time** | Socket.io (chat, presence, polls, game nights) |
| **Media** | Cloudinary (avatars, images, audio, files) |
| **Games API** | RAWG.io (search, details, screenshots, trailers) |
| **AI** | Groq API (Llama 3.3 70B) |
| **Auth** | JWT (localStorage) |

---

## Project Structure

```
new-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Full DB schema
│   │   ├── migrations/           # Migration history
│   │   └── seed.ts               # Sample data (10 users, 25 games, clubs, reviews, tags)
│   └── src/
│       ├── lib/                  # Prisma, Socket.io, Cloudinary, RAWG, cron
│       ├── middleware/           # JWT auth
│       └── routes/
│           ├── auth.ts
│           ├── users.ts
│           ├── games.ts          # Search, reviews, tags, media (screenshots/trailers)
│           ├── entries.ts        # Library, helpful votes, playthroughs, export
│           ├── feed.ts           # Following feed, global feed, leaderboard
│           ├── activities.ts     # Likes, comments
│           ├── lists.ts          # Game lists, likes, comments
│           ├── clubs.ts          # Game clubs, posts, moderation
│           ├── upload.ts         # General image upload (editor)
│           ├── ai.ts             # Groq chatbot
│           └── messages/         # Chat (conversations, media, polls, game nights)
└── frontend/
    └── src/
        ├── app/                  # Next.js App Router pages
        │   ├── page.tsx          # Home (feed + new releases + upcoming)
        │   ├── discover/         # Game discovery, recommendations, popular tags
        │   ├── library/          # Personal game library with export
        │   ├── game/[rawgId]/    # Game detail (media gallery, tags, playthroughs, reviews, friends)
        │   ├── reviews/          # Global reviews feed
        │   ├── lists/            # Game lists
        │   ├── clubs/            # Game clubs
        │   ├── leaderboard/      # Weekly/monthly rankings
        │   ├── messages/         # Chat
        │   ├── user/[username]/  # User profiles + reviews + stats + compare
        │   ├── settings/         # Profile, notifications, privacy, password
        │   └── ...
        ├── components/           # Shared components
        │   ├── ClubRichEditor.tsx  # Tiptap editor with image resize
        │   ├── ReviewCard.tsx
        │   ├── ActivityCard.tsx
        │   ├── MessageBubble.tsx
        │   ├── AIChatbox.tsx
        │   └── message/          # AudioBubble, FileBubble, PollBubble, ...
        ├── services/             # API service functions (game, user, entry, activity, list)
        ├── constant/             # Centralized constants (api, path, app, env)
        └── lib/                  # API client (axios), auth store, types, utils
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Cloudinary](https://cloudinary.com) account (free tier)
- A [RAWG API key](https://rawg.io/apidocs) (free)
- A [Groq API key](https://console.groq.com) (free, for AI chatbox)

### 1. Backend setup

```bash
cd backend
npm install

# Create .env (see Environment Variables section below)
npx prisma migrate dev
npx tsx prisma/seed.ts   # seed with 10 sample users + 25 games + clubs + reviews

npm run dev              # starts on http://localhost:4000
```

### 2. Frontend setup

```bash
cd frontend
npm install

# Create .env.local (see Environment Variables section below)
npm run dev              # starts on http://localhost:3000
```

---

## Environment Variables

### `backend/.env`

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-at-least-32-chars"
PORT=4000
FRONTEND_URL="http://localhost:3000"

RAWG_API_KEY="your-rawg-key"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Groq AI (optional — chatbox won't work without it)
GROQ_API_KEY="gsk_..."
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

---

## Database

```bash
cd backend

# Apply migrations
npx prisma migrate dev

# Open Prisma Studio (GUI)
npx prisma studio

# Seed sample data
npx tsx prisma/seed.ts
```

**Seed includes:**
- 10 users (xvinhgaming, sakura_plays, loot_goblin, soulsaddict, nhan_minh, pro_strats, kazuki_gamer, indie_queen, rpg_master, speedster_99)
- 25 games fetched from RAWG (Elden Ring, Witcher 3, BG3, Hollow Knight, etc.)
- Game libraries, follows, likes, comments, reviews, tags
- 5 game clubs with posts, reactions, and members
- Playthroughs for key users
- All accounts use password: `password123`

---

## Key API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/games/search` | Search games |
| `GET` | `/api/games/:id/screenshots` | RAWG screenshots |
| `GET` | `/api/games/:id/movies` | RAWG trailers |
| `GET` | `/api/games/reviews` | Global reviews feed |
| `POST` | `/api/entries` | Add/update library entry |
| `GET` | `/api/entries/export?format=csv\|json` | Export library |
| `GET` | `/api/feed/leaderboard` | Rankings |
| `GET\|POST` | `/api/clubs` | List / create clubs |
| `POST` | `/api/clubs/:id/posts` | Create club post |
| `POST` | `/api/upload/image` | Upload image for editor |
| `POST` | `/api/ai/chat` | Groq AI chatbox (SSE streaming) |
| `GET` | `/api/messages/conversations` | List conversations |

---

## Development Notes

- **Socket.io rooms**: `user:<userId>` (personal), `conv:<conversationId>` (chat)
- **Presence**: tracked via in-memory `onlineCounts` Map; `lastSeen` updated on disconnect
- **RAWG cache**: New Releases and Upcoming are cached in-memory for 1 hour
- **Light/Dark mode**: `next-themes` with `class` strategy; defaults to dark
- **Tiptap images**: custom NodeView with `data-align` and `width` attributes; margin-based alignment (no float)
