# Changelog

## [0.10.0] - 2026-07-08

- Fixed calculator, report, and compare outputs to use the solved pump/system duty point consistently.
- Added a shared `lib/duty.js` result engine and dynamic flow-range sizing for charts.
- Improved narrow-screen layout and replaced the fixed desktop viewport with a responsive viewport.
- Added a GitHub Pages-friendly `index.html` entry point.
- Added `npm run test` smoke coverage for duty solving and pipe helpers.
- Added `npm run build:standalone` to refresh the offline standalone HTML from current source files.
