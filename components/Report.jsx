// Report.jsx — Engineering report preview / PDF export

const Report = ({ state }) => {
  const { fluid, sys, pump, op } = state;
  const pm = window.PumpMath;
  const U = window.makeUnits(state.unitSystem || "SI");
  const uh = U.unit("head"), uf = U.unit("flow"), up = U.unit("power"), upr = U.unit("press"), ud = U.unit("dia");
  const duty = window.computeDuty(state);
  const {
    sumKs, sumKd, sysEff, effPump, nSet, arrange,
    dutyQ, dutyPoint, Qmax,
    opH, opEta, opNPSHr, opNPSHa,
    Phyd, PbrakePer, Pbrake, Pmotor,
    Ns, Nss, hfSuction: hfS, hfDischarge: hfD,
    staticLift, presHead, TDH,
    design, ratedQ, ratedHsys: ratedH,
    en,
    visc, viscActive,
    npshRatio, margin, ratioActual, cavOk,
    bepPct, qMin,
  } = duty;
  const pipeS = pm.nearestPipe(sys.Ds);
  const pipeD = pm.nearestPipe(sys.Dd);
  const fmtPipe = (p, id) => p ? `DN${p.dn} Sch${p.sch} (${U.fmt("dia", id, 1)} ${ud})` : `${U.fmt("dia", id, 1)} ${ud}`;
  const tol = pm.TOLERANCES[pump.tolGrade || "ISO 2B"];
  const meta = {
    project: "Raw-Water Transfer Skid - Unit 200",
    tag: "P-101A",
    docNo: "CAL-HYD-0142",
    rev: "D",
    preparedBy: "J. Rivera",
    discipline: "Mech.",
    ...(state.meta || {}),
  };

  const today = new Date();
  const d = today.toISOString().slice(0, 10);

  return (
    <div className="report-stage">
      <div className="sheet">
        <div className="titleblock">
          <div className="tb-cell">
            <div className="k">Project</div>
            <div className="v">{meta.project}</div>
          </div>
          <div className="tb-cell">
            <div className="k">Tag</div><div className="v">{meta.tag}</div>
          </div>
          <div className="tb-cell">
            <div className="k">Doc No.</div><div className="v">{meta.docNo}</div>
          </div>
          <div className="tb-cell">
            <div className="k">Rev / Date</div><div className="v">{meta.rev} · {d}</div>
          </div>
        </div>

        <h1>Centrifugal Pump Sizing Calculation</h1>
        <div className="doc-id">Prepared by  {meta.preparedBy} · {meta.discipline}  ·  Checked —  ·  Approved —</div>

        <div className="two-col">
          <div>
            <div className="section-head">Process data</div>
            <table>
              <tbody>
                <tr><td>Fluid</td><td className="v">{fluid.key === "Custom" ? (fluid.customName || "Custom fluid") : fluid.key}</td></tr>
                <tr><td>Density ρ</td><td className="v">{U.fmt("dens", sys.rho, U.US ? 2 : 0)} {U.unit("dens")}</td></tr>
                <tr><td>Viscosity μ</td><td className="v">{sys.mu.toFixed(2)} cP</td></tr>
                <tr><td>Vapor pressure Pv</td><td className="v">{U.fmt("press", sys.Pvap_kPa, 2)} {upr}</td></tr>
                <tr><td>Atmospheric Patm</td><td className="v">{U.fmt("press", sys.Patm_kPa, 1)} {upr}</td></tr>
                <tr><td>Temperature</td><td className="v">{U.fmt("temp", (fluid.tempC != null ? fluid.tempC : 20), 0)} {U.unit("temp")}</td></tr>
                <tr><td>Design flow Q</td><td className="v">{U.fmt("flow", dutyQ, 1)} {uf}</td></tr>
              </tbody>
            </table>

            <div className="section-head">System</div>
            <table>
              <tbody>
                <tr><td>Static lift ΔZ</td><td className="v">{U.fmt("head", staticLift, 2)} {uh}</td></tr>
                <tr><td>Vessel ΔP head</td><td className="v">{U.fmt("head", presHead, 2)} {uh}</td></tr>
                <tr><td>Suction D / L / ΣK</td><td className="v">{fmtPipe(pipeS, sys.Ds)} / {U.fmt("len", sys.Ls, 1)} / {sumKs.toFixed(2)}</td></tr>
                <tr><td>Discharge D / L / ΣK</td><td className="v">{fmtPipe(pipeD, sys.Dd)} / {U.fmt("len", sys.Ld, 1)} / {sumKd.toFixed(2)}</td></tr>
                <tr><td>Roughness ε</td><td className="v">{U.fmt("dia", sys.eps, U.US ? 4 : 3)} {ud}</td></tr>
                <tr><td>h_f suction</td><td className="v">{U.fmt("head", hfS, 3)} {uh}</td></tr>
                <tr><td>h_f discharge</td><td className="v">{U.fmt("head", hfD, 3)} {uh}</td></tr>
                <tr><td><b>TDH (system)</b></td><td className="v"><b>{U.fmt("head", TDH, 2)} {uh}</b></td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <div className="section-head">Selected pump</div>
            <table>
              <tbody>
                <tr><td>Model / tag</td><td className="v">{meta.tag}</td></tr>
                <tr><td>Arrangement</td><td className="v">{arrange === "single" ? "Single" : `${nSet} × ${arrange}`}</td></tr>
                <tr><td>Reference speed N₀</td><td className="v">{pump.N0} rpm</td></tr>
                <tr><td>Reference impeller D₀</td><td className="v">{U.fmt("dia", pump.D0, U.US ? 2 : 0)} {ud}</td></tr>
                <tr><td>Operating speed N</td><td className="v">{pump.N} rpm</td></tr>
                <tr><td>Impeller trim D</td><td className="v">{U.fmt("dia", pump.D, U.US ? 2 : 0)} {ud}</td></tr>
                <tr><td>BEP (ref)</td><td className="v">{U.fmt("flow", pump.Qb, 0)} {uf} @ {U.fmt("head", pump.Hb, 1)} {uh}</td></tr>
                <tr><td>η_max (ref)</td><td className="v">{(pump.etaMax*100).toFixed(0)} %</td></tr>
                <tr><td>NPSHr @ BEP (ref)</td><td className="v">{U.fmt("head", pump.NPSHr_bep, 1)} {uh}</td></tr>
              </tbody>
            </table>

            <div className="section-head">Results · at duty</div>
            <table>
              <tbody>
                <tr><td>Delivered head H</td><td className="v">{U.fmt("head", opH, 2)} {uh}</td></tr>
                <tr><td>Efficiency η</td><td className="v">{(opEta*100).toFixed(1)} %</td></tr>
                <tr><td>Hydraulic power (total)</td><td className="v">{U.fmt("power", Phyd, 2)} {up}</td></tr>
                <tr><td>Shaft power {arrange === "single" ? "(BHP)" : "· total"}</td><td className="v">{U.fmt("power", Pbrake, 2)} {up}</td></tr>
                {arrange !== "single" && <tr><td>Shaft · per pump</td><td className="v">{U.fmt("power", PbrakePer, 2)} {up}</td></tr>}
                <tr><td>Motor (η=0.93)</td><td className="v">{U.fmt("power", Pmotor, 2)} {up}</td></tr>
                <tr><td>Motor selection · ea.</td><td className="v">≥ {U.fmt("power", Math.ceil(PbrakePer*1.15*10)/10, 1)} {up}</td></tr>
                <tr><td>Specific speed Ns</td><td className="v">{Ns.toFixed(0)}</td></tr>
                <tr><td>NPSHa / NPSHr</td><td className="v">{U.fmt("head", opNPSHa, 2)} / {U.fmt("head", opNPSHr, 2)} {uh}</td></tr>
                <tr><td><b>Cavitation margin</b></td>
                    <td className="v" style={{color: cavOk ? "var(--ok)" : "var(--bad)"}}>
                      <b>{U.fmt("head", margin, 2)} {uh}  {cavOk ? "·  OK" : "·  REVIEW"}</b>
                    </td></tr>
                <tr><td>NPSHa / NPSHr ratio</td><td className="v">{ratioActual > 90 ? "—" : ratioActual.toFixed(2)} (req ≥ {npshRatio.toFixed(2)})</td></tr>
                <tr><td>Suction sp. speed Nss</td><td className="v">{Nss.toFixed(0)}{Nss > 213 ? "  · high" : ""}</td></tr>
                <tr><td>Min continuous flow</td><td className="v">{U.fmt("flow", qMin, 1)} {uf}</td></tr>
                <tr><td>Duty / BEP</td><td className="v">{bepPct.toFixed(0)} %</td></tr>
                <tr><td>Rated point (+{design.flowMargin}%Q)</td><td className="v">{U.fmt("flow", ratedQ, 1)} {uf} @ {U.fmt("head", ratedH, 1)} {uh}</td></tr>
                <tr><td>Viscosity correction</td><td className="v">{viscActive ? `C_H ${visc.CH.toFixed(2)} · Cη ${visc.Ceta.toFixed(2)}` : "n/a (water)"}</td></tr>
                <tr><td>Annual energy</td><td className="v">{(en.kWhPerYear/1000).toFixed(1)} MWh/yr</td></tr>
                <tr><td>Annual energy cost</td><td className="v">$ {en.costPerYear.toLocaleString(undefined,{maximumFractionDigits:0})}/yr</td></tr>
                <tr><td>Specific energy</td><td className="v">{U.fmt("specE", en.specific_kWh_m3, 3)} {U.unit("specE")}</td></tr>
                <tr><td>Acceptance grade</td><td className="v">{tol.label} (±{tol.dQ}%Q, ±{tol.dH}%H)</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="section-head">Performance curve</div>
        <div className="mini-chart">
          <window.PumpChart pump={effPump} sys={sysEff} op={{ ...op, Q: dutyQ }} rated={{ Q: ratedQ, H: ratedH }}
            U={U} tol={tol}
            dutyPoint={dutyPoint}
            setOp={() => {}} width={730} height={238} Qmax={Qmax}/>
        </div>

        <div className="section-head">Notes &amp; assumptions</div>
        <ol style={{fontSize:11, color:"var(--ink-2)", lineHeight:1.6, paddingLeft:18, margin:0}}>
          <li>Friction losses per Darcy–Weisbach with Swamee–Jain explicit friction factor; minor losses from fitting count × Crane TP-410 K-values.</li>
          <li>Pump H(Q) from {pump.useCatalog ? "least-squares fit through entered catalog points" : "parametric parabola (shutoff = 1.25 × H_BEP)"}; affinity laws applied for speed &amp; impeller trim.</li>
          <li>NPSHa = (Patm + suction vessel P)/ρg + Zs − Pv/ρg − h_f,suction. Acceptance: NPSHa/NPSHr ≥ {npshRatio.toFixed(2)} (HI 9.6.1).</li>
          <li>Fluid properties {fluid.key === "Custom" ? "entered manually" : `derived at ${(fluid.tempC != null ? fluid.tempC : 20).toFixed(0)} °C`}. Viscosity correction approximates HI 9.6.7; μ &gt; ~300 cP requires vendor curves.</li>
          <li>Rated point = duty +{design.flowMargin}% flow / +{design.headMargin}% head; pump selected with rated flow left of BEP. Motor margin 15 % above BHP, next catalog size up.</li>
        </ol>

        <div className="sign">
          <div className="line">Prepared — {meta.preparedBy}, {meta.discipline}</div>
          <div className="line">Checked —</div>
          <div className="line">Approved —</div>
        </div>
      </div>
    </div>
  );
};

window.Report = Report;
