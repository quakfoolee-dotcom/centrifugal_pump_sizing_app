# Desktop Acceptance Matrix - v0.11.1

- **Assessment date:** 2026-07-11
- **Platform:** Microsoft Windows NT 10.0.26200.0, x64
- **Application:** Centrifugal Pump Sizing
- **Version:** 0.11.1
- **Branch assessed:** `codex/electron-desktop`

## Acceptance decision

The desktop application, portable package, Squirrel payload, engineering calculations,
offline operation, data persistence, and native PDF output are accepted. The A4 report
clipping found during the first visual review was corrected and all three final pages
were rendered and reviewed without clipped values, overlapping content, or an oversized
chart.

Public installer distribution remains conditional on either:

1. code-signing the Setup executable; or
2. completing one final interactive Setup launch on a clean Windows account and accepting
   the expected unsigned-publisher warning.

The unsigned self-extracting Setup wrapper was held before extraction during automated
same-version reruns from a OneDrive-backed workspace. The identical full Squirrel nupkg
was installed through the bundled updater under its standard LocalAppData staging path,
and the resulting installed payload matched source byte-for-byte.

## Acceptance matrix

| ID | Area | Acceptance criterion | Result | Evidence / result |
|---|---|---|---|---|
| DA-01 | Build | Windows x64 installer and ZIP build under Node 24 | PASS | `npm run desktop:make` completed; Electron Forge package and both makers passed. |
| DA-02 | Shell security | Renderer is sandboxed with no Node integration and navigation is blocked | PASS | `npm run desktop:verify` passed. |
| DA-03 | Installer artifact | Setup executable is present, complete, and checksum-verifiable | PASS | 142,106,624 bytes; SHA-256 `a288d58822c235f0c47744b3247ffd260fe3aa501a8b82cfe6cdefa64f605db9`. |
| DA-04 | Portable artifact | Portable Windows ZIP is present and checksum-verifiable | PASS | 146,170,383 bytes; SHA-256 `918ade8090e1122795533e84c3d86e64d46bc737e5d3277f8c2fce033b1e6bb1`. |
| DA-05 | Code signing | Installer has a trusted Authenticode signature | CONDITIONAL | `Get-AuthenticodeSignature` returned `NotSigned`; signing is a distribution gate, not a functional defect. |
| DA-06 | Install | Squirrel payload installs to the standard per-user LocalAppData path | PASS | Installed at `%LOCALAPPDATA%\centrifugal_pump_sizing\app-0.11.1`; updater and uninstall registration present. |
| DA-07 | Setup wrapper | Final unsigned self-extracting Setup completes interactively on a clean Windows account | CONDITIONAL | Automated reruns were held before extraction by the local Windows/OneDrive environment. Identical nupkg installation passed; clean interactive confirmation remains. |
| DA-08 | Uninstall | Bundled uninstaller removes application files without deleting user data | PASS | `Update.exe --uninstall -s` exited 0; application removed; `%APPDATA%\Centrifugal Pump Sizing` retained. |
| DA-09 | Version metadata | Product, company, and version metadata are correct | PASS | Product `Centrifugal Pump Sizing`; company `quakfoolee-dotcom`; version `0.11.1`. |
| DA-10 | Offline operation | Packaged application starts without web-hosted runtime dependencies | PASS | `npm run desktop:smoke` loaded v0.11.1, root, and report controls; standalone contains no external HTTP dependency beyond the SVG namespace declaration. |
| DA-11 | Payload identity | Installed calculation/UI payload is identical to source | PASS | Source and installed SHA-256 both `edd4c6eab8105fc96744ed1d271554301b24ca67697dad4611cf5292baec4ec7`. |
| DA-12 | Case persistence | A saved case remains available after reload/restart | PASS | Installed acceptance saved a unique case and verified it after renderer reload. |
| DA-13 | JSON export | Current case exports through the application UI using the supported schema | PASS | Exported JSON parsed successfully with schema `pumpcalc.case.v1`. |
| DA-14 | JSON import | A modified case imports through the real file input | PASS | Imported case and metadata tag were verified in the saved case library. |
| DA-15 | Units | SI/US selection persists after reload | PASS | US selection persisted in installed acceptance. |
| DA-16 | Themes | Interface theme persists independently after reload | PASS | Control Room Dark persisted in installed acceptance. |
| DA-17 | User-data safety | Acceptance activity restores the prior localStorage state | PASS | Acceptance report records `storageRestored: true`; two filesystem backups were also retained during install testing. |
| DA-18 | Native PDF | Desktop shell generates a valid report PDF with Chromium's native PDF path | PASS | Three-page, 260,400-byte PDF; SHA-256 `59c92889ced402c25dc944d064710486502523a8584880be0f29928e5f42829b`. |
| DA-19 | A4 width | Printable report has no horizontal overflow at the A4 content width | PASS | Measured `clientWidth: 689`, `scrollWidth: 689`, and zero out-of-bounds elements. |
| DA-20 | PDF visual QA | Final rendered pages have no clipping, overlap, broken tables, or oversized chart | PASS | All three pages rendered at 1.5x and were visually reviewed; right-column values wrap and the performance chart scales within the page. |
| DA-21 | Engineering regression | First-principles calculation checks remain unchanged | PASS | All 85 formula checks passed. |
| DA-22 | Browser parity | Desktop payload remains behaviorally compatible with the browser edition | PASS | Browser smoke suite passed; installed standalone is byte-identical to the generated browser standalone. |
| DA-23 | Runtime security | Shipped production dependencies have no reported npm audit findings | PASS | `npm audit --omit=dev` returned 0 vulnerabilities. |
| DA-24 | CI packaging | Windows CI builds, smokes, verifies, and uploads desktop artifacts | PASS | GitHub Actions run `29169217893` passed both `verify` and `desktop`, including Windows artifact upload. |

## PDF defect correction

### Before

Long engineering values in the right report column retained their minimum-content width.
Chromium painted those rows beyond the physical A4 content area, clipping their final
characters. The performance chart also lacked an explicit report-container sizing rule.

### After

- Both report columns use `minmax(0, 1fr)` and allow grid items to shrink.
- Two-column report tables use fixed layout with a defined label/value split.
- Engineering values use controlled wrapping instead of overflowing the sheet.
- The report chart explicitly fills, but does not exceed, its container.
- Installed acceptance now asserts A4-width horizontal bounds automatically.

## Final verification commands

```powershell
npm test
npm run verify:formulas
npm run test:browser
npm run desktop:verify
npm run desktop:make
npm run desktop:verify-artifacts
npm run desktop:smoke
npm run desktop:acceptance:installed
npm run audit:runtime
```

## Release artifacts

- `Centrifugal-Pump-Sizing-Setup-v0.11.1.exe`
- `Centrifugal Pump Sizing-win32-x64-0.11.1.zip`
- `SHA256SUMS-desktop-v0.11.1.txt`

The checksum file is regenerated by `npm run desktop:verify-artifacts` and must accompany
the published desktop assets.
