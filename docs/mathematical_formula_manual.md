# Mathematical Formula Manual

Centrifugal Pump Sizing App

Formula basis date: 2026-07-08

This manual documents the mathematical equations used by the app, the
engineering intent behind each equation, and sample calculations. The app uses
SI units internally; US customary units are display conversions only.

## 1. Notation And Internal Units

| Symbol | Meaning | Internal unit |
| --- | --- | --- |
| $Q$ | Volumetric flow | m<sup>3</sup>/h |
| $Q_s$ | Volumetric flow in SI base seconds | m<sup>3</sup>/s |
| $H$ | Head | m |
| $D$ | Pipe inside diameter or impeller diameter | mm |
| $L$ | Pipe length | m |
| $v$ | Velocity | m/s |
| $\rho$ | Density | kg/m<sup>3</sup> |
| $\mu$ | Dynamic viscosity | cP |
| $g$ | Gravitational acceleration | 9.80665 m/s<sup>2</sup> |
| $K$ | Minor-loss coefficient | dimensionless |
| $N$ | Pump speed | rpm |
| $\eta$ | Pump or motor efficiency | decimal |
| $P$ | Power | kW |

### Flow Unit Conversion

The app converts pump flow from $\text{m}^3\text{/h}$ to $\text{m}^3\text{/s}$ before power and velocity
calculations.

```math
Q_s = \frac{Q}{3600}
```

```math
Q = 3600 Q_s
```

**Example**

For $Q = 36 \ \text{m}^3\text{/h}$:

```math
Q_s = \frac{36}{3600} = 0.0100 \ \text{m}^3\text{/s}
```

## 2. Display Unit Conversions

The app stores all calculations in SI. The unit toggle only converts display
values.

### SI To US Display Factors

```math
Q_{\mathrm{gpm}} = 4.402868 Q_{\text{m}^3\text{/h}}
```

```math
H_{\mathrm{ft}} = 3.280840 H_{\mathrm{m}}
```

```math
P_{\mathrm{hp}} = 1.341022 P_{\mathrm{kW}}
```

```math
p_{\mathrm{psi}} = 0.1450377 p_{\mathrm{kPa}}
```

```math
D_{\mathrm{in}} = 0.03937008 D_{\mathrm{mm}}
```

```math
\rho_{\text{lb/ft}^3} = 0.06242796 \rho_{\text{kg/m}^3}
```

```math
E_{\text{kWh/kgal}} = 3.785412 E_{\text{kWh/m}^3}
```

```math
T_F = \frac{9}{5}T_C + 32
```

**Example**

For $Q = 120 \ \text{m}^3\text{/h}$ and $H = 32 \ \mathrm{m}$:

```math
Q_{\mathrm{gpm}} = 4.402868(120) = 528.34 \ \mathrm{gpm}
```

```math
H_{\mathrm{ft}} = 3.280840(32) = 104.99 \ \mathrm{ft}
```

For $T = 20^\circ \mathrm{C}$:

```math
T_F = 1.8(20) + 32 = 68^\circ \mathrm{F}
```

## 3. Pipe Velocity

Pipe velocity is calculated from flow and pipe inside diameter.

### Pipe Area

```math
A = \frac{\pi}{4}\left(\frac{D}{1000}\right)^2
```

where $D$ is in $\mathrm{mm}$ and $A$ is in $\mathrm{m^2}$.

### Velocity

```math
v = \frac{Q/3600}{A}
```

**Engineering Explanation**

Velocity drives friction loss and Reynolds number. Higher velocity increases
friction approximately with $v^2$, so pipe size strongly affects TDH.

**Example**

For $Q = 36 \ \text{m}^3\text{/h}$ and $D = 100 \ \mathrm{mm}$:

```math
A = \frac{\pi}{4}(0.100)^2 = 0.007854 \ \mathrm{m^2}
```

```math
v = \frac{36/3600}{0.007854} = 1.273 \ \text{m/s}
```

## 4. Reynolds Number

```math
Re = \frac{\rho v (D/1000)}{\mu \times 10^{-3}}
```

where $\mu$ is entered in $\mathrm{cP}$ and converted to $\mathrm{Pa \cdot s}$.

**Engineering Explanation**

Reynolds number classifies the flow regime and determines the friction factor.
Low Reynolds number is common for viscous service or low flow.

**Example**

For $v = 1.273 \ \text{m/s}$, $D = 100 \ \mathrm{mm}$, $\rho = 1000 \ \text{kg/m}^3$, and
$\mu = 1.0 \ \mathrm{cP}$:

```math
Re = \frac{1000(1.273)(0.100)}{0.001} = 127324
```

## 5. Flow Regime

The app classifies the suction-line Reynolds number as:

```math
Re < 2300 \Rightarrow \text{laminar}
```

```math
2300 \le Re < 4000 \Rightarrow \text{transitional}
```

```math
Re \ge 4000 \Rightarrow \text{turbulent}
```

**Example**

For $Re = 3000$:

```math
2300 \le 3000 < 4000
```

The regime is transitional.

## 6. Darcy Friction Factor - Churchill Correlation

The app uses the Churchill correlation for Darcy friction factor across laminar,
transitional, and turbulent flow.

### Relative Roughness

```math
\epsilon_r = \frac{\epsilon}{D}
```

where $\epsilon$ and $D$ are both in $\mathrm{mm}$.

### Churchill Terms

```math
A_c =
\left[
2.457 \ln
\left(
\frac{1}
{\left(\frac{7}{Re}\right)^{0.9} + 0.27\epsilon_r}
\right)
\right]^{16}
```

```math
B_c = \left(\frac{37530}{Re}\right)^{16}
```

### Darcy Friction Factor

```math
f =
8
\left[
\left(\frac{8}{Re}\right)^{12}
+
\frac{1}{(A_c+B_c)^{1.5}}
\right]^{1/12}
```

**Engineering Explanation**

This avoids a discontinuity at the laminar-transition boundary and is better
for low-flow and viscous service than forcing a fully turbulent approximation.

**Example**

For $Re = 1000$, $\epsilon = 0.046 \ \mathrm{mm}$, and $D = 100 \ \mathrm{mm}$:

```math
f \approx 0.064
```

For $Re = 127324$, the same roughness and diameter:

```math
f \approx 0.01964
```

## 7. Minor-Loss Coefficient Sum

The app sums fitting coefficients from the fitting table:

```math
K_{total} = \sum_i K_i n_i
```

where $n_i$ is the fitting quantity.

**Engineering Explanation**

These $K$ values are generic screening values. Reducers, strainers, and valves
may need vendor or geometry-specific coefficients for final design.

**Example**

For one sharp entrance, two long-radius 90 degree elbows, one gate valve, and one
foot valve:

```math
K_{total} = 0.50(1) + 0.30(2) + 0.15(1) + 3.00(1)
```

```math
K_{total} = 4.25
```

## 8. Pipe Friction And Minor-Loss Head

### Straight-Pipe Friction

```math
h_f =
f \frac{L}{D/1000} \frac{v^2}{2g}
```

### Minor-Loss Head

```math
h_K =
K_{total}\frac{v^2}{2g}
```

### Total Line Loss

```math
h_{line} = h_f + h_K
```

**Engineering Explanation**

Straight-pipe loss depends on pipe length and friction factor. Minor loss
depends on fitting count and geometry.

**Example**

For $Q=36 \ \text{m}^3\text{/h}$, $L=100 \ \mathrm{m}$, $D=100 \ \mathrm{mm}$, $\epsilon=0.046 \ \mathrm{mm}$,
$\rho=1000 \ \text{kg/m}^3$, $\mu=1 \ \mathrm{cP}$, and $K=2$:

```math
h_{line} \approx 1.789 \ \mathrm{m}
```

## 9. Static Lift

```math
H_{static} = Z_d - Z_s
```

If legacy data only has $H_{static}$, that value is used directly.

**Engineering Explanation**

Static lift is independent of flow. It is the elevation difference between the
discharge destination and the suction source.

**Example**

For $Z_d = 19.5 \ \mathrm{m}$ and $Z_s = 1.5 \ \mathrm{m}$:

```math
H_{static} = 19.5 - 1.5 = 18.0 \ \mathrm{m}
```

## 10. Vessel Pressure Head

```math
H_p =
\frac{(P_d - P_s)1000}{\rho g}
```

where $P_d$ and $P_s$ are gauge pressures in $\mathrm{kPa}$.

**Engineering Explanation**

Pressure head converts a vessel pressure difference into equivalent liquid head.

**Example**

For open suction and discharge vessels:

```math
P_d - P_s = 0
```

```math
H_p = 0 \ \mathrm{m}
```

For a 100 kPa discharge pressure rise with water:

```math
H_p = \frac{100000}{1000(9.80665)} = 10.20 \ \mathrm{m}
```

## 11. System Head Curve

```math
H_{sys}(Q) =
H_{static} + H_p + h_{suction}(Q) + h_{discharge}(Q)
```

**Engineering Explanation**

The system curve has a static component and a flow-dependent friction component.
The operating point is where the pump curve and system curve intersect.

**Example**

For the default system at $Q = 110 \ \text{m}^3\text{/h}$:

```math
H_{sys}(110) \approx 23.253 \ \mathrm{m}
```

## 12. Water Property Correlations

### Water Density

The app uses a polynomial water-density correlation:

```math
\rho_w(T) =
\frac{
999.83952 + 16.945176T - 7.9870401 \times 10^{-3}T^2
- 46.170461 \times 10^{-6}T^3
+ 105.56302 \times 10^{-9}T^4
- 280.54253 \times 10^{-12}T^5
}{
1 + 16.879850 \times 10^{-3}T
}
```

### Water Viscosity

```math
\mu_w(T) =
2.414 \times 10^{-2}
10^{\frac{247.8}{T_K - 140}}
```

where $T_K = T_C + 273.15$.

### Water Vapor Pressure

```math
P_{vap,mmHg} =
10^{8.07131 - \frac{1730.63}{233.426 + T_C}}
```

```math
P_{vap,kPa} = 0.1333224 P_{vap,mmHg}
```

**Engineering Explanation**

Water properties are temperature-sensitive and affect Reynolds number, friction,
NPSHa, and power.

**Example**

At $T = 20^\circ \mathrm{C}$:

```math
\rho_w \approx 998.204 \ \text{kg/m}^3
```

```math
\mu_w \approx 1.00175 \ \mathrm{cP}
```

```math
P_{vap} \approx 2.330 \ \mathrm{kPa}
```

## 13. Generic Non-Water Fluid Property Adjustments

Non-water presets use screening correlations from a reference temperature.

### Density

```math
\rho(T) = \rho_{ref}[1 - \beta(T - T_{ref})]
```

The app uses:

```math
\beta = 4 \times 10^{-4} \quad \text{for aqueous presets}
```

```math
\beta = 5.5 \times 10^{-4} \quad \text{for mineral acid presets}
```

```math
\beta = 8 \times 10^{-4} \quad \text{for organic presets}
```

### Viscosity

```math
B = \max(1200,\min(6000,600\ln(\max(\mu_{ref},1))+1400))
```

```math
\mu(T) =
\max\left(0.05,
\mu_{ref}
\exp\left[B\left(\frac{1}{T_K}-\frac{1}{T_{ref,K}}\right)\right]
\right)
```

### Aqueous And Mineral Acid Vapor Pressure

```math
P_{vap}(T) =
P_{vap,w}(T)
\frac{P_{vap,ref}}{P_{vap,w}(T_{ref})}
```

### Organic Vapor Pressure

```math
P_{vap}(T) =
P_{vap,ref}
\exp\left[-4300\left(\frac{1}{T_K}-\frac{1}{T_{ref,K}}\right)\right]
```

**Engineering Explanation**

These are screening correlations. They are useful for rough comparison but not
a replacement for process data sheets or vendor property data.

**Example**

For an aqueous preset with $\rho_{ref}=1068 \ \text{kg/m}^3$, $T_{ref}=20^\circ \mathrm{C}$,
and $T=30^\circ \mathrm{C}$:

```math
\rho(30) = 1068[1 - 0.0004(30-20)]
```

```math
\rho(30) = 1063.7 \ \text{kg/m}^3
```

## 14. Catalog Curve Interpolation

Catalog points are sorted by flow. Duplicate flow entries are averaged. Head
points are forced to be non-increasing with flow; if entered head data has a
rising segment, the app flags that the catalog data was flattened.

### Duplicate-Point Average

```math
y_{avg} = \frac{1}{n}\sum_{i=1}^{n} y_i
```

### Monotone Head Enforcement

For sorted points:

```math
H_i^* = \max(0,\min(H_i,H_{i-1}^*))
```

### Linear Interpolation

For $x_a \le x \le x_b$:

```math
y(x) = y_a + \frac{x-x_a}{x_b-x_a}(y_b-y_a)
```

### High-Flow Extrapolation

For head, efficiency, and NPSHr above the last point, the app uses the last
segment slope and then clamps to the allowed minimum.

```math
y(x) = y_b + \frac{y_b-y_a}{x_b-x_a}(x-x_b)
```

**Engineering Explanation**

This avoids polynomial curve artifacts from sparse catalog data. Real pump
curves should still be entered from vendor data wherever possible. If the solved
duty point falls below or above the entered catalog flow range, the app flags
that catalog extrapolation is being used.

**Example**

For catalog head points $(120,32)$ and $(200,17)$, at $Q=150$:

```math
H(150) = 32 + \frac{150-120}{200-120}(17-32)
```

```math
H(150) = 26.375 \ \mathrm{m}
```

## 15. Parametric Pump Curve Fallback

If no usable catalog curve is entered, the app creates a screening curve from
the BEP point.

### Shutoff Head

```math
H_0 = 1.25 H_b
```

### Parabolic Head Curve

```math
a = \frac{H_0 - H_b}{Q_b^2}
```

```math
H(Q) = \max(0,H_0 - aQ^2)
```

### Efficiency Curve

```math
x = \frac{Q}{Q_b}
```

```math
\eta(Q) =
\max\left(0.05,
\min\left(\eta_{max},
\eta_{max}[1 - 0.9(x-1)^2]
\right)
\right)
```

### NPSHr Curve

```math
NPSHr(Q) =
NPSHr_b
\left[
0.55 + 0.45\left(\frac{Q}{Q_b}\right)^2
\right]
```

**Engineering Explanation**

This is a screening fallback. It is not a substitute for a vendor curve.

**Example**

For $Q_b=120 \ \text{m}^3\text{/h}$, $H_b=32 \ \mathrm{m}$, and $\eta_{max}=0.78$:

```math
H_0 = 1.25(32) = 40 \ \mathrm{m}
```

```math
a = \frac{40-32}{120^2} = 0.0005556
```

At $Q=120 \ \text{m}^3\text{/h}$:

```math
H(120)=40-0.0005556(120)^2 = 32 \ \mathrm{m}
```

```math
\eta(120)=0.78
```

For $NPSHr_b = 3.2 \ \mathrm{m}$:

```math
NPSHr(120)=3.2[0.55+0.45(1)^2]=3.2 \ \mathrm{m}
```

## 16. Affinity-Law Scaling

### Speed And Diameter Ratios

```math
s_N = \frac{N}{N_0}
```

```math
s_D = \frac{D}{D_0}
```

### Flow And Head Scale Factors

```math
Q_{scale} = s_N s_D
```

```math
H_{scale} = (s_N s_D)^2
```

### Water-Basis Scaled Head

```math
Q_{ref} = \frac{Q}{Q_{scale}}
```

```math
H_{water}(Q) = H_{ref}(Q_{ref})H_{scale}
```

### Water-Basis Scaled Efficiency

```math
\eta_{water}(Q) = \eta_{ref}(Q_{ref})
```

### NPSHr Speed Scaling

```math
NPSHr_{scaled}(Q) = NPSHr_{ref}(Q_{ref})s_N^2
```

**Engineering Explanation**

Affinity laws are used only as a recommended-range approximation. The app flags
excursions outside:

```math
0.70 \le s_N \le 1.15
```

```math
0.85 \le s_D \le 1.05
```

**Example**

At half speed, $N=1475 \ \mathrm{rpm}$, $N_0=2950 \ \mathrm{rpm}$, and $D=D_0$:

```math
s_N = \frac{1475}{2950}=0.5
```

```math
Q_{scale}=0.5
```

```math
H_{scale}=0.5^2=0.25
```

The BEP flow changes from $120$ to:

```math
Q_b = 120(0.5)=60 \ \text{m}^3\text{/h}
```

The BEP head changes from $32$ to:

```math
H_b = 32(0.25)=8 \ \mathrm{m}
```

Because $s_N=0.5$, this is outside the recommended affinity range and should
be treated as extrapolation.

## 17. Screening Viscosity Correction

The app uses a screening viscosity correction. It is not a certified HI 9.6.7
implementation. Its tuning constants are self-consistent screening coefficients
and should be checked against HI 9.6.7, vendor, or standard-method curves before
using viscous-service results for final selection.

### Specific Speed Used In Correction

```math
N_s = \frac{N\sqrt{Q_b/3600}}{H_b^{0.75}}
```

### Specific-Speed Factor

```math
F_{Ns} =
\max\left(0.75,
\min\left(1.35,1+0.25\frac{N_s-40}{40}\right)
\right)
```

### Effective Viscosity

```math
\mu_{eff} =
\mu
\left(
\frac{120 \times 32}{\max(1,Q_bH_b)}
\right)^{0.25}
F_{Ns}
```

### Flow Ratio

```math
R_Q =
\max\left(0.05,
\min\left(2.2,\frac{Q}{Q_b C_Q}\right)
\right)
```

### Off-BEP Factor

```math
F_{off} = |R_Q - 1|^{1.15}
```

### Efficiency Correction

```math
C_{\eta,base} = 1.32 - 0.13\ln(\mu_{eff})
```

```math
C_{\eta} =
\max\left(0.2,
\min\left(1,
C_{\eta,base} - (1-C_{\eta,base})0.30F_{off}
\right)
\right)
```

### Severity

```math
S = 1 - C_{\eta}
```

### Head Correction

```math
C_H =
\max\left(0.35,
1 - S[0.30 + 0.18\max(0,R_Q-1) + 0.08\max(0,1-R_Q)]
\right)
```

### Flow Correction

```math
C_Q =
\max\left(0.40,
1 - S[0.25 + 0.08\max(0,R_Q-1)]
\right)
```

### NPSHr Multiplier

```math
C_{NPSH} =
\min\left(1.80,
1 + S[0.28 + 0.18\max(0,R_Q-1) + 0.08F_{off}]
\right)
```

### Corrected Pump Head

```math
H_{visc}(Q) = C_H H_{water}\left(\frac{Q}{C_Q}\right)
```

### Corrected Pump Efficiency

```math
\eta_{visc}(Q) =
\max\left(0.02,
C_{\eta}\eta_{water}\left(\frac{Q}{C_Q}\right)
\right)
```

### Corrected NPSHr

```math
NPSHr_{visc}(Q) =
NPSHr_{water}\left(\frac{Q}{C_Q}\right)C_{NPSH}
```

**Engineering Explanation**

Viscosity reduces flow, head, and efficiency. The app also increases NPSHr
conservatively because viscous losses at the impeller eye can reduce cavitation
margin. This is a screening model.

**Example**

For $Q_b=120 \ \text{m}^3\text{/h}$, $H_b=32 \ \mathrm{m}$, $\mu=150 \ \mathrm{cP}$, $N_s=40$, and
$R_Q=1.0$:

```math
C_Q = 0.917
```

```math
C_H = 0.901
```

```math
C_{\eta} = 0.669
```

```math
C_{NPSH} = 1.093
```

At higher flow ratio $R_Q=1.6$:

```math
C_H = 0.842
```

```math
C_{NPSH} = 1.167
```

For the sample pump, viscous NPSHr at BEP changes from $3.2 \ \mathrm{m}$ to:

```math
NPSHr_{visc} \approx 3.497 \ \mathrm{m}
```

## 18. BEP Flow And Head

The app obtains BEP from the reference model and then scales it.

### BEP Flow

```math
Q_{BEP} = Q_{BEP,ref} Q_{scale} C_Q
```

### BEP Head

```math
H_{BEP} = H(Q_{BEP})
```

**Engineering Explanation**

The BEP flow shifts with speed, impeller diameter, and viscosity.

**Example**

At reference speed and diameter, clean water:

```math
Q_{BEP}=120(1)(1)=120 \ \text{m}^3\text{/h}
```

For the 150 cP example with $C_Q=0.917$:

```math
Q_{BEP,visc}=120(0.917)=110.1 \ \text{m}^3\text{/h}
```

## 19. NPSH Available

```math
NPSHa =
\frac{(P_{atm}+P_s)1000}{\rho g}
+ Z_s
- \frac{P_{vap}1000}{\rho g}
- h_{f,suction}
```

**Engineering Explanation**

NPSHa is the suction-side absolute pressure head above vapor pressure after
subtracting suction-side losses.

**Example**

For the default system at $Q=110 \ \text{m}^3\text{/h}$:

```math
NPSHa \approx 10.907 \ \mathrm{m}
```

## 20. Cavitation Margin Criteria

### Absolute Margin

```math
M_{NPSH} = NPSHa - NPSHr
```

### Ratio

```math
R_{NPSH} = \frac{NPSHa}{NPSHr}
```

### Pass/Fail Criterion

```math
\text{cavitation ok} =
(R_{NPSH} \ge R_{required})
\land
(M_{NPSH} \ge M_{absolute})
```

The default values are:

```math
R_{required}=1.3
```

```math
M_{absolute}=0.6 \ \mathrm{m}
```

**Example**

For a duty with $NPSHa=11.351 \ \mathrm{m}$ and $NPSHr=4.409 \ \mathrm{m}$:

```math
M_{NPSH}=11.351-4.409=6.942 \ \mathrm{m}
```

```math
R_{NPSH}=\frac{11.351}{4.409}=2.575
```

Because $2.575 \ge 1.3$ and $6.942 \ge 0.6$, the cavitation check passes.

## 21. Pump Arrangements

### Number Of Pumps

```math
n = \max(1,n_{pumps})
```

### Parallel Pumps

```math
H_{combined}(Q) = H_{single}\left(\frac{Q}{n}\right)
```

```math
Q_{per\ pump} = \frac{Q}{n}
```

### Series Pumps

```math
H_{combined}(Q) = nH_{single}(Q)
```

```math
Q_{per\ pump} = Q
```

### Combined BEP Flow

```math
Q_{BEP,combined} =
\begin{cases}
nQ_{BEP,single}, & \text{parallel} \\
Q_{BEP,single}, & \text{single or series}
\end{cases}
```

**Engineering Explanation**

Parallel pumps split flow equally. Series pumps add head. The app assumes
identical pumps and ideal distribution/losses.

**Example**

For two identical parallel pumps at total $Q=240 \ \text{m}^3\text{/h}$:

```math
Q_{per\ pump}=\frac{240}{2}=120 \ \text{m}^3\text{/h}
```

```math
H_{combined}(240)=H_{single}(120)
```

For two identical series pumps at $Q=120 \ \text{m}^3\text{/h}$:

```math
H_{combined}(120)=2H_{single}(120)
```

## 22. Operating Point

The operating point is the root of:

```math
F(Q)=H_{combined}(Q)-H_{sys}(Q)
```

The app numerically brackets and bisects the root. If no positive-flow root is
found, it reports a no-duty-point state.

**Engineering Explanation**

The pump can operate at positive flow only when its curve intersects the system
curve. If the pump shutoff head is below static/system head, no duty point is
achievable.

**Example**

For the current default case used in QC:

```math
Q_{duty} \approx 162.752 \ \text{m}^3\text{/h}
```

```math
H_{duty} \approx 25.284 \ \mathrm{m}
```

At this point:

```math
H_{combined}(Q_{duty}) \approx H_{sys}(Q_{duty})
```

## 23. VFD Speed For Selected Duty

The app solves the speed needed for the pump to pass through the user-selected
target point:

```math
G(N)=H_{combined}(Q_{target},N)-H_{sys}(Q_{target})
```

The speed solver searches:

```math
150 \le N \le 6000 \ \mathrm{rpm}
```

and reports one of:

```math
\text{solved}, \quad \text{above-max}, \quad \text{below-min}, \quad \text{invalid}
```

**Engineering Explanation**

This is used by the "set speed to hold selection" control. The app now blocks
the action if the speed solution is outside the recommended affinity range.

**Example**

For the default selected flow $Q_{target}=110 \ \text{m}^3\text{/h}$:

```math
N_{target} \approx 2474.8 \ \mathrm{rpm}
```

## 24. Minimum VFD Speed

Minimum VFD speed is estimated by solving for the speed required to overcome
static plus pressure head at near-zero flow:

```math
H_{target} = H_{static}+H_p
```

```math
G(N)=H_{combined}(0.5,N)-H_{target}
```

**Engineering Explanation**

This is a screening lower limit for maintaining enough head to overcome static
and vessel pressure requirements.

**Example**

For the default system:

```math
H_{target}=18.0+0=18.0 \ \mathrm{m}
```

The app calculates:

```math
N_{min,VFD} \approx 1978.9 \ \mathrm{rpm}
```

## 25. Hydraulic Power

```math
P_{hyd} =
\frac{\rho g (Q/3600) H}{1000}
```

**Engineering Explanation**

Hydraulic power is the useful liquid power added by the pump.

**Example**

For $Q=120 \ \text{m}^3\text{/h}$, $H=32 \ \mathrm{m}$, and $\rho=998 \ \text{kg/m}^3$:

```math
P_{hyd} =
\frac{998(9.80665)(120/3600)(32)}{1000}
```

```math
P_{hyd}=10.44 \ \mathrm{kW}
```

## 26. Brake / Shaft Power

```math
P_{brake} =
\frac{P_{hyd}}{\max(0.05,\eta)}
```

For multiple pumps:

```math
P_{brake,total} = nP_{brake,per\ pump}
```

**Engineering Explanation**

Brake power is the shaft power required at the pump coupling. The efficiency
floor avoids division by zero at extreme off-curve conditions.

**Example**

For $P_{hyd}=10.44 \ \mathrm{kW}$ and $\eta=0.78$:

```math
P_{brake}=\frac{10.44}{0.78}=13.38 \ \mathrm{kW}
```

## 27. Motor Selection

### Required Motor Rating

```math
P_{required} = SF \times P_{brake,per\ pump}
```

The default service factor is:

```math
SF=1.15
```

### Standard Motor Size

```math
P_{motor,selected} =
\min(P_i \in \text{standard list}: P_i \ge P_{required})
```

The app has IEC kW and NEMA hp standard-size arrays.

**Engineering Explanation**

The selected motor size is the next catalog size above brake power plus service
margin.

**Example**

For $P_{brake}=13.4 \ \mathrm{kW}$:

```math
P_{required}=1.15(13.4)=15.41 \ \mathrm{kW}
```

The next IEC size is:

```math
P_{motor,selected}=18.5 \ \mathrm{kW}
```

The equivalent required horsepower is:

```math
P_{required,hp}=\frac{15.41}{0.745699872}=20.67 \ \mathrm{hp}
```

The next NEMA size is:

```math
P_{motor,selected}=25 \ \mathrm{hp}
```

## 28. Motor Efficiency Curve

The app linearly interpolates motor efficiency from a size-based table.

For $P_a \le P \le P_b$:

```math
\eta_m(P) =
\eta_a + \frac{P-P_a}{P_b-P_a}(\eta_b-\eta_a)
```

**Engineering Explanation**

Small motors are less efficient than large motors. This affects annual energy
and cost, not the hydraulic duty point.

**Example**

For a selected motor near $15 \ \mathrm{kW}$, interpolating between $11 \ \mathrm{kW}$ at
$0.910$ and $22 \ \mathrm{kW}$ at $0.925$:

```math
\eta_m(15) =
0.910 + \frac{15-11}{22-11}(0.925-0.910)
```

```math
\eta_m(15)=0.915
```

## 29. Motor Input Power And Energy

### Input Power

```math
P_{input} = \frac{P_{brake,total}}{\max(0.5,\eta_m)}
```

### Annual Energy

```math
E_{year}=P_{input}t_{year}
```

### Annual Energy Cost

```math
C_{year}=E_{year}c_{energy}
```

### Specific Energy

```math
E_s =
\begin{cases}
\frac{P_{input}}{Q}, & Q > 0 \\
0, & Q \le 0
\end{cases}
```

**Engineering Explanation**

These calculations estimate operating cost. They depend on the assumed motor
efficiency, operating hours, and energy price.

**Example**

For $P_{brake,total}=13.4 \ \mathrm{kW}$, $\eta_m=0.91545$, $t=8000 \ \text{h/y}$,
$c=0.12 \ \text{USD/kWh}$, and $Q=120 \ \text{m}^3\text{/h}$:

```math
P_{input}=\frac{13.4}{0.91545}=14.64 \ \mathrm{kW}
```

```math
E_{year}=14.64(8000)=117100 \ \text{kWh/y}
```

```math
C_{year}=117100(0.12)=14052 \ \text{USD/y}
```

```math
E_s=\frac{14.64}{120}=0.122 \ \text{kWh/m}^3
```

## 30. Specific Speed

```math
N_s =
\frac{N\sqrt{Q/3600}}{H^{0.75}}
```

**Engineering Explanation**

Specific speed is a pump-type indicator. In the app it is calculated per pump,
not from the combined parallel/series set.

**Example**

For $N=2950 \ \mathrm{rpm}$, $Q=120 \ \text{m}^3\text{/h}$, and $H=32 \ \mathrm{m}$:

```math
N_s =
\frac{2950\sqrt{120/3600}}{32^{0.75}}
```

```math
N_s \approx 40.0
```

## 31. Suction Specific Speed

```math
N_{ss} =
\frac{N\sqrt{Q_{BEP}/3600}}{NPSHr_{BEP}^{0.75}}
```

The app screens high suction energy when:

```math
N_{ss} > 213
```

**Engineering Explanation**

High suction specific speed can indicate suction recirculation risk and
instability near low flow.

**Example**

For the default pump:

```math
N_{ss} \approx 225.1
```

Since $225.1 > 213$, the app flags elevated suction energy.

## 32. Minimum Continuous Flow

```math
Q_{min} = Q_{BEP} \frac{p_{min}}{100}
```

For parallel pumps:

```math
Q_{min,combined} = nQ_{min,single}
```

**Engineering Explanation**

Minimum flow is a screening protection against recirculation and overheating.

**Example**

For $Q_{BEP}=120 \ \text{m}^3\text{/h}$ and $p_{min}=45\%$:

```math
Q_{min}=120(0.45)=54 \ \text{m}^3\text{/h}
```

## 33. Preferred Operating Region

The app screens preferred operating region as:

```math
70\% \le \frac{Q_{duty}}{Q_{BEP}}100 \le 120\%
```

**Engineering Explanation**

This is a broad screening POR. Vendor curves may define a different allowable
operating region and preferred operating region.

**Example**

If $Q_{duty}=162.75 \ \text{m}^3\text{/h}$ and $Q_{BEP}=120 \ \text{m}^3\text{/h}$:

```math
\frac{Q_{duty}}{Q_{BEP}}100 =
\frac{162.75}{120}100 = 135.6\%
```

The app flags this as outside the preferred region.

## 34. Rated Point With Design Margins

### Rated Flow

```math
Q_{rated} = Q_{duty}\left(1+\frac{M_Q}{100}\right)
```

### Rated Head

```math
H_{rated} =
H_{sys}(Q_{rated})
\left(1+\frac{M_H}{100}\right)
```

**Engineering Explanation**

The rated point is a design point above duty flow/head for procurement or
selection margin. The app also checks whether rated flow is left of BEP.

**Example**

For $Q_{duty}=162.75 \ \text{m}^3\text{/h}$, $M_Q=10\%$, and $M_H=0\%$:

```math
Q_{rated}=162.75(1.10)=179.03 \ \text{m}^3\text{/h}
```

```math
H_{rated}=H_{sys}(179.03)
```

## 35. Acceptance Tolerance Bands

The app stores tolerance grades as percent bands on the guarantee point.

```math
Q_{low}=Q_g\left(1-\frac{\Delta Q}{100}\right)
```

```math
Q_{high}=Q_g\left(1+\frac{\Delta Q}{100}\right)
```

```math
H_{low}=H_g\left(1-\frac{\Delta H}{100}\right)
```

```math
H_{high}=H_g\left(1+\frac{\Delta H}{100}\right)
```

**Engineering Explanation**

These bands visualize acceptance tolerances such as ISO 9906 grades and a
generic ANSI/HI band.

**Example**

For ISO 9906 Grade 2B, $\Delta Q=8\%$, $\Delta H=5\%$. If
$Q_g=180 \ \text{m}^3\text{/h}$, $H_g=25 \ \mathrm{m}$:

```math
Q_{low}=180(0.92)=165.6 \ \text{m}^3\text{/h}
```

```math
Q_{high}=180(1.08)=194.4 \ \text{m}^3\text{/h}
```

```math
H_{low}=25(0.95)=23.75 \ \mathrm{m}
```

```math
H_{high}=25(1.05)=26.25 \ \mathrm{m}
```

## 36. Pipe Schedule ID

For standard pipe selections:

```math
ID = OD - 2t
```

where $OD$ and wall thickness $t$ are from the app's ASME B36.10 table.

**Engineering Explanation**

Pipe schedule selection changes inside diameter, which changes velocity,
Reynolds number, and friction head.

**Example**

For DN150 Schedule 40:

```math
OD = 168.3 \ \mathrm{mm}
```

```math
t = 7.11 \ \mathrm{mm}
```

```math
ID = 168.3 - 2(7.11)=154.1 \ \mathrm{mm}
```

## 37. Nearest Pipe Lookup

The app finds the closest standard pipe ID:

```math
e = |ID_{table} - ID_{entered}|
```

The nearest pipe is reported only if:

```math
e \le 0.6 \ \mathrm{mm}
```

**Example**

For $ID_{entered}=154.1 \ \mathrm{mm}$, the app finds DN150 Schedule 40:

```math
e=|154.1-154.1|=0
```

## 38. Full Default Duty Sample

The following sample uses the current default water case, with the default
system, default pump, and current formula set.

### Solved Duty Point

```math
Q_{duty} \approx 162.752 \ \text{m}^3\text{/h}
```

```math
H_{duty} \approx 25.284 \ \mathrm{m}
```

```math
\eta_{duty} \approx 0.691
```

### NPSH

```math
NPSHa \approx 11.351 \ \mathrm{m}
```

```math
NPSHr \approx 4.409 \ \mathrm{m}
```

```math
M_{NPSH} \approx 6.942 \ \mathrm{m}
```

```math
R_{NPSH} \approx 2.575
```

### VFD

```math
N_{target} \approx 2474.8 \ \mathrm{rpm}
```

```math
N_{min,VFD} \approx 1978.9 \ \mathrm{rpm}
```

## 39. Engineering Limitations

- The viscosity correction is a screening model, not a certified HI 9.6.7
  chart/equation implementation.
- Affinity-law scaling is bounded and flagged, but vendor curves should be used
  for final selection.
- Generic fitting $K$ values should be replaced with geometry/vendor data for
  final design.
- Non-water fluid properties are approximations unless the user enters process
  data manually.
- Parallel operation assumes identical pumps and equal flow sharing.
- Series operation assumes ideal head addition and no interstage loss.
- Acceptance tolerance bands are visual screening aids and should be checked
  against the applicable test standard and purchase specification.
