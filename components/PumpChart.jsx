// PumpChart.jsx — SVG chart with Q vs H, efficiency, NPSHr, NPSHa, system curve, op point.

const PumpChart = ({ pump, sys, op, setOp, rated, showSpeedFamily = false, tol, U, width = 820, height = 460, Qmax = 220 }) => {
  const PM = window.PumpMath;
  U = U || window.makeUnits("SI");
  const uQ = (v, n = 0) => U.conv("flow", v).toFixed(n);
  const uH = (v, n = 0) => U.conv("head", v).toFixed(n);
  const nSet = PM.nP(pump), arrange = PM.arr(pump);
  const M = { l: 56, r: 60, t: 18, b: 42 };
  const W = width, H = height;
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;

  // Determine Y axis max from COMBINED shutoff head at current speed
  const Hshutoff = PM.combinedShutoff(pump);
  const yHmax = Math.max(10, Math.ceil(Hshutoff / 10) * 10 + 10);

  // Right axis: efficiency % and NPSH m share same 0..yRmax
  const yRmax = 100; // efficiency %
  const yNPSHmax = 20; // m — scaled to same axis area

  const sx = (q) => M.l + (q / Qmax) * iw;
  const syH = (h) => M.t + ih - (h / yHmax) * ih;
  const syEta = (e) => M.t + ih - (e / yRmax) * ih;
  const syN = (n) => M.t + ih - (n / yNPSHmax) * ih;

  // Sample curves
  const N = 80;
  const samples = Array.from({ length: N + 1 }, (_, i) => (i / N) * Qmax);

  const pumpPath = samples.map(q => `${q === 0 ? "M" : "L"}${sx(q).toFixed(1)},${syH(PM.combinedH(q, pump)).toFixed(1)}`).join(" ");
  const sysPath  = samples.map(q => `${q === 0 ? "M" : "L"}${sx(q).toFixed(1)},${syH(PM.systemHead(q, sys)).toFixed(1)}`).join(" ");
  const etaPath  = samples.map(q => `${q === 0 ? "M" : "L"}${sx(q).toFixed(1)},${syEta(PM.combinedEta(q, pump) * 100).toFixed(1)}`).join(" ");
  const npshrPath= samples.map(q => `${q === 0 ? "M" : "L"}${sx(q).toFixed(1)},${syN(PM.combinedNPSHr(q, pump)).toFixed(1)}`).join(" ");
  const npshaPath= samples.map(q => `${q === 0 ? "M" : "L"}${sx(q).toFixed(1)},${syN(Math.max(0, PM.npshAvailable(q, sys))).toFixed(1)}`).join(" ");

  // Single-pump curve (ghost) when a multi-pump set is configured
  const isSet = arrange !== "single" && nSet > 1;
  const singlePath = isSet
    ? samples.map(q => `${q === 0 ? "M" : "L"}${sx(q).toFixed(1)},${syH(PM.pumpH(q, pump)).toFixed(1)}`).join(" ")
    : "";

  // VFD speed family — combined curves at fractions of current N
  const speedFamily = showSpeedFamily
    ? [0.6, 0.7, 0.8, 0.9].map(fr => ({
        fr,
        d: samples.map(q => `${q === 0 ? "M" : "L"}${sx(q).toFixed(1)},${syH(PM.combinedH(q, { ...pump, N: pump.N * fr })).toFixed(1)}`).join(" "),
      }))
    : [];

  // Water-basis ghost curve + catalog points
  const viscActive = !!(pump._visc && pump._corr && (pump._corr.CH < 0.999 || pump._corr.CQ < 0.999));
  const waterCombined = (q) => {
    if (arrange === "parallel") return PM.pumpH_water(q / nSet, pump);
    if (arrange === "series")   return nSet * PM.pumpH_water(q, pump);
    return PM.pumpH_water(q, pump);
  };
  const waterPath = samples.map(q => `${q === 0 ? "M" : "L"}${sx(q).toFixed(1)},${syH(waterCombined(q)).toFixed(1)}`).join(" ");
  // Catalog points scaled to actual frame (affinity), and to the set on Q axis
  const _sN = pump.N / pump.N0, _sD = pump.D / pump.D0, _Qs = _sN * _sD, _Hs = _Qs * _Qs;
  const _qMul = arrange === "parallel" ? nSet : 1;
  const _hMul = arrange === "series" ? nSet : 1;
  const catPts = (pump.useCatalog && Array.isArray(pump.catalog))
    ? pump.catalog.filter(r => r.q > 0 && Number.isFinite(r.h)).map(r => ({ q: r.q * _Qs * _qMul, h: r.h * _Hs * _hMul }))
    : [];

  // Gridlines — left axis in 10m ticks
  const hTicks = [];
  for (let h = 0; h <= yHmax; h += 10) hTicks.push(h);
  const qTicks = [];
  const qStep = Qmax <= 100 ? 20 : Qmax <= 250 ? 40 : 50;
  for (let q = 0; q <= Qmax; q += qStep) qTicks.push(q);
  const rTicks = [0, 25, 50, 75, 100];

  // Op point (user-draggable on curve)
  const opH = PM.combinedH(op.Q, pump);
  const opEta = PM.combinedEta(op.Q, pump);
  const opNPSHr = PM.combinedNPSHr(op.Q, pump);
  const opNPSHa = PM.npshAvailable(op.Q, sys);

  // BEP point (combined set)
  const bepQ = PM.combinedBEPflow(pump);
  const bepH = PM.combinedH(bepQ, pump);

  // Minimum continuous stable flow (per-pump scaled to set on Q axis)
  const qMin = PM.minFlow(pump) * (arrange === "parallel" ? nSet : 1);
  // Suction specific speed flag (elevated recirculation risk)
  const nss = PM.suctionSpecificSpeed(pump);
  const highSuctionEnergy = nss > 213;

  // System/pump intersection (combined)
  const cross = PM.operatingPointCombined(pump, sys, Qmax);

  const svgRef = React.useRef(null);
  const dragging = React.useRef(false);

  const toQ = (clientX) => {
    const r = svgRef.current.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * W;
    let q = ((x - M.l) / iw) * Qmax;
    q = Math.max(1, Math.min(Qmax * 0.98, q));
    return q;
  };

  const onDown = (e) => { dragging.current = true; setOp({ Q: toQ(e.clientX) }); e.preventDefault(); };
  const onMove = (e) => { if (dragging.current) setOp({ Q: toQ(e.clientX) }); };
  const onUp   = () => { dragging.current = false; };

  React.useEffect(() => {
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Efficiency band shading (80% of BEP .. 110% of BEP) — preferred operating region
  const porLo = bepQ * 0.8;
  const porHi = bepQ * 1.1;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" onMouseDown={onDown}>
      {/* Fine grid */}
      <g stroke="var(--rule-very-faint)" strokeWidth="1">
        {Array.from({ length: 21 }, (_, i) => {
          const x = M.l + (iw * i) / 20;
          return <line key={"vg"+i} x1={x} y1={M.t} x2={x} y2={M.t + ih} />;
        })}
        {Array.from({ length: 11 }, (_, i) => {
          const y = M.t + (ih * i) / 10;
          return <line key={"hg"+i} x1={M.l} y1={y} x2={M.l + iw} y2={y} />;
        })}
      </g>

      {/* Minimum-flow forbidden zone */}
      <defs>
        <pattern id="minflow-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="oklch(0.55 0.18 25 / 0.05)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="oklch(0.55 0.18 25 / 0.35)" strokeWidth="0.75" />
        </pattern>
      </defs>
      {qMin > 0 && (
        <g>
          <rect x={M.l} y={M.t} width={Math.max(0, sx(qMin) - M.l)} height={ih}
                fill="url(#minflow-hatch)" stroke="none" />
          <line x1={sx(qMin)} y1={M.t} x2={sx(qMin)} y2={M.t + ih}
                stroke="var(--bad)" strokeWidth="1" strokeDasharray="3 2" />
          <text x={sx(qMin) - 5} y={M.t + ih - 6} textAnchor="end"
                fontFamily="var(--mono)" fontSize="9" fill="var(--bad)"
                transform={`rotate(-90 ${sx(qMin) - 5} ${M.t + ih - 6})`}>MIN FLOW {uQ(qMin)}</text>
        </g>
      )}

      {/* POR band */}
      <rect x={sx(porLo)} y={M.t} width={sx(porHi) - sx(porLo)} height={ih}
            fill="oklch(0.55 0.14 45 / 0.06)" stroke="none" />

      {/* Plot area border */}
      <rect x={M.l} y={M.t} width={iw} height={ih}
            fill="none" stroke="var(--rule)" strokeWidth="1" />

      {/* X axis ticks + labels */}
      {qTicks.map(q => (
        <g key={"qt"+q}>
          <line x1={sx(q)} y1={M.t + ih} x2={sx(q)} y2={M.t + ih + 4} stroke="var(--rule)" />
          <text x={sx(q)} y={M.t + ih + 16} textAnchor="middle"
                fontFamily="var(--mono)" fontSize="10" fill="var(--mute)">{uQ(q)}</text>
        </g>
      ))}
      <text x={M.l + iw / 2} y={H - 8} textAnchor="middle"
            fontFamily="var(--mono)" fontSize="10" fill="var(--ink-2)">Q  —  {U.unit("flow")}</text>

      {/* Y axis left ticks */}
      {hTicks.map(h => (
        <g key={"ht"+h}>
          <line x1={M.l - 4} y1={syH(h)} x2={M.l} y2={syH(h)} stroke="var(--rule)" />
          <text x={M.l - 8} y={syH(h) + 3} textAnchor="end"
                fontFamily="var(--mono)" fontSize="10" fill="var(--mute)">{uH(h)}</text>
        </g>
      ))}
      <text x={14} y={M.t + ih / 2} textAnchor="middle"
            transform={`rotate(-90 14 ${M.t + ih / 2})`}
            fontFamily="var(--mono)" fontSize="10" fill="var(--ink-2)">H  —  {U.unit("head")}</text>

      {/* Y axis right (efficiency 0..100%) */}
      {rTicks.map(r => (
        <g key={"rt"+r}>
          <line x1={M.l + iw} y1={syEta(r)} x2={M.l + iw + 4} y2={syEta(r)} stroke="var(--rule)" />
          <text x={M.l + iw + 8} y={syEta(r) + 3}
                fontFamily="var(--mono)" fontSize="10" fill="var(--mute)">{r}</text>
        </g>
      ))}
      <text x={W - 14} y={M.t + ih / 2} textAnchor="middle"
            transform={`rotate(90 ${W - 14} ${M.t + ih / 2})`}
            fontFamily="var(--mono)" fontSize="10" fill="var(--ink-2)">η  —  %       /       NPSH  —  {U.unit("head")}</text>

      {/* Water-basis ghost curve (when viscosity active) */}
      {viscActive && (
        <g>
          <path d={waterPath} fill="none" stroke="var(--mute)" strokeWidth="1" strokeDasharray="5 4" opacity="0.7" />
          <text x={sx(Qmax * 0.62)} y={syH(waterCombined(Qmax * 0.62)) - 5}
                fontFamily="var(--mono)" fontSize="9" fill="var(--mute)">water</text>
        </g>
      )}

      {/* Catalog data points */}
      {catPts.map((p, i) => (
        <rect key={"cat"+i} x={sx(p.q) - 2.5} y={syH(p.h) - 2.5} width="5" height="5"
              fill="var(--paper)" stroke="var(--ink)" strokeWidth="1" transform={`rotate(45 ${sx(p.q)} ${syH(p.h)})`} />
      ))}

      {/* VFD speed family (draw under main curves) */}
      {speedFamily.map((s, i) => (
        <g key={"sf"+i}>
          <path d={s.d} fill="none" stroke="var(--rule)" strokeWidth="0.75" opacity="0.8" />
          <text x={sx(Qmax * 0.10)} y={syH(PM.combinedH(Qmax * 0.10, { ...pump, N: pump.N * s.fr })) - 3}
                fontFamily="var(--mono)" fontSize="8" fill="var(--mute)">{(s.fr*100).toFixed(0)}%</text>
        </g>
      ))}

      {/* Single-pump ghost (one machine of the set) */}
      {isSet && (
        <g>
          <path d={singlePath} fill="none" stroke="var(--ink-2)" strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
          <text x={sx(Qmax * 0.42)} y={syH(PM.pumpH(Qmax * 0.42, pump)) - 4}
                fontFamily="var(--mono)" fontSize="9" fill="var(--ink-2)">1 pump</text>
        </g>
      )}

      {/* Pump curve (combined set) */}
      <path d={pumpPath} fill="none" stroke="var(--ink)" strokeWidth="1.75" />

      {/* System curve */}
      <path d={sysPath} fill="none" stroke="var(--ink-2)" strokeWidth="1.25" strokeDasharray="4 3" />

      {/* Efficiency */}
      <path d={etaPath} fill="none" stroke="var(--accent)" strokeWidth="1.25" />

      {/* NPSHr */}
      <path d={npshrPath} fill="none" stroke="var(--cool)" strokeWidth="1.25" strokeDasharray="2 2" />

      {/* NPSHa */}
      <path d={npshaPath} fill="none" stroke="var(--cool)" strokeWidth="1.25" opacity="0.7" />

      {/* BEP marker */}
      <g>
        <circle cx={sx(bepQ)} cy={syH(bepH)} r="3" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.25" />
        <text x={sx(bepQ) + 6} y={syH(bepH) - 6}
              fontFamily="var(--mono)" fontSize="10" fill="var(--ink-2)">BEP</text>
      </g>

      {/* Intersection (system/pump duty) */}
      {cross.Q > 0 && (
        <g>
          <line x1={sx(cross.Q)} y1={M.t} x2={sx(cross.Q)} y2={M.t + ih}
                stroke="var(--rule)" strokeDasharray="1 3" />
          <circle cx={sx(cross.Q)} cy={syH(cross.H)} r="2.5" fill="var(--ink-2)" />
          <text x={sx(cross.Q) + 6} y={M.t + 14}
                fontFamily="var(--mono)" fontSize="10" fill="var(--mute)">duty · Q={uQ(cross.Q,1)}  H={uH(cross.H,1)}</text>
        </g>
      )}

      {/* Acceptance tolerance band around rated point */}
      {rated && tol && rated.Q > 0 && rated.Q < Qmax && (() => {
        const qLo = rated.Q * (1 - tol.dQ / 100), qHi = rated.Q * (1 + tol.dQ / 100);
        const hLo = rated.H * (1 - tol.dH / 100), hHi = rated.H * (1 + tol.dH / 100);
        return (
          <g>
            <rect x={sx(qLo)} y={syH(hHi)} width={Math.max(2, sx(qHi) - sx(qLo))} height={Math.max(2, syH(hLo) - syH(hHi))}
                  fill="none" stroke="var(--ink-2)" strokeWidth="0.75" strokeDasharray="2 2" opacity="0.8" />
            <text x={sx(qHi) + 3} y={syH(hHi) + 8} fontFamily="var(--mono)" fontSize="8" fill="var(--mute)">±{tol.dQ}%Q ±{tol.dH}%H</text>
          </g>
        );
      })()}

      {/* Rated / design point on the system curve */}
      {rated && rated.Q > 0 && rated.Q < Qmax && (
        <g>
          <path d={`M${sx(rated.Q)},${syH(rated.H) - 6} L${sx(rated.Q) - 5.5},${syH(rated.H) + 4} L${sx(rated.Q) + 5.5},${syH(rated.H) + 4} Z`}
                fill="var(--paper)" stroke="var(--ink-2)" strokeWidth="1.25" />
          <text x={sx(rated.Q)} y={syH(rated.H) + 16} textAnchor="middle"
                fontFamily="var(--mono)" fontSize="9" fill="var(--ink-2)">rated</text>
        </g>
      )}

      {/* Draggable operating point (crosshair) */}
      <g className="op-handle" onMouseDown={onDown}>
        <line x1={sx(op.Q)} y1={M.t} x2={sx(op.Q)} y2={M.t + ih}
              stroke="var(--accent)" strokeWidth="0.75" />
        <line x1={M.l} y1={syH(opH)} x2={M.l + iw} y2={syH(opH)}
              stroke="var(--accent)" strokeWidth="0.75" />
        {/* Outer ring */}
        <circle cx={sx(op.Q)} cy={syH(opH)} r="7" fill="var(--paper)" stroke="var(--accent)" strokeWidth="1.25" />
        <circle cx={sx(op.Q)} cy={syH(opH)} r="2" fill="var(--accent)" />
        {/* Eta marker on right axis */}
        <circle cx={sx(op.Q)} cy={syEta(opEta * 100)} r="3" fill="var(--accent)" />
        {/* NPSH markers */}
        <circle cx={sx(op.Q)} cy={syN(opNPSHr)} r="2.5" fill="var(--cool)" />
        <circle cx={sx(op.Q)} cy={syN(Math.max(0, opNPSHa))} r="2.5" fill="var(--paper)" stroke="var(--cool)" strokeWidth="1.25" />

        {/* Label block */}
        <g transform={`translate(${sx(op.Q) + 10}, ${syH(opH) - 30})`}>
          <rect x="0" y="0" width="118" height="44"
                fill="var(--paper)" stroke="var(--accent)" strokeWidth="0.75" />
          <text x="8" y="14" fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">
            Q  {uQ(op.Q,1).padStart(6)} {U.unit("flow")}
          </text>
          <text x="8" y="26" fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">
            H  {uH(opH,1).padStart(6)} {U.unit("head")}
          </text>
          <text x="8" y="38" fontFamily="var(--mono)" fontSize="10" fill="var(--ink)">
            η  {(opEta * 100).toFixed(1).padStart(6)} %
          </text>
        </g>
      </g>

      {/* Drafted-in labels for each curve near right edge */}
      <g fontFamily="var(--mono)" fontSize="10">
        <text x={M.l + iw - 6} y={syH(PM.combinedH(Qmax * 0.9, pump)) - 4} textAnchor="end" fill="var(--ink)">H(Q)</text>
        <text x={M.l + iw - 6} y={syH(PM.systemHead(Qmax * 0.9, sys)) - 4} textAnchor="end" fill="var(--ink-2)">H_sys</text>
        <text x={M.l + iw - 6} y={syEta(PM.combinedEta(Qmax * 0.85, pump) * 100) - 4} textAnchor="end" fill="var(--accent)">η</text>
        <text x={M.l + iw - 6} y={syN(PM.combinedNPSHr(Qmax * 0.85, pump)) - 4} textAnchor="end" fill="var(--cool)">NPSHr</text>
      </g>
    </svg>
  );
};

window.PumpChart = PumpChart;
