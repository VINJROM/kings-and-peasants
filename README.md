# Kings & Peasants

**Shed your cards · claim the throne.**

A medieval card game of rank, revolution and taxation. Play against bots or pass a
lobby code to friends. Runs entirely in the browser — no install, no signup.

---

## Play it

Open `index.html` in a browser, or publish it free with GitHub Pages (below).

## Put it on GitHub Pages (about 5 minutes)

1. Create a new repository on github.com — name it `kings-and-peasants`, set it **Public**.
2. On the repo page click **Add file → Upload files**, then drag in *everything* from
   this folder, including the `music` folder. Click **Commit changes**.
3. Go to **Settings → Pages**. Under *Build and deployment*, set **Source: Deploy from a
   branch**, **Branch: main**, folder **/ (root)**. Click **Save**.
4. Wait about a minute, then refresh. GitHub shows your live link:
   `https://YOUR-USERNAME.github.io/kings-and-peasants/`

Send that link to anyone. It works on phones, tablets and desktops.

**Tip:** on a phone, open the link and choose *Add to Home Screen* — the game gets its
own icon and runs fullscreen like an installed app.

## What's in here

| File | Purpose |
|---|---|
| `index.html` | Page shell, fonts, theme colour |
| `app.js` | The entire game, pre-built (React is bundled in — nothing to install) |
| `music/*.mp3` | The four soundtrack files, full quality |
| `KingsAndPeasants.jsx` | Readable source, kept for future edits |
| `main.jsx` | Entry point + browser storage adapter |

### Changing the music

Drop an MP3 into `music/` and add a line to the `MUSIC_TRACKS` list near the top of
`KingsAndPeasants.jsx`. Tracks play in listed order and crossfade into one another.
After editing the source you must rebuild `app.js`:

```bash
npm install react react-dom esbuild
npx esbuild main.jsx --bundle --loader:.jsx=jsx --format=iife --minify \
  --define:process.env.NODE_ENV='"production"' --outfile=app.js
```

## How the game plays

Ranks run **1–12** — one 1, twelve 12s — plus two wild Jesters, and **low beats high**.
Lead any set of one rank; the next player must match the count with a *lower* rank or
pass. First to empty their hand is the **King**; last is the **Peasant**.

Between rounds the Peasant pays their two lowest cards to the King (the Commoner pays
one to the Prince), and the rulers hand back whatever they please. Deal both Jesters and
you may declare a **revolution** — no taxes that round. If the *Peasant* declares it,
the whole court flips.

## Multiplayer note

Online lobbies currently sync through browser storage, which means they work between
tabs and devices sharing the same browser profile — good for testing, not yet for
playing with distant friends. A real game server is the next step; until then,
**Play against AI** is the full experience.

## Credits

Game, art direction and code: built with Claude.
Music: Chant of the Conqueror · Conquest of Cards · Epic Card Battle · Climb the Leaderboard.
