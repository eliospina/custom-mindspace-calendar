# Mindspace Calendar

Open-source UX proposal: **user-chosen calendar skins** for Google Calendar mobile.

[![Live demo](https://img.shields.io/badge/demo-live-1a73e8?style=flat-square)](https://custom-mindspace-calendar.vercel.app)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

**[custom-mindspace-calendar.vercel.app](https://custom-mindspace-calendar.vercel.app)** — try every skin in the browser. No sign-in. No data collected.

---

## Proposal

Google Calendar mobile applies a decorative month banner users cannot change. Scheduling works; visual identity does not.

Mindspace shows an alternative: the same calendar structure with **swappable skins** — minimal, cinematic, neon, cosmic, terminal — in a phone-sized interface.

| Minimal | Star Wars | Tron |
|:---:|:---:|:---:|
| ![Minimal](docs/theme-minimal.png) | ![Star Wars](docs/theme-starwars.png) | ![Tron](docs/theme-tron.png) |

| Nebula | Code Nerd |
|:---:|:---:|
| ![Nebula](docs/theme-nebula.png) | ![Code Nerd](docs/theme-coder.png) |

---

## Context

Calendar UI last changed structurally in **2017** (Material Design 2). **2021** brought Material You — color and shape, not architecture. OAuth consent flows remain largely unchanged since **~2014**.

The product layer was refreshed. The access layer was not. This demo sits at that gap: a contemporary interface on infrastructure that still expects manual console configuration.

---

## Self-host (optional)

The live demo uses sample events. To connect a real Google Calendar, fork the repo and use your own credentials.

```bash
git clone https://github.com/eliospina/custom-mindspace-calendar.git
cp config.example.js config.js   # add CLIENT_ID + API_KEY
npx serve . -l 3000
```

**Google Cloud:** enable Calendar API · create API key + OAuth Web client · scope `calendar.events.readonly` · add your origin to authorized JavaScript origins · Testing mode + your Gmail as test user.

**Enable sign-in:** add Google API scripts and `<button id="auth-btn">` to `index.html` (see repo history). OAuth logic lives in `app.js`.

**Vercel:** `GOOGLE_CLIENT_ID` and `GOOGLE_API_KEY` env vars — only for your deployment, not the public demo.

---

## Stack

Vanilla HTML/CSS/JS. Theme definitions in `styles.js`. No bundler.

---

## Disclaimer

Not affiliated with Google, Lucasfilm, Disney, or Tron. Fan themes for demonstration only.

MIT — [LICENSE](LICENSE)
