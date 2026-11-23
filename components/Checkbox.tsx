import type { ComponentProps, ReactNode } from "react";

// A row with a checkbox, used to pick readers.
export default function Checkbox({ children, className = "", ...rest }: { children: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border border-white/15 bg-white/6 px-4 py-3 has-[:checked]:border-lime/70 has-[:checked]:bg-lime/10 ${className}`}>
      <input type="checkbox" className="size-5 accent-lime" {...rest} />
      {children}
    </label>
  );
}
