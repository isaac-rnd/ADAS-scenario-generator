// Scenario Builder — top-down canvas where user drags actors/statics onto a map.
import { useState, useRef, useEffect } from "react";
import { Icon } from "./common.jsx";

export function ScenarioBuilder({ onSave, onCancel, initial }) {
  const [name, setName] = useState(initial?.name || "Untitled scenario");
  const [map, setMap] = useState(initial?.map || "intersection_4way");
  const [weather, setWeather] = useState(initial?.weather || "Clear");
  const [tod, setTod] = useState(initial?.timeOfDay || "14:00");
  const [density, setDensity] = useState(initial?.trafficDensity ?? 0.4);
  const [seed, setSeed] = useState(initial?.seed || 42);
  const [profile, setProfile] = useState(initial?.egoProfile || "Balanced");
  const [items, setItems] = useState(() => {
    const base = initial ? [
      ...(initial.actors || []).map(a => ({ id: a.id, kind: a.kind, x: a.start[0], z: a.start[1], color: a.color })),
      ...(initial.statics || []).map((s, i) => ({ id: `S-${i}`, kind: s.kind, x: s.at[0], z: s.at[1], static: true, size: s.size })),
    ] : [];
    return base;
  });
  const [egoStart, setEgoStart] = useState(initial?.ego?.start || [0, -70]);
  const [egoGoal, setEgoGoal] = useState(initial?.ego?.goal || [0, 70]);
  const [selected, setSelected] = useState(null);
  const [drag, setDrag] = useState(null);

  const size = 160;
  const canvasSize = 520;
  const px = (m) => ((m + size / 2) / size) * canvasSize;
  const toM = (p) => (p / canvasSize) * size - size / 2;

  const palette = [
    { kind: "vehicle", icon: "car", label: "Vehicle" },
    { kind: "pedestrian", icon: "ped", label: "Pedestrian" },
    { kind: "cyclist", icon: "route", label: "Cyclist" },
    { kind: "animal", icon: "target", label: "Animal" },
    { kind: "building", icon: "bldg", label: "Building", static: true, size: [12, 10, 12] },
    { kind: "cone", icon: "cone", label: "Cone", static: true },
    { kind: "barrier", icon: "barrier", label: "Barrier", static: true },
    { kind: "sign", icon: "alert", label: "Sign", static: true },
  ];

  const canvasRef = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio, 2);
    c.width = canvasSize * dpr; c.height = canvasSize * dpr;
    c.style.width = canvasSize + "px"; c.style.height = canvasSize + "px";
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#0b1118";
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    ctx.strokeStyle = "rgba(120,160,190,0.07)";
    for (let i = 0; i <= canvasSize; i += canvasSize / 16) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvasSize); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvasSize, i); ctx.stroke();
    }
    ctx.fillStyle = "#12181f";
    if (map === "intersection_4way") {
      ctx.fillRect(0, canvasSize / 2 - 13, canvasSize, 26);
      ctx.fillRect(canvasSize / 2 - 13, 0, 26, canvasSize);
    } else {
      ctx.fillRect(0, canvasSize / 2 - 13, canvasSize, 26);
    }
    ctx.strokeStyle = "rgba(180,200,220,0.35)";
    ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(0, canvasSize / 2); ctx.lineTo(canvasSize, canvasSize / 2); ctx.stroke();
    if (map === "intersection_4way") {
      ctx.beginPath(); ctx.moveTo(canvasSize / 2, 0); ctx.lineTo(canvasSize / 2, canvasSize); ctx.stroke();
    }
    ctx.setLineDash([]);

    const [sx, sz] = egoStart, [gx, gz] = egoGoal;
    ctx.strokeStyle = "#2fd1c1";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px(sx), px(sz));
    ctx.lineTo(px(gx), px(gz));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#2fd1c1";
    ctx.beginPath(); ctx.arc(px(sx), px(sz), 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0b1118";
    ctx.font = "9px JetBrains Mono";
    ctx.fillText("S", px(sx) - 3, px(sz) + 3);
    ctx.fillStyle = "#2fd1c1";
    ctx.beginPath(); ctx.arc(px(gx), px(gz), 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0b1118";
    ctx.fillText("G", px(gx) - 3, px(gz) + 3);

    items.forEach((it) => {
      const x = px(it.x), y = px(it.z);
      const sel = selected === it.id;
      const col =
        it.kind === "vehicle" ? "#a7b2c0" :
        it.kind === "pedestrian" ? "#f2d17a" :
        it.kind === "cyclist" ? "#7adfc9" :
        it.kind === "animal" ? "#c58a6a" :
        it.kind === "building" ? "#394454" :
        it.kind === "cone" ? "#ff8a3d" :
        it.kind === "barrier" ? "#ffd24d" : "#e7edf3";
      ctx.fillStyle = col;
      ctx.strokeStyle = sel ? "#2fd1c1" : "rgba(0,0,0,0.5)";
      ctx.lineWidth = sel ? 2 : 1;
      if (it.kind === "building") {
        const sW = ((it.size?.[0] ?? 12) / size) * canvasSize;
        const sD = ((it.size?.[2] ?? 12) / size) * canvasSize;
        ctx.fillRect(x - sW / 2, y - sD / 2, sW, sD);
        ctx.strokeRect(x - sW / 2, y - sD / 2, sW, sD);
      } else if (it.kind === "vehicle") {
        ctx.fillRect(x - 4, y - 7, 8, 14);
        ctx.strokeRect(x - 4, y - 7, 8, 14);
      } else if (it.kind === "barrier") {
        ctx.fillRect(x - 8, y - 2, 16, 4);
      } else {
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    });
  }, [items, map, selected, egoStart, egoGoal]);

  const addAt = (kind, sAttrs, e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const id = `${kind.toUpperCase().slice(0,3)}-${(items.length+1).toString().padStart(2,"0")}`;
    setItems((prev) => [...prev, { id, kind, x: toM(mx), z: toM(my), static: sAttrs?.static, size: sAttrs?.size }]);
  };

  const onCanvasDown = (e) => {
    if (drag?.kind) {
      addAt(drag.kind, drag, e);
      setDrag(null);
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hit = [...items].reverse().find((it) => Math.hypot(px(it.x) - mx, px(it.z) - my) < 12);
    setSelected(hit?.id || null);
    if (hit) {
      const moveH = (ev) => {
        const r = canvasRef.current.getBoundingClientRect();
        const x = toM(ev.clientX - r.left);
        const z = toM(ev.clientY - r.top);
        setItems((prev) => prev.map(i => i.id === hit.id ? { ...i, x, z } : i));
      };
      const upH = () => {
        window.removeEventListener("mousemove", moveH);
        window.removeEventListener("mouseup", upH);
      };
      window.addEventListener("mousemove", moveH);
      window.addEventListener("mouseup", upH);
    }
  };

  const del = () => {
    if (!selected) return;
    setItems((prev) => prev.filter(i => i.id !== selected));
    setSelected(null);
  };

  const save = () => {
    const actors = items.filter(i => !i.static).map((i) => ({
      id: i.id,
      kind: i.kind,
      color: i.color,
      start: [i.x, i.z],
      waypoints: [{ at: [i.x, i.z], v: 2 }, { at: [i.x, i.z + (i.kind === "vehicle" ? 40 : 15)], v: i.kind === "vehicle" ? 10 : 1.3 }],
    }));
    const statics = items.filter(i => i.static).map((i) => ({
      kind: i.kind, at: [i.x, i.z], size: i.size,
    }));
    const pathLen = Math.hypot(egoGoal[0] - egoStart[0], egoGoal[1] - egoStart[1]);
    const scenario = {
      id: `SC-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      name, category: "Custom", difficulty: "Custom",
      duration: Math.ceil(pathLen / 8),
      map, seed, weather, timeOfDay: tod,
      trafficDensity: density, egoProfile: profile,
      description: `User-built · ${items.length} items.`,
      thumbnail: "custom",
      ego: {
        start: egoStart, goal: egoGoal, speedLimit: 13.9,
        waypoints: [
          { at: egoStart, v: 10 },
          { at: [(egoStart[0] + egoGoal[0]) / 2, (egoStart[1] + egoGoal[1]) / 2], v: 9 },
          { at: egoGoal, v: 10 },
        ],
      },
      actors, statics, expected: "pass",
    };
    onSave(scenario);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(5,8,12,0.72)", backdropFilter: "blur(4px)",
      zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: 1040, maxHeight: "92vh",
        background: "var(--bg-1)",
        border: "1px solid var(--line-2)",
        borderRadius: 8, overflow: "hidden",
        display: "grid", gridTemplateRows: "auto 1fr auto",
      }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="label">New scenario</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{
              background: "transparent", border: 0, color: "var(--fg-0)",
              fontFamily: "var(--font-mono)", fontSize: 14, outline: "none",
              padding: "2px 4px", borderBottom: "1px solid var(--line-2)",
              minWidth: 280,
            }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost" onClick={onCancel}>Cancel</button>
            <button className="btn primary" onClick={save}>Save & launch</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 240px", overflow: "hidden" }}>
          <div style={{ borderRight: "1px solid var(--line)", padding: 12, overflow: "auto" }}>
            <div className="label" style={{ marginBottom: 8 }}>Palette</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {palette.map((p) => (
                <button key={p.kind}
                  onMouseDown={() => setDrag(p)}
                  style={{
                    padding: "10px 6px", borderRadius: 4,
                    background: drag?.kind === p.kind ? "var(--accent-soft)" : "var(--bg-2)",
                    border: "1px solid " + (drag?.kind === p.kind ? "var(--accent-line)" : "var(--line)"),
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    color: drag?.kind === p.kind ? "var(--accent)" : "var(--fg-0)",
                    cursor: "grab",
                  }}>
                  <Icon name={p.icon} size={16} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>{p.label}</span>
                </button>
              ))}
            </div>
            <div className="label" style={{ marginTop: 14, marginBottom: 6 }}>Ego route</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--fg-2)", lineHeight: 1.5 }}>
              S: [{egoStart[0].toFixed(0)}, {egoStart[1].toFixed(0)}]<br/>
              G: [{egoGoal[0].toFixed(0)}, {egoGoal[1].toFixed(0)}]
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => setDrag({ kind: "__egoStart" })}>Set S</button>
              <button className="btn" style={{ flex: 1 }} onClick={() => setDrag({ kind: "__egoGoal" })}>Set G</button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, background: "var(--bg-0)" }}>
            <canvas ref={canvasRef}
              onMouseDown={(e) => {
                if (drag?.kind === "__egoStart") {
                  const rect = canvasRef.current.getBoundingClientRect();
                  setEgoStart([toM(e.clientX - rect.left), toM(e.clientY - rect.top)]);
                  setDrag(null);
                } else if (drag?.kind === "__egoGoal") {
                  const rect = canvasRef.current.getBoundingClientRect();
                  setEgoGoal([toM(e.clientX - rect.left), toM(e.clientY - rect.top)]);
                  setDrag(null);
                } else {
                  onCanvasDown(e);
                }
              }}
              style={{ cursor: drag ? "crosshair" : "default", borderRadius: 4, border: "1px solid var(--line-2)" }}
            />
            <div className="mono" style={{ fontSize: 10, color: "var(--fg-2)", marginTop: 8 }}>
              {drag ? `DROP "${drag.kind}" on map` : "DRAG palette item → canvas · CLICK to select · DRAG to move"}
            </div>
          </div>

          <div style={{ borderLeft: "1px solid var(--line)", padding: 12, overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Map">
              <select value={map} onChange={(e) => setMap(e.target.value)} className="mono" style={inputStyle}>
                <option value="intersection_4way">4-way intersection</option>
                <option value="straight_road">Straight urban road</option>
              </select>
            </Field>
            <Field label="Weather">
              <select value={weather} onChange={(e) => setWeather(e.target.value)} className="mono" style={inputStyle}>
                {["Clear", "Overcast", "Rain", "Fog", "Snow"].map(w => <option key={w}>{w}</option>)}
              </select>
            </Field>
            <Field label="Time of day">
              <input value={tod} onChange={(e) => setTod(e.target.value)} className="mono" style={inputStyle} />
            </Field>
            <Field label={`Traffic density · ${density.toFixed(2)}`}>
              <input type="range" min="0" max="1" step="0.05" value={density} onChange={(e) => setDensity(+e.target.value)} style={{ width: "100%" }} />
            </Field>
            <Field label="Seed">
              <input type="number" value={seed} onChange={(e) => setSeed(+e.target.value)} className="mono" style={inputStyle} />
            </Field>
            <Field label="Ego profile">
              <select value={profile} onChange={(e) => setProfile(e.target.value)} className="mono" style={inputStyle}>
                {["Cautious", "Balanced", "Assertive"].map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <div className="hair" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="label">Items</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--fg-1)" }}>{items.length}</span>
            </div>
            <div style={{ maxHeight: 200, overflow: "auto" }}>
              {items.map((it) => (
                <div key={it.id}
                  onClick={() => setSelected(it.id)}
                  style={{
                    padding: "5px 8px",
                    fontFamily: "var(--font-mono)", fontSize: 11,
                    borderRadius: 3,
                    background: selected === it.id ? "var(--accent-soft)" : "transparent",
                    color: selected === it.id ? "var(--accent)" : "var(--fg-1)",
                    display: "flex", justifyContent: "space-between",
                    cursor: "pointer",
                  }}>
                  <span>{it.id}</span>
                  <span style={{ color: "var(--fg-2)" }}>{it.kind}</span>
                </div>
              ))}
              {items.length === 0 && <div className="mono" style={{ fontSize: 10, color: "var(--fg-3)", padding: 4 }}>— drop items on canvas —</div>}
            </div>
            {selected && (
              <button className="btn danger" onClick={del}>Delete selected</button>
            )}
          </div>
        </div>

        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--line)", display: "flex", gap: 16, alignItems: "center" }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--fg-2)" }}>
            OpenSCENARIO 1.2 · lanelet2 · {items.length} actors/statics
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  background: "var(--bg-2)", border: "1px solid var(--line)",
  color: "var(--fg-0)", padding: "5px 8px", borderRadius: 3, fontSize: 11, width: "100%",
};

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div className="label">{label}</div>
      {children}
    </div>
  );
}
