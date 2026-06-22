# Mindspace Calendar · Prototype 2

**Open-source UX proposal for Google Calendar mobile** — let users choose how their calendar looks instead of forcing auto-generated month illustrations.

[![Live demo](https://img.shields.io/badge/demo-live-1a73e8?style=flat-square)](https://custom-mindspace-calendar.vercel.app)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

## The problem

Google Calendar on mobile assigns a decorative month banner (kites, blobs, clip art) with **no way to opt out or pick your own look**. The calendar works; the visual identity does not belong to the user.

## The proposal

Give people **swappable calendar skins** — same events, same Google Calendar data, different aesthetic. This prototype shows what that could feel like on a phone-sized mockup.

## Live demo

**https://custom-mindspace-calendar.vercel.app**

1. Pick a theme in the carousel above the phone mockup.
2. Optionally tap **Connect** to load your real Google Calendar events (read-only).
3. Compare how the same month reads in each skin.

## Themes

| Theme | Vibe |
|-------|------|
| **Minimal** | Clean white — no illustrations |
| **Star Wars** | Starfield, yellow crawl typography |
| **Tron** | Black canvas + cyan neon grid |
| **Nebula** | Cosmic purple / pink gradients |
| **Code Nerd** | Terminal / GitHub dark |

## Project structure

```
├── index.html          # Landing + phone mockup shell
├── app.js              # Calendar renderer, Google OAuth, style switching
├── styles.js           # Theme definitions (CALENDAR_STYLES)
├── config.example.js   # Google credentials template (copy → config.js)
├── scripts/
│   └── generate-config.mjs   # Vercel build: copies assets → public/
├── vercel.json         # Build command + output directory
└── public/             # Build output (generated, not committed)
```

Vanilla HTML/CSS/JS — no bundler, no framework. Tailwind via CDN for the outer chrome only; the phone calendar is inline-styled per theme.

## Run locally

```bash
cp config.example.js config.js
# Edit config.js with your Google Cloud credentials
npx serve . -l 3000
```

Open `http://localhost:3000`. OAuth requires HTTP — opening `index.html` as a file will not work.

### Google Cloud setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Google Calendar API**.
3. Create credentials:
   - **API key** — restrict to Calendar API + your HTTP referrers.
   - **OAuth 2.0 Client ID** (Web) — add authorized JavaScript origins:
     - `http://localhost:3000` (or your local port)
     - `https://your-production-domain.vercel.app`
4. Paste both values into `config.js`.

Scope used: `calendar.events.readonly` — events only, no write access.

## Deploy on Vercel

```bash
vercel
```

Set environment variables in the Vercel dashboard:

| Variable | Value |
|----------|-------|
| `GOOGLE_CLIENT_ID` | OAuth Web client ID |
| `GOOGLE_API_KEY` | Restricted API key |

The build script writes `public/config.js` from those vars and copies static assets into `public/` for deployment.

## Who this is for

- **Google Calendar PMs / designers** — a concrete “what if users could choose?” reference.
- **Developers** — a minimal forkable demo of Calendar API + theme switching.
- **Anyone annoyed by the kite** — you are not alone.

## Disclaimer

Not affiliated with Google, Lucasfilm, Disney, or Tron. Fan-style themes are for demonstration only. This is a personal UX critique packaged as working code, not a Google product.

## License

MIT — see [LICENSE](LICENSE).
