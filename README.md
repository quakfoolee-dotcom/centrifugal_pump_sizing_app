# Centrifugal Pump Sizing App

Static, engineer-grade centrifugal pump sizing calculator built as a single-page browser app. Open `index.html` or `Pump Calculator.html` for the multi-file app, or `Pump Calculator (standalone).html` for the single self-contained offline file.

## What It Does

- Computes the **system curve** and finds the **duty point** where the pump and system curves intersect — live, as you edit.
- Draws live **pump & system curves** with a draggable operating point, RPM and impeller-trim sliders, BEP marker, and preferred-operating-region band.
- Fits pump performance from **3–5 catalog points** `(Q, H, η, NPSHr)` by least squares, or uses a parametric model.
- Models **hydraulics** with Darcy–Weisbach + Swamee–Jain friction, fittings-by-count (Crane TP-410 K-values), and separate suction/discharge static heads and vessel pressures.
- Evaluates **NPSH & cavitation** — NPSHa vs NPSHr, configurable acceptance ratio (HI 9.6.1), suction specific speed with a high-suction-energy flag.
- Flags **stability limits** — minimum continuous stable flow zone and preferred operating region.
- Applies **viscosity correction** (HI 9.6.7-style) to the live curve, with a water reference ghost curve.
- Derives **fluid properties from temperature** — exact water correlations (Kell / Vogel / Antoine), generic corrections for other fluids, 20 presets + custom.
- Handles **multi-pump** parallel / series arrangements with per-pump and total power split.
- Solves **VFD** speed-for-duty, minimum speed to hold static head, and a speed-family overlay.
- Reports **energy & lifecycle** — annual energy, cost, and specific energy.
- Includes a **pipe schedule picker** (DN + Sch 40/80/160 → real ID, ASME B36.10) and an **acceptance tolerance band** (ISO 9906 1B/2B/3B or ANSI-HI 14.6).
- Offers a full **SI ⇄ US unit toggle**, a **saved-case library**, **side-by-side comparison** with a delta table and curve overlay, and a printable **report sheet**.

## Run Locally

Open `Pump Calculator.html` in a modern browser. For development, a static server avoids `file://` restrictions:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/Pump%20Calculator.html
```

For a no-setup, offline copy, open `Pump Calculator (standalone).html` — everything is inlined into one file.

Optional maintenance commands:

```bash
npm run test
npm run build:standalone
```

## Project Structure

```
index.html                         Root redirect for GitHub Pages
Pump Calculator.html               Main app (loads the modules below)
Pump Calculator (standalone).html  Single self-contained build (offline)
styles.css                         CAD / engineering styling
lib/pumpMath.js                    Pump hydraulics engine (SI internally)
lib/units.js                       SI <-> US display-layer conversion
lib/duty.js                        Shared duty-point/result derivation
components/PumpChart.jsx            SVG performance chart
components/Calculator.jsx          Main calculator screen
components/Report.jsx              Engineering report sheet
components/Compare.jsx             Case comparison view
scripts/smoke-test.mjs             No-dependency calculation smoke test
scripts/build-standalone.mjs       Regenerates the offline standalone file
```

React + Babel load from CDN at runtime, so the `.jsx` files are transpiled in the browser. The Node scripts are only for smoke testing and refreshing the standalone offline artifact.

## Engineering Methods

| Quantity | Method / basis |
|----------|----------------|
| Pipe friction | Darcy–Weisbach with Swamee–Jain explicit friction factor |
| Minor losses | Fitting count × Crane TP-410 K-values |
| Pump curve | Parametric parabola (shutoff = 1.25 × H_BEP) or least-squares fit of catalog points |
| Speed & trim | Affinity laws: Q ∝ N·D, H ∝ (N·D)², P ∝ (N·D)³ |
| NPSHa | (P_atm + P_suction)/ρg + Zs − Pv/ρg − h_f,suction |
| Acceptance | NPSHa / NPSHr ≥ configurable ratio (HI 9.6.1) |
| Viscosity | HI 9.6.7-style correction factors (C_Q, C_H, C_η) |
| Specific speed | Metric Ns = N·√Q / H^0.75 |
| Pipe dimensions | ASME B36.10 (Sch 40 / 80 / 160) |
| Test tolerance | ISO 9906 (1B/2B/3B) / ANSI-HI 14.6 |

## Units & Conventions

All physics is computed in **SI internally** (m³/h, m, kW, kPa, mm, °C). The US view is a display-layer conversion only, so results stay numerically consistent no matter which system is selected, and editing in one system writes the correct SI value back to state.

## Disclaimer

This is an engineering screening tool. Approximations — notably viscosity above ~300 cP — and any final guarantee point should be confirmed against vendor pump curves and the governing project standards before procurement.
