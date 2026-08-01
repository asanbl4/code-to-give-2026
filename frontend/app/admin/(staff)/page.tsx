import { redirect } from "next/navigation";

/** `/admin` on its own is not a page. Send people to the members directory. */
export default function AdminIndexPage() {
  redirect("/admin/members");
}
