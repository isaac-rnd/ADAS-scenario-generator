// Live Run view — 3D viewport, playback, metrics panel, sensor tiles.
const { useState: rUseState, useEffect: rUseEffect, useRef: rUseRef, useMemo: rUseMemo } = React;

function LiveRunView({ sim, run, scenario, onEnd }) {
  const [state, setState] = rUseState(() => sim.snapshot());
  const [camMode, setCamMode] = rUseState("orbit");
  const [sensorTab, setSensorTab] = rUseState("all");
  const viewportRef = rUseRef(null);
  const sceneRef = rUseRef(null);

  // Init Three.js
  rUseEffect(() => {
    const container = viewportRef.current;
    if (!container) return;
    const s = new window.Scene3D(container);
    const map = window.MAPS[scenario.map];
    s.setScenario(scenario, map);
    sceneRef.current = s;
    return () => s.dispose();
  }, [scenario]);

  // Subscribe to sim ticks
  rUseEffect(() => {
    const un = sim.onTick((snap) => {
      setState(snap);
      sceneRef.current?.update(snap);
    });
    sim.start();
    return () => { un(); sim.stop(); };
  }, [sim]);

  const togglePlay = () => {
    if (state.finished) { onEnd(); return; }
    sim.playing ? sim.pause() : sim.resume();
    setState(sim.snapshot());
  };

  const setCam = (mode) => {
    setCamMode(mode);
    const s = sceneRef.current;
    if (!s) return;
    if (mode === "orbit") s.resetView();
    if (mode === "chase") s.setChase(true);
    if (mode === "top") s.setTop(true);
  };

  const m = state.metrics;
  const verdict = state.verdict || "MONITORING";

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateRows: "auto 1fr", overflow: "hidden" }}>
      {/* Scenario header */}
      <div style={{
        padding: "10px 16px", borderBottom: "1px solid var(--line)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, color: "var(--fg-2)" }}>{scenario.id} · RUN {run.id}</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{scenario.name}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Chip><Icon name="clock" size={10} />{scenario.duration}s</Chip>
            <Chip>{scenario.weather}</Chip>
            <Chip>{scenario.timeOfDay}</Chip>
            <Chip>SEED {scenario.seed}</Chip>
          </div>
        </div>
        <VerdictBadge verdict={verdict} />
      </div>

      {/* Main grid: viewport | right panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateRows: "1fr 180px", overflow: "hidden" }}>
          {/* 3D viewport */}
          <div style={{ position: "relative", background: "#07090c", borderBottom: "1px solid var(--line)" }}>
            <div ref={viewportRef} style={{ position: "absolute", inset: 0 }} />
            {/* Top-left HUD */}
            <div style={{ position: "absolute", top: 10, left: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="mono" style={{
                fontSize: 10, color: "var(--accent)", background: "rgba(8,12,16,0.75)",
                border: "1px solid var(--accent-line)", padding: "4px 8px", borderRadius: 3, letterSpacing: "0.14em",
              }}>
                SIM · {state.playing ? "RUNNING" : state.finished ? "ENDED" : "PAUSED"} · t={state.t.toFixed(2)}s
              </div>
              <div className="mono" style={{
                fontSize: 10, color: "var(--fg-1)", background: "rgba(8,12,16,0.65)",
                border: "1px solid var(--line)", padding: "4px 8px", borderRadius: 3,
              }}>
                EGO · v={state.ego.v.toFixed(1)}m/s · ψ={((state.ego.heading * 180) / Math.PI).toFixed(0)}° · xyz=[{state.ego.x.toFixed(1)},0,{state.ego.z.toFixed(1)}]
              </div>
            </div>
            {/* Top-right cam switch */}
            <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 4, background: "rgba(8,12,16,0.8)", border: "1px solid var(--line)", borderRadius: 3, padding: 3 }}>
              {[
                ["orbit", "chase", "Orbit"],
                ["chase", "car", "Chase"],
                ["top", "grid3", "Top"],
              ].map(([k, ic, lbl]) => (
                <button key={k} onClick={() => setCam(k)}
                  style={{
                    padding: "4px 8px", borderRadius: 2,
                    background: camMode === k ? "var(--accent-soft)" : "transparent",
                    color: camMode === k ? "var(--accent)" : "var(--fg-1)",
                    fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
                    display: "flex", gap: 4, alignItems: "center",
                  }}>
                  <Icon name={ic} size={11} /> {lbl}
                </button>
              ))}
            </div>

            {/* Bottom playback bar */}
            <div style={{
              position: "absolute", left: 10, right: 10, bottom: 10,
              background: "rgba(8,12,16,0.88)", backdropFilter: "blur(6px)",
              border: "1px solid var(--line-2)", borderRadius: 6, padding: 10,
              display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 14,
            }}>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn" onClick={() => { sim.t = 0; sim.ego = null; onEnd(); }} title="Stop">
                  <Icon name="stop" size={12} />
                </button>
                <button className="btn primary" onClick={togglePlay}>
                  {state.playing ? <Icon name="pause" size={12} /> : <Icon name="play" size={12} />}
                  {state.playing ? "PAUSE" : state.finished ? "DONE" : "PLAY"}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="mono" style={{ fontSize: 10, color: "var(--fg-2)" }}>PROGRESS</span>
                  <span className="mono" style={{ fontSize: 10, color: "var(--fg-1)" }}>
                    {(m.pct * 100).toFixed(0)}% · {state.t.toFixed(2)}s / ~{scenario.duration}s
                  </span>
                </div>
                <Bar value={m.pct} max={1} tone={verdict === "FAIL" ? "fail" : "accent"} />
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {[0.5, 1, 2, 4].map((s) => (
                  <button key={s} onClick={() => sim.setTimeScale(s)}
                    style={{
                      padding: "4px 8px", borderRadius: 2,
                      background: sim.timeScale === s ? "var(--accent-soft)" : "var(--bg-2)",
                      color: sim.timeScale === s ? "var(--accent)" : "var(--fg-1)",
                      fontFamily: "var(--font-mono)", fontSize: 10, border: "1px solid var(--line)",
                    }}>{s}×</button>
                ))}
              </div>
            </div>
          </div>

          {/* Sensor tiles strip */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.3fr", gap: 8, padding: 8, overflow: "hidden" }}>
            <SensorTileFrame title="CAM·FRONT" color="accent">
              <SizedTile render={(w, h) => <CameraTile state={state} width={w} height={h} />} />
            </SensorTileFrame>
            <SensorTileFrame title="LIDAR·TOP" color="mag">
              <SizedTile render={(w, h) => <LidarTile state={state} width={w} height={h} />} />
            </SensorTileFrame>
            <SensorTileFrame title="RADAR·FRONT" color="warn">
              <SizedTile render={(w, h) => <RadarTile state={state} width={w} height={h} />} />
            </SensorTileFrame>
            <SensorTileFrame title="TRACKS" color="default">
              <TrackList tracks={state.tracks} />
            </SensorTileFrame>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ borderLeft: "1px solid var(--line)", overflow: "auto", background: "var(--bg-0)" }}>
          <RightPanel state={state} scenario={scenario} />
        </div>
      </div>
    </div>
  );
}

function SensorTileFrame({ title, color = "default", children }) {
  const colorMap = {
    accent: "var(--accent)", mag: "var(--mag)", warn: "var(--warn)", default: "var(--fg-2)",
  };
  return (
    <div style={{
      background: "var(--bg-1)",
      border: "1px solid var(--line)",
      borderRadius: 4,
      display: "grid", gridTemplateRows: "auto 1fr",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "5px 8px", borderBottom: "1px solid var(--line)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span className="mono" style={{ fontSize: 9, letterSpacing: "0.14em", color: colorMap[color] }}>{title}</span>
        <span className="mono" style={{ fontSize: 9, color: "var(--fg-3)" }}>●</span>
      </div>
      <div style={{ overflow: "hidden", position: "relative" }}>{children}</div>
    </div>
  );
}

function SizedTile({ render }) {
  const ref = rUseRef(null);
  const [d, setD] = rUseState({ w: 0, h: 0 });
  rUseEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setD({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setD({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      {d.w > 0 && d.h > 0 && render(d.w, d.h)}
    </div>
  );
}

function TrackList({ tracks }) {
  return (
    <div className="scroll" style={{ height: "100%", overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 10 }}>
        <thead style={{ position: "sticky", top: 0, background: "var(--bg-1)", zIndex: 1 }}>
          <tr style={{ color: "var(--fg-2)" }}>
            {["ID", "CLS", "d[m]", "v[m/s]", "conf", "risk", "src"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "5px 6px", borderBottom: "1px solid var(--line)", letterSpacing: "0.08em", fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tracks.length === 0 && (
            <tr><td colSpan={7} style={{ padding: 10, color: "var(--fg-3)" }}>— no tracks —</td></tr>
          )}
          {tracks.map((t) => (
            <tr key={t.id} style={{ borderBottom: "1px solid var(--line)" }}>
              <td style={{ padding: "4px 6px", color: "var(--fg-0)" }}>{t.id}</td>
              <td style={{ padding: "4px 6px", color: "var(--fg-1)" }}>{t.class.slice(0,4)}</td>
              <td style={{ padding: "4px 6px" }}>{t.distance.toFixed(1)}</td>
              <td style={{ padding: "4px 6px", color: t.relSpeed > 0 ? "var(--fg-1)" : "var(--accent)" }}>{t.relSpeed.toFixed(1)}</td>
              <td style={{ padding: "4px 6px" }}>{(t.confidence * 100).toFixed(0)}</td>
              <td style={{
                padding: "4px 6px",
                color: t.risk > 0.7 ? "var(--fail)" : t.risk > 0.4 ? "var(--warn)" : "var(--pass)",
              }}>{t.risk.toFixed(2)}</td>
              <td style={{ padding: "4px 6px", color: "var(--fg-2)" }}>
                {t.fused ? "FUSED" : t.sources.join("+").toUpperCase()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RightPanel({ state, scenario }) {
  const m = state.metrics;
  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Verdict */}
      <div style={{
        background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 6,
        padding: 12, display: "flex", flexDirection: "column", gap: 8,
      }}>
        <div className="label">Live verdict</div>
        <VerdictBadge verdict={state.verdict} />
        <div className="mono" style={{ fontSize: 10, color: "var(--fg-2)", marginTop: 2 }}>
          {state.finished
            ? (state.verdict === "PASS" ? "Scenario completed within bounds." : "Rule violation detected.")
            : "Monitoring against ISO 34502 envelope."}
        </div>
      </div>

      {/* Metrics */}
      <div>
        <div className="label" style={{ marginBottom: 6 }}>Safety metrics</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <Metric label="MIN DISTANCE"
            value={isFinite(m.minDistance) ? m.minDistance.toFixed(1) : "—"} unit="m"
            tone={m.minDistance < 2 ? "bad" : m.minDistance < 5 ? "warn" : "good"} />
          <Metric label="DET LATENCY" value={m.detectionLatencyMs.toFixed(0)} unit="ms"
            tone={m.detectionLatencyMs > 80 ? "warn" : "good"} />
          <Metric label="TRACK STABIL" value={(m.trackStability * 100).toFixed(0)} unit="%" />
          <Metric label="FALSE POS" value={m.falsePositives} unit="" />
          <Metric label="LANE DEV" value={m.laneDeviationM.toFixed(2)} unit="m"
            tone={m.laneDeviationM > 0.5 ? "warn" : "good"} />
          <Metric label="RULE COMPL" value={(m.ruleCompliance * 100).toFixed(0)} unit="%"
            tone={m.ruleCompliance < 0.9 ? "warn" : "good"} />
        </div>
      </div>

      {/* Ego state */}
      <div>
        <div className="label" style={{ marginBottom: 6 }}>Ego state</div>
        <div style={{ background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 6, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          <StatRow label="SPEED" value={`${m.speed.toFixed(1)} m/s`} sub={`${(m.speed * 3.6).toFixed(1)} km/h`} />
          <StatRow label="LIMIT" value={`${scenario.ego.speedLimit.toFixed(1)} m/s`} />
          <StatRow label="DIST" value={`${m.distanceTravelled.toFixed(1)} m`} />
          <StatRow label="HEADING" value={`${((state.ego.heading * 180) / Math.PI).toFixed(0)}°`} />
          <div style={{ marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span className="mono" style={{ fontSize: 9, color: "var(--fg-2)", letterSpacing: "0.1em" }}>THROTTLE</span>
              <span className="mono" style={{ fontSize: 9, color: "var(--fg-1)" }}>{state.ego.braking ? "0%" : `${Math.min(100, Math.round(m.speed * 8))}%`}</span>
            </div>
            <Bar value={state.ego.braking ? 0 : m.speed / 14} max={1} tone="accent" />
            <div style={{ display: "flex", justifyContent: "space-between", margin: "5px 0 3px" }}>
              <span className="mono" style={{ fontSize: 9, color: "var(--fg-2)", letterSpacing: "0.1em" }}>BRAKE</span>
              <span className="mono" style={{ fontSize: 9, color: "var(--fg-1)" }}>{state.ego.braking ? "72%" : "0%"}</span>
            </div>
            <Bar value={state.ego.braking ? 0.72 : 0} max={1} tone="fail" />
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div>
        <div className="label" style={{ marginBottom: 6 }}>Event stream</div>
        <div style={{
          background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 6,
          maxHeight: 160, overflow: "auto",
        }}>
          {state.alerts.length === 0 && (
            <div className="mono" style={{ padding: 12, fontSize: 10, color: "var(--fg-3)" }}>— no events —</div>
          )}
          {state.alerts.map((a, i) => (
            <div key={i} style={{
              padding: "6px 10px",
              borderBottom: "1px solid var(--line)",
              display: "flex", justifyContent: "space-between", gap: 10,
              fontFamily: "var(--font-mono)", fontSize: 10,
              color: a.level === "fail" ? "var(--fail)" : a.level === "warn" ? "var(--warn)" : a.level === "pass" ? "var(--pass)" : "var(--fg-1)",
            }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.msg}</span>
              <span style={{ color: "var(--fg-3)", flexShrink: 0 }}>{a.t.toFixed(2)}s</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, sub }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span className="mono" style={{ fontSize: 9, color: "var(--fg-2)", letterSpacing: "0.1em" }}>{label}</span>
      <span>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-0)" }}>{value}</span>
        {sub && <span className="mono" style={{ fontSize: 9, color: "var(--fg-3)", marginLeft: 5 }}>{sub}</span>}
      </span>
    </div>
  );
}

Object.assign(window, { LiveRunView });
