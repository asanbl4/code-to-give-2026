import type { Metadata } from "next";
import { PhotosWorkspace } from "@/features/admin/components/PhotosWorkspace";

export const metadata: Metadata = {
  title: "Group photos — Stories admin",
  robots: { index: false, follow: false },
};

/**
 * Group photo review.
 *
 * The whole point is that adding a photo should cost one upload and a few
 * clicks. Detection draws the boxes and the matcher fills in the names; the
 * staff member's job is to agree or correct, which is also the safeguard —
 * nothing published here was decided by a model alone.
 */
export default function AdminPhotosPage() {
  return <PhotosWorkspace />;
}
