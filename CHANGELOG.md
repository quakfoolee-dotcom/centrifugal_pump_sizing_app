# Changelog

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
