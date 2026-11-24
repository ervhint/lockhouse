// 24 secret words in a numbered grid, to copy onto paper (S-03, and the house's recovery key).
export default function Words({ words }: { words: string[] }) {
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {words.map((w, i) => (
        <li key={i} className="flex gap-2 rounded-lg bg-white/8 px-3 py-2 font-mono text-sm"><span className="w-5 text-muted">{i + 1}</span>{w}</li>
      ))}
    </ol>
  );
}
