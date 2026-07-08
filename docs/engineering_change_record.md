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
- Improve non-water fluid property handling beyond the current screening preset correlations.

## Change Records

### 0.10.21 - High-Impact UX Safety Pass

**Objective**

Implement the top-ranked UX findings that could cause chart misreading, active
case data loss, or daily numeric-entry friction before moving on to lower-ranked
workflow polish.

**Before Fix**

- NPSHa and NPSHr curves were drawn on a hidden 0-20 head scale while the
  visible right-axis tick labels only showed the 0-100 efficiency scale.
- Loading a saved case or importing a single active case replaced the live state
  without warning, and autosave then persisted the overwrite.
- Numeric fields reformatted on every keystroke, which could fight partial
  decimal entry such as `12.` and did not support comma decimal input.
- The draggable crosshair looked like the main result even though the results
  bar is based on the solved pump/system duty point.
- Chart dragging used mouse-only event listeners.

**After Fix**

- Added blue NPSH tick labels on the inner right axis while retaining the
  efficiency tick labels on the outer right axis.
- Labeled and enlarged the solved duty marker, and relabeled the draggable
  crosshair as `TARGET Q` with the VFD speed implication.
- Replaced mouse-only chart dragging with pointer events and pointer capture.
- Added dirty-state protection for saved-case loads and active single-case
  imports. When the user confirms, the app saves a uniquely named `Before load`
  or `Before import` snapshot before replacing the active state. The clean
  baseline is persisted separately from autosave so unsaved autosaved work is
  still protected after a page refresh.
- Reworked `Field` numeric inputs to keep draft text while focused, parse on
  blur/Enter, clamp to internal min/max limits, and accept comma decimals.
- Bumped the shared app version to `0.10.21` and expanded smoke coverage.

**Files Changed**

- `CHANGELOG.md`
- `Pump_Calculator.html`
- `Pump_Calculator_standalone.html`
- `components/Calculator.jsx`
- `components/PumpChart.jsx`
- `docs/engineering_change_record.md`
- `docs/smoke_test_matrix.md`
- `lib/caseLibrary.js`
- `scripts/browser-smoke-test.mjs`
- `scripts/smoke-test.mjs`

**QC Results**

- `npm run test` passed.
- `npm run verify:formulas` passed.
- `npm run build:standalone` passed.
- `npm run test:browser` passed.
- `git diff --check` passed. Git emitted line-ending normalization warnings
  for edited text files, but no whitespace errors.

**Remaining Risk**

This pass resolves the first five high-impact UX issues. Lower-ranked workflow
items remain open, including warning-pill grouping, a dedicated New Case flow,
passive chart hover readouts, fuller case management, shareable case links,
keyboard/ARIA polish, PDF filename control, density-toggle exposure, and drag
performance memoization.

**Release / Commit**

- Commit: this `main` release commit
- Branch: `main`
- Date: 2026-07-08

### 0.10.20 - Formula Verifier Reference Document

**Objective**

Create a readable engineering reference document for the first-principles
formula verifier so reviewers can understand the equation basis behind each
scripted check.

**Before Fix**

- `scripts/verify-formulas.mjs` existed and passed 82 first-principles checks,
  but the check basis lived only in source code.
- Reviewers had to read JavaScript to understand the exact constants,
  equations, tolerances, and sample values behind the verifier.
- README did not point to a dedicated verifier reference document.

**After Fix**

- Added `docs/verify_formulas_reference.md`.
- Documented the verifier's 12 check groups with LaTeX-style equations,
  constants, sample calculations, tolerance logic, and QC traceability.
- Used compact unit notation consistent with the main mathematical formula
  manual.
- Added the reference document to the README project structure.
- Bumped the shared app version to `0.10.20` and regenerated the standalone
  artifact so release labeling remains aligned.

**Files Changed**

- `CHANGELOG.md`
- `Pump_Calculator_standalone.html`
- `README.md`
- `docs/engineering_change_record.md`
- `docs/verify_formulas_reference.md`
- `lib/caseLibrary.js`
- `scripts/browser-smoke-test.mjs`
- `scripts/smoke-test.mjs`

**QC Results**

- `git diff --check` passed.
- `npm run verify:formulas` passed.
- `npm run test` passed.
- `npm run build:standalone` passed.
- `npm run test:browser` passed.

**Remaining Risk**

The new document explains the verifier basis, but the verifier remains a
regression and first-principles consistency check. It still does not replace
certified vendor pump curves, HI viscosity-chart calibration, project
specifications, visual chart review, or browser print-preview validation.

**Release / Commit**

- Commit: this `main` release commit
- Branch: `main`
- Date: 2026-07-08

### 0.10.19 - First-Principles Formula Verification Script

**Objective**

Add an independent formula-verification command that checks the app's main
engineering calculations against first-principles references, and document it as
part of routine QC.

**Before Fix**

- The repository had source smoke tests and browser workflow smoke tests, but
  no committed command dedicated to independent formula verification.
- A local `scripts/verify-formulas.mjs` file existed but was untracked, so other
  users could not run the same 82-check verification script from GitHub.
- README and the smoke-test matrix did not list `npm run verify:formulas`.

**After Fix**

- Added `scripts/verify-formulas.mjs` to version control.
- Added `npm run verify:formulas` to `package.json`.
- Documented the verifier in README maintenance commands and project structure.
- Extended `docs/smoke_test_matrix.md` with the formula-verification command,
  expected pass output, coverage area, and remaining limitation that it is not
  certified vendor pump validation.
- Bumped the shared app version to `0.10.19` and regenerated the standalone app
  artifact so the visible version remains aligned with the release history.

**Files Changed**

- `CHANGELOG.md`
- `Pump_Calculator_standalone.html`
- `README.md`
- `docs/engineering_change_record.md`
- `docs/smoke_test_matrix.md`
- `lib/caseLibrary.js`
- `package.json`
- `scripts/browser-smoke-test.mjs`
- `scripts/smoke-test.mjs`
- `scripts/verify-formulas.mjs`

**QC Results**

- `npm run verify:formulas` passed.
- `npm run test` passed.
- `npm run build:standalone` passed.
- `npm run test:browser` passed.
- `git diff --check` passed.

**Remaining Risk**

The verifier checks equations, identities, published reference values, and
selected integrated duty-solution consistency. It does not replace validation
against certified vendor curves, HI chart calibration for viscosity correction,
project specifications, or visual/browser print-preview review.

**Release / Commit**

- Commit: this `main` release commit
- Branch: `main`
- Date: 2026-07-08

### 0.10.18 - Browser Workflow Smoke Test And Import/Print Hardening

**Objective**

Add repeatable full-browser workflow smoke coverage for the app, document the
covered interactions and remaining gaps, and harden the two small workflow edges
that matter for automated browser QC.

**Before Fix**

- Routine QC covered calculation helpers and source-level wiring, but not real
  browser clicks, file input import, JSON download verification, localStorage
  behavior, unit toggling, or print routing in a live DOM.
- `printReport` depended on a double `requestAnimationFrame`, which can be
  skipped in hidden/headless browser contexts even though normal visible use was
  not affected.
- A hand-built JSON library with a valid case literally named `state` plus
  sibling cases could be mistaken for a single-case wrapper and drop the
  siblings.
- The smoke-test matrix still listed browser interaction and localStorage
  behavior as untested.

**After Fix**

- Added `scripts/browser-smoke-test.mjs`, a no-dependency Chrome DevTools
  Protocol runner that serves the repository locally, opens the standalone app
  in headless Chrome/Edge, and drives the UI through browser DOM interactions.
- Added `npm run test:browser`.
- Browser smoke coverage now includes tab navigation, metadata input edits and
  report reflection, case save to localStorage, current-case JSON download
  verification, invalid JSON import alerting, valid single-case import, valid
  library import without active-state replacement, a library containing a case
  named `state`, SI/US unit toggle, and Compare-to-Report print routing.
- Changed report printing to use a timeout-based scheduler after switching to
  the report view so it is robust in headless/hidden browser execution.
- Tightened case-import detection so only schema-tagged or true legacy
  single-case wrappers take the single-case branch; mixed case-like objects are
  imported as libraries.
- Updated the smoke-test matrix and README to document the new command,
  expected output, coverage areas, and remaining non-covered visual/cross-browser
  risks.
- Bumped the shared app version to `0.10.18`.

**Files Changed**

- `CHANGELOG.md`
- `Pump_Calculator.html`
- `Pump_Calculator_standalone.html`
- `README.md`
- `docs/engineering_change_record.md`
- `docs/smoke_test_matrix.md`
- `lib/caseLibrary.js`
- `package.json`
- `scripts/browser-smoke-test.mjs`
- `scripts/smoke-test.mjs`

**QC Results**

- `npm run test` passed.
- `npm run build:standalone` passed.
- `npm run test:browser` passed.
- Reran `npm run build:standalone` and confirmed the standalone build stayed
  idempotent.
- `git diff --check` passed.

**Remaining Risk**

The browser smoke test verifies behavior through headless Chrome/Edge DOM
automation. It does not visually inspect charts, drag handles, responsive
screenshots, native OS file-picker dialogs, browser print-preview output,
generated PDF pages, or vendor-grade hydraulic validation.

**Release / Commit**

- Commit: this `main` release commit
- Branch: `main`
- Date: 2026-07-08

### 0.10.17 - Standalone Build Idempotency And Smoke Test Matrix

**Objective**

Fix the standalone build so it can be rerun without dirtying the repository, and
document the smoke-test purpose, command, coverage areas, expected output, and
known test gaps.

**Before Fix**

- `npm run build:standalone` preserved all text before the first `:root` in the
  previous standalone style block.
- That preserved old app CSS header comments along with offline font assets, so
  each build could add another duplicate `Centrifugal Pump Calculator` comment
  to `Pump_Calculator_standalone.html`.
- The smoke test was only partly documented through README command notes,
  release records, and the source assertions in `scripts/smoke-test.mjs`.

**After Fix**

- Updated the standalone builder to preserve only actual offline `@font-face`
  blocks from the previous wrapper before appending fresh app CSS.
- Regenerated `Pump_Calculator_standalone.html` from the fixed builder.
- Added smoke-test coverage to catch duplicate standalone app CSS header
  accumulation.
- Added `docs/smoke_test_matrix.md` with purpose, command, expected pass output,
  coverage matrix, known gaps, and recommended pre-commit QC commands.
- Linked the smoke-test matrix from `README.md`.
- Bumped the shared app version to `0.10.17`.

**Files Changed**

- `CHANGELOG.md`
- `Pump_Calculator_standalone.html`
- `README.md`
- `docs/engineering_change_record.md`
- `docs/smoke_test_matrix.md`
- `lib/caseLibrary.js`
- `scripts/build-standalone.mjs`
- `scripts/smoke-test.mjs`

**QC Results**

- `npm run build:standalone` passed.
- Reran `npm run build:standalone` and confirmed it produced no new git diff.
- `npm run test` passed after rebuilding the standalone artifact.
- `git diff --check` passed with line-ending warnings only.

**Remaining Risk**

The smoke test remains a fast source-level regression check. It does not perform
full browser interaction, localStorage reload validation, visual chart
inspection, or browser print-preview/PDF validation.

**Release / Commit**

- Commit: this `main` release commit
- Branch: `main`
- Date: 2026-07-08

### 0.10.16 - Report Print Label Clarification

**Objective**

Make the global print control clearly communicate that it prints the engineering
report sheet, even when the user is currently viewing Calculator or Compare.

**Before Fix**

- The topbar button was labeled `Print / PDF`.
- After the 0.10.15 fix, the button correctly switched to Report preview before
  printing, but the generic label could make users expect the active Compare tab
  to print.

**After Fix**

- Renamed the control to `Print Report / PDF`.
- Added a tooltip explaining that it switches to report preview and prints the
  report sheet.
- Bumped the shared app version to `0.10.16`.
- Added smoke-test coverage for the explicit report-print label.

**Files Changed**

- `CHANGELOG.md`
- `Pump_Calculator.html`
- `Pump_Calculator_standalone.html`
- `docs/engineering_change_record.md`
- `lib/caseLibrary.js`
- `scripts/smoke-test.mjs`

**QC Results**

- `npm run test` passed.
- `npm run build:standalone` passed.
- `git diff --check` passed with line-ending warnings only.

**Remaining Risk**

The app still does not provide a dedicated Compare-tab printout. The global
print control intentionally prints the formal engineering report.

**Release / Commit**

- Commit: this `main` release commit
- Branch: `main`
- Date: 2026-07-08

### 0.10.15 - Case Workflow Hardening And Report Print Control

**Objective**

Close the app-shell audit findings for case export/import correctness,
print-to-report behavior, metadata display consistency, version labeling, and
repeatable QC coverage.

**Before Fix**

- Export Case could serialize a stale saved-case snapshot when the visible case
  had unsaved edits.
- Case-library import accepted objects whose entries did not actually look like
  pump sizing cases.
- Importing a library immediately loaded the first imported case, replacing the
  active calculation even when the user had unsaved work.
- Print / PDF called browser print directly, so the active Calculator or
  Compare tab could print instead of the engineering report.
- Blank metadata fields could show demo fallback values in calculator/status
  displays while the report showed the field as blank.
- The topbar version label remained at `v0.10` while the changelog was already
  tracking patch releases.
- Automated smoke coverage did not protect the metadata/import/export app-shell
  workflow.

**After Fix**

- Added a shared case-library helper for export payloads, import validation,
  case merging, and version/schema constants.
- Export Case now always serializes the live `state`; the case name is used only
  for the download filename.
- Single-case import still loads the imported case, while case-library import
  merges valid cases into the saved library without changing the active state.
- Invalid library entries without `pump` and `sys` objects are skipped when
  mixed with valid entries or rejected when no valid cases are present.
- Print / PDF switches to the report view before printing, and print CSS forces
  the report sheet to print without app chrome.
- Calculator, status bar, and report metadata displays no longer reinsert demo
  values when a field is intentionally blank.
- The topbar uses the current app version constant.
- Smoke tests now cover case export, case import validation, library import
  behavior, version wiring, and print stylesheet wiring.

**Files Changed**

- `CHANGELOG.md`
- `Pump_Calculator.html`
- `Pump_Calculator_standalone.html`
- `README.md`
- `components/Calculator.jsx`
- `components/Report.jsx`
- `docs/engineering_change_record.md`
- `lib/caseLibrary.js`
- `scripts/build-standalone.mjs`
- `scripts/smoke-test.mjs`
- `styles.css`

**QC Results**

- Added smoke-test coverage for current-state case export.
- Added smoke-test coverage for valid single-case import and library import.
- Added smoke-test coverage rejecting invalid case-library JSON.
- Added smoke-test coverage for topbar version and print stylesheet wiring.
- `npm run test` passed.
- `npm run build:standalone` passed.
- `git diff --check` passed with line-ending warnings only.

**Remaining Risk**

The import/export workflow is intentionally plain JSON for portability. Users
can still manually edit files into engineering-invalid but structurally valid
states; calculation warnings and normal QC review remain required after import.

**Release / Commit**

- Commit: this `main` release commit
- Branch: `main`
- Date: 2026-07-08

### 0.10.14 - Report Metadata And Case Portability

**Objective**

Make engineering reports project-specific without source edits and make saved
cases portable outside browser localStorage.

**Before Fix**

- Report metadata fields existed in `state.meta` and were used by the report
  titleblock, but the calculator had no UI to edit Project, Tag, Doc No.,
  Revision, Prepared By, or Discipline.
- Saved cases were stored only in browser localStorage under `pumpcalc:cases`.
- There was no JSON export/import path for handing one case to a colleague or
  backing up the saved-case library.

**After Fix**

- Added a Report metadata section to the calculator input panel.
- Updated the live chart header to use the editable report tag.
- Added JSON export for the current/selected case.
- Added JSON export for the saved-case library.
- Added JSON import for single-case files, raw state JSON, and case-library
  JSON files.
- Normalized imported and older saved cases against current defaults so newly
  added fields are preserved.

**Files Changed**

- `CHANGELOG.md`
- `Pump_Calculator.html`
- `Pump_Calculator_standalone.html`
- `README.md`
- `components/Calculator.jsx`
- `docs/engineering_change_record.md`
- `styles.css`

**QC Results**

- `npm run test` passed.
- `npm run build:standalone` passed.
- `git diff --check` passed with line-ending warnings only.
- Source review confirmed report metadata fields update `state.meta`.
- Source review confirmed case import handles single-case, raw-state, and
  library JSON payloads.

**Remaining Risk**

Case JSON is intentionally plain and user-editable. Invalid or manually edited
files can still be rejected during import; the app reports a browser alert when
the JSON cannot be parsed or does not contain valid case data.

**Release / Commit**

- Commit: this `main` release commit
- Branch: `main`
- Date: 2026-07-08

### 0.10.13 - Catalog Auxiliary QC And VFD Status

**Objective**

Close the latest audit findings around catalog auxiliary data, catalog
extrapolation scope, optimistic efficiency extrapolation, minimum VFD speed
status, and report disclosure of multi-pump idealizations.

**Before Fix**

- A head-only catalog could make efficiency and NPSHr look catalog-backed even
  though they were estimated from fallback logic.
- Catalog extrapolation warnings only checked the solved duty point, not the
  rated point or selected/VFD target.
- High-flow catalog efficiency extrapolated with the terminal slope even when
  the last entered efficiency segment was rising.
- Minimum static VFD speed was displayed as a plain number without reachability
  status.
- Reports did not disclose the ideal equal-split parallel and ideal head-addition
  series assumptions.

**After Fix**

- Added catalog auxiliary-data status for estimated efficiency and NPSHr curves.
- Added independent duty, rated, and selected/VFD target catalog range flags.
- Capped rising-terminal high-flow efficiency extrapolation at the last entered
  efficiency value.
- Added `minVfdSpeedResult()` with solve status while retaining the numeric
  `minVfdSpeed()` wrapper for compatibility.
- Added calculator, report, and compare flags for the new statuses.
- Added report notes for idealized parallel and series pump assumptions.

**Files Changed**

- `CHANGELOG.md`
- `components/Calculator.jsx`
- `components/Compare.jsx`
- `components/Report.jsx`
- `docs/engineering_change_record.md`
- `docs/mathematical_formula_manual.md`
- `lib/duty.js`
- `lib/pumpMath.js`
- `scripts/smoke-test.mjs`
- `Pump_Calculator_standalone.html`

**QC Results**

- Added smoke-test coverage for head-only catalog auxiliary flags.
- Added smoke-test coverage for rising-terminal catalog efficiency behavior.
- Added smoke-test coverage for rated and selected/VFD target catalog
  extrapolation flags.
- Added smoke-test coverage for rich minimum VFD speed status.
- `npm run test` passed.
- `npm run build:standalone` passed.
- `git diff --check` passed with line-ending warnings only.

**Remaining Risk**

Catalog extrapolation remains lower-confidence than vendor-tested points even
when flagged. The viscosity correction coefficients and non-water fluid
properties remain screening approximations until validated against HI/vendor
data.

**Release / Commit**

- Commit: this `main` release commit
- Branch: `main`
- Date: 2026-07-08

### 0.10.12 - Catalog Curve And Fluid QC Flags

**Objective**

Close the remaining catalog-curve and fluid-property QC findings: make
high-flow catalog efficiency extrapolate, warn when duty uses extrapolated
catalog data, warn when catalog head data is flattened, correct sulfuric acid
classification, and make viscosity-correction coefficient risk explicit.

**Before Fix**

- Catalog efficiency held flat beyond the last entered efficiency point.
- A solved duty point beyond the entered catalog flow range was not flagged.
- Monotone head enforcement could flatten rising catalog head data without any
  warning.
- Sulfuric acid 98 percent used the organic preset property branch.
- Viscosity correction coefficients were disclosed as screening approximations
  in documentation, but the app did not flag that coefficient calibration risk.
- `computeDuty` returned unused `selectedH` and `viscBep` values.

**After Fix**

- Catalog efficiency now uses high-flow extrapolation with the last entered
  efficiency segment, matching head and NPSHr behavior.
- Added catalog extrapolation status based on the solved per-pump duty flow in
  the reference catalog frame.
- Added a catalog head-flattening status when entered head data rises with flow
  and is forced non-increasing.
- Reclassified sulfuric acid as `mineral_acid`, using an aqueous-like
  low-vapor-pressure property path instead of the organic branch.
- Added calculator, report, and compare flags for catalog extrapolation,
  flattened catalog head data, and screening-grade viscosity coefficients.
- Removed unused `selectedH` and `viscBep` outputs from `computeDuty`.

**Files Changed**

- `CHANGELOG.md`
- `components/Calculator.jsx`
- `components/Compare.jsx`
- `components/Report.jsx`
- `docs/engineering_change_record.md`
- `docs/mathematical_formula_manual.md`
- `lib/duty.js`
- `lib/pumpMath.js`
- `scripts/smoke-test.mjs`
- `Pump_Calculator_standalone.html`

**QC Results**

- Added smoke-test coverage for catalog efficiency high-flow extrapolation.
- Added smoke-test coverage for catalog extrapolation and monotone head
  flattening flags.
- Added smoke-test coverage for the mineral-acid fluid-property branch.
- `npm run test` passed.
- `npm run build:standalone` passed.
- `git diff --check` passed with line-ending warnings only.

**Remaining Risk**

The viscosity correction coefficients remain screening approximations until
validated against HI 9.6.7 or vendor data. Catalog extrapolated regions remain
lower-confidence than entered vendor test points even though they are now
explicitly flagged.

**Release / Commit**

- Commit: this `main` release commit
- Branch: `main`
- Date: 2026-07-08

### 0.10.11 - Remove Visible Unit Spacing Commands

**Objective**

Remove visible exclamation marks from slash-unit notation in the mathematical
formula manual while keeping compact units such as m^3/h and m/s.

**Before Fix**

- The 0.10.10 unit-rendering fix used LaTeX negative thin-space commands around
  slash units.
- The target Markdown renderer exposed those spacing commands visually, showing
  visible exclamation marks around the slash.

**After Fix**

- Removed all negative thin-space commands from the formula manual.
- Replaced math-mode slash units with renderer-safe text fragments, for example
  `\text{m}^3\text{/h}`, `\text{m}^3\text{/s}`, `\text{kg/m}^3`, and
  `\text{m/s}`.
- Kept the internal-units table as plain Markdown/HTML unit labels.

**Files Changed**

- `CHANGELOG.md`
- `docs/engineering_change_record.md`
- `docs/mathematical_formula_manual.md`

**QC Results**

- A scan of `docs/mathematical_formula_manual.md` found no remaining LaTeX
  negative thin-space commands.
- A scan of `docs/mathematical_formula_manual.md` found no visible
  exclamation-mark slash-unit artifacts.
- Spot-checked the flow conversion and velocity examples that previously showed
  visible spacing artifacts.
- Inline `$...$` delimiters remain balanced outside fenced math blocks.

**Remaining Risk**

Markdown math rendering is viewer-dependent, but `\text{...}` avoids relying on
LaTeX spacing commands and should not display exclamation marks.

**Release / Commit**

- Commit: this `main` release commit
- Branch: `main`
- Date: 2026-07-08

### 0.10.10 - Compact Slash Unit Rendering

**Objective**

Fix remaining visual spacing around slash-style engineering units in the
mathematical formula manual, especially in the internal-units table.

**Before Fix**

- Units were wrapped in `\mathrm{...}`, for example `\mathrm{m^3/h}`.
- GitHub's math renderer could still treat `/` as an operator and display
  units like `m^3 / h` and `m / s`.

**After Fix**

- Replaced slash units with explicit compact LaTeX forms such as
  `\text{m}^3\text{/h}`, `\text{m}^3\text{/s}`, and
  `\text{m/s}`.
- Applied the same compact slash style to density, energy, cost, and time-rate
  units in the formula manual.
- Changed the internal-units table unit labels to plain Markdown/HTML text
  such as `m<sup>3</sup>/h` and `m/s` so table cells do not rely on math
  rendering for simple unit labels.

**Files Changed**

- `CHANGELOG.md`
- `docs/engineering_change_record.md`
- `docs/mathematical_formula_manual.md`

**QC Results**

- Spot-checked the internal-units table and velocity example for compact slash
  unit notation.
- `rg "\mathrm\{[^}]+/[^}]+\}" docs\mathematical_formula_manual.md` found no
  remaining raw slash units inside a single `\mathrm{...}` block.
- Spot-checked the internal-units table source for plain unit labels without
  math-mode slash operators.
- Inline `$...$` delimiters remain balanced outside fenced math blocks.

**Remaining Risk**

Markdown math rendering is viewer-dependent, but the negative thin-space form
should prevent GitHub from displaying slash units with operator spacing.

**Release / Commit**

- Commit: this `main` release commit
- Branch: `main`
- Date: 2026-07-08

### 0.10.9 - Formula Manual Unit Rendering

**Objective**

Normalize engineering unit notation in the mathematical formula manual so units
such as m/s, kg/m^3, and m^3/h render compactly and read like standard pump
datasheet notation.

**Before Fix**

- Inline and display math used raw math-mode unit text such as `\ m/s`.
- Some Markdown math renderers could show slash units with operator-style
  spacing, for example `m / s` instead of `m/s`.
- Conversion-equation subscripts also used raw unit text such as `Q_{m^3/h}`.

**After Fix**

- Wrapped engineering units in `\mathrm{...}` where they appear in math spans
  and equation examples.
- Updated conversion-equation unit subscripts to use `\mathrm{...}`.
- Kept variables and equations unchanged; only documentation notation was
  normalized.

**Files Changed**

- `CHANGELOG.md`
- `docs/engineering_change_record.md`
- `docs/mathematical_formula_manual.md`

**QC Results**

- Spot-checked velocity examples to confirm they now use
  `\mathrm{m/s}` notation.
- Scanned for slash-style units to verify common hydraulic units are wrapped
  in `\mathrm{...}` where they appear as units.
- `git diff --check` passed with line-ending warnings only.

**Remaining Risk**

Markdown math rendering still depends on the viewer. GitHub should render these
units compactly, while plain Markdown viewers may still show raw LaTeX.

**Release / Commit**

- Commit: this `main` release commit
- Branch: `main`
- Date: 2026-07-08

### 0.10.8 - Formula Manual Inline Math Rendering

**Objective**

Fix inline equation rendering in the mathematical formula manual so symbols and
sample values display correctly in GitHub-flavored Markdown.

**Before Fix**

- Inline formulas used `\(...\)` delimiters throughout
  `docs/mathematical_formula_manual.md`.
- Some Markdown viewers displayed those expressions literally, for example
  `\(\rho_{ref}=1068 \ kg/m^3\)`, instead of rendering them as inline math.

**After Fix**

- Converted inline formula delimiters from `\(...\)` to `$...$` across the
  manual.
- Left fenced `math` equation blocks unchanged.
- Verified the reported examples now use `$...$` delimiters:
  `$\rho_{ref}=1068 \ kg/m^3$`, `$T_{ref}=20^\circ C$`, and
  `$T=30^\circ C$`.

**Files Changed**

- `CHANGELOG.md`
- `docs/engineering_change_record.md`
- `docs/mathematical_formula_manual.md`

**QC Results**

- `rg "\\\(|\\\)" docs\mathematical_formula_manual.md` found no remaining
  inline `\(...\)` delimiters.
- Manual spot-check confirmed the reported examples were converted to `$...$`.
- Manual spot-check corrected the energy-cost inline math from a raw currency
  dollar sign to `\mathrm{USD/kWh}` and the annual-cost equation to
  `\mathrm{USD/y}` to avoid ambiguous dollar-sign parsing.

**Remaining Risk**

Different Markdown renderers vary in math support. GitHub-flavored Markdown
supports `$...$` inline math, while plain Markdown viewers may still show raw
LaTeX syntax.

**Release / Commit**

- Commit: this `main` release commit
- Branch: `main`
- Date: 2026-07-08

### 0.10.7 - Mathematical Formula Manual and Local Tooling Ignore

**Objective**

Add a comprehensive engineering math manual for the app's calculation basis and
prevent machine-local assistant/tooling settings from being published to GitHub.

**Before Fix**

- Mathematical formulas were implemented in code and partially described in
  QC notes, but there was no single manual covering equations, engineering
  meaning, and worked examples.
- The local `.claude/` assistant tooling directory was untracked but not
  explicitly ignored.

**After Fix**

- Added `docs/mathematical_formula_manual.md` with LaTeX-style equations,
  engineering explanations, and sample calculations for the app's hydraulic,
  pump, NPSH, viscosity, VFD, motor, and energy calculations.
- Added `.claude/` to `.gitignore` so machine-specific local settings stay out
  of repository commits.
- Added `0.10.7` changelog notes for the documentation and ignore-file update.

**Files Changed**

- `.gitignore`
- `CHANGELOG.md`
- `docs/mathematical_formula_manual.md`

**QC Results**

- `git diff --check` passed with line-ending warnings only.
- Manual review confirmed the document contains no TODO/FIXME placeholders.
- Manual review confirmed the document uses ASCII text and LaTeX-style math
  blocks.

**Remaining Risk**

The manual documents the current screening calculation basis. Vendor-certified
curves, applicable HI standards, and project specifications remain controlling
references for final pump selection.

**Release / Commit**

- Commit: `bf8a9bb`
- Branch: `main`
- Date: 2026-07-08

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
