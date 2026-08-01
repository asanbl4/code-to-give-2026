import { InstagramSection } from "@/features/instagram/components/InstagramSection";

export default function Home() {
  return (
    <main className="flex-1 font-sans">
      {/* Placeholder hero — the real landing design is still TBD. */}
      <section className="border-b border-zinc-200 px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold text-zinc-900">Love 21 Foundation</h1>
        <p className="mt-2 text-zinc-500">Landing page — work in progress.</p>
      </section>

      {/* Drop-in Instagram section. Move/copy <InstagramSection /> anywhere. */}
      <InstagramSection
        title="Latest from Instagram"
        subtitle="Fresh updates from our community."
        limit={6}
      />
    </main>
  );
}
