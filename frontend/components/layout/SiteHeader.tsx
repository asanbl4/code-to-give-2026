"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { NAV_LINKS } from "./navigation";

/**
 * One header for the whole site.
 *
 * The landing page had a hand-styled `<nav>` in `landing.css`; the donate and
 * profile pages each had their own inline "Love 21 Foundation … Back to home"
 * bar with a different accent colour; every other page had no header at all.
 */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-edge bg-paper">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/" className="font-display text-xl font-bold text-ink">
          Love 21 Foundation
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          className="min-h-11 rounded-full border-2 border-edge px-4 font-bold text-ink md:hidden"
        >
          Menu
        </button>

        <nav
          id="site-nav"
          aria-label="Main"
          className={cn(
            "gap-2 md:flex md:items-center",
            menuOpen
              ? "absolute inset-x-4 top-20 z-40 flex flex-col rounded-card bg-paper p-4 shadow-lift ring-1 ring-edge"
              : "hidden",
          )}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-full px-3 py-2 font-bold text-ink hover:bg-surface"
            >
              {link.label}
            </Link>
          ))}
          <Button href="/donate" size="sm" className="md:ml-2" onClick={() => setMenuOpen(false)}>
            Donate
          </Button>
        </nav>
      </div>
    </header>
  );
}
