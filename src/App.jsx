/* eslint-disable */
import { useState, useMemo, useRef, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBr-Vq8kDPrxNv8RojdrPa_GUgXth2tHmg",
  authDomain: "teamnight-d909b.firebaseapp.com",
  databaseURL: "https://teamnight-d909b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "teamnight-d909b",
  storageBucket: "teamnight-d909b.firebasestorage.app",
  messagingSenderId: "440378727824",
  appId: "1:440378727824:web:2c4bf51c6c57f8f7d96715"
};

const EDIT_PASSWORD = "008";
let fdb = null;
try { fdb = getDatabase(initializeApp(firebaseConfig)); } catch (e) {}
const dbSet = (p, val) => { 
  try { 
    if (fdb) {
      set(ref(fdb, p), val)
        .then(() => console.log("Firebase write OK:", p))
        .catch(e => console.error("Firebase write FAIL:", p, e));
    } else {
      console.error("fdb is null!");
    }
  } catch (e) { console.error("dbSet error:", e); } 
};

const ZONES = ["상부", "하부", "B", "C", "D", "P/Z", "T", "W", "V"];
const ZONE_COLORS = {
  "상부": "#7c3aed", "하부": "#2563eb", "B": "#ea580c", "C": "#0891b2",
  "D": "#dc2626", "P/Z": "#059669", "T": "#db2777", "W": "#65a30d", "V": "#6366f1",
};

try {
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css";
  document.head.appendChild(fontLink);
} catch (e) {}

const initData = () => {
  try {
    const s = localStorage.getItem("sorter3d_data");
    if (s) {
      const d = JSON.parse(s);
      if (d["P"] !== undefined && d["P/Z"] === undefined) { d["P/Z"] = d["P"]; delete d["P"]; }
      if (d["Z"] !== undefined && d["V"] === undefined) { d["V"] = d["Z"]; delete d["Z"]; }
      if (d["V"] === undefined) d["V"] = { done: "", picking: false };
      return d;
    }
  } catch (e) {}
  const d = {};
  ZONES.forEach(z => { d[z] = { done: "", picking: false }; });
  return d;
};

const initTotal = () => {
  try { return parseInt(localStorage.getItem("sorter3d_total")) || 20; } catch (e) { return 20; }
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
  const [totalBatches, setTotalBatches] = useState(initTotal);
  const [tempTotal, setTempTotal] = useState(String(initTotal()));
  const [activeZone, setActiveZone] = useState(ZONES[0]);
  const [activeBatch, setActiveBatch] = useState(1);
  const [copied, setCopied] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [zoneResetConfirm, setZoneResetConfirm] = useState(null);
  const [editable, setEditable] = useState(() => {
    try { return localStorage.getItem("sorter3d_editable") === "true"; } catch (e) { return false; }
  });
  const [showPwInput, setShowPwInput] = useState(false);
  const [pwValue, setPwValue] = useState("");
  const inputPanelRef = useRef(null);
  const resettingRef = useRef(false);

  const tryUnlock = () => {
    if (pwValue === EDIT_PASSWORD) {
      setEditable(true);
      try { localStorage.setItem("sorter3d_editable", "true"); } catch (e) {}
      setShowPwInput(false); setPwValue("");
    } else { setPwValue(""); }
  };
  const lockEdit = () => {
    setEditable(false);
    try { localStorage.setItem("sorter3d_editable", "false"); } catch (e) {}
  };

  const editableRef = useRef(editable);
  useEffect(() => { editableRef.current = editable; }, [editable]);

  const saveData = (d, zone) => {
    const isEditable = editable || (typeof localStorage !== "undefined" && localStorage.getItem("sorter3d_editable") === "true");
    if (!isEditable) return;
    setData(d);
    try { localStorage.setItem("sorter3d_data", JSON.stringify(d)); } catch (e) {}
    if (zone && d[zone]) { dbSet(`sorter3d/data/${zone}`, d[zone]); } else { dbSet("sorter3d/data", d); }
  };

  const saveTotal = (n) => {
    if (!editable) return;
    setTotalBatches(n);
    try { localStorage.setItem("sorter3d_total", String(n)); } catch (e) {}
    dbSet("sorter3d/total", n);
  };

  useEffect(() => {
    if (!fdb) return;
    const u1 = onValue(ref(fdb, "sorter3d/data"), snap => {
      if (resettingRef.current) return;
      const v = snap.val();
      if (v) { setData(v); try { localStorage.setItem("sorter3d_data", JSON.stringify(v)); } catch (e) {} }
    });
    const u2 = onValue(ref(fdb, "sorter3d/total"), snap => {
      const v = snap.val();
      if (v) { setTotalBatches(v); setTempTotal(String(v)); }
    });
    return () => { u1(); u2(); };
  }, []);

  const applyTotal = () => {
    const n = parseInt(tempTotal);
    if (!isNaN(n) && n > 0) saveTotal(n);
  };

  const selectBatch = (b) => {
    if (!editable) return;
    setActiveBatch(b);
    saveData({ ...data, [activeZone]: { ...data[activeZone], done: b } });
    if (inputPanelRef.current) inputPanelRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleDoneChange = (zone, val) => {
    const num = val === "" ? "" : Math.min(totalBatches, Math.max(0, parseInt(val) || 0));
    saveData({ ...data, [zone]: { ...data[zone], done: num } });
  };

  const togglePicking = (zone) => {
    const cur = data[zone];
    const newPicking = !(cur.picking || false);
    saveData({ ...data, [zone]: { ...cur, picking: newPicking, done: newPicking ? totalBatches : cur.done } });
  };

  const resetZone = (z, e) => {
    e.stopPropagation();
    if (!editable) return;
    if (zoneResetConfirm !== z) {
      setZoneResetConfirm(z);
      setTimeout(() => setZoneResetConfirm(null), 3000);
      return;
    }
    saveData({ ...data, [z]: { done: "", picking: false } });
    setZoneResetConfirm(null);
  };

  const resetAll = () => {
    if (!resetConfirm) { setResetConfirm(true); setTimeout(() => setResetConfirm(false), 3000); return; }
    try { localStorage.removeItem("sorter3d_data"); } catch (e) {}
    const d = initData();
    resettingRef.current = true;
    dbSet("sorter3d/data", d);
    setData(d);
    try { localStorage.setItem("sorter3d_data", JSON.stringify(d)); } catch (e) {}
    setResetConfirm(false);
    setTimeout(() => { resettingRef.current = false; }, 2000);
  };

  const zoneTotals = useMemo(() => {
    const out = {};
    ZONES.forEach(z => {
      const done = (data[z]||{done:"",picking:false}).done === "" ? 0 : Number((data[z]||{done:"",picking:false}).done);
      out[z] = { done, pct: totalBatches > 0 ? Math.min(100, Math.round((done / totalBatches) * 100)) : 0 };
    });
    return out;
  }, [data, totalBatches]);

  const grand = useMemo(() => {
    const doneSum = ZONES.reduce((s, z) => s + ((data[z]||{done:"",picking:false}).done === "" ? 0 : Number((data[z]||{done:"",picking:false}).done)), 0);
    const total = totalBatches * ZONES.length;
    return { pct: total > 0 ? Math.min(100, Math.round((doneSum / total) * 100)) : 0 };
  }, [data, totalBatches]);

  // data 변경 시 Firebase 자동 동기화
  useEffect(() => {
    dbSet("sorter3d/data", data);
  }, [data]);

  useEffect(() => {
    dbSet("summary/3ds", { pct: grand.pct, ts: Date.now() });
  }, [grand.pct, data]);

  const getSummaryText = () => {
    const now = new Date();
    const timeStr = `${now.getHours()}시${now.getMinutes().toString().padStart(2,"0")}분`;
    const month = now.getMonth() + 1, dateNum = now.getDate();
    const lines = [`3D Sorter (${timeStr})`, `${month}월${dateNum}일자 ${totalBatches}배치`, `──────────────`];
    const zoneStatus = {};
    ZONES.forEach(z => {
      const { done, pct } = zoneTotals[z];
      if ((data[z]||{done:"",picking:false}).picking) zoneStatus[z] = "완료";
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
    Object.entries(statusGroups).sort(([a],[b]) => {
      const ai = order.indexOf(a)>=0?order.indexOf(a):a==="미불출"?999:50;
      const bi = order.indexOf(b)>=0?order.indexOf(b):b==="미불출"?999:50;
      return ai-bi;
    }).forEach(([status, zones]) => {
      lines.push(`${zones.map(z=>z.length<=1?z+"존":z).join("/")} : ${status}`);
    });
    lines.push(`──────────────`, `토탈 ${grand.pct}%`);
    return lines.join("\n");
  };

  const S = { bg:"#f0f4f8",card:"#ffffff",border:"#e2e8f0",text:"#0f172a",textSub:"#64748b",inputBg:"#f8fafc",shadow:"0 1px 8px rgba(0,0,0,0.08)",shadowMd:"0 2px 16px rgba(0,0,0,0.10)" };
  const activeColor = ZONE_COLORS[activeZone];
  const currentDone = (data[activeZone]||{done:"",picking:false}).done;
  const currentPct = currentDone !== "" && totalBatches > 0 ? Math.round((Number(currentDone) / totalBatches) * 100) : null;

  return (
    <div style={{ minHeight:"100vh", background:S.bg, color:S.text, fontFamily:"'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif", padding:"20px 16px" }}>
      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <h1 style={{ fontSize:28, fontWeight:900, margin:0, letterSpacing:"0.08em", background:"linear-gradient(135deg,#db2877,#7c3aed)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>3D Sorter</h1>
        <div style={{ fontSize:11, letterSpacing:"0.3em", color:S.textSub, textTransform:"uppercase", marginTop:4, fontWeight:500 }}>피킹 진행 현황</div>
        <div style={{ marginTop:10 }}>
          {editable ? (
            <button onClick={lockEdit} style={{ fontSize:11, fontWeight:700, padding:"5px 16px", borderRadius:20, cursor:"pointer", background:"#dcfce7", border:"1px solid #86efac", color:"#15803d", fontFamily:"inherit" }}>🔓 수정 가능 · 탭하여 잠금</button>
          ) : showPwInput ? (
            <div style={{ display:"flex", gap:6, justifyContent:"center", alignItems:"center" }}>
              <input type="password" inputMode="numeric" value={pwValue} autoFocus onChange={e=>setPwValue(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryUnlock()} placeholder="비밀번호" style={{ width:100, background:"#fff", border:"1.5px solid #db2877", borderRadius:10, padding:"6px 10px", fontSize:14, fontWeight:700, outline:"none", textAlign:"center", fontFamily:"inherit" }} />
              <button onClick={tryUnlock} style={{ fontSize:12, fontWeight:800, padding:"7px 14px", borderRadius:10, cursor:"pointer", background:"#db2877", border:"none", color:"#fff", fontFamily:"inherit" }}>확인</button>
              <button onClick={()=>{setShowPwInput(false);setPwValue("");}} style={{ fontSize:12, fontWeight:700, padding:"7px 10px", borderRadius:10, cursor:"pointer", background:"#f8fafc", border:"1px solid #e2e8f0", color:"#94a3b8", fontFamily:"inherit" }}>취소</button>
            </div>
          ) : (
            <button onClick={()=>setShowPwInput(true)} style={{ fontSize:11, fontWeight:700, padding:"5px 16px", borderRadius:20, cursor:"pointer", background:"#f8fafc", border:"1px solid #e2e8f0", color:"#94a3b8", fontFamily:"inherit" }}>🔒 보기 전용 · 탭하여 잠금해제</button>
          )}
        </div>
      </div>

      {/* 배치 수 설정 */}
      <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:14, padding:"12px 14px", marginBottom:16, boxShadow:S.shadow, display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ fontSize:12, color:S.textSub, fontWeight:600 }}>오늘 배치 수</div>
        <input type="number" min={1} value={tempTotal} onChange={e=>setTempTotal(e.target.value)} onBlur={applyTotal} onKeyDown={e=>e.key==="Enter"&&applyTotal()} style={{ width:70, background:S.inputBg, border:`1px solid ${S.border}`, borderRadius:8, padding:"5px 8px", color:S.text, fontSize:16, fontWeight:700, outline:"none", textAlign:"center", fontFamily:"inherit" }} />
        <div style={{ fontSize:12, color:S.textSub }}>배치</div>
      </div>

      {/* Grand Total */}
      <div style={{ background:"linear-gradient(135deg,#db2877,#7c3aed)", borderRadius:16, padding:"18px 22px", marginBottom:16, display:"flex", alignItems:"center", gap:18, boxShadow:"0 4px 20px rgba(219,39,119,0.3)" }}>
        <div style={{ position:"relative", flexShrink:0 }}>
          <CircleProgress percent={grand.pct} color="#ffffff" size={86} />
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:17, fontWeight:800, color:"#fff" }}>{grand.pct}%</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", marginBottom:4 }}>전체 토탈 피킹작업률</div>
          <div style={{ fontSize:22, fontWeight:900, color:"#fff" }}>{grand.pct}%</div>
        </div>
      </div>

      {/* Zone Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
        {ZONES.map(z => {
          const { pct } = zoneTotals[z];
          const isActive = z === activeZone;
          const color = ZONE_COLORS[z];
          return (
            <div key={z} style={{ position:"relative" }}>
              <button onClick={()=>setActiveZone(z)} style={{ width:"100%", background:isActive?color+"12":S.card, border:`1.5px solid ${isActive?color:S.border}`, borderRadius:12, padding:"10px 6px", cursor:"pointer", textAlign:"center", boxShadow:S.shadow, transition:"all 0.2s" }}>
                <div style={{ fontSize:11, color, fontWeight:700, marginBottom:3 }}>{z} 존</div>
                <div style={{ fontSize:18, fontWeight:900, color:S.text, marginBottom:4 }}>{pct}%</div>
                <div style={{ height:4, background:"#e2e8f0", borderRadius:2 }}>
                  <div style={{ height:4, borderRadius:2, background:color, width:`${pct}%`, transition:"width 0.4s" }} />
                </div>
              </button>
              {editable && (
                <button onClick={e=>resetZone(z,e)} style={{ position:"absolute", top:4, right:4, fontSize:9, fontWeight:700, padding:"2px 5px", borderRadius:5, cursor:"pointer", background:zoneResetConfirm===z?"#fee2e2":"#f8fafc", border:`1px solid ${zoneResetConfirm===z?"#fecaca":"#e2e8f0"}`, color:zoneResetConfirm===z?"#dc2626":"#94a3b8", fontFamily:"inherit" }}>
                  {zoneResetConfirm===z?"확인":"↺"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 입력 패널 */}
      <div ref={inputPanelRef} style={{ background:S.card, border:`1.5px solid ${activeColor}`, borderRadius:16, padding:16, marginBottom:16, boxShadow:S.shadowMd }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:700, color:activeColor }}>{activeZone} 존</div>
        </div>

        {/* 피킹완료 버튼 */}
        {(() => {
          const isPicking = (data[activeZone]||{done:"",picking:false}).picking || false;
          const pct = zoneTotals[activeZone].pct;
          const isBul = pct === 100 && !isPicking;
          return (
            <button onClick={()=>togglePicking(activeZone)} style={{ width:"100%", marginBottom:12, fontSize:12, fontWeight:800, padding:"8px 0", borderRadius:9, cursor:"pointer", transition:"all 0.15s", background:isPicking?"#dcfce7":isBul?"#fef9c3":"#f8fafc", border:`1.5px solid ${isPicking?"#86efac":isBul?"#fde047":"#e2e8f0"}`, color:isPicking?"#15803d":isBul?"#a16207":"#94a3b8", fontFamily:"inherit" }}>
              {isPicking ? "✓ 피킹완료" : isBul ? "✓ 불출완료" : "피킹완료"}
            </button>
          );
        })()}

        {/* 배치 그리드 */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(10,1fr)", gap:4, marginBottom:14 }}>
          {Array.from({ length: totalBatches }, (_, i) => i + 1).map(b => {
            const done = (data[activeZone]||{done:"",picking:false}).done;
            const completed = done !== "" && b <= Number(done);
            const isAct = activeBatch === b;
            return (
              <button key={b} onClick={()=>selectBatch(b)} style={{ background:isAct?activeColor:completed?activeColor+"25":S.inputBg, border:`1px solid ${isAct?activeColor:completed?activeColor+"55":S.border}`, borderRadius:6, padding:"6px 1px", cursor:"pointer", color:isAct?"#fff":completed?activeColor:S.textSub, fontSize:11, fontWeight:700, transition:"all 0.1s", fontFamily:"inherit" }}>{b}</button>
            );
          })}
        </div>

        {/* 직접 입력 */}
        <div style={{ background:S.inputBg, borderRadius:12, padding:"14px 18px", border:`1px solid ${S.border}`, display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:S.textSub, marginBottom:6 }}>완료 배치 수</div>
            <input type="number" min={0} max={totalBatches} value={currentDone} onChange={e=>handleDoneChange(activeZone, e.target.value)} placeholder="0"
              style={{ width:"100%", background:S.card, border:`1.5px solid ${activeColor}`, borderRadius:10, padding:"10px 14px", color:S.text, fontSize:22, fontWeight:900, outline:"none", boxSizing:"border-box", textAlign:"center", fontFamily:"inherit" }} />
          </div>
          <div style={{ textAlign:"center", paddingTop:20 }}><div style={{ color:S.textSub, fontSize:18 }}>/</div></div>
          <div style={{ flex:1, textAlign:"center" }}>
            <div style={{ fontSize:11, color:S.textSub, marginBottom:6 }}>전체 배치</div>
            <div style={{ background:S.card, borderRadius:10, padding:"10px 14px", fontSize:22, fontWeight:900, color:S.textSub, border:`1px solid ${S.border}` }}>{totalBatches}</div>
          </div>
          <div style={{ minWidth:52, textAlign:"center", paddingTop:20, fontSize:22, fontWeight:900, color:currentPct!==null?activeColor:"#cbd5e1" }}>{currentPct!==null?`${currentPct}%`:"–"}</div>
        </div>
      </div>

      {/* 존별 요약 */}
      <div style={{ background:S.card, border:`1px solid ${S.border}`, borderRadius:16, padding:16, boxShadow:S.shadow }}>
        <div style={{ fontSize:13, fontWeight:700, color:S.text, marginBottom:12 }}>존별 요약</div>
        <div style={{ background:S.inputBg, borderRadius:10, padding:"10px 12px", marginBottom:10, fontSize:12, lineHeight:1.45, color:S.textSub, fontFamily:"monospace", whiteSpace:"pre-wrap", border:`1px solid ${S.border}` }}>
          {getSummaryText()}
        </div>
        <button onClick={()=>{navigator.clipboard.writeText(getSummaryText()).then(()=>setCopied(true));setTimeout(()=>setCopied(false),2000);}} style={{ width:"100%", background:copied?"#059669":"linear-gradient(135deg,#db2877,#7c3aed)", border:"none", borderRadius:8, padding:"10px 0", cursor:"pointer", color:"#fff", fontSize:13, fontWeight:700, marginBottom:14, fontFamily:"inherit" }}>
          {copied?"✓ 복사됨!":"📤 현황 공유"}
        </button>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {ZONES.map(z => {
            const pct = zoneTotals[z].pct;
            const color = ZONE_COLORS[z];
            return (
              <div key={z} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ fontSize:12, fontWeight:700, color, minWidth:32 }}>{z.length<=1?z+"존":z}</div>
                <div style={{ flex:1, height:8, background:"#e2e8f0", borderRadius:4 }}>
                  <div style={{ height:8, borderRadius:4, background:`linear-gradient(90deg,${color},${color}88)`, width:`${pct}%`, transition:"width 0.4s" }} />
                </div>
                <div style={{ fontSize:13, fontWeight:800, minWidth:40, textAlign:"right", color:pct===100?"#059669":S.text }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={resetAll} style={{ width:"100%", background:resetConfirm?"#fee2e2":S.card, border:`1px solid ${resetConfirm?"#dc2626":"#fecaca"}`, borderRadius:12, padding:"12px 0", cursor:"pointer", color:"#dc2626", fontSize:13, fontWeight:700, marginTop:16, boxShadow:S.shadow, fontFamily:"inherit" }}>
        {resetConfirm?"한 번 더 탭하면 초기화됩니다":"🔄 전체 초기화"}
      </button>
    </div>
  );
}
