# ArcadeHub

> **Repository:** https://github.com/NickCh11/ArcadeHub

A dark-themed gaming platform with end-to-end encrypted chat for private rooms and direct messages, designed so the server never sees plaintext.

## Features

- **E2E Encrypted Group Chat** - AES-256-GCM symmetric encryption with RSA-OAEP key wrapping. When a new member joins, an online existing member wraps the current group key for them, so historical messages remain readable.
- **E2E Encrypted DMs** - Per-message forward secrecy via ephemeral ECDH P-256, HKDF, and AES-256-GCM.
- **Floating Chat Overlay** - Chat opens as a draggable floating window over any page instead of taking over the whole screen.
- **Overlay-First Frontend** - The floating overlays are the only supported chat UI. Legacy full-page chat routes have been removed from the repo.
- **Replay Attack Protection** - Every message carries a UUID tracked in Redis with a 24h TTL.
- **Rate Limiting** - Group messages are limited to 100/min per user, and room join requests to 3/min per user.
- **Crypto Keys in Browser Only** - Private keys are generated locally and stored in IndexedDB as non-exportable `CryptoKey` objects.
- **Real-time Presence** - Socket.IO and Redis track online, away, and offline status.
- **Authentication** - Supabase Auth supports email/password and Google OAuth.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend | Node.js, Express, Socket.IO |
| Real-time / Cache | Redis (ioredis) |
| Database / Auth | Supabase (PostgreSQL, Auth, Storage) |
| Cryptography | Web Crypto API (browser-side only) |
| Fonts | Syne (display), DM Sans (body) |

## Project Structure

```text
arcadehub/
|-- frontend/                   # Next.js 16 App Router
|   |-- app/
|   |   |-- page.tsx            # Home / landing
|   |   |-- (auth)/             # login, signup
|   |   `-- layout.tsx          # Mounts global floating chat + DM overlays
|   |-- components/             # Sidebar, overlay chat UI, shared UI
|   |-- hooks/                  # useSocket, useGroupChat, useDirectMessage
|   `-- lib/
|       |-- crypto/             # groupChat.ts, directMessage.ts, keyStorage.ts
|       |-- socket.ts           # Socket.IO client singleton
|       `-- supabase.ts         # Supabase browser client
|-- backend/                    # Node.js + Express + Socket.IO
|   `-- src/
|       |-- socket/             # groupChat.ts, directMessage.ts handlers
|       |-- routes/             # /api/rooms, /api/users, /api/dm
|       |-- redis/              # client.ts, presence.ts
|       `-- db/                 # Supabase queries (messages, rooms, users)
|-- shared/types/               # Shared TS interfaces (events, messages)
|-- docker-compose.yml          # Redis service
`-- screenshot.mjs              # Puppeteer screenshot utility
```

## Frontend Architecture

- The canonical chat experience is overlay-based.
- `frontend/app/layout.tsx` mounts `ChatOverlay` and `DMOverlay` globally.
- `frontend/components/chat/ChatOverlay.tsx` handles rooms and room invites.
- `frontend/components/chat/DMOverlay.tsx` handles direct messages.
- Legacy full-page chat routes under `frontend/app/chat/**` were removed to avoid duplicate UI paths.

## Crypto Design

### Group Chat

1. On room creation, an `AES-256-GCM` group key is generated client-side.
2. The group key is RSA-wrapped with each member's public key and stored server-side.
3. On join, an online existing member wraps the current group key for the new member. No new group key is generated.
4. Membership is tracked in `chatroom_members.wrapped_group_key`.
5. The server stores ciphertext, nonce, sender metadata, room metadata, and timestamps only.

### Private DMs

1. Each user has a static `ECDH P-256` key pair.
2. Each message uses a fresh ephemeral `ECDH P-256` key pair.
3. Shared secrets are derived with ECDH, expanded with HKDF, and used with `AES-256-GCM`.
4. The ephemeral private key is discarded immediately after encryption.
5. The server stores ciphertext for recipient and sender plus the ephemeral public key.

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

### Screenshot

```bash
node screenshot.mjs http://localhost:3000
```

Screenshots are saved to `./temporary screenshots/`.

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | User profiles and uploaded public keys |
| `chatrooms` | Group chat rooms |
| `chatroom_members` | Room membership and wrapped group keys |
| `group_messages` | Private room ciphertext or public room plaintext |
| `direct_messages` | Encrypted DMs |
| `key_rotation_events` | Key wrap / rotation workflow tracking |
| `room_invites` | Invite workflow for private rooms |

## Security Properties

| Threat | Mitigation |
|---|---|
| Server reads messages | All crypto happens client-side |
| Replay attacks | Redis replay tracking plus timestamp freshness checks |
| Message tampering | AES-GCM authentication and additional authenticated data |
| Past session compromise | Ephemeral keys for DMs |
| Rate abuse | Redis-based per-user limits |
| Public key upload abuse | Base64 and byte-length validation |

## Roadmap

- [ ] File attachments
- [ ] Message reactions
- [ ] Leaderboards and player stats
- [ ] Real-time multiplayer game rooms
- [ ] Friend system and invites
- [ ] Mobile PWA

## License

MIT
