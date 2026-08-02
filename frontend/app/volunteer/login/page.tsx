import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout";
import { PageIntro } from "@/components/ui";
import { VolunteerPortalLoginForm } from "@/features/events/components/VolunteerPortalLoginForm";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Volunteer portal sign in",
  robots: { index: false, follow: false },
};

export default async function VolunteerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getUser()) redirect("/volunteer");
  const { error } = await searchParams;

  return (
    <PageShell width="narrow">
      <PageIntro
        eyebrow="Volunteer portal"
        title="See your onboarding progress"
        lede="Sign in with the email and password you created when submitting your volunteer application."
      />
      <div className="mt-8 max-w-xl">
        <VolunteerPortalLoginForm initialError={error} />
      </div>
    </PageShell>
  );
}
