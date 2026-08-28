/**
 * Generates 200 unique 10-digit codes and writes them as a ready-to-run
 * SQL file (supabase/seed.sql) that inserts them into the `codes` table.
 *
 * Usage:  node scripts/generate-codes.js  [count]
 * Then paste the contents of supabase/seed.sql into the Supabase SQL editor.
 */
const fs = require("fs");
const path = require("path");

const COUNT = Number(process.argv[2]) || 200;
const codes = new Set();

while (codes.size < COUNT) {
  // 10-digit numeric code, first digit non-zero so it always displays as 10 digits
  const first = String(Math.floor(Math.random() * 9) + 1);
  const rest = String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0");
  codes.add(first + rest);
}

const values = [...codes].map((c) => `('${c}')`).join(",\n");
const sql = `-- Auto-generated ${new Date().toISOString()} — ${COUNT} unique codes\ninsert into codes (code) values\n${values}\non conflict (code) do nothing;\n`;

const outPath = path.join(__dirname, "..", "supabase", "seed.sql");
fs.writeFileSync(outPath, sql, "utf8");

// also dump a plain CSV so you can hand codes out (e.g. print on cards/vouchers)
const csvPath = path.join(__dirname, "..", "supabase", "codes.csv");
fs.writeFileSync(csvPath, "code\n" + [...codes].join("\n") + "\n", "utf8");

console.log(`Generated ${codes.size} unique codes.`);
console.log(`SQL:  ${outPath}`);
console.log(`CSV:  ${csvPath}`);
