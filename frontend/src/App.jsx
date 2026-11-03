import { useState, useEffect, useCallback, useRef } from "react";

const API = "http://localhost:8000";
const MAX_CHARS = 1000;

const C = {
  bg:       "#000000",
  surface:  "rgba(255,255,255,0.04)",
  surface2: "rgba(255,255,255,0.07)",
  surface3: "rgba(255,255,255,0.10)",
  border:   "rgba(255,255,255,0.08)",
  border2:  "rgba(255,255,255,0.14)",
  border3:  "rgba(255,255,255,0.22)",
  text:     "#ffffff",
  textSub:  "rgba(255,255,255,0.7)",
  muted:    "rgba(255,255,255,0.35)",
  accent:   "#4d8ef5",
  safe:     "#22c55e",
  spam:     "#f59e0b",
  phishing: "#ef4444",
  abusive:  "#a78bfa",
  safeBg:   "rgba(34,197,94,0.08)",
  spamBg:   "rgba(245,158,11,0.08)",
  phishBg:  "rgba(239,68,68,0.08)",
  absvBg:   "rgba(167,139,250,0.08)",
  safeBdr:  "rgba(34,197,94,0.2)",
  spamBdr:  "rgba(245,158,11,0.2)",
  phishBdr: "rgba(239,68,68,0.2)",
  absvBdr:  "rgba(167,139,250,0.2)",
};

const LABEL_META = {
  Safe:     { color: C.safe,     bg: C.safeBg,  border: C.safeBdr,  glow: "rgba(34,197,94,0.2)" },
  Spam:     { color: C.spam,     bg: C.spamBg,  border: C.spamBdr,  glow: "rgba(245,158,11,0.2)" },
  Phishing: { color: C.phishing, bg: C.phishBg, border: C.phishBdr, glow: "rgba(239,68,68,0.2)" },
  Abusive:  { color: C.abusive,  bg: C.absvBg,  border: C.absvBdr,  glow: "rgba(167,139,250,0.2)" },
};

const FL_NODES = ["Device A", "Device B", "Device C", "Device D"];

function latencyColor(ms) {
  if (!ms) return C.muted;
  if (ms < 100) return C.safe;
  if (ms < 300) return C.spam;
  return C.phishing;
}

function GlassCard({ children, style = {}, glow, className = "" }) {
  return (
    <div className={`glass-card ${className}`} style={{
      background: C.surface,
      border: `1px solid ${C.border2}`,
      borderRadius: 20,
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      boxShadow: glow
        ? `0 0 60px ${glow}, 0 1px 0 ${C.border3} inset, 0 20px 60px rgba(0,0,0,0.6)`
        : `0 1px 0 ${C.border3} inset, 0 20px 60px rgba(0,0,0,0.6)`,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── FIX 1: Show one decimal place so 99.8 displays as 99.8, not 100 ──
function ConfidenceGauge({ confidence, color, size = 96 }) {
  const r = (size / 2) - 9;
  const circ = 2 * Math.PI * r;
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    setAnimated(0);
    const t = setTimeout(() => setAnimated(confidence), 80);
    return () => clearTimeout(t);
  }, [confidence]);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={circ} strokeDashoffset={circ - (animated / 100) * circ} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 8px ${color})` }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {/* FIXED: use toFixed(1) instead of Math.round() so 99.8 shows as 99.8, not 100 */}
        <span style={{ fontSize: size * 0.19, fontWeight: 700, fontFamily: "'DM Mono', monospace", color, lineHeight: 1 }}>{animated.toFixed(1)}</span>
        <span style={{ fontSize: size * 0.11, color: C.muted, marginTop: 1 }}>%</span>
      </div>
    </div>
  );
}

function Badge({ label, size = "md" }) {
  const m = LABEL_META[label] || LABEL_META.Safe;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: size === "sm" ? "2px 9px" : "4px 13px",
      borderRadius: 99, background: m.bg, border: `1px solid ${m.border}`,
      color: m.color, fontSize: size === "sm" ? 11 : 12, fontWeight: 600, letterSpacing: 0.4,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color, boxShadow: `0 0 6px ${m.color}` }} />
      {label}
    </span>
  );
}

function Metric({ label, value, unit, color }) {
  return (
    <GlassCard style={{ padding: "20px 22px", borderTop: `1px solid ${color}50`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 80, height: 80, borderRadius: "50%", background: `${color}15`, filter: "blur(20px)", pointerEvents: "none" }} />
      <div style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10, fontWeight: 500 }}>{label}</div>
      <div style={{ color: C.text, fontSize: 28, fontWeight: 700, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
        {typeof value === "number" ? value.toFixed(1) : value}
        <span style={{ fontSize: 13, color: C.muted, fontWeight: 400, marginLeft: 3 }}>{unit}</span>
      </div>
    </GlassCard>
  );
}

function FLSimulation({ active, onComplete }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) { setPhase(0); return; }
    const ts = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 3200),
      setTimeout(() => setPhase(4), 4400),
    ];
    const done = setTimeout(() => { if (onComplete) onComplete(); }, 5000);
    return () => { ts.forEach(clearTimeout); clearTimeout(done); };
  }, [active, onComplete]);

  const phaseColors = ["rgba(255,255,255,0.1)", C.accent, C.spam, C.phishing, C.safe];
  const phaseLabels = ["Idle", "Local Training", "Sending Updates", "Aggregating", "Model Updated"];
  const pc = phaseColors[phase];

  return (
    <GlassCard style={{ padding: 24 }} glow={phase > 0 ? `${pc}25` : null}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>Federated Learning</span>
        <span style={{ fontSize: 11, padding: "3px 11px", borderRadius: 99, background: phase === 4 ? "rgba(34,197,94,0.1)" : C.surface2, color: phase === 4 ? C.safe : C.muted, border: `1px solid ${phase === 4 ? C.safeBdr : C.border}`, transition: "all 0.5s" }}>{phaseLabels[phase]}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {FL_NODES.map(n => (
          <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: phase > 0 ? `${pc}18` : C.surface2, border: `1px solid ${phase > 0 ? pc : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.5s ease", boxShadow: phase > 0 ? `0 0 20px ${pc}30` : "none" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={phase > 0 ? pc : C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.5s" }}>
                <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
            </div>
            <span style={{ fontSize: 10, color: phase > 0 ? pc : C.muted, transition: "color 0.5s", fontWeight: 500 }}>{n}</span>
          </div>
        ))}
        <svg width="24" height="14" viewBox="0 0 24 14" fill="none" style={{ flexShrink: 0 }}>
          <path d="M0 7 H20 M14 2 L20 7 L14 12" stroke={phase >= 2 ? pc : C.border2} strokeWidth="1.5" strokeLinecap="round" style={{ transition: "stroke 0.4s" }}/>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: phase >= 3 ? "rgba(34,197,94,0.12)" : C.surface2, border: `1px solid ${phase >= 3 ? C.safe : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.5s ease", boxShadow: phase >= 3 ? "0 0 24px rgba(34,197,94,0.4)" : "none" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={phase >= 3 ? C.safe : C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "stroke 0.5s" }}>
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <span style={{ fontSize: 10, color: phase >= 3 ? C.safe : C.muted, transition: "color 0.5s", fontWeight: 500 }}>Server</span>
        </div>
      </div>
      <div style={{ marginTop: 22, background: "rgba(255,255,255,0.05)", borderRadius: 99, height: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(phase / 4) * 100}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.safe})`, transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)", borderRadius: 99, boxShadow: `0 0 10px ${C.accent}` }} />
      </div>
    </GlassCard>
  );
}

function HighlightedText({ text, keywords }) {
  if (!keywords?.length) return <span>{text}</span>;
  const re = new RegExp(`(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return (
    <span>{text.split(re).map((p, i) =>
      keywords.some(k => k.toLowerCase() === p.toLowerCase())
        ? <mark key={i} style={{ background: "rgba(245,158,11,0.2)", color: "#fbbf24", borderRadius: 3, padding: "0 2px", fontWeight: 600 }}>{p}</mark>
        : <span key={i}>{p}</span>
    )}</span>
  );
}

export default function App() {
  const [tab, setTab]             = useState("classifier");
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState("");
  const [metrics, setMetrics]     = useState(null);
  const [history, setHistory]     = useState([]);
  const [serverOk, setServerOk]   = useState(null);
  const [flActive, setFlActive]   = useState(false);
  const [flTabActive, setFlTabActive] = useState(true);

  const checkServer = useCallback(async () => {
    try { await fetch(`${API}/health`); setServerOk(true); } catch { setServerOk(false); }
  }, []);
  useEffect(() => { checkServer(); }, [checkServer]);

  const fetchMetrics = useCallback(async () => {
    try { const r = await fetch(`${API}/metrics`); setMetrics(await r.json()); } catch {}
  }, []);

  const fetchHistory = useCallback(async () => {
    try { const r = await fetch(`${API}/history`); const d = await r.json(); setHistory(d.history || []); } catch {}
  }, []);

  useEffect(() => {
    if (tab === "dashboard")  fetchMetrics();
    if (tab === "history")    fetchHistory();
    if (tab === "classifier") { setResult(null); setError(""); }
    if (tab === "federated")  { setFlTabActive(false); setTimeout(() => setFlTabActive(true), 100); }
  }, [tab, fetchMetrics, fetchHistory]);

  const handleClassify = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(""); setResult(null); setFlActive(true);
    try {
      const r = await fetch(`${API}/classify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input.trim(), include_attention: true }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail || "Error"); }
      setResult(await r.json()); setFlActive(false);
    } catch (e) {
      setError(e.message || "Could not reach the API."); setFlActive(false);
    }
    setLoading(false);
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Clear all history?")) return;
    await fetch(`${API}/history`, { method: "DELETE" });
    setHistory([]);
  };

  const TABS = [
    { id: "classifier",   label: "Classifier" },
    { id: "federated",    label: "Federated" },
    { id: "dashboard",    label: "Dashboard" },
    { id: "history",      label: "History", count: history.length },
    { id: "architecture", label: "Architecture" },
  ];

  const BigHeading = ({ children, sub }) => (
    <div style={{ textAlign: "center", marginBottom: 48 }}>
      <h1 style={{ fontSize: "clamp(52px, 8vw, 96px)", fontWeight: 900, letterSpacing: -4, lineHeight: 1, color: "#fff", marginBottom: 12 }}>{children}</h1>
      {sub && <p style={{ color: C.muted, fontSize: 15 }}>{sub}</p>}
    </div>
  );

  const PillBtn = ({ onClick, children }) => (
    <button onClick={onClick} style={{ padding: "7px 16px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: C.muted, cursor: "pointer", fontSize: 12, fontFamily: "inherit", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 6 }}>
      {children}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Outfit', sans-serif", position: "relative", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes glowPulse { 0%,100% { opacity:0.4; } 50% { opacity:0.8; } }
        @keyframes flashRing {
          0%   { box-shadow: 0 0 0 0px var(--ring); }
          50%  { box-shadow: 0 0 0 7px var(--ring); }
          100% { box-shadow: 0 0 0 0px var(--ring); }
        }
        textarea { color-scheme: dark; }
        textarea:focus { outline: none !important; border-color: rgba(77,142,245,0.4) !important; box-shadow: 0 0 0 3px rgba(77,142,245,0.1) !important; }
        .glass-card { transition: border-color 0.2s, box-shadow 0.2s; }
        .glass-card:hover { border-color: rgba(255,255,255,0.18) !important; }
        .tab-btn { transition: all 0.18s; }
        .tab-btn:hover { background: rgba(255,255,255,0.07) !important; color: rgba(255,255,255,0.8) !important; }
        .tab-btn.active { background: rgba(255,255,255,0.1) !important; color: #fff !important; }
        .classify-btn { transition: all 0.2s; }
        .classify-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
        .classify-btn:active:not(:disabled) { transform: translateY(0); }
        .hist-row { transition: all 0.15s; }
        .hist-row:hover { background: rgba(255,255,255,0.06) !important; transform: translateX(3px); border-color: rgba(255,255,255,0.12) !important; }
        .card-hover { transition: all 0.2s; }
        .card-hover:hover { border-color: rgba(255,255,255,0.2) !important; transform: translateY(-2px); }
        .result-safe     { --ring: rgba(34,197,94,0.3);   animation: flashRing 0.9s ease-out; }
        .result-spam     { --ring: rgba(245,158,11,0.3);  animation: flashRing 0.9s ease-out; }
        .result-phishing { --ring: rgba(239,68,68,0.3);   animation: flashRing 0.9s ease-out; }
        .result-abusive  { --ring: rgba(167,139,250,0.3); animation: flashRing 0.9s ease-out; }
      `}</style>

      {/* Ambient glows */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 900, height: 500, background: "radial-gradient(ellipse, rgba(255,255,255,0.025) 0%, transparent 65%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", top: 100, left: "15%", width: 500, height: 500, background: "radial-gradient(ellipse, rgba(77,142,245,0.05) 0%, transparent 70%)", borderRadius: "50%", animation: "glowPulse 5s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: 100, right: "15%", width: 500, height: 500, background: "radial-gradient(ellipse, rgba(167,139,250,0.04) 0%, transparent 70%)", borderRadius: "50%", animation: "glowPulse 5s ease-in-out infinite 2.5s" }} />
      </div>

      {/* ── Pill nav header ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, display: "flex", justifyContent: "center", padding: "14px 24px" }}>
        <nav style={{
          display: "flex", alignItems: "center", gap: 2,
          background: "rgba(20,20,20,0.8)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 99, padding: "4px 5px",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.07) inset, 0 8px 32px rgba(0,0,0,0.5)",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 14px 5px 8px", borderRadius: 99, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", marginRight: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg, #4d8ef5, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 12px rgba(77,142,245,0.5)" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2L3 7v6c0 5 4 9.3 9 10.3C17 22.3 21 18 21 13V7L12 2z"/></svg>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.3, color: "#fff" }}>TextShield</span>
          </div>

          {TABS.map(t => (
            <button key={t.id} className={`tab-btn${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}
              style={{ padding: "6px 15px", borderRadius: 99, border: "none", cursor: "pointer", background: "transparent", color: tab === t.id ? "#fff" : "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: tab === t.id ? 600 : 400, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
              {t.label}
              {t.count > 0 && (
                <span style={{ fontSize: 10, background: tab === t.id ? "rgba(77,142,245,0.3)" : "rgba(255,255,255,0.08)", color: tab === t.id ? C.accent : "rgba(255,255,255,0.35)", borderRadius: 99, padding: "1px 6px", fontFamily: "'DM Mono', monospace" }}>{t.count}</span>
              )}
            </button>
          ))}

          {/* Status */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px 5px 10px", marginLeft: 4, borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: serverOk === null ? "rgba(255,255,255,0.3)" : serverOk ? C.safe : C.phishing, boxShadow: serverOk ? `0 0 8px ${C.safe}` : "none", animation: serverOk === null ? "shimmer 1.5s ease-in-out infinite" : "none" }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{serverOk === null ? "…" : serverOk ? "Online" : "Offline"}</span>
          </div>
        </nav>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 80px", position: "relative", zIndex: 1 }}>

        {serverOk === false && (
          <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 28, fontSize: 13, color: C.phishing, display: "flex", alignItems: "center", gap: 8, backdropFilter: "blur(12px)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Server offline — run <code style={{ background: "rgba(239,68,68,0.15)", padding: "1px 8px", borderRadius: 4, fontFamily: "'DM Mono', monospace" }}>python 05_api_server.py</code>
          </div>
        )}

        {/* ════ CLASSIFIER ════ */}
        {tab === "classifier" && (
          <div style={{ animation: "fadeUp 0.35s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <h1 style={{ fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 900, letterSpacing: -3, lineHeight: 0.95, color: "#fff", marginBottom: 10 }}>Classifier</h1>
              <p style={{ color: C.muted, fontSize: 14 }}>DistilBERT fine-tuned across 4 federated clients — Safe · Spam · Phishing · Abusive</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 1000, margin: "0 auto" }}>
              {/* Left column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {/* ── Message Input — original style ── */}
                <GlassCard style={{ padding: 28 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 1.2 }}>Message</span>
                    <span style={{ fontSize: 11, color: input.length > 900 ? C.spam : C.muted, fontFamily: "'DM Mono', monospace" }}>{input.length}/{MAX_CHARS}</span>
                  </div>
                  <textarea value={input} onChange={e => setInput(e.target.value.slice(0, MAX_CHARS))}
                    placeholder="Type or paste a message to classify…" rows={7}
                    style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px", color: "#fff", fontSize: 14, resize: "vertical", fontFamily: "inherit", lineHeight: 1.65, transition: "border-color 0.2s, box-shadow 0.2s" }}
                  />
                  <button className="classify-btn" onClick={handleClassify}
                    disabled={loading || !input.trim() || !serverOk}
                    style={{
                      width: "100%", padding: "13px 0", borderRadius: 12, border: "none", marginTop: 14,
                      background: loading || !input.trim() || !serverOk ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.92)",
                      color: loading || !input.trim() || !serverOk ? C.muted : "#000",
                      fontSize: 14, fontWeight: 700,
                      cursor: loading || !input.trim() || !serverOk ? "not-allowed" : "pointer",
                      fontFamily: "inherit", letterSpacing: -0.2,
                      boxShadow: !loading && input.trim() && serverOk ? "0 0 40px rgba(255,255,255,0.12), 0 1px 0 rgba(255,255,255,0.5) inset" : "none",
                    }}>
                    {loading
                      ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.15)", borderTop: "2px solid rgba(255,255,255,0.6)", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                          Classifying…
                        </span>
                      : "Classify Message"
                    }
                  </button>
                  {error && <div style={{ marginTop: 10, color: C.phishing, fontSize: 12, textAlign: "center" }}>{error}</div>}
                </GlassCard>

                {/* ── Divider between the two sections ── */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px" }}>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.4, fontWeight: 600 }}>Federated Learning</span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>

                {/* ── FL Simulation — renders its own GlassCard, matches the rest ── */}
                <FLSimulation active={flActive} onComplete={() => setFlActive(false)} />
              </div>

              {/* Result */}
              <div>
                {!result && !loading && (
                  <GlassCard style={{ height: "100%", minHeight: 380, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <span style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.18)" }}>Awaiting Analysis</span>
                    <span style={{ fontSize: 13, color: C.muted, textAlign: "center", maxWidth: 200, lineHeight: 1.6 }}>Enter a message and click Classify</span>
                  </GlassCard>
                )}

                {loading && (
                  <GlassCard style={{ height: "100%", minHeight: 380, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                    <div style={{ width: 44, height: 44, border: "2px solid rgba(255,255,255,0.05)", borderTop: `2px solid ${C.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", boxShadow: `0 0 20px ${C.accent}50` }} />
                    <span style={{ color: C.muted, fontSize: 13 }}>Running inference…</span>
                  </GlassCard>
                )}

                {result && !loading && (() => {
                  const m = LABEL_META[result.label] || LABEL_META.Safe;
                  const lk = result.label.toLowerCase();
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeUp 0.35s ease" }}>
                      <GlassCard className={`result-${lk}`} glow={m.glow} style={{ overflow: "hidden" }}>
                        <div style={{ height: 2, background: m.color, boxShadow: `0 0 16px ${m.color}` }} />
                        <div style={{ padding: 24 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <Badge label={result.label} />
                              <span style={{ fontSize: 11, color: C.muted }}>Latency: <span style={{ fontFamily: "'DM Mono', monospace", color: latencyColor(result.latency_ms), fontWeight: 600 }}>{result.latency_ms?.toFixed(0)}ms</span></span>
                            </div>
                            <ConfidenceGauge confidence={result.confidence} color={m.color} size={88} />
                          </div>
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                              <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Risk Score</span>
                              <span style={{ fontSize: 11, color: m.color, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{result.risk_score?.toFixed(0)} / 100</span>
                            </div>
                            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 99, height: 5, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${result.risk_score}%`, borderRadius: 99, background: m.color, transition: "width 1s cubic-bezier(0.4,0,0.2,1)", boxShadow: `0 0 10px ${m.color}` }} />
                            </div>
                          </div>
                          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px", marginBottom: 12, fontSize: 13, lineHeight: 1.7 }}>
                            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Attention Highlights</div>
                            <HighlightedText text={input} keywords={result.keywords || []} />
                          </div>
                          <div style={{ background: m.bg, border: `1px solid ${m.border}`, borderRadius: 10, padding: "12px 14px", fontSize: 13, lineHeight: 1.6 }}>
                            <div style={{ fontSize: 10, color: m.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Reasoning</div>
                            <span style={{ color: C.textSub }}>{result.reasoning}</span>
                          </div>
                        </div>
                      </GlassCard>

                      <GlassCard style={{ padding: 20 }}>
                        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>All Probabilities</div>
                        {Object.entries(result.all_scores || {}).map(([lbl, score]) => {
                          const lm = LABEL_META[lbl] || LABEL_META.Safe;
                          return (
                            <div key={lbl} style={{ marginBottom: 11 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                <span style={{ fontSize: 12, fontWeight: 500, color: C.textSub }}>{lbl}</span>
                                <span style={{ fontSize: 12, color: C.muted, fontFamily: "'DM Mono', monospace" }}>{score.toFixed(1)}%</span>
                              </div>
                              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 99, height: 4 }}>
                                <div style={{ height: "100%", width: `${score}%`, background: lm.color, borderRadius: 99, transition: "width 0.7s ease", boxShadow: score > 20 ? `0 0 6px ${lm.color}60` : "none" }} />
                              </div>
                            </div>
                          );
                        })}
                      </GlassCard>

                      {result.keywords?.length > 0 && (
                        <GlassCard style={{ padding: 18 }}>
                          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Flagged Tokens</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {result.keywords.map((k, i) => (
                              <span key={i} style={{ padding: "3px 11px", borderRadius: 6, fontSize: 12, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24", fontFamily: "'DM Mono', monospace" }}>{k}</span>
                            ))}
                          </div>
                        </GlassCard>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ════ FEDERATED ════ */}
        {tab === "federated" && (
          <div style={{ animation: "fadeUp 0.35s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h1 style={{ fontSize: "clamp(32px, 4.5vw, 56px)", fontWeight: 900, letterSpacing: -2.5, lineHeight: 0.95, marginBottom: 10 }}>Federated</h1>
              <p style={{ color: C.muted, fontSize: 14 }}>FedAvg across 4 clients — raw data never leaves the device</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { title: "On-Device Training",     desc: "Each of the 4 clients trains DistilBERT locally on its private data partition.", color: C.accent },
                { title: "FedAvg Aggregation",     desc: "Server computes weighted average: w(t+1) = Σ(nk/n)·wk(t).", color: C.safe },
                { title: "Secure Aggregation",     desc: "Gaussian noise (differential privacy) added before sharing weights.", color: C.phishing },
                { title: "Continuous Improvement", desc: "After 3 rounds the federated model outperforms the centralised baseline.", color: C.spam },
              ].map((c, i) => (
                <GlassCard key={i} className="card-hover" style={{ padding: 22, borderLeft: `2px solid ${c.color}50` }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.text, marginBottom: 7 }}>{c.title}</div>
                  <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.65 }}>{c.desc}</div>
                </GlassCard>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <button onClick={() => { setFlTabActive(false); setTimeout(() => setFlTabActive(true), 100); }}
                style={{ padding: "6px 16px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: C.muted, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>
                Replay
              </button>
            </div>
            <FLSimulation active={flTabActive} onComplete={() => setFlTabActive(false)} />
            <GlassCard style={{ padding: 24, marginTop: 14 }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>FedAvg Formula</div>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "16px 24px", fontFamily: "'DM Mono', monospace", fontSize: 16, textAlign: "center", color: C.accent, border: "1px solid rgba(255,255,255,0.06)" }}>
                w(t+1) = Σ [nk / n] · wk(t)
              </div>
              <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
                {[{ name: "Device A", size: "35%", color: C.accent }, { name: "Device B", size: "25%", color: C.safe }, { name: "Device C", size: "25%", color: C.spam }, { name: "Device D", size: "15%", color: C.phishing }].map(d => (
                  <div key={d.name} style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: d.color }}>{d.name}</div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{d.size} of data</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {/* ════ DASHBOARD ════ */}
        {tab === "dashboard" && (
          <div style={{ animation: "fadeUp 0.35s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h1 style={{ fontSize: "clamp(32px, 4.5vw, 56px)", fontWeight: 900, letterSpacing: -2.5, lineHeight: 0.95, marginBottom: 10 }}>Dashboard</h1>
              <p style={{ color: C.muted, fontSize: 14 }}>Live metrics from the federated model</p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={fetchMetrics} style={{ padding: "7px 16px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: C.muted, cursor: "pointer", fontSize: 12, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                Refresh
              </button>
            </div>
            {!metrics ? (
              <div style={{ color: C.muted, textAlign: "center", padding: 80, fontSize: 14 }}>Loading metrics…</div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
                  <Metric label="Accuracy"      value={metrics.accuracy}             unit="%" color={C.safe} />
                  <Metric label="Precision"     value={metrics.precision}            unit="%" color={C.accent} />
                  <Metric label="Recall"        value={metrics.recall}               unit="%" color={C.spam} />
                  <Metric label="F1 Score"      value={metrics.f1_score}             unit="%" color={C.phishing} />
                  <Metric label="Avg Latency"   value={metrics.avg_latency_ms || 40} unit="ms" color={C.safe} />
                  <Metric label="Privacy Index" value={metrics.privacy_index}        unit="%" color={C.abusive} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <GlassCard style={{ padding: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Session Stats</div>
                    {[
                      { label: "Total Messages", value: metrics.total_messages, color: C.accent },
                      { label: "Flagged", value: metrics.flagged, color: C.phishing },
                      { label: "Safe", value: metrics.total_messages - metrics.flagged, color: C.safe },
                      { label: "FL Rounds", value: metrics.fl_rounds || 3, color: C.spam },
                      { label: "Clients", value: metrics.num_clients || 4, color: C.abusive },
                    ].map((s, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                        <span style={{ fontSize: 13, color: C.muted }}>{s.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: s.color }}>{s.value}</span>
                      </div>
                    ))}
                  </GlassCard>
                  <GlassCard style={{ padding: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Category Distribution</div>
                    {Object.entries(LABEL_META).map(([lbl, meta]) => {
                      const count = metrics.distribution?.[lbl] || 0;
                      const pct = metrics.total_messages > 0 ? (count / metrics.total_messages) * 100 : 0;
                      return (
                        <div key={lbl} style={{ marginBottom: 13 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                            <Badge label={lbl} size="sm" />
                            <span style={{ fontSize: 12, color: C.muted, fontFamily: "'DM Mono', monospace" }}>{count}</span>
                          </div>
                          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 99, height: 4 }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: meta.color, borderRadius: 99, transition: "width 0.6s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </GlassCard>
                </div>
              </>
            )}
          </div>
        )}

        {/* ════ HISTORY ════ */}
        {tab === "history" && (
          <div style={{ animation: "fadeUp 0.35s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h1 style={{ fontSize: "clamp(32px, 4.5vw, 56px)", fontWeight: 900, letterSpacing: -2.5, lineHeight: 0.95, marginBottom: 10 }}>History</h1>
              {/* Shows full count — no cap */}
              <p style={{ color: C.muted, fontSize: 15 }}>{history.length} messages classified</p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14, gap: 8 }}>
              <button onClick={fetchHistory} style={{ padding: "7px 16px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: C.muted, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Refresh</button>
              <button onClick={handleClearHistory} style={{ padding: "7px 16px", borderRadius: 99, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)", color: C.phishing, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Clear</button>
            </div>
            {history.length === 0 ? (
              <GlassCard style={{ padding: 80, textAlign: "center" }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.2" style={{ margin: "0 auto 14px", display: "block" }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <div style={{ color: C.muted, fontSize: 14 }}>No history yet. Classify a message to get started.</div>
              </GlassCard>
            ) : history.map((h, i) => (
              <div key={i} className="hist-row"
                onClick={() => { setInput(h.text); setTab("classifier"); }}
                style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "14px 20px", border: "1px solid rgba(255,255,255,0.07)", display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 14, alignItems: "center", marginBottom: 6, cursor: "pointer", backdropFilter: "blur(12px)" }}>
                <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.textSub }}>{h.text}</div>
                <Badge label={h.label} size="sm" />
                <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: C.muted }}>{h.confidence?.toFixed(1)}%</span>
                <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: latencyColor(h.latency_ms), fontWeight: 500 }}>{h.latency_ms?.toFixed(0)}ms</span>
                <span style={{ fontSize: 12, color: C.muted }}>{new Date(h.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* ════ ARCHITECTURE ════ */}
        {tab === "architecture" && (
          <div style={{ animation: "fadeUp 0.35s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h1 style={{ fontSize: "clamp(32px, 4.5vw, 56px)", fontWeight: 900, letterSpacing: -2.5, lineHeight: 0.95, marginBottom: 10 }}>Architecture</h1>
              <p style={{ color: C.muted, fontSize: 14 }}>SIGCE — Dept. CSE IoT, Cybersecurity & Blockchain — AY 2025–26</p>
            </div>
            <GlassCard style={{ padding: 32, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
                {[
                  { label: "Data", sub: "Excel Dataset", color: C.accent },
                  { label: "Preprocess", sub: "Clean + Tokenize", color: C.spam },
                  { label: "DistilBERT", sub: "66M params, 6 layers", color: C.phishing },
                  { label: "FedAvg", sub: "4 clients, 3 rounds", color: C.safe },
                  { label: "Explainability", sub: "Attention weights", color: C.abusive },
                  { label: "API + UI", sub: "FastAPI + React", color: C.accent },
                ].map((s, i, arr) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ width: 46, height: 46, borderRadius: 12, background: `${s.color}0d`, border: `1px solid ${s.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: s.color, margin: "0 auto 7px", boxShadow: `0 0 20px ${s.color}15` }}>{i + 1}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{s.sub}</div>
                    </div>
                    {i < arr.length - 1 && <span style={{ color: "rgba(255,255,255,0.12)", fontSize: 18, flexShrink: 0 }}>→</span>}
                  </div>
                ))}
              </div>
            </GlassCard>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[
                { n: "01", title: "Data Preprocessing", desc: "Excel dataset, regex cleaning, URL normalization, deduplication, stratified 80/10/10 split.", color: C.accent },
                { n: "02", title: "DistilBERT Classifier", desc: "distilbert-base-uncased, 66M params. Head: Dense(768→256) → ReLU → Dropout(0.3) → Dense(256→4).", color: C.phishing },
                { n: "03", title: "Federated Learning", desc: "4 clients, non-IID splits (35/25/25/15%). FedAvg + Gaussian noise for differential privacy.", color: C.safe },
                { n: "04", title: "Explainability", desc: "Attention weights from last DistilBERT layer. Top-k tokens highlighted per classification.", color: C.abusive },
                { n: "05", title: "FastAPI Backend", desc: "POST /classify, GET /metrics, GET /history. CORS enabled. Loads federated model on startup.", color: C.spam },
                { n: "06", title: "React Frontend", desc: "5-tab SPA: Classifier, Federated, Dashboard, History, Architecture. Connects to localhost:8000.", color: C.accent },
              ].map((m, i) => (
                <GlassCard key={i} className="card-hover" style={{ padding: 20 }}>
                  <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: m.color, marginBottom: 7, fontWeight: 500 }}>MODULE {m.n}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: C.text }}>{m.title}</div>
                  <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.65 }}>{m.desc}</div>
                </GlassCard>
              ))}
            </div>
            <GlassCard style={{ padding: 24, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Technology Stack</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {["Python 3.10", "PyTorch", "DistilBERT", "HuggingFace", "FedAvg", "FastAPI", "Uvicorn", "React.js", "Scikit-learn", "NumPy", "Pandas", "Differential Privacy"].map((t, i) => (
                  <span key={i} style={{ padding: "5px 13px", borderRadius: 7, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", fontSize: 12, fontFamily: "'DM Mono', monospace", color: C.textSub }}>{t}</span>
                ))}
              </div>
            </GlassCard>
            
          </div>
        )}
      </main>
    </div>
  );
}