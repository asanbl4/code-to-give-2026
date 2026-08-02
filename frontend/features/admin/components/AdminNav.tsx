"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const SECTIONS = [
  { href: "/admin/members", label: "Members" },
  { href: "/admin/photos", label: "Group photos" },
  { href: "/admin/volunteers", label: "Volunteers" },
];

/**
 * Moving between the two halves of the tool.
 *
 * Links, not `Tabs`: that component is a `role="tablist"` with `aria-controls`
 * pointing at panels on the same page and arrow-key navigation between them.
 * Wearing those semantics over routes tells a screen-reader user this is one
 * page when it is two.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="mt-6 flex flex-wrap gap-2 border-b-2 border-edge">
      {SECTIONS.map((section) => {
        const current = pathname === section.href;
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "-mb-0.5 inline-flex min-h-11 items-center border-b-4 px-4 font-bold transition-colors",
              current
                ? "border-signal text-ink"
                : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
