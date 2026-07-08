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
browser-smoke-test: flags, tabs, metadata, dirty-load snapshots, case import/export, numeric inputs, units, and report print passed
verify-formulas: all 82 first-principles checks passed
```

Any thrown error means the smoke test failed. The error message names the
calculation or workflow assertion that failed.

## Coverage Matrix

| Area | Smoke-test coverage |
|---|---|
| Units | SI to US and US to SI flow conversion, temperature conversion, and specific-energy conversion. |
| Formula verification | Independent checks against exact unit definitions, Colebrook-White friction reference, published water-property data, hydraulic identities, affinity laws, catalog interpolation, motor sizing, pipe schedule dimensions, and ISO tolerance constants. |
| Pipe hydraulics | Pipe velocity, Reynolds number, laminar/low-Re friction factor, transitional friction sanity, flow-regime labels, and hydraulic/brake power. |
| System head | Static lift, vessel pressure head, zero-flow system head, and zero-flow NPSHa. |
| Pump curve | Parametric shutoff/BEP head, BEP efficiency, NPSHr, affinity scaling, and catalog shutoff handling. |
| Catalog QC | Head-only auxiliary-curve flags, non-monotone head flattening, high-flow head behavior, efficiency high-flow behavior, duty/rated/selected catalog extrapolation flags. |
| Viscosity | BEP flow correction, efficiency correction, conservative NPSHr increase, flow-ratio sensitivity, specific-speed sensitivity, and mineral-acid fluid-property branch. |
| VFD | Selected-flow speed-for-duty solve, target-head verification, rich out-of-range status, minimum static speed status, and no-duty underspeed case. |
| No-duty behavior | Positive-flow pump/system mismatch flag, zero duty flow, no positive brake power, and no motor selection for no-duty cases. |
| Multi-pump arrangements | Parallel flow increase and per-pump split, series head addition, and solved-duty consistency. |
| NPSH acceptance | Configurable absolute NPSH margin effect and default margin value. |
| Motor sizing | Next IEC/NEMA motor selection, zero-duty motor behavior, and size-based motor efficiency trend. |
| Fluid property flags | Estimated non-water preset flag and mineral-acid handling for sulfuric acid-style fluids. |
| Case workflow | Current-state case export, valid single-case import, case-library import without active-state replacement, invalid library rejection, and dirty-load snapshot protection. |
| Chart UX wiring | Explicit NPSH tick scale, target-flow label, solved-duty label, and pointer-event drag wiring. |
| Warning UX wiring | Calculator flags are grouped by critical, caution, and collapsed model-assumption tiers. |
| Numeric input UX | Focused draft text is preserved, comma decimals are accepted on commit, and numeric field parsing is covered in the browser workflow. |
| App shell wiring | Main app loads the case helper, topbar uses the shared version, report-print handler is wired, report-print label is explicit, metadata status fallback is removed, dirty work is protected before destructive case transitions, and print CSS targets the report view. |
| Standalone artifact hygiene | Committed standalone HTML does not accumulate duplicate app CSS header comments. |
| Browser bootstrap | Standalone app loads in headless Chrome/Edge without CDN access and exposes the shared helpers. |
| Browser flag workflow | Default model assumptions render collapsed, are separate from critical flags, and can be expanded. |
| Browser navigation | Calculator, Report preview, and Compare tabs activate through click interactions. |
| Browser metadata workflow | Report metadata fields are edited through real inputs and verified in the report titleblock. |
| Browser case workflow | Save to localStorage, current-case JSON download, dirty saved-case load with automatic snapshot, invalid JSON import alert, valid single-case import, valid library import, and a library containing a case named `state`. |
| Browser numeric workflow | Partial decimal draft preservation and comma-decimal parsing for a real calculator input. |
| Browser unit workflow | SI to US toggle updates the visible app shell. |
| Browser print workflow | `Print Report / PDF` routes from Compare to Report before invoking `window.print()`. |

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
