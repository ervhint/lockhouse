import Badge from "./Badge";

const map = {
  waiting: ["wait", "Waiting for Your Signature"],
  pending: ["wait", "Pending on QoreChain"],
  confirmed: ["ok", "Confirmed on QoreChain"],
  failed: ["bad", "Failed"],
} as const;

// Transaction status pill (Web3): one label for each step a transaction goes through.
export default function TxPill({ status }: { status: keyof typeof map }) {
  const [tone, label] = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}
