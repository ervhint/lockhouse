import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../app/api/chain/[...path]/route";

const ctx = (path: string[]) => ({ params: Promise.resolve({ path }) });
const call = (fn: typeof GET, url: string, path: string[], init?: RequestInit) => fn(new Request(`http://localhost:3000/api/chain/${url}`, init) as never, ctx(path));

afterEach(() => vi.restoreAllMocks());

describe("/api/chain", () => {
  // T-2.8 a path not on the list, or another host: 404 and nothing forwarded
  it("refuses unlisted paths and other hosts without forwarding", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    for (const [fn, path] of [
      [GET, ["cosmos", "bank", "v1beta1", "supply"]],
      [GET, ["https:", "", "evil.example", "cosmos", "auth", "v1beta1", "account_info", "qor1w0c3th6k7gu3ptylnz6ngv2lskw6vaa29s60ha"]],
      [GET, ["cosmos", "tx", "v1beta1", "txs"]],
      [POST, ["cosmos", "tx", "v1beta1", "txs", "..", "simulate"]],
    ] as const) {
      const res = await call(fn, path.join("/"), [...path], fn === POST ? { method: "POST", body: "{}" } : undefined);
      expect(res.status).toBe(404);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards a listed path to the testnet REST only", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response('{"found":false}', { status: 200 }));
    const path = ["qorechain", "pqc", "v1", "kem", "qor1w0c3th6k7gu3ptylnz6ngv2lskw6vaa29s60ha"];
    const res = await call(GET, path.join("/"), path);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ found: false });
    expect(fetch.mock.calls[0][0]).toBe("https://api-testnet.qore.host/qorechain/pqc/v1/kem/qor1w0c3th6k7gu3ptylnz6ngv2lskw6vaa29s60ha");
  });
});
