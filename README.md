# Centrifugal Pump Sizing App

Static, engineer-grade centrifugal pump sizing calculator built as a single-page browser app. Open `index.html` or `Pump_Calculator.html` for the multi-file app, or `Pump_Calculator_standalone.html` for the single self-contained offline file.

## What It Does

- Computes the **system curve** and finds the **duty point** where the pump and system curves intersect — live, as you edit.
- Keeps the **required duty** independent from the predicted pump/system intersection and draws both on live curves with configurable POR/AOR limits.
- Fits pump performance from catalog points `(Q, H, η, NPSHr)` by monotone interpolation with extrapolation/completeness flags, or uses a parametric model.
- Models **hydraulics** with Darcy–Weisbach + Churchill friction, separate suction/discharge roughness, fittings-by-count, fixed equipment ΔP, clean/dirty filters, and valve Kv/Cv.
- Evaluates **normal and worst-case NPSH** with independent ratio/absolute-margin criteria, minimum level/atmosphere, maximum vapor pressure, dirty suction equipment, and configurable suction-specific-speed screening.
- Flags **stability limits** — MCSF, thermal minimum flow, configurable preferred and allowable operating regions.
- Applies **viscosity correction** (HI 9.6.7-style) to the live curve, with a water reference ghost curve.
- Derives **fluid properties from temperature** — exact water correlations (Kell / Vogel / Antoine), generic corrections for other fluids, 20 presets + custom.
- Handles **multi-pump** parallel / series arrangements with explicit operating versus installed/standby counts, one-unavailable/all-running staging, per-branch equipment flow basis, conservative branch-imbalance loading, and correct energy allocation.
- Solves **VFD** speed-for-duty, minimum speed to hold static head, and a speed-family overlay.
- Sizes the **motor from the maximum absorbed-power envelope** across the AOR at maximum scenario density, then reports annual energy, cost, and specific energy at predicted duty.
- Includes a **pipe schedule picker** (DN + Sch 40/80/160 → real ID, ASME B36.10) and an **acceptance tolerance band** (ISO 9906 1B/2B/3B or ANSI-HI 14.6).
- Offers a full **SI ⇄ US unit toggle**, editable **report metadata**, protected **New case** reset, a **case manager** with rename/duplicate/delete/export/import, **shareable case links**, **side-by-side comparison** with a delta table and curve overlay, and a printable **report sheet**.

## Run Locally

Open `Pump_Calculator.html` in a modern browser. For development, a static server avoids `file://` restrictions:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/Pump_Calculator.html
```

For a no-setup, offline copy, open `Pump_Calculator_standalone.html` — everything is inlined into one file.

Optional maintenance commands:

```bash
npm run test
npm run build:standalone
npm run test:browser
npm run verify:formulas
```

`verify:formulas` checks the calculation engine against first-principles
references, including exact unit definitions, a Colebrook-White reference
solver, published water-property values, hand-derived hydraulic identities, and
published pipe/tolerance values.

See `docs/smoke_test_matrix.md` for the smoke-test purpose, coverage matrix,
expected pass output, and current gaps.

## Project Structure

```
index.html                         Root redirect for GitHub Pages
Pump_Calculator.html               Main app (loads the modules below)
Pump_Calculator_standalone.html    Single self-contained build (offline)
styles.css                         CAD / engineering styling
lib/pumpMath.js                    Pump hydraulics engine (SI internally)
lib/units.js                       SI <-> US display-layer conversion
lib/caseLibrary.js                 Case JSON export/import helpers and validation
lib/duty.js                        Shared duty-point/result derivation
components/PumpChart.jsx            SVG performance chart
components/Calculator.jsx          Main calculator screen
components/Report.jsx              Engineering report sheet
components/Compare.jsx             Case comparison view
scripts/smoke-test.mjs             No-dependency calculation smoke test
scripts/verify-formulas.mjs        First-principles formula verification
scripts/browser-smoke-test.mjs     Headless Chrome/Edge workflow smoke test
scripts/build-standalone.mjs       Regenerates the offline standalone file
docs/verify_formulas_reference.md  LaTeX-style verifier formula reference
docs/engineering_upgrade_v0.11.0.md Before/after engineering upgrade record
```

React + Babel load from CDN at runtime, so the `.jsx` files are transpiled in the browser. The Node scripts are only for smoke testing and refreshing the standalone offline artifact.

## Engineering Methods

| Quantity | Method / basis |
|----------|----------------|
| Pipe friction | Darcy–Weisbach with Churchill friction factor |
| Minor/equipment losses | Fitting K-values + fixed clean/dirty ΔP + control-valve Kv/Cv |
| Pump curve | Parametric parabola (shutoff = 1.25 × H_BEP) or monotone interpolation of catalog points |
| Speed & trim | Affinity laws: Q ∝ N·D, H ∝ (N·D)², P ∝ (N·D)³ |
| NPSHa | (P_atm + P_suction)/ρg + Zs − Pv/ρg − suction pipe/equipment losses |
| Acceptance | NPSHa / NPSHr ≥ configurable ratio (HI 9.6.1) |
| Viscosity | HI 9.6.7-style correction factors (C_Q, C_H, C_η) |
| Specific speed | Metric Ns = N·√Q / H^0.75 |
| Pipe dimensions | ASME B36.10 (Sch 40 / 80 / 160) |
| Test tolerance | ISO 9906 (1B/2B/3B) / ANSI-HI 14.6 |
| Driver sizing | Maximum of duty and AOR absorbed-power envelope × configurable margin |

## Units & Conventions

All physics is computed in **SI internally** (m³/h, m, kW, kPa, mm, °C). The US view is a display-layer conversion only, so results stay numerically consistent no matter which system is selected, and editing in one system writes the correct SI value back to state.

## Disclaimer

This is an engineering screening tool. Approximations — notably viscosity above ~300 cP — and any final guarantee point should be confirmed against vendor pump curves and the governing project standards before procurement.
