import { ReactNode } from "react";

export function AppBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute left-[-8rem] top-[-4rem] size-72 rounded-full bg-brand/12 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 size-72 rounded-full bg-accent/14 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 size-80 rounded-full bg-warning/10 blur-3xl" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
