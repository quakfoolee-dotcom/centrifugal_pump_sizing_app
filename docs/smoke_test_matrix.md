# Smoke Test Matrix

This document describes the no-dependency smoke test used for routine QC of the
Centrifugal Pump Sizing App.

## Purpose

The smoke test is a fast engineering regression check for the shared hydraulic
math engine, unit conversions, case import/export helpers, and selected app
shell wiring. It is intended to catch obvious calculation and workflow
regressions before committing or publishing.

The smoke test is not a substitute for project engineering review, vendor pump
selection, browser interaction testing, or visual report/print validation.

## Command

Run from the repository root:

```bash
npm run test
```

The command executes:

```bash
node scripts/smoke-test.mjs
```

## Expected Pass Output

```text
smoke-test: duty solve, parallel case, and pipe helpers passed
```

Any thrown error means the smoke test failed. The error message names the
calculation or workflow assertion that failed.

## Coverage Matrix

| Area | Smoke-test coverage |
|---|---|
| Units | SI to US and US to SI flow conversion, temperature conversion, and specific-energy conversion. |
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
| Case workflow | Current-state case export, valid single-case import, case-library import without active-state replacement, and invalid library rejection. |
| App shell wiring | Main app loads the case helper, topbar uses the shared version, report-print handler is wired, report-print label is explicit, metadata status fallback is removed, and print CSS targets the report view. |
| Standalone artifact hygiene | Committed standalone HTML does not accumulate duplicate app CSS header comments. |

## Not Covered Yet

- Full browser interaction such as clicking controls, importing files through
  the file picker, or verifying downloaded JSON files in a real browser.
- Visual chart inspection, drag-handle behavior, and responsive layout
  screenshots.
- Browser print-preview/PDF visual validation. The smoke test checks that print
  CSS and the report-print handler are wired, but it does not inspect the print
  preview output.
- LocalStorage persistence behavior across browser reloads.
- Cross-browser behavior for React/Babel CDN loading, file downloads, and print
  rendering.
- Vendor-grade hydraulic validation against certified pump curves, HI charts, or
  project specifications.

## Related Commands

Refresh the standalone offline artifact after source changes:

```bash
npm run build:standalone
```

Recommended pre-commit QC:

```bash
npm run test
npm run build:standalone
npm run test
git diff --check
```

Running the standalone build should be idempotent: after the source and
standalone artifact are current, rerunning `npm run build:standalone` should not
create a git diff.
