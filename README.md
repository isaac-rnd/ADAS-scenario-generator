# ADAS Rewired · Scenario Control

A browser-based ADAS (Advanced Driver Assistance Systems) scenario simulator built as a dark "cockpit" UI. Loads 4 seeded scenarios (intersection with crossing traffic, pedestrian crossing, construction zone, unavoidable diversion), animates scripted-waypoint traffic in a real Three.js viewport, and scores runs against a live safety envelope (collision → FAIL, completion → PASS).

> **Live demo:** https://isaac-rnd.github.io/ADAS-scenario-generator/

---

## Features

- **Three.js 3D viewport** — orbit, chase, and top-down cameras; lane markings, crosswalks, traffic lights, buildings, ego vehicle with brake lights and halo ring.
- **Scripted-waypoint simulation** — ego + NPCs step through waypoints at 30 Hz with heading-lerp, speed control, hold-at-yield semantics; deterministic demos.
- **Live sensor tiles** — synthetic front camera with 2D bounding boxes and confidence bars, LIDAR top-down point cloud with rotating sweep, RADAR polar plot.
- **Safety metrics panel** — min-distance, detection latency, track stability, lane deviation, rule compliance, event stream.
- **Playback controls** — play/pause/stop, 0.5× – 4× time scale, progress bar.
- **Scenario library** — search, filter by category, launch any scenario into a live run.
- **Map / OpenDRIVE view** — top-down multi-scenario overview on each map.
- **Drag-and-drop scenario builder** — palette of vehicles, pedestrians, cyclists, animals, buildings, cones, barriers, signs; configurable weather, time of day, seed, traffic density, ego profile; save & launch.
- **JSON run export** — download the full run report (state snapshot + logs).

## Tech stack

- [Vite 5](https://vitejs.dev/) + [React 18](https://react.dev/)
- [Three.js 0.160](https://threejs.org/) with `OrbitControls` from `three/examples/jsm`
- Pure CSS design tokens (OKLCH accents, JetBrains Mono / Inter Tight)
- No server runtime — a mock in-memory `backend.js` stubs the REST/WS endpoints a real simulator would expose.

## Project layout

```
index.html                  # entry, loads styles/tokens.css + src/main.jsx
styles/tokens.css           # design tokens, utility classes, chips/btn/panel
src/
  main.jsx                  # React bootstrap
  scenarios.js              # scenario + map data models, seed library
  backend.js                # mock REST/WS backend (in-memory)
  simulation.js             # scripted-waypoint engine, metrics, termination
  scene3d.js                # Three.js scene: roads, actors, ego, overlays
  ui/
    app.jsx                 # shell: top bar, nav, view router
    common.jsx              # Icon, Chip, Panel, Metric, Bar, VerdictBadge
    live_run.jsx            # 3D viewport + sensor tiles + metrics panel
    library.jsx             # scenario browser + cards
    map_view.jsx            # OpenDRIVE-style top-down map
    scenario_builder.jsx    # drag-and-drop editor modal
    sensor_tiles.jsx        # CameraTile, LidarTile, RadarTile
.github/workflows/deploy.yml  # GitHub Pages deploy on push to main
vite.config.js                # base path switches between dev / GH Pages
```

## Getting started

Requires **Node ≥ 18**.

```bash
npm install
npm run dev       # http://localhost:5173
```

The hero scenario (intersection with crossing traffic) auto-launches on load. Use the left nav to switch between **Live Run**, **Library**, and **Map / OpenDRIVE**. Click **+ NEW SCENARIO** in the top bar to open the drag-and-drop builder.

### Production build

```bash
npm run build     # output: dist/
npm run preview   # serve dist/ locally at http://localhost:4173
```

---

## Deploying

### Option A — GitHub Pages (automated, recommended)

The included `.github/workflows/deploy.yml` workflow builds and deploys on every push to `main`:

1. In your GitHub repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Push to `main`. The workflow builds `dist/` and publishes to Pages.
3. Site goes live at `https://<user>.github.io/<repo>/`.

The `base` path in `vite.config.js` defaults to `/ADAS-scenario-generator/`. If you fork to a different repo name, override it in CI:

```yaml
- run: npm run build
  env:
    BASE_PATH: /your-repo-name/
```

### Option B — GitHub Pages (manual)

```bash
npm run deploy    # uses gh-pages to push dist/ to gh-pages branch
```

Then in **Settings → Pages**, set **Source** to the `gh-pages` branch.

### Option C — Any static host (Netlify, Vercel, Cloudflare Pages, S3, nginx)

```bash
BASE_PATH=/ npm run build
# deploy dist/ as the site root
```

Set `BASE_PATH` to match the public URL path where the app is served. For root-level hosting (most static hosts), `/` is correct.

### Option D — Docker / nginx

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV BASE_PATH=/
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

---

## Configuration

| Env var      | Purpose                                  | Default                         |
| ------------ | ---------------------------------------- | ------------------------------- |
| `BASE_PATH`  | Public URL prefix (prod builds only)     | `/ADAS-scenario-generator/`     |

Dev mode always uses `/` regardless of `BASE_PATH`.

---

## Extending

- **New scenario** — add an entry to `SCENARIOS` in `src/scenarios.js` following the existing shape (`ego.waypoints`, `actors`, `statics`).
- **New actor type** — add to `ACTOR_KINDS` in `scenarios.js` and a case in `Scene3D._makeActor` (src/scene3d.js).
- **Real backend** — `src/backend.js` is the integration point. Replace the in-memory `Map`s with `fetch` / WebSocket calls; `backend.subscribeRun(id, cb)` is designed to map onto a WS stream.

## License

No license specified — treat as All Rights Reserved unless the repo owner adds one.
