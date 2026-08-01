import type { Metadata } from "next";
import { Button, Card, PageIntro } from "@/components/ui";
import { SignOutButton } from "@/features/admin/components/SignOutButton";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "No staff access",
  robots: { index: false, follow: false },
};

export default async function NoAccessPage() {
  const user = await getUser();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-24 sm:px-8">
      <PageIntro title="This account is not a staff account" />
      <Card padding="lg" className="mt-8">
        <p className="text-ink-soft">
          You are signed in{user?.email ? <> as <span className="font-bold text-ink">{user.email}</span></> : null},
          but this account has not been given access to the Love 21 staff tool.
        </p>
        <p className="mt-3 text-ink-soft">
          If that is wrong, ask a Love 21 administrator to add your email address.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <SignOutButton>Sign in as someone else</SignOutButton>
          <Button href="/" variant="secondary">
            Back to the site
          </Button>
        </div>
      </Card>
    </main>
  );
}
