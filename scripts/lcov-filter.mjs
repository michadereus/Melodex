// scripts/lcov-filter.mjs
//
// Usage:
//   node scripts/lcov-filter.mjs <input-lcov> <paths-list.txt> <output-lcov>
//
// - <input-lcov>: path to original lcov.info (e.g. coverage/lcov.info)
// - <paths-list.txt>: file with one path fragment per line
//       Example line: melodex-front-end/src/components/Rankings.jsx
// - <output-lcov>: where to write the filtered LCOV
//
// This keeps only LCOV records whose SF: path matches any line
// in <paths-list.txt> (substring or suffix match, case-sensitive).

import fs from "fs";
import path from "path";

const [, , inputPath, pathsListPath, outputPath] = process.argv;

if (!inputPath || !pathsListPath || !outputPath) {
  console.error(
    "Usage: node scripts/lcov-filter.mjs <input-lcov> <paths-list.txt> <output-lcov>"
  );
  process.exit(1);
}

// Read and normalize the list of path matchers
const rawList = fs
  .readFileSync(pathsListPath, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

if (rawList.length === 0) {
  console.error(`No paths found in ${pathsListPath}`);
  process.exit(1);
}

// Read the full LCOV
const lcovRaw = fs.readFileSync(inputPath, "utf8");

// LCOV records are separated by "end_of_record"
const records = lcovRaw
  .split("end_of_record")
  .map((r) => r.trim())
  .filter(Boolean);

let kept = [];

// Simple helper: does this source file path match any of our patterns?
const matchesAny = (sfPath) => {
  // Normalize to forward slashes for matching
  const norm = sfPath.replace(/\\/g, "/");
  return rawList.some((fragment) => {
    const f = fragment.replace(/\\/g, "/");
    return norm.endsWith(f) || norm.includes(f);
  });
};

for (const rec of records) {
  const lines = rec.split("\n").map((l) => l.trim());
  const sfLine = lines.find((l) => l.startsWith("SF:"));
  if (!sfLine) continue;

  const sfPath = sfLine.slice(3).trim();
  if (!sfPath) continue;

  if (matchesAny(sfPath)) {
    kept.push(lines.join("\n") + "\nend_of_record");
  }
}

// Write result (even if empty; tools can handle empty file or no matches)
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  kept.join("\n") + (kept.length ? "\n" : ""),
  "utf8"
);

// Optional: tiny summary to stdout
let totalLines = 0;
let coveredLines = 0;

for (const block of kept) {
  const lines = block.split("\n");
  for (const l of lines) {
    if (l.startsWith("DA:")) {
      const parts = l.slice(3).split(",");
      if (parts.length >= 2) {
        const hits = Number(parts[1]);
        totalLines += 1;
        if (hits > 0) coveredLines += 1;
      }
    }
  }
}

if (kept.length) {
  const pct = totalLines
    ? ((coveredLines / totalLines) * 100).toFixed(2)
    : "0.00";
  console.log(
    `Filtered LCOV written to ${outputPath} — Files: ${kept.length}, ` +
      `Lines: ${pct}% (${coveredLines}/${totalLines})`
  );
} else {
  console.log(`No matching records found. Wrote empty LCOV to ${outputPath}.`);
}
