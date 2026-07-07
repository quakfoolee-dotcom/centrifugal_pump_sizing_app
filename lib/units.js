// units.js — display-layer unit conversion. SI is the internal source of truth.
// makeUnits('SI'|'US') -> { system, US, conv, toSI, unit, factor, fmt }
// Quantities: flow, head, power, press, dia, len, vel, dens, specE, temp, visc, none
(function (global) {
  global.makeUnits = function (system) {
    const US = system === "US";
    // SI -> display multiplicative factors (linear quantities)
    const F = {
      flow:  US ? 4.402868   : 1,   // m³/h -> US gpm
      head:  US ? 3.280840   : 1,   // m -> ft
      power: US ? 1.341022   : 1,   // kW -> hp
      press: US ? 0.1450377  : 1,   // kPa -> psi
      dia:   US ? 0.03937008 : 1,   // mm -> in
      len:   US ? 3.280840   : 1,   // m -> ft
      vel:   US ? 3.280840   : 1,   // m/s -> ft/s
      dens:  US ? 0.06242796 : 1,   // kg/m³ -> lb/ft³
      specE: US ? 3.785412   : 1,   // kWh/m³ -> kWh/kgal
    };
    const UL = US ? {
      flow: "gpm", head: "ft", power: "hp", press: "psi", dia: "in", len: "ft",
      vel: "ft/s", dens: "lb/ft³", specE: "kWh/kgal", temp: "°F", visc: "cP", none: "",
    } : {
      flow: "m³/h", head: "m", power: "kW", press: "kPa", dia: "mm", len: "m",
      vel: "m/s", dens: "kg/m³", specE: "kWh/m³", temp: "°C", visc: "cP", none: "",
    };
    const conv = (q, v) => {
      if (v == null || !isFinite(v)) return v;
      if (q === "temp") return US ? v * 9 / 5 + 32 : v;
      return v * (F[q] != null ? F[q] : 1);
    };
    const toSI = (q, v) => {
      if (v == null || !isFinite(v)) return v;
      if (q === "temp") return US ? (v - 32) * 5 / 9 : v;
      return v / (F[q] != null ? F[q] : 1);
    };
    const unit = (q) => (UL[q] != null ? UL[q] : "");
    const factor = (q) => (F[q] != null ? F[q] : 1);
    // format a SI value into display string with n decimals
    const fmt = (q, v, n = 2) => {
      const d = conv(q, v);
      return (d == null || !isFinite(d)) ? "—" : d.toFixed(n);
    };
    return { system, US, conv, toSI, unit, factor, fmt };
  };
})(window);
