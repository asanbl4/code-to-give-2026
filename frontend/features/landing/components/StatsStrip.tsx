import { StatCard } from "@/components/ui";
import { STATS } from "../data";

export function StatsStrip() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pb-14 sm:px-8" aria-label="Community statistics">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <StatCard key={stat.label} value={stat.value} label={stat.label} />
        ))}
      </div>
    </section>
  );
}
