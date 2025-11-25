// scripts/calc-coverage.mjs
//
// Usage:
//   node scripts/calc-coverage.mjs [lcovPath] [changedListPath] [featureListPath]
//
// Defaults:
//   lcovPath        = coverage/lcov.info
//   changedListPath = .changed-files.txt
//   featureListPath = .feature-scope.txt
//
// This parses a single LCOV file and prints coverage metrics (Lines, Branches,
// Functions) for:
//   - Overall   (all files in LCOV)
//   - Changed   (files whose SF: path matches any fragment in changed list)
//   - Feature   (files whose SF: path matches any fragment in feature list)
//
// Matching is substring/suffix-based, case-sensitive, like lcov-filter.mjs.

import fs from "fs";
import path from "path";

const [, , lcovPathArg, changedListArg, featureListArg] = process.argv;

const LCOV_PATH = lcovPathArg || "coverage/lcov.info";
const CHANGED_LIST_PATH = changedListArg || ".changed-files.txt";
const FEATURE_LIST_PATH = featureListArg || ".feature-scope.txt";

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function loadList(p) {
  if (!fileExists(p)) return [];
  return fs
    .readFileSync(p, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

// Normalize to forward slashes for matching
function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

// Same matching semantics as lcov-filter.mjs
function makeMatcher(fragments) {
  const normFrags = fragments.map((f) => f.replace(/\\/g, "/"));
  return (sfPath) => {
    const norm = normalizePath(sfPath);
    return normFrags.some((frag) => norm.endsWith(frag) || norm.includes(frag));
  };
}

if (!fileExists(LCOV_PATH)) {
  console.error(`LCOV file not found: ${LCOV_PATH}`);
  process.exit(1);
}

const changedList = loadList(CHANGED_LIST_PATH);
const featureList = loadList(FEATURE_LIST_PATH);

const lcovRaw = fs.readFileSync(LCOV_PATH, "utf8");

// Parse LCOV into per-file summaries
const rawRecords = lcovRaw
  .split("end_of_record")
  .map((r) => r.trim())
  .filter(Boolean);

const records = [];

for (const rec of rawRecords) {
  const lines = rec
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let sfPath = null;

  let lineTotal = 0;
  let lineCovered = 0;

  let branchTotal = 0;
  let branchCovered = 0;

  const fnNames = new Set(); // all function names seen
  const fnCovered = new Set(); // names with hits > 0

  for (const l of lines) {
    if (l.startsWith("SF:")) {
      sfPath = l.slice(3).trim();
    } else if (l.startsWith("DA:")) {
      const parts = l.slice(3).split(",");
      if (parts.length >= 2) {
        const hits = Number(parts[1]);
        if (!Number.isNaN(hits)) {
          lineTotal += 1;
          if (hits > 0) lineCovered += 1;
        }
      }
    } else if (l.startsWith("BRDA:")) {
      const parts = l.slice(5).split(",");
      if (parts.length >= 4) {
        const hitsStr = parts[3];
        branchTotal += 1;
        if (hitsStr !== "-" && Number(hitsStr) > 0) {
          branchCovered += 1;
        }
      }
    } else if (l.startsWith("FN:")) {
      const fnParts = l.slice(3).split(",");
      if (fnParts.length >= 2) {
        const name = fnParts[1];
        if (name) fnNames.add(name);
      }
    } else if (l.startsWith("FNDA:")) {
      const fnParts = l.slice(5).split(",");
      if (fnParts.length >= 2) {
        const hits = Number(fnParts[0]);
        const name = fnParts[1];
        if (name) {
          fnNames.add(name);
          if (!Number.isNaN(hits) && hits > 0) {
            fnCovered.add(name);
          }
        }
      }
    }
  }

  if (!sfPath) continue;

  records.push({
    sfPath,
    lineTotal,
    lineCovered,
    branchTotal,
    branchCovered,
    fnTotal: fnNames.size,
    fnCovered: fnCovered.size,
  });
}

function aggregateRecords(filterFn) {
  let files = 0;

  let linesTotal = 0;
  let linesCovered = 0;

  let branchesTotal = 0;
  let branchesCovered = 0;

  let funcsTotal = 0;
  let funcsCovered = 0;

  for (const r of records) {
    if (!filterFn(r.sfPath)) continue;

    files += 1;

    linesTotal += r.lineTotal;
    linesCovered += r.lineCovered;

    branchesTotal += r.branchTotal;
    branchesCovered += r.branchCovered;

    funcsTotal += r.fnTotal;
    funcsCovered += r.fnCovered;
  }

  function pct(c, t) {
    if (!t) return "0.00";
    return ((c / t) * 100).toFixed(2);
  }

  return {
    files,
    linesTotal,
    linesCovered,
    branchesTotal,
    branchesCovered,
    funcsTotal,
    funcsCovered,
    linesPct: pct(linesCovered, linesTotal),
    branchesPct: pct(branchesCovered, branchesTotal),
    funcsPct: pct(funcsCovered, funcsTotal),
  };
}

const allMatcher = () => true;
const changedMatcher =
  changedList.length > 0 ? makeMatcher(changedList) : () => false;
const featureMatcher =
  featureList.length > 0 ? makeMatcher(featureList) : () => false;

const overall = aggregateRecords(allMatcher);
const changed = aggregateRecords(changedMatcher);
const feature = aggregateRecords(featureMatcher);

function printSection(title, stats, note = "") {
  console.log(`\n${title}`);
  if (note) console.log(note);
  console.log(`  Files: ${stats.files}`);
  console.log(
    `  Lines:    ${stats.linesPct}% (${stats.linesCovered}/${stats.linesTotal})`
  );
  console.log(
    `  Branches: ${stats.branchesPct}% (${stats.branchesCovered}/${stats.branchesTotal})`
  );
  console.log(
    `  Functions:${" "}${stats.funcsPct}% (${stats.funcsCovered}/${
      stats.funcsTotal
    })`
  );
}

console.log("Coverage summary from", path.resolve(LCOV_PATH));

printSection("Overall coverage (all files in LCOV):", overall);

if (changedList.length) {
  printSection(
    "Changed-files coverage (matching .changed-files.txt):",
    changed,
    `  Match list entries: ${changedList.length}`
  );
} else {
  console.log(
    "\nChanged-files coverage: .changed-files.txt not found or empty; skipping."
  );
}

if (featureList.length) {
  printSection(
    "Feature-scope coverage (matching .feature-scope.txt):",
    feature,
    `  Match list entries: ${featureList.length}`
  );
} else {
  console.log(
    "\nFeature-scope coverage: .feature-scope.txt not found or empty; skipping."
  );
}

console.log("\nDone.");
