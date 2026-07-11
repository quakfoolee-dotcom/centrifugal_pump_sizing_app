// duty.js — shared duty-point derivation, used by Calculator, Report, and Compare.
// Engineering results are solved at the pump/system intersection.
(function (global) {
  function computeDuty(state) {
    const PM = global.PumpMath;
    const { sys, pump, op } = state;
    const scenario = state.scenario || {};

    const fitS = Array.isArray(sys.fitS) ? sys.fitS : [];
    const fitD = Array.isArray(sys.fitD) ? sys.fitD : [];
    const sumKs = PM.sumK(fitS);
    const sumKd = PM.sumK(fitD);
    const sysEff = {
      ...sys,
      epsS: sys.epsS != null ? sys.epsS : sys.eps,
      epsD: sys.epsD != null ? sys.epsD : sys.eps,
      equipmentCondition: sys.equipmentCondition || "clean",
      Ks: sumKs,
      Kd: sumKd,
    };
    const effPump = PM.withViscosity(pump, sys.mu);
    const affinity = PM.affinityStatus(pump);
    const affinityOutOfBounds = affinity.outOfBounds;
    const nSet = PM.nP(pump), arrange = PM.arr(pump);
    sysEff.operatingPumps = nSet;
    sysEff.arrangement = arrange;
    const installedRequested = Math.round(pump.installedPumps || (arrange === "single" ? 1 : nSet));
    const installedPumps = Math.max(nSet, installedRequested);
    const parallelImbalancePct = arrange === "parallel" ? Math.max(0, pump.parallelImbalancePct || 0) : 0;
    const branchFlowFactor = 1 + parallelImbalancePct / 100;
    const validationErrors = [];
    const validationWarnings = [];
    const requirePositive = (value, label) => {
      if (!Number.isFinite(value) || value <= 0) validationErrors.push(`${label} must be greater than zero`);
    };
    requirePositive(sys.rho, "Fluid density");
    requirePositive(sys.mu, "Fluid viscosity");
    requirePositive(sys.Ds, "Suction inside diameter");
    requirePositive(sys.Dd, "Discharge inside diameter");
    requirePositive(pump.Qb, "Pump BEP flow");
    requirePositive(pump.Hb, "Pump BEP head");
    requirePositive(pump.N0, "Reference speed");
    requirePositive(pump.D0, "Reference impeller diameter");
    requirePositive(pump.N, "Operating speed");
    requirePositive(pump.D, "Operating impeller diameter");
    if (!Number.isFinite(sys.Patm_kPa) || sys.Patm_kPa <= 0) validationErrors.push("Atmospheric pressure must be greater than zero");
    if (!Number.isFinite(sys.Pvap_kPa) || sys.Pvap_kPa < 0) validationErrors.push("Vapor pressure cannot be negative");
    if ((sys.Ls || 0) < 0 || (sys.Ld || 0) < 0) validationErrors.push("Pipe lengths cannot be negative");
    if ((sysEff.epsS || 0) < 0 || (sysEff.epsD || 0) < 0) validationErrors.push("Pipe roughness cannot be negative");
    if (!Number.isFinite(pump.etaMax) || pump.etaMax < 0.05 || pump.etaMax > 0.95) validationErrors.push("Pump efficiency must be between 5% and 95%");
    if (installedRequested < nSet) validationErrors.push("Installed pump count cannot be below operating pump count");
    const catalog = Array.isArray(pump.catalog) ? pump.catalog : [];
    catalog.forEach((row, index) => {
      if (row.q != null && (!Number.isFinite(row.q) || row.q < 0)) validationErrors.push(`Catalog row ${index + 1}: flow must be non-negative`);
      if (row.h != null && (!Number.isFinite(row.h) || row.h < 0)) validationErrors.push(`Catalog row ${index + 1}: head must be non-negative`);
      if (row.eta != null && row.eta !== 0 && (!Number.isFinite(row.eta) || row.eta < 0.05 || row.eta > 0.95)) validationErrors.push(`Catalog row ${index + 1}: efficiency must be 5-95%`);
      if (row.npshr != null && (!Number.isFinite(row.npshr) || row.npshr < 0)) validationErrors.push(`Catalog row ${index + 1}: NPSHr must be non-negative`);
    });
    const fluidTemp = state.fluid && state.fluid.tempC;
    if (Number.isFinite(fluidTemp) && Number.isFinite(state.fluid.validMinC) && fluidTemp < state.fluid.validMinC) validationWarnings.push("Fluid temperature is below the preset correlation range");
    if (Number.isFinite(fluidTemp) && Number.isFinite(state.fluid.validMaxC) && fluidTemp > state.fluid.validMaxC) validationWarnings.push("Fluid temperature is above the preset correlation range");
    if (Number.isFinite(fluidTemp) && Number.isFinite(state.fluid.freezeC) && fluidTemp <= state.fluid.freezeC) validationWarnings.push("Fluid may be frozen or outside its liquid range");
    const suctionAbs_kPa = (sys.Patm_kPa || 0) + (sys.Ps_kPa || 0);
    const boilingRisk = suctionAbs_kPa <= (sys.Pvap_kPa || 0);
    if (boilingRisk) validationErrors.push("Suction absolute pressure is at or below vapor pressure");
    const design = state.design || { flowMargin: 10, headMargin: 0, headMode: "system" };
    const selectedQ = Number.isFinite(design.requiredQ)
      ? design.requiredQ
      : Number.isFinite(op && op.Q) ? op.Q : PM.combinedBEPflow(effPump);
    if (!Number.isFinite(selectedQ) || selectedQ <= 0) validationErrors.push("Required duty flow must be greater than zero");
    if (design.headMode === "manual" && (!Number.isFinite(design.requiredH) || design.requiredH < 0)) validationErrors.push("Manual required head must be non-negative");
    const inputValid = validationErrors.length === 0;
    const Qmax = PM.suggestedQmax(effPump, selectedQ);
    const dutyPoint = PM.operatingPointCombined(effPump, sysEff, Qmax);
    const hasDutyPoint = inputValid && dutyPoint.Q > 0 && Number.isFinite(dutyPoint.Q);
    const noDutyPoint = !hasDutyPoint;
    const dutyQ = hasDutyPoint ? dutyPoint.Q : 0;

    const opH = PM.combinedH(dutyQ, effPump);
    const opEta = PM.combinedEta(dutyQ, effPump);
    const perQ = PM.perPumpQ(dutyQ, effPump);
    const worstBranchQ = perQ * branchFlowFactor;
    const opNPSHr = arrange === "parallel" ? PM.pumpNPSHr(worstBranchQ, effPump) : PM.combinedNPSHr(dutyQ, effPump);
    const opNPSHa = PM.npshAvailable(dutyQ, sysEff);
    const perH = arrange === "series" ? PM.pumpH(dutyQ, effPump) : opH;

    const bepQ = PM.combinedBEPflow(effPump);
    const porMinPct = pump.porMinPct != null ? pump.porMinPct : 70;
    const porMaxPct = pump.porMaxPct != null ? pump.porMaxPct : 120;
    const aorMinPct = pump.aorMinPct != null ? pump.aorMinPct : 50;
    const aorMaxPct = pump.aorMaxPct != null ? pump.aorMaxPct : 130;
    const qMcsf = PM.minFlow(effPump) * (arrange === "parallel" ? nSet : 1);
    const qThermal = Math.max(0, pump.thermalMinFlow || 0) * (arrange === "parallel" ? nSet : 1);
    const qMin = Math.max(qMcsf, qThermal);
    const aorMinQ = bepQ * aorMinPct / 100;
    const aorMaxQ = Math.min(PM.combinedFlowLimit(effPump), bepQ * aorMaxPct / 100);
    const maxRho = Number.isFinite(scenario.rhoMax) && scenario.rhoMax > 0 ? scenario.rhoMax : sys.rho;
    let maxBhpPer = 0;
    let maxBhpQ = 0;
    if (inputValid && aorMaxQ > 0) {
      const q0 = Math.max(0.01, Math.min(aorMinQ, aorMaxQ));
      for (let i = 0; i <= 80; i++) {
        const qTotal = q0 + (aorMaxQ - q0) * i / 80;
        const qEach = PM.perPumpQ(qTotal, effPump) * branchFlowFactor;
        const hEach = arrange === "series" ? PM.pumpH(qTotal, effPump) : PM.combinedH(qTotal, effPump);
        const etaEach = PM.pumpEta(qEach, effPump);
        const bhp = PM.brakePower(qEach, hEach, maxRho, etaEach);
        if (Number.isFinite(bhp) && bhp > maxBhpPer) { maxBhpPer = bhp; maxBhpQ = qTotal; }
      }
    }

    const Phyd = PM.hydraulicPower(dutyQ, opH, sys.rho);
    const PbrakePer = PM.brakePower(perQ, perH, sys.rho, opEta);
    const Pbrake = PbrakePer * nSet;
    const motorMargin = 1 + Math.max(0, pump.motorMarginPct != null ? pump.motorMarginPct : 15) / 100;
    const motorBasisPer = Math.max(hasDutyPoint ? PbrakePer : 0, maxBhpPer);
    const motor = PM.motorSelection(inputValid && hasDutyPoint ? motorBasisPer : 0, motorMargin);
    const motorEff = PM.motorEfficiency(motor.selected_kW || PbrakePer);
    const Pmotor = Pbrake / motorEff;

    // Specific speed is a per-machine parameter — always per-pump flow/head,
    // not the combined-set totals (matters once arrangement !== "single").
    const Ns = PM.specificSpeed(pump.N, perQ, perH);
    const Nss = PM.suctionSpecificSpeed(effPump);

    const vSuction = PM.velocity(dutyQ, sys.Ds);
    const vDischarge = PM.velocity(dutyQ, sys.Dd);
    const hfSuction = PM.frictionHead(dutyQ, sys.Ls, sys.Ds, sysEff.epsS, sys.rho, sys.mu, sumKs);
    const hfDischarge = PM.frictionHead(dutyQ, sys.Ld, sys.Dd, sysEff.epsD, sys.rho, sys.mu, sumKd);
    const equipmentLoss = PM.equipmentHeadBreakdown(dutyQ, sysEff);
    const equipmentClean = PM.equipmentHeadBreakdown(dutyQ, { ...sysEff, equipmentCondition: "clean" }, "clean");
    const equipmentDirty = PM.equipmentHeadBreakdown(dutyQ, { ...sysEff, equipmentCondition: "dirty" }, "dirty");
    const staticLift = PM.staticLift(sysEff);
    const presHead = PM.pressureHead(sysEff);
    const TDH = staticLift + presHead + hfSuction + hfDischarge + equipmentLoss.total;
    const Re_s = PM.reynolds(vSuction, sys.Ds, sys.rho, sys.mu);
    const flowRegimeS = PM.flowRegime(Re_s);
    const transitionalFlow = flowRegimeS === "transitional";
    const hasFittingLosses = [...fitS, ...fitD].some(r => (r.qty || 0) > 0);
    const hasGenericReducer = [...fitS, ...fitD].some(r => r.type === "reducer" && (r.qty || 0) > 0);
    const minorLossesApprox = hasFittingLosses;

    // Required duty is independent of the predicted pump/system intersection.
    const selectedHsys = design.headMode === "manual" && Number.isFinite(design.requiredH)
      ? design.requiredH
      : PM.systemHead(selectedQ, sysEff);
    const ratedQ = selectedQ * (1 + (design.flowMargin || 0) / 100);
    const ratedHsys = selectedHsys * (1 + (design.headMargin || 0) / 100);
    const ratedBepPct = bepQ > 0 ? ratedQ / bepQ * 100 : 0;
    const ratedInPOR = ratedBepPct >= porMinPct && ratedBepPct <= porMaxPct;
    const ratedInAOR = ratedBepPct >= aorMinPct && ratedBepPct <= aorMaxPct;
    const ratedLeftOfBEP = ratedQ <= bepQ; // retained for imported reports/backward compatibility

    const dutyHsys = PM.systemHead(dutyQ, sysEff);
    const speedForDutyResult = PM.speedForDutyResult(effPump, selectedQ, selectedHsys);
    const speedForDuty = speedForDutyResult.speed;
    const speedForDutyStatus = speedForDutyResult.status;
    const speedForDutyClamped = speedForDutyStatus === "above-max" || speedForDutyStatus === "below-min";
    const speedTargetAffinity = PM.affinityStatus({ ...pump, N: speedForDuty });
    const speedTargetAffinityOk = speedForDutyStatus === "solved" && speedTargetAffinity.speedOk;
    const minVfdResult = PM.minVfdSpeedResult(effPump, sysEff);
    const minVfd = minVfdResult.speed;
    const minVfdStatus = minVfdResult.status;
    const minVfdClamped = minVfdStatus === "above-max" || minVfdStatus === "below-min";
    const minVfdInvalid = minVfdStatus === "invalid";

    const normalZs = Number.isFinite(scenario.ZsNormal) ? scenario.ZsNormal : sys.Zs;
    const normalZd = Number.isFinite(scenario.ZdNormal) ? scenario.ZdNormal : sys.Zd;
    const minZs = Number.isFinite(scenario.ZsMin) ? scenario.ZsMin : normalZs;
    const maxZs = Number.isFinite(scenario.ZsMax) ? scenario.ZsMax : normalZs;
    const minZd = Number.isFinite(scenario.ZdMin) ? scenario.ZdMin : normalZd;
    const maxZd = Number.isFinite(scenario.ZdMax) ? scenario.ZdMax : normalZd;
    const worstHeadSys = { ...sysEff, Zs: minZs, Zd: maxZd, rho: maxRho, equipmentCondition: "dirty" };
    const bestHeadSys = { ...sysEff, Zs: maxZs, Zd: minZd, equipmentCondition: "clean" };
    const worstNpshSys = {
      ...worstHeadSys,
      Patm_kPa: Number.isFinite(scenario.PatmMin_kPa) ? scenario.PatmMin_kPa : sys.Patm_kPa,
      Pvap_kPa: Number.isFinite(scenario.PvapMax_kPa) ? scenario.PvapMax_kPa : sys.Pvap_kPa,
    };
    const worstDutyPoint = PM.operatingPointCombined(effPump, worstHeadSys, Qmax);
    const bestDutyPoint = PM.operatingPointCombined(effPump, bestHeadSys, Qmax);
    const scenarioFlow = ratedQ > 0 ? ratedQ : selectedQ;
    const worstNPSHa = PM.npshAvailable(scenarioFlow, worstNpshSys);
    const worstRatedPerQ = PM.perPumpQ(scenarioFlow, effPump) * branchFlowFactor;
    const worstNPSHr = arrange === "parallel" ? PM.pumpNPSHr(worstRatedPerQ, effPump) : PM.combinedNPSHr(scenarioFlow, effPump);
    const worstNpshMargin = worstNPSHa - worstNPSHr;
    const worstNpshRatio = worstNPSHr > 0 ? worstNPSHa / worstNPSHr : 99;
    const worstNpshRatioOk = worstNpshRatio >= (pump.npshRatio || 1.3);
    const worstNpshAbsOk = worstNpshMargin >= (pump.npshMarginAbs != null ? pump.npshMarginAbs : 0.6);
    const worstCavOk = inputValid && worstNpshRatioOk && worstNpshAbsOk;
    const scenarioResults = [
      { key: "best", label: "Best hydraulic", Q: bestDutyPoint.Q, H: bestDutyPoint.H, system: bestHeadSys },
      { key: "normal", label: "Normal", Q: dutyQ, H: opH, system: sysEff },
      { key: "worst", label: "Worst hydraulic", Q: worstDutyPoint.Q, H: worstDutyPoint.H, system: worstHeadSys },
    ];
    const stagingResults = [];
    if (arrange === "parallel") {
      for (let count = 1; count <= nSet; count++) {
        const stagePump = { ...effPump, arrangement: count === 1 ? "single" : "parallel", nPumps: count };
        const stageSys = { ...sysEff, arrangement: count === 1 ? "single" : "parallel", operatingPumps: count };
        const point = PM.operatingPointCombined(stagePump, stageSys, Qmax);
        stagingResults.push({
          count,
          label: count === nSet ? "All operating" : count === nSet - 1 ? "One unavailable" : `${count} operating`,
          Q: point.Q,
          H: point.H,
        });
      }
    } else {
      stagingResults.push({ count: 1, label: installedPumps > 1 ? "Duty pump only" : "Operating", Q: dutyQ, H: opH });
    }

    const econ = state.econ || { hours: 8000, price: 0.12 };
    const en = PM.energy(Pbrake, motorEff, econ.hours, econ.price, dutyQ);

    const visc = PM.viscosityCorrectionAt(effPump, dutyQ);
    const viscActive = visc.CH < 0.999 || visc.CQ < 0.999 || visc.Ceta < 0.999;
    const viscHighRisk = sys.mu >= 300;
    const viscModelScreening = viscActive;
    const curveEstimated = !PM.hasCatalogCurve(pump);
    const catalogHeadStatus = PM.catalogHeadStatus(pump);
    const catalogAux = PM.catalogAuxStatus(pump);
    const catalogEtaEstimated = catalogAux.etaEstimated;
    const catalogNpshrEstimated = catalogAux.npshrEstimated;
    const catalogHeadFlattened = catalogHeadStatus.hasCatalog && catalogHeadStatus.flattened;
    const blankCatalogExtrap = { hasCatalog: catalogHeadStatus.hasCatalog, outside: false, below: false, above: false };
    const catalogExtrap = hasDutyPoint
      ? PM.catalogExtrapolationStatus(effPump, dutyQ)
      : blankCatalogExtrap;
    const catalogExtrapolated = hasDutyPoint && catalogExtrap.outside;
    const catalogRatedExtrap = hasDutyPoint
      ? PM.catalogExtrapolationStatus(effPump, ratedQ)
      : blankCatalogExtrap;
    const catalogRatedExtrapolated = hasDutyPoint && catalogRatedExtrap.outside;
    const catalogSelectedExtrap = Number.isFinite(selectedQ)
      ? PM.catalogExtrapolationStatus(effPump, selectedQ)
      : blankCatalogExtrap;
    const catalogSelectedExtrapolated = catalogSelectedExtrap.outside;
    const fluidKey = state.fluid && state.fluid.key;
    const fluidPropsEstimated = !!(fluidKey && fluidKey !== "Water" && fluidKey !== "Custom");

    const npshRatio = pump.npshRatio || 1.3;
    const npshMarginAbs = pump.npshMarginAbs != null ? pump.npshMarginAbs : 0.6;
    const margin = opNPSHa - opNPSHr;
    const ratioActual = opNPSHr > 0 ? opNPSHa / opNPSHr : 99;
    const npshRatioOk = ratioActual >= npshRatio;
    const npshAbsOk = margin >= npshMarginAbs;
    const cavOk = hasDutyPoint && npshRatioOk && npshAbsOk;

    const bepPct = bepQ > 0 ? (dutyQ / bepQ) * 100 : 0;
    const belowMinFlow = hasDutyPoint && dutyQ < qMin;
    const nssLimit = pump.nssLimit != null ? pump.nssLimit : 213;
    const highSuctionEnergy = Nss > nssLimit;
    const inPOR = bepPct >= porMinPct && bepPct <= porMaxPct;
    const inAOR = bepPct >= aorMinPct && bepPct <= aorMaxPct;
    const sN = pump.N / pump.N0, sD = pump.D / pump.D0;

    return {
      fitS, fitD, sumKs, sumKd, sysEff, effPump, affinity, affinityOutOfBounds, nSet, arrange, installedPumps,
      parallelImbalancePct, branchFlowFactor, worstBranchQ,
      validationErrors, validationWarnings, inputValid, boilingRisk,
      selectedQ, selectedHsys, hasDutyPoint, noDutyPoint, dutyQ, dutyPoint, Qmax,
      opH, opEta, opNPSHr, opNPSHa, perQ, perH,
      Phyd, PbrakePer, Pbrake, motorEff, Pmotor, motor, motorMargin, motorBasisPer, maxBhpPer, maxBhpQ,
      Ns, Nss, vSuction, vDischarge, hfSuction, hfDischarge,
      staticLift, presHead, TDH, Re_s, flowRegimeS, transitionalFlow,
      equipmentLoss, equipmentClean, equipmentDirty,
      hasFittingLosses, hasGenericReducer, minorLossesApprox,
      design, ratedQ, ratedHsys, ratedLeftOfBEP, ratedBepPct, ratedInPOR, ratedInAOR,
      dutyHsys, speedForDutyResult, speedForDuty, speedForDutyStatus, speedForDutyClamped,
      speedTargetAffinity, speedTargetAffinityOk, minVfdResult, minVfd, minVfdStatus, minVfdClamped, minVfdInvalid,
      scenario, worstHeadSys, bestHeadSys, worstNpshSys, scenarioResults, stagingResults,
      worstDutyPoint, bestDutyPoint, worstNPSHa, worstNPSHr, worstNpshMargin, worstNpshRatio,
      worstNpshRatioOk, worstNpshAbsOk, worstCavOk, maxRho,
      econ, en,
      visc, viscActive, viscHighRisk, viscModelScreening, curveEstimated,
      catalogHeadStatus, catalogAux, catalogEtaEstimated, catalogNpshrEstimated,
      catalogHeadFlattened, catalogExtrap, catalogExtrapolated,
      catalogRatedExtrap, catalogRatedExtrapolated,
      catalogSelectedExtrap, catalogSelectedExtrapolated,
      fluidPropsEstimated,
      npshRatio, npshMarginAbs, margin, ratioActual, npshRatioOk, npshAbsOk, cavOk,
      bepQ, bepPct, qMcsf, qThermal, qMin, belowMinFlow, nssLimit, highSuctionEnergy,
      porMinPct, porMaxPct, aorMinPct, aorMaxPct, aorMinQ, aorMaxQ, inPOR, inAOR,
      sN, sD,
    };
  }
  global.computeDuty = computeDuty;
})(window);
