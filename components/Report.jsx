// Report.jsx — Engineering report preview / PDF export

const Report = ({ state }) => {
  const { fluid, sys, pump, op } = state;
  const pm = window.PumpMath;
  const U = window.makeUnits(state.unitSystem || "SI");
  const uh = U.unit("head"), uf = U.unit("flow"), up = U.unit("power"), upr = U.unit("press"), ud = U.unit("dia");
  const duty = window.computeDuty(state);
  const {
    sumKs, sumKd, sysEff, effPump, affinity, affinityOutOfBounds, nSet, arrange, installedPumps,
    parallelImbalancePct, worstBranchQ,
    validationErrors, validationWarnings, inputValid, boilingRisk,
    dutyQ, dutyPoint, noDutyPoint, Qmax,
    opH, opEta, opNPSHr, opNPSHa,
    Phyd, PbrakePer, Pbrake, motorEff, Pmotor, motor, motorMargin, motorBasisPer, maxBhpPer, maxBhpQ,
    Ns, Nss, hfSuction: hfS, hfDischarge: hfD,
    staticLift, presHead, TDH, Re_s, flowRegimeS, transitionalFlow,
    equipmentLoss, equipmentClean, equipmentDirty,
    design, ratedQ, ratedHsys: ratedH, ratedLeftOfBEP, ratedBepPct, ratedInPOR, ratedInAOR,
    speedForDutyStatus, speedForDutyClamped, speedTargetAffinityOk, minVfdClamped, minVfdInvalid,
    en,
    visc, viscActive, viscHighRisk, viscModelScreening, curveEstimated,
    catalogEtaEstimated, catalogNpshrEstimated,
    catalogHeadFlattened, catalogExtrap, catalogExtrapolated,
    catalogRatedExtrap, catalogRatedExtrapolated,
    catalogSelectedExtrap, catalogSelectedExtrapolated,
    fluidPropsEstimated,
    npshRatio, npshMarginAbs, margin, ratioActual, npshRatioOk, npshAbsOk, cavOk,
    worstNPSHa, worstNPSHr, worstNpshMargin, worstNpshRatio, worstCavOk, scenarioResults, stagingResults,
    bepPct, qMcsf, qThermal, qMin, belowMinFlow, nssLimit, highSuctionEnergy,
    porMinPct, porMaxPct, aorMinPct, aorMaxPct, inPOR, inAOR,
    hasGenericReducer, minorLossesApprox,
  } = duty;
  const pipeS = pm.nearestPipe(sys.Ds);
  const pipeD = pm.nearestPipe(sys.Dd);
  const fmtPipe = (p, id) => p ? `DN${p.dn} Sch${p.sch} (${U.fmt("dia", id, 1)} ${ud})` : `${U.fmt("dia", id, 1)} ${ud}`;
  const tol = pm.TOLERANCES[pump.tolGrade || "ISO 2B"];
  const meta = {
    project: "",
    tag: "",
    docNo: "",
    rev: "",
    preparedBy: "",
    discipline: "",
    ...(state.meta || {}),
  };
  const preparedLine = meta.preparedBy
    ? `Prepared by  ${meta.preparedBy}${meta.discipline ? ` · ${meta.discipline}` : ""}`
    : "Prepared by  —";
  const motorReportText = U.US
    ? (motor.selected_hp > 0 ? `${motor.selected_hp.toFixed(motor.selected_hp < 10 ? 1 : 0)} hp` : "n/a")
    : (motor.selected_kW > 0 ? `${motor.selected_kW.toFixed(motor.selected_kW < 10 ? 2 : 1)} kW` : "n/a");
  const statusNotes = [
    ...validationErrors,
    ...validationWarnings,
    speedForDutyClamped && "VFD target speed is outside 150-6000 rpm",
    !speedTargetAffinityOk && speedForDutyStatus === "solved" && "VFD target speed is outside affinity range",
    minVfdClamped && "Minimum static VFD speed is outside 150-6000 rpm",
    minVfdInvalid && "Minimum static VFD speed could not be solved",
    affinityOutOfBounds && `Affinity limits exceeded: ${affinity.messages.join(", ")}`,
    curveEstimated && "Pump curve is estimated from BEP data",
    catalogExtrapolated && `Duty point is ${catalogExtrap.above ? "above" : "below"} the entered catalog flow range`,
    catalogRatedExtrapolated && `Rated point is ${catalogRatedExtrap.above ? "above" : "below"} the entered catalog flow range`,
    catalogSelectedExtrapolated && `Selected/VFD target is ${catalogSelectedExtrap.above ? "above" : "below"} the entered catalog flow range`,
    catalogEtaEstimated && "Catalog efficiency curve is estimated; enter at least two eta points",
    catalogNpshrEstimated && "Catalog NPSHr curve is estimated; enter at least two NPSHr points",
    catalogHeadFlattened && "Entered catalog head data was flattened to enforce a non-increasing curve",
    fluidPropsEstimated && "Non-water preset properties are estimated",
    transitionalFlow && "Suction Reynolds number is transitional",
    minorLossesApprox && (hasGenericReducer ? "Reducer/expander K-value is generic" : "Fitting K-values are generic"),
    viscModelScreening && "Viscosity correction coefficients are screening-grade and should be validated with HI/vendor data",
    viscHighRisk && "High-viscosity service requires vendor viscous curves",
    belowMinFlow && "Duty is below minimum continuous flow",
    highSuctionEnergy && `High suction energy screening limit ${nssLimit} is exceeded`,
    !inAOR && !noDutyPoint && "Predicted duty is outside the allowable operating region",
    inAOR && !inPOR && !noDutyPoint && "Predicted duty is outside the preferred operating region",
    !ratedInAOR && "Required rated point is outside the allowable operating region",
    ratedInAOR && !ratedInPOR && "Required rated point is outside the preferred operating region",
    !worstCavOk && "Worst-case rated NPSH acceptance fails",
    boilingRisk && "Suction absolute pressure is at or below vapor pressure",
    installedPumps > nSet && `${installedPumps - nSet} standby pump(s) excluded from operating energy`,
    parallelImbalancePct > 0 && `Parallel branch flow imbalance +${parallelImbalancePct}% applied to per-pump NPSHr and driver loading`,
  ].filter(Boolean);

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
        <div className="doc-id">{preparedLine}  ·  Checked —  ·  Approved —</div>
        {!inputValid && (
          <div className="callout bad" style={{marginTop:12}}>
            <div className="title"><span>Invalid engineering inputs</span><span className="mono">calculation blocked</span></div>
            <div className="sub">{validationErrors.join(" · ")}</div>
          </div>
        )}
        {noDutyPoint && inputValid && (
          <div className="callout bad" style={{marginTop:12}}>
            <div className="title"><span>No achievable duty point</span><span className="mono">pump/system mismatch</span></div>
            <div className="sub">Pump and system curves do not intersect at positive flow. Results below show zero-flow/shutoff condition, not a valid operating duty.</div>
          </div>
        )}
        {statusNotes.length > 0 && (
          <div className="callout warn" style={{marginTop:12}}>
            <div className="title"><span>Calculation flags</span><span className="mono">{statusNotes.length}</span></div>
            <div className="sub">{statusNotes.join(" · ")}</div>
          </div>
        )}

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
                <tr><td>Required duty flow Qreq</td><td className="v">{U.fmt("flow", design.requiredQ ?? op.Q, 1)} {uf}</td></tr>
                <tr><td>Predicted operating flow</td><td className="v">{U.fmt("flow", dutyQ, 1)} {uf}</td></tr>
              </tbody>
            </table>

            <div className="section-head">System</div>
            <table>
              <tbody>
                <tr><td>Static lift ΔZ</td><td className="v">{U.fmt("head", staticLift, 2)} {uh}</td></tr>
                <tr><td>Vessel ΔP head</td><td className="v">{U.fmt("head", presHead, 2)} {uh}</td></tr>
                <tr><td>Suction D / L / ΣK</td><td className="v">{fmtPipe(pipeS, sys.Ds)} / {U.fmt("len", sys.Ls, 1)} / {sumKs.toFixed(2)}</td></tr>
                <tr><td>Discharge D / L / ΣK</td><td className="v">{fmtPipe(pipeD, sys.Dd)} / {U.fmt("len", sys.Ld, 1)} / {sumKd.toFixed(2)}</td></tr>
                <tr><td>Roughness εs / εd</td><td className="v">{U.fmt("dia", sys.epsS ?? sys.eps, U.US ? 4 : 3)} / {U.fmt("dia", sys.epsD ?? sys.eps, U.US ? 4 : 3)} {ud}</td></tr>
                <tr><td>h_f suction</td><td className="v">{U.fmt("head", hfS, 3)} {uh}</td></tr>
                <tr><td>h_f discharge</td><td className="v">{U.fmt("head", hfD, 3)} {uh}</td></tr>
                <tr><td>Equipment loss suction / discharge</td><td className="v">{U.fmt("head", equipmentLoss.suction, 3)} / {U.fmt("head", equipmentLoss.discharge, 3)} {uh}</td></tr>
                <tr><td>Equipment clean / dirty</td><td className="v">{U.fmt("head", equipmentClean.total, 2)} / {U.fmt("head", equipmentDirty.total, 2)} {uh}</td></tr>
                <tr><td><b>TDH (system)</b></td><td className="v"><b>{U.fmt("head", TDH, 2)} {uh}</b></td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <div className="section-head">Selected pump</div>
            <table>
              <tbody>
                <tr><td>Model / tag</td><td className="v">{meta.tag}</td></tr>
                <tr><td>Arrangement</td><td className="v">{nSet} operating / {installedPumps} installed · {arrange}</td></tr>
                {arrange === "parallel" && <tr><td>Parallel branch imbalance</td><td className="v">+{parallelImbalancePct}% · worst branch {U.fmt("flow", worstBranchQ, 1)} {uf}</td></tr>}
                <tr><td>Reference speed N₀</td><td className="v">{pump.N0} rpm</td></tr>
                <tr><td>Reference impeller D₀</td><td className="v">{U.fmt("dia", pump.D0, U.US ? 2 : 0)} {ud}</td></tr>
                <tr><td>Operating speed N</td><td className="v">{pump.N} rpm</td></tr>
                <tr><td>Impeller trim D</td><td className="v">{U.fmt("dia", pump.D, U.US ? 2 : 0)} {ud}</td></tr>
                <tr><td>Affinity validity</td><td className="v" style={{color: affinityOutOfBounds ? "var(--bad)" : "var(--ok)"}}>{affinityOutOfBounds ? affinity.messages.join(", ") : "Inside recommended range"}</td></tr>
                <tr><td>BEP (ref)</td><td className="v">{U.fmt("flow", pump.Qb, 0)} {uf} @ {U.fmt("head", pump.Hb, 1)} {uh}</td></tr>
                <tr><td>η_max (ref)</td><td className="v">{(pump.etaMax*100).toFixed(0)} %</td></tr>
                <tr><td>NPSHr @ BEP (ref)</td><td className="v">{U.fmt("head", pump.NPSHr_bep, 1)} {uh}</td></tr>
              </tbody>
            </table>

            <div className="section-head">Results · at duty</div>
            <table>
              <tbody>
                <tr><td>Duty status</td><td className="v" style={{color: noDutyPoint ? "var(--bad)" : "var(--ok)"}}>{noDutyPoint ? "NO POSITIVE-FLOW INTERSECTION" : "Solved"}</td></tr>
                <tr><td>Delivered head H</td><td className="v">{U.fmt("head", opH, 2)} {uh}</td></tr>
                <tr><td>Efficiency η</td><td className="v">{(opEta*100).toFixed(1)} %</td></tr>
                <tr><td>Hydraulic power (total)</td><td className="v">{U.fmt("power", Phyd, 2)} {up}</td></tr>
                <tr><td>Shaft power {arrange === "single" ? "(BHP)" : "· total"}</td><td className="v">{U.fmt("power", Pbrake, 2)} {up}</td></tr>
                {arrange !== "single" && <tr><td>Shaft · per pump</td><td className="v">{U.fmt("power", PbrakePer, 2)} {up}</td></tr>}
                <tr><td>Motor input (η={(motorEff*100).toFixed(1)}%)</td><td className="v">{U.fmt("power", Pmotor, 2)} {up}</td></tr>
                <tr><td>Motor selection · ea.</td><td className="v">≥ {motorReportText}</td></tr>
                <tr><td>Maximum absorbed power · ea.</td><td className="v">{U.fmt("power", maxBhpPer, 2)} {up} @ {U.fmt("flow", maxBhpQ, 0)} {uf}</td></tr>
                <tr><td>Motor sizing basis · ea.</td><td className="v">{U.fmt("power", motorBasisPer, 2)} {up} × {motorMargin.toFixed(2)}</td></tr>
                <tr><td>Specific speed Ns</td><td className="v">{Ns.toFixed(0)}</td></tr>
                <tr><td>Suction Reynolds / regime</td><td className="v">{Re_s.toExponential(1)} / {flowRegimeS}</td></tr>
                <tr><td>NPSHa / NPSHr</td><td className="v">{U.fmt("head", opNPSHa, 2)} / {U.fmt("head", opNPSHr, 2)} {uh}</td></tr>
                <tr><td><b>Cavitation margin</b></td>
                    <td className="v" style={{color: !noDutyPoint && cavOk ? "var(--ok)" : "var(--bad)"}}>
                      <b>{U.fmt("head", margin, 2)} {uh}  {noDutyPoint ? "·  NO DUTY" : cavOk ? "·  OK" : "·  REVIEW"}</b>
                    </td></tr>
                <tr><td>NPSHa / NPSHr ratio</td><td className="v">{ratioActual > 90 ? "—" : ratioActual.toFixed(2)} (req ≥ {npshRatio.toFixed(2)}) · {npshRatioOk ? "PASS" : "FAIL"}</td></tr>
                <tr><td>NPSH absolute margin req.</td><td className="v">{U.fmt("head", npshMarginAbs, 2)} {uh}</td></tr>
                <tr><td>Worst-case rated NPSHa / NPSHr</td><td className="v">{U.fmt("head", worstNPSHa, 2)} / {U.fmt("head", worstNPSHr, 2)} {uh} · {worstCavOk ? "PASS" : "FAIL"}</td></tr>
                <tr><td>Worst-case ratio / margin</td><td className="v">{worstNpshRatio.toFixed(2)} / {U.fmt("head", worstNpshMargin, 2)} {uh}</td></tr>
                <tr><td>Suction sp. speed Nss</td><td className="v">{Nss.toFixed(0)}{Nss > nssLimit ? "  · high" : ""} (limit {nssLimit})</td></tr>
                <tr><td>Min continuous flow</td><td className="v">{U.fmt("flow", qMin, 1)} {uf}</td></tr>
                <tr><td>MCSF / thermal minimum</td><td className="v">{U.fmt("flow", qMcsf, 1)} / {U.fmt("flow", qThermal, 1)} {uf}</td></tr>
                <tr><td>Duty / BEP</td><td className="v">{bepPct.toFixed(0)} %</td></tr>
                <tr><td>Rated point (+{design.flowMargin}%Q)</td><td className="v">{U.fmt("flow", ratedQ, 1)} {uf} @ {U.fmt("head", ratedH, 1)} {uh} · {ratedInPOR ? "POR" : ratedInAOR ? "AOR" : "OUTSIDE AOR"}</td></tr>
                <tr><td>Viscosity correction</td><td className="v">{viscActive ? `C_H ${visc.CH.toFixed(2)} · Cη ${visc.Ceta.toFixed(2)} · CNPSH ${visc.CNPSH.toFixed(2)}` : "n/a (water)"}</td></tr>
                <tr><td>Annual energy</td><td className="v">{(en.kWhPerYear/1000).toFixed(1)} MWh/yr</td></tr>
                <tr><td>Annual energy cost</td><td className="v">$ {en.costPerYear.toLocaleString(undefined,{maximumFractionDigits:0})}/yr</td></tr>
                <tr><td>Specific energy</td><td className="v">{U.fmt("specE", en.specific_kWh_m3, 3)} {U.unit("specE")}</td></tr>
                <tr><td>Acceptance grade</td><td className="v">{tol.label} (±{tol.dQ}%Q, ±{tol.dH}%H)</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="section-head">Operating scenario envelope</div>
        <table>
          <thead><tr><th>Scenario</th><th>Predicted flow</th><th>Predicted head</th><th>Equipment condition</th></tr></thead>
          <tbody>
            {scenarioResults.map(row => (
              <tr key={row.key}><td>{row.label}</td><td className="v">{U.fmt("flow", row.Q, 1)} {uf}</td><td className="v">{U.fmt("head", row.H, 2)} {uh}</td><td className="v">{row.system.equipmentCondition}</td></tr>
            ))}
          </tbody>
        </table>

        <div className="section-head">Pump staging</div>
        <table>
          <thead><tr><th>Operating case</th><th>Pumps operating</th><th>Predicted flow</th><th>Predicted head</th></tr></thead>
          <tbody>
            {stagingResults.map(row => (
              <tr key={`stage-${row.count}`}><td>{row.label}</td><td className="v">{row.count}</td><td className="v">{U.fmt("flow", row.Q, 1)} {uf}</td><td className="v">{U.fmt("head", row.H, 2)} {uh}</td></tr>
            ))}
          </tbody>
        </table>

        <div className="section-head">Performance curve</div>
        <div className="mini-chart">
          <window.PumpChart pump={effPump} sys={sysEff} op={{ ...op, Q: design.requiredQ ?? op.Q }} rated={{ Q: ratedQ, H: ratedH }}
            U={U} tol={tol}
            dutyPoint={dutyPoint}
            setOp={() => {}} width={730} height={238} Qmax={Qmax}/>
        </div>

        <div className="section-head">Notes &amp; assumptions</div>
        <ol style={{fontSize:11, color:"var(--ink-2)", lineHeight:1.6, paddingLeft:18, margin:0}}>
          <li>Friction losses per Darcy–Weisbach with Churchill friction factor using separate suction/discharge roughness; minor losses from generic fitting K-values plus Kv/Cv or clean/dirty equipment ΔP inputs.</li>
          <li>Pump H(Q) from {curveEstimated ? "parametric estimate (shutoff = 1.25 × H_BEP)" : "monotone interpolation through entered catalog points"}; catalog extrapolation, estimated auxiliary catalog curves, and flattened rising head entries are flagged; affinity laws are bounded to the recommended speed and impeller ranges shown in the calculator.</li>
          {arrange !== "single" && <li>Pump arrangement is idealized: parallel service assumes identical pumps with equal flow split; series service assumes ideal head addition with no interstage losses.</li>}
          <li>NPSHa = (Patm + suction vessel P)/ρg + Zs − Pv/ρg − suction pipe/equipment losses. Normal and worst-case rated checks independently enforce ratio ≥ {npshRatio.toFixed(2)} and absolute margin ≥ {U.fmt("head", npshMarginAbs, 2)} {uh}.</li>
          <li>Fluid properties {fluid.key === "Custom" ? "entered manually" : `derived at ${(fluid.tempC != null ? fluid.tempC : 20).toFixed(0)} °C`}. Viscous correction is a flow/Ns-aware screening model with conservative NPSHr multiplier; μ &gt; ~300 cP requires vendor curves.</li>
          <li>Required duty is independent of the predicted pump/system intersection. Rated point = required duty +{design.flowMargin}% flow / +{design.headMargin}% head and is checked against vendor-entered POR {porMinPct}-{porMaxPct}% and AOR {aorMinPct}-{aorMaxPct}% of BEP.</li>
          <li>Motor selection uses maximum absorbed power across the configured AOR at maximum scenario density, a {(motorMargin * 100 - 100).toFixed(0)}% sizing margin, the next IEC/NEMA catalog size, and excludes installed standby pumps from operating energy.</li>
          <li>This remains a screening/duty-checking calculation unless validated vendor curves, service-specific NPSH limits, and final guarantee data are entered.</li>
        </ol>

        <div className="sign">
          <div className="line">Prepared —</div>
          <div className="line">Checked —</div>
          <div className="line">Approved —</div>
        </div>
      </div>
    </div>
  );
};

window.Report = Report;
