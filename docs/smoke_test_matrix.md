# Smoke Test Matrix

This document describes the smoke tests used for routine QC of the Centrifugal
Pump Sizing App.

## Purpose

The source smoke test is a fast engineering regression check for the shared
hydraulic math engine, unit conversions, case import/export helpers, and
selected app shell wiring. The browser smoke test opens the standalone app in
headless Chrome or Edge and exercises core user workflows through the DOM.
Together, they are intended to catch obvious calculation and workflow
regressions before committing or publishing.

The smoke tests are not a substitute for project engineering review, vendor pump
selection, cross-browser certification, or visual report/print validation.

## Commands

Run from the repository root:

```bash
npm run test
npm run build:standalone
npm run test:browser
npm run verify:formulas
```

The source smoke test executes:

```bash
node scripts/smoke-test.mjs
```

The browser smoke test executes:

```bash
node scripts/browser-smoke-test.mjs
```

The first-principles formula verifier executes:

```bash
node scripts/verify-formulas.mjs
```

`npm run test:browser` requires a local Chrome or Edge executable. It serves the
repo on an ephemeral localhost port and opens `Pump_Calculator_standalone.html`,
so it does not depend on CDN access during the test.

## Expected Pass Output

```text
smoke-test: duty solve, parallel case, and pipe helpers passed
browser-smoke-test: themes, stable toolbar, flags, panel layout, accessible tabs, chart hover, cases, metadata, units, and report print passed
verify-formulas: all 85 first-principles checks passed
```

Any thrown error means the smoke test failed. The error message names the
calculation or workflow assertion that failed.

## Coverage Matrix

| Area | Smoke-test coverage |
|---|---|
| Units | SI to US and US to SI flow conversion, temperature conversion, and specific-energy conversion. |
| Formula verification | Independent checks against exact unit definitions, Colebrook-White friction reference, published water-property data, hydraulic identities, affinity laws, catalog interpolation, motor sizing, pipe schedule dimensions, and ISO tolerance constants. |
| Pipe hydraulics | Pipe velocity, Reynolds number, laminar/low-Re friction factor, transitional friction sanity, flow-regime labels, and hydraulic/brake power. |
| System head | Static lift, vessel pressure head, zero-flow system head/NPSHa, separate roughness, fixed equipment ΔP, clean/dirty loss, and Kv conversion. |
| Pump curve | Parametric shutoff/BEP head, BEP efficiency, NPSHr, affinity scaling, and catalog shutoff handling. |
| Catalog QC | Head-only auxiliary-curve flags, non-monotone head flattening, high-flow head behavior, efficiency high-flow behavior, duty/rated/selected catalog extrapolation flags. |
| Viscosity | BEP flow correction, efficiency correction, conservative NPSHr increase, flow-ratio sensitivity, specific-speed sensitivity, and mineral-acid fluid-property branch. |
| VFD | Selected-flow speed-for-duty solve, target-head verification, rich out-of-range status, minimum static speed status, and no-duty underspeed case. |
| No-duty behavior | Positive-flow pump/system mismatch flag, zero duty flow, no positive brake power, and no motor selection for no-duty cases. |
| Multi-pump arrangements | Parallel flow increase and per-pump split, series head addition, solved-duty consistency, single duty/standby power, all/one-unavailable staging, branch-flow equipment basis, and conservative flow-imbalance loading. |
| Required duty | Rated duty remains tied to the independent process requirement when the candidate pump curve changes. |
| NPSH acceptance | Independent ratio/absolute-margin status, configurable absolute margin, default margin, and worst-case scenario evaluation. |
| Motor sizing | Next IEC/NEMA selection, zero-duty behavior, size-based efficiency, and maximum duty/AOR power basis. |
| Input validation | Invalid hydraulic dimensions and catalog efficiency values block calculation with specific errors. |
| Equipment losses | Fixed clean/dirty differential pressure and control-valve Kv identities. |
| Fluid property flags | Estimated non-water preset flag and mineral-acid handling for sulfuric acid-style fluids. |
| Case workflow | Current-state case export, share-link hash round trip, valid single-case import, case-library import without active-state replacement, invalid library rejection, case-manager rename/duplicate/delete, and dirty-load snapshot protection. |
| Chart UX wiring | Explicit NPSH tick scale, target-flow label, solved-duty label, and pointer-event drag wiring. |
| Chart hover readout | Passive chart hover readout is wired for Q, pump/system head, efficiency, and NPSH values. |
| Warning UX wiring | Calculator flags are grouped by critical, caution, and collapsed model-assumption tiers. |
| Numeric input UX | Focused draft text is preserved, comma decimals are accepted on commit, and numeric field parsing is covered in the browser workflow. |
| App shell wiring | Main app loads the case helper, topbar uses the shared version, accessible tab semantics are wired, report-print handler is wired with metadata-based print title handling, report-print label is explicit, metadata status fallback is removed, dirty work is protected before destructive case transitions, and print CSS targets the report view. |
| Accessibility wiring | Main view tabs expose ARIA tab roles, support keyboard arrow navigation, icon-only delete buttons have accessible labels, and focus-visible styling is present. |
| Standalone artifact hygiene | Committed standalone HTML does not accumulate duplicate app CSS header comments. |
| Browser bootstrap | Standalone app loads in headless Chrome/Edge without CDN access and exposes the shared helpers. |
| Browser accessibility workflow | Main view tabs expose tablist semantics and respond to keyboard arrow navigation; the case manager closes with Escape. |
| Browser flag workflow | Default model assumptions render collapsed, are separate from critical flags, and can be expanded. |
| Browser panel layout | Active calculator panels have hidden horizontal overflow and no measured horizontal scroll requirement at the tested desktop viewport. |
| Browser navigation | Calculator, Report preview, and Compare tabs activate through click interactions. |
| Browser metadata workflow | Report metadata fields are edited through real inputs and verified in the report titleblock. |
| Browser case workflow | Save to localStorage, current-case JSON download, dirty saved-case load with automatic snapshot, protected New case reset, invalid JSON import alert, valid single-case import, valid library import, and a library containing a case named `state`. |
| Browser case manager workflow | Case manager opens from the topbar and renames, duplicates, and deletes a selected saved case through real DOM interactions. |
| Browser share-link workflow | `Share` writes a `#case=` hash containing the current live case payload. |
| Browser chart workflow | Passive hover readout appears when a pointer-move event is dispatched over the chart. |
| Browser numeric workflow | Partial decimal draft preservation and comma-decimal parsing for a real calculator input. |
| Browser unit workflow | SI to US toggle updates the visible app shell. |
| Browser theme workflow | Theme popover is accessible, Dark applies and persists across reload, and Paper restores independently from case data. |
| Browser toolbar stability | A long snapshot notification renders as a fixed toast while the Print Report / PDF button retains its width and single-line label. |
| Browser print workflow | `Print Report / PDF` routes from Compare to Report, temporarily sets a metadata-based document title for PDF filenames, then restores the app title. |

## Not Covered Yet

- Visual chart inspection, full pointer-drag gesture validation, and responsive
  layout screenshots.
- Browser print-preview/PDF visual validation. The smoke test checks that print
  CSS and report-print routing are wired, but it does not inspect the print
  preview output or generated PDF pages.
- Native operating-system file-picker dialog behavior. The browser smoke test
  sets the selected file through Chrome DevTools Protocol.
- Cross-browser behavior beyond the local Chrome/Edge executable used by the
  browser smoke test.
- Vendor-grade hydraulic validation against certified pump curves, HI charts, or
  project specifications. The formula verifier checks many identities and
  published reference values, but it is still not a certified pump selection.
- Unequal parallel-branch flow distribution and transient interaction. Model
  materially unequal branches in a hydraulic-network solver or as separate
  conservative cases.

## Related Commands

Refresh the standalone offline artifact after source changes:

```bash
npm run build:standalone
```

Recommended pre-commit QC:

```bash
npm run test
npm run build:standalone
npm run test:browser
npm run verify:formulas
git diff --check
```

Idempotency check for standalone build changes:

```bash
npm run build:standalone
git diff --check
```

Running the standalone build should be idempotent: after the source and
standalone artifact are current, rerunning `npm run build:standalone` should not
create a git diff.
