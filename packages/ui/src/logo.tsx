export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-semibold tracking-[-0.02em] text-neutral-950">
      <span className="grid size-7 place-items-center rounded-lg bg-neutral-950 font-serif text-[17px] font-medium text-white">
        B
      </span>
      {compact ? null : "Brief"}
    </span>
  );
}
