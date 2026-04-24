// Map / OpenDRIVE viewer — shows all scenarios on the current map layout.
import { useState, useMemo, useEffect, useRef } from "react";
import { Icon } from "./common.jsx";
import { MAPS } from "../scenarios.js";

export function MapView({ scenarios, onLaunch }) {
  const mapKeys = useMemo(() => Object.keys(MAPS), []);
  const [mapKey, setMapKey] = useState(mapKeys[0]);
  const map = MAPS[mapKey];
  const scs = scenarios.filter((s) => s.map === mapKey);
  const canvasRef = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const size = 560;
    const dpr = Math.min(window.devicePixelRatio, 2);
    c.width = size * dpr; c.height = size * dpr;
    c.style.width = size + "px"; c.style.height = size + "px";
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#0b1118";
    ctx.fillRect(0, 0, size, size);
    const world = map.size || 180;
    const s = size / world;
    const toX = (x) => size / 2 + x * s;
    const toZ = (z) => size / 2 + z * s;

    ctx.strokeStyle = "rgba(120,160,190,0.06)";
    for (let i = 0; i <= 10; i++) {
      const p = (i / 10) * size;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
    }

    ctx.strokeStyle = "#2a3446";
    (map.segments || []).forEach((seg) => {
      ctx.lineWidth = seg.width * s;
      ctx.strokeStyle = "#12181f";
      ctx.beginPath();
      ctx.moveTo(toX(seg.a[0]), toZ(seg.a[1]));
      ctx.lineTo(toX(seg.b[0]), toZ(seg.b[1]));
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(200,215,230,0.35)";
      ctx.setLineDash([6, 10]);
      ctx.beginPath();
      ctx.moveTo(toX(seg.a[0]), toZ(seg.a[1]));
      ctx.lineTo(toX(seg.b[0]), toZ(seg.b[1]));
      ctx.stroke();
      ctx.setLineDash([]);
    });

    (map.crosswalks || []).forEach((cw) => {
      ctx.fillStyle = "rgba(219,227,236,0.6)";
      if (cw.axis === "z") ctx.fillRect(toX(cw.x) - (cw.w * s) / 2, toZ(cw.z - cw.l / 2), cw.w * s, cw.l * s);
      else ctx.fillRect(toX(cw.x - cw.l / 2), toZ(cw.z) - (cw.w * s) / 2, cw.l * s, cw.w * s);
    });

    scs.forEach((sc, i) => {
      const color = ["#2fd1c1", "#f2d17a", "#7aa7e0", "#e07abd"][i % 4];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      sc.ego.waypoints.forEach((w, j) => {
        const x = toX(w.at[0]), y = toZ(w.at[1]);
        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      const s0 = sc.ego.waypoints[0].at, sN = sc.ego.waypoints[sc.ego.waypoints.length - 1].at;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(toX(s0[0]), toZ(s0[1]), 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(toX(sN[0]), toZ(sN[1]), 4, 0, Math.PI * 2); ctx.fill();
    });

    ctx.fillStyle = "rgba(120,160,190,0.5)";
    ctx.font = "10px JetBrains Mono";
    ctx.fillText("N", size / 2 - 4, 14);
    ctx.fillText("S", size / 2 - 4, size - 4);
    ctx.fillText("E", size - 12, size / 2 + 4);
    ctx.fillText("W", 6, size / 2 + 4);
  }, [mapKey, scs, map]);

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1fr 320px", overflow: "hidden" }}>
      <div style={{ display: "flex", flexDirection: "column", padding: 18, overflow: "auto", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignSelf: "flex-start" }}>
          {mapKeys.map((k) => (
            <button key={k} className={`btn ${mapKey === k ? "primary" : ""}`} onClick={() => setMapKey(k)}>
              {MAPS[k].name}
            </button>
          ))}
        </div>
        <canvas ref={canvasRef} style={{ border: "1px solid var(--line-2)", borderRadius: 4 }} />
        <div className="mono" style={{ fontSize: 10, color: "var(--fg-2)", marginTop: 10 }}>
          OpenDRIVE · {map.name} · {map.size}m × {map.size}m
        </div>
      </div>
      <div style={{ borderLeft: "1px solid var(--line)", padding: 14, overflow: "auto" }}>
        <div className="label" style={{ marginBottom: 8 }}>Scenarios on this map · {scs.length}</div>
        {scs.map((sc) => (
          <div key={sc.id} style={{
            padding: 10, borderRadius: 4, background: "var(--bg-1)",
            border: "1px solid var(--line)", marginBottom: 8,
          }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--fg-2)" }}>{sc.id}</div>
            <div style={{ fontSize: 12, marginTop: 2 }}>{sc.name}</div>
            <button className="btn primary" style={{ marginTop: 6, width: "100%", justifyContent: "center" }} onClick={() => onLaunch(sc)}>
              <Icon name="play" size={10} /> LAUNCH
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
