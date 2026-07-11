// Independent formula verification for the Centrifugal Pump Sizing App.
// Every expected value here is computed from first principles — exact legal
// unit definitions, an iterative Colebrook-White reference solver, published
// water-property data, and hand-derived hydraulic identities — NOT from the
// app's own code, so agreement is meaningful rather than circular.
//
// Run with: npm run verify:formulas
import { readFileSync } from "node:fs";
import vm from "node:vm";

const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ["lib/pumpMath.js", "lib/units.js", "lib/duty.js"]) {
  vm.runInContext(readFileSync(f, "utf8"), sandbox, { filename: f });
}
const { PumpMath: PM, computeDuty, makeUnits } = sandbox.window;

let pass = 0, fail = 0;
function check(name, actual, expected, relTol = 1e-6) {
  const err = Math.abs(actual - expected);
  const rel = expected !== 0 ? err / Math.abs(expected) : err;
  if (rel <= relTol) { pass++; }
  else { fail++; console.log(`  FAIL ${name}: got ${actual}, expected ${expected} (rel err ${rel.toExponential(2)})`); }
}

// ============ 1. UNIT CONVERSIONS from exact legal definitions ============
const GAL_L = 3.785411784;     // US gallon [L], exact
const FT_M = 0.3048;           // foot [m], exact
const IN_MM = 25.4;            // inch [mm], exact
const LB_KG = 0.45359237;      // pound [kg], exact
const HP_W = 550 * FT_M * LB_KG * 9.80665; // 550 ft·lbf/s exact chain
const PSI_PA = LB_KG * 9.80665 / (IN_MM / 1000) ** 2; // lbf/in²

const US = makeUnits("US");
check("m3/h -> gpm", US.conv("flow", 1), 1000 / GAL_L / 60);
check("m -> ft", US.conv("head", 1), 1 / FT_M);
check("kW -> hp", US.conv("power", 1), 1000 / HP_W);
check("kPa -> psi", US.conv("press", 1), 1000 / PSI_PA);
check("mm -> in", US.conv("dia", 1), 1 / IN_MM);
check("kg/m3 -> lb/ft3", US.conv("dens", 1), FT_M ** 3 / LB_KG);
check("kWh/m3 -> kWh/kgal", US.conv("specE", 1), GAL_L);
check("C -> F (100C)", US.conv("temp", 100), 212);
check("F -> C roundtrip", US.toSI("temp", US.conv("temp", 37.5)), 37.5);
check("motor kW->hp", PM.kwToHp(1), 1000 / HP_W, 1e-7);

// ============ 2. HYDRAULICS from first principles ============
const A100 = Math.PI / 4 * 0.1 ** 2;
check("velocity 36m3/h @100mm", PM.velocity(36, 100), (36 / 3600) / A100);
const v1 = (36 / 3600) / A100;
check("Reynolds", PM.reynolds(v1, 100, 1000, 1), 1000 * v1 * 0.1 / 0.001);

// Churchill vs exact laminar 64/Re
check("Churchill laminar Re=500", PM.frictionFactor(500, 0, 100), 64 / 500, 2e-3);
check("Churchill laminar Re=1800", PM.frictionFactor(1800, 0.046, 100), 64 / 1800, 5e-3);

// Churchill vs iterative Colebrook-White (accepted turbulent reference).
// The two published correlations intrinsically differ by up to ~3%.
function colebrook(Re, relRough) {
  let f = 0.02;
  for (let i = 0; i < 200; i++) {
    const rhs = -2 * Math.log10(relRough / 3.7 + 2.51 / (Re * Math.sqrt(f)));
    f = 1 / (rhs * rhs);
  }
  return f;
}
for (const [Re, rel] of [[1e4, 0.00046], [1e5, 0.00046], [1e6, 0.00046], [5e4, 0.002], [1e7, 0.00001]]) {
  check(`Churchill vs Colebrook Re=${Re} eps/D=${rel}`,
    PM.frictionFactor(Re, rel * 100, 100), colebrook(Re, rel), 0.035);
}

// Darcy-Weisbach hand calculation
const g = 9.80665;
const fHand = colebrook(1000 * v1 * 0.1 / 0.001, 0.00046);
const hfHand = fHand * (100 / 0.1) * v1 * v1 / (2 * g) + 2 * v1 * v1 / (2 * g);
check("frictionHead 100m DN100 K=2", PM.frictionHead(36, 100, 100, 0.046, 1000, 1, 2), hfHand, 0.035);

// System head decomposition
const sysT = { rho: 1000, mu: 1, Zs: 2, Zd: 10, Ps_kPa: 0, Pd_kPa: 100, Ls: 0, Ld: 0, Ds: 100, Dd: 100, eps: 0, Ks: 0, Kd: 0, Patm_kPa: 101.325, Pvap_kPa: 2.34 };
check("staticLift", PM.staticLift(sysT), 8);
check("pressureHead 100kPa", PM.pressureHead(sysT), 100000 / (1000 * g));
check("systemHead(0)", PM.systemHead(0, sysT), 8 + 100000 / (1000 * g));
check("NPSHa zero-flow", PM.npshAvailable(0, sysT), 101325 / (1000 * g) + 2 - 2340 / (1000 * g));

// ============ 3. WATER PROPERTIES vs published data ============
// Density: Kell(1975)/IAPWS. Viscosity: IAPWS. Vapor pressure: steam tables.
check("water rho 20C", PM.waterDensity(20), 998.207, 5e-5);
check("water rho 4C (max)", PM.waterDensity(4), 999.972, 5e-5);
check("water rho 50C", PM.waterDensity(50), 988.04, 1e-4);
check("water mu 20C", PM.waterViscosity(20), 1.0016, 5e-3);
check("water mu 50C", PM.waterViscosity(50), 0.5474, 1.5e-2);
check("water mu 80C", PM.waterViscosity(80), 0.3550, 2e-2);
check("water Pv 20C", PM.waterVapor(20), 2.339, 5e-3);
check("water Pv 50C", PM.waterVapor(50), 12.352, 5e-3);
check("water Pv 100C", PM.waterVapor(100), 101.325, 5e-3);

// ============ 4. PUMP CURVE MODEL identities ============
const pump = { Qb: 120, Hb: 32, etaMax: 0.78, NPSHr_bep: 3.2, N0: 2950, D0: 260, N: 2950, D: 260, useCatalog: false };
check("H(0) = 1.25 Hb", PM.pumpH(0, pump), 1.25 * 32);
check("H(Qb) = Hb", PM.pumpH(120, pump), 32);
check("eta(Qb) = etaMax", PM.pumpEta(120, pump), 0.78);
check("NPSHr(Qb) = NPSHr_bep", PM.pumpNPSHr(120, pump), 3.2);
check("NPSHr(0) = 0.55 NPSHr_bep", PM.pumpNPSHr(0, pump), 0.55 * 3.2);

// Catalog interpolation: exact linear interp between (120,32),(200,17)
const catPump = { ...pump, useCatalog: true, catalog: [ { q: 0, h: 40 }, { q: 120, h: 32 }, { q: 200, h: 17 } ] };
check("catalog interp H(150)", PM.pumpH(150, catPump), 32 + (150 - 120) / (200 - 120) * (17 - 32));
check("catalog extrap H(240) via last slope", PM.pumpH(240, catPump), Math.max(0, 17 + (17 - 32) / 80 * 40));

// ============ 5. AFFINITY LAWS ============
const half = { ...pump, N: 1475 };
check("Q_bep scales as N", PM.bepFlow(half), 60);
check("H at scaled BEP scales as N^2", PM.pumpH(60, half), 32 * 0.25);
check("NPSHr scales as N^2", PM.pumpNPSHr(60, half), 3.2 * 0.25);
const trim = { ...pump, D: 234 }; // sD = 0.9
check("Q_bep scales as D", PM.bepFlow(trim), 120 * 0.9);
check("H scales as D^2", PM.pumpH(120 * 0.9, trim), 32 * 0.81);
check("shutoff scales as (ND)^2", PM.pumpH(0, { ...pump, N: 2950 * 1.1 }), 40 * 1.21);

// ============ 6. POWER & SPECIFIC SPEED (hand calcs) ============
check("hydraulic power", PM.hydraulicPower(120, 32, 998), 998 * g * (120 / 3600) * 32 / 1000);
check("brake power", PM.brakePower(120, 32, 998, 0.78), 998 * g * (120 / 3600) * 32 / 1000 / 0.78);
check("Ns metric", PM.specificSpeed(2950, 120, 32), 2950 * Math.sqrt(120 / 3600) / 32 ** 0.75);
// Metric->US suction-specific-speed conversion: US = rpm sqrt(gpm)/ft^0.75
const GPM_PER_M3S = 1000 / GAL_L * 60;
const usFactor = Math.sqrt(GPM_PER_M3S) / (1 / FT_M) ** 0.75;
check("Nss threshold 213 metric ~= 11000 US", 213 * usFactor, 11000, 3e-3);

// ============ 7. VISCOSITY CORRECTION calibration points ============
// Basis pump 120x32 (= sizeRef), Ns=40 (nsFactor=1), at BEP (flowRatio=1).
check("Ceta @40cP", PM.viscosityCorrection(120, 32, 40, 40, 1).Ceta, 1.32 - 0.13 * Math.log(40), 1e-9);
check("Ceta @150cP", PM.viscosityCorrection(120, 32, 150, 40, 1).Ceta, 1.32 - 0.13 * Math.log(150), 1e-9);
check("Ceta @1000cP", PM.viscosityCorrection(120, 32, 1000, 40, 1).Ceta, 1.32 - 0.13 * Math.log(1000), 1e-9);
check("mu<10 => no correction", PM.viscosityCorrection(120, 32, 5, 40, 1).Ceta, 1);
const vc = PM.viscosityCorrection(120, 32, 150, 40, 1);
check("CH = 1-0.30(1-Ceta) at BEP", vc.CH, 1 - (1 - vc.Ceta) * 0.30, 1e-9);
check("CQ = 1-0.25(1-Ceta) at BEP", vc.CQ, 1 - (1 - vc.Ceta) * 0.25, 1e-9);
check("CNPSH = 1+0.28(1-Ceta) at BEP", vc.CNPSH, 1 + (1 - vc.Ceta) * 0.28, 1e-9);

// ============ 8. PARALLEL / SERIES ============
const par = { ...pump, arrangement: "parallel", nPumps: 3 };
const ser = { ...pump, arrangement: "series", nPumps: 2 };
check("parallel: H(3Q) = H1(Q)", PM.combinedH(360, par), PM.pumpH(120, pump));
check("parallel BEP = 3x", PM.combinedBEPflow(par), 360);
check("series: H = 2 H1", PM.combinedH(120, ser), 2 * PM.pumpH(120, pump));
check("series per-pump Q = total", PM.perPumpQ(120, ser), 120);

// ============ 9. DUTY SOLUTION consistency ============
const baseState = {
  fluid: { key: "Water", tempC: 20 },
  sys: { rho: 998, mu: 1.0, Pvap_kPa: 2.34, Patm_kPa: 101.3, Zs: 1.5, Zd: 19.5, Ps_kPa: 0, Pd_kPa: 0,
    Ds: 154.1, Ls: 8, Dd: 128.2, Ld: 85, eps: 0.046, fitS: [], fitD: [] },
  pump: { ...pump, npshRatio: 1.3, minFlowPct: 45, arrangement: "single", nPumps: 1 },
  design: { requiredQ: 110, headMode: "system", flowMargin: 10, headMargin: 0 }, econ: { hours: 8000, price: 0.12 },
  unitSystem: "SI", op: { Q: 110 },
};
const d = computeDuty(baseState);
check("duty residual |Hpump-Hsys|", Math.abs(PM.combinedH(d.dutyQ, d.effPump) - PM.systemHead(d.dutyQ, d.sysEff)), 0, 1e-3);
check("TDH equals delivered head at duty", d.TDH, d.opH, 1e-3);
check("Pmotor = Pbrake/motorEff", d.Pmotor, d.Pbrake / d.motorEff, 1e-12);
check("energy: kWh/yr = input*hours", d.en.kWhPerYear, d.en.input_kW * 8000, 1e-12);
check("specific energy = input/Q", d.en.specific_kWh_m3, d.en.input_kW / d.dutyQ, 1e-12);
check("rated Q = required Q*1.10", d.ratedQ, 110 * 1.10, 1e-12);
check("single operating-pump count", d.nSet, 1, 1e-12);
check("single total shaft = per-pump shaft", d.Pbrake, d.PbrakePer, 1e-12);
const eqSys = { ...baseState.sys, equipment: [{ type: "fixed_dp", side: "discharge", qRef: 100, dpClean_kPa: 10, dpDirty_kPa: 20 }] };
check("equipment 10 kPa to head", PM.equipmentHead(100, eqSys, "discharge", "clean"), 10000 / (eqSys.rho * g), 1e-12);
check("VFD: H(Qsel, Nsolved) = Hsys(Qsel)",
  PM.combinedH(d.selectedQ, { ...d.effPump, N: d.speedForDuty }), d.selectedHsys, 1e-3);

// ============ 10. MOTOR SELECTION & EFFICIENCY ============
check("12 kW brake -> 15 kW IEC (13.8 needed)", PM.motorSelection(12).selected_kW, 15);
check("40 kW brake -> 55 kW IEC (46 needed)", PM.motorSelection(40).selected_kW, 55);
check("required_hp consistent", PM.motorSelection(12).required_hp, 12 * 1.15 * 1000 / HP_W, 1e-6);
check("motor eff interp @15kW", PM.motorEfficiency(15), 0.91 + (15 - 11) / (22 - 11) * (0.925 - 0.91), 1e-9);

// ============ 11. PIPE SCHEDULE vs ASME B36.10 published data ============
check("DN150 Sch40 ID", PM.pipeID(150, 40), 168.3 - 2 * 7.11, 1e-3);
check("DN100 Sch40 ID", PM.pipeID(100, 40), 114.3 - 2 * 6.02, 1e-3);
check("DN50 Sch80 ID", PM.pipeID(50, 80), 60.3 - 2 * 5.54, 1e-3);
check("DN300 Sch40 ID", PM.pipeID(300, 40), 323.9 - 2 * 10.31, 1e-3);

// ============ 12. ISO 9906:2012 acceptance grades ============
check("ISO 1B dQ", PM.TOLERANCES["ISO 1B"].dQ, 4.5);
check("ISO 1B dH", PM.TOLERANCES["ISO 1B"].dH, 3.0);
check("ISO 2B dQ", PM.TOLERANCES["ISO 2B"].dQ, 8.0);
check("ISO 2B dH", PM.TOLERANCES["ISO 2B"].dH, 5.0);
check("ISO 3B dQ", PM.TOLERANCES["ISO 3B"].dQ, 9.0);
check("ISO 3B dH", PM.TOLERANCES["ISO 3B"].dH, 7.0);

if (fail) {
  console.error(`verify-formulas: ${fail} of ${pass + fail} checks FAILED`);
  process.exit(1);
}
console.log(`verify-formulas: all ${pass} first-principles checks passed`);
