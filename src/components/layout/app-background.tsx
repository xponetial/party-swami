import { ReactNode } from "react";

export function AppBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.18)_100%)]" />
        <div className="absolute left-[-8rem] top-[-4rem] size-72 rounded-full bg-accent/12 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 size-72 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 size-80 rounded-full bg-warning/8 blur-3xl" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
