import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout";
import { PageIntro } from "@/components/ui";
import { SignOutButton } from "@/features/admin/components/SignOutButton";
import { VolunteerDashboard } from "@/features/events/components/VolunteerDashboard";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My volunteer application",
  robots: { index: false, follow: false },
};

export default async function VolunteerPage() {
  const user = await getUser();
  if (!user) redirect("/volunteer/login");

  return (
    <PageShell>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <PageIntro
          eyebrow="Volunteer portal"
          title="Your application journey"
          lede="Follow your review, onboarding checks, and approval in one place."
        />
        <div className="flex flex-col items-end gap-2">
          {user.email && <span className="text-sm text-ink-soft">{user.email}</span>}
          <SignOutButton redirectTo="/volunteer/login" />
        </div>
      </div>
      <VolunteerDashboard />
    </PageShell>
  );
}
