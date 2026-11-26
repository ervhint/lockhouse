import { REST } from "@/lib/settings";

// Pass-through to the testnet REST, only for the paths the kits use (D-03, AC-2.8).
// The host is fixed, so nothing can point it elsewhere (NF-3).
const ADDR = "qor1[02-9ac-hj-np-z]{38,58}";
const GETS = [
  `cosmos/auth/v1beta1/account_info/${ADDR}`,
  `cosmos/bank/v1beta1/balances/${ADDR}`,
  `qorechain/pqc/v1/account/${ADDR}`,
  `qorechain/pqc/v1/kem/${ADDR}`,
  "qorechain/pqc/v1/protocol_features",
  "cosmos/upgrade/v1beta1/applied_plan/v[0-9.]+",
  "cosmos/tx/v1beta1/txs/[0-9A-Fa-f]{64}",
].map((p) => new RegExp(`^${p}$`));
const POSTS = [/^cosmos\/tx\/v1beta1\/(simulate|txs|encode)$/]; // encode: inspectTransaction reads a stamp's bytes (U11)

async function pass(req: Request, ctx: RouteContext<"/api/chain/[...path]">, list: RegExp[]) {
  const path = (await ctx.params).path.join("/");
  if (!list.some((re) => re.test(path))) return new Response("Not found", { status: 404 });
  // ponytail: no body size cap of our own; signed txs are ~15 KB and Vercel stops requests at 4.5 MB.
  const body = req.method === "POST" ? await req.text() : undefined;
  const res = await fetch(`${REST}/${path}`, { method: req.method, headers: { "content-type": "application/json" }, body, cache: "no-store" });
  return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } });
}

export const GET = (req: Request, ctx: RouteContext<"/api/chain/[...path]">) => pass(req, ctx, GETS);
export const POST = (req: Request, ctx: RouteContext<"/api/chain/[...path]">) => pass(req, ctx, POSTS);
