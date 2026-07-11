import { readFileSync } from "node:fs";
import vm from "node:vm";

const sandbox = { window: {} };
vm.createContext(sandbox);

for (const file of ["lib/pumpMath.js", "lib/units.js", "lib/caseLibrary.js", "lib/duty.js"]) {
  vm.runInContext(readFileSync(file, "utf8"), sandbox, { filename: file });
}

const { PumpMath: PM, PumpCases, computeDuty, makeUnits } = sandbox.window;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNear(actual, expected, tolerance, message) {
  const err = Math.abs(actual - expected);
  if (err > tolerance) {
    throw new Error(`${message}: expected ${expected}, got ${actual} (error ${err})`);
  }
}

function assertThrows(fn, pattern, message) {
  try {
    fn();
  } catch (err) {
    if (!pattern.test(err.message)) {
      throw new Error(`${message}: wrong error "${err.message}"`);
    }
    return;
  }
  throw new Error(`${message}: expected an error`);
}

const baseState = {
  fluid: { key: "Water", tempC: 20 },
  sys: {
    rho: 998, mu: 1.0, Pvap_kPa: 2.34, Patm_kPa: 101.3,
    Zs: 1.5, Zd: 19.5, Ps_kPa: 0, Pd_kPa: 0,
    Ds: 154.1, Ls: 8,
    Dd: 128.2, Ld: 85,
    eps: 0.046, epsS: 0.046, epsD: 0.046, equipment: [], equipmentCondition: "clean",
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
    porMinPct: 70, porMaxPct: 120, aorMinPct: 50, aorMaxPct: 130,
    installedPumps: 2, motorMarginPct: 15,
    arrangement: "single",
    nPumps: 2,
    showSpeedFamily: false,
  },
  design: { requiredQ: 110, headMode: "system", flowMargin: 10, headMargin: 0 },
  scenario: { ZsMin: 0.5, ZsMax: 2.5, ZdMin: 18.5, ZdMax: 20.5, PatmMin_kPa: 95, PvapMax_kPa: 7.38, rhoMax: 1000 },
  econ: { hours: 8000, price: 0.12 },
  unitSystem: "SI",
  op: { Q: 110 },
};

assert(PumpCases.APP_VERSION === "0.11.0", "app version helper should match this release");
const editedState = {
  ...baseState,
  meta: { ...baseState.meta, tag: "LIVE-EDIT", docNo: "" },
  op: { Q: 123 },
};
const caseExport = PumpCases.buildCaseExport(editedState, "Saved Name", "2026-07-08T00:00:00.000Z");
assert(caseExport.filename === "Saved_Name.pumpcase.json", "current case export should use case name for filename");
assert(caseExport.payload.state.meta.tag === "LIVE-EDIT", "current case export should serialize live state");
assert(caseExport.payload.state.op.Q === 123, "current case export should not use stale saved state");
const caseHash = PumpCases.buildCaseLinkHash(editedState, "Shared Pump", "2026-07-08T00:00:00.000Z");
assert(caseHash.startsWith("#case="), "shareable case hash should use the case prefix");
const linkedCase = PumpCases.parseCaseLinkHash(caseHash, baseState);
assert(linkedCase.name === "Shared Pump", "shareable case hash should preserve the case name");
assert(linkedCase.state.meta.tag === "LIVE-EDIT" && linkedCase.state.op.Q === 123, "shareable case hash should round-trip state");
assert(PumpCases.parseCaseLinkHash("#view=calc", baseState) === null, "non-case hashes should be ignored");
assertThrows(
  () => PumpCases.parseCaseLinkHash("#case=%7B%7D", baseState),
  /pump and sys objects/,
  "invalid shared case hash should be rejected"
);
const singleImport = PumpCases.parseCaseImport(
  { schema: PumpCases.CASE_SCHEMA, name: "Imported One", state: editedState },
  "case.json",
  {},
  baseState
);
assert(singleImport.kind === "case" && singleImport.activeState, "single-case import should load the imported case");
assert(singleImport.activeState.meta.tag === "LIVE-EDIT", "single-case import should preserve imported metadata");
const libraryImport = PumpCases.parseCaseImport(
  { schema: PumpCases.CASE_LIBRARY_SCHEMA, cases: { "Library One": editedState } },
  "library.json",
  {},
  baseState
);
assert(libraryImport.kind === "library" && !libraryImport.activeState, "library import should not replace active state");
assert(libraryImport.cases["Library One"].meta.tag === "LIVE-EDIT", "library import should add valid cases");
const stateNamedLibrary = PumpCases.parseCaseImport(
  { state: editedState, Other: { ...editedState, meta: { ...editedState.meta, tag: "OTHER" } } },
  "state-library.json",
  {},
  baseState
);
assert(stateNamedLibrary.kind === "library", "case library with a case named state and siblings should import as a library");
assert(stateNamedLibrary.cases.state && stateNamedLibrary.cases.Other, "state-named library should preserve sibling cases");
assertThrows(
  () => PumpCases.parseCaseImport({ foo: { bar: 1 } }, "bad.json", {}, baseState),
  /pump and sys objects/,
  "invalid case library should be rejected"
);

const appHtml = readFileSync("Pump_Calculator.html", "utf8");
assert(appHtml.includes("lib/caseLibrary.js"), "main app should load case library helper");
assert(appHtml.includes("v{APP_VERSION}"), "topbar should use shared app version");
assert(appHtml.includes("onClick={printReport}"), "print button should route through report print handler");
assert(appHtml.includes("window.setTimeout(() => window.print(), 0)"), "print handler should not depend on a second animation frame");
assert(appHtml.includes("Print Report / PDF"), "print button label should make report-only output explicit");
assert(!appHtml.includes("meta?.docNo || \"CAL-HYD-0142\""), "status bar should not fall back to demo doc number");
assert(appHtml.includes("protectCurrentWork"), "case loads/imports should guard unsaved active work");
assert(appHtml.includes("Before ${action}"), "dirty load/import guard should create before-action snapshots");
assert(appHtml.includes("pumpcalc:baseline"), "dirty-load protection should persist the last clean baseline across refresh");
assert(appHtml.includes("buildNewCaseState") && appHtml.includes("Started new case"), "app shell should provide a protected new-case flow");
assert(appHtml.includes("Before ${action}") && appHtml.includes("new case"), "new-case flow should use the snapshot guard");
assert(appHtml.includes("case-manager-panel") && appHtml.includes("renameSelectedCase") && appHtml.includes("duplicateSelectedCase"), "app shell should provide case-manager rename and duplicate workflows");
assert(appHtml.includes("copyShareLink") && appHtml.includes("parseCaseLinkHash") && appHtml.includes("buildCaseLinkHash"), "app shell should provide shareable case links");
assert(appHtml.includes('role="tablist"') && appHtml.includes('role="tab"') && appHtml.includes("aria-selected"), "main views should use accessible tab semantics");
assert(appHtml.includes("onTabKeyDown") && appHtml.includes("ArrowRight") && appHtml.includes("aria-controls={tab.panelId}"), "main tabs should support keyboard navigation");
assert(appHtml.includes("buildPrintTitle") && appHtml.includes("document.title = nextTitle") && appHtml.includes("afterprint"), "report print should set a project-specific PDF title and restore it after print");
assert(appHtml.includes("caseManagerPanelRef") && appHtml.includes('event.key === "Escape"'), "case manager should support focus management and Escape close");
const appCss = readFileSync("styles.css", "utf8");
assert(appCss.includes("@media print"), "print stylesheet should be present");
assert(appCss.includes(".view[data-screen-label=\"02 Report\"]"), "print stylesheet should force the report view");
assert(appCss.includes(".flag-panel") && appCss.includes(".assumption-flags"), "calculator should style tiered calculation flags");
assert(appCss.includes("grid-template-columns: 340px minmax(0, 1fr) 300px"), "desktop layout should give the input panel enough width");
assert(appCss.includes("grid-template-columns: 300px minmax(0, 1fr) 260px"), "compact layout should keep a wider input panel");
assert(appCss.includes("overflow-x: hidden") && appCss.includes(".field > * { min-width: 0; }"), "panel form rows should shrink without horizontal scrollbars");
assert(/\.btn\s*\{\s*all: unset;\s*box-sizing: border-box;/m.test(appCss), "unset full-width buttons should preserve border-box sizing");
assert(appCss.includes(".case-manager-backdrop") && appCss.includes(".case-manager-row.active"), "case-manager layout should be styled");
assert(appCss.includes(".tab:focus-visible") && appCss.includes(".cat-del:focus-visible"), "keyboard focus should be visible on tabs and icon buttons");
const standaloneHtml = readFileSync("Pump_Calculator_standalone.html", "utf8");
const standaloneHeaderCount = (standaloneHtml.match(/Centrifugal Pump Calculator/g) || []).length;
assert(standaloneHeaderCount <= 1, "standalone build should not accumulate duplicate app CSS header comments");
const chartJsx = readFileSync("components/PumpChart.jsx", "utf8");
assert(chartJsx.includes("npshTicks") && chartJsx.includes("U.fmt(\"head\", n, 0)"), "chart should render an explicit NPSH tick scale");
assert(chartJsx.includes("TARGET Q") && chartJsx.includes("SOLVED DUTY"), "chart should distinguish target flow from solved duty");
assert(chartJsx.includes("onPointerDown") && chartJsx.includes("setPointerCapture"), "chart dragging should use pointer events");
assert(!chartJsx.includes("onMouseDown={onDown}") && !chartJsx.includes("mousemove"), "chart should not depend on mouse-only drag listeners");
assert(chartJsx.includes("hover-readout") && chartJsx.includes("CURVE READOUT"), "chart should provide a passive hover curve readout");
const calculatorJsx = readFileSync("components/Calculator.jsx", "utf8");
assert(calculatorJsx.includes("parseFieldDisplay") && calculatorJsx.includes("inputMode=\"decimal\""), "numeric fields should keep focused draft text and parse decimal input on commit");
assert(calculatorJsx.includes("criticalFlags") && calculatorJsx.includes("cautionFlags") && calculatorJsx.includes("assumptionFlags"), "calculator should classify calculation flags by severity");
assert(calculatorJsx.includes("data-flag-tier=\"critical\"") && calculatorJsx.includes("data-flag-tier=\"assumption\""), "calculator should render severity-tiered flag groups");
assert(calculatorJsx.includes("Remove fitting row") && calculatorJsx.includes("Remove catalog point"), "icon-only calculator delete buttons should have accessible labels");
assert(calculatorJsx.includes('Q {U.unit("flow")}') && calculatorJsx.includes('η %'), "catalog editor should follow active units and display efficiency as percent");
assert(calculatorJsx.includes("Installed pumps") && calculatorJsx.includes("Operating pumps"), "calculator should distinguish installed and operating pump counts");
assert(calculatorJsx.includes("EquipmentTable") && calculatorJsx.includes("Valve Kv/Cv"), "calculator should support equipment and control-valve losses");
assert(calculatorJsx.includes("Worst-case rated NPSH") && calculatorJsx.includes("Operating scenarios"), "calculator should expose worst-case scenario checks");
assert(calculatorJsx.includes("Required duty") && calculatorJsx.includes("independent target"), "calculator should separate required duty from predicted operation");
const compareJsx = readFileSync("components/Compare.jsx", "utf8");
assert(compareJsx.includes("Remove comparison slot"), "icon-only compare delete button should have an accessible label");

const US = makeUnits("US");
assertNear(US.conv("flow", 1), 4.402868, 1e-6, "m3/h to gpm conversion");
assertNear(US.toSI("flow", 4.402868), 1, 1e-6, "gpm to m3/h conversion");
assertNear(US.conv("temp", 20), 68, 1e-9, "C to F conversion");
assertNear(US.toSI("temp", 68), 20, 1e-9, "F to C conversion");
assertNear(US.conv("specE", 1), 3.785412, 1e-6, "kWh/m3 to kWh/kgal conversion");

const velocity = PM.velocity(36, 100);
assertNear(velocity, 1.2732395447, 1e-9, "pipe velocity");
assertNear(PM.reynolds(velocity, 100, 1000, 1), 127323.95447, 1e-4, "Reynolds number");
assertNear(PM.frictionFactor(1000, 0.046, 100), 0.064, 1e-4, "laminar friction factor");
assertNear(PM.frictionFactor(0.5, 0.046, 100), 128, 1e-4, "creeping-flow laminar friction factor");
assert(PM.frictionFactor(3000, 0.046, 100) > 0, "transitional friction factor should be finite and positive");
assert(PM.flowRegime(1000) === "laminar", "Re 1000 should be laminar");
assert(PM.flowRegime(3000) === "transitional", "Re 3000 should be transitional");
assert(PM.flowRegime(5000) === "turbulent", "Re 5000 should be turbulent");
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
assert(!PM.affinityStatus(referencePump).outOfBounds, "default pump should be inside affinity bounds");
assert(PM.affinityStatus({ ...referencePump, N: 500, D: 120 }).outOfBounds, "large speed/diameter excursions should exceed affinity bounds");

const halfSpeedPump = { ...referencePump, N: referencePump.N0 / 2 };
assertNear(PM.bepFlow(halfSpeedPump), 60, 1e-12, "speed affinity flow scaling");
assertNear(PM.pumpH(60, halfSpeedPump), 8, 1e-12, "speed affinity head scaling");

const viscousPump = PM.withViscosity(referencePump, 150);
assertNear(PM.bepFlow(viscousPump), PM.bepFlow(referencePump) * viscousPump._corr.CQ, 1e-12, "viscous BEP flow correction");
assertNear(PM.pumpEta(PM.bepFlow(viscousPump), viscousPump), referencePump.etaMax * viscousPump._corr.Ceta, 1e-12, "viscous BEP efficiency correction");
assert(PM.pumpNPSHr(PM.bepFlow(viscousPump), viscousPump) > PM.pumpNPSHr(PM.bepFlow(referencePump), referencePump), "viscous NPSHr should be conservatively increased");
const viscBep = PM.viscosityCorrection(120, 32, 150, 40, 1);
const viscHighFlow = PM.viscosityCorrection(120, 32, 150, 40, 1.6);
const viscHighNs = PM.viscosityCorrection(120, 32, 150, 80, 1);
assert(viscHighFlow.CH < viscBep.CH, "viscous head correction should vary with flow ratio");
assert(viscHighFlow.CNPSH > viscBep.CNPSH, "viscous NPSHr multiplier should increase away from BEP/high flow");
assert(viscHighNs.Ceta < viscBep.Ceta, "viscosity correction should respond to pump specific speed");
const acidProps = PM.deriveProps({ rho: 1840, mu: 26, Pvap_kPa: 0.001, Tref: 25, cat: "mineral_acid" }, 35);
const organicAcidProps = PM.deriveProps({ rho: 1840, mu: 26, Pvap_kPa: 0.001, Tref: 25, cat: "organic" }, 35);
assert(acidProps.rho > organicAcidProps.rho, "mineral acid preset should use lower thermal expansion than organic fluids");
assert(Math.abs(acidProps.Pvap_kPa - organicAcidProps.Pvap_kPa) > 1e-6, "mineral acid preset should not use organic vapor-pressure scaling");

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
const headOnlyCatalogPump = {
  ...referencePump,
  useCatalog: true,
  catalog: [
    { q: 0, h: 40 },
    { q: 120, h: 32 },
    { q: 200, h: 17 },
  ],
};
const headOnlyAux = PM.catalogAuxStatus(headOnlyCatalogPump);
assert(headOnlyAux.hasCatalog && headOnlyAux.etaEstimated && headOnlyAux.npshrEstimated, "head-only catalog should flag estimated eta and NPSHr auxiliary curves");
const headOnlyDuty = computeDuty({ ...baseState, pump: headOnlyCatalogPump });
assert(headOnlyDuty.catalogEtaEstimated && headOnlyDuty.catalogNpshrEstimated, "computeDuty should expose estimated catalog eta/NPSHr flags");
const nonMonotoneCatalogPump = {
  ...referencePump,
  useCatalog: true,
  catalog: [
    { q: 0, h: 40, eta: 0 },
    { q: 100, h: 30, eta: 0.75 },
    { q: 200, h: 35, eta: 0.65 },
  ],
};
assert(PM.hasCatalogCurve(nonMonotoneCatalogPump), "valid catalog curve should be recognized");
assert(PM.catalogHeadStatus(nonMonotoneCatalogPump).flattened, "rising catalog head data should be flagged when flattened");
assert(PM.pumpH(200, nonMonotoneCatalogPump) <= PM.pumpH(100, nonMonotoneCatalogPump), "catalog head should be forced non-increasing with flow");
assert(PM.pumpH(400, nonMonotoneCatalogPump) <= PM.pumpH(200, nonMonotoneCatalogPump), "catalog high-flow extrapolation should not rise");
assert(PM.pumpEta(300, catalogPump) < PM.pumpEta(200, catalogPump), "catalog efficiency should extrapolate downward past the last point");
const risingEtaCatalogPump = {
  ...referencePump,
  useCatalog: true,
  catalog: [
    { q: 0, h: 40, eta: 0.40, npshr: 2.0 },
    { q: 100, h: 32, eta: 0.65, npshr: 3.0 },
    { q: 150, h: 25, eta: 0.78, npshr: 4.0 },
  ],
};
assertNear(PM.pumpEta(250, risingEtaCatalogPump), 0.78, 1e-12, "rising terminal catalog eta should not extrapolate optimistically above the last point");
const catalogRangeStatus = PM.catalogExtrapolationStatus(catalogPump, 250);
assert(catalogRangeStatus.above && catalogRangeStatus.outside, "flow above entered catalog range should be flagged");
const catalogExtrapDuty = computeDuty({
  ...baseState,
  sys: { ...baseState.sys, Zs: 0, Zd: 5, Ds: 250, Ls: 0, Dd: 250, Ld: 1, fitS: [], fitD: [] },
  pump: {
    ...referencePump,
    useCatalog: true,
    arrangement: "single",
    nPumps: 1,
    catalog: [
      { q: 0, h: 40, eta: 0, npshr: 2 },
      { q: 80, h: 34, eta: 0.78, npshr: 2.5 },
      { q: 120, h: 30, eta: 0.70, npshr: 3.0 },
    ],
  },
});
assert(catalogExtrapDuty.catalogExtrapolated && catalogExtrapDuty.catalogExtrap.above, "duty beyond entered catalog flow range should be returned as a calculation flag");
const catalogRatedSelectedDuty = computeDuty({
  ...baseState,
  design: { flowMargin: 40, headMargin: 0 },
  op: { Q: 240 },
  pump: {
    ...referencePump,
    useCatalog: true,
    arrangement: "single",
    nPumps: 1,
    catalog: [
      { q: 0, h: 40, eta: 0.40, npshr: 2.0 },
      { q: 120, h: 32, eta: 0.78, npshr: 3.2 },
      { q: 200, h: 17, eta: 0.60, npshr: 7.0 },
    ],
  },
});
assert(!catalogRatedSelectedDuty.catalogExtrapolated, "test fixture should keep solved duty inside entered catalog range");
assert(catalogRatedSelectedDuty.catalogRatedExtrapolated && catalogRatedSelectedDuty.catalogRatedExtrap.above, "rated point beyond catalog range should be flagged independently");
assert(catalogRatedSelectedDuty.catalogSelectedExtrapolated && catalogRatedSelectedDuty.catalogSelectedExtrap.above, "selected/VFD target beyond catalog range should be flagged independently");
assertNear(PM.motorSelection(12).selected_kW, 15, 1e-12, "motor selection should choose next IEC kW size");
assertNear(PM.motorSelection(12).selected_hp, 20, 1e-12, "motor selection should choose next NEMA hp size");
assertNear(PM.motorSelection(0).selected_kW, 0, 1e-12, "zero-duty motor selection should stay zero");
assert(PM.motorEfficiency(1.5) < PM.motorEfficiency(200), "motor efficiency should increase with motor size");

const duty = computeDuty(baseState);
assert(duty.dutyQ > 0, "default duty flow should solve");
assert(duty.hasDutyPoint && !duty.noDutyPoint, "default case should report a valid duty point");
assert(duty.Qmax > duty.dutyQ, "plot range should cover the duty point");
assertNear(duty.opH, duty.TDH, 0.05, "default pump head should match system TDH at duty");
assert(Number.isFinite(duty.Pbrake) && duty.Pbrake > 0, "brake power should be finite and positive");
assertNear(duty.Pbrake, duty.PbrakePer, 1e-12, "single arrangement must not multiply power by stored pump count");
assert(duty.nSet === 1 && duty.installedPumps === 2, "single duty/standby case should distinguish operating and installed pumps");
assert(Number.isFinite(duty.Ns) && duty.Ns > 0, "specific speed should be finite and positive");
assert(Math.abs(PM.combinedH(duty.selectedQ, duty.effPump) - duty.selectedHsys) > 0.5, "selected target flow should differ from current pump curve for VFD test fixture");
assert(duty.speedForDutyStatus === "solved", "default VFD target should solve within speed bounds");
assertNear(PM.combinedH(duty.selectedQ, { ...duty.effPump, N: duty.speedForDuty }), duty.selectedHsys, 0.05, "VFD speed should solve at selected target flow");
assert(duty.curveEstimated, "parametric pump curve should be flagged as estimated");
assert(duty.minorLossesApprox, "default fitting K-values should be flagged as approximate");
assert(duty.motorBasisPer >= duty.PbrakePer && duty.motorBasisPer >= duty.maxBhpPer, "motor sizing basis should cover duty and AOR envelope power");
assert(duty.motor.selected_kW >= duty.motorBasisPer * 1.15, "selected IEC motor should cover maximum envelope power plus margin");
assertNear(duty.motorEff, PM.motorEfficiency(duty.motor.selected_kW), 1e-12, "duty motor efficiency should come from selected motor size");
assertNear(duty.npshMarginAbs, 0.6, 1e-12, "default absolute NPSH margin should be 0.6 m");

const strictNpshDuty = computeDuty({ ...baseState, pump: { ...baseState.pump, npshMarginAbs: 50 } });
assert(!strictNpshDuty.cavOk, "configurable absolute NPSH margin should affect cavitation status");
assert(strictNpshDuty.npshRatioOk && !strictNpshDuty.npshAbsOk, "ratio and absolute NPSH failures should be reported independently");

assertNear(duty.ratedQ, 121, 1e-12, "rated flow should derive from independent required duty, not predicted intersection");
const changedPumpDuty = computeDuty({ ...baseState, pump: { ...baseState.pump, Hb: 45 } });
assertNear(changedPumpDuty.ratedQ, duty.ratedQ, 1e-12, "changing the candidate pump must not change required rated flow");

const equipmentSystem = {
  ...baseState.sys, Ls: 0, Ld: 0, fitS: [], fitD: [], Ks: 0, Kd: 0,
  equipment: [{ type: "fixed_dp", side: "discharge", qRef: 100, dpClean_kPa: 10, dpDirty_kPa: 25 }],
};
assertNear(PM.equipmentHead(100, equipmentSystem, "discharge", "clean"), 10000 / (998 * PM.g), 1e-9, "clean equipment differential pressure should convert to head");
assert(PM.equipmentHead(100, equipmentSystem, "discharge", "dirty") > PM.equipmentHead(100, equipmentSystem, "discharge", "clean"), "dirty equipment loss should exceed clean loss");
const valveSystem = { ...equipmentSystem, equipment: [{ type: "control_kv", side: "discharge", kv: 100 }] };
assertNear(PM.equipmentHead(100, valveSystem, "discharge"), 1e5 / (1000 * PM.g), 1e-9, "Kv=Q should produce one bar water loss");
const branchValveSystem = { ...valveSystem, arrangement: "parallel", operatingPumps: 2, equipment: [{ type: "control_kv", side: "discharge", kv: 50, flowBasis: "per_pump" }] };
assertNear(PM.equipmentHead(100, branchValveSystem, "discharge"), 1e5 / (1000 * PM.g), 1e-9, "per-branch Kv should use per-pump parallel flow");

const invalidDuty = computeDuty({ ...baseState, sys: { ...baseState.sys, Ds: 0 } });
assert(!invalidDuty.inputValid && invalidDuty.validationErrors.some(x => x.includes("Suction inside diameter")), "invalid hydraulic inputs should block calculation with a specific error");
const invalidCatalogDuty = computeDuty({ ...baseState, pump: { ...baseState.pump, useCatalog: true, catalog: [{ q: 0, h: 40, eta: 0 }, { q: 100, h: 30, eta: 78 }] } });
assert(!invalidCatalogDuty.inputValid && invalidCatalogDuty.validationErrors.some(x => x.includes("efficiency")), "catalog efficiency entered outside 5-95% should be rejected");
assert(duty.scenarioResults.length === 3 && Number.isFinite(duty.worstNPSHa), "operating and worst-case NPSH scenarios should be evaluated");

const tooHighVfd = PM.speedForDutyResult(referencePump, 300, 200);
assert(tooHighVfd.status === "above-max", "unreachable high-head VFD target should report above max speed");
const minVfdResult = PM.minVfdSpeedResult(referencePump, staticPressureSystem);
assert(minVfdResult.status === "solved", "minimum VFD static-speed result should carry solved status");
assertNear(PM.minVfdSpeed(referencePump, staticPressureSystem), minVfdResult.speed, 1e-12, "minimum VFD numeric wrapper should match rich result speed");
const highStaticMinVfd = PM.minVfdSpeedResult(referencePump, { ...staticPressureSystem, Zd: 1000 });
assert(highStaticMinVfd.status === "above-max", "minimum VFD should report when static head cannot be reached within max speed");
const estimatedFluidDuty = computeDuty({ ...baseState, fluid: { key: "Ethylene glycol", tempC: 20 } });
assert(estimatedFluidDuty.fluidPropsEstimated, "non-water preset fluid properties should be flagged as estimated");

const noDuty = computeDuty({ ...baseState, pump: { ...baseState.pump, N: 600 } });
assert(noDuty.noDutyPoint && !noDuty.hasDutyPoint, "underspeed pump should report no positive-flow duty point");
assertNear(noDuty.dutyQ, 0, 1e-12, "no-duty case should not fall back to arbitrary selected flow");
assert(noDuty.opH < noDuty.TDH, "no-duty case should expose pump head below system head at zero flow");
assertNear(noDuty.Pbrake, 0, 1e-12, "no-duty case should not calculate positive brake power");
assertNear(noDuty.motor.selected_kW, 0, 1e-12, "no-duty case should not select a motor");

const parallelState = {
  ...baseState,
  pump: { ...baseState.pump, arrangement: "parallel", nPumps: 3, installedPumps: 3 },
  op: { Q: 260 },
};
const parallelDuty = computeDuty(parallelState);
assert(parallelDuty.dutyQ > duty.dutyQ, "parallel pumps should increase solved flow for the same system");
assert(parallelDuty.perQ < parallelDuty.dutyQ, "parallel per-pump flow should be below total flow");
assert(parallelDuty.Qmax >= parallelDuty.dutyQ, "parallel plot range should cover duty flow");
assertNear(parallelDuty.opH, parallelDuty.TDH, 0.05, "parallel pump head should match system TDH at duty");
assert(parallelDuty.stagingResults.length === 3 && parallelDuty.stagingResults.some(x => x.label === "One unavailable"), "parallel staging should include all-running and one-unavailable cases");
const imbalancedParallel = computeDuty({ ...parallelState, pump: { ...parallelState.pump, parallelImbalancePct: 10 } });
assert(imbalancedParallel.worstBranchQ > imbalancedParallel.perQ && imbalancedParallel.opNPSHr >= parallelDuty.opNPSHr, "parallel imbalance should increase worst-branch flow and NPSHr screening");

const seriesDuty = computeDuty({ ...baseState, pump: { ...baseState.pump, arrangement: "series", nPumps: 2 } });
assert(seriesDuty.dutyQ > duty.dutyQ, "series pumps should increase solved flow for the same system");
assertNear(seriesDuty.opH, seriesDuty.TDH, 0.05, "series pump head should match system TDH at duty");

assert(PM.pipeID(150, 40) === 154.1, "DN150 Sch 40 ID should match the pipe table");
assert(PM.nearestPipe(154.1).dn === 150, "nearest pipe lookup should round-trip DN150 Sch 40");

console.log("smoke-test: duty solve, parallel case, and pipe helpers passed");
