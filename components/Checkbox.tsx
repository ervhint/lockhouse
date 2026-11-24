import type { ComponentProps, ReactNode } from "react";

// A row with a checkbox (pick readers), or with `radio` a radio button (pick one of a few).
export default function Checkbox({ children, className = "", radio, ...rest }: { children: ReactNode; radio?: boolean } & Omit<ComponentProps<"input">, "type">) {
  return (
    <label className={`flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-white/15 bg-white/6 px-4 py-3 has-[:checked]:border-lime/70 has-[:checked]:bg-lime/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-lime ${className}`}>
      <input type={radio ? "radio" : "checkbox"} className="size-5 accent-lime" {...rest} />
      {children}
    </label>
  );
}
