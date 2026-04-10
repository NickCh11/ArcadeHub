# ArcadeHub

> Repository: https://github.com/NickCh11/ArcadeHub
> Live Deployment: https://scintillating-determination-production-ec9e.up.railway.app/

A dark-themed gaming platform with public chat rooms, end-to-end encrypted direct messages, and real-time multiplayer billiards.

## Features

- Public Chat Rooms: Create and join public channels with live messages over Socket.IO.
- Live Members Panel: See room members grouped by online, away, and offline status in real time.
- E2E Encrypted DMs: Direct messages use browser-side crypto so the server never sees plaintext.
- Floating Chat Overlays: Public chat and DMs open as draggable floating windows.
- Real-time Presence: Socket.IO and Redis track online state across users.
- Authentication: Supabase Auth with email/password and Google OAuth.
- Multiplayer Billiards: Two-player 8-ball lobbies with synchronized game state.
- Match Start / End Controls: Both players must press `START` before a match begins. Pressing `END`, closing the game, or disconnecting counts as a forfeit.
- Game Logs: Billiards matches are stored with winner, loser, and end reason in the database.
- Attached Game Chat: The billiards chat is docked to the game panel and closes automatically when the match ends or is cancelled.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Backend | Node.js, Express, Socket.IO |
| Real-time / Cache | Redis |
| Database / Auth | Supabase (PostgreSQL, Auth) |
| Cryptography | Web Crypto API |

## Project Structure

```text
arcadehub/
|- frontend/                 # Next.js app
|  |- app/                   # app router pages and layout
|  |- components/            # chat, games, profile, layout UI
|  |- hooks/                 # custom React hooks
|  `- lib/                   # socket, supabase, crypto helpers
|- backend/
|  `- src/
|     |- db/                 # Supabase queries including game logs
|     |- middleware/         # auth and socket middleware
|     |- redis/              # Redis presence and client helpers
|     |- routes/             # REST API routes
|     `- socket/             # chat, DM, and billiards socket handlers
|- shared/types/             # shared TypeScript contracts
|- games/                    # legacy / standalone game code
`- docker-compose.yml        # local Redis service
```

## Frontend Architecture

- `frontend/app/layout.tsx` mounts the overlay providers globally.
- `frontend/components/chat/` contains the public chat and DM overlays.
- `frontend/components/games/` contains the billiards lobby flow, attached game chat, and in-match UI.
- The billiards game panel and game chat move together as one attached window.

## Billiards Flow

1. A player creates or joins an `8-Ball Pool` lobby.
2. Both players must press `START` before the match begins.
3. When the match starts, a `game_logs` row is created for the session.
4. A normal win finalizes the log with `end_reason = win`.
5. Pressing `END`, closing the game window, or disconnecting finalizes the log with `end_reason = forfeit`.
6. The attached game chat closes automatically when the match ends or the lobby is cancelled.

## Crypto Design

### DMs

1. Each user has a static `ECDH P-256` key pair stored in IndexedDB.
2. Each message uses a fresh ephemeral `ECDH P-256` key pair.
3. Shared secrets are derived with ECDH, expanded with HKDF, and encrypted with `AES-256-GCM`.
4. The ephemeral private key is discarded immediately after encryption.
5. The server stores ciphertext plus the ephemeral public key only.

### Public Rooms

Public room messages are plaintext. Protection focuses on replay protection, rate limiting, and timestamp freshness checks.

## Getting Started

### Prerequisites

- Node.js 18+
- Docker for Redis
- A Supabase project

### Environment Variables

`backend/.env`

```env
PORT=4000
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
REDIS_URL=redis://localhost:6379
SUPABASE_JWT_SECRET=<jwt_secret>
FRONTEND_URL=http://localhost:3000
```

`frontend/.env.local`

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

# 3. Start backend + frontend
npm run dev
```

- Backend: `http://localhost:4000`
- Frontend: `http://localhost:3000`

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | User profiles, ECDH public key, role, status |
| `chatrooms` | Public chat rooms |
| `group_messages` | Plaintext room messages |
| `direct_messages` | E2E encrypted direct messages |
| `game_logs` | Multiplayer match sessions, result, and end reason |

## Security Properties

| Threat | Mitigation |
|---|---|
| Server reads DMs | All DM crypto happens client-side |
| Replay attacks | Redis UUID tracking plus timestamp freshness checks |
| Message tampering | AES-GCM authentication tag |
| Past session compromise | Ephemeral keys per DM message |
| Rate abuse | Redis-based per-user message limits |

## Roadmap

- File attachments
- Message reactions
- Leaderboards and player stats
- More real-time multiplayer game rooms
- Friend system
- Mobile PWA

## License

MIT
