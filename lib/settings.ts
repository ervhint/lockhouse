// The one place for fixed facts. Testnet only (NF-3): nothing here reads an env var.
export const CHAIN_ID = "qorechain-diana";
export const REST = "https://api-testnet.qore.host";
export const RPC = "https://rpc-testnet.qore.host";
// The explorer keeps Testnet/Mainnet in its own header switch (no link can pick it; checked 23 Nov).
export const EXPLORER = "https://explore.qore.network";
export const explorerTx = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const explorerAddress = (address: string) => `${EXPLORER}/address/${address}`;
export const FAUCET = "https://dashboard.qorechain.io/faucet"; // sign-in there; 100 test QOR per 24 h (docs, 23 Nov)
export const ITEM_PURPOSE = "lockhouse-item";
