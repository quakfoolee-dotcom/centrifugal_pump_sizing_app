// Calculator.jsx — main calculator screen

const { useMemo, useState, useRef, useEffect } = React;

// Module-level units helper, refreshed at the top of each Calculator render.
let U = window.makeUnits("SI");

const Field = ({ label, sub, value, unit, qty = "none", onChange, step = 1, min, max, locked = false }) => {
  const useU = qty !== "none";
  const disp = useU ? U.conv(qty, value) : value;
  const unitLabel = useU ? U.unit(qty) : unit;
  return (
    <div className={"field" + (locked ? " locked" : "")}>
      <div className="name">{label}{sub ? <span className="sub">{sub}</span> : null}</div>
      <input
        type="number"
        value={Number.isFinite(disp) ? +disp.toFixed(3).replace(/\.?0+$/, "") : disp}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const raw = parseFloat(e.target.value);
          onChange(useU && Number.isFinite(raw) ? U.toSI(qty, raw) : raw);
        }}
        readOnly={locked}
      />
      <div className="unit">{unitLabel}</div>
    </div>
  );
};

const Slider = ({ label, value, onChange, min, max, step, fmt, unit }) => (
  <div className="slider-row">
    <div className="top">
      <span className="name">{label}</span>
      <span className="val">{fmt ? fmt(value) : value}<span style={{color:"var(--mute)", marginLeft:4}}>{unit}</span></span>
    </div>
    <input type="range" value={value} min={min} max={max} step={step}
           onChange={(e) => onChange(parseFloat(e.target.value))} />
    <div className="range-caps"><span>{min}</span><span>{max}</span></div>
  </div>
);

const KV = ({ k, v, u }) => (
  <div className="kv"><span className="k">{k}</span><span className="v">{v}</span><span className="u">{u}</span></div>
);

// Fittings-by-count editor. Adds rows of {type, qty} -> ΣK.
const FittingsTable = ({ list, onChange }) => {
  const F = window.PumpMath.FITTINGS;
  const rows = Array.isArray(list) ? list : [];
  const setRow = (i, patch) => onChange(rows.map((r, j) => j === i ? { ...r, ...patch } : r));
  const addRow = () => onChange([...rows, { type: "elbow90_lr", qty: 1 }]);
  const delRow = (i) => onChange(rows.filter((_, j) => j !== i));
  return (
    <div style={{padding:"2px var(--pad) 8px"}}>
      {rows.map((r, i) => (
        <div key={i} style={{display:"grid", gridTemplateColumns:"1fr 40px 30px 18px", gap:5, alignItems:"center", marginBottom:3}}>
          <select className="fit-sel" value={r.type} onChange={e => setRow(i, { type: e.target.value })}>
            {Object.entries(F).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <input className="cat-in" type="number" min={1} step={1} value={r.qty ?? 1}
                 onChange={e => setRow(i, { qty: Math.max(0, parseInt(e.target.value) || 0) })}/>
          <span className="mono" style={{fontSize:10, color:"var(--mute)", textAlign:"right"}}>
            {(F[r.type] ? F[r.type].K * (r.qty || 0) : 0).toFixed(2)}
          </span>
          <button className="cat-del" onClick={() => delRow(i)} title="remove">×</button>
        </div>
      ))}
      <button className="btn" style={{marginTop:2, width:"100%"}} onClick={addRow}>+ add fitting</button>
    </div>
  );
};

// Pipe schedule picker: DN + schedule -> sets ID (mm).
const PipePicker = ({ id_mm, onPick }) => {
  const PM = window.PumpMath;
  const cur = PM.nearestPipe(id_mm);
  const dn = cur ? cur.dn : 150;
  const sch = cur ? cur.sch : 40;
  return (
    <div className="field" style={{gridTemplateColumns:"1fr 62px 62px"}}>
      <div className="name">Std pipe<span className="sub">DN·Sch</span></div>
      <select className="fit-sel" value={dn}
              onChange={e => { const v = +e.target.value; const id = PM.pipeID(v, sch); if (id) onPick(id); }}>
        {PM.PIPE_DNS.map(d => <option key={d} value={d}>{d} · {PM.PIPE_NPS[d]}</option>)}
      </select>
      <select className="fit-sel" value={sch}
              onChange={e => { const v = +e.target.value; const id = PM.pipeID(dn, v); if (id) onPick(id); }}>
        {PM.PIPE_SCHEDULES.map(s => <option key={s} value={s}>Sch {s}</option>)}
      </select>
    </div>
  );
};

const Calculator = ({ state, setState }) => {  U = window.makeUnits(state.unitSystem || "SI");
  const { fluid, sys, pump, op } = state;

  const set = (group) => (patch) =>
    setState(s => ({ ...s, [group]: { ...s[group], ...patch } }));

  // Manual edit of a fluid property drops the preset link -> switch to Custom.
  const setFluidProp = (patch) =>
    setState(s => ({ ...s, fluid: { ...s.fluid, key: "Custom" }, sys: { ...s.sys, ...patch } }));

  // Derived values at solved duty point
  const pm = window.PumpMath;
  const duty = window.computeDuty(state);
  const {
    fitS, fitD, sumKs, sumKd, sysEff, effPump, affinity, affinityOutOfBounds, nSet, arrange,
    dutyQ, dutyPoint, noDutyPoint, Qmax,
    opH, opEta, opNPSHr, opNPSHa, perQ, perH,
    Phyd, PbrakePer, Pbrake, motorEff, Pmotor, motor,
    Ns, Nss, vSuction, vDischarge, hfSuction, hfDischarge,
    staticLift, presHead, TDH, Re_s, flowRegimeS, transitionalFlow,
    hasGenericReducer, minorLossesApprox,
    design, ratedQ, ratedHsys, ratedLeftOfBEP,
    speedForDuty, speedForDutyStatus, speedForDutyClamped, speedTargetAffinityOk, minVfd,
    econ, en,
    visc, viscActive, viscHighRisk, curveEstimated, fluidPropsEstimated,
    npshRatio, npshMarginAbs, margin, ratioActual, cavOk,
    bepQ, bepPct, qMin, belowMinFlow, highSuctionEnergy, inPOR,
    sN, sD,
  } = duty;
  const speedLabel =
    speedForDutyStatus === "above-max" ? `>${speedForDuty.toFixed(0)}` :
    speedForDutyStatus === "below-min" ? `<${speedForDuty.toFixed(0)}` :
    Number.isFinite(speedForDuty) ? speedForDuty.toFixed(0) : "n/a";
  const canSetSpeed = !noDutyPoint && speedForDutyStatus === "solved" && speedTargetAffinityOk && Number.isFinite(speedForDuty);
  const vfdAffinityWarn = speedForDutyStatus === "solved" && !speedTargetAffinityOk;
  const motorSelectText = U.US
    ? (motor.selected_hp > 0 ? motor.selected_hp.toFixed(motor.selected_hp < 10 ? 1 : 0) : "n/a")
    : (motor.selected_kW > 0 ? motor.selected_kW.toFixed(motor.selected_kW < 10 ? 2 : 1) : "n/a");
  const speedSliderMin = Math.round(pump.N0 * pm.AFFINITY_BOUNDS.speedMin / 10) * 10;
  const speedSliderMax = Math.round(pump.N0 * pm.AFFINITY_BOUNDS.speedMax / 10) * 10;
  const diaSliderMin = Math.round(pump.D0 * pm.AFFINITY_BOUNDS.diameterMin);
  const diaSliderMax = Math.round(pump.D0 * pm.AFFINITY_BOUNDS.diameterMax);

  // Catalog-point editor helpers
  const catalog = Array.isArray(pump.catalog) ? pump.catalog : [];
  const setCat = (i, key, val) => {
    const next = catalog.map((r, j) => j === i ? { ...r, [key]: val } : r);
    set("pump")({ catalog: next });
  };
  const addCat = () => {
    const last = catalog[catalog.length - 1] || { q: 0, h: 0 };
    set("pump")({ catalog: [...catalog, { q: Math.round((last.q || 0) + 40), h: 0, eta: 0, npshr: 0 }] });
  };
  const delCat = (i) => set("pump")({ catalog: catalog.filter((_, j) => j !== i) });

  const fluidPresets = {
    Water:      { name: "Water",                rho: 998,  mu: 1.0,   Pvap_kPa: 2.34,  Tref: 20, cat: "water" },
    SeaWater:   { name: "Sea water",            rho: 1025, mu: 1.08,  Pvap_kPa: 2.34,  Tref: 20, cat: "aqueous" },
    Glycol30:   { name: "Ethylene glycol 30%",  rho: 1040, mu: 2.1,   Pvap_kPa: 1.8,   Tref: 20, cat: "aqueous" },
    Glycol50:   { name: "Ethylene glycol 50%",  rho: 1068, mu: 3.8,   Pvap_kPa: 1.2,   Tref: 20, cat: "aqueous" },
    PropGlycol: { name: "Propylene glycol 40%", rho: 1035, mu: 6.5,   Pvap_kPa: 1.0,   Tref: 20, cat: "aqueous" },
    Methanol:   { name: "Methanol",             rho: 791,  mu: 0.55,  Pvap_kPa: 16.9,  Tref: 25, cat: "organic" },
    Ethanol:    { name: "Ethanol",              rho: 789,  mu: 1.07,  Pvap_kPa: 7.9,   Tref: 25, cat: "organic" },
    Diesel:     { name: "Diesel / gas oil",     rho: 840,  mu: 3.5,   Pvap_kPa: 0.4,   Tref: 20, cat: "organic" },
    Oil:        { name: "Light oil",            rho: 870,  mu: 32,    Pvap_kPa: 0.05,  Tref: 40, cat: "organic" },
    Oil150:     { name: "Lube oil ISO VG 150",  rho: 890,  mu: 150,   Pvap_kPa: 0.01,  Tref: 40, cat: "organic" },
    Kerosene:   { name: "Kerosene",             rho: 810,  mu: 1.6,   Pvap_kPa: 3.2,   Tref: 20, cat: "organic" },
    Gasoline:   { name: "Gasoline",             rho: 745,  mu: 0.5,   Pvap_kPa: 55.0,  Tref: 20, cat: "organic" },
    Ammonia:    { name: "Ammonia (liquid)",     rho: 603,  mu: 0.13,  Pvap_kPa: 1003,  Tref: 25, cat: "organic" },
    Brine:      { name: "NaCl brine 20%",       rho: 1148, mu: 1.9,   Pvap_kPa: 1.8,   Tref: 20, cat: "aqueous" },
    CaCl2:      { name: "CaCl₂ brine 25%",      rho: 1230, mu: 4.2,   Pvap_kPa: 1.5,   Tref: 20, cat: "aqueous" },
    SulfAcid:   { name: "Sulfuric acid 98%",    rho: 1840, mu: 26,    Pvap_kPa: 0.001, Tref: 25, cat: "organic" },
    CausticSoda:{ name: "Caustic soda 30%",     rho: 1330, mu: 6.8,   Pvap_kPa: 1.6,   Tref: 20, cat: "aqueous" },
    CrudeOil:   { name: "Crude oil (light)",    rho: 850,  mu: 10,    Pvap_kPa: 0.3,   Tref: 20, cat: "organic" },
    Slurry:     { name: "Slurry (10% solids)",  rho: 1080, mu: 5.0,   Pvap_kPa: 2.34,  Tref: 20, cat: "aqueous" },
  };

  const curPreset = fluidPresets[fluid.key];
  const tempC = fluid.tempC != null ? fluid.tempC : (curPreset ? curPreset.Tref : 20);
  // Apply a preset at a given temperature -> derive & write properties.
  const applyFluid = (key, T) => {
    if (key === "Custom") { set("fluid")({ key: "Custom" }); return; }
    const p = fluidPresets[key];
    const dp = pm.deriveProps(p, T);
    setState(s => ({
      ...s,
      fluid: { ...s.fluid, key, tempC: T },
      sys: { ...s.sys, rho: dp.rho, mu: dp.mu, Pvap_kPa: dp.Pvap_kPa },
    }));
  };

  const fluidName = fluid.key === "Custom"
    ? (fluid.customName || "Custom fluid")
    : (fluidPresets[fluid.key] ? fluidPresets[fluid.key].name : fluid.key);

  return (
    <div className="doc">
      {/* ---- LEFT : inputs ---- */}
      <div className="panel">
        <div className="panel-header">
          <h3>System · Inputs</h3>
          <span className="badge">SI</span>
        </div>

        <div className="section">
          <div className="section-title"><span>Fluid</span><span className="hint">{fluid.key === "Custom" ? "manual" : "props @ T"}</span></div>
          <div style={{padding:"6px var(--pad)"}}>
            <select
              className="mono small"
              style={{width:"100%", padding:"4px 6px", background:"var(--paper-2)", border:"1px solid var(--rule-faint)", fontFamily:"var(--mono)"}}
              value={fluid.key}
              onChange={(e) => {
                const k = e.target.value;
                if (k === "Custom") { set("fluid")({ key: "Custom" }); return; }
                applyFluid(k, fluidPresets[k].Tref);
              }}
            >
              {Object.entries(fluidPresets).map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
              <option disabled>──────────</option>
              <option value="Custom">Custom fluid…</option>
            </select>
          </div>
          {fluid.key === "Custom" && (
            <div className="field" style={{gridTemplateColumns:"1fr"}}>
              <input
                type="text"
                placeholder="Custom fluid name…"
                value={fluid.customName || ""}
                onChange={(e) => set("fluid")({ customName: e.target.value })}
                style={{textAlign:"left", width:"100%"}}
              />
            </div>
          )}
          {fluid.key !== "Custom" && (
            <div className="slider-row">
              <div className="top">
                <span className="name">Temperature</span>
                <span className="val">{U.conv("temp", tempC).toFixed(0)}<span style={{color:"var(--mute)", marginLeft:4}}>{U.unit("temp")}</span></span>
              </div>
              <input type="range" min={0} max={curPreset && curPreset.cat === "water" ? 99 : 180} step={1}
                     value={tempC} onChange={(e) => applyFluid(fluid.key, parseFloat(e.target.value))}/>
              <div className="range-caps"><span>{U.conv("temp", 0).toFixed(0)}</span><span>{U.conv("temp", curPreset && curPreset.cat === "water" ? 99 : 180).toFixed(0)}{U.unit("temp")}</span></div>
            </div>
          )}
          <Field label="Density" sub="ρ" value={sys.rho} qty="dens" step={1} onChange={v => setFluidProp({ rho: v })}/>
          <Field label="Viscosity" sub="μ" value={sys.mu} unit="cP" step={0.1} onChange={v => setFluidProp({ mu: v })}/>
          <Field label="Vapor pressure" sub="Pv" value={sys.Pvap_kPa} qty="press" step={0.1} onChange={v => setFluidProp({ Pvap_kPa: v })}/>
          <Field label="Atmospheric" sub="Patm" value={sys.Patm_kPa} qty="press" step={0.5} onChange={v => set("sys")({ Patm_kPa: v })}/>
        </div>

        <div className="section">
          <div className="section-title"><span>Static &amp; vessels</span><span className="hint">+flooded / −lift</span></div>
          <Field label="Suction level" sub="Zs" value={sys.Zs} qty="head" step={0.1} onChange={v => set("sys")({ Zs: v })}/>
          <Field label="Discharge level" sub="Zd" value={sys.Zd} qty="head" step={0.5} onChange={v => set("sys")({ Zd: v })}/>
          <Field label="Suction vessel" sub="Ps" value={sys.Ps_kPa} qty="press" step={1} onChange={v => set("sys")({ Ps_kPa: v })}/>
          <Field label="Discharge vessel" sub="Pd" value={sys.Pd_kPa} qty="press" step={1} onChange={v => set("sys")({ Pd_kPa: v })}/>
        </div>

        <div className="section">
          <div className="section-title"><span>Suction line</span><span className="hint">ΣK {sumKs.toFixed(2)}</span></div>
          <PipePicker id_mm={sys.Ds} onPick={id => set("sys")({ Ds: id })} />
          <Field label="Inside diameter" sub="D" value={sys.Ds} qty="dia" step={1} min={1} onChange={v => set("sys")({ Ds: Number.isFinite(v) ? Math.max(1, v) : v })}/>
          <Field label="Length" sub="L" value={sys.Ls} qty="len" step={0.5} onChange={v => set("sys")({ Ls: v })}/>
          <FittingsTable list={fitS} onChange={(next) => set("sys")({ fitS: next })} />
        </div>

        <div className="section">
          <div className="section-title"><span>Discharge line</span><span className="hint">ΣK {sumKd.toFixed(2)}</span></div>
          <PipePicker id_mm={sys.Dd} onPick={id => set("sys")({ Dd: id })} />
          <Field label="Inside diameter" sub="D" value={sys.Dd} qty="dia" step={1} min={1} onChange={v => set("sys")({ Dd: Number.isFinite(v) ? Math.max(1, v) : v })}/>
          <Field label="Length" sub="L" value={sys.Ld} qty="len" step={0.5} onChange={v => set("sys")({ Ld: v })}/>
          <FittingsTable list={fitD} onChange={(next) => set("sys")({ fitD: next })} />
          <Field label="Pipe roughness" sub="ε" value={sys.eps} qty="dia" step={0.01} onChange={v => set("sys")({ eps: v })}/>
        </div>

        <div className="section">
          <div className="section-title"><span>Pump — reference (water)</span><span className="hint">BEP@N₀,D₀</span></div>
          <div className="field" style={{gridTemplateColumns:"1fr 96px 34px"}}>
            <div className="name">Arrangement</div>
            <select className="fit-sel" style={{gridColumn:"2 / span 2", height:20}}
                    value={arrange}
                    onChange={e => set("pump")({ arrangement: e.target.value })}>
              <option value="single">Single</option>
              <option value="parallel">Parallel</option>
              <option value="series">Series</option>
            </select>
          </div>
          {arrange !== "single" && (
            <Field label="No. of pumps" sub="n" value={pump.nPumps ?? 2} unit="×" step={1} min={2} max={6} onChange={v => set("pump")({ nPumps: Math.round(v) })}/>
          )}
          <Field label="BEP flow" sub="Q_bep" value={pump.Qb} qty="flow" step={1} onChange={v => set("pump")({ Qb: v })}/>
          <Field label="BEP head" sub="H_bep" value={pump.Hb} qty="head" step={0.5} onChange={v => set("pump")({ Hb: v })}/>
          <Field label="Max efficiency" sub="η_max" value={pump.etaMax} unit="—" step={0.01} min={0.3} max={0.9} onChange={v => set("pump")({ etaMax: v })}/>
          <Field label="NPSHr at BEP" value={pump.NPSHr_bep} qty="head" step={0.1} onChange={v => set("pump")({ NPSHr_bep: v })}/>
          <Field label="Ref. speed" sub="N₀" value={pump.N0} unit="rpm" step={50} onChange={v => set("pump")({ N0: v })}/>
          <Field label="Ref. impeller" sub="D₀" value={pump.D0} qty="dia" step={1} onChange={v => set("pump")({ D0: v })}/>
        </div>

        <div className="section">
          <div className="section-title">
            <span>Catalog curve</span>
            <span className="hint">
              <label style={{cursor:"pointer", display:"inline-flex", alignItems:"center", gap:5}}>
                <input type="checkbox" checked={!!pump.useCatalog}
                       onChange={e => set("pump")({ useCatalog: e.target.checked })}
                       style={{margin:0, accentColor:"var(--accent)"}}/>
                fit to points
              </label>
            </span>
          </div>
          {pump.useCatalog && (
            <div style={{padding:"4px var(--pad) 8px"}}>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 18px", gap:4, alignItems:"center",
                           fontSize:9, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--mute)", marginBottom:4}}>
                <span>Q m³/h</span><span>H m</span><span>η —</span><span>NPSHr</span><span></span>
              </div>
              {catalog.map((r, i) => (
                <div key={i} style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 18px", gap:4, alignItems:"center", marginBottom:3}}>
                  <input className="cat-in" type="number" value={r.q ?? ""}     step={1}    onChange={e => setCat(i, "q", parseFloat(e.target.value))}/>
                  <input className="cat-in" type="number" value={r.h ?? ""}     step={0.5}  onChange={e => setCat(i, "h", parseFloat(e.target.value))}/>
                  <input className="cat-in" type="number" value={r.eta ?? ""}   step={0.01} onChange={e => setCat(i, "eta", parseFloat(e.target.value))}/>
                  <input className="cat-in" type="number" value={r.npshr ?? ""} step={0.1}  onChange={e => setCat(i, "npshr", parseFloat(e.target.value))}/>
                  <button className="cat-del" onClick={() => delCat(i)} title="remove row">×</button>
                </div>
              ))}
              <button className="btn" style={{marginTop:4, width:"100%"}} onClick={addCat}>+ add point</button>
              <div style={{fontSize:10, color:"var(--mute)", marginTop:6, lineHeight:1.4}}>
                Head uses monotone interpolation through entered points. η/NPSHr are optional and linearly interpolated. Points are at N₀, D₀.
              </div>
            </div>
          )}
        </div>

        <div className="section">
          <div className="section-title"><span>Acceptance limits</span><span className="hint">HI 9.6</span></div>
          <Field label="NPSH margin ratio" sub="req." value={pump.npshRatio ?? 1.3} unit="×" step={0.05} min={1} max={2} onChange={v => set("pump")({ npshRatio: v })}/>
          <Field label="NPSH abs. margin" sub="min" value={pump.npshMarginAbs ?? 0.6} qty="head" step={0.1} min={0} onChange={v => set("pump")({ npshMarginAbs: v })}/>
          <Field label="Min flow" sub="% BEP" value={pump.minFlowPct ?? 45} unit="%" step={1} min={0} max={100} onChange={v => set("pump")({ minFlowPct: v })}/>
          <div className="field" style={{gridTemplateColumns:"1fr 130px"}}>
            <div className="name">Test grade</div>
            <select className="fit-sel" value={pump.tolGrade || "ISO 2B"}
                    onChange={e => set("pump")({ tolGrade: e.target.value })}>
              {Object.entries(pm.TOLERANCES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <div className="section">
          <div className="section-title"><span>Design margins</span><span className="hint">rated point</span></div>
          <Field label="Flow margin" sub="+%" value={design.flowMargin} unit="%" step={1} min={0} max={30} onChange={v => setState(s => ({ ...s, design: { ...design, flowMargin: v } }))}/>
          <Field label="Head margin" sub="+%" value={design.headMargin} unit="%" step={1} min={0} max={20} onChange={v => setState(s => ({ ...s, design: { ...design, headMargin: v } }))}/>
        </div>

        <div className="section">
          <div className="section-title">
            <span>VFD / variable speed</span>
            <span className="hint">
              <label style={{cursor:"pointer", display:"inline-flex", alignItems:"center", gap:5}}>
                <input type="checkbox" checked={!!pump.showSpeedFamily}
                       onChange={e => set("pump")({ showSpeedFamily: e.target.checked })}
                       style={{margin:0, accentColor:"var(--accent)"}}/>
                show family
              </label>
            </span>
          </div>
          <div className="kv"><span className="k">Speed for selected Q</span><span className="v">{speedLabel}</span><span className="u">rpm</span></div>
          <div className="kv"><span className="k">Min speed (static)</span><span className="v">{minVfd.toFixed(0)}</span><span className="u">rpm</span></div>
          <div style={{padding:"6px var(--pad) 10px"}}>
            <button className="btn" style={{width:"100%"}} disabled={!canSetSpeed}
                    onClick={() => canSetSpeed && set("pump")({ N: Math.round(speedForDuty) })}>↳ Set speed to hold selection</button>
          </div>
        </div>

        <div className="section">
          <div className="section-title"><span>Energy &amp; lifecycle</span><span className="hint">at duty</span></div>
          <Field label="Running hours" sub="/yr" value={econ.hours} unit="h" step={100} min={0} max={8760} onChange={v => setState(s => ({ ...s, econ: { ...econ, hours: v } }))}/>
          <Field label="Energy price" sub="$" value={econ.price} unit="/kWh" step={0.01} min={0} onChange={v => setState(s => ({ ...s, econ: { ...econ, price: v } }))}/>
          <div className="kv"><span className="k">Input power</span><span className="v">{U.fmt("power", en.input_kW, 2)}</span><span className="u">{U.unit("power")}</span></div>
          <div className="kv"><span className="k">Annual energy</span><span className="v">{(en.kWhPerYear/1000).toFixed(1)}</span><span className="u">MWh</span></div>
          <div className="kv"><span className="k">Annual cost</span><span className="v">{en.costPerYear.toLocaleString(undefined,{maximumFractionDigits:0})}</span><span className="u">$</span></div>
          <div className="kv"><span className="k">Specific energy</span><span className="v">{U.fmt("specE", en.specific_kWh_m3, 3)}</span><span className="u">{U.unit("specE")}</span></div>
        </div>
      </div>

      {/* ---- CENTER : chart ---- */}
      <div className="panel center" style={{overflow:"hidden"}}>
        <div className="center-header">
          <div className="title-group">
            <h2>Performance · Pump &amp; System</h2>
            <span className="meta">TAG  P-101A  ·  {fluidName}  ·  {arrange === "single" ? "1 pump" : `${nSet}× ${arrange}`}  ·  N={pump.N} rpm  ·  D={pump.D} mm</span>
          </div>
          <div className="legend">
            <span><span className="sw" style={{borderColor:"var(--ink)"}}></span>H(Q)</span>
            <span><span className="sw" style={{borderColor:"var(--ink-2)", borderTopStyle:"dashed"}}></span>H_sys</span>
            <span><span className="sw" style={{borderColor:"var(--accent)"}}></span>η</span>
            <span><span className="sw" style={{borderColor:"var(--cool)", borderTopStyle:"dashed"}}></span>NPSHr</span>
            <span><span className="sw" style={{borderColor:"var(--cool)"}}></span>NPSHa</span>
          </div>
        </div>

        <div className="chart-wrap">
          <window.PumpChart
            pump={effPump} sys={sysEff}
            op={op} rated={{ Q: ratedQ, H: ratedHsys }}
            showSpeedFamily={!!pump.showSpeedFamily}
            tol={pm.TOLERANCES[pump.tolGrade || "ISO 2B"]}
            U={U}
            Qmax={Qmax}
            dutyPoint={dutyPoint}
            setOp={(patch) => setState(s => ({ ...s, op: { ...s.op, ...patch } }))}
          />
        </div>

        <div style={{padding:"6px var(--pad)", borderTop:"var(--hair)", display:"flex", gap:24, alignItems:"center", justifyContent:"space-between"}}>
          <div style={{display:"flex", gap:24, flex:1}}>
            <div style={{flex:1, maxWidth: 340}}>
              <Slider label="Speed  N" value={pump.N} min={speedSliderMin} max={speedSliderMax} step={10}
                      unit="rpm" fmt={v => v} onChange={v => set("pump")({ N: v })}/>
            </div>
            <div style={{flex:1, maxWidth: 340}}>
              <Slider label="Impeller  D" value={pump.D} min={diaSliderMin} max={diaSliderMax} step={1}
                      unit={U.unit("dia")} fmt={v => U.conv("dia", v).toFixed(U.US ? 2 : 0)} onChange={v => set("pump")({ D: v })}/>
            </div>
          </div>
          <div style={{display:"flex", gap:8}}>
            <button className="btn" onClick={() => {
              // Snap op point to system intersection (duty point) — on the effective curve
              setState(s => ({ ...s, op: { ...s.op, Q: dutyPoint.Q || s.op.Q } }));
            }}>↳ Snap to duty</button>
            <button className="btn" onClick={() => {
              setState(s => ({ ...s, op: { ...s.op, Q: bepQ } }));
            }}>↳ Snap to BEP</button>
          </div>
        </div>

        <div className="results-bar">
          <div className="res-cell"><span className="k">Q</span><span className="v">{U.fmt("flow", dutyQ, 1)}</span><span className="u">{U.unit("flow")}</span></div>
          <div className="res-cell"><span className="k">H</span><span className="v">{U.fmt("head", opH, 2)}</span><span className="u">{U.unit("head")}</span></div>
          <div className="res-cell"><span className="k">η</span><span className="v">{(opEta*100).toFixed(1)}</span><span className="u">%</span></div>
          <div className="res-cell"><span className="k">P_hyd</span><span className="v">{U.fmt("power", Phyd, 2)}</span><span className="u">{U.unit("power")}</span></div>
          <div className="res-cell"><span className="k">P_shaft</span><span className="v">{U.fmt("power", Pbrake, 2)}</span><span className="u">{U.unit("power")}</span></div>
          <div className="res-cell"><span className="k">NPSH mgn</span><span className="v" style={{color: cavOk ? "var(--ok)" : "var(--bad)"}}>{U.fmt("head", margin, 2)}</span><span className="u">{U.unit("head")}</span></div>
        </div>

        {(noDutyPoint || affinityOutOfBounds || speedForDutyClamped || vfdAffinityWarn || belowMinFlow || !cavOk || highSuctionEnergy || !inPOR ||
          !ratedLeftOfBEP || viscActive || viscHighRisk || curveEstimated || fluidPropsEstimated ||
          transitionalFlow || minorLossesApprox) && (
          <div style={{display:"flex", flexWrap:"wrap", gap:8, padding:"8px var(--pad)", borderTop:"var(--hair)"}}>
            {noDutyPoint && <span className="pill bad">◆ No achievable duty point — pump/system mismatch</span>}
            {affinityOutOfBounds && <span className="pill bad">◆ Affinity limits exceeded · {affinity.messages.join(", ")}</span>}
            {speedForDutyClamped && <span className="pill warn">▲ VFD target outside 150-6000 rpm</span>}
            {vfdAffinityWarn && <span className="pill warn">▲ VFD target outside affinity range</span>}
            {belowMinFlow && <span className="pill bad">◆ Below min flow — recirculation / overheating</span>}
            {!noDutyPoint && !cavOk && <span className="pill bad">◆ NPSH ratio {ratioActual.toFixed(2)} &lt; {npshRatio.toFixed(2)} req.</span>}
            {highSuctionEnergy && <span className="pill warn">▲ High suction energy · Nss {Nss.toFixed(0)}</span>}
            {!noDutyPoint && !inPOR && !belowMinFlow && <span className="pill warn">▲ Outside preferred region ({bepPct.toFixed(0)}% BEP)</span>}
            {curveEstimated && <span className="pill warn">▲ Estimated pump curve — add vendor catalog points</span>}
            {fluidPropsEstimated && <span className="pill warn">▲ Preset fluid properties are estimated</span>}
            {transitionalFlow && <span className="pill warn">▲ Transitional suction Reynolds number</span>}
            {minorLossesApprox && <span className="pill warn">▲ {hasGenericReducer ? "Reducer K-value is generic" : "Fitting K-values are generic"}</span>}
            {viscActive && <span className="pill">● Approx viscous correction active · μ {sys.mu.toFixed(1)} cP · NPSHr ×{visc.CNPSH.toFixed(2)}</span>}
            {viscHighRisk && <span className="pill warn">▲ Vendor viscous curve required</span>}
            {!ratedLeftOfBEP && <span className="pill warn">▲ Rated flow right of BEP — select larger pump</span>}
          </div>
        )}
      </div>

      {/* ---- RIGHT : derived ---- */}
      <div className="panel">
        <div className="panel-header">
          <h3>Derived · At duty point</h3>
          <span className="badge">live</span>
        </div>

        {noDutyPoint && (
          <div className="callout bad">
            <div className="title"><span>No achievable duty point</span><span className="mono">H_pump &lt; H_sys</span></div>
            <div className="sub">
              Pump and system curves do not intersect at positive flow. Increase speed/impeller, use a larger pump, or reduce system head.
            </div>
          </div>
        )}

        <div className={"callout " + (!noDutyPoint && cavOk ? "ok" : "bad")}>
          <div className="title"><span>Cavitation check</span><span className="mono">NPSHa / NPSHr</span></div>
          <div className="big">{ratioActual > 90 ? "—" : ratioActual.toFixed(2)}<span style={{fontSize:12, color:"var(--mute)"}}> ×  (req ≥ {npshRatio.toFixed(2)})</span></div>
          <div className="sub">
            NPSHa {U.fmt("head", opNPSHa, 2)} − NPSHr {U.fmt("head", opNPSHr, 2)} = margin {U.fmt("head", margin, 2)} {U.unit("head")} ·{" "}
            min {U.fmt("head", npshMarginAbs, 2)} {U.unit("head")} · {noDutyPoint ? "not evaluated — no positive-flow duty point" : cavOk ? "OK" : "cavitation risk — increase NPSHa or derate"}
          </div>
        </div>

        <div className="section">
          <div className="section-title"><span>Head breakdown</span><span className="hint">{U.unit("head")} of fluid</span></div>
          <KV k="Static lift ΔZ"      v={U.fmt("head", staticLift, 2)}  u={U.unit("head")} />
          <KV k="Vessel ΔP head"      v={U.fmt("head", presHead, 2)}    u={U.unit("head")} />
          <KV k="Friction · suction"  v={U.fmt("head", hfSuction, 3)}   u={U.unit("head")} />
          <KV k="Friction · discharge"v={U.fmt("head", hfDischarge, 3)} u={U.unit("head")} />
          <KV k="TDH (system)"        v={U.fmt("head", TDH, 2)}         u={U.unit("head")} />
          <KV k="H delivered"         v={U.fmt("head", opH, 2)}         u={U.unit("head")} />
        </div>

        <div className="section">
          <div className="section-title"><span>Duty vs rated</span><span className="hint">+{design.flowMargin}% Q / +{design.headMargin}% H</span></div>
          <KV k="Duty flow"    v={U.fmt("flow", dutyQ, 1)}    u={U.unit("flow")} />
          <KV k="Rated flow"   v={U.fmt("flow", ratedQ, 1)}   u={U.unit("flow")} />
          <KV k="Rated head"   v={U.fmt("head", ratedHsys, 2)} u={U.unit("head")} />
          <div className="kv"><span className="k">Rated vs BEP</span><span className="v" style={{color: ratedLeftOfBEP ? "var(--ok)" : "var(--warn)"}}>{ratedLeftOfBEP ? "left of BEP ✓" : "right of BEP"}</span><span className="u"></span></div>
        </div>

        <div className="section">
          <div className="section-title"><span>Power</span><span className="hint">{arrange === "single" ? U.unit("power") : `${nSet}× ${arrange}`}</span></div>
          <KV k="Hydraulic (total)"  v={U.fmt("power", Phyd, 2)}    u={U.unit("power")} />
          {arrange !== "single" && <KV k="Shaft · per pump" v={U.fmt("power", PbrakePer, 2)} u={U.unit("power")} />}
          <KV k={arrange === "single" ? "Shaft (BHP)" : "Shaft · total"} v={U.fmt("power", Pbrake, 2)}  u={U.unit("power")} />
          <KV k={`Motor input (η=${(motorEff * 100).toFixed(1)}%)`} v={U.fmt("power", Pmotor, 2)} u={U.unit("power")} />
          <KV k="Motor select · ea."   v={`≥ ${motorSelectText}`} u={U.US ? "hp" : "kW"} />
        </div>

        <div className="section">
          <div className="section-title"><span>Flow regime</span><span className="hint">suction line</span></div>
          <KV k="v · suction"      v={U.fmt("vel", vSuction, 2)}   u={U.unit("vel")} />
          <KV k="v · discharge"    v={U.fmt("vel", vDischarge, 2)} u={U.unit("vel")} />
          <KV k="Reynolds · suc."  v={Re_s.toExponential(1)} u="—" />
          <KV k="Regime · suction" v={flowRegimeS} u="" />
        </div>

        <div className="section">
          <div className="section-title"><span>Operating limits</span><span className="hint">stability</span></div>
          <KV k="Duty / BEP"        v={bepPct.toFixed(0)}   u="%" />
          <div className="kv"><span className="k">Min continuous flow</span><span className="v" style={{color: belowMinFlow ? "var(--bad)" : "var(--ink)"}}>{U.fmt("flow", qMin, 1)}</span><span className="u">{U.unit("flow")}</span></div>
          <div className="kv"><span className="k">Preferred region</span><span className="v" style={{color: inPOR ? "var(--ok)" : "var(--warn)"}}>{inPOR ? "in POR" : "outside"}</span><span className="u"></span></div>
          <div className="kv"><span className="k">Suction sp. speed Nss</span><span className="v" style={{color: highSuctionEnergy ? "var(--warn)" : "var(--ink)"}}>{Nss.toFixed(0)}</span><span className="u">—</span></div>
        </div>

        <div className="section">
          <div className="section-title"><span>Similitude</span><span className="hint">metric</span></div>
          <KV k="Specific speed Ns" v={Ns.toFixed(0)}                     u="—" />
          <KV k="Affinity · Q ratio"v={(sN * sD).toFixed(3)}              u="×" />
          <KV k="Affinity · H ratio"v={(sN * sD * sN * sD).toFixed(3)}    u="×" />
          <div className="kv"><span className="k">Affinity validity</span><span className="v" style={{color: affinityOutOfBounds ? "var(--bad)" : "var(--ok)"}}>{affinityOutOfBounds ? "outside" : "inside"}</span><span className="u"></span></div>
        </div>

        <div className="section">
          <div className="section-title"><span>Viscosity correction</span><span className="hint">{viscActive ? "active" : "negligible"}</span></div>
          <KV k="CQ · flow"        v={visc.CQ.toFixed(3)} u="×" />
          <KV k="CH · head"        v={visc.CH.toFixed(3)} u="×" />
          <KV k="Cη · efficiency"  v={visc.Ceta.toFixed(3)} u="×" />
          <KV k="CNPSH · NPSHr"    v={visc.CNPSH.toFixed(3)} u="×" />
          <KV k="η (water → visc)" v={`${(pm.pumpEta(perQ,pump)*100).toFixed(1)} → ${(opEta*100).toFixed(1)}`} u="%" />
        </div>

        <div style={{padding:"10px var(--pad) 16px", color:"var(--mute)", fontSize:11, lineHeight:1.5}}>
          Model: Darcy–Weisbach + Churchill friction · {curveEstimated ? "estimated parametric pump curve" : "monotone interpolation through catalog points"} · bounded affinity Q∝ND, H∝(ND)² · flow/Ns-aware screening viscous correction with conservative NPSHr factor · generic fitting K library · configurable NPSH ratio and absolute margin · min flow &amp; Nss stability limits · Ns = N·√Q/H<sup>0.75</sup>.
        </div>
      </div>
    </div>
  );
};

window.Calculator = Calculator;
