// duty.js — shared duty-point derivation, used by Calculator, Report, and Compare.
// Engineering results are solved at the pump/system intersection.
(function (global) {
  function computeDuty(state) {
    const PM = global.PumpMath;
    const { sys, pump, op } = state;

    const fitS = Array.isArray(sys.fitS) ? sys.fitS : [];
    const fitD = Array.isArray(sys.fitD) ? sys.fitD : [];
    const sumKs = PM.sumK(fitS);
    const sumKd = PM.sumK(fitD);
    const sysEff = { ...sys, Ks: sumKs, Kd: sumKd };
    const effPump = PM.withViscosity(pump, sys.mu);
    const nSet = PM.nP(pump), arrange = PM.arr(pump);
    const selectedQ = Number.isFinite(op && op.Q) ? op.Q : PM.combinedBEPflow(effPump);
    const selectedH = PM.combinedH(selectedQ, effPump);
    const Qmax = PM.suggestedQmax(effPump, selectedQ);
    const dutyPoint = PM.operatingPointCombined(effPump, sysEff, Qmax);
    const hasDutyPoint = dutyPoint.Q > 0 && Number.isFinite(dutyPoint.Q);
    const noDutyPoint = !hasDutyPoint;
    const dutyQ = hasDutyPoint ? dutyPoint.Q : 0;

    const opH = PM.combinedH(dutyQ, effPump);
    const opEta = PM.combinedEta(dutyQ, effPump);
    const opNPSHr = PM.combinedNPSHr(dutyQ, effPump);
    const opNPSHa = PM.npshAvailable(dutyQ, sysEff);
    const perQ = PM.perPumpQ(dutyQ, effPump);
    const perH = arrange === "series" ? PM.pumpH(dutyQ, effPump) : opH;

    const Phyd = PM.hydraulicPower(dutyQ, opH, sys.rho);
    const PbrakePer = PM.brakePower(perQ, perH, sys.rho, opEta);
    const Pbrake = PbrakePer * nSet;
    const motorEff = 0.93;
    const Pmotor = Pbrake / motorEff;
    const motor = PM.motorSelection(hasDutyPoint ? PbrakePer : 0, 1.15);

    // Specific speed is a per-machine parameter — always per-pump flow/head,
    // not the combined-set totals (matters once arrangement !== "single").
    const Ns = PM.specificSpeed(pump.N, perQ, perH);
    const Nss = PM.suctionSpecificSpeed(effPump);

    const vSuction = PM.velocity(dutyQ, sys.Ds);
    const vDischarge = PM.velocity(dutyQ, sys.Dd);
    const hfSuction = PM.frictionHead(dutyQ, sys.Ls, sys.Ds, sys.eps, sys.rho, sys.mu, sumKs);
    const hfDischarge = PM.frictionHead(dutyQ, sys.Ld, sys.Dd, sys.eps, sys.rho, sys.mu, sumKd);
    const staticLift = PM.staticLift(sysEff);
    const presHead = PM.pressureHead(sysEff);
    const TDH = staticLift + presHead + hfSuction + hfDischarge;
    const Re_s = PM.reynolds(vSuction, sys.Ds, sys.rho, sys.mu);
    const flowRegimeS = PM.flowRegime(Re_s);
    const transitionalFlow = flowRegimeS === "transitional";
    const hasFittingLosses = [...fitS, ...fitD].some(r => (r.qty || 0) > 0);
    const hasGenericReducer = [...fitS, ...fitD].some(r => r.type === "reducer" && (r.qty || 0) > 0);
    const minorLossesApprox = hasFittingLosses;

    const design = state.design || { flowMargin: 10, headMargin: 0 };
    const ratedQ = dutyQ * (1 + (design.flowMargin || 0) / 100);
    const ratedHsys = PM.systemHead(ratedQ, sysEff) * (1 + (design.headMargin || 0) / 100);
    const ratedLeftOfBEP = ratedQ <= PM.combinedBEPflow(effPump);

    const selectedHsys = PM.systemHead(selectedQ, sysEff);
    const dutyHsys = PM.systemHead(dutyQ, sysEff);
    const speedForDutyResult = PM.speedForDutyResult(effPump, selectedQ, selectedHsys);
    const speedForDuty = speedForDutyResult.speed;
    const speedForDutyStatus = speedForDutyResult.status;
    const speedForDutyClamped = speedForDutyStatus === "above-max" || speedForDutyStatus === "below-min";
    const minVfd = PM.minVfdSpeed(effPump, sysEff);

    const econ = state.econ || { hours: 8000, price: 0.12 };
    const en = PM.energy(Pbrake, motorEff, econ.hours, econ.price, dutyQ);

    const bepQw = PM.bepFlow(pump);
    const bepHw = PM.pumpH_water(bepQw, pump);
    const visc = PM.viscosityCorrection(bepQw, bepHw, sys.mu);
    const viscActive = visc.CH < 0.999 || visc.CQ < 0.999 || visc.Ceta < 0.999;
    const viscHighRisk = sys.mu >= 300;
    const curveEstimated = !PM.hasCatalogCurve(pump);
    const fluidKey = state.fluid && state.fluid.key;
    const fluidPropsEstimated = !!(fluidKey && fluidKey !== "Water" && fluidKey !== "Custom");

    const npshRatio = pump.npshRatio || 1.3;
    const margin = opNPSHa - opNPSHr;
    const ratioActual = opNPSHr > 0 ? opNPSHa / opNPSHr : 99;
    const cavOk = hasDutyPoint && ratioActual >= npshRatio && margin >= 0.6;

    const bepQ = PM.combinedBEPflow(effPump);
    const bepPct = bepQ > 0 ? (dutyQ / bepQ) * 100 : 0;
    const qMin = PM.minFlow(effPump) * (arrange === "parallel" ? nSet : 1);
    const belowMinFlow = hasDutyPoint && dutyQ < qMin;
    const highSuctionEnergy = Nss > 213;
    const inPOR = bepPct >= 70 && bepPct <= 120;
    const sN = pump.N / pump.N0, sD = pump.D / pump.D0;

    return {
      fitS, fitD, sumKs, sumKd, sysEff, effPump, nSet, arrange,
      selectedQ, selectedH, selectedHsys, hasDutyPoint, noDutyPoint, dutyQ, dutyPoint, Qmax,
      opH, opEta, opNPSHr, opNPSHa, perQ, perH,
      Phyd, PbrakePer, Pbrake, motorEff, Pmotor, motor,
      Ns, Nss, vSuction, vDischarge, hfSuction, hfDischarge,
      staticLift, presHead, TDH, Re_s, flowRegimeS, transitionalFlow,
      hasFittingLosses, hasGenericReducer, minorLossesApprox,
      design, ratedQ, ratedHsys, ratedLeftOfBEP,
      dutyHsys, speedForDutyResult, speedForDuty, speedForDutyStatus, speedForDutyClamped, minVfd,
      econ, en,
      visc, viscActive, viscHighRisk, curveEstimated, fluidPropsEstimated,
      npshRatio, margin, ratioActual, cavOk,
      bepQ, bepPct, qMin, belowMinFlow, highSuctionEnergy, inPOR,
      sN, sD,
    };
  }
  global.computeDuty = computeDuty;
})(window);
