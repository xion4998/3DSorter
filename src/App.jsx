/* eslint-disable */
import { useState, useMemo, useRef } from "react";

const ZONES = ["상부", "하부", "B", "C", "D", "P", "T", "W", "Z"];
const ZONE_COLORS = {
  "상부": "#7c3aed", "하부": "#2563eb", "B": "#ea580c", "C": "#0891b2",
  "D": "#dc2626", "P": "#059669", "T": "#db2777", "W": "#65a30d", "Z": "#d97706",
};
const MACHINES = [1, 2];

try {
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css";
  document.head.appendChild(fontLink);
} catch (e) {}

const initData = () => {
  try { const s = localStorage.getItem("sorter3d_data"); if (s) return JSON.parse(s); } catch (e) {}
  const d = {};
  ZONES.forEach(z => {
    d[z] = {};
    MACHINES.forEach(m => { d[z][m] = { done: "", picking: false }; });
  });
  return d;
};

const initTotals = () => {
  try { const s = localStorage.getItem("sorter3d_totals"); if (s) return JSON.parse(s); } catch (e) {}
  return { 1: 20, 2: 20 };
};

function CircleProgress({ percent, color, size = 90 }) {
  const r = (size - 10) / 2, circ = 2 * Math.PI * r, dash = (percent / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.5s ease" }} />
    </svg>
  );
}

export default function App() {
  const [data, setData] = useState(initData);
  const [totals, setTotals] = useState(initTotals);
  const [tempTotals, setTempTotals] = useState(() => { const t = initTotals(); return { 1: String(t[1]), 2: String(t[2]) }; });
  const [activeZone, setActiveZone] = useState(ZONES[0]);
  const [activeMachine, setActiveMachine] = useState(1);
  const [activeBatch, setActiveBatch] = useState(1);
  const [copied, setCopied] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [enabledMachines, setEnabledMachines] = useState(() => {
    try { const s = localStorage.getItem("sorter3d_enabled"); if (s) return JSON.parse(s); } catch (e) {}
    return { 1: true, 2: true };
  });
  const inputPanelRef = useRef(null);

  const saveData = (d) => { setData(d); try { localStorage.setItem("sorter3d_data", JSON.stringify(d)); } catch (e) {} };
  const saveTotals = (t) => { setTotals(t); try { localStorage.setItem("sorter3d_totals", JSON.stringify(t)); } catch (e) {} };

  const toggleMachineEnabled = (m) => {
    const next = { ...enabledMachines, [m]: !enabledMachines[m] };
    setEnabledMachines(next);
    try { localStorage.setItem("sorter3d_enabled", JSON.stringify(next)); } catch (e) {}
  };

  const applyTotal = (m) => {
    const n = parseInt(tempTotals[m]);
    if (!isNaN(n) && n > 0) saveTotals({ ...totals, [m]: n });
  };

  const totalBatches = totals[activeMachine];

  const selectBatch = (b) => {
    setActiveBatch(b);
    saveData({ ...data, [activeZone]: { ...data[activeZone], [activeMachine]: { ...data[activeZone][activeMachine], done: b } } });
    setTimeout(() => inputPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const handleDoneChange = (zone, machine, val) => {
    const num = val === "" ? "" : Math.min(totals[machine], Math.max(0, parseInt(val) || 0));
    saveData({ ...data, [zone]: { ...data[zone], [machine]: { ...data[zone][machine], done: num } } });
  };

  const togglePicking = (zone, machine) => {
    const cur = data[zone][machine];
    const newPicking = !cur.picking;
    saveData({ ...data, [zone]: { ...data[zone], [machine]: { ...cur, picking: newPicking, done: newPicking ? totals[machine] : cur.done } } });
  };

  const resetAll = () => {
    if (!resetConfirm) { setResetConfirm(true); setTimeout(() => setResetConfirm(false), 3000); return; }
    const d = {};
    ZONES.forEach(z => { d[z] = {}; MACHINES.forEach(m => { d[z][m] = { done: "", picking: false }; }); });
    saveData(d); setResetConfirm(false);
  };

  const zoneStats = useMemo(() => {
    const out = {};
    ZONES.forEach(z => {
      out[z] = {};
      let doneSum = 0, totalSum = 0;
      MACHINES.forEach(m => {
        const done = data[z][m].done === "" ? 0 : Number(data[z][m].done);
        out[z][m] = { done, pct: totals[m] > 0 ? Math.round((done / totals[m]) * 100) : 0 };
        doneSum += done; totalSum += totals[m];
      });
      out[z].pct = totalSum > 0 ? Math.round((doneSum / totalSum) * 100) : 0;
    });
    return out;
  }, [data, totals]);

  const machineStats = useMemo(() => {
    const out = {};
    MACHINES.forEach(m => {
      const doneSum = ZONES.reduce((s, z) => s + (data[z][m].done === "" ? 0 : Number(data[z][m].done)), 0);
      out[m] = totals[m] > 0 ? Math.round((doneSum / (totals[m] * ZONES.length)) * 100) : 0;
    });
    return out;
  }, [data, totals]);

  const grand = useMemo(() => {
    let doneSum = 0, totalSum = 0;
    ZONES.forEach(z => MACHINES.forEach(m => {
      doneSum += data[z][m].done === "" ? 0 : Number(data[z][m].done);
      totalSum += totals[m];
    }));
    return { pct: totalSum > 0 ? Math.round((doneSum / totalSum) * 100) : 0 };
  }, [data, totals]);

  const getSummaryText = () => {
    const now = new Date();
    const timeStr = `${now.getHours()}시${now.getMinutes().toString().padStart(2,"0")}분`;
    const month = now.getMonth() + 1, dateNum = now.getDate();
    const lines = [`3D Sorter (${timeStr})`, `${month}월${dateNum}일자`, `──────────────`];

    MACHINES.filter(m => enabledMachines[m]).forEach(m => {
      lines.push(`3D Sorter ${m}호기 (${totals[m]}배치)`);
      const zoneStatus = {};
      ZONES.forEach(z => {
        const { done, pct } = zoneStats[z][m];
        if (data[z][m].picking) zoneStatus[z] = "완료";
        else if (pct === 100) zoneStatus[z] = "불출완료";
        else if (done > 0) zoneStatus[z] = `${done}배치 불출중`;
        else zoneStatus[z] = "미불출";
      });
      const statusGroups = {};
      ZONES.forEach(z => {
        const st = zoneStatus[z];
        if (!statusGroups[st]) statusGroups[st] = [];
        statusGroups[st].push(z);
      });
      const order = ["완료", "불출완료"];
      const sorted = Object.entries(statusGroups).sort(([a], [b]) => {
        const ai = order.indexOf(a) >= 0 ? order.indexOf(a) : a === "미불출" ? 999 : 50;
        const bi = order.indexOf(b) >= 0 ? order.indexOf(b) : b === "미불출" ? 999 : 50;
        return ai - bi;
      });
      sorted.forEach(([status, zones]) => {
        lines.push(`${zones.map(z => z.length<=1?z+"존":z).join("/")} : ${status}`);
      });
    });

    lines.push(`──────────────`, `토탈 ${grand.pct}%`);
    return lines.join("\n");
  };

  const S = { bg: "#f0f4f8", card: "#ffffff", border: "#e2e8f0", text: "#0f172a", textSub: "#64748b", inputBg: "#f8fafc", shadow: "0 1px 8px rgba(0,0,0,0.08)", shadowMd: "0 2px 16px rgba(0,0,0,0.10)" };
  const mc = activeMachine === 1 ? "#7c3aed" : "#0891b2";
  const currentDone = data[activeZone][activeMachine].done;
  const currentPct = currentDone !== "" && totalBatches > 0 ? Math.round((Number(currentDone) / totalBatches) * 100) : null;

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif", padding: "20px 16px" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: "0.08em", background: "linear-gradient(135deg,#db2777,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>3D Sorter</h1>
        <div style={{ fontSize: 11, letterSpacing: "0.3em", color: S.textSub, textTransform: "uppercase", marginTop: 4, fontWeight: 500 }}>피킹 진행 현황</div>
      </div>

      {/* 배치 수 설정 (호기별) */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: "12px 14px", marginBottom: 16, boxShadow: S.shadow }}>
        <div style={{ fontSize: 12, color: S.textSub, fontWeight: 600, marginBottom: 8 }}>오늘 배치 수 설정</div>
        <div style={{ display: "flex", gap: 10 }}>
          {MACHINES.map(m => (
            <div key={m} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: S.inputBg, borderRadius: 10, padding: "8px 12px", border: `1px solid ${m===1?"#7c3aed":"#0891b2"}33` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: m===1?"#7c3aed":"#0891b2" }}>{m}호기</div>
              <input type="number" min={1} value={tempTotals[m]}
                onChange={e => setTempTotals({ ...tempTotals, [m]: e.target.value })}
                onBlur={() => applyTotal(m)}
                onKeyDown={e => e.key === "Enter" && applyTotal(m)}
                style={{ flex: 1, width: 50, background: S.card, border: `1px solid ${S.border}`, borderRadius: 7, padding: "5px 6px", color: S.text, fontSize: 15, fontWeight: 700, outline: "none", textAlign: "center", fontFamily: "inherit" }} />
              <div style={{ fontSize: 11, color: S.textSub }}>배치</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grand Total */}
      <div style={{ background: "linear-gradient(135deg,#db2777,#7c3aed)", borderRadius: 16, padding: "18px 22px", marginBottom: 16, display: "flex", alignItems: "center", gap: 18, boxShadow: "0 4px 20px rgba(219,39,119,0.3)" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <CircleProgress percent={grand.pct} color="#ffffff" size={86} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{grand.pct}%</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginBottom: 4 }}>전체 토탈 피킹작업률</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{grand.pct}%</div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {MACHINES.map(m => (
              <span key={m} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", fontWeight: 700 }}>
                {m}호기 {machineStats[m]}%
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Zone Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
        {ZONES.map(z => {
          const pct = zoneStats[z].pct;
          const isActive = z === activeZone;
          const color = ZONE_COLORS[z];
          return (
            <button key={z} onClick={() => setActiveZone(z)} style={{ background: isActive ? color+"12" : S.card, border: `1.5px solid ${isActive ? color : S.border}`, borderRadius: 12, padding: "10px 6px", cursor: "pointer", textAlign: "center", boxShadow: S.shadow, transition: "all 0.2s" }}>
              <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 3 }}>{z} 존</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: S.text, marginBottom: 4 }}>{pct}%</div>
              <div style={{ height: 4, background: "#e2e8f0", borderRadius: 2, marginBottom: 5 }}>
                <div style={{ height: 4, borderRadius: 2, background: color, width: `${pct}%`, transition: "width 0.4s" }} />
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                {MACHINES.map(m => {
                  const isPicking = data[z][m].picking;
                  const isBul = zoneStats[z][m].pct === 100 && !isPicking;
                  return (
                    <div key={m} style={{ flex: 1, fontSize: 8, fontWeight: 700, padding: "2px 0", borderRadius: 5, textAlign: "center", background: isPicking?"#dcfce7":isBul?"#fef9c3":"#f8fafc", color: isPicking?"#15803d":isBul?"#a16207":"#94a3b8", border: `1px solid ${isPicking?"#86efac":isBul?"#fde047":"#e2e8f0"}` }}>
                      {m}호{isPicking?"완료":isBul?"불출":""}
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      {/* 입력 패널 */}
      <div ref={inputPanelRef} style={{ background: S.card, border: `1.5px solid ${ZONE_COLORS[activeZone]}`, borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: S.shadowMd }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: ZONE_COLORS[activeZone] }}>{activeZone} 존</div>
          <div style={{ display: "flex", gap: 8 }}>
            {MACHINES.map(m => (
              <button key={m} onClick={() => setActiveMachine(m)} style={{ background: activeMachine===m?(m===1?"#7c3aed":"#0891b2"):S.inputBg, border: `1px solid ${m===1?"#7c3aed":"#0891b2"}`, borderRadius: 8, padding: "5px 16px", cursor: "pointer", color: activeMachine===m?"#fff":S.textSub, fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>{m}호기</button>
            ))}
          </div>
        </div>

        {/* 피킹완료 버튼 */}
        {(() => {
          const cur = data[activeZone][activeMachine];
          const isPicking = cur.picking;
          const pct = zoneStats[activeZone][activeMachine].pct;
          const isBul = pct === 100 && !isPicking;
          return (
            <button onClick={() => togglePicking(activeZone, activeMachine)} style={{ width: "100%", marginBottom: 12, fontSize: 12, fontWeight: 800, padding: "8px 0", borderRadius: 9, cursor: "pointer", transition: "all 0.15s", background: isPicking?"#dcfce7":isBul?"#fef9c3":"#f8fafc", border: `1.5px solid ${isPicking?"#86efac":isBul?"#fde047":"#e2e8f0"}`, color: isPicking?"#15803d":isBul?"#a16207":"#94a3b8", fontFamily: "inherit" }}>
              {isPicking ? "✓ 완료" : isBul ? "✓ 불출완료" : "피킹완료 체크"}
            </button>
          );
        })()}

        {/* 배치 그리드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 4, marginBottom: 14 }}>
          {Array.from({ length: totalBatches }, (_, i) => i + 1).map(b => {
            const done = data[activeZone][activeMachine].done;
            const completed = done !== "" && b <= Number(done);
            const isAct = activeBatch === b;
            return (
              <button key={b} onClick={() => selectBatch(b)} style={{ background: isAct ? ZONE_COLORS[activeZone] : completed ? ZONE_COLORS[activeZone]+"25" : S.inputBg, border: `1px solid ${isAct ? ZONE_COLORS[activeZone] : completed ? ZONE_COLORS[activeZone]+"55" : S.border}`, borderRadius: 6, padding: "6px 1px", cursor: "pointer", color: isAct ? "#fff" : completed ? ZONE_COLORS[activeZone] : S.textSub, fontSize: 11, fontWeight: 700, transition: "all 0.1s", fontFamily: "inherit" }}>{b}</button>
            );
          })}
        </div>

        {/* 입력 */}
        <div style={{ background: S.inputBg, borderRadius: 12, padding: "14px 18px", border: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: S.textSub, marginBottom: 6 }}>완료 배치 수</div>
            <input type="number" min={0} max={totalBatches} value={currentDone}
              onChange={e => handleDoneChange(activeZone, activeMachine, e.target.value)} placeholder="0"
              style={{ width: "100%", background: S.card, border: `1.5px solid ${ZONE_COLORS[activeZone]}`, borderRadius: 10, padding: "10px 14px", color: S.text, fontSize: 22, fontWeight: 900, outline: "none", boxSizing: "border-box", textAlign: "center", fontFamily: "inherit" }} />
          </div>
          <div style={{ textAlign: "center", paddingTop: 20 }}><div style={{ color: S.textSub, fontSize: 18 }}>/</div><div style={{ fontSize: 10, color: S.textSub }}>중</div></div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: S.textSub, marginBottom: 6 }}>전체 배치</div>
            <div style={{ background: S.card, borderRadius: 10, padding: "10px 14px", fontSize: 22, fontWeight: 900, color: S.textSub, border: `1px solid ${S.border}` }}>{totalBatches}</div>
          </div>
          <div style={{ minWidth: 52, textAlign: "center", paddingTop: 20, fontSize: 22, fontWeight: 900, color: currentPct !== null ? ZONE_COLORS[activeZone] : "#cbd5e1" }}>{currentPct !== null ? `${currentPct}%` : "–"}</div>
        </div>
      </div>

      {/* 존별 요약 */}
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 16, padding: 16, boxShadow: S.shadow }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: S.text }}>존별 요약</div>
          <div style={{ display: "flex", gap: 6 }}>
            {MACHINES.map(m => (
              <button key={m} onClick={() => toggleMachineEnabled(m)} style={{ fontSize: 10, fontWeight: 800, padding: "4px 12px", borderRadius: 8, cursor: "pointer", background: enabledMachines[m] ? (m===1?"#7c3aed":"#0891b2") : "#f8fafc", border: `1px solid ${m===1?"#7c3aed":"#0891b2"}`, color: enabledMachines[m] ? "#fff" : "#94a3b8", fontFamily: "inherit", transition: "all 0.15s" }}>
                {m}호기 {enabledMachines[m] ? "ON" : "OFF"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: S.inputBg, borderRadius: 10, padding: "12px 14px", marginBottom: 10, fontSize: 12, lineHeight: 1.8, color: S.textSub, fontFamily: "monospace", whiteSpace: "pre-wrap", border: `1px solid ${S.border}` }}>
          {getSummaryText()}
        </div>
        <button onClick={() => { navigator.clipboard.writeText(getSummaryText()).then(() => setCopied(true)); setTimeout(() => setCopied(false), 2000); }}
          style={{ width: "100%", background: copied ? "#059669" : "linear-gradient(135deg,#db2777,#7c3aed)", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 700, marginBottom: 14, fontFamily: "inherit" }}>
          {copied ? "✓ 복사됨!" : "📤 현황 공유"}
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ZONES.map(z => {
            const pct = zoneStats[z].pct;
            const color = ZONE_COLORS[z];
            return (
              <div key={z} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, minWidth: 32 }}>{z.length<=1?z+"존":z}</div>
                <div style={{ flex: 1, height: 8, background: "#e2e8f0", borderRadius: 4 }}>
                  <div style={{ height: 8, borderRadius: 4, background: `linear-gradient(90deg,${color},${color}88)`, width: `${pct}%`, transition: "width 0.4s" }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, minWidth: 40, textAlign: "right", color: pct===100?"#059669":S.text }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={resetAll} style={{ width: "100%", background: resetConfirm ? "#fee2e2" : S.card, border: `1px solid ${resetConfirm ? "#dc2626" : "#fecaca"}`, borderRadius: 12, padding: "12px 0", cursor: "pointer", color: "#dc2626", fontSize: 13, fontWeight: 700, marginTop: 16, boxShadow: S.shadow, fontFamily: "inherit" }}>
        {resetConfirm ? "한 번 더 탭하면 초기화됩니다" : "🔄 전체 초기화"}
      </button>
    </div>
  );
}
