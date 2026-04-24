// Library view — browse scenarios, launch a run.
const { useState: lUseState, useMemo: lUseMemo } = React;

function LibraryView({ scenarios, onLaunch, onNew, onOpen }) {
  const [query, setQuery] = lUseState("");
  const [category, setCategory] = lUseState("All");
  const categories = lUseMemo(() => ["All", ...Array.from(new Set(scenarios.map(s => s.category)))], [scenarios]);
  const filtered = scenarios.filter(s =>
    (category === "All" || s.category === category) &&
    (s.name.toLowerCase().includes(query.toLowerCase()) || s.id.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateRows: "auto 1fr", overflow: "hidden" }}>
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--line)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12,
      }}>
        <div>
          <div className="label">Scenario library</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, letterSpacing: "-0.01em", marginTop: 2 }}>
            {scenarios.length} scenarios · {filtered.length} shown
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "5px 10px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 4,
          }}>
            <Icon name="search" size={12} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ID or name…"
              style={{ background: "transparent", border: 0, outline: "none", color: "var(--fg-0)",
                fontFamily: "var(--font-mono)", fontSize: 11, width: 200 }} />
          </div>
          <button className="btn primary" onClick={onNew}><Icon name="plus" size={12} /> New scenario</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", overflow: "hidden" }}>
        <div style={{ borderRight: "1px solid var(--line)", padding: 12, overflow: "auto" }}>
          <div className="label" style={{ marginBottom: 8 }}>Category</div>
          {categories.map((c) => (
            <div key={c} onClick={() => setCategory(c)} style={{
              padding: "6px 8px", cursor: "pointer",
              borderRadius: 3,
              fontFamily: "var(--font-mono)", fontSize: 11,
              color: category === c ? "var(--accent)" : "var(--fg-1)",
              background: category === c ? "var(--accent-soft)" : "transparent",
              marginBottom: 2,
            }}>{c}</div>
          ))}
        </div>

        <div className="scroll" style={{ padding: 18, overflow: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {filtered.map((s) => (
              <ScenarioCard key={s.id} s={s} onLaunch={() => onLaunch(s)} onOpen={() => onOpen(s)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({ s, onLaunch, onOpen }) {
  return (
    <div style={{
      background: "var(--bg-1)",
      border: "1px solid var(--line)",
      borderRadius: 6,
      overflow: "hidden",
      display: "flex", flexDirection: "column",
      transition: "border-color 150ms, transform 150ms",
    }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--line-2)"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--line)"}
    >
      <ThumbSVG kind={s.thumbnail} />
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, color: "var(--fg-2)" }}>{s.id}</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{s.name}</div>
          </div>
          <Chip variant={s.difficulty === "Hard" ? "fail" : s.difficulty === "Medium" ? "warn" : "default"}>
            {s.difficulty}
          </Chip>
        </div>
        <div style={{ fontSize: 11, color: "var(--fg-1)", lineHeight: 1.5 }}>{s.description}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
          <Chip><Icon name="clock" size={10} /> {s.duration}s</Chip>
          <Chip>{s.weather}</Chip>
          <Chip>{s.timeOfDay}</Chip>
          <Chip>ρ={s.trafficDensity?.toFixed(2)}</Chip>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button className="btn primary" style={{ flex: 1, justifyContent: "center" }} onClick={onLaunch}>
            <Icon name="play" size={11} /> LAUNCH
          </button>
          <button className="btn" onClick={onOpen} title="Open in editor">
            <Icon name="gear" size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ThumbSVG({ kind }) {
  const common = { width: "100%", height: 110, style: { display: "block", background: "#0b1118", borderBottom: "1px solid var(--line)" }, viewBox: "0 0 320 110" };
  if (kind === "intersection") {
    return (
      <svg {...common}>
        <rect width="320" height="110" fill="#0b1118" />
        <rect x="0" y="45" width="320" height="20" fill="#12181f" />
        <rect x="150" y="0" width="20" height="110" fill="#12181f" />
        <line x1="0" y1="55" x2="140" y2="55" stroke="#6e7b8a" strokeDasharray="4 4" />
        <line x1="180" y1="55" x2="320" y2="55" stroke="#6e7b8a" strokeDasharray="4 4" />
        <line x1="160" y1="0" x2="160" y2="40" stroke="#6e7b8a" strokeDasharray="4 4" />
        <line x1="160" y1="70" x2="160" y2="110" stroke="#6e7b8a" strokeDasharray="4 4" />
        <rect x="155" y="82" width="10" height="16" fill="#2fd1c1" rx="1" />
        <rect x="40" y="50" width="14" height="10" fill="#e0c87a" rx="1" />
        <rect x="240" y="50" width="14" height="10" fill="#7aa7e0" rx="1" />
        <circle cx="180" cy="45" r="2" fill="#f2d17a" />
        <text x="12" y="18" fontSize="9" fontFamily="monospace" fill="#465060">MAP · INTERSECTION_4WAY</text>
      </svg>
    );
  }
  if (kind === "pedestrian") {
    return (
      <svg {...common}>
        <rect width="320" height="110" fill="#0b1118" />
        <rect x="0" y="45" width="320" height="20" fill="#12181f" />
        <line x1="0" y1="55" x2="320" y2="55" stroke="#6e7b8a" strokeDasharray="4 4" />
        {[0,1,2,3,4,5].map((i) => <rect key={i} x={155 + i*2} y="45" width="1.2" height="20" fill="#dbe3ec" />)}
        <rect x="80" y="50" width="12" height="10" fill="#2fd1c1" rx="1" />
        <circle cx="160" cy="30" r="3" fill="#f2d17a" />
        <line x1="160" y1="33" x2="160" y2="45" stroke="#f2d17a" />
        <text x="12" y="18" fontSize="9" fontFamily="monospace" fill="#465060">MAP · STRAIGHT_ROAD</text>
      </svg>
    );
  }
  if (kind === "construction") {
    return (
      <svg {...common}>
        <rect width="320" height="110" fill="#0b1118" />
        <rect x="0" y="45" width="320" height="20" fill="#12181f" />
        <line x1="0" y1="55" x2="320" y2="55" stroke="#6e7b8a" strokeDasharray="4 4" />
        {[0,1,2,3,4,5].map((i) => <polygon key={i} points={`${120 + i*20},60 ${126 + i*20},48 ${132 + i*20},60`} fill="#ff8a3d" />)}
        <rect x="140" y="38" width="30" height="6" fill="#ffd24d" />
        <rect x="60" y="50" width="12" height="10" fill="#2fd1c1" rx="1" />
        <text x="12" y="18" fontSize="9" fontFamily="monospace" fill="#465060">CONSTRUCTION</text>
      </svg>
    );
  }
  if (kind === "diversion") {
    return (
      <svg {...common}>
        <rect width="320" height="110" fill="#0b1118" />
        <rect x="0" y="45" width="320" height="20" fill="#12181f" />
        <line x1="0" y1="55" x2="320" y2="55" stroke="#6e7b8a" strokeDasharray="4 4" />
        <rect x="150" y="42" width="30" height="26" fill="#ffd24d" />
        <rect x="155" y="44" width="2" height="22" fill="#07090c" />
        <rect x="163" y="44" width="2" height="22" fill="#07090c" />
        <rect x="171" y="44" width="2" height="22" fill="#07090c" />
        <rect x="80" y="50" width="12" height="10" fill="#2fd1c1" rx="1" />
        <text x="12" y="18" fontSize="9" fontFamily="monospace" fill="#465060">ROAD BLOCKAGE</text>
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect width="320" height="110" fill="#0b1118" />
      <rect x="0" y="45" width="320" height="20" fill="#12181f" />
      <text x="12" y="18" fontSize="9" fontFamily="monospace" fill="#465060">CUSTOM SCENARIO</text>
    </svg>
  );
}

Object.assign(window, { LibraryView });
