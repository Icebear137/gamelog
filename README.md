# GameLog

A social platform for tracking your game library, discovering new games, and chatting with friends.

## Features

**Library & Games**
- Track games with statuses: Playing, Completed, Dropped, Want to Play
- Rate, review, and log playtime per platform
- Yearly challenge — set a completion goal and track progress
- Personal game lists (public/private)
- Achievements system

**Social**
- Follow other players and see their activity in a feed
- Like and comment on activity posts
- Discover players and trending games
- Compare game libraries with friends

**Messaging**
- Direct messages and group chats
- Image, voice message, and game card sharing
- Reply, forward, and react to messages
- Pinned messages with click-to-scroll banner
- Group chat: custom avatar, rename, member nicknames, admin roles, kick members
- Typing indicators (stacked avatars in group chats)
- Seen receipts showing each member's avatar (like Facebook Messenger)
- Real-time via Socket.io

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| State / Data | TanStack Query, Zustand |
| UI | Radix UI, Lucide React |
| Backend | Node.js, Express 5, TypeScript |
| Database | SQLite via Prisma ORM |
| Real-time | Socket.io |
| Media | Cloudinary |
| Auth | JWT (httpOnly cookie) |

## Project Structure

```
new-app/
├── backend/          # Express API + Socket.io server
│   ├── prisma/       # Schema, migrations, seed
│   └── src/
│       ├── lib/      # Prisma client, Socket.io, Cloudinary
│       ├── middleware/
│       └── routes/
└── frontend/         # Next.js App Router
    └── src/
        ├── app/      # Pages (App Router)
        ├── components/
        └── lib/      # API client, auth context, types, utils
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Cloudinary](https://cloudinary.com) account (free tier works)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in JWT_SECRET, CLOUDINARY_*, DATABASE_URL
npx prisma migrate dev
npm run dev            # starts on :3001
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:3001
npm run dev                  # starts on :3000
```

### Environment variables

**backend/.env**
```
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET=your_secret_here
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FRONTEND_URL=http://localhost:3000
```

**frontend/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Database

```bash
# Create / apply migrations
npm run db:migrate

# Open Prisma Studio (GUI)
npm run db:studio

# Seed with sample data
npm run db:seed
```
