# Verify Formulas Reference

Source script: `scripts/verify-formulas.mjs`

Command: `npm run verify:formulas`

Expected pass output: `verify-formulas: all 85 first-principles checks passed`

## Objective

This document translates the 85-check formula verifier into a readable
engineering reference with LaTeX-style equations. The verifier compares app
outputs against independent references: exact legal unit definitions, a
Colebrook-White friction reference, published water-property points, hand
hydraulic identities, ASME B36.10 pipe dimensions, and ISO 9906 tolerance
constants.

The verifier is a regression and reasonableness check. It does not replace
certified vendor curves, HI chart calibration, project specifications, or final
engineering review.

## Pass Criterion

Each check compares the app output, $x_a$, with an expected reference value,
$x_e$.

$$
e_{abs} = |x_a - x_e|
$$

$$
e_{rel} =
\begin{cases}
\dfrac{|x_a - x_e|}{|x_e|}, & x_e \ne 0 \\
|x_a - x_e|, & x_e = 0
\end{cases}
$$

A check passes when $e_{rel}$ is less than or equal to the tolerance assigned in
`verify-formulas.mjs`. The default tolerance is $10^{-6}$ unless the script
sets a looser value for published correlations or accepted approximation bands.

## Check Count

| Section | Check group | Count |
|---|---:|---:|
| 1 | Unit conversions | 10 |
| 2 | Hydraulics from first principles | 14 |
| 3 | Water properties vs published data | 9 |
| 4 | Pump curve model identities | 7 |
| 5 | Affinity laws | 6 |
| 6 | Power and specific speed | 4 |
| 7 | Viscosity correction calibration points | 7 |
| 8 | Parallel and series arrangements | 4 |
| 9 | Duty solution consistency and equipment loss | 10 |
| 10 | Motor selection and efficiency | 4 |
| 11 | Pipe schedule vs ASME B36.10 | 4 |
| 12 | ISO 9906:2012 acceptance grades | 6 |
|  | Total | 85 |

## 1. Unit Conversions

### Exact Constants

| Symbol | Value | Meaning |
|---|---:|---|
| $G_L$ | 3.785411784 | US gallon, L/gal |
| $F_m$ | 0.3048 | foot, m/ft |
| $I_{mm}$ | 25.4 | inch, mm/in |
| $L_{kg}$ | 0.45359237 | pound mass, kg/lb |
| $g$ | 9.80665 | standard gravity, $\text{m/s}^2$ |

Horsepower and psi are derived rather than copied as rounded constants.

$$
P_{hp,W} = 550 F_m L_{kg} g
$$

$$
p_{psi,Pa} = \frac{L_{kg}g}{(I_{mm}/1000)^2}
$$

### Conversion Equations

Flow:

$$
Q_{gpm} = Q_{\text{m}^3\text{/h}}
\frac{1000}{G_L \cdot 60}
$$

Head:

$$
H_{ft} = \frac{H_m}{F_m}
$$

Power:

$$
P_{hp} = \frac{1000P_{kW}}{P_{hp,W}}
$$

Pressure:

$$
p_{psi} = \frac{1000p_{kPa}}{p_{psi,Pa}}
$$

Diameter:

$$
D_{in} = \frac{D_{mm}}{I_{mm}}
$$

Density:

$$
\rho_{\text{lb/ft}^3} =
\rho_{\text{kg/m}^3}\frac{F_m^3}{L_{kg}}
$$

Specific energy:

$$
E_{\text{kWh/kgal}} = E_{\text{kWh/m}^3}G_L
$$

Temperature:

$$
T_F = \frac{9}{5}T_C + 32
$$

$$
T_C = \frac{5}{9}(T_F - 32)
$$

The verifier checks these equations with sample values including
$1 \ \text{m}^3\text{/h}$, $1 \ \mathrm{m}$, $1 \ \mathrm{kW}$,
$1 \ \mathrm{kPa}$, $1 \ \mathrm{mm}$, $1 \ \text{kg/m}^3$,
$1 \ \text{kWh/m}^3$, $100^\circ \mathrm{C}$, and a temperature round trip.

## 2. Hydraulics From First Principles

### Flow Area And Velocity

For an inside diameter $D$ in meters:

$$
A = \frac{\pi D^2}{4}
$$

For app inputs $Q$ in $\text{m}^3\text{/h}$:

$$
Q_s = \frac{Q}{3600}
$$

$$
v = \frac{Q_s}{A}
$$

Sample check:

$$
D = 0.1 \ \mathrm{m}, \quad Q = 36 \ \text{m}^3\text{/h}
$$

$$
v = \frac{36/3600}{\pi(0.1)^2/4}
= 1.2732395 \ \text{m/s}
$$

### Reynolds Number

The app accepts viscosity in cP, so the verifier converts to Pa s:

$$
\mu_{Pa \cdot s} = 10^{-3}\mu_{cP}
$$

$$
Re = \frac{\rho vD}{\mu_{Pa \cdot s}}
$$

Sample check:

$$
Re = \frac{1000(1.2732395)(0.1)}{0.001}
= 127323.95
$$

### Friction Factor References

For laminar reference checks:

$$
f = \frac{64}{Re}
$$

For turbulent reference checks, the verifier solves the Colebrook-White
equation iteratively:

$$
\frac{1}{\sqrt{f}} =
-2\log_{10}\left(\frac{\epsilon/D}{3.7}
+ \frac{2.51}{Re\sqrt{f}}\right)
$$

The script compares the app's Churchill friction factor to Colebrook-White for
five turbulent cases:

| $Re$ | $\epsilon/D$ |
|---:|---:|
| $1.0\times10^4$ | 0.00046 |
| $1.0\times10^5$ | 0.00046 |
| $1.0\times10^6$ | 0.00046 |
| $5.0\times10^4$ | 0.002 |
| $1.0\times10^7$ | 0.00001 |

The tolerance is intentionally looser for this comparison because Churchill and
Colebrook-White are different published correlations.

### Darcy-Weisbach Head Loss

The verifier calculates the hand reference:

$$
h_f =
f\frac{L}{D}\frac{v^2}{2g}
+ K\frac{v^2}{2g}
$$

Sample case:

$$
Q=36 \ \text{m}^3\text{/h}, \quad
L=100 \ \mathrm{m}, \quad
D=0.1 \ \mathrm{m}, \quad
K=2
$$

### System Head Decomposition

Static lift:

$$
H_{static} = Z_d - Z_s
$$

Vessel pressure head, with pressure in kPa:

$$
H_p = \frac{1000(P_d - P_s)}{\rho g}
$$

System head:

$$
H_{sys}(Q) = H_{static} + H_p + h_{f,s}(Q) + h_{f,d}(Q)
$$

Zero-flow NPSHa:

$$
NPSHa =
\frac{1000(P_{atm}+P_s)}{\rho g}
+ Z_s
- \frac{1000P_v}{\rho g}
- h_{f,s}(Q)
$$

For the verifier's zero-flow sample:

$$
Z_s=2 \ \mathrm{m}, \quad Z_d=10 \ \mathrm{m},
\quad P_d-P_s=100 \ \mathrm{kPa}
$$

$$
H_{static}=8 \ \mathrm{m}
$$

$$
H_p = \frac{100000}{1000g}=10.1972 \ \mathrm{m}
$$

## 3. Water Properties Vs Published Data

The verifier checks the app water-property functions against published reference
points. The script does not derive these values from the app equations.

| Property | Temperature | Reference value |
|---|---:|---:|
| Water density | $20^\circ \mathrm{C}$ | $998.207 \ \text{kg/m}^3$ |
| Water density | $4^\circ \mathrm{C}$ | $999.972 \ \text{kg/m}^3$ |
| Water density | $50^\circ \mathrm{C}$ | $988.04 \ \text{kg/m}^3$ |
| Water viscosity | $20^\circ \mathrm{C}$ | $1.0016 \ \mathrm{cP}$ |
| Water viscosity | $50^\circ \mathrm{C}$ | $0.5474 \ \mathrm{cP}$ |
| Water viscosity | $80^\circ \mathrm{C}$ | $0.3550 \ \mathrm{cP}$ |
| Water vapor pressure | $20^\circ \mathrm{C}$ | $2.339 \ \mathrm{kPa}$ |
| Water vapor pressure | $50^\circ \mathrm{C}$ | $12.352 \ \mathrm{kPa}$ |
| Water vapor pressure | $100^\circ \mathrm{C}$ | $101.325 \ \mathrm{kPa}$ |

## 4. Pump Curve Model Identities

### Parametric Pump Curve

For the reference pump:

$$
Q_b = 120 \ \text{m}^3\text{/h}, \quad
H_b = 32 \ \mathrm{m}, \quad
\eta_{max}=0.78, \quad
NPSHr_b=3.2 \ \mathrm{m}
$$

The shutoff head identity is:

$$
H(0) = 1.25H_b
$$

The BEP identities are:

$$
H(Q_b)=H_b
$$

$$
\eta(Q_b)=\eta_{max}
$$

$$
NPSHr(Q_b)=NPSHr_b
$$

The shutoff NPSHr identity is:

$$
NPSHr(0)=0.55NPSHr_b
$$

### Catalog Interpolation And Extrapolation

For two catalog points $(Q_a,H_a)$ and $(Q_b,H_b)$:

$$
H(Q) = H_a + \frac{Q-Q_a}{Q_b-Q_a}(H_b-H_a)
$$

The verifier checks interpolation between $(120,32)$ and $(200,17)$ at
$Q=150$:

$$
H(150) = 32 + \frac{150-120}{200-120}(17-32)
= 26.375 \ \mathrm{m}
$$

It also checks high-flow extrapolation from the last slope with a floor at zero:

$$
H(240)=\max\left(0,17+\frac{17-32}{80}(240-200)\right)
=9.5 \ \mathrm{m}
$$

## 5. Affinity Laws

Speed and impeller diameter scale factors are:

$$
s_N = \frac{N}{N_0}
$$

$$
s_D = \frac{D}{D_0}
$$

The verifier checks:

$$
Q_{BEP} = Q_{b,0}s_Ns_D
$$

$$
H_{BEP} = H_{b,0}(s_Ns_D)^2
$$

$$
NPSHr_{BEP} = NPSHr_{b,0}(s_Ns_D)^2
$$

Half-speed example:

$$
s_N = \frac{1475}{2950}=0.5
$$

$$
Q_{BEP}=120(0.5)=60 \ \text{m}^3\text{/h}
$$

$$
H_{BEP}=32(0.5)^2=8 \ \mathrm{m}
$$

Impeller trim example:

$$
s_D = \frac{234}{260}=0.9
$$

$$
Q_{BEP}=120(0.9)=108 \ \text{m}^3\text{/h}
$$

$$
H_{BEP}=32(0.9)^2=25.92 \ \mathrm{m}
$$

## 6. Power And Specific Speed

### Hydraulic Power

With $Q$ in $\text{m}^3\text{/h}$:

$$
P_{hyd} =
\frac{\rho g (Q/3600)H}{1000}
$$

Sample:

$$
P_{hyd} =
\frac{998g(120/3600)(32)}{1000}
$$

### Brake Power

$$
P_{brake} = \frac{P_{hyd}}{\eta}
$$

Sample:

$$
P_{brake} =
\frac{998g(120/3600)(32)}{1000(0.78)}
$$

### Metric Specific Speed

The app's metric specific speed uses $Q$ in $\text{m}^3\text{/s}$:

$$
N_s = \frac{N\sqrt{Q/3600}}{H^{0.75}}
$$

Sample:

$$
N_s = \frac{2950\sqrt{120/3600}}{32^{0.75}}
$$

### Suction Specific Speed Conversion Check

The US conversion factor is:

$$
F_{US} =
\frac{\sqrt{1000 \cdot 60/G_L}}{(1/F_m)^{0.75}}
$$

The verifier checks that the metric high-suction-energy threshold maps to the
customary US threshold:

$$
213F_{US} \approx 11000
$$

## 7. Viscosity Correction Calibration Points

For the verifier basis pump:

$$
Q_b=120 \ \text{m}^3\text{/h}, \quad
H_b=32 \ \mathrm{m}, \quad
N_s=40, \quad R_Q=1
$$

For $\mu < 10 \ \mathrm{cP}$, no correction is applied:

$$
C_{\eta}=1
$$

For the checked high-viscosity points:

$$
C_{\eta} = 1.32 - 0.13\ln(\mu)
$$

The verifier checks this at:

$$
\mu = 40,\ 150,\ 1000 \ \mathrm{cP}
$$

At BEP, the associated factors checked by the script are:

$$
C_H = 1 - 0.30(1-C_{\eta})
$$

$$
C_Q = 1 - 0.25(1-C_{\eta})
$$

$$
C_{NPSH} = 1 + 0.28(1-C_{\eta})
$$

For $\mu=150 \ \mathrm{cP}$:

$$
C_{\eta}=1.32 - 0.13\ln(150)
$$

## 8. Parallel And Series Arrangements

For identical pumps in parallel:

$$
H_{parallel}(Q_{total}) = H_1\left(\frac{Q_{total}}{n}\right)
$$

$$
Q_{BEP,parallel} = nQ_{BEP,1}
$$

For three parallel pumps:

$$
H_{parallel}(360) = H_1(120)
$$

$$
Q_{BEP,parallel}=3(120)=360 \ \text{m}^3\text{/h}
$$

For identical pumps in series:

$$
H_{series}(Q) = nH_1(Q)
$$

For two series pumps:

$$
H_{series}(120)=2H_1(120)
$$

The per-pump flow in series is the total flow:

$$
Q_{per}=Q_{total}
$$

## 9. Duty Solution Consistency

The verifier solves the default water duty state and checks internal
consistency rather than relying on a hard-coded solved flow.

### Pump/System Residual

At the solved duty point:

$$
r_H =
\left|H_{pump}(Q_{duty}) - H_{sys}(Q_{duty})\right|
$$

The check expects:

$$
r_H \approx 0
$$

### TDH And Delivered Head

$$
TDH = H_{delivered}
$$

### Motor Input Power

$$
P_{motor} = \frac{P_{brake}}{\eta_m}
$$

### Annual Energy

$$
E_{yr} = P_{motor}t
$$

The sample uses:

$$
t=8000 \ \text{h/y}
$$

### Specific Energy

$$
E_s = \frac{P_{motor}}{Q_{duty}}
$$

### Rated Flow

For a 10 percent design flow margin:

$$
Q_{rated}=1.10Q_{required}
$$

The required flow is independent of the predicted candidate-pump intersection.

### Single Operating Pump

For a duty/standby installation in `single` arrangement:

$$
n_{operating}=1
$$

$$
P_{shaft,total}=P_{shaft,each}
$$

### Equipment Differential Pressure

At the reference flow, a 10 kPa equipment differential pressure converts to:

$$
h_{equipment}=\frac{10{,}000}{\rho g}
$$

### VFD Speed Solution

The VFD target-speed check verifies that the solved speed makes the pump curve
pass through the selected target flow and system head:

$$
H_{pump}(Q_{selected},N_{solved}) = H_{sys}(Q_{selected})
$$

## 10. Motor Selection And Efficiency

### Service Factor

The required motor size is:

$$
P_{req}=SF \cdot P_{brake}
$$

The verifier uses:

$$
SF=1.15
$$

Examples:

$$
P_{brake}=12 \ \mathrm{kW}
\Rightarrow P_{req}=13.8 \ \mathrm{kW}
\Rightarrow P_{IEC}=15 \ \mathrm{kW}
$$

$$
P_{brake}=40 \ \mathrm{kW}
\Rightarrow P_{req}=46 \ \mathrm{kW}
\Rightarrow P_{IEC}=55 \ \mathrm{kW}
$$

Required horsepower consistency:

$$
P_{req,hp} = \frac{1000P_{req,kW}}{P_{hp,W}}
$$

### Motor Efficiency Interpolation

For interpolation between two catalog motor-efficiency points:

$$
\eta_m(P)=
\eta_a + \frac{P-P_a}{P_b-P_a}(\eta_b-\eta_a)
$$

At $P=15 \ \mathrm{kW}$, between $11 \ \mathrm{kW}$ at 0.910 and
$22 \ \mathrm{kW}$ at 0.925:

$$
\eta_m(15)=0.910+\frac{15-11}{22-11}(0.925-0.910)
$$

## 11. Pipe Schedule Vs ASME B36.10

Pipe inside diameter is checked from outside diameter and wall thickness:

$$
ID = OD - 2t
$$

The verifier checks these published table values:

| Pipe | Equation | Expected ID |
|---|---|---:|
| DN150 Sch 40 | $168.3 - 2(7.11)$ | $154.08 \ \mathrm{mm}$ |
| DN100 Sch 40 | $114.3 - 2(6.02)$ | $102.26 \ \mathrm{mm}$ |
| DN50 Sch 80 | $60.3 - 2(5.54)$ | $49.22 \ \mathrm{mm}$ |
| DN300 Sch 40 | $323.9 - 2(10.31)$ | $303.28 \ \mathrm{mm}$ |

## 12. ISO 9906:2012 Acceptance Grades

The verifier checks that the app's acceptance tolerance constants match the
configured ISO 9906 grade values:

| Grade | $\Delta Q$ | $\Delta H$ |
|---|---:|---:|
| ISO 1B | 4.5% | 3.0% |
| ISO 2B | 8.0% | 5.0% |
| ISO 3B | 9.0% | 7.0% |

These constants are used by the app's acceptance-band overlay and report
summary.

## QC Traceability

To run the exact checks documented here:

```bash
npm run verify:formulas
```

Successful output:

```text
verify-formulas: all 85 first-principles checks passed
```

If a check fails, the script reports the check name, actual value, expected
value, and relative error. That makes the document and script useful together:
the script gives the failing assertion, and this reference gives the formula
basis behind that assertion.
