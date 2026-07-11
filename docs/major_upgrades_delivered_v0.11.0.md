# Major Upgrades Delivered — v0.11.0

Date: 2026-07-10

## Purpose

This document records what was updated in the Centrifugal Pump Sizing App,
why each change was required, the engineering result produced by the change,
and the verification used to confirm the implementation.

Version 0.11.0 remains an engineering screening and duty-checking tool. Final
pump selection, guaranteed performance, NPSHr, allowable operating range, and
driver rating must be confirmed using certified vendor curves and the project
purchase specification.

## Executive Result

The most significant correction was separating installed standby pumps from
pumps actually operating. The default case represents one duty pump plus one
standby pump. Previously, the hydraulic calculation used one pump while power
and energy could be multiplied by the two installed pumps. Version 0.11.0 uses
only operating pumps for power and energy.

The hydraulic operating point therefore remains unchanged while the default
case power and energy are corrected:

| Default-case result | Before | After | Result |
|---|---:|---:|---|
| Predicted operating flow | 149.606 m³/h | 149.606 m³/h | Hydraulic result unchanged |
| Predicted operating head | 27.566 m | 27.566 m | Hydraulic result unchanged |
| Total shaft power | 30.414 kW | 15.207 kW | Corrected by −50.0% |
| Motor input power | 33.050 kW | 16.525 kW | Corrected by −50.0% |
| Annual energy at 8,000 h/y | 264.401 MWh/y | 132.200 MWh/y | Corrected by −50.0% |
| Annual cost at $0.12/kWh | $31,728/y | $15,864/y | Corrected by −50.0% |
| Rated-flow basis | 164.566 m³/h | 121.000 m³/h | Now based on required 110 m³/h + 10%, not the candidate-pump intersection |
| Motor sizing basis per operating pump | Duty point only | 15.698 kW before margin | Duty and AOR power envelope checked |
| Worst-case rated NPSH | Not evaluated | Ratio 2.662; margin 5.359 m | Explicit worst-case acceptance result |

## Upgrade Register

### 1. Installed, Operating, and Standby Pump Counts

**Before:** `nPumps` could represent installed equipment even when the
hydraulic arrangement was `single`. Total shaft power and annual energy were
then multiplied by the installed count.

**Updated:**

- `installedPumps` records all installed units.
- `nPumps` records simultaneously operating units for parallel or series sets.
- A `single` arrangement always has one operating pump.
- Standby pumps are shown in the calculator and report but excluded from
  operating power and energy.

**Result:** The default duty/standby case now reports one operating pump, two
installed pumps, 15.207 kW total shaft power, and 132.200 MWh/y.

**Implementation:** `lib/pumpMath.js` (`nP`), `lib/duty.js`,
`components/Calculator.jsx`, and `components/Report.jsx`.

### 2. Independent Required Duty and Predicted Operating Point

**Before:** Rated flow was derived from the candidate pump/system
intersection. Changing the pump could therefore change the apparent process
requirement.

**Updated:** Required flow and head are independent inputs. Required head may
come from the system curve at required flow or from a manual head input. The
predicted operating point remains the pump/system intersection.

**Result:** With required flow 110 m³/h and a 10% flow margin, rated flow is
121.000 m³/h regardless of the selected candidate pump. The predicted default
operating flow remains 149.606 m³/h and is reported separately.

### 3. SI/US Catalog-Curve Entry

**Before:** Catalog Q, H, and NPSHr fields always accepted internal SI values,
even when the app displayed US units. Efficiency was entered as a fraction.

**Updated:** Catalog flow, head, and NPSHr follow the active SI/US display
system. Efficiency is entered and displayed as percent and converted to the
internal fraction.

**Result:** Vendor curve data can be entered directly in the selected unit
system without accidental gpm-to-m³/h or ft-to-m conversion errors.

### 4. Blocking Engineering Validation and Catalog Errors

**Before:** Some non-physical inputs could propagate invalid results, while
malformed catalog rows could be ignored or clamped without a clear row error.

**Updated:** Calculation is blocked for invalid density, viscosity, pipe
diameter, length, roughness, pump BEP data, speed, impeller diameter, required
duty, atmospheric/vapor pressure relationship, or catalog data. Catalog errors
identify the affected row.

**Result:** Invalid cases do not produce plausible-looking duty, power, or
NPSH results.

### 5. Independent NPSH Ratio and Absolute Margin

**Before:** A failure caused only by the absolute NPSH margin could be described
as a ratio failure.

**Updated:** The app calculates and reports separate Boolean results for:

- `NPSHa / NPSHr ≥ required ratio`; and
- `NPSHa − NPSHr ≥ required absolute margin`.

**Result:** The warning identifies the actual failed criterion. Both criteria
must pass for an acceptable result.

### 6. Worst-Case Rated NPSH Scenario

**Before:** NPSH was evaluated only at the normal predicted operating point.

**Updated:** Worst-case NPSH is evaluated at rated flow using minimum suction
level, minimum atmospheric pressure, maximum vapor pressure, maximum scenario
density, and dirty suction equipment losses.

**Result:** The default worst-case rated result is NPSHa/NPSHr = 2.662 with an
absolute margin of 5.359 m, passing the configured criteria.

### 7. Configurable POR, AOR, MCSF, Thermal Minimum, and Nss

**Before:** Preferred range and suction-specific-speed thresholds were fixed,
and minimum flow was represented by one percentage.

**Updated:** The user can enter vendor/service-specific:

- preferred operating region minimum and maximum;
- allowable operating region minimum and maximum;
- minimum continuous stable flow as percent of BEP;
- thermal minimum flow per pump; and
- suction-specific-speed screening limit.

**Result:** Duty and rated points are classified as inside POR, inside AOR, or
outside AOR. The governing minimum flow is the greater of MCSF and thermal
minimum.

### 8. Maximum Absorbed-Power Motor Envelope

**Before:** Motor selection used only duty-point absorbed power with a fixed
15% multiplier.

**Updated:** The app samples absorbed power across the configured AOR using
maximum scenario density. The motor basis is the greater of duty-point power
and maximum sampled AOR power, followed by a configurable sizing margin and
selection of the next standard IEC/NEMA rating.

**Result:** The default per-pump sizing basis is 15.698 kW before the 15%
margin, resulting in an 18.5 kW IEC motor recommendation.

### 9. Minimum, Normal, and Maximum Liquid Levels

**Before:** Only one suction and discharge level pair was evaluated.

**Updated:** Minimum, normal, and maximum source and destination levels are
stored. The app solves best, normal, and worst hydraulic intersections.

**Result for the default case:**

| Scenario | Predicted flow | Predicted head |
|---|---:|---:|
| Best hydraulic | 156.3 m³/h | 26.4 m |
| Normal | 149.6 m³/h | 27.6 m |
| Worst hydraulic | 142.6 m³/h | 28.7 m |

### 10. Parallel-Pump Staging

**Before:** The selected parallel operating count was solved, but one-pump,
one-unavailable, and all-running results were not presented together.

**Updated:** Parallel configurations automatically solve each operating count
from one pump through all selected operating pumps. One-unavailable and
all-running cases are explicitly labelled.

**Result:** Operators and reviewers can see the expected intersection for each
staging state without creating separate calculations.

### 11. Conservative Parallel Branch Imbalance

**Before:** Parallel pumps assumed perfectly equal branch flow for NPSHr and
driver loading.

**Updated:** A configurable positive branch-flow imbalance is applied to the
worst-loaded pump:

`Qbranch,worst = Qtotal / noperating × (1 + imbalance/100)`

Worst-pump NPSHr and absorbed power use this branch flow.

**Result:** Driver and cavitation screening can include a conservative allowance
for imperfect branch balance. The combined hydraulic curve remains an
equal-base-flow approximation.

### 12. Per-Branch or Total-Flow Equipment Loss Basis

**Before:** Equipment losses could not distinguish common piping from identical
parallel branches.

**Updated:** Each equipment row may use total system flow or per-pump branch
flow. For a parallel per-branch row, loss is evaluated at
`Qtotal / noperating`.

**Result:** Individual branch check valves, strainers, and valves can be modeled
without incorrectly applying total station flow through each item.

### 13. Control-Valve Kv/Cv and Clean/Dirty Equipment ΔP

**Before:** Minor losses were limited primarily to generic fitting K-values.

**Updated:** Equipment rows support:

- fixed differential pressure at a reference flow;
- clean and dirty filter/strainer differential pressure;
- metric Kv or US Cv control-valve coefficients;
- suction or discharge location; and
- total-flow or per-branch flow basis.

Losses scale with flow squared. Suction equipment reduces NPSHa as well as
increasing system head.

**Result:** The system curve and worst-case NPSH now include important process
equipment losses.

### 14. Separate Suction and Discharge Roughness

**Before:** One roughness value was shared by both lines.

**Updated:** `epsS` and `epsD` are entered and applied separately, with the old
`eps` value retained as an import fallback.

**Result:** Systems with different suction and discharge materials, schedules,
or aging allowances can be represented correctly.

### 15. Fluid Correlation, Freezing, and Boiling Safeguards

**Before:** Preset properties were estimated without consistently enforcing the
screening correlation/liquid range.

**Updated:** Fluid state records a valid temperature range and freezing point
where available. Warnings identify out-of-range temperatures and possible
freezing. A blocking check confirms that suction absolute pressure exceeds
vapor pressure.

**Result:** The app rejects a physically boiling suction condition and clearly
discloses when fluid-property correlations are being extrapolated.

### 16. Expanded Printable Engineering Report

**Before:** The report focused on the normal solved duty.

**Updated:** The report now includes:

- required versus predicted duty;
- installed, operating, and standby counts;
- scenario and staging envelopes;
- suction/discharge and clean/dirty equipment losses;
- normal and worst-case NPSH;
- POR/AOR classification and minimum-flow bases;
- maximum absorbed-power motor basis; and
- explicit model assumptions and screening disclaimer.

**Result:** The printed calculation provides the principal inputs, governing
cases, warnings, and selection basis needed for technical review.

### 17. Updated Offline Standalone Application

**Before:** The standalone HTML contained the pre-upgrade calculation and UI.

**Updated:** `Pump_Calculator_standalone.html` was regenerated from the v0.11.0
sources and checked for deterministic rebuild output.

**Result:** The new engineering features are available in the offline file
without CDN access.

## Verification Evidence

| Verification | Result |
|---|---|
| `npm test` | Passed calculation, validation, staging, equipment, units, case, and source-wiring regression tests |
| `npm run verify:formulas` | 85 of 85 first-principles checks passed; previously 82 of 82 |
| `npm run build:standalone` | Passed; standalone artifact regenerated and hash-idempotent |
| `npm run test:browser` | Passed rendered flags, layout, tabs, chart, cases, sharing, metadata, import/export, numeric inputs, units, and report printing |
| `git diff --check` | Passed |

New regression assertions specifically cover:

- single duty/standby power and energy;
- independence of required duty from the candidate pump;
- SI/US unit conversion;
- separate NPSH ratio and absolute-margin status;
- invalid hydraulic and catalog inputs;
- fixed ΔP, Kv, and per-branch equipment losses;
- motor duty/AOR power basis;
- best/normal/worst hydraulic scenarios;
- parallel one-unavailable/all-running staging; and
- worst-branch flow and NPSHr under configured imbalance.

## Remaining Engineering Limitations

- Parallel combined curves still use an identical-pump, equal-base-flow model.
  The imbalance input conservatively adjusts worst-pump loading and NPSHr; it
  is not a full hydraulic-network solution.
- Series operation assumes ideal head addition without interstage losses.
- Generic fitting K-values require geometry/vendor confirmation for final
  design.
- Viscosity correction and non-water property presets remain screening models.
- The app does not perform transient/surge, piping flexibility, shaft,
  rotordynamic, seal-system, material compatibility, or structural analysis.
- Vendor-certified performance and the governing project standard remain the
  final basis for procurement and guarantee acceptance.

## Related Documents

- `docs/engineering_upgrade_v0.11.0.md` — implementation traceability and
  before/after release record.
- `docs/mathematical_formula_manual.md` — equations, assumptions, and limits.
- `docs/verify_formulas_reference.md` — first-principles verification basis.
- `docs/smoke_test_matrix.md` — automated test coverage.
- `docs/engineering_change_record.md` — engineering audit history.
