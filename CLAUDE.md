# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Workspace Overview

**ArcadeHub** is a full-stack gaming platform with public chat rooms and end-to-end encrypted direct messages.

| Layer | Stack |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 - lives in `frontend/` |
| Backend | Node.js + Express + Socket.IO + Redis - lives in `backend/` |
| Shared types | TypeScript interfaces - lives in `shared/types/` |
| Database | Supabase (PostgreSQL) project ref `lhwvcwakbcegwknvezpe` |
| Real-time | Redis via `docker-compose up -d`, then `npm run dev` from root |

## Available Skills

Invoke these before the relevant work, every session:

| Skill | When to invoke |
|---|---|
| `frontend-design` | Before any frontend code, no exceptions |
| `web-design-guidelines` | When auditing existing UI for compliance |
| `database-schema-designer` | When designing or refactoring a DB schema |

## Always Do First

- Invoke the `frontend-design` skill before writing any frontend code.

## Local Development

```bash
docker-compose up -d          # Redis on :6379
npm run dev                   # Backend :4000 + Frontend :3000
```

## Screenshot Workflow

- Puppeteer is installed.
- Chrome path is hardcoded in `screenshot.mjs`; update it if Chrome moves.
- Always screenshot from localhost: `node screenshot.mjs http://localhost:3000`
- Screenshots are saved to `./temporary screenshots/screenshot-N.png`
- Optional label: `node screenshot.mjs http://localhost:3000 label`
- After screenshotting, read the PNG and compare visually.
- Be specific when comparing spacing, scale, and visual hierarchy.

## Database Work

- Use `mcp__supabase__*` tools for schema work.
- Always use `apply_migration` for DDL, never raw SQL for schema changes.
- RLS is enabled on all tables.
- The backend uses the service role key to bypass RLS for writes.

## Chat Architecture

### Public Rooms (group chat)
- All rooms are **public** — any authenticated user can join and create rooms.
- Messages stored as plaintext in `group_messages.plaintext`.
- Socket flow: `JOIN_ROOM` → `SEND_PUBLIC_MESSAGE` → `NEW_PUBLIC_MESSAGE`
- Room creation: `room:create_public` permission — all roles including `user` have it.
- Members list built from live socket presence (`GET /api/rooms/:roomId/members`).
- Real-time join/leave via `USER_JOINED_ROOM` / `USER_LEFT_ROOM` events.

### Direct Messages (DMs)
- **E2E encrypted** — ephemeral ECDH P-256 per message → HKDF → AES-256-GCM.
- Server never sees plaintext.
- On first login, `bootstrapUserKeys` generates an ECDH key pair, stores private key in IndexedDB, and uploads the public key via `PUT /api/users/me/public-key`.

### Removed systems (do not re-introduce)
- Private chatrooms, invite system, key wrapping, key rotation, member management.
- RSA keys (were used for group key wrapping — no longer needed).
- `room_invites`, `key_rotation_events`, `chatroom_members` table usage.

## Frontend Source Of Truth

- `frontend/app/layout.tsx` mounts `ChatOverlay` and `DMOverlay` globally via `OverlayProviders`.
- `frontend/components/chat/ChatOverlay.tsx` — public rooms UI (channels · messages · members panels).
- `frontend/components/chat/DMOverlay.tsx` — E2E encrypted DM UI.

## ArcadeHub Design Tokens

Defined in `frontend/app/globals.css` as CSS custom properties.

**Surface layers**

- `--color-base` → `#070711`
- `--color-surface` → `#0d0d1f`
- `--color-elevated` → `#14142a`
- `--color-floating` → `#1a1a35`

**Typography**

- Display/headings: `Syne` (600-800), CSS var `--font-display`
- Body: `DM Sans` (300-600), CSS var `--font-sans`

**Brand**

- Primary accent: `#8b5cf6`
- Do not introduce a second accent color without explicit reason.

**Utility classes**

- `.glass`
- `.glass-elevated`
- `.e2e-badge`
- `.animate-blob`
- `.animate-fade-in`
- `.animate-slide-up`

## Crypto Architecture

All crypto runs client-side with the Web Crypto API. The server never sees plaintext.

- **DMs**: per-message ephemeral ECDH P-256 → HKDF → AES-256-GCM
- **Key storage**: ECDH private key in IndexedDB only, never transmitted
- **Public key upload**: `PUT /api/users/me/public-key` sends `ecdhPublicKey` only
- **Replay protection**: Redis tracks message UUIDs for 24 hours plus a 5-minute timestamp window
- **Rate limits**: configured in `backend/src/middleware/rateLimit.ts`

## Key Files

- `frontend/lib/crypto/directMessage.ts` — DM E2E encryption
- `frontend/lib/crypto/keyStorage.ts` — IndexedDB key storage (ECDH keys only)
- `frontend/lib/auth/bootstrapKeys.ts` — ECDH key generation on login
- `frontend/components/chat/ChatOverlay.tsx` — public rooms chat UI
- `frontend/components/chat/DMOverlay.tsx` — DM chat UI
- `backend/src/socket/groupChat.ts` — public room socket handlers
- `backend/src/socket/directMessage.ts` — DM socket handlers
- `backend/src/middleware/rateLimit.ts` — rate limits & replay protection
- `shared/types/events.ts` — all socket event names and payload types
- `shared/types/permissions.ts` — role-based permissions

## Anti-Generic Guardrails

- Do not use `transition-all`
- Do not use default Tailwind blue or indigo as the primary color
- Use ArcadeHub tokens rather than the default Tailwind palette
- Use Syne for headings and DM Sans for body copy
- Keep depth consistent with the base → surface → elevated → floating layer system
- Animate only `transform` and `opacity` where possible

## Hard Rules

- Do not change the DM crypto design without explicit user instruction
- Do not store private keys anywhere other than IndexedDB
- Do not reference `zoom: 1.33` anywhere except `globals.css`
- All chat rooms are public — do not re-introduce private room logic
