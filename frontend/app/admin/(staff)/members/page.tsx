import type { Metadata } from "next";
import { MembersWorkspace } from "@/features/admin/components/MembersWorkspace";

export const metadata: Metadata = {
  title: "Members — Stories admin",
  robots: { index: false, follow: false },
};

/**
 * The member directory: everyone whose story the charity might publish.
 *
 * Access is gated in the group's layout, so by the time this renders the caller
 * has a verified session and a staff role.
 */
export default function AdminMembersPage() {
  return <MembersWorkspace />;
}
