(function (global) {
  const APP_VERSION = "0.10.26";
  const CASE_SCHEMA = "pumpcalc.case.v1";
  const CASE_LIBRARY_SCHEMA = "pumpcalc.cases.v1";
  const CASE_HASH_PREFIX = "#case=";

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function cleanReportMeta(meta = {}) {
    const next = { ...meta };
    if (next.preparedBy === "J. Rivera") {
      next.preparedBy = "";
      next.discipline = "";
    }
    return next;
  }

  function mergeState(base, saved) {
    const src = saved || {};
    return {
      ...base,
      ...src,
      pump: { ...base.pump, ...(src.pump || {}) },
      sys: { ...base.sys, ...(src.sys || {}) },
      design: { ...base.design, ...(src.design || {}) },
      econ: { ...base.econ, ...(src.econ || {}) },
      meta: { ...base.meta, ...cleanReportMeta(src.meta || {}) },
    };
  }

  function safeFilename(value, fallback = "pump_case") {
    const clean = String(value || "").trim()
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return clean || fallback;
  }

  function uniqueCaseName(base, existing) {
    const root = String(base || "Imported case").trim() || "Imported case";
    if (!existing[root]) return root;
    let i = 2;
    while (existing[`${root} (${i})`]) i += 1;
    return `${root} (${i})`;
  }

  function stripJsonExtension(fileName) {
    return String(fileName || "").replace(/\.json$/i, "");
  }

  function looksLikeCase(value) {
    return isPlainObject(value) && isPlainObject(value.pump) && isPlainObject(value.sys);
  }

  function assertCaseLike(value, message = "Case JSON must include pump and sys objects.") {
    if (!looksLikeCase(value)) throw new Error(message);
  }

  function buildCaseExport(state, name, exportedAt = new Date().toISOString()) {
    const exportName = String(name || state?.meta?.tag || state?.meta?.docNo || "Current case").trim() || "Current case";
    return {
      filename: `${safeFilename(exportName)}.pumpcase.json`,
      payload: {
        schema: CASE_SCHEMA,
        version: 1,
        appVersion: APP_VERSION,
        name: exportName,
        exportedAt,
        state,
      },
    };
  }

  function buildCaseLibraryExport(cases, exportedAt = new Date().toISOString()) {
    return {
      filename: "pumpcalc_cases.json",
      payload: {
        schema: CASE_LIBRARY_SCHEMA,
        version: 1,
        appVersion: APP_VERSION,
        exportedAt,
        cases,
      },
    };
  }

  function buildCaseLinkHash(state, name, exportedAt = new Date().toISOString()) {
    const { payload } = buildCaseExport(state, name, exportedAt);
    return `${CASE_HASH_PREFIX}${encodeURIComponent(JSON.stringify(payload))}`;
  }

  function parseCaseLinkHash(hash, initialState) {
    const value = String(hash || "").trim();
    const normalized = value.startsWith("#") ? value.slice(1) : value;
    if (!normalized.startsWith("case=")) return null;

    let payload;
    try {
      payload = JSON.parse(decodeURIComponent(normalized.slice("case=".length)));
    } catch {
      throw new Error("Shared case link is not valid JSON.");
    }

    const rawState = payload?.schema === CASE_SCHEMA
      ? payload.state
      : payload;
    assertCaseLike(rawState, "Shared case link must include pump and sys objects.");
    const state = mergeState(initialState, rawState);
    return {
      name: payload?.name || state.meta?.tag || state.meta?.docNo || "Shared case",
      state,
    };
  }

  function parseCaseImport(payload, fileName, existingCases, initialState) {
    if (!isPlainObject(payload)) {
      throw new Error("JSON does not contain a case or case library.");
    }

    const existing = isPlainObject(existingCases) ? existingCases : {};
    const hasStateProp = Object.prototype.hasOwnProperty.call(payload, "state");
    const stateLooksLikeCase = hasStateProp && looksLikeCase(payload.state);
    const hasSiblingCase = Object.entries(payload)
      .some(([key, value]) => key !== "state" && looksLikeCase(value));
    const legacySingleCaseWrapper = stateLooksLikeCase && !hasSiblingCase && !looksLikeCase(payload);

    if (payload.schema === CASE_SCHEMA || legacySingleCaseWrapper || looksLikeCase(payload)) {
      const rawState = payload.schema === CASE_SCHEMA || legacySingleCaseWrapper
        ? payload.state
        : payload;
      assertCaseLike(rawState);
      const imported = mergeState(initialState, rawState);
      const baseName = payload.name || imported.meta?.tag || stripJsonExtension(fileName) || "Imported case";
      const name = uniqueCaseName(baseName, existing);
      return {
        kind: "case",
        cases: { ...existing, [name]: imported },
        activeName: name,
        activeState: imported,
        imported: 1,
        skipped: 0,
        message: `Imported case "${name}".`,
      };
    }

    const rawCases = payload.schema === CASE_LIBRARY_SCHEMA
      ? payload.cases
      : (isPlainObject(payload.cases) ? payload.cases : payload);
    if (!isPlainObject(rawCases)) {
      throw new Error("JSON does not contain a case or case library.");
    }

    const next = { ...existing };
    let imported = 0;
    let skipped = 0;
    for (const [rawName, rawState] of Object.entries(rawCases)) {
      if (!looksLikeCase(rawState)) {
        skipped += 1;
        continue;
      }
      const name = uniqueCaseName(rawName || "Imported case", next);
      next[name] = mergeState(initialState, rawState);
      imported += 1;
    }

    if (!imported) {
      throw new Error("No valid cases were found. Each library entry must include pump and sys objects.");
    }

    return {
      kind: "library",
      cases: next,
      activeName: "",
      activeState: null,
      imported,
      skipped,
      message: skipped
        ? `Imported ${imported} case(s); skipped ${skipped} invalid entr${skipped === 1 ? "y" : "ies"}.`
        : `Imported ${imported} case(s) into library.`,
    };
  }

  global.PumpCases = {
    APP_VERSION,
    CASE_SCHEMA,
    CASE_LIBRARY_SCHEMA,
    buildCaseExport,
    buildCaseLibraryExport,
    buildCaseLinkHash,
    cleanReportMeta,
    CASE_HASH_PREFIX,
    isPlainObject,
    looksLikeCase,
    mergeState,
    parseCaseImport,
    parseCaseLinkHash,
    safeFilename,
    uniqueCaseName,
  };
})(typeof window !== "undefined" ? window : globalThis);
