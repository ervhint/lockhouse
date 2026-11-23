// The turning core: three layers, each turned a little, around one dot.
// Drawn in currentColor, so it always matches the "Lockhouse" word next to it.
export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="29 29 72 72" width={size} height={size} aria-hidden="true" className="flex-none" fill="none" stroke="currentColor" strokeWidth={4.5}>
      <rect x="33" y="33" width="64" height="64" rx="10" />
      <rect x="43" y="43" width="44" height="44" rx="7" transform="rotate(22.5 65 65)" />
      <rect x="53" y="53" width="24" height="24" rx="4" transform="rotate(45 65 65)" />
      <circle cx="65" cy="65" r="4.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
