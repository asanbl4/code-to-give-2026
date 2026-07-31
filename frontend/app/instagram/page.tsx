import { InstagramSection } from "@/features/instagram/components/InstagramSection";

// Standalone page for testing the feed in isolation. The real usage is the
// embeddable <InstagramSection /> — see app/page.tsx. Safe to delete this route.
export const metadata = {
  title: "Instagram — Love 21",
};

export default function InstagramPage() {
  return (
    <main className="flex-1 font-sans">
      <InstagramSection
        headingLevel={1}
        subtitle="Posts pulled live from the Instagram Graph API."
      />
    </main>
  );
}
