// App shell — top bar, left nav, view router.
import { useState, useEffect, useCallback } from "react";
import { Icon, Chip } from "./common.jsx";
import { LiveRunView } from "./live_run.jsx";
import { LibraryView } from "./library.jsx";
import { MapView } from "./map_view.jsx";
import { ScenarioBuilder } from "./scenario_builder.jsx";
import { SCENARIOS, MAPS } from "../scenarios.js";
import { backend } from "../backend.js";
import { Simulation } from "../simulation.js";

export function App() {
  const [scenarios, setScenarios] = useState([...SCENARIOS]);
  const [view, setView] = useState("live");
  const [current, setCurrent] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderInitial, setBuilderInitial] = useState(null);
  const [workspace] = useState("ws · scenario_val · v0.7-rc");

  const launch = useCallback(async (scenario) => {
    setCurrent((prev) => {
      if (prev?.sim) prev.sim.stop();
      return prev;
    });
    const run = await backend.createRun(scenario.id);
    const sim = new Simulation(run);
    setCurrent({ sim, run, scenario });
    setView("live");
  }, []);

  useEffect(() => {
    const hero = scenarios.find(s => s.id === "SC-042-intersection-cross");
    if (hero) launch(hero);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endRun = useCallback(() => {
    setCurrent((prev) => {
      if (prev?.sim) prev.sim.stop();
      return null;
    });
    setView("library");
  }, []);

  const onNewScenario = () => {
    setBuilderInitial(null);
    setBuilderOpen(true);
  };

  const onOpenScenario = (sc) => {
    setBuilderInitial(sc);
    setBuilderOpen(true);
  };

  const onSaveScenario = async (sc) => {
    const saved = await backend.createScenario(sc);
    setScenarios((prev) => [saved, ...prev.filter(s => s.id !== saved.id)]);
    setBuilderOpen(false);
    launch(saved);
  };

  const exportRun = async () => {
    if (!current) return;
    const data = await backend.exportRun(current.run.id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${current.run.id}.report.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div style={{ height: "100vh", display: "grid", gridTemplateRows: "44px 1fr", overflow: "hidden" }}>
      <div style={{
        display: "grid", gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        borderBottom: "1px solid var(--line)",
        background: "var(--bg-1)",
        padding: "0 12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Logo />
          <div style={{ height: 20, width: 1, background: "var(--line-2)" }} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span className="mono" style={{ fontSize: 9, color: "var(--fg-2)", letterSpacing: "0.12em" }}>WORKSPACE</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-0)" }}>{workspace}</span>
          </div>
          <Chip variant="accent" dot>SIM v4.2.1</Chip>
          <Chip>OpenSCENARIO 1.2</Chip>
          <Chip>THREE.js r158</Chip>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
          {current && (
            <div className="mono" style={{
              padding: "4px 10px", background: "var(--bg-2)", border: "1px solid var(--line)",
              borderRadius: 3, fontSize: 10, color: "var(--fg-1)", letterSpacing: "0.1em",
            }}>
              RUN · {current.run.id} · {current.scenario.name}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn" onClick={onNewScenario}>
            <Icon name="plus" size={12} /> NEW SCENARIO
          </button>
          <button className="btn" onClick={() => { setView("library"); }}>
            <Icon name="play" size={12} /> NEW RUN
          </button>
          <button className="btn" onClick={exportRun} disabled={!current}
            style={{ opacity: current ? 1 : 0.45 }}>
            <Icon name="export" size={12} /> EXPORT
          </button>
          <div style={{ width: 1, background: "var(--line-2)", margin: "0 4px" }} />
          <button className="btn ghost" title="Settings"><Icon name="gear" size={12} /></button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", overflow: "hidden" }}>
        <div style={{ borderRight: "1px solid var(--line)", background: "var(--bg-1)", display: "flex", flexDirection: "column", padding: 10, gap: 2 }}>
          <div className="label" style={{ padding: "4px 6px", marginBottom: 4 }}>Navigation</div>
          <NavItem icon="chase" label="Live Run" active={view === "live"} onClick={() => setView("live")} disabled={!current} sub={current ? current.run.id : "no active run"} />
          <NavItem icon="library" label="Library" active={view === "library"} onClick={() => setView("library")} sub={`${scenarios.length} scenarios`} />
          <NavItem icon="map" label="Map / OpenDRIVE" active={view === "map"} onClick={() => setView("map")} sub={`${Object.keys(MAPS).length} maps`} />

          <div style={{ flex: 1 }} />

          <div style={{
            background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 4,
            padding: 10, display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div className="label">Legend</div>
            <LegendRow color="var(--accent)" label="EGO" />
            <LegendRow color="#e0c87a" label="NPC VEHICLE" />
            <LegendRow color="#f2d17a" label="PEDESTRIAN" />
            <LegendRow color="var(--fail)" label="HIGH RISK" />
            <LegendRow color="var(--warn)" label="MED RISK" />
            <LegendRow color="var(--pass)" label="NOMINAL" />
          </div>
          <div className="mono" style={{ fontSize: 9, color: "var(--fg-3)", textAlign: "center", marginTop: 6 }}>
            ADAS · REWIRED · BUILD #14782
          </div>
        </div>

        <div style={{ overflow: "hidden", background: "var(--bg-0)" }}>
          {view === "live" && current && (
            <LiveRunView
              key={current.run.id}
              sim={current.sim}
              run={current.run}
              scenario={current.scenario}
              onEnd={endRun}
            />
          )}
          {view === "live" && !current && <EmptyState onGo={() => setView("library")} />}
          {view === "library" && (
            <LibraryView scenarios={scenarios}
              onLaunch={launch}
              onNew={onNewScenario}
              onOpen={onOpenScenario}
            />
          )}
          {view === "map" && (
            <MapView scenarios={scenarios} onLaunch={launch} />
          )}
        </div>
      </div>

      {builderOpen && (
        <ScenarioBuilder
          onCancel={() => setBuilderOpen(false)}
          onSave={onSaveScenario}
          initial={builderInitial}
        />
      )}
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <svg width="22" height="22" viewBox="0 0 24 24">
        <rect x="2" y="2" width="20" height="20" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.4"/>
        <path d="M5 15l4-8 3 5 3-3 4 6" stroke="var(--accent)" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="7" r="1.2" fill="var(--accent)" />
        <circle cx="15" cy="9" r="1.2" fill="var(--accent)" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em" }}>ADAS·REWIRED</span>
        <span className="mono" style={{ fontSize: 8, color: "var(--fg-2)", letterSpacing: "0.22em" }}>SCENARIO CONTROL</span>
      </div>
    </div>
  );
}

function NavItem({ icon, label, sub, active, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "8px 10px",
      borderRadius: 4,
      background: active ? "var(--accent-soft)" : "transparent",
      border: "1px solid " + (active ? "var(--accent-line)" : "transparent"),
      color: active ? "var(--accent)" : disabled ? "var(--fg-3)" : "var(--fg-0)",
      display: "flex", gap: 10, alignItems: "center",
      cursor: disabled ? "not-allowed" : "pointer",
      textAlign: "left",
      opacity: disabled ? 0.55 : 1,
    }}>
      <Icon name={icon} size={14} />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, flex: 1 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.06em" }}>{label}</span>
        <span className="mono" style={{ fontSize: 9, color: "var(--fg-2)", letterSpacing: "0.08em" }}>{sub}</span>
      </div>
    </button>
  );
}

function LegendRow({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
      <span className="mono" style={{ fontSize: 9, color: "var(--fg-1)", letterSpacing: "0.08em" }}>{label}</span>
    </div>
  );
}

function EmptyState({ onGo }) {
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
      <div style={{
        width: 64, height: 64, borderRadius: 4,
        background: "var(--accent-soft)", border: "1px solid var(--accent-line)",
        display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)",
      }}>
        <Icon name="chase" size={28} />
      </div>
      <div>
        <div className="label" style={{ textAlign: "center" }}>No active run</div>
        <div style={{ fontSize: 13, color: "var(--fg-1)", marginTop: 4 }}>Select a scenario from the Library to launch a new run.</div>
      </div>
      <button className="btn primary" onClick={onGo}>
        <Icon name="library" size={12} /> OPEN LIBRARY
      </button>
    </div>
  );
}
