import { readFileSync } from "node:fs";
import vm from "node:vm";

const sandbox = { window: {} };
vm.createContext(sandbox);

for (const file of ["lib/pumpMath.js", "lib/units.js", "lib/duty.js"]) {
  vm.runInContext(readFileSync(file, "utf8"), sandbox, { filename: file });
}

const { PumpMath: PM, computeDuty, makeUnits } = sandbox.window;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNear(actual, expected, tolerance, message) {
  const err = Math.abs(actual - expected);
  if (err > tolerance) {
    throw new Error(`${message}: expected ${expected}, got ${actual} (error ${err})`);
  }
}

const baseState = {
  fluid: { key: "Water", tempC: 20 },
  sys: {
    rho: 998, mu: 1.0, Pvap_kPa: 2.34, Patm_kPa: 101.3,
    Zs: 1.5, Zd: 19.5, Ps_kPa: 0, Pd_kPa: 0,
    Ds: 154.1, Ls: 8,
    Dd: 128.2, Ld: 85,
    eps: 0.046,
    fitS: [
      { type: "entrance_sharp", qty: 1 },
      { type: "elbow90_lr", qty: 2 },
      { type: "gate", qty: 1 },
      { type: "foot", qty: 1 },
    ],
    fitD: [
      { type: "check_swing", qty: 1 },
      { type: "gate", qty: 1 },
      { type: "elbow90_lr", qty: 4 },
      { type: "exit", qty: 1 },
    ],
  },
  pump: {
    Qb: 120, Hb: 32, etaMax: 0.78, NPSHr_bep: 3.2,
    N0: 2950, D0: 260,
    N: 2950, D: 260,
    useCatalog: false,
    catalog: [
      { q: 0, h: 40, eta: 0, npshr: 2.2 },
      { q: 60, h: 38, eta: 0.62, npshr: 2.4 },
      { q: 120, h: 32, eta: 0.78, npshr: 3.2 },
      { q: 160, h: 26, eta: 0.74, npshr: 4.6 },
      { q: 200, h: 17, eta: 0.60, npshr: 7.0 },
    ],
    npshRatio: 1.3,
    minFlowPct: 45,
    arrangement: "single",
    nPumps: 2,
    showSpeedFamily: false,
  },
  design: { flowMargin: 10, headMargin: 0 },
  econ: { hours: 8000, price: 0.12 },
  unitSystem: "SI",
  op: { Q: 110 },
};

const US = makeUnits("US");
assertNear(US.conv("flow", 1), 4.402868, 1e-6, "m3/h to gpm conversion");
assertNear(US.toSI("flow", 4.402868), 1, 1e-6, "gpm to m3/h conversion");
assertNear(US.conv("temp", 20), 68, 1e-9, "C to F conversion");
assertNear(US.toSI("temp", 68), 20, 1e-9, "F to C conversion");
assertNear(US.conv("specE", 1), 3.785412, 1e-6, "kWh/m3 to kWh/kgal conversion");

const velocity = PM.velocity(36, 100);
assertNear(velocity, 1.2732395447, 1e-9, "pipe velocity");
assertNear(PM.reynolds(velocity, 100, 1000, 1), 127323.95447, 1e-4, "Reynolds number");
assertNear(PM.frictionFactor(1000, 0.046, 100), 0.064, 1e-12, "laminar friction factor");
assertNear(PM.frictionFactor(0.5, 0.046, 100), 128, 1e-12, "creeping-flow laminar friction factor");
assertNear(PM.hydraulicPower(36, 10, 1000), 0.980665, 1e-6, "hydraulic power");
assertNear(PM.brakePower(36, 10, 1000, 0.7), 1.40095, 1e-5, "brake power");

const staticPressureSystem = {
  rho: 1000, mu: 1, Pvap_kPa: 2.34, Patm_kPa: 101.325,
  Zs: 2, Zd: 10, Ps_kPa: 0, Pd_kPa: 100,
  Ls: 0, Ld: 0, Ds: 100, Dd: 100, eps: 0, Ks: 0, Kd: 0,
};
assertNear(PM.staticLift(staticPressureSystem), 8, 1e-12, "static lift");
assertNear(PM.pressureHead(staticPressureSystem), 10.197162, 1e-6, "vessel pressure head");
assertNear(PM.systemHead(0, staticPressureSystem), 18.197162, 1e-6, "zero-flow system head");
assertNear(PM.npshAvailable(0, staticPressureSystem), 12.093660934, 1e-6, "zero-flow NPSHa");

const referencePump = baseState.pump;
assertNear(PM.pumpH(0, referencePump), 40, 1e-12, "parametric shutoff head");
assertNear(PM.pumpH(120, referencePump), 32, 1e-12, "parametric BEP head");
assertNear(PM.pumpEta(120, referencePump), 0.78, 1e-12, "parametric BEP efficiency");
assertNear(PM.pumpNPSHr(120, referencePump), 3.2, 1e-12, "parametric BEP NPSHr");

const halfSpeedPump = { ...referencePump, N: referencePump.N0 / 2 };
assertNear(PM.bepFlow(halfSpeedPump), 60, 1e-12, "speed affinity flow scaling");
assertNear(PM.pumpH(60, halfSpeedPump), 8, 1e-12, "speed affinity head scaling");

const viscousPump = PM.withViscosity(referencePump, 150);
assertNear(PM.bepFlow(viscousPump), PM.bepFlow(referencePump) * viscousPump._corr.CQ, 1e-12, "viscous BEP flow correction");
assertNear(PM.pumpEta(PM.bepFlow(viscousPump), viscousPump), referencePump.etaMax * viscousPump._corr.Ceta, 1e-12, "viscous BEP efficiency correction");

const parallelPump = { ...referencePump, arrangement: "parallel", nPumps: 2 };
const seriesPump = { ...referencePump, arrangement: "series", nPumps: 2 };
assertNear(PM.combinedH(240, parallelPump), PM.pumpH(120, referencePump), 1e-12, "parallel head at shared flow");
assertNear(PM.perPumpQ(240, parallelPump), 120, 1e-12, "parallel per-pump flow");
assertNear(PM.combinedH(120, seriesPump), PM.pumpH(120, referencePump) * 2, 1e-12, "series head addition");

const catalogPump = {
  ...referencePump,
  useCatalog: true,
  catalog: [
    { q: 0, h: 40, eta: 0, npshr: 2.0 },
    { q: 100, h: 30, eta: 0.75, npshr: 3.0 },
    { q: 200, h: 10, eta: 0.6, npshr: 5.5 },
  ],
};
assertNear(PM.pumpH(0, catalogPump), 40, 1e-9, "catalog shutoff point participates in head fit");
assert(Number.isFinite(PM.pumpH(0, { ...referencePump, useCatalog: true, catalog: [{ q: 0, h: 40 }, { q: 0, h: 41 }] })), "insufficient catalog data should fall back safely");

const duty = computeDuty(baseState);
assert(duty.dutyQ > 0, "default duty flow should solve");
assert(duty.Qmax > duty.dutyQ, "plot range should cover the duty point");
assertNear(duty.opH, duty.TDH, 0.05, "default pump head should match system TDH at duty");
assert(Number.isFinite(duty.Pbrake) && duty.Pbrake > 0, "brake power should be finite and positive");
assert(Number.isFinite(duty.Ns) && duty.Ns > 0, "specific speed should be finite and positive");

const parallelState = {
  ...baseState,
  pump: { ...baseState.pump, arrangement: "parallel", nPumps: 3 },
  op: { Q: 260 },
};
const parallelDuty = computeDuty(parallelState);
assert(parallelDuty.dutyQ > duty.dutyQ, "parallel pumps should increase solved flow for the same system");
assert(parallelDuty.perQ < parallelDuty.dutyQ, "parallel per-pump flow should be below total flow");
assert(parallelDuty.Qmax >= parallelDuty.dutyQ, "parallel plot range should cover duty flow");
assertNear(parallelDuty.opH, parallelDuty.TDH, 0.05, "parallel pump head should match system TDH at duty");

const seriesDuty = computeDuty({ ...baseState, pump: { ...baseState.pump, arrangement: "series", nPumps: 2 } });
assert(seriesDuty.dutyQ > duty.dutyQ, "series pumps should increase solved flow for the same system");
assertNear(seriesDuty.opH, seriesDuty.TDH, 0.05, "series pump head should match system TDH at duty");

assert(PM.pipeID(150, 40) === 154.1, "DN150 Sch 40 ID should match the pipe table");
assert(PM.nearestPipe(154.1).dn === 150, "nearest pipe lookup should round-trip DN150 Sch 40");

console.log("smoke-test: duty solve, parallel case, and pipe helpers passed");
