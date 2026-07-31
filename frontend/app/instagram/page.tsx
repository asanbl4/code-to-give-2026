import { InstagramFeed } from "@/features/instagram/components/InstagramFeed";

export const metadata = {
  title: "Instagram — Love 21",
};

export default function InstagramPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-6 sm:p-8 font-sans">
      <h1 className="mb-1 text-2xl font-semibold">Latest from Instagram</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Posts pulled from the Instagram Graph API (MVP).
      </p>
      <InstagramFeed limit={12} />
    </main>
  );
}
