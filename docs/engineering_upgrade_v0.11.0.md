# Engineering Upgrade Record — v0.11.0

Date: 2026-07-10
Scope: pump-engineering correctness, operating envelopes, validation, units,
scenario analysis, reporting, and automated verification.

## Before and After

| Area | Before v0.10.26 | After v0.11.0 |
|---|---|---|
| Duty/standby energy | `single` arrangement could retain `nPumps = 2` and multiply total shaft power and annual energy by two | hydraulic operating count is always one for `single`; installed standby count is separate and excluded from operating energy |
| Design duty | rated flow was derived from the pump/system intersection, so changing the candidate pump changed the apparent requirement | required flow/head is an independent target; predicted intersection is reported separately |
| Catalog units | catalog editor always accepted raw SI values and fractional efficiency | flow/head/NPSHr follow the active SI/US system and efficiency is entered as percent |
| Input validity | several non-physical values or malformed catalog rows could be silently ignored or clamped | blocking validation reports invalid fluid, pipe, pump, duty, suction-pressure, and catalog data |
| NPSH flags | a failed absolute margin could be described incorrectly as a ratio failure | ratio and absolute-margin criteria are evaluated and reported independently |
| NPSH basis | normal operating point only | normal duty plus worst-case rated flow at minimum suction level, minimum atmospheric pressure, maximum vapor pressure, and dirty equipment |
| Motor sizing | duty-point absorbed power × fixed 1.15 | maximum of duty power and sampled AOR absorbed-power envelope at maximum scenario density × configurable margin |
| Pipe model | one roughness value for both lines | separate suction and discharge roughness |
| Equipment losses | fittings-only K-value model | fixed ΔP, clean/dirty filter, and control-valve Kv/Cv rows on either suction or discharge |
| Operating limits | fixed POR and one minimum-flow percentage | configurable POR, AOR, MCSF, thermal minimum flow, and suction-specific-speed limit |
| Multi-pump model | operating and installed counts were conflated | operating set and installed/standby counts are explicit; all-running/one-unavailable staging and conservative branch-imbalance loading are reported |
| Fluid safeguards | estimated preset properties with limited range enforcement | correlation-range, freezing/liquid-range, and suction boiling checks are reported |
| Scenario analysis | one fixed liquid level pair | minimum/normal/maximum suction and discharge levels with best/normal/worst intersections |
| Report | normal-duty summary | required vs predicted duty, scenario envelope, clean/dirty equipment loss, motor envelope, worst NPSH, POR/AOR, and screening disclaimer |
| Formula verification | 82 checks passing | 85 checks passing, including independent rated duty, single-pump power, and equipment ΔP-to-head conversion |

### Default-case numerical delta

The hydraulic operating point is unchanged by the duty/standby correction;
the power and energy basis is corrected from two operating pumps to one:

| Result | Before | After | Change |
|---|---:|---:|---:|
| Predicted flow | 149.606 m³/h | 149.606 m³/h | unchanged |
| Predicted head | 27.566 m | 27.566 m | unchanged |
| Total shaft power | 30.414 kW | 15.207 kW | −50.0% |
| Motor input power | 33.050 kW | 16.525 kW | −50.0% |
| Annual energy at 8,000 h/y | 264.401 MWh/y | 132.200 MWh/y | −50.0% |
| Rated flow basis | 164.566 m³/h (predicted duty +10%) | 121.000 m³/h (required 110 +10%) | process requirement no longer changes with pump |
| Motor sizing basis per operating pump | duty point only | 15.698 kW maximum duty/AOR basis before margin | non-overloading screen added |
| Worst-case rated NPSH | not evaluated | ratio 2.662; absolute margin 5.359 m | explicit pass/fail available |

## Improvement-list Traceability

1. Single-pump power multiplication corrected in `PumpMath.nP` and `computeDuty`.
2. `installedPumps` is separate from simultaneously operating `nPumps`.
3. Duty/standby is represented as operating versus installed counts.
4. Catalog Q/H/NPSHr fields convert through the active unit layer.
5. Required duty is independent of the predicted system intersection.
6. Hydraulic, fluid, pump, curve, and design input validation is blocking.
7. Catalog efficiency is displayed and entered as percent.
8. Invalid catalog rows are identified by row instead of silently accepted.
9. Driver sizing uses the maximum absorbed-power basis.
10. The motor envelope includes the configured AOR and maximum scenario density.
11. NPSH ratio and absolute-margin failures have separate status fields/messages.
12. Minimum/normal/maximum source and destination levels are modeled.
13. Worst NPSHa includes minimum atmosphere, maximum vapor pressure, minimum source level, dirty suction equipment, and rated flow.
14. Fixed equipment ΔP and control-valve Kv/Cv inputs are supported.
15. Clean and dirty filter/equipment loss conditions are supported.
16. Suction and discharge roughness are independent.
17. POR and AOR limits are configurable from vendor data.
18. MCSF and thermal minimum flow are distinct inputs.
19. Parallel one-pump, one-unavailable, and all-operating intersections are calculated automatically.
20. Equipment can use per-branch flow and a configurable flow-imbalance factor increases worst-pump NPSHr and driver loading; the combined hydraulic curve remains an equal-base-flow screening model.
21. Fluid temperature correlation and liquid-range warnings are implemented.
22. Suction absolute pressure is checked against vapor pressure.
23. High-viscosity service remains screening-only and requires vendor curves.
24. The suction-specific-speed screening limit is configurable.
25. The input-panel unit badge follows SI/US selection.
26. New equipment, scenario, power-envelope, and NPSH results are included in the printable report.
27. Regression tests cover operating counts, units, invalid inputs, independent NPSH criteria, duty independence, equipment losses, motor basis, and scenario evaluation.
28. Calculator and report explicitly identify the result as screening/duty-checking unless validated vendor guarantee data are entered.

## Verification Results

Before:

- `npm test`: pass.
- `npm run verify:formulas`: 82/82 checks pass.

After:

- `npm test`: pass.
- `npm run verify:formulas`: 85/85 checks pass.
- `npm run build:standalone`: pass and artifact regenerated.
- `npm run test:browser`: pass for flags, layout, accessible tabs, chart
  hover, new case, case manager, sharing, metadata, import/export, numeric
  inputs, units, and report printing.

## Remaining Engineering Boundaries

- Parallel pumps still assume identical curves and equal branch flow. Model
  materially unequal branches as separate cases or validate in a network solver.
- Series pumps assume ideal head addition without interstage loss.
- Viscosity and non-water property corrections remain screening correlations.
- MCSF, POR, AOR, NPSHr, and final driver loading must be confirmed using the
  selected vendor's certified curves and project purchase specification.
- The tool does not replace a vendor guarantee, transient/surge analysis,
  mechanical shaft/rotordynamic review, or piping flexibility analysis.
