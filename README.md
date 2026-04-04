# ArcadeHub

> **Repository:** https://github.com/NickCh11/ArcadeHub

A dark-themed gaming platform with public chat rooms and end-to-end encrypted direct messages.

## Features

- **Public Chat Rooms** - Create and join public channels. Messages are delivered in real-time via Socket.IO. Any authenticated user can create a room.
- **Live Members Panel** - See who's currently in a room, grouped by online / away / offline status. Updates instantly on join and leave.
- **E2E Encrypted DMs** - Per-message forward secrecy via ephemeral ECDH P-256, HKDF, and AES-256-GCM. The server never sees plaintext.
- **Floating Chat Overlays** - Chat and DMs open as draggable floating windows over any page.
- **Replay Attack Protection** - Every message carries a UUID tracked in Redis with a 24h TTL plus a 5-minute timestamp window.
- **Rate Limiting** - Messages are limited per user via Redis-based counters.
- **Crypto Keys in Browser Only** - ECDH private keys are generated locally and stored in IndexedDB as non-exportable `CryptoKey` objects. Never transmitted.
- **Real-time Presence** - Socket.IO and Redis track online, away, and offline status across all users.
- **Authentication** - Supabase Auth with email/password and Google OAuth.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend | Node.js, Express, Socket.IO |
| Real-time / Cache | Redis (ioredis) |
| Database / Auth | Supabase (PostgreSQL, Auth) |
| Cryptography | Web Crypto API (browser-side only) |
| Fonts | Syne (display), DM Sans (body) |

## Project Structure

```text
arcadehub/
├── frontend/                   # Next.js 16 App Router
│   ├── app/
│   │   ├── page.tsx            # Home / landing
│   │   ├── (auth)/             # login, signup
│   │   └── layout.tsx          # Mounts global chat + DM overlays
│   ├── components/
│   │   ├── chat/               # ChatOverlay, DMOverlay, overlays context
│   │   └── layout/             # Sidebar, NavUserButton
│   ├── hooks/                  # useSocket, useDirectMessage
│   └── lib/
│       ├── crypto/             # directMessage.ts, keyStorage.ts
│       ├── socket.ts           # Socket.IO client singleton
│       └── supabase.ts         # Supabase browser client
├── backend/
│   └── src/
│       ├── socket/             # groupChat.ts, directMessage.ts handlers
│       ├── routes/             # /api/rooms, /api/users, /api/dm
│       ├── redis/              # client.ts, presence.ts
│       └── db/                 # Supabase queries (messages, rooms, users)
├── shared/types/               # Shared TS interfaces (events, messages, permissions)
├── docker-compose.yml          # Redis service
└── screenshot.mjs              # Puppeteer screenshot utility
```

## Frontend Architecture

- `frontend/app/layout.tsx` mounts `ChatOverlay` and `DMOverlay` globally via `OverlayProviders`.
- `ChatOverlay` — three-column layout: channels list · message bubbles · live members panel.
- `DMOverlay` — E2E encrypted 1-on-1 conversations.
- Both overlays are draggable, minimizable floating windows.

## Crypto Design

### DMs

1. Each user has a static `ECDH P-256` key pair stored in IndexedDB. The public key is uploaded to the server on first login.
2. Each message uses a fresh ephemeral `ECDH P-256` key pair.
3. Shared secrets are derived with ECDH, expanded with HKDF, and encrypted with `AES-256-GCM`.
4. The ephemeral private key is discarded immediately after encryption.
5. The server stores ciphertext (for recipient and sender) plus the ephemeral public key only.

### Public Rooms

Messages are plaintext — no encryption. Security properties are replay protection, rate limiting, and timestamp freshness checks.

## Getting Started

### Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Docker](https://www.docker.com/) for Redis
- A Supabase project

### Environment Variables

**`backend/.env`**

```env
PORT=4000
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
REDIS_URL=redis://localhost:6379
SUPABASE_JWT_SECRET=<jwt_secret>
FRONTEND_URL=http://localhost:3000
```

**`frontend/.env.local`**

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### Run Locally

```bash
# 1. Start Redis
docker-compose up -d

# 2. Install all dependencies
npm run install:all

# 3. Start backend + frontend concurrently
npm run dev
```

- Backend: `http://localhost:4000`
- Frontend: `http://localhost:3000`

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | User profiles, ECDH public key, role, status |
| `chatrooms` | Public chat rooms |
| `group_messages` | Plaintext messages for public rooms |
| `direct_messages` | E2E encrypted DMs |

## Security Properties

| Threat | Mitigation |
|---|---|
| Server reads DMs | All DM crypto happens client-side; server only stores ciphertext |
| Replay attacks | Redis UUID tracking + timestamp freshness window |
| Message tampering | AES-GCM authentication tag |
| Past session compromise | Ephemeral keys per DM message |
| Rate abuse | Redis-based per-user message limits |
| Public key upload abuse | Base64 and byte-length validation |

## Roadmap

- [ ] File attachments
- [ ] Message reactions
- [ ] Leaderboards and player stats
- [ ] Real-time multiplayer game rooms
- [ ] Friend system
- [ ] Mobile PWA

## License

MIT
