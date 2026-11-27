import type { ComponentProps } from "react";

type Option = { value: string; label: string };
type Props = { label: string; hint?: string; error?: string; multiline?: boolean; options?: Option[] }
  & (ComponentProps<"input"> | ComponentProps<"textarea"> | ComponentProps<"select">);

// The one text field: label, hint and error in one place. `multiline` makes it a textarea, `options` a dropdown.
export default function Input({ label, hint, error, multiline, options, id, ...rest }: Props) {
  const fid = id ?? `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  const cls = `w-full rounded-xl border bg-white/8 px-4 py-3 text-base sm:text-[15px] text-mist placeholder:text-muted/70 disabled:opacity-50 file:mr-3 file:rounded-full file:border-0 file:bg-lime file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-ink ${error ? "border-danger" : "border-white/20"}`;
  const note = error ?? hint;
  const common = { id: fid, className: cls, "aria-invalid": error ? true : undefined, "aria-describedby": note ? `${fid}-note` : undefined };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fid} className="text-sm font-medium">{label}</label>
      {options
        ? <select {...common} {...(rest as ComponentProps<"select">)}>{options.map((o) => <option key={o.value} value={o.value} className="bg-ink">{o.label}</option>)}</select>
        : multiline ? <textarea rows={4} {...common} className={`${cls} field-sizing-content min-h-28`} {...(rest as ComponentProps<"textarea">)} /> : <input {...common} {...(rest as ComponentProps<"input">)} />}
      {note && <p id={`${fid}-note`} className={`text-sm ${error ? "text-danger" : "text-muted"}`}>{note}</p>}
    </div>
  );
}
