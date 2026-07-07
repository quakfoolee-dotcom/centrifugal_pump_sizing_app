// Compare.jsx — side-by-side comparison of saved cases with delta column + curve overlay.

// Duty metrics for a full state snapshot (all SI internally).
window.pumpMetrics = function (state) {
  const pm = window.PumpMath;
  const { sys, pump, op, fluid } = state;
  const sumKs = pm.sumK(sys.fitS), sumKd = pm.sumK(sys.fitD);
  const sysEff = { ...sys, Ks: sumKs, Kd: sumKd };
  const effPump = pm.withViscosity(pump, sys.mu);
  const nSet = pm.nP(pump), arrange = pm.arr(pump);
  const opH = pm.combinedH(op.Q, effPump);
  const opEta = pm.combinedEta(op.Q, effPump);
  const opNPSHr = pm.combinedNPSHr(op.Q, effPump);
  const opNPSHa = pm.npshAvailable(op.Q, sysEff);
  const perQ = pm.perPumpQ(op.Q, effPump);
  const perH = arrange === "series" ? pm.pumpH(op.Q, effPump) : opH;
  const Phyd = pm.hydraulicPower(op.Q, opH, sys.rho);
  const PbrakePer = pm.brakePower(perQ, perH, sys.rho, opEta);
  const Pbrake = PbrakePer * nSet;
  const motorEff = 0.93, Pmotor = Pbrake / motorEff;
  const staticLift = pm.staticLift(sysEff), presHead = pm.pressureHead(sysEff);
  const hfS = pm.frictionHead(op.Q, sys.Ls, sys.Ds, sys.eps, sys.rho, sys.mu, sumKs);
  const hfD = pm.frictionHead(op.Q, sys.Ld, sys.Dd, sys.eps, sys.rho, sys.mu, sumKd);
  const TDH = staticLift + presHead + hfS + hfD;
  const Nss = pm.suctionSpecificSpeed(effPump);
  const Ns = pm.specificSpeed(pump.N, perQ, perH);
  const npshRatio = pump.npshRatio || 1.3;
  const ratio = opNPSHr > 0 ? opNPSHa / opNPSHr : 99;
  const margin = opNPSHa - opNPSHr;
  const cavOk = ratio >= npshRatio && margin >= 0.6;
  const bepQ = pm.combinedBEPflow(effPump);
  const bepPct = bepQ > 0 ? (op.Q / bepQ) * 100 : 0;
  const econ = state.econ || { hours: 8000, price: 0.12 };
  const en = pm.energy(Pbrake, motorEff, econ.hours, econ.price, op.Q);
  const fluidName = fluid.key === "Custom" ? (fluid.customName || "Custom") : fluid.key;
  return {
    Q: op.Q, H: opH, eta: opEta, Pbrake, Pmotor, opNPSHa, opNPSHr, margin, ratio,
    cavOk, bepPct, TDH, Nss, Ns, N: pump.N, D: pump.D, arrange, nSet,
    kWh: en.kWhPerYear, cost: en.costPerYear, spec: en.specific_kWh_m3,
    fluidName, npshRatio,
  };
};

const Compare = ({ liveState, cases, unitSystem }) => {
  const { useState } = React;
  const pm = window.PumpMath;
  const U = window.makeUnits(unitSystem || "SI");

  // Options: live "Current" + saved cases
  const options = { "◆ Current": liveState, ...cases };
  const names = Object.keys(options);
  const savedNames = Object.keys(cases);

  const [sel, setSel] = useState(() => {
    const init = ["◆ Current"];
    if (savedNames[0]) init.push(savedNames[0]); else init.push("◆ Current");
    return init;
  });

  const setSlot = (i, name) => setSel(s => s.map((v, j) => j === i ? name : v));
  const addSlot = () => setSel(s => s.length < 3 ? [...s, names[0]] : s);
  const rmSlot = (i) => setSel(s => s.length > 2 ? s.filter((_, j) => j !== i) : s);

  const states = sel.map(n => options[n]).filter(Boolean);
  const metrics = states.map(st => window.pumpMetrics(st));

  const COLORS = ["var(--ink)", "var(--accent)", "var(--cool)"];

  // ---- metric row definitions -------------------------------------------
  // dir: +1 higher is better, -1 lower is better, 0 neutral
  const rows = [
    { k: "Arrangement", get: m => m.arrange === "single" ? "single" : `${m.nSet}× ${m.arrange}`, txt: true },
    { k: "Fluid", get: m => m.fluidName, txt: true },
    { k: `Duty flow`, q: "flow", get: m => m.Q, n: 1 },
    { k: `Duty head`, q: "head", get: m => m.H, n: 2 },
    { k: `TDH`, q: "head", get: m => m.TDH, n: 2 },
    { k: `Efficiency`, get: m => m.eta * 100, unit: "%", n: 1, dir: 1 },
    { k: `Duty / BEP`, get: m => m.bepPct, unit: "%", n: 0, dir: 0, near100: true },
    { k: `Shaft power`, q: "power", get: m => m.Pbrake, n: 2, dir: -1 },
    { k: `Motor input`, q: "power", get: m => m.Pmotor, n: 2, dir: -1 },
    { k: `NPSH margin`, q: "head", get: m => m.margin, n: 2, dir: 1 },
    { k: `NPSHa / NPSHr`, get: m => m.ratio, unit: "×", n: 2, dir: 1 },
    { k: `Suction sp. speed`, get: m => m.Nss, unit: "—", n: 0, dir: -1 },
    { k: `Speed N`, get: m => m.N, unit: "rpm", n: 0 },
    { k: `Impeller D`, q: "dia", get: m => m.D, n: U.US ? 2 : 0 },
    { k: `Annual energy`, get: m => m.kWh / 1000, unit: "MWh", n: 1, dir: -1 },
    { k: `Annual cost`, get: m => m.cost, unit: "$", n: 0, dir: -1, money: true },
    { k: `Specific energy`, q: "specE", get: m => m.spec, n: 3, dir: -1 },
  ];

  const fmt = (r, m) => {
    if (r.txt) return r.get(m);
    const raw = r.get(m);
    const disp = r.q ? U.conv(r.q, raw) : raw;
    if (r.money) return "$ " + disp.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return disp.toFixed(r.n);
  };
  const unitOf = (r) => r.q ? U.unit(r.q) : (r.unit || "");

  // Delta: last vs first
  const delta = (r) => {
    if (r.txt || metrics.length < 2) return null;
    const a = r.get(metrics[0]);
    const b = r.get(metrics[metrics.length - 1]);
    const dRaw = b - a;
    const d = r.q ? U.conv(r.q, dRaw) - U.conv(r.q, 0) : dRaw; // linear
    const pct = a !== 0 ? (dRaw / Math.abs(a)) * 100 : 0;
    let color = "var(--mute)";
    if (r.dir === 1) color = dRaw > 0.0001 ? "var(--ok)" : dRaw < -0.0001 ? "var(--bad)" : "var(--mute)";
    if (r.dir === -1) color = dRaw < -0.0001 ? "var(--ok)" : dRaw > 0.0001 ? "var(--bad)" : "var(--mute)";
    const sign = dRaw > 0 ? "+" : "";
    const val = r.money ? `${sign}${Math.round(d).toLocaleString()}` : `${sign}${d.toFixed(r.n)}`;
    return { val, pct: `${sign}${pct.toFixed(0)}%`, color };
  };

  // ---- overlay chart -----------------------------------------------------
  const W = 760, Hc = 300, M = { l: 52, r: 20, t: 16, b: 38 };
  const iw = W - M.l - M.r, ih = Hc - M.t - M.b;
  const QmaxSI = Math.max(...states.map(st => 220 * (pm.arr(st.pump) === "parallel" ? pm.nP(st.pump) : 1)));
  const HmaxSI = Math.max(...states.map(st => pm.combinedShutoff(pm.withViscosity(st.pump, st.sys.mu)))) * 1.1;
  const sx = q => M.l + (q / QmaxSI) * iw;
  const syH = h => M.t + ih - (h / HmaxSI) * ih;
  const N = 60;
  const curveFor = (st, fn) => {
    const eff = pm.withViscosity(st.pump, st.sys.mu);
    const sysEff = { ...st.sys, Ks: pm.sumK(st.sys.fitS), Kd: pm.sumK(st.sys.fitD) };
    return Array.from({ length: N + 1 }, (_, i) => {
      const q = (i / N) * QmaxSI;
      return `${i === 0 ? "M" : "L"}${sx(q).toFixed(1)},${syH(fn(eff, sysEff, q)).toFixed(1)}`;
    }).join(" ");
  };
  const qTicks = []; for (let q = 0; q <= QmaxSI; q += (QmaxSI <= 250 ? 40 : 80)) qTicks.push(q);
  const hTicks = []; for (let h = 0; h <= HmaxSI; h += 10) hTicks.push(h);

  return (
    <div className="report-stage" style={{alignItems:"flex-start"}}>
      <div className="sheet" style={{width: 900}}>
        <div className="section-head" style={{marginTop:0}}>Case comparison</div>
        <div className="small" style={{color:"var(--mute)", margin:"-4px 0 14px", lineHeight:1.5}}>
          Compare any two or three saved cases (or ◆ Current) — the Δ column flags each change green when it helps (lower power/cost, more NPSH margin) and red when it hurts.
        </div>

        {/* Case selectors */}
        <div style={{display:"flex", gap:10, flexWrap:"wrap", marginBottom:16, alignItems:"center"}}>
          {sel.map((name, i) => (
            <div key={i} style={{display:"flex", alignItems:"center", gap:6}}>
              <span style={{width:10, height:10, background:COLORS[i], display:"inline-block"}} />
              <select className="fit-sel" style={{height:22, minWidth:130}}
                      value={name} onChange={e => setSlot(i, e.target.value)}>
                {names.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              {sel.length > 2 && <button className="cat-del" onClick={() => rmSlot(i)}>×</button>}
            </div>
          ))}
          {sel.length < 3 && names.length > sel.length &&
            <button className="btn" onClick={addSlot}>+ add case</button>}
          {savedNames.length === 0 &&
            <span className="small" style={{color:"var(--mute)"}}>Tip: save cases from the top bar to compare named scenarios.</span>}
        </div>

        {/* Metrics table */}
        <table className="cmp">
          <thead>
            <tr>
              <th style={{textAlign:"left"}}>Metric</th>
              {sel.map((n, i) => (
                <th key={i} style={{color: COLORS[i], textAlign:"right"}}>{n}</th>
              ))}
              {metrics.length >= 2 && <th style={{textAlign:"right"}}>Δ (last−first)</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => {
              const d = delta(r);
              return (
                <tr key={ri}>
                  <td>{r.k}{unitOf(r) && !r.txt ? <span style={{color:"var(--mute)"}}> · {unitOf(r)}</span> : ""}</td>
                  {metrics.map((m, i) => (
                    <td key={i} className="v" style={{textAlign:"right"}}>{fmt(r, m)}</td>
                  ))}
                  {metrics.length >= 2 && (
                    <td className="v" style={{textAlign:"right", color: d ? d.color : "var(--mute)"}}>
                      {d ? `${d.val}  (${d.pct})` : "—"}
                    </td>
                  )}
                </tr>
              );
            })}
            {/* Cavitation status row */}
            <tr>
              <td>Cavitation</td>
              {metrics.map((m, i) => (
                <td key={i} className="v" style={{textAlign:"right", color: m.cavOk ? "var(--ok)" : "var(--bad)"}}>
                  {m.cavOk ? "OK" : "REVIEW"}
                </td>
              ))}
              {metrics.length >= 2 && <td></td>}
            </tr>
          </tbody>
        </table>

        {/* Overlay chart */}
        <div className="section-head">Curve overlay</div>
        <div style={{border:"1px solid var(--rule)", marginTop:10}}>
          <svg viewBox={`0 0 ${W} ${Hc}`} style={{width:"100%", display:"block"}}>
            <rect x={M.l} y={M.t} width={iw} height={ih} fill="none" stroke="var(--rule)" />
            <g stroke="var(--rule-very-faint)">
              {qTicks.map(q => <line key={"q"+q} x1={sx(q)} y1={M.t} x2={sx(q)} y2={M.t+ih} />)}
              {hTicks.map(h => <line key={"h"+h} x1={M.l} y1={syH(h)} x2={M.l+iw} y2={syH(h)} />)}
            </g>
            {qTicks.map(q => (
              <text key={"qt"+q} x={sx(q)} y={M.t+ih+14} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--mute)">
                {U.conv("flow", q).toFixed(0)}
              </text>
            ))}
            {hTicks.map(h => (
              <text key={"ht"+h} x={M.l-6} y={syH(h)+3} textAnchor="end" fontFamily="var(--mono)" fontSize="9" fill="var(--mute)">
                {U.conv("head", h).toFixed(0)}
              </text>
            ))}
            <text x={M.l+iw/2} y={Hc-6} textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-2)">Q — {U.unit("flow")}</text>
            <text x={12} y={M.t+ih/2} textAnchor="middle" transform={`rotate(-90 12 ${M.t+ih/2})`} fontFamily="var(--mono)" fontSize="9" fill="var(--ink-2)">H — {U.unit("head")}</text>

            {states.map((st, i) => {
              const eff = pm.withViscosity(st.pump, st.sys.mu);
              const sysEff = { ...st.sys, Ks: pm.sumK(st.sys.fitS), Kd: pm.sumK(st.sys.fitD) };
              const cross = pm.operatingPointCombined(eff, sysEff, QmaxSI);
              return (
                <g key={i}>
                  <path d={curveFor(st, (e, s, q) => pm.combinedH(q, e))} fill="none" stroke={COLORS[i]} strokeWidth="1.6" />
                  <path d={curveFor(st, (e, s, q) => pm.systemHead(q, s))} fill="none" stroke={COLORS[i]} strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
                  {cross.Q > 0 && <circle cx={sx(cross.Q)} cy={syH(cross.H)} r="4" fill="var(--paper)" stroke={COLORS[i]} strokeWidth="1.5" />}
                </g>
              );
            })}
          </svg>
        </div>
        <div style={{display:"flex", gap:18, marginTop:8, fontSize:11, color:"var(--ink-2)"}}>
          {sel.map((n, i) => (
            <span key={i}><span style={{display:"inline-block", width:14, height:0, borderTop:`2px solid ${COLORS[i]}`, transform:"translateY(-3px)", marginRight:6}} />{n}</span>
          ))}
          <span style={{color:"var(--mute)"}}>— solid = pump · dashed = system · ○ = duty</span>
        </div>
      </div>
    </div>
  );
};

window.Compare = Compare;
