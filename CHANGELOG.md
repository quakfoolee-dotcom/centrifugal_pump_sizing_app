# Changelog

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
