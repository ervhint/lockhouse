// T-0.5: after `next build`, no server secret (name or value) may be in the browser files.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

const names = ["SUPABASE_SERVICE_ROLE_KEY", "SESSION_SECRET", "TEST_MNEMONIC"];
const values = names.flatMap((n) => [process.env[n], process.env[`${n}_1`]]).filter((v) => v && v.length > 8);
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const dir = ".next/static";
if (!existsSync(dir)) { console.error("Run `npm run build` first."); process.exit(1); }
const bad = walk(dir).filter((f) => { const t = readFileSync(f, "utf8"); return names.some((n) => t.includes(n)) || values.some((v) => t.includes(v)); });
if (bad.length) { console.error("Secret found in:", bad); process.exit(1); }
console.log("Browser files are clean.");
