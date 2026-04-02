# ArcadeHub

> **Live Demo:** https://arcade-hub-woad.vercel.app/
> **Repository:** https://github.com/NickCh11/ArcadeHub

A dark-themed multiplayer gaming platform built with vanilla HTML, Tailwind CSS, and Supabase. Players can register, authenticate via Google OAuth, and browse upcoming game categories — with full multiplayer support on the roadmap.

## Features

- **Authentication** — Email/password sign-up & login with validation, password reset via email link
- **Google OAuth** — One-click sign-in with Google; Google-managed accounts are handled separately (no password change)
- **User Profiles** — Custom display name, avatar upload (stored in Supabase Storage), bio
- **Game Categories** — Action, RPG, Strategy, Puzzle, Sports, Arcade *(coming soon)*
- **Multiplayer** — Real-time game rooms and lobbies powered by Supabase Realtime *(coming soon)*
- **Responsive UI** — Mobile-first layout with a collapsible sidebar and glassmorphism design

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, Tailwind CSS (CDN), vanilla JS |
| Backend / Auth | [Supabase](https://supabase.com) (Auth, Database, Storage, Realtime) |
| OAuth Provider | Google |
| Fonts | Syne (display), DM Sans (body) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (for the local dev server)
- A Supabase project (already configured — see `index.html`)

### Run locally

```bash
# Install dependencies (Puppeteer for screenshots)
npm install

# Start the dev server at http://localhost:3000
node serve.mjs
```

### Take a screenshot

```bash
node screenshot.mjs http://localhost:3000
# Saves to ./temporary screenshots/screenshot-N.png
```

## Project Structure

```
/
├── index.html          # Entire app — markup, styles, and logic
├── serve.mjs           # Local dev server (port 3000)
├── screenshot.mjs      # Puppeteer screenshot utility
├── package.json
└── README.md
```

## Roadmap

- [ ] Live multiplayer game rooms (Supabase Realtime)
- [ ] Leaderboards & player stats
- [ ] In-game chat
- [ ] Action / RPG / Strategy / Puzzle / Sports / Arcade games
- [ ] Friend system & invites
- [ ] Discord OAuth

## License

MIT
