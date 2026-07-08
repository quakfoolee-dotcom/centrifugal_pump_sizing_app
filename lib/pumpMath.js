// Centrifugal pump math — SI units throughout.
// Q  : m^3/h        (volumetric flow)
// H  : m            (head)
// P  : kW           (power)
// D  : mm           (pipe ID or impeller diameter)
// ρ  : kg/m^3
// μ  : cP  (1 cP = 0.001 Pa·s)
// g  = 9.80665 m/s^2

(function (global) {
  const g = 9.80665;

  // ---- unit helpers -------------------------------------------------------
  const m3h_to_m3s = (q) => q / 3600;
  const m3s_to_m3h = (q) => q * 3600;

  // Pipe velocity [m/s] given Q [m^3/h] and ID [mm]
  function velocity(Q_m3h, ID_mm) {
    const A = Math.PI * Math.pow(ID_mm / 1000, 2) / 4; // m^2
    return m3h_to_m3s(Q_m3h) / A;
  }

  // Reynolds number. μ in cP, ρ in kg/m^3, v m/s, D mm.
  function reynolds(v, D_mm, rho, mu_cP) {
    const mu = mu_cP * 1e-3; // Pa·s
    return (rho * v * (D_mm / 1000)) / mu;
  }

  // Swamee–Jain explicit friction factor (turbulent). Falls back to 64/Re laminar.
  function frictionFactor(Re, epsilon_mm, D_mm) {
    if (Re < 2300) return 64 / Math.max(Re, 1);
    const rel = epsilon_mm / D_mm;
    const denom = Math.log10(rel / 3.7 + 5.74 / Math.pow(Re, 0.9));
    return 0.25 / (denom * denom);
  }

  // Darcy–Weisbach head loss [m]. L in m, D in mm.
  function frictionHead(Q_m3h, L_m, D_mm, epsilon_mm, rho, mu_cP, Kfit = 0) {
    if (Q_m3h <= 0) return 0;
    const v = velocity(Q_m3h, D_mm);
    const Re = reynolds(v, D_mm, rho, mu_cP);
    const f = frictionFactor(Re, epsilon_mm, D_mm);
    const hf = f * (L_m / (D_mm / 1000)) * (v * v) / (2 * g);
    const hk = Kfit * (v * v) / (2 * g);
    return hf + hk;
  }

  // System curve: static lift + vessel-pressure head + friction (suction+discharge)
  //   Zs  : suction free-surface elevation vs pump CL  (+ flooded above, − lift below)
  //   Zd  : discharge delivery elevation vs pump CL
  //   Ps_kPa / Pd_kPa : vessel GAUGE pressures (0 = open to atmosphere)
  // Back-compatible: if sys.Hstatic is present and Zs/Zd absent, use it.
  function staticLift(sys) {
    if (sys.Zd != null || sys.Zs != null) return (sys.Zd || 0) - (sys.Zs || 0);
    return sys.Hstatic || 0;
  }
  function pressureHead(sys) {
    const dP = ((sys.Pd_kPa || 0) - (sys.Ps_kPa || 0)) * 1000; // Pa
    return dP / (sys.rho * g);
  }
  function systemHead(Q_m3h, sys) {
    const suction = frictionHead(
      Q_m3h, sys.Ls, sys.Ds, sys.eps, sys.rho, sys.mu, sys.Ks
    );
    const discharge = frictionHead(
      Q_m3h, sys.Ld, sys.Dd, sys.eps, sys.rho, sys.mu, sys.Kd
    );
    return staticLift(sys) + pressureHead(sys) + suction + discharge;
  }

  // ---- fittings K-value library (Crane TP-410 approximations) -------------
  const FITTINGS = {
    entrance_sharp:   { label: "Entrance (sharp)",        K: 0.50 },
    entrance_round:   { label: "Entrance (rounded)",      K: 0.05 },
    exit:             { label: "Exit to tank",            K: 1.00 },
    elbow90_lr:       { label: "90° elbow (long radius)", K: 0.30 },
    elbow90_std:      { label: "90° elbow (standard)",    K: 0.75 },
    elbow45:          { label: "45° elbow",               K: 0.35 },
    tee_run:          { label: "Tee (flow through run)",  K: 0.40 },
    tee_branch:       { label: "Tee (branch flow)",       K: 1.00 },
    gate:             { label: "Gate valve (open)",       K: 0.15 },
    globe:            { label: "Globe valve (open)",      K: 6.00 },
    ball:             { label: "Ball valve (open)",       K: 0.05 },
    butterfly:        { label: "Butterfly valve (open)",  K: 0.60 },
    check_swing:      { label: "Check valve (swing)",     K: 2.00 },
    check_lift:       { label: "Check valve (lift)",      K: 10.0 },
    foot:             { label: "Foot valve w/ strainer",  K: 3.00 },
    strainer:         { label: "Strainer (Y-type)",       K: 2.00 },
    reducer:          { label: "Reducer / expander",      K: 0.20 },
  };
  function sumK(list) {
    if (!Array.isArray(list)) return 0;
    return list.reduce((s, r) => {
      const f = FITTINGS[r.type];
      return s + (f ? f.K * (r.qty || 0) : 0);
    }, 0);
  }

  // ---- temperature-driven fluid properties --------------------------------
  // Water: accurate correlations. Others: generic corrections from a
  // reference point (Tref) carried on the preset.
  function waterDensity(T) { // Kell 1975, kg/m³, T in °C
    return (999.83952 + 16.945176 * T - 7.9870401e-3 * T * T
            - 46.170461e-6 * T ** 3 + 105.56302e-9 * T ** 4
            - 280.54253e-12 * T ** 5) / (1 + 16.879850e-3 * T);
  }
  function waterViscosity(T) { // cP, T in °C  (Vogel)
    const TK = T + 273.15;
    return 2.414e-2 * Math.pow(10, 247.8 / (TK - 140));
  }
  function waterVapor(T) { // kPa, Antoine (mmHg → kPa)
    const mmHg = Math.pow(10, 8.07131 - 1730.63 / (233.426 + T));
    return mmHg * 0.1333224;
  }
  // Derive {rho, mu, Pvap_kPa} for a preset at temperature T.
  function deriveProps(preset, T) {
    if (!preset) return null;
    const Tref = preset.Tref != null ? preset.Tref : 20;
    if (preset.cat === "water") {
      return { rho: waterDensity(T), mu: waterViscosity(T), Pvap_kPa: waterVapor(T) };
    }
    const TK = T + 273.15, TrefK = Tref + 273.15;
    // Density: linear thermal expansion (aqueous milder than organic)
    const beta = preset.cat === "aqueous" ? 4e-4 : 8e-4;
    const rho = preset.rho * (1 - beta * (T - Tref));
    // Viscosity: Arrhenius; stronger T-dependence for more viscous fluids
    const B = Math.max(1200, Math.min(6000, 600 * Math.log(Math.max(preset.mu, 1)) + 1400));
    const mu = Math.max(0.05, preset.mu * Math.exp(B * (1 / TK - 1 / TrefK)));
    // Vapor pressure
    let Pvap;
    if (preset.cat === "aqueous") {
      // anchor to water's vapor-pressure curve, scaled to preset ref
      const scale = preset.Pvap_kPa / Math.max(1e-6, waterVapor(Tref));
      Pvap = waterVapor(T) * scale;
    } else {
      // Clausius–Clapeyron, generic ΔHvap/R ≈ 4300 K
      Pvap = preset.Pvap_kPa * Math.exp(-4300 * (1 / TK - 1 / TrefK));
    }
    return { rho, mu, Pvap_kPa: Math.max(0, Pvap) };
  }

  // ---- least-squares polynomial fit (deg 1 or 2) --------------------------
  // pts: [{x, y}, ...]. Returns coefficients {a,b,c} for y = a + b·x + c·x².
  // With 2 points -> linear (c = 0). <2 -> null.
  function fitPoly(pts) {
    const n = pts.length;
    if (n < 2) return null;
    if (n === 2) {
      const [p, q] = pts;
      const b = (q.y - p.y) / (q.x - p.x || 1e-9);
      return { a: p.y - b * p.x, b, c: 0 };
    }
    // Normal equations for quadratic least squares
    let S0 = n, S1 = 0, S2 = 0, S3 = 0, S4 = 0;
    let T0 = 0, T1 = 0, T2 = 0;
    for (const { x, y } of pts) {
      const x2 = x * x;
      S1 += x; S2 += x2; S3 += x2 * x; S4 += x2 * x2;
      T0 += y; T1 += x * y; T2 += x2 * y;
    }
    // Solve 3x3 [ [S0,S1,S2],[S1,S2,S3],[S2,S3,S4] ] · [a,b,c] = [T0,T1,T2]
    const M = [
      [S0, S1, S2, T0],
      [S1, S2, S3, T1],
      [S2, S3, S4, T2],
    ];
    // Gaussian elimination
    for (let i = 0; i < 3; i++) {
      let piv = i;
      for (let r = i + 1; r < 3; r++) if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
      [M[i], M[piv]] = [M[piv], M[i]];
      if (Math.abs(M[i][i]) < 1e-12) return { a: T0 / n, b: 0, c: 0 };
      for (let r = 0; r < 3; r++) {
        if (r === i) continue;
        const f = M[r][i] / M[i][i];
        for (let cc = i; cc < 4; cc++) M[r][cc] -= f * M[i][cc];
      }
    }
    return { a: M[0][3] / M[0][0], b: M[1][3] / M[1][1], c: M[2][3] / M[2][2] };
  }

  const evalPoly = (co, x) => co ? co.a + co.b * x + co.c * x * x : 0;

  // Build reference-frame curve models from a pump definition.
  // Returns { H, eta, npshr, QbepRef, HbepRef } as functions of Qref (ref frame).
  function refModel(pump) {
    if (pump.useCatalog && Array.isArray(pump.catalog) && pump.catalog.length >= 2) {
      const rows = pump.catalog.filter(r => r.q > 0 && Number.isFinite(r.h));
      const Hco = fitPoly(rows.map(r => ({ x: r.q, y: r.h })));
      const etaRows = rows.filter(r => Number.isFinite(r.eta) && r.eta > 0);
      const Eco = etaRows.length >= 2 ? fitPoly(etaRows.map(r => ({ x: r.q, y: r.eta }))) : null;
      const npRows = rows.filter(r => Number.isFinite(r.npshr) && r.npshr > 0);
      const Nco = npRows.length >= 2 ? fitPoly(npRows.map(r => ({ x: r.q, y: r.npshr }))) : null;
      // BEP = vertex of efficiency parabola (or max sampled)
      let QbepRef;
      if (Eco && Eco.c < 0) QbepRef = -Eco.b / (2 * Eco.c);
      else QbepRef = rows.reduce((m, r) => (r.eta || 0) > (m.eta || 0) ? r : m, rows[0]).q;
      const maxQ = Math.max(...rows.map(r => r.q));
      QbepRef = Math.max(1, Math.min(maxQ, QbepRef || maxQ * 0.8));
      return {
        H: (q) => Math.max(0, evalPoly(Hco, q)),
        eta: (q) => {
          if (!Eco) return pump.etaMax || 0.7;
          return Math.max(0.02, Math.min(0.95, evalPoly(Eco, q)));
        },
        npshr: (q) => {
          if (!Nco) return (pump.NPSHr_bep || 3) * (0.55 + 0.45 * Math.pow(q / QbepRef, 2));
          return Math.max(0.1, evalPoly(Nco, q));
        },
        QbepRef,
        HbepRef: Math.max(0, evalPoly(Hco, QbepRef)),
        maxQ,
      };
    }
    // Parametric fallback: parabola with shutoff = 1.25·Hb
    const H0 = 1.25 * pump.Hb;
    const a = (H0 - pump.Hb) / (pump.Qb * pump.Qb);
    return {
      H: (q) => Math.max(0, H0 - a * q * q),
      eta: (q) => {
        const x = q / pump.Qb;
        return Math.max(0.05, Math.min(pump.etaMax, pump.etaMax * (1 - 0.9 * Math.pow(x - 1, 2))));
      },
      npshr: (q) => (pump.NPSHr_bep) * (0.55 + 0.45 * Math.pow(q / pump.Qb, 2)),
      QbepRef: pump.Qb,
      HbepRef: pump.Hb,
      maxQ: pump.Qb * 1.4,
    };
  }

  // Affinity scale factors
  function scales(pump) {
    const sN = pump.N / pump.N0;
    const sD = pump.D / pump.D0;
    return { sN, sD, Qs: sN * sD, Hs: (sN * sD) * (sN * sD) };
  }

  // Viscosity factors carried on pump (_corr) when pump._visc is true.
  function corrOf(pump) {
    if (pump && pump._visc && pump._corr) return pump._corr;
    return { CQ: 1, CH: 1, Ceta: 1 };
  }

  // Water-basis head at actual (scaled) flow.
  function pumpH_water(Q_m3h, pump) {
    const m = refModel(pump);
    const { Qs, Hs } = scales(pump);
    const Qref = Qs > 0 ? Q_m3h / Qs : 0;
    return m.H(Qref) * Hs;
  }

  // Head at operating flow — viscosity-corrected if enabled.
  function pumpH(Q_m3h, pump) {
    const { CQ, CH } = corrOf(pump);
    if (CQ !== 1 || CH !== 1) {
      return CH * pumpH_water(Q_m3h / CQ, pump);
    }
    return pumpH_water(Q_m3h, pump);
  }

  function pumpEta_water(Q_m3h, pump) {
    const m = refModel(pump);
    const { Qs } = scales(pump);
    const Qref = Qs > 0 ? Q_m3h / Qs : 0;
    return m.eta(Qref);
  }

  function pumpEta(Q_m3h, pump) {
    const { CQ, Ceta } = corrOf(pump);
    if (CQ !== 1 || Ceta !== 1) {
      return Math.max(0.02, Ceta * pumpEta_water(Q_m3h / CQ, pump));
    }
    return pumpEta_water(Q_m3h, pump);
  }

  // NPSHr — not viscosity-corrected (per HI practice). Scales ~ speed².
  function pumpNPSHr(Q_m3h, pump) {
    const m = refModel(pump);
    const { Qs, sN } = scales(pump);
    const Qref = Qs > 0 ? Q_m3h / Qs : 0;
    return Math.max(0, m.npshr(Qref) * (sN * sN));
  }

  // Actual-frame BEP flow & head
  function bepFlow(pump) {
    const m = refModel(pump);
    const { Qs } = scales(pump);
    return m.QbepRef * Qs;
  }
  function bepHead(pump) {
    return pumpH_water(bepFlow(pump), pump);
  }

  // NPSH available — suction vessel pressure + static + atm − vapor − friction.
  //   Absolute suction-side pressure = Patm + Ps_gauge.
  //   Zs = suction free-surface elevation vs pump CL (+ flooded).
  // Back-compatible with old sys.Hs_static.
  function npshAvailable(Q_m3h, sys) {
    const Ps_gauge = sys.Ps_kPa || 0;
    const Pabs = (sys.Patm_kPa + Ps_gauge) * 1000;      // Pa absolute
    const Pabs_m = Pabs / (sys.rho * g);
    const Pvap_m = (sys.Pvap_kPa * 1000) / (sys.rho * g);
    const Zs = (sys.Zs != null) ? sys.Zs : (sys.Hs_static || 0);
    const hfs = frictionHead(Q_m3h, sys.Ls, sys.Ds, sys.eps, sys.rho, sys.mu, sys.Ks);
    return Pabs_m + Zs - Pvap_m - hfs;
  }

  // Hydraulic power [kW]
  function hydraulicPower(Q_m3h, H_m, rho) {
    const Q = m3h_to_m3s(Q_m3h);
    return (rho * g * Q * H_m) / 1000;
  }

  // Brake (shaft) power [kW]
  function brakePower(Q_m3h, H_m, rho, eta) {
    return hydraulicPower(Q_m3h, H_m, rho) / Math.max(0.05, eta);
  }

  // Specific speed (metric, Ns = N·√Q / H^0.75; Q m^3/s, H m, N rpm)
  function specificSpeed(N_rpm, Q_m3h, H_m) {
    const Q = m3h_to_m3s(Q_m3h);
    if (H_m <= 0 || Q <= 0) return 0;
    return (N_rpm * Math.sqrt(Q)) / Math.pow(H_m, 0.75);
  }

  // Suction specific speed (metric): Nss = N·√Q_bep / NPSHr_bep^0.75
  // Metric Nss ~ 1.63 × US units. Threshold ~213 (≈ 11000 US) = elevated
  // suction recirculation risk.
  function suctionSpecificSpeed(pump) {
    const Qb = bepFlow(pump);
    const npshrB = pumpNPSHr(Qb, pump);
    if (npshrB <= 0 || Qb <= 0) return 0;
    const Q = m3h_to_m3s(Qb);
    return (pump.N * Math.sqrt(Q)) / Math.pow(npshrB, 0.75);
  }

  // Minimum continuous stable flow [m³/h]
  function minFlow(pump) {
    const pct = (pump.minFlowPct != null ? pump.minFlowPct : 45) / 100;
    return bepFlow(pump) * pct;
  }

  // Viscosity correction (HI 9.6.7-style approximation, NOT the full chart).
  // Returns {CQ, CH, Ceta}. Calibrated against representative HI chart points:
  //   μ≈40cP → Cη≈0.84, μ≈150 → 0.67, μ≈1000 → 0.42, μ≈4000 → 0.24
  // Efficiency is hit hardest; head and flow much less. Larger pumps
  // (higher Q·H) are less affected — captured by a size-scaled μ_eff.
  function viscosityCorrection(Qb, Hb, mu_cP) {
    if (mu_cP < 10) return { CQ: 1, CH: 1, Ceta: 1 };
    const sizeRef = 120 * 32;                       // calibration basis pump
    const muEff = mu_cP * Math.pow(sizeRef / Math.max(1, Qb * Hb), 0.25);
    let Ceta = 1.32 - 0.13 * Math.log(muEff);       // natural log
    Ceta = Math.max(0.2, Math.min(1, Ceta));
    const CH = Math.max(0.4, 1 - 0.30 * (1 - Ceta));
    const CQ = Math.max(0.4, 1 - 0.25 * (1 - Ceta));
    return { CQ, CH, Ceta };
  }

  // Attach viscosity correction to a pump object (returns a new object).
  // Uses actual-frame BEP as the basis.
  function withViscosity(pump, mu_cP) {
    const QbA = bepFlow(pump);
    const HbA = pumpH_water(QbA, pump);
    const corr = viscosityCorrection(QbA, HbA, mu_cP);
    const active = corr.CQ < 0.999 || corr.CH < 0.999 || corr.Ceta < 0.999;
    return { ...pump, _visc: active, _corr: corr };
  }

  // Operating point: numerical intersection of pump and system curves.
  function operatingPoint(pump, sys, Qmax) {
    let lo = 0.01, hi = Qmax;
    let fLo = pumpH(lo, pump) - systemHead(lo, sys);
    let fHi = pumpH(hi, pump) - systemHead(hi, sys);
    if (fLo * fHi > 0) {
      let prevQ = lo, prevF = fLo, found = false;
      for (let i = 1; i <= 80; i++) {
        const q = lo + (hi - lo) * (i / 80);
        const f = pumpH(q, pump) - systemHead(q, sys);
        if (prevF * f <= 0) { lo = prevQ; hi = q; fLo = prevF; fHi = f; found = true; break; }
        prevQ = q; prevF = f;
      }
      if (!found) return { Q: 0, H: sys.Hstatic };
    }
    for (let i = 0; i < 60; i++) {
      const mid = 0.5 * (lo + hi);
      const fm = pumpH(mid, pump) - systemHead(mid, sys);
      if (fm === 0) { lo = hi = mid; break; }
      if (fLo * fm < 0) { hi = mid; fHi = fm; } else { lo = mid; fLo = fm; }
    }
    const Q = 0.5 * (lo + hi);
    return { Q, H: pumpH(Q, pump) };
  }

  // ---- pump arrangement: parallel / series -------------------------------
  const nP  = (pump) => Math.max(1, pump.nPumps || 1);
  const arr = (pump) => pump.arrangement || "single";

  // Combined head of the pump SET at total flow Q.
  //   parallel: pumps share flow  -> H_comb(Q) = H_single(Q/n)
  //   series:   pumps share head  -> H_comb(Q) = n · H_single(Q)
  function combinedH(Q_m3h, pump) {
    const n = nP(pump), a = arr(pump);
    if (a === "parallel") return pumpH(Q_m3h / n, pump);
    if (a === "series")   return n * pumpH(Q_m3h, pump);
    return pumpH(Q_m3h, pump);
  }
  // Flow seen by each individual pump at total flow Q.
  function perPumpQ(Q_m3h, pump) {
    return arr(pump) === "parallel" ? Q_m3h / nP(pump) : Q_m3h;
  }
  function combinedEta(Q_m3h, pump)   { return pumpEta(perPumpQ(Q_m3h, pump), pump); }
  function combinedNPSHr(Q_m3h, pump) { return pumpNPSHr(perPumpQ(Q_m3h, pump), pump); }
  // Combined-set BEP flow (total).
  function combinedBEPflow(pump) {
    const b = bepFlow(pump);
    return arr(pump) === "parallel" ? b * nP(pump) : b;
  }
  // Combined shutoff head (for axis scaling)
  function combinedShutoff(pump) { return combinedH(0.001, pump); }

  // Practical total-flow plotting/solving envelope for the configured pump set.
  function combinedFlowLimit(pump) {
    const m = refModel(pump);
    const { Qs } = scales(pump);
    const setMul = arr(pump) === "parallel" ? nP(pump) : 1;
    const curveLimit = Math.max(m.maxQ || 0, m.QbepRef * 1.45) * Math.max(Qs, 0.01) * setMul;
    return Math.max(20, curveLimit);
  }

  function suggestedQmax(pump, extraQ = 0) {
    const candidates = [
      combinedFlowLimit(pump) * 1.12,
      combinedBEPflow(pump) * 1.55,
      minFlow(pump) * (arr(pump) === "parallel" ? nP(pump) : 1) * 1.35,
      extraQ * 1.25,
      20,
    ].filter(Number.isFinite);
    const q = Math.max(...candidates);
    const step = q <= 250 ? 20 : 50;
    return Math.ceil(q / step) * step;
  }

  // Intersection of the COMBINED pump curve with the system curve.
  function operatingPointCombined(pump, sys, Qmax) {
    let lo = 0.01, hi = Qmax || suggestedQmax(pump);
    const f = (q) => combinedH(q, pump) - systemHead(q, sys);
    let fLo = f(lo), fHi = f(hi);
    if (fLo * fHi > 0) {
      let expanded = false;
      const maxHi = Math.max(hi * 8, suggestedQmax(pump) * 4);
      while (fLo * fHi > 0 && fHi > 0 && hi < maxHi) {
        lo = hi;
        fLo = fHi;
        hi *= 1.5;
        fHi = f(hi);
        expanded = true;
      }
      if (expanded && fLo * fHi <= 0) {
        // Bracket found by expansion.
      } else {
        lo = 0.01;
        fLo = f(lo);
        let prevQ = lo, prevF = fLo, found = false;
        for (let i = 1; i <= 120; i++) {
          const q = lo + (hi - lo) * (i / 120);
          const fv = f(q);
          if (prevF * fv <= 0) { lo = prevQ; hi = q; fLo = prevF; found = true; break; }
          prevQ = q; prevF = fv;
        }
        if (!found) return { Q: 0, H: systemHead(0, sys) };
      }
    }
    for (let i = 0; i < 60; i++) {
      const mid = 0.5 * (lo + hi);
      const fm = f(mid);
      if (fm === 0) { lo = hi = mid; break; }
      if (fLo * fm < 0) { hi = mid; } else { lo = mid; fLo = fm; }
    }
    const Q = 0.5 * (lo + hi);
    return { Q, H: combinedH(Q, pump) };
  }

  // ---- VFD: speed required to pass the combined curve through (Qd, Hd) ----
  function speedForDuty(pump, Qd, Hd) {
    let lo = 150, hi = 6000;
    const f = (N) => combinedH(Qd, { ...pump, N }) - Hd;
    let fLo = f(lo), fHi = f(hi);
    if (fLo * fHi > 0) return fHi < 0 ? hi : lo; // out of range → clamp
    for (let i = 0; i < 50; i++) {
      const mid = 0.5 * (lo + hi);
      const fm = f(mid);
      if (fLo * fm <= 0) { hi = mid; } else { lo = mid; fLo = fm; }
    }
    return 0.5 * (lo + hi);
  }
  // Minimum speed that still overcomes the pure static+pressure lift at ~zero flow.
  function minVfdSpeed(pump, sys) {
    const Hstat = staticLift(sys) + pressureHead(sys);
    return speedForDuty(pump, 0.5, Hstat);
  }

  // ---- Energy / lifecycle -------------------------------------------------
  // totalShaft [kW], motor eff, hours/yr, price/kWh, flow m³/h
  function energy(totalShaft_kW, motorEff, hoursPerYear, pricePerKWh, Q_m3h) {
    const input_kW = totalShaft_kW / Math.max(0.5, motorEff);
    const kWhPerYear = input_kW * hoursPerYear;
    const costPerYear = kWhPerYear * pricePerKWh;
    const specific_kWh_m3 = Q_m3h > 0 ? input_kW / Q_m3h : 0; // kW / (m³/h) = kWh/m³
    return { input_kW, kWhPerYear, costPerYear, specific_kWh_m3 };
  }

  // ---- Pipe schedule (ASME B36.10) ---------------------------------------
  // OD and wall thickness [mm]; ID = OD − 2·wall.
  const PIPE_OD = {
    15: 21.3, 20: 26.7, 25: 33.4, 32: 42.2, 40: 48.3, 50: 60.3,
    65: 73.0, 80: 88.9, 100: 114.3, 125: 141.3, 150: 168.3,
    200: 219.1, 250: 273.1, 300: 323.9,
  };
  const PIPE_NPS = {
    15: '½"', 20: '¾"', 25: '1"', 32: '1¼"', 40: '1½"', 50: '2"',
    65: '2½"', 80: '3"', 100: '4"', 125: '5"', 150: '6"',
    200: '8"', 250: '10"', 300: '12"',
  };
  // Wall thickness [mm] by DN for Sch 40 / 80 / 160
  const PIPE_WALL = {
    15: { 40: 2.77, 80: 3.73, 160: 4.78 },
    20: { 40: 2.87, 80: 3.91, 160: 5.56 },
    25: { 40: 3.38, 80: 4.55, 160: 6.35 },
    32: { 40: 3.56, 80: 4.85, 160: 6.35 },
    40: { 40: 3.68, 80: 5.08, 160: 7.14 },
    50: { 40: 3.91, 80: 5.54, 160: 8.74 },
    65: { 40: 5.16, 80: 7.01, 160: 9.53 },
    80: { 40: 5.49, 80: 7.62, 160: 11.13 },
    100:{ 40: 6.02, 80: 8.56, 160: 13.49 },
    125:{ 40: 6.55, 80: 9.53, 160: 15.88 },
    150:{ 40: 7.11, 80: 10.97, 160: 18.26 },
    200:{ 40: 8.18, 80: 12.70, 160: 23.01 },
    250:{ 40: 9.27, 80: 15.09, 160: 28.58 },
    300:{ 40: 10.31, 80: 17.45, 160: 33.32 },
  };
  const PIPE_DNS = Object.keys(PIPE_OD).map(Number);
  const PIPE_SCHEDULES = [40, 80, 160];
  function pipeID(dn, sch) {
    const od = PIPE_OD[dn];
    const w = PIPE_WALL[dn] && PIPE_WALL[dn][sch];
    if (!od || !w) return null;
    return +(od - 2 * w).toFixed(1);
  }
  // Best-fit DN/Sch for a given ID (mm) — used to show current pipe.
  function nearestPipe(id_mm) {
    let best = null, err = Infinity;
    for (const dn of PIPE_DNS) for (const sch of PIPE_SCHEDULES) {
      const id = pipeID(dn, sch);
      const e = Math.abs(id - id_mm);
      if (e < err) { err = e; best = { dn, sch, id }; }
    }
    return err <= 0.6 ? best : null;
  }

  // ---- Acceptance tolerance grades ----------------------------------------
  // Tolerance band on the guarantee point: ±Q %, ±H %.
  const TOLERANCES = {
    "ISO 1B": { dQ: 4.5, dH: 3.0, label: "ISO 9906 Grade 1B" },
    "ISO 2B": { dQ: 8.0, dH: 5.0, label: "ISO 9906 Grade 2B" },
    "ISO 3B": { dQ: 9.0, dH: 7.0, label: "ISO 9906 Grade 3B" },
    "HI":     { dQ: 5.0, dH: 3.0, label: "ANSI/HI 14.6 (generic)" },
  };

  global.PumpMath = {
    g, velocity, reynolds, frictionFactor, frictionHead,
    systemHead, staticLift, pressureHead, pumpH, pumpH_water, pumpEta, pumpNPSHr, npshAvailable,
    hydraulicPower, brakePower, specificSpeed, suctionSpecificSpeed,
    minFlow, bepFlow, bepHead, fitPoly,
    FITTINGS, sumK, deriveProps, waterDensity, waterViscosity, waterVapor,
    viscosityCorrection, withViscosity, operatingPoint,
    nP, arr, combinedH, perPumpQ, combinedEta, combinedNPSHr, combinedBEPflow,
    combinedShutoff, combinedFlowLimit, suggestedQmax, operatingPointCombined, speedForDuty, minVfdSpeed, energy,
    PIPE_OD, PIPE_NPS, PIPE_WALL, PIPE_DNS, PIPE_SCHEDULES, pipeID, nearestPipe,
    TOLERANCES,
    m3h_to_m3s, m3s_to_m3h,
  };
})(window);
