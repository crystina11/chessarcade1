# SHANK ARENA // COMIC DEATHMATCH

Fast-paced 3D multiplayer shooter in Shank 2 comic style. Built for mobile + desktop, deployable on Netlify with P2P online multiplayer (no server needed).

## 🔥 Features

### Core Gameplay
- **3D Characters** - Low-poly comic characters with cel-shading, ink outlines, halftone textures (NOT stickman)
- **Fast-paced COD-style** - Sprint, dodge, jump, slide. No turn-based - pure action
- **Smooth Animations** - Procedural bob, recoil, leg/arm swing, camera shake

### Weapons (9+)
- **Glock-18** (secondary), **M4A1**, **AK-47**, **MP7**, **PP-Bizon**, **UZI**, **M1014 Shotgun**, **RPG-7 Rocket Launcher**, **Compound Bow**
- **6 Arrow Types**: Standard, Fire (burn DOT), Explosive (radius), Poison (DOT), Ice (slow), Electric (stun + chain)
- **Throwables**: Frag Grenade, Molotov (fire zone), Smoke (8s), Medkit (heal)

### Game Modes
- **FFA Deathmatch** - 20 kills to win, 5 min
- **Team Deathmatch** - 30 kills
- **Gun Game** - Kill to upgrade weapon, 9 weapons cycle, rocket launcher final
- **Arrow Only** - Bow mastery

### Maps (3 Stages)
- **Warehouse** - Close quarters, containers
- **Rooftop** - Vertical, ziplines, high ground
- **Trainyard** - Long sightlines, train cars as cover

### Loadout & Profile
- Choose fighter: Bruiser, Ghost, Punk, Riot, Vex, Tank (each with color & style)
- Custom loadout before match: Primary, Secondary, Lethal, Tactical, Arrow Type
- Weapon stats (DMG, ROF, Range, Mobility)

### Controls
- **Desktop**: WASD Move, Mouse Aim/Shoot, Shift Sprint, Space Jump/Dodge, R Reload, Q Switch, G Grenade, F Tactical, E Pickup, 1/2 Weapon
- **Mobile**: Dual joysticks (left move, right aim), Fire button, Jump, Dodge, Reload, Switch, Grenade, Smoke

### Multiplayer P2P
- **Trystero Torrent** - Uses public BitTorrent trackers for WebRTC signaling, no backend server needed
- **Netlify Ready** - Static build, works on Netlify, Vercel, GitHub Pages
- **Room Codes** - 4-char codes, share to join. Up to 8 players
- **Fallback** - Offline bot match (5 bots with AI) if no internet

### Visual Style - Shank 2 Comic
- Toon shading, thick ink outlines, halftone dots, blood splatters, POW! effects
- Comic panels UI, Bangers & Black Ops One fonts, yellow/orange gritty palette
- Killfeed, hitmarkers, muzzle flashes, explosions

## 🚀 Deploy to Netlify

1. Push to GitHub
2. Netlify → New site from Git → select repo
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Done! Share URL, create room, share code

Local:
```bash
npm install --ignore-scripts
npm run dev
npm run build
```

## 🎮 How to Play Online

1. Open site, choose profile (name + avatar)
2. Main Menu → Deathmatch Lobby → Create Room → copy 4-char code
3. Friend opens same site → Join Room → paste code
4. Host selects Map + Mode → Start Match
5. Fight! (May take 10-20s for P2P tracker connection)

If trackers slow, use Solo Mayhem (bots).

## 📱 Mobile

Optimized for touch: dual virtual joysticks, 64px action buttons, responsive comic UI. Works on iOS Safari, Android Chrome.

## 🛠️ Tech

- Three.js 0.160 (3D, toon materials, shadows)
- Trystero 0.20 (P2P WebRTC via torrent trackers)
- Vite 5 (build)
- No backend, no database

## 🎨 Future Ideas

- Voice chat via Trystero
- More maps, weapon skins
- Leaderboards (via localStorage)
- Replay system

Made for fast, gritty, comic-book gunplay. Shank meets COD.

