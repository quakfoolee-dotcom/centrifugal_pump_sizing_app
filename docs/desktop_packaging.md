# Windows Desktop Packaging

The completed v0.11.1 verification record is available in
[`desktop_acceptance_matrix_v0.11.1.md`](desktop_acceptance_matrix_v0.11.1.md).

The desktop edition wraps the self-contained offline application in Electron.
It does not require a browser installation, WebView2, or internet access at
runtime.

## Local Commands

```powershell
npm ci
npm run desktop:prepare
npm run desktop:verify
npm run desktop:start
npm run desktop:make
npm run desktop:smoke
npm run desktop:acceptance:installed
npm run desktop:verify-artifacts
```

`desktop:start` launches the unpackaged application for acceptance testing.
`desktop:make` creates a per-user Squirrel installer and a portable ZIP under
`out/make/` for Windows x64.
`desktop:smoke` launches the packaged executable without network access, waits
for the v0.11.1 application and report control to render, records the result,
and exits automatically.
`desktop:acceptance:installed` connects to the installed application through a
temporary local DevTools endpoint, verifies case persistence, JSON exchange,
themes, SI/US state, report PDF output, and version identity, then restores the
user's original local storage.

Desktop packaging is pinned to Node.js 24 LTS. The application itself does not
require Node.js after installation. Node 25 removed a filesystem API still used
by Forge's ZIP maker, so the build guard stops immediately with a clear message
when an unsupported maintainer runtime is used.

`desktop:verify-artifacts` writes
`out/make/SHA256SUMS-desktop-v0.11.1.txt` for release distribution. The full
Forge development tree currently reports transitive build-tool advisories;
`npm run audit:runtime` is the release gate and must report zero vulnerabilities
for dependencies shipped inside the installed application.

## Security Boundary

- The renderer has Node integration disabled.
- Context isolation and Chromium sandboxing are enabled.
- New windows, embedded webviews, and navigation away from the bundled app are
  blocked.
- Runtime content is the committed standalone HTML; no CDN is required.
- The application menu provides native print and direct PDF export.

## User Data

Electron stores the application's local browser profile under the Windows user
profile. Saved cases and theme preferences persist across normal upgrades as
long as the product name remains `Centrifugal Pump Sizing`. Case JSON export
remains the supported backup and browser-to-desktop migration mechanism.

## Signing and Public Distribution

Local builds are unsigned. Windows may show an Unknown Publisher or SmartScreen
warning. A public installer should be Authenticode-signed in CI using a trusted
code-signing certificate or managed signing service. Signing credentials must
never be committed to the repository.

After signing is configured, publish the setup executable, portable ZIP,
SHA-256 checksums, release notes, LICENSE, and NOTICE as versioned GitHub Release
assets.
