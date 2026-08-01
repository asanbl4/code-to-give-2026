import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/ui";
import { LoginForm } from "@/features/admin/components/LoginForm";
import { isStaff } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already signed in as staff? Skip the form.
  if (await isStaff()) redirect("/admin/stories");

  const { error } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-24 sm:px-8">
      <PageIntro
        eyebrow="Love 21 staff"
        title="Sign in"
        lede="Staff accounts only. Access is granted by a Love 21 administrator."
      />
      <div className="mt-8">
        <LoginForm initialError={error} />
      </div>
    </main>
  );
}
