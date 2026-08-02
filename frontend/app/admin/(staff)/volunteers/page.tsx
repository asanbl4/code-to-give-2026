import type { Metadata } from "next";
import { VolunteerApplicationsWorkspace } from "@/features/admin/components/VolunteerApplicationsWorkspace";

export const metadata: Metadata = {
  title: "Volunteers — Staff admin",
  robots: { index: false, follow: false },
};

export default function AdminVolunteersPage() {
  return <VolunteerApplicationsWorkspace />;
}
