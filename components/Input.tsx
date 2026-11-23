import type { ComponentProps } from "react";

type Props = { label: string; hint?: string; error?: string; multiline?: boolean } & (ComponentProps<"input"> | ComponentProps<"textarea">);

// The one text field: label, hint and error in one place.
export default function Input({ label, hint, error, multiline, id, ...rest }: Props) {
  const fid = id ?? `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  const cls = `w-full rounded-xl border bg-white/8 px-4 py-3 text-[15px] text-mist placeholder:text-muted/70 disabled:opacity-50 file:mr-3 file:rounded-full file:border-0 file:bg-lime file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-ink ${error ? "border-danger" : "border-white/20"}`;
  const note = error ?? hint;
  const common = { id: fid, className: cls, "aria-invalid": error ? true : undefined, "aria-describedby": note ? `${fid}-note` : undefined };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fid} className="text-sm font-medium">{label}</label>
      {multiline ? <textarea rows={4} {...common} {...(rest as ComponentProps<"textarea">)} /> : <input {...common} {...(rest as ComponentProps<"input">)} />}
      {note && <p id={`${fid}-note`} className={`text-sm ${error ? "text-danger" : "text-muted"}`}>{note}</p>}
    </div>
  );
}
