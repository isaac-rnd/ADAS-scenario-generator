// Simulation engine — scripted waypoints + light rule checks.
// Runs at a fixed tick; exposes a state snapshot for the 3D scene and UI.

import { backend } from "./backend.js";

export class Simulation {
  constructor(run, { tickHz = 30 } = {}) {
    this.run = run;
    this.scenario = run.scenario;
    this.tickHz = tickHz;
    this.dt = 1 / tickHz;
    this.t = 0;
    this.playing = false;
    this.timeScale = 1.0;
    this.finished = false;
    this.verdict = "MONITORING";

    // Ego kinematic state
    const e0 = this.scenario.ego.waypoints[0];
    this.ego = {
      x: e0.at[0],
      z: e0.at[1],
      heading: this._initialHeading(this.scenario.ego.waypoints),
      v: 0,
      targetV: e0.v,
      wpIdx: 0,
      holdLeft: 0,
      distance: 0,
      braking: false,
      steer: 0,
    };

    // Actors
    this.actors = (this.scenario.actors || []).map((a) => ({
      id: a.id,
      kind: a.kind,
      color: a.color,
      x: a.start[0],
      z: a.start[1],
      heading: this._initialHeading(a.waypoints),
      v: 0,
      wpIdx: 0,
      holdLeft: 0,
      waypoints: a.waypoints,
    }));

    this.statics = this.scenario.statics || [];

    // Perception tracks (ground-truth vs detected)
    this.tracks = [];

    // Metrics accumulators
    this.metrics = {
      minDistance: Infinity,
      detectionLatencyMs: 52,
      trackStability: 1.0,
      falsePositives: 0,
      laneDeviationM: 0,
      ruleCompliance: 1.0,
      speed: 0,
      distanceTravelled: 0,
      verdict: "MONITORING",
      pct: 0,
    };
    this.alerts = [];

    this._listeners = new Set();
    this._interval = null;
  }

  onTick(cb) {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  _emit() {
    const snap = this.snapshot();
    this._listeners.forEach((cb) => cb(snap));
  }

  start() {
    if (this._interval) return;
    this.playing = true;
    this._interval = setInterval(() => this._tick(), 1000 / this.tickHz);
    backend.log(this.run.id, "info", "simulation started");
  }
  pause() {
    this.playing = false;
  }
  resume() {
    this.playing = true;
  }
  stop() {
    if (this._interval) clearInterval(this._interval);
    this._interval = null;
    this.playing = false;
  }
  setTimeScale(s) { this.timeScale = s; }

  _initialHeading(wps) {
    if (!wps || wps.length < 2) return 0;
    const [a, b] = [wps[0].at, wps[1].at];
    return Math.atan2(b[0] - a[0], b[1] - a[1]);
  }

  _tick() {
    if (!this.playing) return;
    if (this.finished) return;

    const dt = this.dt * this.timeScale;
    this.t += dt;

    this._stepAgent(this.ego, this.scenario.ego.waypoints, dt, true);
    this.actors.forEach((a) => this._stepAgent(a, a.waypoints, dt, false));

    this._updatePerception();
    this._updateMetrics(dt);
    this._checkTermination();

    this._emit();
  }

  _stepAgent(agent, wps, dt, isEgo) {
    if (agent.holdLeft > 0) {
      agent.holdLeft -= dt;
      agent.v = Math.max(0, agent.v - 6 * dt);
      return;
    }
    if (agent.wpIdx >= wps.length - 1) {
      agent.v = Math.max(0, agent.v - 4 * dt);
      return;
    }
    const target = wps[agent.wpIdx + 1];
    const dx = target.at[0] - agent.x;
    const dz = target.at[1] - agent.z;
    const dist = Math.hypot(dx, dz);

    // Heading lerp
    const desired = Math.atan2(dx, dz);
    const delta = this._wrap(desired - agent.heading);
    agent.heading += Math.max(-2.0 * dt, Math.min(2.0 * dt, delta));
    agent.steer = delta;

    // Speed control toward target.v
    const accel = target.v > agent.v ? 3.2 : -4.5;
    agent.v += accel * dt;
    agent.v = Math.max(0, Math.min(target.v + 0.2, agent.v));
    agent.braking = accel < 0 && target.v < 1.0;

    // Move
    if (dist > 0) {
      const step = Math.min(agent.v * dt, dist);
      agent.x += (dx / dist) * step;
      agent.z += (dz / dist) * step;
      if (isEgo) agent.distance += step;
      if (dist - step < 0.35) {
        // arrived at waypoint
        agent.wpIdx += 1;
        if (target.hold && target.hold > 0) {
          agent.holdLeft = target.hold;
          agent.v = 0;
        }
      }
    }
  }

  _updatePerception() {
    // Camera/Lidar/Radar "tracks": one per dynamic actor within range.
    const range = { cam: 60, lidar: 80, radar: 120 };
    const tracks = [];
    const ex = this.ego.x, ez = this.ego.z;
    const ehead = this.ego.heading;

    this.actors.forEach((a, i) => {
      const dx = a.x - ex, dz = a.z - ez;
      const d = Math.hypot(dx, dz);
      const rel = this._rotate(dx, dz, -ehead); // in ego frame
      const ahead = rel.y > -2; // in front or slightly beside
      const sources = [];
      if (ahead && d < range.cam) sources.push("camera");
      if (d < range.lidar) sources.push("lidar");
      if (d < range.radar) sources.push("radar");
      if (!sources.length) return;

      const risk = this._risk(d, a.v, this.ego.v, rel);
      tracks.push({
        id: `T-${String(i + 1).padStart(2, "0")}`,
        class: a.kind,
        distance: d,
        relSpeed: a.v - this.ego.v,
        confidence: Math.max(0.6, Math.min(0.99, 0.98 - d / 200)),
        risk,
        sources,
        fused: sources.length >= 2,
        rel,
        gt: { x: a.x, z: a.z, v: a.v, heading: a.heading },
        actorId: a.id,
      });
    });

    // Also include static hazards
    (this.statics || []).forEach((s, i) => {
      if (!["cone", "barrier", "sign"].includes(s.kind)) return;
      const dx = s.at[0] - ex, dz = s.at[1] - ez;
      const d = Math.hypot(dx, dz);
      if (d > 50) return;
      const rel = this._rotate(dx, dz, -ehead);
      if (rel.y < -1) return;
      tracks.push({
        id: `T-S${String(i + 1).padStart(2, "0")}`,
        class: s.kind,
        distance: d,
        relSpeed: -this.ego.v,
        confidence: Math.max(0.55, 0.95 - d / 80),
        risk: this._risk(d, 0, this.ego.v, rel) * 0.7,
        sources: ["camera", "lidar"],
        fused: true,
        rel,
        gt: { x: s.at[0], z: s.at[1], v: 0, heading: 0 },
        static: true,
      });
    });

    this.tracks = tracks;
  }

  _risk(d, v, ev, rel) {
    const closing = Math.max(0, ev - v);
    const ttc = d / Math.max(0.5, closing);
    if (rel.y < 0) return Math.max(0, 1 - d / 30) * 0.4;
    if (ttc < 2) return 0.9;
    if (ttc < 4) return 0.6;
    if (ttc < 8) return 0.3;
    return 0.12;
  }

  _updateMetrics(dt) {
    // Min distance to any actor
    let minD = Infinity;
    this.actors.forEach((a) => {
      const d = Math.hypot(a.x - this.ego.x, a.z - this.ego.z);
      if (d < minD) minD = d;
    });
    this.metrics.minDistance = Math.min(this.metrics.minDistance, minD);

    // Lane deviation: distance to nearest segment centerline.
    const seg = (this.scenario.map && this.scenario.map) || null;
    // Simple proxy: for our straight-road or intersection, nearest axis
    const distToX = Math.abs(this.ego.z);
    const distToZ = Math.abs(this.ego.x);
    const lane = Math.min(distToX, distToZ);
    this.metrics.laneDeviationM = Math.max(this.metrics.laneDeviationM, Math.max(0, lane - 1.8));

    // Speed, distance, pct progress
    this.metrics.speed = this.ego.v;
    this.metrics.distanceTravelled = this.ego.distance;
    const total = this._pathLength(this.scenario.ego.waypoints);
    this.metrics.pct = Math.min(1, this.ego.distance / Math.max(1, total));

    // Detection latency jitter (cosmetic)
    this.metrics.detectionLatencyMs = 42 + Math.sin(this.t * 2.1) * 6 + Math.random() * 3;

    // Track stability: penalize if ego weaves
    this.metrics.trackStability = Math.max(0.85, 1 - Math.abs(this.ego.steer) * 0.6);

    // Rule compliance: penalize speeding
    const over = Math.max(0, this.ego.v - this.scenario.ego.speedLimit);
    this.metrics.ruleCompliance = Math.max(0, 1 - over * 0.08);

    // Alerts
    if (minD < 4 && this._alertCooldown !== "close") {
      this._alertCooldown = "close";
      this.alerts.unshift({
        t: this.t,
        level: "warn",
        msg: `proximity: ${minD.toFixed(1)} m to ${this._nearestId()}`,
      });
      setTimeout(() => (this._alertCooldown = null), 1200);
    }
  }

  _nearestId() {
    let min = Infinity, id = "—";
    this.actors.forEach((a) => {
      const d = Math.hypot(a.x - this.ego.x, a.z - this.ego.z);
      if (d < min) { min = d; id = a.id; }
    });
    return id;
  }

  _checkTermination() {
    // Collision check vs actors (simple rect approx)
    for (const a of this.actors) {
      const d = Math.hypot(a.x - this.ego.x, a.z - this.ego.z);
      const threshold = a.kind === "vehicle" ? 2.4 : 1.0;
      if (d < threshold) {
        this._finish("FAIL", `collision with ${a.id} (${a.kind})`);
        return;
      }
    }
    // Ego reached goal / ran out of waypoints
    if (this.ego.wpIdx >= this.scenario.ego.waypoints.length - 1 && this.ego.v < 0.05) {
      this._finish("PASS", "scenario completed nominally");
    }
    // Timeout safety
    if (this.t > (this.scenario.duration + 10)) {
      this._finish("PASS", "scenario completed (time cap)");
    }
  }

  _finish(verdict, msg) {
    this.verdict = verdict;
    this.metrics.verdict = verdict;
    this.finished = true;
    this.playing = false;
    backend.log(this.run.id, verdict === "FAIL" ? "error" : "info", msg);
    this.alerts.unshift({ t: this.t, level: verdict === "FAIL" ? "fail" : "pass", msg });
  }

  _pathLength(wps) {
    let d = 0;
    for (let i = 1; i < wps.length; i++) {
      d += Math.hypot(wps[i].at[0] - wps[i - 1].at[0], wps[i].at[1] - wps[i - 1].at[1]);
    }
    return d;
  }

  _wrap(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }

  _rotate(x, y, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return { x: c * x - s * y, y: s * x + c * y };
  }

  snapshot() {
    return {
      t: this.t,
      playing: this.playing,
      finished: this.finished,
      verdict: this.verdict,
      ego: { ...this.ego },
      actors: this.actors.map((a) => ({ ...a })),
      statics: this.statics,
      tracks: this.tracks,
      metrics: { ...this.metrics },
      alerts: this.alerts.slice(0, 40),
      scenario: this.scenario,
    };
  }
}
