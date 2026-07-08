# Changelog

## [0.10.20] - 2026-07-08

- Added `docs/verify_formulas_reference.md`, a LaTeX-style reference document for the 82 checks in `scripts/verify-formulas.mjs`.
- Documented formula-verifier equations, constants, sample calculations, tolerance logic, and QC traceability by script section.
- Linked the verifier reference from the README project structure and bumped the shared app version to `0.10.20`.

## [0.10.19] - 2026-07-08

- Added `scripts/verify-formulas.mjs`, an 82-check first-principles formula verification script.
- Added `npm run verify:formulas` and documented it in the README maintenance commands and project structure.
- Extended the smoke-test matrix to include formula-verification purpose, command, expected output, coverage, and remaining limitations.
- Bumped the shared app version to `0.10.19` and regenerated the standalone artifact.

## [0.10.18] - 2026-07-08

- Added `npm run test:browser`, a headless Chrome/Edge workflow smoke test for the standalone app.
- Covered browser tab navigation, metadata editing/report reflection, localStorage save, JSON export/download, invalid and valid JSON imports, unit toggle, and report-print routing.
- Made `Print Report / PDF` use a timeout-based print scheduler so the handler also fires in hidden/headless browser contexts.
- Hardened case-library import so a hand-built library containing a valid case named `state` plus sibling cases imports as a library instead of dropping siblings.
- Updated the smoke-test matrix, README, engineering change record, standalone artifact, and shared app version.

## [0.10.17] - 2026-07-08

- Fixed standalone build idempotency by preserving only offline `@font-face` blocks from the previous wrapper before appending fresh app CSS.
- Added a smoke-test matrix document covering purpose, command, expected output, coverage areas, and known gaps.
- Added smoke-test coverage to catch duplicate standalone app CSS header accumulation.
- Updated README maintenance documentation and bumped the shared app version to `0.10.17`.

## [0.10.16] - 2026-07-08

- Renamed the global print control to `Print Report / PDF` so it is clear that it intentionally prints the engineering report sheet from any active tab.
- Added smoke-test coverage for the explicit report-print label.

## [0.10.15] - 2026-07-08

- Made individual case export serialize the current live app state instead of an older saved-case snapshot.
- Added stricter case-library import validation so invalid JSON entries without `pump` and `sys` objects are rejected or skipped with a clear message.
- Changed case-library import to merge saved cases without replacing the active unsaved calculation.
- Routed Print / PDF through the report view and added print CSS that prints the report sheet instead of the active app tab.
- Removed demo metadata fallbacks from calculator/status/report displays when fields are intentionally blanked.
- Updated the topbar version label to the current release and added smoke-test coverage for the app-shell import/export and print wiring.

## [0.10.14] - 2026-07-08

- Added editable report metadata fields for Project, Tag, Doc No., Revision, Prepared By, and Discipline.
- Added JSON export/import for individual cases and JSON export/import support for saved case libraries.
- Normalized imported and older saved cases against current defaults so newer fields are preserved safely.
- Updated the live chart header, README, engineering change record, and standalone build for the report/case workflow.

## [0.10.13] - 2026-07-08

- Added catalog auxiliary-data flags when a head catalog is present but efficiency or NPSHr points are estimated.
- Added independent catalog extrapolation flags for rated flow and selected/VFD target flow, not only the solved duty point.
- Prevented high-flow catalog efficiency from extrapolating upward when the last entered efficiency segment rises.
- Added rich minimum-static VFD speed status and UI/report warnings when that speed is clamped or unsolved.
- Added report disclosure for idealized parallel/series pump assumptions and updated the formula manual and smoke tests.

## [0.10.12] - 2026-07-08

- Extrapolated catalog efficiency past the last entered efficiency point instead of holding it flat.
- Added flags for solved duty points outside the entered catalog flow range and for catalog head data flattened by monotone enforcement.
- Reclassified sulfuric acid as a mineral-acid fluid preset instead of an organic preset.
- Surfaced screening-grade viscosity correction coefficient warnings and removed unused duty outputs.
- Updated the formula manual, engineering change record, standalone build, and smoke tests for the catalog/fluid QC fixes.

## [0.10.11] - 2026-07-08

- Removed visible LaTeX spacing commands from slash-unit notation in the mathematical formula manual.
- Changed math-mode slash units to renderer-safe `\text{...}` fragments such as `\text{m}^3\text{/h}` and `\text{m/s}`.

## [0.10.10] - 2026-07-08

- Tightened slash-unit rendering in the mathematical formula manual with LaTeX negative thin spaces, so units such as `m^3/h`, `m^3/s`, and `m/s` do not render as spaced operators.
- Changed the internal-units table to plain Markdown/HTML unit labels so simple units render without math-mode slash spacing.

## [0.10.9] - 2026-07-08

- Normalized engineering unit notation in the mathematical formula manual to use upright `\mathrm{...}` units, preventing rendered units such as `m/s` from appearing with spaced slashes.

## [0.10.8] - 2026-07-08

- Converted inline math in the mathematical formula manual from `\(...\)` to `$...$` for better Markdown rendering.
- Replaced raw currency dollar signs in cost-equation notation with `USD` units to avoid math delimiter ambiguity.

## [0.10.7] - 2026-07-08

- Added a LaTeX-style mathematical formula manual with engineering explanations and worked sample calculations.
- Ignored local `.claude/` assistant tooling files so machine-specific settings are not published.

## [0.10.6] - 2026-07-08

- Added recommended affinity-law bounds for speed and impeller scaling, with calculator warnings and bounded sliders.
- Added conservative viscous-service NPSHr correction and flow-ratio/specific-speed sensitivity to the screening viscosity model.
- Made the absolute NPSH margin criterion user-configurable instead of hardcoded at 0.6 m.
- Replaced fixed 93% motor efficiency with a size-based efficiency curve for energy and cost estimates.
- Updated calculator, report, compare, engineering change record, standalone build, and smoke tests for the new QC controls.

## [0.10.5] - 2026-07-08

- Replaced catalog pump curve polynomial fitting with monotone interpolation through entered catalog points.
- Added explicit VFD out-of-range status for target speed calculations.
- Switched pipe friction to the Churchill correlation and surfaced transitional-flow status.
- Added engineering flags for estimated pump curves, estimated non-water fluid properties, generic fitting K-values, and high-viscosity screening limits.
- Changed motor sizing to select the next IEC/NEMA catalog motor size after service margin.
- Updated calculator, report, compare, and smoke tests for the QC findings.

## [0.10.4] - 2026-07-08

- Fixed VFD duty-speed calculation to solve against the selected target flow instead of the already-solved pump/system intersection.
- Added explicit no-duty-point handling when pump and system curves do not intersect at positive flow.
- Surfaced pump/system mismatch status in the calculator, report, and case comparison views.

## [0.10.3] - 2026-07-08

- Corrected catalog-curve fitting so valid zero-flow shutoff head points are included in the pump head model.
- Corrected low-Re laminar friction-factor handling and viscous BEP flow/head reporting.
- Added math QC coverage for unit conversions, pressure head, NPSHa, affinity scaling, pump arrangements, power, and catalog-curve edge cases.

## [0.10.2] - 2026-07-08

- Removed the default preparer name from the report header and cleared matching legacy autosave metadata.

## [0.10.1] - 2026-07-08

- Renamed app HTML files to underscore-based filenames so local and GitHub Pages URLs do not require `%20`.
- Updated the GitHub Pages redirect, README local-run URL, and standalone build script for the new filenames.

## [0.10.0] - 2026-07-08

- Fixed calculator, report, and compare outputs to use the solved pump/system duty point consistently.
- Added a shared `lib/duty.js` result engine and dynamic flow-range sizing for charts.
- Improved narrow-screen layout and replaced the fixed desktop viewport with a responsive viewport.
- Added a GitHub Pages-friendly `index.html` entry point.
- Added `npm run test` smoke coverage for duty solving and pipe helpers.
- Added `npm run build:standalone` to refresh the offline standalone HTML from current source files.
