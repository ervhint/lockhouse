// Makes TEST_MNEMONIC_1..3 and SESSION_SECRET in .env.local if missing, then prints the 3 qor1 addresses to fund.
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { generateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { deriveClassicalKey, addressFromPublicKey } from "@qorechain/qoresign";

const file = ".env.local";
let env = existsSync(file) ? readFileSync(file, "utf8") : "";
const add = (k, v) => { if (!new RegExp(`^${k}=`, "m").test(env)) { env += `${k}=${v}\n`; appendFileSync(file, `${k}=${v}\n`); } };
for (const i of [1, 2, 3]) add(`TEST_MNEMONIC_${i}`, `"${generateMnemonic(wordlist, 256)}"`);
add("SESSION_SECRET", randomBytes(32).toString("hex"));
add("SUPABASE_URL", "https://egtxrdfhmtdiujdiywkm.supabase.co");
if (!/^SUPABASE_SERVICE_ROLE_KEY=/m.test(env)) console.log("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local (Staging): add it by hand.");
for (const i of [1, 2, 3]) {
  const m = env.match(new RegExp(`^TEST_MNEMONIC_${i}="(.*)"`, "m"))[1];
  const k = deriveClassicalKey({ mnemonic: m });
  console.log(`Test account ${i}:`, addressFromPublicKey(k.publicKey, k.type).bech32 ?? addressFromPublicKey(k.publicKey, k.type));
}
