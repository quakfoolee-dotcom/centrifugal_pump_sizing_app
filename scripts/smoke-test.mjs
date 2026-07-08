import { readFileSync } from "node:fs";
import vm from "node:vm";

const sandbox = { window: {} };
vm.createContext(sandbox);

for (const file of ["lib/pumpMath.js", "lib/duty.js"]) {
  vm.runInContext(readFileSync(file, "utf8"), sandbox, { filename: file });
}

const { PumpMath: PM, computeDuty } = sandbox.window;

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

assert(PM.pipeID(150, 40) === 154.1, "DN150 Sch 40 ID should match the pipe table");
assert(PM.nearestPipe(154.1).dn === 150, "nearest pipe lookup should round-trip DN150 Sch 40");

console.log("smoke-test: duty solve, parallel case, and pipe helpers passed");
