# Changelog

## [0.11.1] - 2026-07-10

- Added a compact accessible theme popover with Engineering Paper, Control Room Dark, and Blueprint color schemes; persisted the preference independently from case data.
- Reworked the right toolbar into stable display, case, and action zones with a fixed-width non-wrapping Print Report / PDF control.
- Moved case notifications into a dismissible five-second toast so loading or snapshot messages cannot resize toolbar controls.
- Added case-name truncation/tooltips, responsive toolbar rules, theme-safe focus colors, and a print/report Paper palette independent of the selected interface theme.
- Added source and rendered-browser regression coverage, bumped the app version to `0.11.1`, and regenerated the standalone app.
- Added release metadata, proprietary-use notice, versioned release notes, reproducible checksum packaging, CI verification, and GitHub Pages deployment automation.

## [0.11.0] - 2026-07-10

- Corrected single-duty/standby power and energy by separating installed pumps from simultaneously operating pumps; added parallel all-running/one-unavailable staging, per-branch equipment flow, and conservative branch-imbalance loading.
- Separated required design duty from the predicted pump/system intersection and based rated margins on the fixed requirement.
- Converted catalog flow/head/NPSHr fields through the active SI/US unit layer and changed efficiency entry to validated percent.
- Added blocking engineering validation, independent NPSH ratio/absolute-margin flags, liquid-range warnings, and suction boiling checks.
- Added configurable POR/AOR, MCSF, thermal minimum flow, suction-specific-speed limit, and motor sizing margin.
- Added maximum absorbed-power motor-envelope sizing across the AOR at maximum scenario density.
- Added minimum/normal/maximum liquid-level scenarios and worst-case rated NPSH using minimum atmosphere, maximum vapor pressure, and dirty equipment.
- Added separate suction/discharge roughness plus fixed ΔP, clean/dirty filter, and control-valve Kv/Cv equipment losses.
- Expanded the printable report with required/predicted duty, scenario envelope, equipment losses, worst-case NPSH, and motor-envelope results.
- Increased first-principles verification from 82 to 85 checks, expanded regression coverage, regenerated the standalone app, and documented the before/after results in `docs/engineering_upgrade_v0.11.0.md`.

## [0.10.26] - 2026-07-09

- Converted the main view tabs from clickable `div` elements to accessible button tabs with ARIA tablist semantics and arrow-key navigation.
- Added visible keyboard focus styling and accessible labels for icon-only delete controls in the calculator and compare views.
- Added Escape-key close and focus management for the case manager dialog.
- Set the browser document title from report metadata during report printing so saved PDFs get project-specific filenames, then restore the app title after printing.
- Added source and browser smoke coverage for accessible tab wiring, dialog Escape behavior, icon-button labels, and print-title handling; bumped the shared app version to `0.10.26`.

## [0.10.25] - 2026-07-09

- Added a dedicated case manager dialog with saved-case list, rename, duplicate, delete, selected-case export, full-library export, and JSON import actions.
- Reduced the topbar case controls by moving library-level actions out of the crowded toolbar.
- Added shareable case links using `#case=` URL hashes that encode the current case and open through the same merge/validation path as imported cases.
- Added source and browser smoke coverage for case-manager workflows and share-link payloads; bumped the shared app version to `0.10.25`.
- Regenerated the standalone app.

## [0.10.24] - 2026-07-08

- Increased the desktop and compact calculator input-panel widths to prevent the suction/discharge rows from producing horizontal scrollbars.
- Changed the main/center grid tracks and form-row columns to use shrink-safe `minmax(0, ...)` sizing.
- Restored `border-box` sizing on reset-style controls so full-width panel buttons and inputs fit inside padded rows.
- Limited calculator panel overflow to the vertical axis and added source/browser smoke coverage for no horizontal panel scrolling.
- Regenerated the standalone app and bumped the shared app version to `0.10.24`.

## [0.10.23] - 2026-07-08

- Added a protected `New` case flow that snapshots dirty work before starting a blank calculation case.
- New cases now start with blank report metadata and neutral system defaults instead of carrying demo project/static-head values forward.
- Added a passive chart hover readout for Q, pump head, system head, efficiency, NPSHa, and NPSHr without moving the target-flow crosshair.
- Added source and browser smoke coverage for new-case protection and chart hover readout; bumped the shared app version to `0.10.23`.

## [0.10.22] - 2026-07-08

- Reworked the live calculator flag strip into severity tiers: critical blockers, actionable cautions, and collapsed model assumptions.
- Kept no-duty, affinity-limit, low-flow, and NPSH failures prominent while moving disclosure-grade items such as estimated curves, generic K-values, estimated fluid properties, and screening viscosity coefficients into a muted assumptions expander.
- Added source and browser smoke coverage for tiered flags and collapsed default assumptions; bumped the shared app version to `0.10.22`.

## [0.10.21] - 2026-07-08

- Added explicit NPSH tick labels on the chart right axis so NPSHa/NPSHr curves are not read against the efficiency scale.
- Rebalanced chart markers so the solved pump/system duty point is labeled as the primary result and the draggable crosshair is labeled as the target-flow VFD probe.
- Switched chart dragging from mouse-only listeners to pointer events for mouse, touch, and pen support.
- Added dirty-work protection for saved-case loads and active single-case imports, with optional automatic `Before load` / `Before import` snapshots.
- Reworked numeric fields to preserve focused draft text, parse on blur/Enter, and accept comma decimals.
- Expanded source and browser smoke tests for chart UX wiring, dirty-load snapshots, and numeric input behavior; bumped the shared app version to `0.10.21`.

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
