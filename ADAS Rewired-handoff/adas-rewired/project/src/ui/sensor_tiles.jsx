// Sensor tiles — camera, LIDAR, RADAR + ground truth vs detected.
const { useRef: _useRef, useEffect: _useEffect, useMemo: _useMemo } = React;

// Fake camera: projects tracks onto a synthetic background grid + scene silhouettes.
function CameraTile({ state, width, height }) {
  const canvasRef = _useRef(null);

  _useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    c.width = width * dpr; c.height = height * dpr;
    c.style.width = width + "px"; c.style.height = height + "px";
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);

    // Background gradient — road plane
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, "#0b1118");
    bg.addColorStop(0.45, "#0d141b");
    bg.addColorStop(0.5, "#141b24");
    bg.addColorStop(1, "#0a1117");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Horizon
    ctx.strokeStyle = "rgba(120,160,190,0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.48);
    ctx.lineTo(width, height * 0.48);
    ctx.stroke();

    // Road vanishing lines
    ctx.strokeStyle = "rgba(120,160,190,0.18)";
    [-0.25, 0, 0.25].forEach((k) => {
      ctx.beginPath();
      ctx.moveTo(width / 2 + k * width, height);
      ctx.lineTo(width / 2 + k * 40, height * 0.48);
      ctx.stroke();
    });

    // Dashed centerline
    ctx.strokeStyle = "rgba(200,215,230,0.35)";
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(width / 2, height);
    ctx.lineTo(width / 2, height * 0.48);
    ctx.stroke();
    ctx.setLineDash([]);

    // Scanline
    const t = (state?.t || 0);
    ctx.fillStyle = "rgba(47,209,193,0.05)";
    ctx.fillRect(0, ((t * 180) % height), width, 1);

    // Tracks
    const tracks = (state?.tracks || []).filter((tr) => tr.rel.y > 0);
    tracks.forEach((tr) => {
      // project into image space from ego frame (tr.rel.x = lateral, tr.rel.y = forward)
      const depth = Math.max(1, tr.rel.y);
      const lateral = tr.rel.x;
      const fov = 55;
      const scale = (height * 0.7) / depth;
      const x = width / 2 - (lateral / depth) * (width / 2) * 1.1;
      const y = height * 0.48 + (height * 0.45 / depth) * 6;
      const boxH = Math.min(height * 0.7, Math.max(12, scale * 0.7));
      const boxW = Math.min(width * 0.5, Math.max(10, scale * 0.55 * (tr.class === "pedestrian" ? 0.35 : 1)));

      const color =
        tr.risk > 0.7 ? "#ff5b5b" :
        tr.risk > 0.4 ? "#ffd24d" : "#2fd1c1";

      // Box
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - boxW / 2, y - boxH, boxW, boxH);

      // Corners
      const cs = 5;
      ctx.lineWidth = 2;
      [[x - boxW / 2, y - boxH], [x + boxW / 2, y - boxH], [x - boxW / 2, y], [x + boxW / 2, y]].forEach(([cx, cy], i) => {
        ctx.beginPath();
        const sx = i % 2 === 0 ? 1 : -1;
        const sy = i < 2 ? 1 : -1;
        ctx.moveTo(cx + sx * cs, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + sy * cs);
        ctx.stroke();
      });

      // Label
      const label = `${tr.id} · ${tr.class.toUpperCase()} · ${tr.distance.toFixed(1)}m`;
      ctx.font = "10px JetBrains Mono, ui-monospace, monospace";
      const lw = ctx.measureText(label).width + 8;
      ctx.fillStyle = color;
      ctx.fillRect(x - boxW / 2, y - boxH - 14, lw, 12);
      ctx.fillStyle = "#07090c";
      ctx.fillText(label, x - boxW / 2 + 4, y - boxH - 5);

      // Confidence bar
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(x - boxW / 2, y - 4, boxW, 2);
      ctx.fillStyle = color;
      ctx.fillRect(x - boxW / 2, y - 4, boxW * tr.confidence, 2);
    });

    // HUD
    ctx.font = "10px JetBrains Mono, ui-monospace, monospace";
    ctx.fillStyle = "rgba(231,237,243,0.75)";
    ctx.fillText(`CAM-F · 1920x1080 · 30Hz`, 8, 14);
    ctx.fillStyle = "rgba(47,209,193,0.9)";
    ctx.fillText(`REC ● ${(state?.t || 0).toFixed(2)}s`, width - 110, 14);

    // Crosshair
    ctx.strokeStyle = "rgba(231,237,243,0.18)";
    ctx.beginPath();
    ctx.moveTo(width / 2 - 8, height / 2);
    ctx.lineTo(width / 2 + 8, height / 2);
    ctx.moveTo(width / 2, height / 2 - 8);
    ctx.lineTo(width / 2, height / 2 + 8);
    ctx.stroke();
  }, [state, width, height]);

  return <canvas ref={canvasRef} style={{ display: "block" }} />;
}

// LIDAR — top-down point cloud around ego
function LidarTile({ state, width, height }) {
  const canvasRef = _useRef(null);
  _useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    c.width = width * dpr; c.height = height * dpr;
    c.style.width = width + "px"; c.style.height = height + "px";
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#0b1118";
    ctx.fillRect(0, 0, width, height);

    // Range rings
    const cx = width / 2, cy = height / 2;
    const mpp = 0.35; // meters per pixel at tile scale
    const scale = Math.min(width, height) / (2 * 40); // 40m radius
    ctx.strokeStyle = "rgba(120,160,190,0.14)";
    [10, 20, 30, 40].forEach((r) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(120,160,190,0.5)";
      ctx.font = "9px JetBrains Mono";
      ctx.fillText(`${r}m`, cx + r * scale + 2, cy - 2);
    });

    // Axis
    ctx.strokeStyle = "rgba(120,160,190,0.18)";
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, height);
    ctx.moveTo(0, cy); ctx.lineTo(width, cy);
    ctx.stroke();

    // Rotating sweep
    const t = state?.t || 0;
    const sweep = (t * 2) % (Math.PI * 2);
    const grad = ctx.createConicGradient(sweep, cx, cy);
    grad.addColorStop(0, "rgba(47,209,193,0.28)");
    grad.addColorStop(0.1, "rgba(47,209,193,0)");
    grad.addColorStop(1, "rgba(47,209,193,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(width, height) / 2, 0, Math.PI * 2);
    ctx.fill();

    // Ego at center
    ctx.fillStyle = "#e7edf3";
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    // Heading triangle
    ctx.fillStyle = "rgba(47,209,193,0.9)";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx - 4, cy + 3);
    ctx.lineTo(cx + 4, cy + 3);
    ctx.closePath(); ctx.fill();

    // Points from tracks — scattered cloud around each
    (state?.tracks || []).forEach((tr) => {
      if (!tr.sources.includes("lidar")) return;
      const x = cx + tr.rel.x * scale;
      const y = cy - tr.rel.y * scale;
      const n = tr.class === "vehicle" ? 28 : tr.class === "pedestrian" ? 12 : 16;
      const r = tr.class === "vehicle" ? 4 : 1.5;
      const color =
        tr.risk > 0.7 ? "rgba(255,91,91,OP)" :
        tr.risk > 0.4 ? "rgba(255,210,77,OP)" :
        "rgba(120,220,200,OP)";
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random()) * r;
        const px = x + Math.cos(a) * rad;
        const py = y + Math.sin(a) * rad;
        ctx.fillStyle = color.replace("OP", (0.35 + Math.random() * 0.5).toFixed(2));
        ctx.fillRect(px, py, 1.2, 1.2);
      }
    });

    // HUD
    ctx.font = "10px JetBrains Mono";
    ctx.fillStyle = "rgba(231,237,243,0.7)";
    ctx.fillText("LIDAR · 64ch · 10Hz", 8, 14);
    ctx.fillStyle = "rgba(47,209,193,0.7)";
    ctx.fillText(`${((sweep * 180) / Math.PI).toFixed(0)}°`, width - 36, 14);
  }, [state, width, height]);
  return <canvas ref={canvasRef} />;
}

// RADAR — polar plot, tracks as arcs
function RadarTile({ state, width, height }) {
  const canvasRef = _useRef(null);
  _useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    c.width = width * dpr; c.height = height * dpr;
    c.style.width = width + "px"; c.style.height = height + "px";
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#0b1118";
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2, cy = height - 14;
    const rMax = Math.min(width / 2 - 8, height - 28);
    const maxRange = 100; // m

    // Arcs
    ctx.strokeStyle = "rgba(120,160,190,0.18)";
    ctx.font = "9px JetBrains Mono";
    ctx.fillStyle = "rgba(120,160,190,0.5)";
    [25, 50, 75, 100].forEach((r) => {
      ctx.beginPath();
      ctx.arc(cx, cy, (r / maxRange) * rMax, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.fillText(`${r}m`, cx + (r / maxRange) * rMax - 18, cy - 2);
    });

    // Angular spokes
    [-60, -30, 0, 30, 60].forEach((deg) => {
      const a = (-90 + deg) * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * rMax, cy + Math.sin(a) * rMax);
      ctx.stroke();
      ctx.fillText(`${deg}°`, cx + Math.cos(a) * (rMax + 6) - 10, cy + Math.sin(a) * (rMax + 6));
    });

    // Sweep beam
    const t = state?.t || 0;
    const beam = -Math.PI + ((t * 1.8) % Math.PI);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = "rgba(47,209,193,0.14)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, rMax, beam - 0.15, beam + 0.15);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // Tracks
    (state?.tracks || []).forEach((tr) => {
      if (!tr.sources.includes("radar")) return;
      const x = tr.rel.x, y = tr.rel.y;
      const range = Math.hypot(x, y);
      if (range > maxRange) return;
      const angle = Math.atan2(x, y); // rel to forward
      const px = cx + Math.sin(angle) * (range / maxRange) * rMax;
      const py = cy - Math.cos(angle) * (range / maxRange) * rMax;
      const color = tr.risk > 0.6 ? "#ff5b5b" : tr.risk > 0.3 ? "#ffd24d" : "#2fd1c1";
      ctx.fillStyle = color;
      ctx.fillRect(px - 3, py - 3, 6, 6);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(px - 5, py - 5, 10, 10);
      ctx.font = "9px JetBrains Mono";
      ctx.fillText(tr.id, px + 7, py + 3);
    });

    // Ego
    ctx.fillStyle = "#e7edf3";
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    // HUD
    ctx.font = "10px JetBrains Mono";
    ctx.fillStyle = "rgba(231,237,243,0.7)";
    ctx.fillText("RADAR · 77GHz · 20Hz", 8, 14);
  }, [state, width, height]);

  return <canvas ref={canvasRef} />;
}

Object.assign(window, { CameraTile, LidarTile, RadarTile });
