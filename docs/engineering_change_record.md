# Engineering Change Record

This document tracks calculation, UI, QC, and release changes for the
Centrifugal Pump Sizing App. Use it as the engineering audit trail alongside
`CHANGELOG.md`.

## How To Update

For each future change, add a new record with these sections:

- Objective
- Before Fix
- After Fix
- Files Changed
- QC Results
- Remaining Risk
- Release / Commit

## Current Open Engineering Items

These items were identified during engineering review and are not fully closed:

- Verify viscosity correction calibration against the actual HI 9.6.7 chart or newer equation method.
- Improve non-water fluid property handling and correct sulfuric acid categorization.
- Disclose idealized parallel and series pump assumptions in the report.

## Change Records

### 0.10.6 - Affinity, Viscous NPSH, NPSH Margin, and Motor Efficiency Controls

**Objective**

Close the next set of critical engineering QC items: prevent overconfident
affinity-law extrapolation, make viscous NPSHr conservative, improve the
screening viscosity model shape, make absolute NPSH margin configurable, and
replace fixed motor efficiency in energy calculations.

**Before Fix**

- Speed and impeller controls allowed large excursions from the reference pump
  while still presenting affinity-scaled results as normal.
- NPSHr was not increased for viscous service, making cavitation checks
  optimistic for viscous liquids.
- Viscosity correction used one flat CQ/CH/Ceta triplet across the whole curve.
- Viscosity correction did not respond to pump specific speed.
- NPSH absolute margin was hardcoded at 0.6 m.
- Motor efficiency was fixed at 93 percent for all selected motor sizes.

**After Fix**

- Added recommended affinity-law bounds: speed 70-115 percent of reference and
  impeller diameter 85-105 percent of reference. Calculator sliders now use
  those bounds, and out-of-range saved states are flagged.
- Added a conservative viscous NPSHr multiplier, displayed as CNPSH.
- Updated the screening viscosity model to vary with flow ratio and pump
  specific speed.
- Added user-configurable absolute NPSH margin.
- Added a size-based motor efficiency curve and used it for energy/cost results.
- Corrected the suction specific speed unit-conversion comment.

**Files Changed**

- `lib/pumpMath.js`
- `lib/duty.js`
- `components/Calculator.jsx`
- `components/Report.jsx`
- `components/Compare.jsx`
- `scripts/smoke-test.mjs`
- `Pump_Calculator.html`
- `Pump_Calculator_standalone.html`
- `CHANGELOG.md`
- `docs/engineering_change_record.md`

**QC Results**

- `npm run test` passed with added assertions for affinity bounds, viscous
  NPSHr increase, flow-ratio viscosity variation, specific-speed sensitivity,
  configurable NPSH margin, and motor-efficiency curve behavior.

**Remaining Risk**

The viscosity model remains a screening approximation until checked against the
actual HI 9.6.7 chart/equation method or vendor curves. Final selection should
still use vendor-certified pump curves for viscous or heavily trimmed duties.

**Release / Commit**

- Date: 2026-07-08

### 0.10.5 - Engineering QC Calculation Improvements

**Objective**

Improve calculation reliability and make screening-level assumptions visible in
the calculator, report, comparison view, and automated tests.

**Before Fix**

- Catalog pump curves used least-squares polynomial fitting, which could create
  nonphysical curve shapes from sparse or noisy catalog points.
- VFD target-speed calculation returned a clamped value without telling the user
  when the target was outside the permitted speed range.
- Transitional pipe flow was not clearly represented in the UI or QC outputs.
- Non-water fluid properties, generic fitting K-values, estimated pump curves,
  and high-viscosity cases were not prominent enough in the engineering output.
- Motor selection rounded brake power instead of choosing a standard motor size.

**After Fix**

- Catalog head curves use monotone interpolation through entered catalog points.
- VFD speed calculations return a status: solved, above-max, below-min, or invalid.
- Darcy-Weisbach friction now uses the Churchill correlation across laminar,
  transitional, and turbulent regimes.
- Calculator, report, and compare views show engineering flags for estimated
  curve data, estimated fluid properties, generic fitting K-values, transitional
  flow, and high-viscosity screening limits.
- Motor selection now chooses the next IEC/NEMA catalog size after service margin.

**Files Changed**

- `lib/pumpMath.js`
- `lib/duty.js`
- `components/Calculator.jsx`
- `components/Report.jsx`
- `components/Compare.jsx`
- `scripts/smoke-test.mjs`
- `styles.css`
- `Pump_Calculator_standalone.html`
- `CHANGELOG.md`

**QC Results**

- `npm run test` passed.
- `npm run build:standalone` passed.
- `git diff --check` passed with line-ending warnings only.

**Remaining Risk**

The app is still a screening tool for viscous, highly trimmed, highly speed-varied,
or final vendor-selection cases. The open engineering items above should be
resolved before treating those cases as final-selection-grade results.

**Release / Commit**

- Commit: `0a31a81`
- Branch: `main`
- Date: 2026-07-08

### 0.10.4 - VFD Target Flow and No-Duty Point Fixes

**Objective**

Fix two defects that could make the app display a valid-looking result when the
calculation was tautological or physically impossible.

**Before Fix**

- "Speed for this duty" solved against the already-solved pump/system
  intersection, so it often returned the current speed and made the set-speed
  action a no-op.
- When the pump and system curves did not intersect at positive flow, the app
  fell back to the selected exploratory flow and populated report values anyway.

**After Fix**

- VFD speed now solves against the selected target flow and target system head.
- No positive-flow pump/system intersection is reported as a no-duty-point state.
- Calculator, report, and compare views surface pump/system mismatch explicitly.

**Files Changed**

- `lib/duty.js`
- `components/Calculator.jsx`
- `components/Report.jsx`
- `components/Compare.jsx`
- `scripts/smoke-test.mjs`
- `Pump_Calculator_standalone.html`
- `CHANGELOG.md`

**QC Results**

- Smoke tests were expanded to cover VFD selected-flow solving and no-duty cases.
- Browser check confirmed default VFD target speed changed from the current speed.

**Remaining Risk**

VFD reachability limits are now explicit, but affinity-law validity bounds still
need engineering guardrails.

**Release / Commit**

- Included in local work before 0.10.5 and reflected in `CHANGELOG.md`.
- Date: 2026-07-08

### 0.10.3 - Mathematical QC Corrections

**Objective**

Correct foundational math behaviors found during QC review and expand automated
coverage for pump and system calculations.

**Before Fix**

- Valid zero-flow catalog shutoff points were not always included in the catalog
  curve model.
- Low-Reynolds-number friction handling needed correction.
- Viscous BEP flow and head reporting could be inconsistent.
- Automated QC coverage was too narrow for unit conversions, NPSHa, pressure
  head, affinity scaling, arrangements, power, and pipe helpers.

**After Fix**

- Zero-flow catalog points participate in pump head modeling.
- Laminar and low-Re friction behavior was corrected, then later superseded by
  the Churchill implementation in 0.10.5.
- Viscous BEP flow/head reporting was corrected.
- Smoke tests now cover a broader set of hydraulic calculations.

**Files Changed**

- `lib/pumpMath.js`
- `scripts/smoke-test.mjs`
- `Pump_Calculator_standalone.html`
- `CHANGELOG.md`

**QC Results**

- `npm run test` passed.
- `npm run build:standalone` passed.

**Remaining Risk**

The viscosity correction remains screening-level and should be checked against a
recognized HI method or vendor curves for viscous duties.

**Release / Commit**

- Commit: `2081c68`
- Branch: `main`
- Date: 2026-07-08

### 0.10.2 - Report Prepared-By Cleanup

**Objective**

Remove the default preparer name from reports.

**Before Fix**

- The report header could show `J. Rivera` in the prepared-by field.

**After Fix**

- The default prepared-by field is blank.
- Legacy autosave metadata matching the old default name is cleared.

**Files Changed**

- `Pump_Calculator.html`
- `components/Report.jsx`
- `Pump_Calculator_standalone.html`
- `CHANGELOG.md`

**QC Results**

- Visual/report metadata review confirmed the default name was removed.

**Remaining Risk**

User-entered custom metadata is still preserved.

**Release / Commit**

- Date: 2026-07-08

### 0.10.1 - URL Filename Normalization

**Objective**

Remove URL-encoded spaces from local and GitHub Pages app paths.

**Before Fix**

- The primary app filename used spaces, producing URLs such as
  `Pump%20Calculator.html`.

**After Fix**

- App files use underscore-based names.
- GitHub Pages redirect and local-run documentation point to the normalized URL.

**Files Changed**

- `Pump_Calculator.html`
- `Pump_Calculator_standalone.html`
- `index.html`
- `README.md`
- `scripts/build-standalone.mjs`
- `CHANGELOG.md`

**QC Results**

- Local URL path no longer requires `%20`.

**Remaining Risk**

External bookmarks to the old space-based file may need redirect handling.

**Release / Commit**

- Date: 2026-07-08

### 0.10.0 - Shared Duty Engine and App Structure Cleanup

**Objective**

Make calculator, report, and compare outputs use the same solved duty-point
calculation and improve app delivery.

**Before Fix**

- Different views could use inconsistent duty-point assumptions.
- Chart range and standalone generation were less robust.
- GitHub Pages entry routing was incomplete.

**After Fix**

- Added shared `lib/duty.js` result engine.
- Calculator, report, and compare views use the solved pump/system duty point.
- Added dynamic chart flow range sizing.
- Added GitHub Pages-friendly `index.html`.
- Added `npm run test` and `npm run build:standalone`.

**Files Changed**

- `lib/duty.js`
- `components/Calculator.jsx`
- `components/Report.jsx`
- `components/Compare.jsx`
- `components/PumpChart.jsx`
- `scripts/smoke-test.mjs`
- `scripts/build-standalone.mjs`
- `index.html`
- `README.md`
- `CHANGELOG.md`

**QC Results**

- Smoke tests covered duty solving and pipe helper behavior.

**Remaining Risk**

The app still depends on engineering assumptions that should be documented and
bounded for final-selection usage.

**Release / Commit**

- Date: 2026-07-08
