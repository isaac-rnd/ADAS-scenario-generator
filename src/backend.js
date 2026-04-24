// Mock backend — in-memory service that mimics a real sim backend.
// Endpoints are exposed as async functions; a real impl would hit REST/WebSocket.
//
// Responsibilities:
//   GET  /scenarios                      → listScenarios()
//   POST /scenarios                      → createScenario(payload)
//   POST /runs                           → createRun(scenarioId)
//   GET  /runs/:id                       → getRun(id)
//   GET  /runs/:id/stream  (ws-ish)      → subscribeRun(id, cb)
//   GET  /runs/:id/metrics               → getMetrics(id)
//   GET  /runs/:id/logs                  → getLogs(id)
//   POST /runs/:id/export                → exportRun(id)

import { SCENARIOS, getScenario } from "./scenarios.js";

const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const state = {
  scenarios: [...SCENARIOS],
  runs: new Map(),
  logs: new Map(),
  subs: new Map(),
};

export async function listScenarios() {
  await sleep(40);
  return state.scenarios;
}

export async function createScenario(payload) {
  await sleep(80);
  const id = uid("SC");
  const s = { ...payload, id };
  state.scenarios.unshift(s);
  return s;
}

export async function updateScenario(id, patch) {
  await sleep(40);
  const i = state.scenarios.findIndex((s) => s.id === id);
  if (i < 0) throw new Error("not found");
  state.scenarios[i] = { ...state.scenarios[i], ...patch };
  return state.scenarios[i];
}

export async function createRun(scenarioId) {
  await sleep(60);
  const sc = getScenario(scenarioId) || state.scenarios.find((s) => s.id === scenarioId);
  if (!sc) throw new Error("scenario not found");
  const id = uid("RUN");
  const run = {
    id,
    scenarioId,
    scenario: sc,
    status: "ready",
    startedAt: null,
    t: 0,
    verdict: "MONITORING",
    metrics: {
      minDistance: Infinity,
      detectionLatencyMs: 0,
      trackStability: 1.0,
      falsePositives: 0,
      laneDeviationM: 0,
      ruleCompliance: 1.0,
      speed: 0,
      distanceTravelled: 0,
    },
    alerts: [],
  };
  state.runs.set(id, run);
  state.logs.set(id, []);
  log(id, "info", `run created for scenario ${scenarioId}`);
  return run;
}

export async function getRun(id) {
  return state.runs.get(id);
}

export function subscribeRun(id, cb) {
  const arr = state.subs.get(id) || [];
  arr.push(cb);
  state.subs.set(id, arr);
  return () => {
    const a = state.subs.get(id) || [];
    state.subs.set(id, a.filter((x) => x !== cb));
  };
}

export function pushRunState(id, patch) {
  const r = state.runs.get(id);
  if (!r) return;
  Object.assign(r, patch);
  (state.subs.get(id) || []).forEach((cb) => cb(r));
}

export async function getMetrics(id) {
  return state.runs.get(id)?.metrics;
}

export async function getLogs(id) {
  return state.logs.get(id) || [];
}

export function log(runId, level, msg) {
  const entry = { t: Date.now(), level, msg };
  const arr = state.logs.get(runId) || [];
  arr.push(entry);
  state.logs.set(runId, arr);
  return entry;
}

export async function exportRun(id) {
  await sleep(120);
  const r = state.runs.get(id);
  return {
    kind: "adas-report",
    version: "1.0",
    run: r,
    logs: state.logs.get(id) || [],
    exportedAt: new Date().toISOString(),
  };
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// Convenience, for UI:
export const backend = {
  listScenarios,
  createScenario,
  updateScenario,
  createRun,
  getRun,
  subscribeRun,
  pushRunState,
  getMetrics,
  getLogs,
  exportRun,
  log,
};
